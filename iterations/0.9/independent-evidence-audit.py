"""Direct evidence/hash/dimension audit without importing the production checker."""
import hashlib
import json
from pathlib import Path
import struct
import sys
import time

ROOT = Path(__file__).resolve().parents[2]
NAME = sys.argv[1] if len(sys.argv) > 1 else 'ui-evidence'
REQUIRE_SCREENSHOT_BINDING = '--require-screenshot-binding' in sys.argv[2:]
DIRECTORY = ROOT / 'iterations/0.9' / NAME


def strict_object(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError('duplicate field: ' + key)
        result[key] = value
    return result


def read(path):
    return json.loads(path.read_text(encoding='utf-8'), object_pairs_hook=strict_object,
                      parse_constant=lambda value: (_ for _ in ()).throw(ValueError(value)))


def matching(record):
    return hashlib.sha256((ROOT / record['path']).read_bytes()).hexdigest() == record['sha256']


data = read(DIRECTORY / 'journey.json')
before = read(DIRECTORY / 'before.json')
events = read(DIRECTORY / 'events.json')
frozen = read(ROOT / 'iterations/0.9/design-before-implementation.json')
fingerprint = hashlib.sha256(json.dumps([data['design'], data['sources']], sort_keys=True,
    separators=(',', ':'), ensure_ascii=True).encode('utf-8')).hexdigest()
checks = {
    'frozenDesignMatchesBytes': matching(frozen['design']),
    'designAndSourcesMatchCurrentBytes': all(map(matching, data['design'] + data['sources'])),
    'beforeMatchesRecord': before['design'] == data['design'] and before['sources'] == data['sources'],
    'beforeFingerprintMatches': before['inputFingerprint'] == fingerprint,
    'eightExpectedAndObserved': len(data['expected']) == len(data['observations']) == 8,
    'expectedIdentitiesFromFrozenDesign': [s['id'] for s in data['expected']] == [
        'open', 'filter', 'navigate', 'empty', 'restore', 'narrow-open', 'narrow-filter', 'narrow-navigate'],
    'eventsMatchInOrder': [e['step'] for e in events] == [s['id'] for s in data['expected']],
    'eventsIncreasing': all(a['at'] < b['at'] for a, b in zip(events, events[1:])),
    'browserHasNoPageErrors': read(DIRECTORY / 'browser.json')['pageErrors'] == [],
}
rows = []
for expected, observation, event in zip(data['expected'], data['observations'], events):
    trace = read(ROOT / observation['trace']['path'])
    viewport = {'width': 390, 'height': 844} if expected['id'].startswith('narrow-') else {'width': 1440, 'height': 1000}
    screenshots = []
    for record in observation['screenshots']:
        raw = (ROOT / record['path']).read_bytes()
        dimensions = list(struct.unpack('>II', raw[16:24])) if raw[:8] == b'\x89PNG\r\n\x1a\n' and len(raw) >= 24 else None
        screenshots.append({'path': record['path'], 'hashMatches': matching(record), 'dimensions': dimensions,
                            'viewportMatches': dimensions == [viewport['width'], viewport['height']]})
    row = {'id': expected['id'], 'declaredStepsMatch': all(observation[k] == expected[k] for k in ('id', 'from', 'to', 'action')),
           'traceHashMatches': matching(observation['trace']),
           'traceBindingsMatch': all(trace[k] == expected[k] for k in ('from', 'to', 'action')) and trace['stepId'] == expected['id'] and trace['target'] == data['target'] and trace['inputFingerprint'] == fingerprint,
           'viewportMatches': trace['viewport'] == viewport, 'traceOk': trace['ok'] is True,
           'traceScreenshotBindingMatches': not REQUIRE_SCREENSHOT_BINDING or trace.get('screenshots') == observation['screenshots'],
           'eventMatchesTrace': event['at'] == trace['observedUtcEpoch'], 'screenshots': screenshots}
    row['pass'] = all(v for k, v in row.items() if k not in ('id', 'screenshots')) and all(
        s['hashMatches'] and s['viewportMatches'] for s in screenshots)
    rows.append(row)
result = {'directory': str(DIRECTORY), 'capturedUtcEpoch': time.time(),
          'traceScreenshotBindingCheckRequired': REQUIRE_SCREENSHOT_BINDING,
          'checks': checks, 'steps': rows,
          'status': 'PASS' if all(checks.values()) and all(r['pass'] for r in rows) else 'FAIL',
          'limits': 'Direct selected-record byte/hash/shape checks. Manual screenshot review is recorded separately. No proof of origin, visual preference, assistive technology, physical phone/touch, FF-wide business outcome or human acceptance.'}
out = ROOT / 'iterations/0.9' / ('independent-' + NAME + '-audit.json')
out.write_text(json.dumps(result, indent=2) + '\n', encoding='utf-8')
print(json.dumps({'output': str(out), 'status': result['status'], 'checks': checks}))
