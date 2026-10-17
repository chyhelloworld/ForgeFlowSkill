#!/usr/bin/env python3
"""Inspect a checkpoint without executing actions or changing project state."""
import argparse
import hashlib
import json
import stat
from pathlib import Path


def text(value):
    return isinstance(value, str) and bool(value.strip())


def path_problem(root, rel):
    if rel.anchor or '..' in rel.parts or ':' in str(rel) or '\x00' in str(rel):
        return 'unsafe path'
    target = root / rel
    if not target.resolve().is_relative_to(root.resolve()):
        return 'unsafe resolved path'
    for entry in [target, *target.parents]:
        try:
            info = entry.lstat()
        except FileNotFoundError:
            continue
        if stat.S_ISLNK(info.st_mode) or getattr(info, 'st_file_attributes', 0) & stat.FILE_ATTRIBUTE_REPARSE_POINT:
            return 'symlink or reparse path'
    return None


def file_problem(root, record):
    if not isinstance(record, dict) or not text(record.get('path')):
        return 'invalid file record'
    rel = Path(record['path'])
    problem = path_problem(root, rel)
    if problem:
        return problem
    target = root / rel
    if not target.is_file() or target.stat().st_size == 0:
        return 'missing or empty file: ' + str(rel)
    actual = hashlib.sha256(target.read_bytes()).hexdigest()
    return None if actual == record.get('sha256') else 'stale file: ' + str(rel)


def files_gaps(root, records):
    if not isinstance(records, list) or not records:
        return ['missing file evidence']
    return [problem for record in records if (problem := file_problem(root, record))]


def dependency_fingerprint(records):
    """Bind receipts to the selected dependency records, not a second state store."""
    return hashlib.sha256(json.dumps(records, sort_keys=True, separators=(',', ':'),
                                     ensure_ascii=True).encode('utf-8')).hexdigest()


def receipt_gaps(root, receipt, action_id, goal, fingerprint):
    if not isinstance(receipt, dict):
        return ['invalid structured completion receipt']
    gaps = []
    if receipt.get('actionId') != action_id or receipt.get('goalRevision') != goal:
        gaps.append('completion identity/goal mismatch')
    if receipt.get('dependencyFingerprint') != fingerprint:
        gaps.append('completion dependency binding missing or stale')
    if not text(receipt.get('operation')) or type(receipt.get('exitCode')) is not int or receipt['exitCode'] != 0:
        gaps.append('completion lacks successful operation result')
    return gaps + files_gaps(root, receipt.get('outputs'))


def completion_gaps(root, records, action_id, goal, fingerprint):
    gaps = files_gaps(root, records)
    if gaps:
        return gaps
    for record in records:
        try:
            receipt = json.loads((root / record['path']).read_text(encoding='utf-8'))
        except (ValueError, UnicodeError):
            gaps.append('invalid structured completion receipt')
            continue
        gaps.extend(receipt_gaps(root, receipt, action_id, goal, fingerprint))
    return gaps


def action_result(root, action, goal, fingerprint):
    if not isinstance(action, dict) or not text(action.get('id')):
        return {'id': None, 'recommendation': 'INSPECT', 'gaps': ['missing action identity']}
    if action['id'] != action['id'].strip():
        return {'id': action['id'], 'recommendation': 'INSPECT', 'gaps': ['noncanonical action identity']}
    state = action.get('state')
    if state == 'done':
        gaps = completion_gaps(root, action.get('receipt'), action['id'], goal, fingerprint)
        return {'id': action['id'], 'recommendation': 'INSPECT' if gaps else 'SKIP_COMPLETED', 'gaps': gaps}
    if state == 'pending':
        return {'id': action['id'], 'recommendation': 'VERIFY_CURRENT_AUTHORITY', 'gaps': []}
    return {'id': action['id'], 'recommendation': 'INSPECT', 'gaps': ['running/unknown state requires observation']}


def checkpoint_gaps(root, data, current_goal):
    if not isinstance(data, dict):
        raise ValueError('checkpoint must be an object')
    gaps = []
    if type(data.get('version')) is not int or data.get('version') != 1:
        gaps.append('unsupported checkpoint version')
    if not text(current_goal) or data.get('goalRevision') != current_goal:
        gaps.append('stale or missing latest goal revision')
    if data.get('projectRoot') != str(root.resolve()):
        gaps.append('project root mismatch; verify relocation before recapturing')
    gaps.extend(files_gaps(root, data.get('dependencies')))
    return gaps


def inspect(root, data, current_goal):
    gaps = checkpoint_gaps(root, data, current_goal)
    actions = data.get('actions')
    if not isinstance(actions, list) or not actions:
        gaps.append('missing action inventory')
        actions = []
    fingerprint = dependency_fingerprint(data.get('dependencies'))
    results = [action_result(root, action, current_goal, fingerprint) for action in actions]
    ids = [result['id'] for result in results]
    if len(ids) != len(set(ids)):
        gaps.append('duplicate action identity')
    if gaps:
        for result in results:
            result['recommendation'] = 'INSPECT'
    for result in results:
        gaps.extend(result['gaps'])
    return {'status': 'INSPECT' if gaps else 'CHECKPOINT_CURRENT', 'gaps': gaps, 'actions': results,
            'limits': 'Read-only recommendations. Not approval, liveness detection, execution or exactly-once guarantee.'}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('checkpoint', type=Path)
    parser.add_argument('--root', type=Path, default=Path.cwd())
    parser.add_argument('--current-goal', required=True)
    args = parser.parse_args()
    try:
        result = inspect(args.root.resolve(), json.loads(args.checkpoint.read_text(encoding='utf-8')), args.current_goal)
        print(json.dumps(result, ensure_ascii=False, indent=2))
        return 1 if result['gaps'] else 0
    except (OSError, ValueError, TypeError, AttributeError) as error:
        print(json.dumps({'status': 'INVALID', 'error': str(error)}))
        return 2

if __name__ == '__main__':
    raise SystemExit(main())
