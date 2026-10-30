"""Replay the new distribution test against old bytes; not behavioral TDD."""
import hashlib
import importlib.util
from pathlib import Path
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[3]
BASE = 'ab2ca09305e0a0f5f33a25511a08823d85afef72'
TEST = ROOT / 'tools/workflow/test_intent_contract.py'
print('baseline commit:', BASE, flush=True)
print('candidate test SHA256:', hashlib.sha256(TEST.read_bytes()).hexdigest(), flush=True)
spec = importlib.util.spec_from_file_location('contract', TEST)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
method = 'test_reporting_rule_is_in_every_independent_skill_entry'
with tempfile.TemporaryDirectory(prefix='reporting-static-baseline-', dir=ROOT) as directory:
    old = Path(directory)
    paths = ['docs/maintainers/INTENT-LOOP.md'] + [
        str(p.relative_to(ROOT)) for p in sorted((ROOT / 'skills').glob('*/SKILL.md'))]
    for name in paths:
        target = old / name
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(subprocess.check_output(['git', 'show', BASE + ':' + name], cwd=ROOT))
    module.ROOT = old
    print('BASELINE: expected structural failure, replayed after the change', flush=True)
    before = unittest.TextTestRunner(verbosity=2).run(unittest.TestSuite([module.IntentDistributionTests(method)]))
    module.ROOT = ROOT
    print('CANDIDATE: current working-tree rule distribution', flush=True)
    after = unittest.TextTestRunner(verbosity=2).run(unittest.TestSuite([module.IntentDistributionTests(method)]))
    if len(before.failures) != 1 or before.errors or not after.wasSuccessful():
        raise SystemExit('unexpected replay result')
print('Replay matched expectations; no behavioral improvement claim.', flush=True)
