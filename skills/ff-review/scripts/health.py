#!/usr/bin/env python3
"""Read-only evidence health, not semantic review or proof of human identity."""
import argparse
import hashlib
import importlib.util
import json
import math
import sys
from pathlib import Path

STAGES = ('goal-mainflow', 'plan', 'code')

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def load_helpers():
    path = Path(__file__).resolve().parents[2] / 'ff-handoff/scripts/resume.py'
    spec = importlib.util.spec_from_file_location('ff_health_paths', path)
    module = importlib.util.module_from_spec(spec)
    previous = sys.dont_write_bytecode
    sys.dont_write_bytecode = True
    try:
        spec.loader.exec_module(module)
    finally:
        sys.dont_write_bytecode = previous
    return module

def evidence_problem(root, item):
    if not isinstance(item, dict):
        return 'invalid evidence record'
    name = item.get('path', '')
    if not isinstance(name, str) or not name:
        return 'missing evidence path'
    problem = load_helpers().path_problem(root, Path(name))
    if problem:
        return 'unsafe evidence path: ' + name + ' (' + problem + ')'
    target = root / name
    if not target.is_file():
        return 'missing evidence: ' + name
    if not target.stat().st_size:
        return 'empty evidence: ' + name
    if item.get('sha256') != sha(target):
        return 'stale evidence: ' + name
    return None

def evidence_gaps(root, records):
    if not isinstance(records, list) or not records:
        return ['missing evidence records']
    return [problem for item in records if (problem := evidence_problem(root, item))]

def metric_gaps(metrics, target):
    if not isinstance(metrics, dict) or metrics.get('target') != target:
        return ['CRAP NOT_MEASURED: missing same-version data']
    functions = metrics.get('functions')
    if not isinstance(functions, list) or not functions:
        return ['CRAP NOT_MEASURED: empty measured scope']
    gaps = []
    for row in functions:
        cc, cov = row.get('cc'), row.get('coverage')
        if any(isinstance(x, bool) or not isinstance(x, (int, float)) or not math.isfinite(x) for x in (cc, cov)):
            gaps.append('CRAP NOT_MEASURED: invalid numeric data')
        elif cc < 1 or not 0 <= cov <= 1:
            gaps.append('CRAP NOT_MEASURED: out-of-range data')
        elif cc * cc * (1 - cov) ** 3 + cc > 50:
            gaps.append('CRAP exceeds 50: ' + str(row.get('name', 'unknown')))
    return gaps

def nonempty(value):
    return isinstance(value, str) and bool(value.strip())

def metric_sources(root, metrics, target):
    if not isinstance(metrics, dict):
        return ['CRAP NOT_MEASURED: missing measurement record']
    if metrics.get('notApplicable') is True:
        return [] if nonempty(metrics.get('reason')) else ['CRAP N/A needs reason']
    gaps = metric_gaps(metrics, target)
    for key in ('ccTool', 'coverageTool', 'coverageDefinition'):
        if not nonempty(metrics.get(key)):
            gaps.append('CRAP NOT_MEASURED: missing ' + key)
    gaps.extend('CRAP source: ' + x for x in evidence_gaps(root, metrics.get('sources')))
    names = [r.get('name') for r in metrics.get('functions', []) if isinstance(r, dict)]
    if any(not nonempty(n) for n in names) or len(names) != len(set(str(n) for n in names)):
        gaps.append('CRAP NOT_MEASURED: missing or duplicate function names')
    return gaps

def review_gaps(root, review, target, kind):
    if not isinstance(review, dict):
        return ['missing review']
    gaps = []
    if review.get('verdict') == 'N/A' and not nonempty(review.get('reason')):
        gaps.append('N/A needs reason')
    if review.get('verdict') not in ('PASS', 'N/A'):
        gaps.append('review not passed')
    if review.get('target') != target:
        gaps.append('stale target')
    if not nonempty(review.get('author')) or not nonempty(review.get('reviewer')) or review.get('reviewer') == review.get('author') or review.get('independent') is not True:
        gaps.append('independence not established')
    gaps.extend(evidence_gaps(root, review.get('evidence')))
    if kind == 'code' and review.get('verdict') != 'N/A':
        gaps.extend(metric_sources(root, review.get('metrics'), target))
    return gaps

def health(root, data):
    target = data.get('target')
    gaps = [] if all(nonempty(data.get(k)) for k in ('target', 'goal', 'phase', 'next')) else ['missing or invalid goal, phase, target or next']
    stages = {}
    for kind in STAGES:
        found = review_gaps(root, data.get('reviews', {}).get(kind), target, kind)
        stages[kind] = {'status': 'GAPS' if found else 'RECORDED', 'gaps': found}
        gaps.extend(kind + ': ' + value for value in found)
    if data.get('humanAcceptanceRequired') is not False:
        acceptance = data.get('humanAcceptance', {})
        if acceptance.get('target') != target or acceptance.get('confirmed') is not True:
            gaps.append('human acceptance missing or stale')
        else:
            gaps.extend(evidence_gaps(root, acceptance.get('evidence')))
    return {'goal': data.get('goal'), 'phase': data.get('phase'), 'target': target,
            'status': 'GAPS' if gaps else 'RECORDED', 'stages': stages, 'gaps': gaps,
            'next': data.get('next', 'Resolve gaps with the responsible owner'),
            'limits': 'Recorded evidence only; no semantic verdict, identity verification, plan mutation or final acceptance.'}

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('record', type=Path)
    parser.add_argument('--root', type=Path, default=Path.cwd())
    args = parser.parse_args()
    try:
        result = health(args.root.resolve(), json.loads(args.record.read_text(encoding='utf-8')))
        print(json.dumps(result, ensure_ascii=False, indent=2))
        return 1 if result['gaps'] else 0
    except (OSError, ValueError, TypeError, AttributeError, ImportError) as error:
        print(json.dumps({'status': 'INVALID', 'error': str(error)}))
        return 2

if __name__ == '__main__':
    raise SystemExit(main())
