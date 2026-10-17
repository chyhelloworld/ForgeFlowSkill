#!/usr/bin/env python3
"""Read-only comparison of declared journey steps and current observation records."""
import argparse
import importlib.util
import json
import sys
from pathlib import Path

FIELDS = ('id', 'from', 'to', 'action')


def load_helpers():
    path = Path(__file__).resolve().parents[2] / 'ff-handoff/scripts/resume.py'
    spec = importlib.util.spec_from_file_location('ff_journey_evidence', path)
    module = importlib.util.module_from_spec(spec)
    previous = sys.dont_write_bytecode
    sys.dont_write_bytecode = True
    try:
        spec.loader.exec_module(module)
    finally:
        sys.dont_write_bytecode = previous
    return module


def valid_step(step):
    if not isinstance(step, dict):
        return False
    return all(isinstance(step.get(k), str) and bool(step[k].strip())
               and step[k] == step[k].strip() for k in FIELDS)


def unique_object(pairs):
    value = {}
    for key, item in pairs:
        if key in value:
            raise ValueError('duplicate JSON field: ' + key)
        value[key] = item
    return value


def invalid_constant(value):
    raise ValueError('non-finite JSON value: ' + value)


def read_json(path):
    return json.loads(path.read_text(encoding='utf-8'), parse_constant=invalid_constant,
                      object_pairs_hook=unique_object)


def screenshot_gaps(root, records, helper):
    gaps = helper.files_gaps(root, records)
    if gaps:
        return gaps
    for record in records:
        data = (root / record['path']).read_bytes()
        if len(data) < 33 or data[:16] != b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR':
            gaps.append('expected PNG header: ' + record['path'])
        elif not int.from_bytes(data[16:20], 'big') or not int.from_bytes(data[20:24], 'big'):
            gaps.append('invalid PNG dimensions: ' + record['path'])
    return gaps


def trace_gaps(root, record, expected, target, fingerprint, screenshots, helper):
    gaps = helper.files_gaps(root, [record])
    if gaps:
        return gaps
    try:
        trace = read_json(root / record['path'])
    except (ValueError, UnicodeError):
        return ['invalid interaction trace JSON']
    if not isinstance(trace, dict):
        return ['invalid interaction trace object']
    bindings = {k: expected[k] for k in ('from', 'to', 'action')}
    bindings.update(stepId=expected['id'], target=target, inputFingerprint=fingerprint)
    if screenshots is not None:
        bindings['screenshots'] = screenshots
    gaps.extend('interaction trace mismatch: ' + k for k, v in bindings.items() if trace.get(k) != v)
    if trace.get('ok') is not True:
        gaps.append('interaction result failed or unknown')
    if not isinstance(trace.get('observed'), dict) or not trace['observed']:
        gaps.append('interaction observation missing')
    return gaps


def observation_gaps(root, expected, actual, target, fingerprint, ui, helper):
    if not valid_step(expected):
        return ['invalid expected step']
    if not valid_step(actual):
        return ['missing or invalid observed step']
    gaps = ['expected/observed mismatch: ' + k for k in FIELDS if expected[k] != actual[k]]
    screenshots = actual.get('screenshots', []) if ui else None
    gaps.extend(trace_gaps(root, actual.get('trace'), expected, target, fingerprint, screenshots, helper))
    if ui:
        gaps.extend('screenshot: ' + g for g in screenshot_gaps(root, screenshots, helper))
    return gaps


def contract_gaps(root, data, target, helper):
    if not isinstance(data, dict):
        raise ValueError('journey record must be an object')
    gaps = []
    if type(data.get('version')) is not int or data['version'] != 1:
        gaps.append('unsupported journey version')
    if not helper.text(target) or data.get('target') != target:
        gaps.append('missing or stale current target')
    if data.get('surface') not in ('ui', 'cli'):
        gaps.append('unknown observation surface')
    for key in ('design', 'sources'):
        gaps.extend(key + ': ' + g for g in helper.files_gaps(root, data.get(key)))
    return gaps


def sequence_gaps(expected, actual):
    expected_ids = [s['id'] if valid_step(s) else None for s in expected]
    actual_ids = [s['id'] if valid_step(s) else None for s in actual]
    gaps = []
    if len(set(expected_ids)) != len(expected_ids):
        gaps.append('duplicate expected step identity')
    if actual_ids != expected_ids:
        gaps.append('observed step inventory/order mismatch')
    for previous, following in zip(expected, expected[1:]):
        if valid_step(previous) and valid_step(following) and previous['to'] != following['from']:
            gaps.append('expected state discontinuity: ' + following['id'])
    return gaps


def inspect(root, data, target):
    helper = load_helpers()
    gaps = contract_gaps(root, data, target, helper)
    inventories = []
    for key in ('expected', 'observations'):
        steps = data.get(key)
        if not isinstance(steps, list) or not steps:
            gaps.append('missing ' + key + ' inventory')
            steps = []
        inventories.append(steps)
    expected, actual = inventories
    gaps.extend(sequence_gaps(expected, actual))
    fingerprint = helper.dependency_fingerprint([data.get('design'), data.get('sources')])
    rows = []
    for i, step in enumerate(expected):
        observed = actual[i] if i < len(actual) else {}
        problems = observation_gaps(root, step, observed, target, fingerprint, data.get('surface') == 'ui', helper)
        rows.append({'id': step.get('id') if isinstance(step, dict) else None,
                     'status': 'GAPS' if problems else 'OBSERVED', 'gaps': problems})
        gaps.extend(problems)
    return {'target': target, 'status': 'GAPS' if gaps else 'OBSERVED', 'gaps': gaps, 'steps': rows,
            'limits': 'Read-only check of declared selected records. Not proof of trace authenticity, visual quality, '
                      'business correctness, complete coverage, authority or human acceptance. Not an executor.'}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('record', type=Path)
    parser.add_argument('--root', type=Path, default=Path.cwd())
    parser.add_argument('--current-target', required=True)
    args = parser.parse_args()
    try:
        result = inspect(args.root.resolve(), read_json(args.record), args.current_target)
        print(json.dumps(result, indent=2))
        return 1 if result['gaps'] else 0
    except (OSError, ValueError, TypeError, AttributeError, ImportError) as error:
        print(json.dumps({'status': 'INVALID', 'error': str(error)}))
        return 2


if __name__ == '__main__':
    raise SystemExit(main())
