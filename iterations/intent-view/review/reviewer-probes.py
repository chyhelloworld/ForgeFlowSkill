"""Independent review probes; all fixture/output writes stay beside this file."""
from copy import deepcopy
from datetime import datetime, timezone
import hashlib
import importlib.util
import json
from pathlib import Path
import subprocess
import sys

REVIEW = Path(__file__).absolute().parent
ROOT = REVIEW.parents[2]
FIXED = ROOT.parent / 'review-handoff-096'
SOURCE = ROOT / 'tools/workflow/intent_view.py'


def dump(name, value):
    path = REVIEW / name
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8', newline='\n')


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


product_files = ['README.md', 'docs/intent-view.md', 'planning/INTENT-VIEW-096.md',
                 'planning/INTENT-LOOP-096.md', 'planning/intent-view-links.json',
                 'examples/intent-loop-minimal.md', 'tools/workflow/intent_view.py',
                 'tools/workflow/test_intent_view.py', 'iterations/intent-view/results.md']
product_files.extend(str(p.relative_to(ROOT)).replace('\\', '/')
                     for p in (ROOT / 'iterations/intent-view/evidence').iterdir() if p.is_file())
before = {name: sha(ROOT / name) for name in product_files}
fixed_files = ['skills/ff-review/SKILL.md', 'skills/ff-review/references/review-handoff.md',
               'skills/ff-review/references/intent-loop.md']
binding = {'recorded_at': datetime.now(timezone.utc).isoformat(), 'cwd': str(ROOT),
           'python': sys.executable, 'version': sys.version,
           'files': before, 'fixed_skill_files': {name: sha(FIXED / name) for name in fixed_files},
           'global_instructions_sha256': sha(Path('C:/Users/admin/.codex/AGENTS.md'))}
dump('reviewed-snapshot.json', binding)

commands = []


def command(argv, label):
    start = datetime.now(timezone.utc).isoformat()
    result = subprocess.run(argv, cwd=ROOT, capture_output=True, text=True, encoding='utf-8', timeout=30)
    item = {'label': label, 'argv': argv, 'cwd': str(ROOT), 'started_at': start,
            'exit_code': result.returncode, 'stdout': result.stdout, 'stderr': result.stderr}
    commands.append(item)
    dump('probe-commands.json', commands)
    return result


command(['git', 'rev-parse', 'HEAD'], 'reviewed_head')
command(['git', 'status', '--short'], 'reviewed_status')
command(['git', '-C', str(FIXED), 'rev-parse', 'HEAD'], 'fixed_skill_head')
command(['git', '-C', str(FIXED), 'status', '--short'], 'fixed_skill_status')
base_argv = [sys.executable, '-X', 'utf8', '-B', str(SOURCE)]
real = command(base_argv + ['--root', str(ROOT), '--index', 'planning/intent-view-links.json', '--json'], 'current_real_cli')
real_report = json.loads(real.stdout) if real.returncode == 0 else None
if real_report:
    observed_check = {name: sha(ROOT / name) == digest for name, digest in real_report['observed_sha256'].items()}
else:
    observed_check = {}

spec = importlib.util.spec_from_file_location('reviewed_intent_view', SOURCE)
view = importlib.util.module_from_spec(spec)
spec.loader.exec_module(view)

data = {'format': 'intent-links-v1', 'baseline_ref': 'plan.md#R1', 'source_revision': 'review-fixture',
        'requirements': [{'id': 'R1', 'ref': 'plan.md#R1', 'parent_ids': []}],
        'modules': [{'id': 'M1', 'ref': 'plan.md#M1', 'requirement_ids': ['R1']}],
        'tasks': [{'id': 'T1', 'ref': 'plan.md#T1', 'requirement_ids': ['R1'], 'module_ids': ['M1'],
                   'acceptance_ids': ['A1'], 'progress_ref': 'plan.md#progress'}],
        'acceptance': [{'id': 'A1', 'ref': 'plan.md#A1', 'requirement_ids': ['R1'], 'module_ids': ['M1'],
                        'evidence_refs': ['evidence.log'], 'result_ref': 'plan.md#result'}]}
doc = ('## R1\nInspect links.\n## M1\nReader.\n## T1\nRead.\n## A1\nObserve.\n'
       '## progress\n- [x] T1\n## result\nA1=PASS\n')
