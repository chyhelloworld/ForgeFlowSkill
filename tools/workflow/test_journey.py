import base64
import contextlib
import copy
import hashlib
import importlib.util
import io
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

path=Path(__file__).resolve().parents[2]/'skills/ff-design/scripts/journey.py'
spec=importlib.util.spec_from_file_location('journey',path)
j=importlib.util.module_from_spec(spec);spec.loader.exec_module(j)


class JourneyTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.addCleanup(self.temp.cleanup);self.root=Path(self.temp.name)
        for name in ['design','source','screen']:(self.root/name).write_bytes(name.encode())
        (self.root/'screen').write_bytes(base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg=='))
        self.data={'version':1,'target':'T1','surface':'ui','design':[self.record('design')],
                   'sources':[self.record('source')], 'expected':[{'id':'open','from':'start','to':'ready','action':'open'},
                   {'id':'select','from':'ready','to':'selected','action':'click'}]}
        self.data['observations']=copy.deepcopy(self.data['expected'])
        self.bind_traces()

    def record(self,name):return {'path':name,'sha256':hashlib.sha256((self.root/name).read_bytes()).hexdigest()}
    def bind_traces(self):
        fingerprint=j.load_helpers().dependency_fingerprint([self.data['design'],self.data['sources']])
        for step in self.data['observations']:
            name=step['id']+'.json';trace={'target':'T1','stepId':step['id'],'from':step['from'],'to':step['to'],
                'action':step['action'],'inputFingerprint':fingerprint,'screenshots':[self.record('screen')],
                'ok':True,'observed':{'visible':1}}
            (self.root/name).write_text(json.dumps(trace),encoding='utf-8')
            step.update(trace=self.record(name),screenshots=[self.record('screen')])
    def inspect(self):return j.inspect(self.root,self.data,'T1')
    def bad(self):self.assertEqual(self.inspect()['status'],'GAPS')
    def mutate_trace(self,change):
        p=self.root/'open.json';data=json.loads(p.read_text(encoding='utf-8'));change(data)
        p.write_text(json.dumps(data),encoding='utf-8');self.data['observations'][0]['trace']=self.record('open.json')

    def test_valid_records_are_observed_not_accepted(self):
        result=self.inspect();self.assertEqual(result['status'],'OBSERVED');self.assertIn('Not proof',result['limits'])
    def test_screenshot_alone_is_not_interaction(self):
        self.data['observations'][0].pop('trace');self.bad()
    def test_cli_does_not_require_fake_screenshot(self):
        self.data['surface']='cli'
        for step in self.data['observations']:step.pop('screenshots')
        self.assertEqual(self.inspect()['status'],'OBSERVED')
    def test_ui_missing_screenshot(self):
        self.data['observations'][0]['screenshots']=[];self.bad()
    def test_screenshot_index_is_bound_to_trace(self):
        (self.root/'other.png').write_bytes((self.root/'screen').read_bytes())
        self.data['observations'][0]['screenshots']=[self.record('other.png')];self.bad()
    def test_markdown_is_not_a_png(self):
        (self.root/'screen').write_bytes(b'# not a screenshot');self.bind_traces();self.bad()
        (self.root/'screen').write_bytes(b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR'+b'\x00'*20)
        self.bind_traces();self.bad()
    def test_strict_json_rejects_nonfinite_and_duplicate_fields(self):
        for content in ['{"a":NaN}','{"a":Infinity}','{"a":1,"a":2}']:
            (self.root/'strict.json').write_text(content,encoding='utf-8')
            with self.assertRaises(ValueError):j.read_json(self.root/'strict.json')
    def test_missing_extra_and_reordered_steps(self):
        for steps in [self.data['observations'][:1],self.data['observations']*2,list(reversed(self.data['observations']))]:
            with self.subTest(steps=len(steps)):
                old=self.data['observations'];self.data['observations']=steps;self.bad();self.data['observations']=old
    def test_duplicate_and_discontinuous_expected_steps(self):
        self.data['expected'][1]['id']='open';self.bad()
        self.data['expected'][1]['id']='select';self.data['expected'][1]['from']='unrelated';self.bad()
    def test_stale_goal_and_sources(self):
        self.assertEqual(j.inspect(self.root,self.data,'T2')['status'],'GAPS')
        (self.root/'source').write_bytes(b'changed');self.bad()
    def test_resnapshot_cannot_reuse_old_trace(self):
        (self.root/'source').write_bytes(b'changed');self.data['sources']=[self.record('source')];self.bad()
    def test_trace_identity_failure_and_unknown(self):
        for change in [lambda d:d.update(target='old'),lambda d:d.update(ok=False),lambda d:d.update(ok=1),
                       lambda d:d.update(observed={}),lambda d:d.update(stepId='other')]:
            self.bind_traces();self.mutate_trace(change);self.bad()
    def test_codegraph_is_not_a_trace(self):
        self.mutate_trace(lambda d:(d.clear(),d.update(nodes=['a'],edges=[])));self.bad()
    def test_invalid_trace_and_outputs(self):
        for content in ['not json','[]']:
            (self.root/'open.json').write_text(content);self.data['observations'][0]['trace']=self.record('open.json');self.bad()
    def test_invalid_inputs_are_conservative(self):
        with self.assertRaises(ValueError):j.inspect(self.root,[],'T1')
        for key,value in [('version',True),('surface','unknown'),('expected',[]),('observations',None),('design',[])]:
            with self.subTest(key=key):
                old=self.data[key];self.data[key]=value;self.bad();self.data[key]=old
        self.data['expected']=[None];self.bad()
    def test_state_and_action_mismatch(self):
        self.data['observations'][0]['to']='elsewhere';self.bad()
        self.data['observations'][0]['id']=' open';self.bad()
    def test_unsafe_evidence_reuses_hardened_validator(self):
        for path in ['../outside','C:outside','screen:hidden','/outside']:
            self.data['observations'][0]['screenshots']=[{'path':path,'sha256':'x'}];self.bad()
    def test_cli_is_readonly_and_handles_invalid(self):
        record=self.root/'record.json';record.write_text(json.dumps(self.data),encoding='utf-8')
        before={p.name:p.read_bytes() for p in self.root.iterdir()}
        args=['journey.py',str(record),'--root',str(self.root),'--current-target','T1']
        with patch('sys.argv',args),contextlib.redirect_stdout(io.StringIO()):self.assertEqual(j.main(),0)
        self.assertEqual(before,{p.name:p.read_bytes() for p in self.root.iterdir()})
        record.write_text('broken')
        with patch('sys.argv',args),contextlib.redirect_stdout(io.StringIO()):self.assertEqual(j.main(),2)
    def test_missing_shipped_helper_is_invalid(self):
        record=self.root/'record.json';record.write_text(json.dumps(self.data))
        with patch('sys.argv',['journey.py',str(record),'--root',str(self.root),'--current-target','T1']),patch.object(j,'load_helpers',side_effect=ImportError('helper unavailable')),contextlib.redirect_stdout(io.StringIO()):
            self.assertEqual(j.main(),2)


if __name__=='__main__':unittest.main()
