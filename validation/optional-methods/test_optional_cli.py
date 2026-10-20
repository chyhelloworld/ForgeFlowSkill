#!/usr/bin/env python3
"""Independent CLI tests. Synthetic receipts exercise binding only, NEVER approval/model quality."""
import os,sys,json,hashlib,subprocess,shutil
from pathlib import Path
ROOT=Path(__file__).resolve().parent
DEFAULT_CLI=ROOT.parents[1]/'tools/openspec/ff-spec.mjs'
if not DEFAULT_CLI.exists(): DEFAULT_CLI=ROOT/'cli/ff-spec.mjs'
CLI=Path(os.environ.get('FF_CLI',str(DEFAULT_CLI))).resolve()
OUT=Path(sys.argv[1]).resolve(); OUT.mkdir(parents=True,exist_ok=False)
logs=[];checks=[]
env=dict(os.environ,OPENSPEC_TELEMETRY='0',DO_NOT_TRACK='1',HOME=str(OUT/'home'),XDG_CONFIG_HOME=str(OUT/'config'),XDG_DATA_HOME=str(OUT/'data'))
def write(p,s): p.parent.mkdir(parents=True,exist_ok=True);p.write_text(s)
def js(p,d):write(p,json.dumps(d,ensure_ascii=False,indent=2)+'\n')
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def tree(p):return {str(f.relative_to(p)):sha(f) for f in p.rglob('*') if f.is_file()}
def run(p,name,args):
 q=subprocess.run(['node',str(CLI)]+args,cwd=p,env=env,text=True,capture_output=True,timeout=60)
 r=dict(name=name,command=['node',str(CLI)]+args,cwd=str(p),exit=q.returncode,stdout=q.stdout,stderr=q.stderr);logs.append(r);save();return r
def save():js(OUT/'commands.json',logs);js(OUT/'checks.json',checks)
def check(n,b,d=None):checks.append(dict(name=n,passed=bool(b),detail=d));save()
def data(r):
 try:return json.loads(r['stdout'])
 except:return {}
def schema(p,name,ids,deps):
 base=p/'openspec/schemas'/name
 s=f'name: {name}\nversion: 1\ndescription: Independent optional document fixture\nartifacts:\n'
 for i in ids:
  s+=f'  - id: {i}\n    generates: {i}.md\n    description: {i} document\n    template: {i}.md\n    instruction: Produce {i} from labeled evidence, never publish.\n    requires: '+json.dumps(deps.get(i,[]))+'\n'
  write(base/'templates'/f'{i}.md',f'# {i}\nSynthetic fixture, no user approval.\n')
 s+='apply:\n  requires: '+json.dumps([ids[-1]])+'\n  tracks: tasks.md\n  instruction: Review the selected documents; do not publish.\n';write(base/'schema.yaml',s)
def new(p,name,sc):
 r=run(p,name+' new',['new','change',name,'--schema',sc,'--json']);check(name+' new success',r['exit']==0,r)
 c=p/'openspec/changes'/name;write(c/'.openspec.yaml',f'schema: {sc}\nskip_specs: true\n');return c
# Every method works alone; no forced predecessor or code artifact.
for method in ['research','retro','writing-fragments','writing-shape','writing-beats']:
 p=OUT/method;p.mkdir();schema(p,'single',[method],{})
 c=new(p,method,'single');r=run(p,method+' instructions',['instructions',method,'--change',method,'--json'])
 d=data(r);check(method+' independent instructions',r['exit']==0 and d.get('artifactId')==method,d)
 check(method+' CLI does not author content',not(c/f'{method}.md').exists())
 write(c/f'{method}.md','# Synthetic '+method+'\nIntentionally written by fixture author, not CLI.\n')
 r=run(p,method+' present status',['status','--change',method,'--json']);d=data(r)
 check(method+' status sees document',any(x.get('id')==method and x.get('status')=='done' for x in d.get('artifacts',[])),d)
