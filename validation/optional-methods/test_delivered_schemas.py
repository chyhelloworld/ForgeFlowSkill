#!/usr/bin/env python3
"""Run delivered schema examples through actual ff-spec, isolated and no production writes."""
import os,sys,json,subprocess,shutil,hashlib
from pathlib import Path
import yaml
src=Path(sys.argv[1]).resolve();out=Path(sys.argv[2]).resolve();out.mkdir(parents=True,exist_ok=False)
default_cli=Path(__file__).resolve().parents[2]/'tools/openspec/ff-spec.mjs'
if not default_cli.exists(): default_cli=Path(__file__).parent/'cli/ff-spec.mjs'
cli=Path(os.environ.get('FF_CLI',str(default_cli))).resolve();commands=[];checks=[]
env=dict(os.environ,OPENSPEC_TELEMETRY='0',DO_NOT_TRACK='1',HOME=str(out/'home'),XDG_CONFIG_HOME=str(out/'config'),XDG_DATA_HOME=str(out/'data'))
def check(n,c,d=None):checks.append(dict(name=n,passed=bool(c),detail=d))
def run(p,name,args):
 q=subprocess.run(['node',str(cli)]+args,cwd=p,env=env,capture_output=True,text=True,timeout=60);r=dict(name=name,args=['node',str(cli)]+args,cwd=str(p),exit=q.returncode,stdout=q.stdout,stderr=q.stderr);commands.append(r);return r
files=sorted(src.glob('*/schema.yaml'));check('seven delivered schemas',len(files)==7,[str(x) for x in files])
for sf in files:
 conf=yaml.safe_load(sf.read_text());name=conf['name'];p=out/name;p.mkdir();dest=p/'openspec/schemas'/name;dest.parent.mkdir(parents=True);shutil.copytree(sf.parent,dest)
 r=run(p,name+' schema validation',['schema','validate',name,'--json']);check(name+' valid schema',r['exit']==0,r)
 r=run(p,name+' new',['new','change','trial','--schema',name,'--json']);check(name+' change created',r['exit']==0,r)
 c=p/'openspec/changes/trial';(c/'.openspec.yaml').write_text(f'schema: {name}\nskip_specs: true\n')
 arts=conf['artifacts'];ids=[x['id'] for x in arts]
 if len(arts)==1:check(name+' independent dependency',arts[0].get('requires',[])==[])
 else:
  check(name+' exactly one alternative',('writing-shape' in ids)^('writing-beats' in ids),ids)
  check(name+' no forced retro','retro' not in ids,ids)
 for a in arts:
  r=run(p,name+' instructions '+a['id'],['instructions',a['id'],'--change','trial','--json']);check(name+' '+a['id']+' instructions',r['exit']==0,r)
  f=c/a['generates'];check(name+' '+a['id']+' not automatically written',not f.exists());f.parent.mkdir(parents=True,exist_ok=True);f.write_text('# Synthetic schema smoke test\nNot a model evaluation or user acceptance.\n')
 r=run(p,name+' completed artifact status',['status','--change','trial','--json']);d=json.loads(r['stdout']);check(name+' all schema artifacts observed',all(a['status']=='done' for a in d['artifacts']),d)
 r=run(p,name+' docs only validation',['validate','trial','--strict','--json']);check(name+' docs-only structural validation',r['exit']==0,r)
for n,v in [('commands.json',commands),('checks.json',checks)]: (out/n).write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n')
(out/'source-hashes.json').write_text(json.dumps({str(f.relative_to(src)):hashlib.sha256(f.read_bytes()).hexdigest() for f in src.rglob('*') if f.is_file()},indent=2)+'\n')
print(json.dumps({'commands':len(commands),'checks':len(checks),'passed':sum(c['passed'] for c in checks),'failed':[c['name'] for c in checks if not c['passed']]},indent=2));sys.exit(any(not c['passed'] for c in checks))
