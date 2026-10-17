import copy, hashlib, importlib.util,json,tempfile,subprocess,sys
from pathlib import Path
SOURCE=Path('/workspace/scratch/637cd3902e7a/ff-iterations-07-09-work/skills/ff-review/scripts/health.py')
spec=importlib.util.spec_from_file_location('health',SOURCE);h=importlib.util.module_from_spec(spec);spec.loader.exec_module(h)
OUT=Path(__file__).parent
results=[]
with tempfile.TemporaryDirectory() as tmp:
 r=Path(tmp);(r/'proof').write_text('independent review observations')
 ev=[{'path':'proof','sha256':h.sha(r/'proof')}]
 review={'verdict':'PASS','target':'v1','author':'author','reviewer':'reviewer','independent':True,'evidence':ev}
 base={'goal':'export','phase':'code','target':'v1','next':'review','humanAcceptanceRequired':False,'reviews':{k:copy.deepcopy(review) for k in h.STAGES}}
 base['reviews']['code']['metrics']={'target':'v1','ccTool':'radon 6.0.1 fixture','coverageTool':'coverage 7.6.1 fixture','coverageDefinition':'function combined line+branch','sources':ev,'functions':[{'name':'export','cc':2,'coverage':1}]}
 def run(name,mutate,expected):
  d=copy.deepcopy(base);mutate(d)
  record=r/'record.json';record.write_text(json.dumps(d))
  proc=subprocess.run([sys.executable,str(SOURCE),str(record),'--root',str(r)],capture_output=True,text=True)
  output=json.loads(proc.stdout);results.append({'case':name,'expected':expected,'actual':output,'exit':proc.returncode,'input':d})
 run('valid_control',lambda d:None,'RECORDED')
 run('valid_na_review',lambda d:d['reviews']['plan'].update(verdict='N/A',reason='No implementation plan needed for wording only'),'RECORDED')
 run('valid_metrics_na',lambda d:d['reviews']['code'].__setitem__('metrics',{'notApplicable':True,'reason':'documentation only'}),'RECORDED')
 run('valid_human_record',lambda d:d.update(humanAcceptanceRequired=True,humanAcceptance={'target':'v1','confirmed':True,'evidence':ev}),'RECORDED; recorded evidence only')
 run('duplicate_function_names',lambda d:d['reviews']['code']['metrics']['functions'].append({'name':'export','cc':1,'coverage':1}),'GAPS')
 run('blank_na_reason',lambda d:d['reviews']['plan'].update(verdict='N/A',reason='  '),'GAPS')
 run('nan_metric',lambda d:d['reviews']['code']['metrics']['functions'][0].update(coverage=float('nan')),'GAPS')
 run('na_stale_and_unbound',lambda d:d['reviews'].__setitem__('plan',{'verdict':'N/A','reason':'copy edit','target':'old'}),'GAPS: stale target and missing evidence/independence')
 run('na_malformed_reason',lambda d:d['reviews'].__setitem__('plan',{'verdict':'N/A','reason':{'anything':True}}),'INVALID/GAPS')
 run('missing_author',lambda d:d['reviews']['plan'].pop('author'),'GAPS')
 run('missing_next',lambda d:d.pop('next'),'GAPS/INVALID per documented minimum input')
 run('invalid_goal_type',lambda d:d.__setitem__('goal',{'fake':True}),'GAPS/INVALID')
 run('metrics_without_provenance',lambda d:d['reviews']['code']['metrics'].pop('sources'),'NOT_MEASURED: raw reports, tools and source mapping absent')
 run('metrics_missing_function_name',lambda d:d['reviews']['code']['metrics']['functions'][0].pop('name'),'NOT_MEASURED/INVALID')
 run('metrics_na_truthy_string',lambda d:d['reviews']['code'].__setitem__('metrics',{'notApplicable':'false','reason':'not actually exempt'}),'GAPS/INVALID')
 run('metrics_invalid_row',lambda d:d['reviews']['code']['metrics'].__setitem__('functions',[None]),'INVALID without crash')
 run('invalid_reviews_container',lambda d:d.__setitem__('reviews',[]),'INVALID without crash')
 run('explicit_stale_target',lambda d:d['reviews']['plan'].__setitem__('target','old'),'GAPS')
 run('missing_human_acceptance',lambda d:d.pop('humanAcceptanceRequired'),'GAPS')
 run('crap_above_limit',lambda d:d['reviews']['code']['metrics']['functions'][0].update(cc=51,coverage=1),'GAPS')
 run('crap_boundary_50',lambda d:d['reviews']['code']['metrics']['functions'][0].update(cc=50,coverage=1),'RECORDED')
 (r/'proof').write_text('changed')
 run('stale_evidence',lambda d:None,'GAPS')
(OUT/'probe-revised-results.json').write_text(json.dumps({'source_sha256':h.sha(SOURCE),'results':results},ensure_ascii=False,indent=2))
for x in results: print(x['case'], x['exit'], x['actual']['status'],x['actual'].get('gaps',x['actual'].get('error')))