case_results = []
for name in ('control', 'mixed_unknown', 'orphaned_rows', 'task_without_module'):
    folder = REVIEW / 'fixtures' / name
    folder.mkdir(parents=True, exist_ok=True)
    current_data, current_doc = deepcopy(data), doc
    if name == 'mixed_unknown':
        current_doc += 'A1=NOT_RUN\n'
    if name == 'orphaned_rows':
        current_data['modules'].append({'id': 'M-orphan', 'ref': 'missing.md#M-orphan', 'requirement_ids': []})
        current_data['tasks'].append({'id': 'T-orphan', 'ref': 'missing.md#T-orphan', 'requirement_ids': [],
                                      'module_ids': [], 'acceptance_ids': [], 'progress_ref': None})
        current_data['acceptance'].append({'id': 'A-orphan', 'ref': 'missing.md#A-orphan', 'requirement_ids': [],
                                           'module_ids': [], 'evidence_refs': [], 'result_ref': 'plan.md#result'})
        current_doc += 'A-orphan=FAIL\n'
    if name == 'task_without_module':
        current_data['tasks'][0]['module_ids'] = []
    (folder / 'plan.md').write_text(current_doc, encoding='utf-8', newline='\n')
    (folder / 'index.json').write_text(json.dumps(current_data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8', newline='\n')
    (folder / 'evidence.log').write_text('Synthetic probe evidence.\n', encoding='utf-8', newline='\n')
    result = command(base_argv + ['--root', str(folder), '--index', 'index.json', '--json'], name)
    report = json.loads(result.stdout) if result.returncode == 0 else None
    if report:
        rendered = view.render(report)
        (folder / 'rendered.txt').write_text(rendered + '\n', encoding='utf-8', newline='\n')
        case_results.append({'name': name, 'exit_code': result.returncode,
                             'global_gaps': report['gaps'], 'requirement_gaps': [r['gaps'] for r in report['requirements']],
                             'recorded_result': report['requirements'][0]['acceptance'][0]['recorded_result'],
                             'render_contains_orphan': 'orphan' in rendered,
                             'json_contains_orphan_id': any(ident in result.stdout for ident in ('M-orphan', 'T-orphan', 'A-orphan'))})
    else:
        case_results.append({'name': name, 'exit_code': result.returncode, 'error': result.stdout + result.stderr})

evidence_notes = []
for name in ('tests-initial.json', 'tests-path-fix.json', 'tests-local.json', 'tests-final.json',
             'demo-initial.json', 'demo-reviewed-input.json'):
    entry = json.loads((ROOT / 'iterations/intent-view/evidence' / name).read_text(encoding='utf-8'))
    note = {'name': name, 'source_matches_current': {}, 'runs': []}
    for path, digest in entry.get('sources', {}).items():
        note['source_matches_current'][path] = sha(ROOT / path) == digest
    if 'source_sha256' in entry:
        note['source_matches_current']['tools/workflow/intent_view.py'] = sha(SOURCE) == entry['source_sha256']
    for run in entry.get('commands', entry.get('runs', [entry])):
        run_note = {'argv': run['argv'], 'exit_code': run['exit_code'], 'stderr': run.get('stderr', '')}
        if run.get('stdout', '').startswith('{') and run['exit_code'] == 0:
            report = json.loads(run['stdout'])
            run_note['observed_input_matches_current'] = {p: sha(ROOT / p) == digest for p, digest in report.get('observed_sha256', {}).items()}
            run_note['report_summary'] = [{'id': r['id'], 'modules': [m['id'] for m in r['modules']],
                                           'tasks': [(t['id'], t['progress']) for t in r['tasks']],
                                           'acceptance': [(a['id'], a['recorded_result']) for a in r['acceptance']],
                                           'gaps': r['gaps']} for r in report.get('requirements', [])]
        note['runs'].append(run_note)
    evidence_notes.append(note)
dump('evidence-reuse-check.json', evidence_notes)

summary = {'cases': case_results, 'current_real_cli_exit': real.returncode,
           'real_input_hashes_unchanged': observed_check,
           'reviewed_files_unchanged': {name: sha(ROOT / name) == digest for name, digest in before.items()},
           'fixed_skill_files_unchanged': {name: sha(FIXED / name) == digest for name, digest in binding['fixed_skill_files'].items()},
           'notes': ['Original unit suite not rerun: its TemporaryDirectory writes at repository root, outside review write scope.',
                     'Real symlink/reparse, non-Windows execution, atomic snapshots and CRAP measurement remain unverified.']}
dump('probe-summary.json', summary)
print(json.dumps(summary, ensure_ascii=False, indent=2))
