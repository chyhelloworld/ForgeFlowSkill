"""Independent isolated runtime probes. Does not import author tests or write author files."""
import hashlib, json, pathlib, subprocess, tempfile, shutil, os
ROOT=pathlib.Path(__file__).resolve().parents[2]
MODULE=ROOT/'tools/openspec/.build/dist/core/ff-validity.js'
OUT=ROOT/'validation/ff-spec-rc3/reviewer-probes.json'
rows=[]
def digest(data): return hashlib.sha256(data).hexdigest()
def put(root,name,value):
 p=root/name;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(value)
def js(root):
 code="import { evaluateFF } from " + json.dumps(MODULE.as_uri()) + "; console.log(JSON.stringify(evaluateFF(process.argv[1],process.argv[1]+'/openspec/changes/check') ?? null));"
 r=subprocess.run(['node','--input-type=module','-e',code,str(root)],capture_output=True,text=True)
 return json.loads(r.stdout), r.returncode
with tempfile.TemporaryDirectory(prefix='ff-independent-review-') as tmp:
 base=pathlib.Path(tmp)/'base';base.mkdir()
 for name in ['docs/a.md','docs/b.md','docs/c.md']:put(base,name,'Nonempty '+name)
 policies=[dict(id=i,paths=['docs/'+i+'.md'],requires=[] if i=='a' else [chr(ord(i)-1)],reviewRequired=False) for i in 'abc']
 put(base,'openspec/ff-policy.json',json.dumps(dict(version=1,artifacts=policies)))
 def receipt(root):
  pol=(root/'openspec/ff-policy.json').read_bytes(); pp=json.loads(pol)
  records={}; fps={}
  for x in pp['artifacts']:
   files=[]
   for pat in x['paths']:
    for f in sorted(root.glob(pat)):
     if f.is_file():files.append(dict(path=f.relative_to(root).as_posix(),sha256=digest(f.read_bytes())))
   fps[x['id']]=digest(json.dumps(sorted(files,key=lambda y:y['path']),separators=(',',':')).encode())
  for x in pp['artifacts']:records[x['id']]=dict(version='1',fingerprint=fps[x['id']],inputs={d:fps[d] for d in x['requires']})
  put(root,'openspec/changes/check/ff-artifacts.json',json.dumps(dict(version=1,policyHash=digest(pol),schemaHash=js(root)[0]['schemaHash'],artifacts=records)))
 receipt(base)
 def check(name,root,wanted):
  result,rc=js(root); actual=result and result['valid']; passed=actual==wanted and rc==0
  rows.append(dict(name=name,passed=passed,result=result,exit=rc))
 def clone(name):
  p=pathlib.Path(tmp)/name;shutil.copytree(base,p);return p
 check('valid-three-level-graph',base,True)
 p=clone('transitive');put(p,'docs/a.md','Changed input');check('transitive-stale-with-unchanged-consumers',p,False)
 r=rows[-1]['result'];rows[-1]['passed'] &= all(x['state']=='stale' for x in r['artifacts'])
 p=clone('overlap');pol=json.loads((p/'openspec/ff-policy.json').read_text());pol['artifacts'][1]['paths']=['docs/a.md'];put(p,'openspec/ff-policy.json',json.dumps(pol));receipt(p);check('overlapping-canonical-paths',p,False)
 p=clone('empty-scope');pol=json.loads((p/'openspec/ff-policy.json').read_text());pol['artifacts'][0]['paths'].append('images/*.png');put(p,'openspec/ff-policy.json',json.dumps(pol));receipt(p);check('one-declared-glob-has-no-output',p,False)
 p=clone('escape');(p/'docs/a.md').unlink();(p/'docs/a.md').symlink_to(base/'docs/a.md');check('symlink-outside-project',p,False)
 p=clone('orphan');(p/'openspec/ff-policy.json').unlink();check('orphan-manifest-fails-closed',p,False)
 p=clone('malformed');put(p,'openspec/ff-policy.json','{broken');check('malformed-policy-fails-closed',p,False)
 p=clone('directory');(p/'docs/a.md').unlink();(p/'docs/a.md').mkdir();check('directory-cannot-be-artifact',p,False)
 p=clone('empty');put(p,'docs/a.md','');check('empty-artifact-fails-closed',p,False)
 p=clone('optout');(p/'openspec/ff-policy.json').unlink();(p/'openspec/changes/check/ff-artifacts.json').unlink();r,rc=js(p);rows.append(dict(name='absent-policy-and-manifest-opt-out',passed=r is None and rc==0,result=r))
 # Native CLI independently verifies that a runtime schema override cannot use a default-schema receipt.
 p=clone('override'); schema=(ROOT/'tools/openspec/.build/schemas/spec-driven/schema.yaml').read_text();put(p,'openspec/schemas/reviewer-alt/schema.yaml',schema.replace('name: spec-driven','name: reviewer-alt',1))
 cli=ROOT/'tools/openspec/ff-spec.mjs'
 for label,args,wanted in [('default-schema',['status','--change','check','--json'],True),('schema-override',['status','--change','check','--schema','reviewer-alt','--json'],False),('apply-schema-override',['instructions','apply','--change','check','--schema','reviewer-alt','--json'],False)]:
  cmd=['node',str(cli),*args];run=subprocess.run(cmd,cwd=p,env=dict(os.environ,OPENSPEC_TELEMETRY='0',DO_NOT_TRACK='1',XDG_CONFIG_HOME=str(p/'xdg')),capture_output=True,text=True);data=json.loads(run.stdout)
  rows.append(dict(name=label,passed=run.returncode==0 and data.get('ffValidity',{}).get('valid')==wanted,result=data,command=cmd,exit=run.returncode,stderr=run.stderr))
OUT.write_text(json.dumps(dict(module_sha256=digest(MODULE.read_bytes()),checks=rows),indent=2)+'\n')
print(json.dumps({'passed':sum(x['passed'] for x in rows),'total':len(rows),'failed':[x['name'] for x in rows if not x['passed']]}))

raise SystemExit(0 if all(row['passed'] for row in rows) else 1)
