"""Independent CLI probes. Fixtures stay outside the source checkout; no production edits."""
import base64
import copy
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import time

SOURCE = Path(__file__).resolve().parents[2]
FIXTURES = SOURCE.parent / '_handoff/20261017/independent09-fixtures'
SCRIPT = SOURCE / 'skills/ff-design/scripts/journey.py'
RUN = time.strftime('%Y%m%dT%H%M%SZ', time.gmtime())
OUT = SOURCE / 'iterations/0.9' / ('independent-results-' + RUN + '.json')
ROOT = FIXTURES / RUN
ROOT.mkdir(parents=True, exist_ok=False)
PNG = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=')


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def evidence(root, path):
    return {'path': path, 'sha256': digest(root / path)}


def write_json(path, value):
    path.write_text(json.dumps(value, ensure_ascii=True, indent=2) + '\n', encoding='utf-8')


def fingerprint(data):
    payload = json.dumps([data['design'], data['sources']], sort_keys=True,
                         separators=(',', ':'), ensure_ascii=True).encode('utf-8')
    return hashlib.sha256(payload).hexdigest()


def snapshot(root):
    # No following junctions or directory symlinks.
    result = {}
    for folder, dirs, files in os.walk(root, followlinks=False):
        dirs[:] = [name for name in dirs if not (Path(folder) / name).is_junction()
                   and not (Path(folder) / name).is_symlink()]
        for name in files:
            path = Path(folder) / name
            result[path.relative_to(root).as_posix()] = digest(path)
    return result


def fixture(name):
    root = ROOT / name
    root.mkdir()
    (root / 'design.md').write_text('Approved bounded fixture design\n', encoding='utf-8')
    (root / 'app.html').write_text('<h1>Current fixture implementation</h1>\n', encoding='utf-8')
    (root / 'screen.png').write_bytes(PNG)
    steps = [{'id': 'open', 'from': 'start', 'to': 'ready', 'action': 'open'},
             {'id': 'choose', 'from': 'ready', 'to': 'chosen', 'action': 'click'},
             {'id': 'return', 'from': 'chosen', 'to': 'ready', 'action': 'back'}]
    data = {'version': 1, 'target': 'INDEPENDENT-09', 'surface': 'ui',
            'design': [evidence(root, 'design.md')], 'sources': [evidence(root, 'app.html')],
            'expected': steps, 'observations': copy.deepcopy(steps)}
    bind(root, data)
    return root, data


def bind(root, data):
    for step in data['observations']:
        path = step['id'] + '.json'
        trace = {'target': data['target'], 'stepId': step['id'], 'from': step['from'],
                 'to': step['to'], 'action': step['action'], 'inputFingerprint': fingerprint(data),
                 'ok': True, 'observed': {'fixtureVisibleText': 'independent synthetic probe'}}
        write_json(root / path, trace)
        step.update(trace=evidence(root, path), screenshots=[evidence(root, 'screen.png')])


def change_trace(root, data, change):
    path = root / data['observations'][0]['trace']['path']
    trace = json.loads(path.read_text(encoding='utf-8'))
    change(trace)
    write_json(path, trace)
    data['observations'][0]['trace'] = evidence(root, path.name)


results = []


