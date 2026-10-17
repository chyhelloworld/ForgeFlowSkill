import contextlib
import hashlib
import importlib.util
import io
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
spec=importlib.util.spec_from_file_location('resume',Path(__file__).resolve().parents[2]/'skills/ff-handoff/scripts/resume.py')
r=importlib.util.module_from_spec(spec);spec.loader.exec_module(r)

class ResumeTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.addCleanup(self.temp.cleanup);self.root=Path(self.temp.name)
        (self.root/'spec').write_text('latest approved requirement');(self.root/'output').write_text('real test output: exit0')
        evidence=lambda n:{'path':n,'sha256':hashlib.sha256((self.root/n).read_bytes()).hexdigest()}
        (self.root/'done').write_text(json.dumps({'actionId':'test-01','goalRevision':'R2','dependencyFingerprint':r.dependency_fingerprint([evidence('spec')]),'operation':'run tests','exitCode':0,'outputs':[evidence('output')]}))
        self.data={'projectRoot':str(self.root),'version':1,'goalRevision':'R2','dependencies':[evidence('spec')],'actions':[{'id':'test-01','state':'done','receipt':[evidence('done')]},{'id':'review-01','state':'pending'}]}
    def inspect(self, goal='R2'):return r.inspect(self.root,self.data,goal)
    def test_completed_skipped_pending_needs_authority(self):
        self.assertEqual([a['recommendation'] for a in self.inspect()['actions']],['SKIP_COMPLETED','VERIFY_CURRENT_AUTHORITY'])
    def test_latest_goal_invalidates(self):self.assertEqual(self.inspect('R3')['status'],'INSPECT')
    def test_dependency_mutation_invalidates_done(self):
        (self.root/'spec').write_text('changed');self.assertEqual(self.inspect()['actions'][0]['recommendation'],'INSPECT')
    def test_missing_receipt_is_not_done(self):
        self.data['actions'][0]['receipt']=[];self.assertEqual(self.inspect()['status'],'INSPECT')
    def test_running_and_unknown_never_restart(self):
        for state in ['running','unknown','invalid']:
            self.data['actions'][0]['state']=state;self.assertEqual(self.inspect()['actions'][0]['recommendation'],'INSPECT')
    def test_duplicate_id_blocks(self):
        self.data['actions'][1]['id']='test-01';self.assertEqual(self.inspect()['status'],'INSPECT')
    def test_running_action_preserves_independent_completion(self):
        self.data['actions'][1]['state']='running'
        self.assertEqual([a['recommendation'] for a in self.inspect()['actions']],['SKIP_COMPLETED','INSPECT'])
    def test_refreshed_dependency_cannot_reuse_receipt(self):
        (self.root/'spec').write_text('changed')
        self.data['dependencies'][0]['sha256']=hashlib.sha256((self.root/'spec').read_bytes()).hexdigest()
        self.assertEqual(self.inspect()['actions'][0]['recommendation'],'INSPECT')
    def test_legacy_receipt_requires_inspection(self):
        receipt=json.loads((self.root/'done').read_text());del receipt['dependencyFingerprint']
        (self.root/'done').write_text(json.dumps(receipt))
        self.data['actions'][0]['receipt'][0]['sha256']=hashlib.sha256((self.root/'done').read_bytes()).hexdigest()
        self.assertEqual(self.inspect()['actions'][0]['recommendation'],'INSPECT')
    def test_windows_anchors_and_stream_paths_rejected(self):
        for name in [str(self.root/'spec'),'/spec','../spec','C:spec','spec:stream','bad\x00name']:
            self.assertTrue(r.file_problem(self.root,{'path':name}))
    def test_bad_inputs(self):
        self.assertTrue(r.file_problem(self.root,{'path':'../escape'}));self.assertTrue(r.file_problem(self.root,{}))
        self.data['actions']=[{}];self.assertEqual(self.inspect()['status'],'INSPECT')
        self.data['actions']=[];self.assertEqual(self.inspect()['status'],'INSPECT')
    def test_receipt_content_and_scope(self):
        for content in ['done','  ','{}','[]']:
            (self.root/'done').write_text(content)
            self.data['actions'][0]['receipt'][0]['sha256']=hashlib.sha256((self.root/'done').read_bytes()).hexdigest()
            self.assertEqual(self.inspect()['status'],'INSPECT')
    def test_strict_version_root_and_id(self):
        for version in [True,1.0,'1']:
            self.data['version']=version;self.assertEqual(self.inspect()['status'],'INSPECT')
        self.data['version']=1;self.data['projectRoot']='/other';self.assertEqual(self.inspect()['status'],'INSPECT')
        self.data['projectRoot']=str(self.root);self.data['actions'][0]['id']='test-01 ';self.assertEqual(self.inspect()['status'],'INSPECT')
    def test_cli_instrumented_readonly(self):
        p=self.root/'checkpoint.json';p.write_text(json.dumps(self.data));before=p.read_bytes()
        with patch('sys.argv',['resume.py',str(p),'--root',str(self.root),'--current-goal','R2']),contextlib.redirect_stdout(io.StringIO()):self.assertEqual(r.main(),0)
        self.assertEqual(before,p.read_bytes());p.write_text('bad')
        with patch('sys.argv',['resume.py',str(p),'--root',str(self.root),'--current-goal','R2']),contextlib.redirect_stdout(io.StringIO()):self.assertEqual(r.main(),2)

if __name__=='__main__':unittest.main()
