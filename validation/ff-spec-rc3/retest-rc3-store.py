import json,os,subprocess,pathlib
p=pathlib.Path(os.environ.get('FF_AUDIT_OUTPUT',str(pathlib.Path(__file__).resolve().parent)))/'rc3-results.json';d=json.loads(p.read_text());out=pathlib.Path(d['out']);ff=pathlib.Path(os.environ.get('FF_REPO',d['repo']))/'tools/openspec/ff-spec.mjs';up=pathlib.Path(os.environ.get('FF_OFFICIAL_ROOT',d['officialRoot']))/'bin/openspec.js';env=dict(os.environ,NODE_V8_COVERAGE=os.environ.get('FF_AUDIT_COVERAGE',d['coverage']),OPENSPEC_TELEMETRY='0',DO_NOT_TRACK='1',HOME=str(out/'home'),XDG_CONFIG_HOME=str(out/'config'),XDG_DATA_HOME=str(out/'data'))
r=[]
for name,cli,args in [('official create registered store',up,['store','setup','official-only','--path',str(out/'official-store'),'--no-init-git','--json']),('official sees its store',up,['store','list','--json']),('FF does not inherit official store',ff,['store','list','--json']),('FF explicit unknown official store fails',ff,['list','--store','official-only','--json'])]:
 q=subprocess.run(['node',str(cli)]+args,cwd=out,env=env,text=True,capture_output=True);r.append(dict(name=name,args=['node',str(cli)]+args,code=q.returncode,stdout=q.stdout,stderr=q.stderr))
print(json.dumps(r,indent=2));p.with_name('rc3-store-results.json').write_text(json.dumps(r,indent=2))

assert [x['code'] for x in r]==[0,0,0,1]
assert json.loads(r[2]['stdout'])['stores']==[]
assert 'Run node tools/openspec/ff-spec.mjs store setup' in r[3]['stdout']