def probe(name, mutate=None, acceptable=('GAPS', 'INVALID'), target='INDEPENDENT-09',
          rationale='', raw=None):
    root, data = fixture(name)
    if mutate:
        mutate(root, data)
    record = root / 'journey.json'
    if raw is None:
        write_json(record, data)
    else:
        record.write_bytes(raw)
    before = snapshot(root)
    cmd = [sys.executable, '-X', 'utf8', str(SCRIPT), str(record), '--root', str(root),
           '--current-target', target]
    started = time.time()
    run = subprocess.run(cmd, capture_output=True, timeout=30)
    after = snapshot(root)
    stdout, stderr = run.stdout.decode('utf-8', errors='replace'), run.stderr.decode('utf-8', errors='replace')
    try:
        payload = json.loads(stdout)
    except ValueError:
        payload = None
    status = payload.get('status') if isinstance(payload, dict) else None
    expected_exit = {'OBSERVED': 0, 'GAPS': 1, 'INVALID': 2}
    item = {'name': name, 'acceptable': list(acceptable), 'rationale': rationale,
            'command': cmd, 'fixture': str(root), 'startedUtcEpoch': started,
            'exitCode': run.returncode, 'status': status, 'stdout': stdout, 'stderr': stderr,
            'pass': status in acceptable and expected_exit.get(status) == run.returncode,
            'fixtureReadOnly': before == after, 'before': before, 'after': after}
    results.append(item)
    write_json(OUT, {'run': RUN, 'scriptSha256': digest(SCRIPT), 'fixtureRoot': str(ROOT),
                     'results': results, 'note': 'Synthetic probes are not real UI evidence.'})


probe('valid-ui', acceptable=('OBSERVED',), rationale='A complete selected UI fixture is accepted.')
probe('valid-cli', lambda r, d: (d.update(surface='cli'), [s.pop('screenshots') for s in d['observations']]),
      acceptable=('OBSERVED',), rationale='CLI records do not invent screenshots.')
probe('missing-observation', lambda r, d: d['observations'].pop(1))
probe('extra-observation', lambda r, d: d['observations'].append(copy.deepcopy(d['observations'][0])))
probe('reordered-observations', lambda r, d: d['observations'].reverse())
probe('duplicate-expected', lambda r, d: d['expected'][1].update(id='open'))
probe('state-discontinuity', lambda r, d: d['expected'][1].update(**{'from': 'unrelated'}))
probe('stale-current-target', target='NEW-09')
probe('stale-source', lambda r, d: (r / 'app.html').write_text('changed', encoding='utf-8'))
probe('stale-design', lambda r, d: (r / 'design.md').write_text('changed', encoding='utf-8'))
probe('rehashed-source-old-trace', lambda r, d: ((r / 'app.html').write_text('changed', encoding='utf-8'), d.update(sources=[evidence(r, 'app.html')])))
probe('rehashed-design-old-trace', lambda r, d: ((r / 'design.md').write_text('changed', encoding='utf-8'), d.update(design=[evidence(r, 'design.md')])))
for field in ('id', 'from', 'to', 'action'):
    probe('observation-mismatch-' + field, lambda r, d, k=field: d['observations'][0].update({k: 'different'}))
for field in ('target', 'stepId', 'from', 'to', 'action', 'inputFingerprint'):
    probe('trace-mismatch-' + field, lambda r, d, k=field: change_trace(r, d, lambda t: t.update({k: 'different'})))
for name, value in [('false', False), ('numeric-one', 1), ('string-true', 'true'), ('null', None)]:
    probe('failed-or-unknown-' + name, lambda r, d, v=value: change_trace(r, d, lambda t: t.update(ok=v)))
for name, value in [('empty-dict', {}), ('empty-list', []), ('null', None)]:
    probe('missing-observed-' + name, lambda r, d, v=value: change_trace(r, d, lambda t: t.update(observed=v)))
