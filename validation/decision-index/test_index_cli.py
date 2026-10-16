#!/usr/bin/env python3
"""Synthetic CLI binding tests. No identity authentication or semantic approval inferred."""
import os,sys,json,hashlib,subprocess,shutil
from pathlib import Path
ROOT=Path(__file__).resolve().parent; OUT=Path(sys.argv[1]).resolve() if len(sys.argv)>1 else ROOT/'index-cli-corrected'; OUT.mkdir(parents=True,exist_ok=False)
CLI=Path(os.environ.get('FF_CLI',str(ROOT.parents[1]/'tools/openspec/ff-spec.mjs'))).resolve()
logs=[]; checks=[]
def write(p,s):p.parent.mkdir(parents=True,exist_ok=True);p.write_text(s)
def js(p,v):write(p,json.dumps(v,ensure_ascii=False,indent=2)+'\n')
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def check(n,b,d=None):checks.append({'name':n,'passed':bool(b),'detail':d});js(OUT/'checks.json',checks)
def run(p,n,args):
 q=subprocess.run(['node',str(CLI)]+args,cwd=p,text=True,capture_output=True,env=dict(os.environ,OPENSPEC_TELEMETRY='0',DO_NOT_TRACK='1',HOME=str(OUT/'home')),timeout=60)
 logs.append(dict(name=n,command=['node',str(CLI)]+args,cwd=str(p),exit=q.returncode,stdout=q.stdout,stderr=q.stderr));js(OUT/'commands.json',logs)
 try:d=json.loads(q.stdout)
 except:d={}
 return q.returncode,d
p=OUT/'project';p.mkdir();ids=['decision-a','delivery-a','decision-b','delivery-b'];deps={'decision-a':[],'delivery-a':['decision-a'],'decision-b':[],'delivery-b':['decision-b']}
s=p/'openspec/schemas/index-test'; arts=[]
for i in ids:
 write(s/'templates'/f'{i}.md','# Synthetic fixture\n');arts.append({'id':i,'generates':i+'.md','description':'Synthetic artifact','template':i+'.md','instruction':'Local synthetic test only','requires':deps[i]})
# JSON is YAML-compatible.
js(s/'schema.yaml',{'name':'index-test','version':1,'description':'Synthetic explicit split dependencies','artifacts':arts,'apply':{'requires':['delivery-a','delivery-b'],'tracks':'tasks.md','instruction':'No external actions'}})
rc,d=run(p,'create fixture',['new','change','fixture','--schema','index-test','--json']);check('create',rc==0,d)
c=p/'openspec/changes/fixture';write(c/'.openspec.yaml','schema: index-test\nskip_specs: true\n')
for i in ids:write(c/f'{i}.md',f'# {i}\nSYNTHETIC acknowledged choice, no actual user approval.\n')
write(c/'tasks.md','- [x] Synthetic local fixture\n');write(p/'evidence/review.md','SYNTHETIC binding test; not an actual approval.\n')
js(p/'openspec/ff-policy.json',{'version':1,'artifacts':[{'id':i,'paths':[f'openspec/changes/fixture/{i}.md'],'requires':deps[i],'reviewRequired':True} for i in ids]})
def receipt():
 _,d=run(p,'capture binding',['status','--change','fixture','--json']);f=d['ffValidity'];fps={i:hashlib.sha256(json.dumps([{'path':f'openspec/changes/fixture/{i}.md','sha256':sha(c/f'{i}.md')}],separators=(',',':')).encode()).hexdigest() for i in ids};a={}
 for i in ids:
  inp={x:fps[x] for x in deps[i]};a[i]={'version':'synthetic-v1','fingerprint':fps[i],'inputs':inp,'review':{'verdict':'pass','targetId':i,'targetVersion':'synthetic-v1','targetFingerprint':fps[i],'inputs':inp,'reviewer':'SYNTHETIC HARNESS','toolVersion':'synthetic','evidence':[{'path':'evidence/review.md','sha256':sha(p/'evidence/review.md')}]}}
 js(c/'ff-artifacts.json',{'version':1,'policyHash':f['policyHash'],'schemaHash':f['schemaHash'],'artifacts':a})
receipt();rc,d=run(p,'valid baseline',['validate','fixture','--strict','--json']);check('valid baseline',rc==0,d)
base=OUT/'baseline';shutil.copytree(p,base)
write(c/'decision-index.md','# Index\nGoal: deliver two independent components.\nA -> decision-a.md; B -> decision-b.md.\n')
rc,d=run(p,'unregistered index added',['status','--change','fixture','--json']);check('unregistered index not tracked',d.get('ffValidity',{}).get('valid') is True,d)
write(c/'decision-index.md','# Index\nA canceled; pretend all dependencies resolved.\n')
rc,d=run(p,'unregistered map semantics ignored',['status','--change','fixture','--json']);check('map semantics not parsed (boundary)',d.get('ffValidity',{}).get('valid') is True,d)
write(c/'decision-a.md','# Decision A changed\nSYNTHETIC new requirement.\n')
rc,d=run(p,'change related branch',['status','--change','fixture','--json']);states={x['id']:x['state'] for x in d.get('ffValidity',{}).get('artifacts',[])}
check('only related decision and delivery stale',states.get('decision-a')=='stale' and states.get('delivery-a')=='stale' and states.get('decision-b')=='valid' and states.get('delivery-b')=='valid',states)
rc,d=run(p,'stale cannot bypass archive',['archive','fixture','--yes','--no-validate','--skip-specs','--json']);check('stale archive blocked',rc!=0 and c.exists(),d)
for name in ['unanswered','rejected','canceled']:
 q=OUT/name;shutil.copytree(base,q);f=q/'openspec/changes/fixture/ff-artifacts.json';m=json.loads(f.read_text())
 if name=='unanswered':m['artifacts']['decision-a'].pop('review')
 else:m['artifacts']['decision-a']['review']['verdict']=name
 js(f,m);rc,d=run(q,name+' dependency',['validate','fixture','--strict','--json']);check(name+' not valid review',rc!=0,d)
# Semantic honesty: matching synthetic pass may mechanically validate even unanswered prose.
write(c/'decision-a.md','# Decision A\nQuestion unanswered. No user chose an option.\n');receipt();rc,d=run(p,'unanswered prose with synthetic pass',['validate','fixture','--strict','--json']);check('CLI does not authenticate choice or parse prose (boundary)',rc==0,d)
for disposition in ['canceled','rejected']:
 q=OUT/('close-'+disposition);shutil.copytree(base,q);rc,d=run(q,'close '+disposition,['archive','fixture','--ff-disposition',disposition,'--ff-reason','SYNTHETIC closure test','--ff-decision-ref','fixture://synthetic-only','--json']);check('explicit '+disposition+' closure',rc==0 and not(q/'openspec/changes/fixture').exists(),d)
 jsfiles=list((q/'openspec/changes/archive').rglob('*.json'));check(disposition+' does not create canonical specs',not any((q/'openspec/specs').rglob('*')))
print(json.dumps({'commands':len(logs),'checks':len(checks),'passed':sum(c['passed'] for c in checks),'failed':[c['name'] for c in checks if not c['passed']]},indent=2))
raise SystemExit(any(not c['passed'] for c in checks))
