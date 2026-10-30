"""Static distribution/reference checks, never a model-behavior verdict."""
import json
from pathlib import Path
import re
import unittest

ROOT = Path(__file__).resolve().parents[2]
ROLES = ('grill', 'intake', 'spec', 'plan', 'design', 'prove', 'implement', 'review', 'deliver', 'handoff')


class IntentDistributionTests(unittest.TestCase):
    def test_independently_installed_contracts_are_identical(self):
        source = (ROOT / 'docs/maintainers/INTENT-LOOP.md').read_bytes()
        for role in ROLES:
            with self.subTest(role=role):
                folder = ROOT / f'skills/ff-{role}'
                self.assertEqual(source, (folder / 'references/intent-loop.md').read_bytes())
                self.assertIn('(references/intent-loop.md)', (folder / 'SKILL.md').read_text(encoding='utf-8'))

    def test_reporting_rule_is_in_every_independent_skill_entry(self):
        # Distribution only: matching prose is not proof of model behavior.
        source = (ROOT / 'docs/maintainers/INTENT-LOOP.md').read_text(encoding='utf-8')
        heading = '## 具体汇报\n\n'
        self.assertTrue(heading in source, 'shared source lacks the concrete-reporting section')
        rule = source.split(heading, 1)[1].split('\n\n', 1)[0]
        folders = sorted((ROOT / 'skills').iterdir())
        self.assertEqual(len(folders), 21)
        for folder in folders:
            with self.subTest(skill=folder.name):
                entry = (folder / 'SKILL.md').read_text(encoding='utf-8')
                self.assertEqual(entry.count(heading), 1)
                self.assertEqual(entry.split(heading, 1)[1].split('\n\n', 1)[0], rule)

    def test_feedback_is_available_at_completion_interruption_and_retro(self):
        source = (ROOT / 'docs/maintainers/USE-FEEDBACK.md').read_bytes()
        for role in ('deliver', 'handoff', 'retro', 'diagnose', 'tdd', 'research', 'writing-fragments', 'writing-shape', 'writing-beats'):
            with self.subTest(role=role):
                folder = ROOT / f'skills/ff-{role}'
                self.assertEqual(source, (folder / 'references/use-feedback.md').read_bytes())
                self.assertIn('(references/use-feedback.md)', (folder / 'SKILL.md').read_text(encoding='utf-8'))

    def test_example_relations_resolve_without_copying_state(self):
        content = (ROOT / 'examples/intent-loop-minimal.md').read_text(encoding='utf-8')
        data = json.loads(re.search(r'```json\n(.*?)\n```', content, re.S)[1])
        self.assertEqual(data['format'], 'intent-links-v1')
        groups = {kind: {item['id'] for item in data[kind]} for kind in ('requirements', 'modules', 'tasks', 'acceptance')}
        all_items = sum((data[kind] for kind in groups), [])
        self.assertEqual(len(all_items), len({item['id'] for item in all_items}))
        targets = {'parent_ids': 'requirements', 'requirement_ids': 'requirements', 'module_ids': 'modules', 'acceptance_ids': 'acceptance'}
        for item in all_items:
            with self.subTest(id=item['id']):
                self.assertNotIn('status', item)
                for field, kind in targets.items():
                    self.assertLessEqual(set(item.get(field, [])), groups[kind])
                for key in ('ref', 'progress_ref', 'result_ref'):
                    if item.get(key):
                        path, anchor = item[key].split('#')
                        self.assertIn(f'<a id="{anchor}"></a>', (ROOT / path).read_text(encoding='utf-8'))
        self.assertNotEqual(data['tasks'][0]['progress_ref'], data['acceptance'][0]['result_ref'])
        self.assertGreater(len(data['acceptance'][-1]['module_ids']), 1)


if __name__ == '__main__':
    unittest.main(verbosity=2)
