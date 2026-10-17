import copy
import hashlib
import importlib.util
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
spec = importlib.util.spec_from_file_location('health', Path(__file__).resolve().parents[2] / 'skills/ff-review/scripts/health.py')
h = importlib.util.module_from_spec(spec); spec.loader.exec_module(h)

class HealthTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(); self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name); (self.root/'proof').write_text('observed')
        evidence = [{'path':'proof','sha256':h.sha(self.root/'proof')}]
        review = {'verdict':'PASS','target':'v1','reviewer':'independent','author':'producer','independent':True,'evidence':evidence}
        self.data = {'goal':'export','phase':'implementation','next':'review remaining scope','target':'v1','humanAcceptanceRequired':False,'reviews':{k:copy.deepcopy(review) for k in h.STAGES}}
        self.data['reviews']['code']['metrics']={'target':'v1','ccTool':'fixture CC','coverageTool':'fixture coverage','coverageDefinition':'fixture function branches','sources':evidence,'functions':[{'name':'export','cc':2,'coverage':1}]}
    def gaps(self): return h.health(self.root,self.data)['gaps']
    def test_valid_record_has_no_false_alarm(self): self.assertEqual(self.gaps(),[])
    def test_stale_evidence(self):
        (self.root/'proof').write_text('new'); self.assertTrue(any('stale evidence' in s for s in self.gaps()))
    def test_missing_human_acceptance(self):
        del self.data['humanAcceptanceRequired']; self.assertIn('human acceptance missing or stale', self.gaps())
    def test_self_review(self):
        self.data['reviews']['plan']['reviewer']='producer'; self.assertTrue(any('independence' in s for s in self.gaps()))
    def test_no_average_masks_failure(self):
        self.data['reviews']['goal-mainflow']['verdict']='FAIL'; self.assertTrue(self.gaps())
    def test_crap_bounds_and_missing(self):
        for cc,cov in [(8,0),(2,float('nan')),(2,1.1),(True,1)]:
            self.assertTrue(h.metric_gaps({'target':'v1','functions':[{'cc':cc,'coverage':cov}]},'v1'))
        self.assertTrue(h.metric_gaps(None,'v1'))
        self.assertEqual(h.metric_gaps({'target':'v1','functions':[{'cc':50,'coverage':1}]},'v1'),[])
    def test_escape(self):
        self.assertIn('unsafe',h.evidence_problem(self.root,{'path':'../proof'}))
    def test_symlink_when_os_allows_creation(self):
        try:
            (self.root/'link').symlink_to(self.root/'proof')
        except OSError as error:
            if getattr(error,'winerror',None)==1314 or error.errno==1:
                self.skipTest('Real symlink creation unavailable: '+str(error))
            raise
        self.assertIn('symlink',h.evidence_problem(self.root,{'path':'link'}))
    @unittest.skipUnless(os.name=='nt','Windows path interpretation requires native Windows')
    def test_windows_anchors_and_ads_are_not_evidence(self):
        for path in ['\\proof','/proof','C:proof','proof:hidden','C:\\proof']:
            with self.subTest(path=path):
                self.assertIn('unsafe',h.evidence_problem(self.root,{'path':path}))
    @unittest.skipUnless(os.name=='nt','Windows junction requires native Windows')
    def test_native_junction_is_rejected(self):
        target=self.root/'target';target.mkdir();(target/'proof').write_bytes(b'proof')
        link=self.root/'linked'
        result=subprocess.run(['cmd.exe','/d','/c','mklink','/J',str(link),str(target)],capture_output=True)
        self.assertEqual(result.returncode,0,result.stderr)
        self.addCleanup(link.rmdir)
        self.assertIn('reparse',h.evidence_problem(self.root,{'path':'linked/proof','sha256':h.sha(target/'proof')}))
    def test_missing_packaged_helper_fails_closed(self):
        import json
        standalone=self.root/'standalone/scripts/health.py';standalone.parent.mkdir(parents=True)
        standalone.write_bytes(Path(h.__file__).read_bytes())
        record=self.root/'record.json';record.write_text(json.dumps(self.data),encoding='utf-8')
        result=subprocess.run([sys.executable,str(standalone),str(record),'--root',str(self.root)],capture_output=True)
        self.assertEqual(result.returncode,2,result.stderr)
        self.assertEqual(json.loads(result.stdout)['status'],'INVALID')
    def test_utf8_evidence_with_legacy_default_file_encoding(self):
        import json
        proof=self.root/'证据.txt';proof.write_bytes(b'real fixture')
        for review in self.data['reviews'].values():
            review['evidence']=[{'path':proof.name,'sha256':h.sha(proof)}]
        self.data['reviews']['code']['metrics']['sources']=[{'path':proof.name,'sha256':h.sha(proof)}]
        record=self.root/'record.json';record.write_bytes(json.dumps(self.data,ensure_ascii=False).encode('utf-8'))
        env={**os.environ,'PYTHONUTF8':'0','PYTHONIOENCODING':'utf-8'}
        result=subprocess.run([sys.executable,h.__file__,str(record),'--root',str(self.root)],capture_output=True,env=env)
        self.assertEqual(result.returncode,0,result.stderr)
    def test_na_requires_reason(self):
        self.data['reviews']['code']['verdict']='N/A'; self.assertTrue(self.gaps())
        self.data['reviews']['code']['reason']='copy edit only'; self.assertFalse(self.gaps())
    def test_main_instrumented_success_and_invalid(self):
        import contextlib, io, json
        from unittest.mock import patch
        record=self.root/'record.json'; record.write_text(json.dumps(self.data))
        with patch('sys.argv',['health.py',str(record),'--root',str(self.root)]), contextlib.redirect_stdout(io.StringIO()):
            self.assertEqual(h.main(),0)
        record.write_text('{broken')
        with patch('sys.argv',['health.py',str(record),'--root',str(self.root)]), contextlib.redirect_stdout(io.StringIO()):
            self.assertEqual(h.main(),2)
    def test_cli_readonly(self):
        import subprocess,json,sys
        record=self.root/'record.json';record.write_text(json.dumps(self.data));before={p.name:h.sha(p) for p in self.root.iterdir()}
        result=subprocess.run([sys.executable,h.__file__,str(record),'--root',str(self.root)],capture_output=True)
        self.assertEqual(result.returncode,0);self.assertEqual(before,{p.name:h.sha(p) for p in self.root.iterdir()})

if __name__=='__main__': unittest.main()
