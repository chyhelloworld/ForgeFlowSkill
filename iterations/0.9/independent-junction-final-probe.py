"""Reuse approved external junctions; preserve all original fixture records."""
import hashlib
import json
from pathlib import Path
import subprocess
import sys

SOURCE = Path(__file__).resolve().parents[2]
ROOT = SOURCE.parent / '_handoff/20261017/independent09-fixtures/20261017T082021Z/real-junction-evidence'
SCRIPT = SOURCE / 'skills/ff-design/scripts/journey.py'


def record(path):
    return {'path': path, 'sha256': hashlib.sha256((ROOT / path).read_bytes()).hexdigest()}


results = []
for name, junction, reason in [('outside', 'linked', 'unsafe resolved path'),
                               ('inside', 'linked-inside', 'symlink or reparse path')]:
    data = json.loads((ROOT / 'journey.json').read_text(encoding='utf-8'))
    data['observations'][0]['screenshots'] = [record(junction + '/screen.png')]
    for step in data['observations']:
        trace = json.loads((ROOT / step['trace']['path']).read_text(encoding='utf-8'))
        trace['screenshots'] = step['screenshots']
        path = 'final-' + name + '-' + step['id'] + '.json'
        (ROOT / path).write_text(json.dumps(trace), encoding='utf-8')
        step['trace'] = record(path)
    path = ROOT / ('journey-final-' + name + '.json')
    path.write_text(json.dumps(data), encoding='utf-8')
    before = {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in ROOT.iterdir() if p.is_file()}
    command = [sys.executable, '-X', 'utf8', str(SCRIPT), str(path), '--root', str(ROOT),
               '--current-target', 'INDEPENDENT-09']
    process = subprocess.run(command, capture_output=True, timeout=20)
    after = {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in ROOT.iterdir() if p.is_file()}
    stdout = process.stdout.decode('utf-8')
    results.append({'name': name, 'command': command, 'scriptSha256': hashlib.sha256(SCRIPT.read_bytes()).hexdigest(),
                    'exitCode': process.returncode, 'stdout': stdout, 'stderr': process.stderr.decode('utf-8'),
                    'fixtureReadOnly': before == after,
                    'status': 'PASS' if process.returncode == 1 and reason in stdout and before == after else 'FAIL'})
out = SOURCE / 'iterations/0.9/independent-junction-final-results.json'
out.write_text(json.dumps({'results': results}, indent=2) + '\n', encoding='utf-8')
print(json.dumps({'output': str(out), 'results': [{'name': r['name'], 'status': r['status']} for r in results]}))
