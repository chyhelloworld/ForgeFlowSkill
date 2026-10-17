"""Independent CLI probes. Fixtures stay outside the source checkout; no production edits."""
import base64
import copy
import hashlib
import json
import os
from pathlib import Path
import subprocess
import struct
import sys
import time
import zlib

SOURCE = Path(__file__).resolve().parents[2]
FIXTURES = SOURCE.parent / '_handoff/20261017/independent09-fixtures'
SCRIPT = SOURCE / 'skills/ff-design/scripts/journey.py'
RUN = 'final-' + time.strftime('%Y%m%dT%H%M%SZ', time.gmtime())
OUT = SOURCE / 'iterations/0.9' / ('independent-results-' + RUN + '.json')
ROOT = FIXTURES / RUN
ROOT.mkdir(parents=True, exist_ok=False)
def png_chunk(kind, payload):
    return struct.pack('>I', len(payload)) + kind + payload + struct.pack('>I', zlib.crc32(kind + payload) & 0xffffffff)


PNG = b'\x89PNG\r\n\x1a\n' + png_chunk(b'IHDR', struct.pack('>IIBBBBB', 1, 1, 8, 6, 0, 0, 0)) + png_chunk(b'IDAT', zlib.compress(b'\x00\xff\x00\x00\xff')) + png_chunk(b'IEND', b'')


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
                 'screenshots': [evidence(root, 'screen.png')],
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


probe('declared-old-pixels-authenticity-limit', stale_screenshot, acceptable=('OBSERVED',),
      rationale='A collector actively declares old pixels in a new bound trace; pixel capture time cannot be inferred. This is a documented authenticity limit, not a weakened copy of the first-run expectation.')


def replace_screenshot_index(root, data):
    (root / 'replacement.png').write_bytes(PNG)
    data['observations'][0]['screenshots'] = [evidence(root, 'replacement.png')]


probe('replace-screenshot-index-without-trace', replace_screenshot_index,
      rationale='The observation index is changed without changing the capture-time trace list.')


def bind_custom_screenshot(root, data, path):
    records = [evidence(root, path)]
    data['observations'][0]['screenshots'] = records
    change_trace(root, data, lambda trace: trace.update(screenshots=records))


probe('text-file-as-bound-screenshot', lambda r, d: bind_custom_screenshot(r, d, 'design.md'),
      rationale='Matching index/trace both point to Markdown. PNG metadata validation must reject it.')


def png_metadata(root, data, content):
    (root / 'bad.png').write_bytes(content)
    bind_custom_screenshot(root, data, 'bad.png')


probe('png-signature-only', lambda r, d: png_metadata(r, d, b'\x89PNG\r\n\x1a\n'))
probe('png-zero-width', lambda r, d: png_metadata(r, d, PNG[:16] + b'\x00\x00\x00\x00' + PNG[20:]))
probe('png-zero-height', lambda r, d: png_metadata(r, d, PNG[:20] + b'\x00\x00\x00\x00' + PNG[24:]))
probe('png-invalid-ihdr-length', lambda r, d: png_metadata(r, d, PNG[:8] + b'\x00\x00\x00\x0c' + PNG[12:]))
probe('missing-trace-screenshot-binding', lambda r, d: change_trace(r, d, lambda t: t.pop('screenshots')))
probe('wrong-trace-screenshot-binding', lambda r, d: change_trace(r, d, lambda t: t.update(screenshots=[])))


def png_metadata_only_limit(root, data):
    # Positive PNG metadata but deliberately no image data/IEND: the documented check is not a decoder.
    png_metadata(root, data, PNG[:33])


probe('png-full-decode-is-out-of-scope', png_metadata_only_limit, acceptable=('OBSERVED',),
      rationale='Positive PNG header/size is only metadata, not a full PNG decode or provenance assertion.')


def invalid_json_number(root, data):
    change_trace(root, data, lambda t: t.update(observed={'visibleCount': float('nan')}))


probe('nonstandard-json-nan', invalid_json_number, rationale='JSON evidence should reject non-finite numeric tokens.')
for label, value in [('positive-infinity', float('inf')), ('negative-infinity', float('-inf'))]:
    probe('nonstandard-json-' + label, lambda r, d, v=value: change_trace(r, d, lambda t: t.update(observed={'count': v})))


def duplicate_trace_field(root, data):
    path = root / 'open.json'
    path.write_text(path.read_text(encoding='utf-8').replace('"ok": true', '"ok": false, "ok": true', 1), encoding='utf-8')
    data['observations'][0]['trace'] = evidence(root, 'open.json')


probe('duplicate-trace-ok', duplicate_trace_field)
probe('duplicate-main-target', acceptable=('INVALID',), raw=b'{"target":"STALE","target":"INDEPENDENT-09"}')
probe('nonfinite-main-json', acceptable=('INVALID',), raw=b'{"observed":NaN}')


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


# Actual existing junctions are retested separately to avoid repeating fixture-creation approval.
print(json.dumps({'output': str(OUT), 'count': len(results),
                  'deviations': [r['name'] for r in results if not r['pass']],
                  'writesDetected': [r['name'] for r in results if not r['fixtureReadOnly']]}))
