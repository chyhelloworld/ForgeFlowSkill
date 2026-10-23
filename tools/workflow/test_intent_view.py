"""Behavior checks for the source CLI; fixtures stay inside this checkout."""
import hashlib
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('intent_view', Path(__file__).with_name('intent_view.py'))
view = importlib.util.module_from_spec(spec)
spec.loader.exec_module(view)


class IntentViewTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(prefix='intent-view-test-', dir=ROOT)
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        assert self.root.resolve().is_relative_to(ROOT.resolve())
        self.doc = ('## R1 Read progress\nUser goal.\n## M1\nRead only.\n'
                    '## T1\nImplementation.\n## A1\nAcceptance.\n'
                    '## progress\n- [x] T1\n## result\nA1=FAIL\n')
        (self.root / 'plan.md').write_text(self.doc, encoding='utf-8')
        self.data = {'format': 'intent-links-v1', 'baseline_ref': 'plan.md#R1', 'source_revision': 'declared-only',
                     'requirements': [{'id': 'R1', 'ref': 'plan.md#R1', 'parent_ids': []}],
                     'modules': [{'id': 'M1', 'ref': 'plan.md#M1', 'requirement_ids': ['R1']}],
                     'tasks': [{'id': 'T1', 'ref': 'plan.md#T1', 'requirement_ids': ['R1'], 'module_ids': ['M1'],
                                'acceptance_ids': ['A1'], 'progress_ref': 'plan.md#progress'}],
                     'acceptance': [{'id': 'A1', 'ref': 'plan.md#A1', 'requirement_ids': ['R1'], 'module_ids': ['M1'],
                                     'evidence_refs': ['evidence.log'], 'result_ref': 'plan.md#result'}]}
        (self.root / 'evidence.log').write_text('raw failure evidence\n', encoding='utf-8')

    def report(self):
        (self.root / 'index.json').write_text(json.dumps(self.data), encoding='utf-8')
        return view.build_report(self.root, 'index.json')

    def test_done_never_means_requirement_accepted(self):
        row = self.report()['requirements'][0]
        self.assertEqual(row['tasks'][0]['progress'], 'done')
        self.assertEqual(row['acceptance'][0]['recorded_result'], 'FAIL')
        self.assertEqual(row['requirement_acceptance'], 'unknown')
        self.assertEqual(row['user_acceptance'], 'unknown')

    def test_pass_is_only_reported_not_freshness_or_acceptance(self):
        (self.root / 'plan.md').write_text(self.doc.replace('A1=FAIL', 'A1=PASS'), encoding='utf-8')
        row = self.report()['requirements'][0]
        self.assertEqual(row['acceptance'][0]['recorded_result'], 'PASS')
        self.assertEqual(row['acceptance'][0]['validity'], 'unknown')
        self.assertEqual(row['requirement_acceptance'], 'unknown')

    def test_missing_broken_and_dangling_are_visible(self):
        self.data['tasks'][0]['module_ids'] = ['M-absent']
        self.data['tasks'][0]['progress_ref'] = None
        self.data['acceptance'][0]['result_ref'] = 'plan.md#absent'
        (self.root / 'evidence.log').unlink()
        report = self.report()
        self.assertTrue(any('M-absent' in gap for gap in report['gaps']))
        row = report['requirements'][0]
        self.assertEqual(row['tasks'][0]['progress'], 'unknown')
        self.assertEqual(row['acceptance'][0]['recorded_result'], 'unknown')
        self.assertTrue(row['acceptance'][0]['evidence'][0]['problem'])
        self.assertTrue(any('anchor' in gap for gap in row['gaps']))

    def test_no_result_can_be_inferred_from_unrelated_section(self):
        (self.root / 'plan.md').write_text(self.doc.replace('A1=FAIL', 'No result.\n## elsewhere\nA1=PASS'), encoding='utf-8')
        self.assertEqual(self.report()['requirements'][0]['acceptance'][0]['recorded_result'], 'unknown')

    def test_conflicting_and_malformed_states_are_unknown(self):
        for text in ('A1=PASS\nA1=FAIL', 'A1=PASSISH', 'A1=PASS/FAIL', 'A1=[PASS]'):
            with self.subTest(text=text):
                self.assertEqual(view.recorded_state({'text': text}, 'A1'), 'unknown')
        self.assertEqual(view.recorded_state({'text': '- [x] T1\n- [ ] T1'}, 'T1', True), 'unknown')

    def test_known_record_must_not_hide_unknown_assignment(self):
        for suffix in ('NOT_RUN', 'PASSISH', 'PASS/FAIL', '[PASS]', ''):
            with self.subTest(suffix=suffix):
                text = 'A1=PASS\nA1=' + suffix
                self.assertEqual(view.recorded_state({'text': text}, 'A1'), 'unknown')
        self.assertEqual(view.recorded_state({'text': '- [x] T1\n- [?] T1'}, 'T1', True), 'unknown')
        self.assertEqual(view.recorded_state({'text': 'A1=PASS，A2=FAIL。A1=PASS'}, 'A1'), 'PASS')

    def test_unmapped_objects_and_missing_edges_survive_filter(self):
        self.data['modules'].append({'id': 'M-orphan', 'ref': 'absent.md', 'requirement_ids': []})
        self.data['tasks'].append({'id': 'T-orphan', 'ref': 'absent.md', 'requirement_ids': []})
        self.data['acceptance'].append({'id': 'A-orphan', 'ref': 'absent.md', 'requirement_ids': [],
                                        'result_ref': 'plan.md#result'})
        self.data['tasks'][0]['module_ids'] = []
        (self.root / 'plan.md').write_text(self.doc + 'A-orphan=FAIL\n', encoding='utf-8')
        self.report()
        for requirement in (None, 'R1'):
            with self.subTest(requirement=requirement):
                report = view.build_report(self.root, 'index.json', requirement)
                gaps = '\n'.join(report['gaps'])
                for ident in ('M-orphan', 'T-orphan', 'A-orphan'):
                    self.assertIn(ident + ': no valid requirement mapping', gaps)
                self.assertIn('absent.md', gaps)
                self.assertIn('A-orphan: recorded result FAIL', gaps)
                self.assertIn('T1: no module mapping', gaps)
                self.assertIn('A-orphan: recorded result FAIL', view.render(report))

    def test_multiple_relations_and_exact_requirement_filter(self):
        self.data['requirements'].append({'id': 'R2', 'ref': 'plan.md#R1', 'parent_ids': ['R1']})
        for group in ('modules', 'tasks', 'acceptance'):
            self.data[group][0]['requirement_ids'].append('R2')
        self.report()
        report = view.build_report(self.root, 'index.json', 'R2')
        self.assertEqual([r['id'] for r in report['requirements']], ['R2'])
        self.assertEqual(report['requirements'][0]['tasks'][0]['id'], 'T1')
        with self.assertRaisesRegex(ValueError, 'unknown requirement'):
            view.build_report(self.root, 'index.json', 'R3')

    def test_existing_markdown_contract_example_is_supported(self):
        report = view.build_report(ROOT, 'examples/intent-loop-minimal.md', 'R-1a')
        row = report['requirements'][0]
        self.assertEqual(row['tasks'][0]['progress'], 'done')
        results = {x['id']: x['recorded_result'] for x in row['acceptance']}
        self.assertEqual(results, {'A-submit': 'PASS', 'A-recover': 'FAIL'})
        self.assertEqual(row['requirement_acceptance'], 'unknown')

    def test_invalid_index_formats_fail_clearly(self):
        for raw in ('{bad', '[]', '{"format":"other"}', '{}'):
            with self.subTest(raw=raw), self.assertRaises(ValueError):
                view.load_index(raw)
        self.data['modules'][0]['id'] = 'R1'
        with self.assertRaisesRegex(ValueError, 'duplicate'):
            self.report()

    def test_typed_relations_and_refs_validated(self):
        for field, value in [('module_ids', 'M1'), ('acceptance_ids', [None]), ('progress_ref', 4)]:
            original = self.data['tasks'][0].get(field)
            self.data['tasks'][0][field] = value
            with self.subTest(field=field), self.assertRaisesRegex(ValueError, 'invalid'):
                self.report()
            self.data['tasks'][0][field] = original

    def test_inline_status_is_not_authority(self):
        self.data['requirements'][0]['status'] = 'accepted'
        report = self.report()
        self.assertEqual(report['requirements'][0]['requirement_acceptance'], 'unknown')
        self.assertTrue(any('inline status ignored' in gap for gap in report['gaps']))

    def test_reader_rejects_escape_binary_and_oversize(self):
        reader = view.Reader(self.root)
        for name in ('../private.txt', 'C:/private.txt', '/private.txt', 'file:stream', 'a\\b'):
            with self.subTest(name=name), self.assertRaises(ValueError):
                reader.read(name)
        (self.root / 'large.log').write_bytes(b'a' * (view.LIMIT + 1))
        (self.root / 'binary.log').write_bytes(b'\xff\xfe')
        self.assertTrue(reader.reference('large.log')['problem'])
        self.assertTrue(reader.reference('binary.log')['problem'])

    def test_reader_rejects_real_symlink_when_available(self):
        reader = view.Reader(self.root)
        try:
            (self.root / 'link.md').symlink_to(self.root / 'plan.md')
        except OSError:
            self.skipTest('host cannot create symlink without extra privilege; no escalation')
        self.assertIn('symlink', reader.reference('link.md')['problem'])

    def test_missing_and_ambiguous_anchor(self):
        for source in ('no anchor', '## A1\nx\n## A1\ny'):
            with self.assertRaisesRegex(ValueError, 'anchor'):
                view.locate(source, 'A1')
        self.assertEqual(view.locate('| R1 | row |\n| R2 | other |', 'R1'), '| R1 | row |')

    def test_real_cli_json_text_errors_and_no_input_writes(self):
        self.report()
        paths = [p for p in self.root.iterdir() if p.is_file()]
        before = {p: hashlib.sha256(p.read_bytes()).hexdigest() for p in paths}
        argv = [sys.executable, '-X', 'utf8', '-B', str(ROOT / 'tools/workflow/intent_view.py'),
                '--root', str(self.root), '--index', 'index.json']
        result = subprocess.run(argv + ['--json'], capture_output=True, text=True, encoding='utf-8')
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertEqual(json.loads(result.stdout)['requirements'][0]['tasks'][0]['progress'], 'done')
        result = subprocess.run(argv, capture_output=True, text=True, encoding='utf-8')
        self.assertIn('原记录=FAIL', result.stdout)
        bad = subprocess.run(argv + ['--requirement', 'absent', '--json'], capture_output=True, text=True, encoding='utf-8')
        self.assertEqual(bad.returncode, 2)
        self.assertIn('error', json.loads(bad.stdout))
        self.assertEqual(before, {p: hashlib.sha256(p.read_bytes()).hexdigest() for p in paths})


if __name__ == '__main__':
    unittest.main(verbosity=2)