# Main scenario: synthetic technical blog. Shape OR beats, not both.
for route in ['writing-shape','writing-beats']:
 p=OUT/route.replace('writing-','blog-');p.mkdir();ids=['research','writing-fragments',route,'draft','retro'];deps={'writing-fragments':['research'],route:['writing-fragments'],'draft':['research',route],'retro':['draft']}
 schema(p,'blog',ids,deps);c=new(p,'blog','blog')
 for i in ids:write(c/f'{i}.md',f'# {i}\nSYNTHETIC AUTHOR MATERIAL. Local draft only.\n')
 write(c/'tasks.md','- [x] 1. Assemble synthetic local blog fixture\n')
 write(c/'research.md','# Research\nSYNTHETIC SOURCE PACK: Python-style sets are unordered. This fixture is not an external citation.\n')
 write(c/'writing-fragments.md','# Fragments\nSYNTHETIC AUTHOR: I confused set uniqueness with ordering in a toy example. No real user experience claimed.\n')
 write(c/'draft.md','# Unique does not mean ordered\nA synthetic example: a set can remove duplicates; this says nothing about stable output order. Verify the technical claim against the actual target language before publication.\n')
 write(c/'retro.md','# Retro\nZero new rules: the existing rule already requires source verification; the supposed missing-rule hypothesis is falsified.\n')
 write(p/'openspec/specs/existing/spec.md','# Existing canonical specification\nMust remain unchanged by a blog attachment archive.\n')
 canon=tree(p/'openspec/specs');write(p/'evidence/review.md','# Synthetic harness receipt\nOnly checks hashes and version gates. Not user acceptance or semantic review.\n')
 policy={'version':1,'artifacts':[{'id':i,'paths':[(c/f'{i}.md').relative_to(p).as_posix()],'requires':deps.get(i,[]),'reviewRequired':True} for i in ids]};js(p/'openspec/ff-policy.json',policy)
 def receipt():
  d=data(run(p,route+' capture binding',['status','--change','blog','--json']))['ffValidity'];fps={i:hashlib.sha256(json.dumps([{'path':(c/f'{i}.md').relative_to(p).as_posix(),'sha256':sha(c/f'{i}.md')}],separators=(',',':')).encode()).hexdigest() for i in ids}
  artifacts={}
  for i in ids:
   inp={x:fps[x] for x in deps.get(i,[])};artifacts[i]={'version':'fixture-v1','fingerprint':fps[i],'inputs':inp,'review':{'verdict':'pass','targetId':i,'targetVersion':'fixture-v1','targetFingerprint':fps[i],'inputs':inp,'reviewer':'SYNTHETIC HARNESS ONLY','toolVersion':'fixture-v1','evidence':[{'path':'evidence/review.md','sha256':sha(p/'evidence/review.md')}]}}
  js(c/'ff-artifacts.json',{'version':1,'policyHash':d['policyHash'],'schemaHash':d['schemaHash'],'artifacts':artifacts})
 receipt();base=OUT/(route+'-baseline');shutil.copytree(p,base)
 r=run(p,route+' valid status',['status','--change','blog','--json']);d=data(r);check(route+' five artifacts valid',d.get('ffValidity',{}).get('valid') is True,d)
 check(route+' alternative absent',not(c/('writing-beats.md' if route=='writing-shape' else 'writing-shape.md')).exists())
 r=run(p,route+' valid strict validate',['validate','blog','--strict','--json']);check(route+' docs-only validate',r['exit']==0,r)
 # Deliberately false content plus matching synthetic receipts demonstrates semantic limit.
 sem=OUT/(route+'-semantic-limit');shutil.copytree(base,sem);df=sem/'openspec/changes/blog/draft.md';write(df,'# Deliberately false fixture\nCLI instructions publishes a finished blog automatically.\n')
 mf=sem/'openspec/changes/blog/ff-artifacts.json';m=json.loads(mf.read_text());fp=hashlib.sha256(json.dumps([{'path':'openspec/changes/blog/draft.md','sha256':sha(df)}],separators=(',',':')).encode()).hexdigest();m['artifacts']['draft']['fingerprint']=fp;m['artifacts']['draft']['review']['targetFingerprint']=fp;m['artifacts']['retro']['inputs']['draft']=fp;m['artifacts']['retro']['review']['inputs']['draft']=fp;js(mf,m)
 r=run(sem,route+' semantic non-enforcement',['validate','blog','--strict','--json']);check(route+' documents semantic limit (false text still hash-valid)',r['exit']==0,r)
 # Changing source mid-flow propagates stale, with no refresh from status.
 write(c/'research.md',(c/'research.md').read_text()+'\nMaterial changed: ordered presentation needs an explicit sorting step.\n')
 before=tree(p);r=run(p,route+' source change status',['status','--change','blog','--json']);d=data(r)
 check(route+' input change invalidates',d.get('ffValidity',{}).get('valid') is False,d)
 check(route+' transitive stale reaches all five',all(x.get('state')=='stale' for x in d.get('ffValidity',{}).get('artifacts',[])) and len(d.get('ffValidity',{}).get('artifacts',[]))==5,d)
 check(route+' status is readonly',tree(p)==before)
 r=run(p,route+' stale archive',['archive','blog','--yes','--no-validate','--skip-specs','--json']);check(route+' stale cannot bypass',r['exit']!=0 and c.exists(),r)
 # Exact review version binding.
 v=OUT/(route+'-version');shutil.copytree(base,v);f=v/'openspec/changes/blog/ff-artifacts.json';m=json.loads(f.read_text());m['artifacts']['draft']['review']['targetVersion']='fixture-v0';js(f,m)
 r=run(v,route+' old review version',['validate','blog','--strict','--json']);check(route+' old review rejected',r['exit']!=0,r)
 # Missing and negative reviews cannot be treated as completion.
 for reviewcase in ['missing','reject']:
  q=OUT/(route+'-review-'+reviewcase);shutil.copytree(base,q);f=q/'openspec/changes/blog/ff-artifacts.json';m=json.loads(f.read_text())
  if reviewcase=='missing':m['artifacts']['draft'].pop('review')
  else:m['artifacts']['draft']['review']['verdict']='reject'
  js(f,m);before=tree(q);r=run(q,route+' review '+reviewcase,['archive','blog','--yes','--json']);check(route+' '+reviewcase+' review blocks archive',r['exit']!=0 and tree(q)==before,r)
 # Schema changes invalidate prior receipts, even without file edits.
 scase=OUT/(route+'-schema');shutil.copytree(base,scase);sf=scase/'openspec/schemas/blog/schema.yaml';write(sf,sf.read_text().replace('Independent optional document fixture','Changed workflow contract'))
 r=run(scase,route+' schema change',['validate','blog','--strict','--json']);check(route+' schema change invalidates',r['exit']!=0,r)
 # skip_specs cannot silently promote an attachment written in spec delta location.
 conflict=OUT/(route+'-authority');shutil.copytree(base,conflict);write(conflict/'openspec/changes/blog/specs/injected/spec.md','# Article is not a spec\n')
 r=run(conflict,route+' conflicting spec authority',['archive','blog','--yes','--json']);check(route+' skip_specs delta rejected',r['exit']!=0 and (conflict/'openspec/changes/blog').exists(),r)
 # Normal completion (explicitly local synthetic fixture transaction).
 r=run(base,route+' normal fixture archive',['archive','blog','--yes','--json']);check(route+' normal archive',r['exit']==0 and not(base/'openspec/changes/blog').exists(),r)
 check(route+' attachment never canonical',tree(base/'openspec/specs')==canon)
 # Cancel/reject preserve stale source, receipt bytes and canonical specs.
 for disposition in ['canceled','rejected']:
  t=OUT/(route+'-'+disposition);shutil.copytree(p,t);tc=t/'openspec/changes/blog';old=tree(tc)
  r=run(t,route+' '+disposition,['archive','blog','--ff-disposition',disposition,'--ff-reason','Synthetic test decision only','--ff-decision-ref','fixture://independent-cli-test','--json'])
  dests=list((t/'openspec/changes/archive').glob('*-blog'));archive=dests[0] if dests else None
  check(route+' '+disposition+' closes',r['exit']==0 and not tc.exists(),r)
  check(route+' '+disposition+' preserves evidence',archive is not None and all(tree(archive).get(k)==v for k,v in old.items()))
  check(route+' '+disposition+' no spec promotion',tree(t/'openspec/specs')==canon)
print(json.dumps({'checks':len(checks),'passed':sum(x['passed'] for x in checks),'failed':[x['name'] for x in checks if not x['passed']],'commands':len(logs)},indent=2));sys.exit(any(not x['passed'] for x in checks))
