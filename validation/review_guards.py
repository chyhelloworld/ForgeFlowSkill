import contextlib, copy, importlib.util, io, json, pathlib, tempfile, unittest
from unittest.mock import patch
P=pathlib.Path(__file__).resolve().parents[1]/'tools/spec_lifecycle.py'
spec=importlib.util.spec_from_file_location('lifecycle',P); m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
def fixture():
    old={'text':'List published posts'};new={'text':'Search published posts'}
    return {'schema_version':1,'current':{'version':1,'requirements':{'search':old}},'active':{'search_change':{'version':1,'baseline_version':1,'status':'verified','acceptance':{'ref':'SIMULATED','change_id':'search_change','change_version':1,'baseline_version':1,'evidence_version':1},'delta':[{'requirement_id':'search','old':old,'new':new,'why':'Find posts','confirmation_ref':'SIMULATED-confirmation'}],'tasks':[{'id':'task_search','requirement_ids':['search'],'change_version':1}],'evidence':[{'id':'test_search','requirement_ids':['search'],'change_version':1,'result':'pass','ref':'SIMULATED-test'}]}},'archived':{}}
class Guards(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory(); self.root=pathlib.Path(self.tmp.name); (self.root/'.forgeflow').mkdir();self.path=self.root/'.forgeflow/spec-state.json';self.state=fixture();self.save()
    def tearDown(self): self.tmp.cleanup()
    def save(self):self.path.write_text(json.dumps(self.state))
    def blocked(self, action='apply'):
        self.save();before=self.path.read_bytes()
        with self.assertRaises(m.Invalid): m.mutate(self.root,action,'search_change','SIMULATED')
        self.assertEqual(before,self.path.read_bytes());self.assertFalse((self.path.parent/'.spec.lock').exists())
    def test_apply_and_archive(self):
        x=m.mutate(self.root,'apply','search_change','SIMULATED');self.assertEqual(x['current']['version'],2);self.assertEqual(x['active']['search_change']['status'],'accepted')
        y=m.mutate(self.root,'archive','search_change','finished');self.assertEqual(x['current'],y['current']);self.assertEqual(m.validate(y),[])
    def test_stale_acceptance_rejected(self):
        change=self.state['active']['search_change'];change['version']=2;change['tasks'][0]['change_version']=2;change['evidence'][0]['change_version']=2;self.blocked()
    def test_missing_acceptance_rejected(self):del self.state['active']['search_change']['acceptance'];self.blocked()
    def test_wrong_acceptance_identity_rejected(self):self.state['active']['search_change']['acceptance']['change_id']='other';self.blocked()
    def test_boolean_acceptance_version_rejected(self):self.state['active']['search_change']['acceptance']['change_version']=True;self.blocked()
    def test_stale_baseline(self): self.state['current']['version']=2;self.blocked()
    def test_conflicting_old(self):self.state['current']['requirements']['search']={'text':'Different'};self.blocked()
    def test_stale_evidence(self):self.state['active']['search_change']['version']=2;self.state['active']['search_change']['tasks'][0]['change_version']=2;self.blocked()
    def test_unverified_cannot_apply(self):self.state['active']['search_change']['status']='implementing';self.blocked()
    def test_failed_evidence(self):self.state['active']['search_change']['evidence'][0]['result']='fail';self.blocked()
    def test_unresolved_cannot_archive(self):self.blocked('archive')
    def test_canceled_rejected_archive(self):
        for status in ['canceled','rejected']:
            self.state=fixture();self.state['active']['search_change']['status']=status;self.state['current']['version']=5;self.save();before=copy.deepcopy(self.state['current']);x=m.mutate(self.root,'archive','search_change','Not proceeding');self.assertEqual(x['current'],before)
    def test_replace_failure_rollback(self):
        before=self.path.read_bytes()
        with patch.object(m.os,'replace',side_effect=OSError('injected replace failure')):
            with self.assertRaises(OSError):m.mutate(self.root,'apply','search_change','SIMULATED')
        self.assertEqual(before,self.path.read_bytes());self.assertEqual(sorted(p.name for p in self.path.parent.iterdir()),['spec-state.json'])
    def test_fsync_failure_rollback(self):
        before=self.path.read_bytes()
        with patch.object(m.os,'fsync',side_effect=OSError('injected fsync failure')):
            with self.assertRaises(OSError):m.mutate(self.root,'apply','search_change','SIMULATED')
        self.assertEqual(before,self.path.read_bytes());self.assertEqual(sorted(p.name for p in self.path.parent.iterdir()),['spec-state.json'])
    def test_boolean_evidence_version_rejected(self):self.state['active']['search_change']['evidence'][0]['change_version']=True;self.blocked()
    def test_boolean_schema_version_rejected(self):
        self.state['schema_version']=True;self.save()
        with self.assertRaises(m.Invalid):m.load(self.path)
    def test_locked_writer_no_mutation(self):
        lock=self.path.parent/'.spec.lock';lock.write_text('busy');before=self.path.read_bytes()
        with self.assertRaises(FileExistsError):m.mutate(self.root,'apply','search_change','SIMULATED')
        self.assertEqual(before,self.path.read_bytes());self.assertEqual(lock.read_text(),'busy')
    def test_symlink_state_rejected(self):
        dest=self.root/'outside.json';self.path.rename(dest);self.path.symlink_to(dest)
        with self.assertRaises(m.Invalid):m.state_path(self.root)
    def test_symlink_ancestor_rejected(self):
        alias=self.root/'alias';alias.symlink_to(self.root,target_is_directory=True)
        with self.assertRaises(m.Invalid):m.state_path(alias/'alias')
    def invoke(self,*args):
        output=io.StringIO()
        with contextlib.redirect_stdout(output): code=m.main(list(args))
        result=json.loads(output.getvalue());self.assertEqual(result['passed'],code==0);self.assertIn('not authenticated',result['limits']);return code,result
    def test_cli_validate_readonly_and_failure(self):
        before=self.path.read_bytes();code,result=self.invoke('validate',str(self.root));self.assertEqual(code,0);self.assertEqual(before,self.path.read_bytes())
        self.state['current']['version']=2;self.save();before=self.path.read_bytes();code,result=self.invoke('validate',str(self.root));self.assertEqual(code,1);self.assertIn('stale baseline',str(result['errors']));self.assertEqual(before,self.path.read_bytes())
    def test_cli_apply_archive_and_failed_repeat(self):
        code,result=self.invoke('apply',str(self.root),'search_change','--acceptance-ref','SIMULATED');self.assertEqual(code,0)
        code,result=self.invoke('archive',str(self.root),'search_change','--reason','finished');self.assertEqual(code,0);before=self.path.read_bytes()
        code,result=self.invoke('apply',str(self.root),'search_change','--acceptance-ref','SIMULATED');self.assertEqual(code,1);self.assertEqual(before,self.path.read_bytes())
    def test_duplicate_keys_rejected(self):
        self.path.write_text('{"schema_version":1,"schema_version":1}')
        with self.assertRaises(m.Invalid):m.load(self.path)
if __name__=='__main__':unittest.main(verbosity=2)
