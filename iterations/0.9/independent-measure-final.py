"""Independent same-byte coverage/CC run; no production or old evidence edits."""
import ast
import hashlib
import importlib.util
import io
import json
import os
from pathlib import Path
import sys
import time
import unittest

ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / 'iterations/0.9'
FIXTURE = ROOT.parent / '_handoff/20261017/independent09-fixtures/final-metrics'
FIXTURE.mkdir(exist_ok=True)
TEMP = FIXTURE / 'tmp'
TEMP.mkdir(exist_ok=True)
os.environ['TEMP'] = os.environ['TMP'] = str(TEMP)
sys.dont_write_bytecode = True
sys.path.insert(0, str(ROOT.parent / '_tools/python-metrics'))
import tempfile
tempfile.tempdir = str(TEMP)
import coverage
import radon
from radon.complexity import cc_visit

SOURCE = ROOT / 'skills/ff-design/scripts/journey.py'
TESTS = ROOT / 'tools/workflow/test_journey.py'
source_before = SOURCE.read_bytes()
sha = hashlib.sha256(source_before).hexdigest()
snapshot = {'capturedUtcEpoch': time.time(), 'sourceSha256': sha,
            'testSha256': hashlib.sha256(TESTS.read_bytes()).hexdigest()}
(OUTPUT / 'independent-source-snapshot-final.json').write_text(json.dumps(snapshot, indent=2) + '\n', encoding='utf-8')
cov = coverage.Coverage(data_file=str(FIXTURE / '.coverage-independent-final'), branch=True, include=[str(SOURCE)])
cov.start()
spec = importlib.util.spec_from_file_location('independent_target_tests', TESTS)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
suite = unittest.defaultTestLoader.loadTestsFromModule(module)
log = io.StringIO()
result = unittest.TextTestRunner(stream=log, verbosity=2).run(suite)
cov.stop()
cov.save()
raw = OUTPUT / 'independent-coverage-final.json'
cov.json_report(outfile=str(raw))
(OUTPUT / 'independent-unit-final.log').write_text(log.getvalue(), encoding='utf-8')
report = json.loads(raw.read_text(encoding='utf-8'))
assert coverage.__version__ == '7.6.1' and radon.__version__ == '6.0.1'
assert report['meta']['branch_coverage'] is True
assert len(report['files']) == 1
file_report = next(iter(report['files'].values()))
functions = {k: v for k, v in file_report['functions'].items() if k}
cc = {block.name: block.complexity for block in cc_visit(source_before.decode('utf-8'))}
nodes = [node for node in ast.walk(ast.parse(source_before)) if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))]
assert len(nodes) == len({node.name for node in nodes}) and all(node.col_offset == 0 for node in nodes)
assert set(functions) == set(cc) == {node.name for node in nodes}
rows = []
for name in cc:
    summary = functions[name]['summary']
    denominator = summary['num_statements'] + summary['num_branches']
    assert denominator > 0
    ratio = (summary['covered_lines'] + summary['covered_branches']) / denominator
    score = cc[name] ** 2 * (1 - ratio) ** 3 + cc[name]
    rows.append({'name': name, 'cc': cc[name], 'coverage': ratio, 'crap': score,
                 'summary': summary, 'missingLines': functions[name]['missing_lines'],
                 'missingBranches': functions[name]['missing_branches']})
unchanged = source_before == SOURCE.read_bytes()
production = json.loads((OUTPUT / 'function-metrics.json').read_text(encoding='utf-8'))
production_rows = {row['name']: row for row in production['functions']}
same_metrics = all(production_rows[r['name']]['sha256'] == sha and all(
    production_rows[r['name']][k] == r[k] for k in ('cc', 'coverage', 'crap')) for r in rows) and set(production_rows) == set(cc)
summary = {'status': 'PASS' if result.wasSuccessful() and unchanged and all(r['crap'] <= 50 for r in rows) else 'FAIL',
           'sourceSha256': sha, 'sourceUnchanged': unchanged, 'actualTestsRun': result.testsRun,
           'testSuccessful': result.wasSuccessful(), 'coverageVersion': coverage.__version__, 'radonVersion': radon.__version__,
           'rawCoveragePath': str(raw), 'coverageDefinition': 'Per-function combined executable lines and branch destinations, same as explicitly stated project convention; not basis-path coverage.',
           'functions': rows, 'allWithin50': all(r['crap'] <= 50 for r in rows),
           'maxCrap': max(r['crap'] for r in rows), 'productionMetricsMatchIndependentRun': same_metrics,
           'notMeasured': ['UI capture script', 'tests', 'independent probe/audit/measurement scripts', 'unchanged inherited helper and other package code'],
           'limits': 'Only the changed production journey.py functions were measured. Independent black-box subprocess probes are recorded separately and not inferred as covered here.'}
out = OUTPUT / 'independent-function-metrics-final.json'
out.write_text(json.dumps(summary, indent=2) + '\n', encoding='utf-8')
print(json.dumps({'output': str(out), 'status': summary['status'], 'functions': len(rows),
                  'maxCrap': summary['maxCrap'], 'productionMetricsMatchIndependentRun': same_metrics,
                  'actualTestsRun': result.testsRun}))
