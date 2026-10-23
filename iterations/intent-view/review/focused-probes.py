"""Local recheck of IVR-001/002 using the preserved initial fixtures."""
from datetime import datetime, timezone
import hashlib
import importlib.util
import json
from pathlib import Path
import subprocess
import sys

REVIEW = Path(__file__).absolute().parent
ROOT = REVIEW.parents[2]
SOURCE = ROOT / 'tools/workflow/intent_view.py'


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


files = ['tools/workflow/intent_view.py', 'tools/workflow/test_intent_view.py',
         'tools/workflow/test_intent_contract.py', 'docs/intent-view.md',
         'planning/intent-view-links.json', 'iterations/intent-view/results.md',
         'iterations/intent-view/evidence/review-regression-before.json',
         'iterations/intent-view/evidence/tests-after-review.json',
         'iterations/intent-view/review/initial-review.md',
         'iterations/intent-view/review/probe-commands.json',
         'iterations/intent-view/review/probe-summary.json',
         'iterations/intent-view/review/reviewed-snapshot.json']
files.extend(str(p.relative_to(ROOT)).replace('\\', '/') for p in (REVIEW / 'fixtures').rglob('*') if p.is_file())
before = {name: sha(ROOT / name) for name in files}
evidence = json.loads((ROOT / 'iterations/intent-view/evidence/tests-after-review.json').read_text(encoding='utf-8'))
spec = importlib.util.spec_from_file_location('focused_intent_view', SOURCE)
view = importlib.util.module_from_spec(spec)
spec.loader.exec_module(view)
result = {'recorded_at': datetime.now(timezone.utc).isoformat(), 'cwd': str(ROOT),
          'python': sys.executable, 'version': sys.version, 'before_sha256': before,
          'evidence_source_matches_current': {p: sha(ROOT / p) == digest for p, digest in evidence['sources'].items()},
          'commands': [], 'observations': []}

for name, requirement in [('control', None), ('mixed_unknown', None), ('orphaned_rows', None),
                          ('orphaned_rows', 'R1'), ('task_without_module', None)]:
    argv = [sys.executable, '-X', 'utf8', '-B', str(SOURCE), '--root', str(REVIEW / 'fixtures' / name),
            '--index', 'index.json', '--json']
    if requirement:
        argv += ['--requirement', requirement]
    started = datetime.now(timezone.utc).isoformat()
    run = subprocess.run(argv, cwd=ROOT, capture_output=True, text=True, encoding='utf-8', timeout=30)
    label = name + ('-filtered' if requirement else '')
    entry = {'label': label, 'argv': argv, 'cwd': str(ROOT), 'started_at': started,
             'exit_code': run.returncode, 'stdout': run.stdout, 'stderr': run.stderr}
    if run.returncode == 0:
        report = json.loads(run.stdout)
        entry['rendered_from_same_report'] = view.render(report)
        result['observations'].append({'label': label, 'global_gaps': report['gaps'],
                                       'requirement_gaps': [row['gaps'] for row in report['requirements']],
                                       'recorded_result': report['requirements'][0]['acceptance'][0]['recorded_result'],
                                       'requirement_acceptance': report['requirements'][0]['requirement_acceptance'],
                                       'user_acceptance': report['requirements'][0]['user_acceptance']})
    result['commands'].append(entry)

result['unchanged_after'] = {name: sha(ROOT / name) == digest for name, digest in before.items()}
(REVIEW / 'focused-probe-output.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8', newline='\n')
print(json.dumps({k: v for k, v in result.items() if k not in ('commands', 'before_sha256')}, ensure_ascii=False, indent=2))
