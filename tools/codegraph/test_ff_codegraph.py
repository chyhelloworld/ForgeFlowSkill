import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch
import ff_codegraph as m

class AdapterTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory(); self.addCleanup(self.temp.cleanup)
        self.base=Path(self.temp.name); self.repo=self.base/'repo'; self.repo.mkdir()
        subprocess.run(['git','init','-q',str(self.repo)],check=True)
        (self.repo/'a.py').write_text('def alpha(): return 1\n')
        subprocess.run(['git','add','.'],cwd=self.repo,check=True)
        subprocess.run(['git','-c','user.name=Test','-c','user.email=test@example.invalid','commit','-qm','initial'],cwd=self.repo,check=True)
        self.cli=self.base/'cli'; self.cli.write_text('fixture')
        self.out=self.base/'evidence'
        self.args=['--enabled','--repo',str(self.repo),'--cli',str(self.cli),'--out',str(self.out),'--query','alpha']
    def fake(self,args,root,env):
        self.assertEqual(env['DO_NOT_TRACK'],'1'); self.assertNotIn('CODEGRAPH_DIR',env)
        cmd=args[1]
        if cmd in ('init','index'):
            (root/'.codegraph').mkdir(exist_ok=True); (root/'.codegraph/codegraph.db').write_text('index')
        return dict(argv=args,exit=0,seconds=0.01,stdout='1.6.2\n' if cmd=='--version' else '[]',stderr='')
    def read(self): return json.loads((self.out/'evidence.json').read_text())
    def test_disabled(self):
        self.assertEqual(m.main(self.args[1:]),0); self.assertFalse(self.out.exists())
    def test_success(self):
        with patch.object(m,'command',side_effect=self.fake): self.assertEqual(m.main(self.args),0)
        d=self.read(); self.assertEqual(d['approval'],'not-granted'); self.assertEqual(d['capture_status'],'stable-observation-not-approved')
    def test_existing_index_json(self):
        (self.repo/'.codegraph').mkdir();(self.repo/'.codegraph/codegraph.db').write_text('old')
        with patch.object(m,'command',side_effect=self.fake): self.assertEqual(m.main(self.args+['--kind','impact']),0)
        self.assertEqual(self.read()['index_command']['argv'][1],'index')
    def test_invalid_paths_query(self):
        for extra in (['--out',str(self.repo/'out')],['--out',str(self.base)],['--query',' '],['--query=-x']):
            with self.assertRaises(ValueError): m.main(self.args+extra)
    def test_wrong_version(self):
        with patch.object(m,'command',return_value=dict(exit=0,stdout='1.6.3')): self.assertEqual(m.main(self.args),2)
    def test_index_failure(self):
        def fake(args,root,env):
            r=self.fake(args,root,env)
            if args[1]=='init': r['exit']=1
            return r
        with patch.object(m,'command',side_effect=fake): self.assertEqual(m.main(self.args),2)
    def test_query_failure(self):
        def fake(args,root,env):
            r=self.fake(args,root,env)
            if args[1]=='explore': r['exit']=1
            return r
        with patch.object(m,'command',side_effect=fake): self.assertEqual(m.main(self.args),2)
    def test_changes_during_index(self):
        def fake(args,root,env):
            r=self.fake(args,root,env)
            if args[1]=='init': (root/'a.py').write_text('changed')
            return r
        with patch.object(m,'command',side_effect=fake): self.assertEqual(m.main(self.args),2)
    def test_changes_during_query(self):
        def fake(args,root,env):
            r=self.fake(args,root,env)
            if args[1]=='explore': (root/'a.py').unlink()
            return r
        with patch.object(m,'command',side_effect=fake): self.assertEqual(m.main(self.args),2)
    def test_index_change_during_query(self):
        def fake(args,root,env):
            r=self.fake(args,root,env)
            if args[1]=='explore': (root/'.codegraph/codegraph.db').write_text('new')
            return r
        with patch.object(m,'command',side_effect=fake): self.assertEqual(m.main(self.args),2)
    def test_dirty_and_rename(self):
        a=m.snapshot(self.repo); (self.repo/'a.py').rename(self.repo/'b.py');b=m.snapshot(self.repo)
        self.assertNotEqual(a,b);self.assertIn('b.py',b['files_sha256'])
    def test_symlink_rejected(self):
        (self.repo/'link').symlink_to(self.cli)
        with self.assertRaises(ValueError): m.snapshot(self.repo)
    def test_index_symlink_rejected(self):
        (self.repo/'.codegraph').symlink_to(self.base, target_is_directory=True)
        with patch.object(m,'command') as call:
            self.assertEqual(m.main(self.args),2); call.assert_not_called()
    def test_index_member_symlink_rejected(self):
        (self.repo/'.codegraph').mkdir(); (self.repo/'.codegraph/codegraph.db').symlink_to(self.cli)
        with patch.object(m,'command') as call:
            self.assertEqual(m.main(self.args),2); call.assert_not_called()
    def test_missing_cli(self):
        self.cli.unlink()
        self.assertEqual(m.main(self.args),2); self.assertEqual(self.read()['capture_status'],'invalid')
    def test_command_real(self):
        r=m.command(['git','rev-parse','HEAD'],self.repo,os.environ)
        self.assertEqual(r['exit'],0); self.assertGreater(r['seconds'],0)

if __name__=='__main__': unittest.main()
