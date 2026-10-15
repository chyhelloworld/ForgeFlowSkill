import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest


class BlogJourney(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.db = Path(self.temp.name) / 'posts.json'

    def cli(self, *args):
        result = subprocess.run([sys.executable, str(Path(__file__).with_name('blog.py')),
                                 '--db', str(self.db), *args], capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        return json.loads(result.stdout)

    def test_draft_publish_and_persistent_list(self):
        technical = self.cli('create', 'Python stdlib', 'A practical tutorial')
        product = self.cli('create', 'ForgeFlow introduction', 'Local workflow', '--kind', 'product')
        self.assertEqual(self.cli('list'), [])
        self.cli('publish', str(technical['id']))
        self.cli('publish', str(product['id']))
        visible = self.cli('list')
        self.assertEqual([p['kind'] for p in visible], ['technical', 'product'])
        self.assertEqual(len(json.loads(self.db.read_text())), 2)

    def test_search_defaults_to_published_and_explicit_drafts(self):
        post = self.cli('create', 'Python', 'Needle in body')
        self.assertEqual(self.cli('search', 'NEEDLE'), [])
        self.assertEqual(len(self.cli('search', 'NEEDLE', '--include-drafts')), 1)
        self.cli('publish', str(post['id']))
        self.assertEqual(len(self.cli('search', 'NEEDLE')), 1)
        self.assertEqual(len(self.cli('search', 'python')), 1)
        self.assertEqual(self.cli('search', 'missing'), [])


if __name__ == '__main__':
    unittest.main()
