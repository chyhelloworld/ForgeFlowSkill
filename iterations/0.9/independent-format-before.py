"""Additional initial-version structure/format probes, preserving the first run."""
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import sys

SOURCE = Path(__file__).resolve().parents[2]
BASE = SOURCE.parent / '_handoff/20261017/independent09-fixtures/20261017T082021Z'
SCRIPT = SOURCE / 'skills/ff-design/scripts/journey.py'
results = []


def run(name, mutate):
    root = BASE / name
    shutil.copytree(BASE / 'valid-ui', root)
    record = root / 'journey.json'
    data = json.loads(record.read_text(encoding='utf-8'))
    mutate(root, data)
    command = [sys.executable, '-X', 'utf8', str(SCRIPT), str(record), '--root', str(root),
               '--current-target', 'INDEPENDENT-09']
    process = subprocess.run(command, capture_output=True, timeout=20)
    results.append({'name': name, 'command': command, 'scriptSha256': hashlib.sha256(SCRIPT.read_bytes()).hexdigest(),
                    'exitCode': process.returncode, 'stdout': process.stdout.decode('utf-8'),
                    'stderr': process.stderr.decode('utf-8')})


def duplicate_target(root, data):
    raw = json.dumps(data).replace('"target": "INDEPENDENT-09"',
                                   '"target": "STALE", "target": "INDEPENDENT-09"', 1)
    (root / 'journey.json').write_text(raw, encoding='utf-8')


def duplicate_trace(root, data):
    path = root / 'open.json'
    raw = path.read_text(encoding='utf-8').replace('"ok": true', '"ok": false, "ok": true', 1)
    path.write_text(raw, encoding='utf-8')
    data['observations'][0]['trace']['sha256'] = hashlib.sha256(path.read_bytes()).hexdigest()
    (root / 'journey.json').write_text(json.dumps(data), encoding='utf-8')


def replace_index_only(root, data):
    # Capture-time trace declares the original screenshot list. The index alone is substituted later.
    path = root / 'open.json'
    trace = json.loads(path.read_text(encoding='utf-8'))
    trace['screenshots'] = data['observations'][0]['screenshots']
    path.write_text(json.dumps(trace), encoding='utf-8')
    data['observations'][0]['trace']['sha256'] = hashlib.sha256(path.read_bytes()).hexdigest()
    replacement = root / 'replacement.png'
    replacement.write_bytes((root / 'screen.png').read_bytes())
    data['observations'][0]['screenshots'] = [{'path': replacement.name,
        'sha256': hashlib.sha256(replacement.read_bytes()).hexdigest()}]
    (root / 'journey.json').write_text(json.dumps(data), encoding='utf-8')


run('before-duplicate-main-target', duplicate_target)
run('before-duplicate-trace-ok', duplicate_trace)
run('before-replaced-screenshot-index-only', replace_index_only)
out = SOURCE / 'iterations/0.9/independent-format-before-results.json'
out.write_text(json.dumps({'results': results}, indent=2) + '\n', encoding='utf-8')
print(json.dumps({'output': str(out), 'results': [{'name': r['name'], 'exitCode': r['exitCode']} for r in results]}))