probe('codegraph-not-trace', lambda r, d: change_trace(r, d, lambda t: (t.clear(), t.update(nodes=['a'], edges=[]))))
probe('missing-trace', lambda r, d: d['observations'][0].pop('trace'))
probe('missing-screenshot', lambda r, d: d['observations'][0].pop('screenshots'))
probe('empty-screenshot', lambda r, d: ((r / 'screen.png').write_bytes(b''), d['observations'][0].update(screenshots=[evidence(r, 'screen.png')])))
probe('malformed-trace-json', lambda r, d: ((r / 'open.json').write_bytes(b'broken'), d['observations'][0].update(trace=evidence(r, 'open.json'))))
probe('non-utf8-trace', lambda r, d: ((r / 'open.json').write_bytes(b'\xff\xfe\x00'), d['observations'][0].update(trace=evidence(r, 'open.json'))))
probe('trace-array', lambda r, d: ((r / 'open.json').write_text('[]', encoding='utf-8'), d['observations'][0].update(trace=evidence(r, 'open.json'))))
probe('root-json-array', raw=b'[]')
probe('root-json-syntax', raw=b'{"version":')
probe('version-bool', lambda r, d: d.update(version=True))
probe('version-float', lambda r, d: d.update(version=1.0))
probe('surface-unknown', lambda r, d: d.update(surface='desktop'))
probe('missing-expected', lambda r, d: d.pop('expected'))
probe('invalid-expected', lambda r, d: d.update(expected=[None]))
probe('noncanonical-identity', lambda r, d: d['observations'][0].update(id=' open'))
for label, path in [('traversal', '../screen.png'), ('drive-relative', 'C:screen.png'),
                    ('absolute-drive', 'C:/Windows/win.ini'), ('ads', 'screen.png:stream'),
                    ('unc', '//localhost/share/screen.png'), ('posix-absolute', '/screen.png'),
                    ('normalized-traversal', 'dir/../screen.png'), ('nul', 'screen.png\x00')]:
    probe('unsafe-path-' + label, lambda r, d, p=path: d['observations'][0].update(screenshots=[{'path': p, 'sha256': '0' * 64}]))


def unicode_paths(root, data):
    path = '\u4e2d\u6587 project source.html'
    (root / path).write_text('unicode and spaces', encoding='utf-8')
    data['sources'] = [evidence(root, path)]
    bind(root, data)


probe('valid-unicode-spaces', unicode_paths, acceptable=('OBSERVED',))


def stale_screenshot(root, data):
    # Simulate honest source/trace recapture while accidentally retaining a screenshot from old source bytes.
    write_json(root / 'screen-origin.json', {'sourceSha256': data['sources'][0]['sha256'], 'note': 'old version screenshot'})
    (root / 'app.html').write_text('<h1>New revision with visibly different UI</h1>', encoding='utf-8')
    data['sources'] = [evidence(root, 'app.html')]
    bind(root, data)


probe('old-screenshot-current-trace', stale_screenshot, rationale='Same-version UI evidence should detect old screenshot carried into a new implementation trace.')
probe('text-file-as-screenshot', lambda r, d: d['observations'][0].update(screenshots=[evidence(r, 'design.md')]),
      rationale='A screenshot slot contains Markdown bytes, not an image.')


def invalid_json_number(root, data):
    change_trace(root, data, lambda t: t.update(observed={'visibleCount': float('nan')}))


probe('nonstandard-json-nan', invalid_json_number, rationale='JSON evidence should reject non-finite numeric tokens.')


def create_junction(root, data):
    target = ROOT / 'junction-target'
    target.mkdir(exist_ok=True)
    (target / 'screen.png').write_bytes(PNG)
    junction = root / 'linked'
    # Both paths are inside the designated external fixture root; no source junctions are created.
    ps = "New-Item -ItemType Junction -Path '" + str(junction).replace("'", "''") + "' -Target '" + str(target).replace("'", "''") + "' | Out-Null"
    run = subprocess.run(['powershell', '-NoProfile', '-NonInteractive', '-Command', ps], capture_output=True, timeout=20)
    if run.returncode:
        raise RuntimeError('junction fixture creation failed: ' + run.stderr.decode(errors='replace'))
    data['observations'][0]['screenshots'] = [evidence(root, 'linked/screen.png')]


probe('real-junction-evidence', create_junction)
print(json.dumps({'output': str(OUT), 'count': len(results),
                  'deviations': [r['name'] for r in results if not r['pass']],
                  'writesDetected': [r['name'] for r in results if not r['fixtureReadOnly']]}))
