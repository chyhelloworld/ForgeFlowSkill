import copy
import hashlib
import importlib.util
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
    def test_escape_and_symlink(self):
        self.assertIn('unsafe',h.evidence_problem(self.root,{'path':'../proof'}))
        (self.root/'link').symlink_to(self.root/'proof'); self.assertIn('symlink',h.evidence_problem(self.root,{'path':'link'}))
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
