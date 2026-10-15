import os,pathlib,tempfile,subprocess,json,shutil,hashlib
repo=pathlib.Path(os.environ.get('FF_REPO',str(pathlib.Path(__file__).resolve().parents[2]))).resolve(); official_root=pathlib.Path(os.environ['FF_OFFICIAL_ROOT']).resolve(); output_dir=pathlib.Path(os.environ.get('FF_AUDIT_OUTPUT',str(pathlib.Path(__file__).resolve().parent))); output_dir.mkdir(parents=True,exist_ok=True); src=repo/'tools/openspec'; ff=src/'ff-spec.mjs'; official=official_root/'bin/openspec.js'
out=pathlib.Path(tempfile.mkdtemp(prefix='ff-rc3-independent-')); results=[]
env=dict(os.environ,NODE_V8_COVERAGE=os.environ.get('FF_AUDIT_COVERAGE',str(out/'coverage')),OPENSPEC_TELEMETRY='0',DO_NOT_TRACK='1',HOME=str(out/'home'),XDG_CONFIG_HOME=str(out/'config'),XDG_DATA_HOME=str(out/'data'))
(out/'path').mkdir(); shim=out/'path/openspec';shim.write_text('#!/bin/sh\nexec node '+str(official)+' "$@"\n');shim.chmod(0o755);env['PATH']=str(out/'path')+':'+env['PATH']
def run(name,args,cwd=out,expect=0):
 p=subprocess.run(args,cwd=cwd,env=env,capture_output=True,text=True);r=dict(name=name,args=args,code=p.returncode,stdout=p.stdout,stderr=p.stderr,passCode=p.returncode==expect);results.append(r);return r
def f(name,args,cwd=out,expect=0):return run(name,['node',str(ff)]+args,cwd,expect)
def digest(p):return {str(x.relative_to(p)):hashlib.sha256(x.read_bytes()).hexdigest() for x in p.rglob('*') if x.is_file()}
run('official PATH',['openspec','--version']);f('FF explicit under official PATH',['--version'])
p=out/'local';(p/'node_modules/.bin').mkdir(parents=True);(p/'node_modules/.bin/openspec').symlink_to(official)
run('npm exec picks official',['npm','exec','--offline','--','openspec','--version'],p);f('FF explicit under local official bin',['--version'],p)
p=out/'existing';p.mkdir();run('official init creates skills',['node',str(official),'init','--tools','agents','--no-animation'],p)
before=digest(p);f('FF init none preserves official assets',['init','--tools','none'],p);results[-1]['allExistingUnchanged']=all(digest(p).get(k)==v for k,v in before.items())
for args in [['init'],['init','--tools','agents'],['init','--tools','none','--force'],['init','--tools','none','--profile','core'],['update','--force'],['experimental','--tool','agents'],['completion','bash'],['version','--check']]:
 before=digest(p);r=f('rejected '+ ' '.join(args),args,p,1);r['projectUnchanged']=before==digest(p)
for name in ['ff','official']:
 p=out/name;c=p/'openspec/changes/demo';c.mkdir(parents=True);(c/'tasks.md').write_text('- [x] 1.1 complete\n');(p/'openspec/ff-policy.json').write_text('{"version":1,"artifacts":[{"id":"design","paths":["missing-design.md"],"requires":[],"reviewRequired":true}]}')
 if name=='ff':
  f('invalid FF status',['status','--change','demo','--json'],p)
  f('invalid FF apply',['instructions','apply','--change','demo','--json'],p)
  f('invalid FF validate',['validate','demo','--type','change','--strict','--json'],p,1)
  f('invalid FF archive',['archive','demo','--yes','--no-validate','--skip-specs','--json'],p,1);results[-1]['activePreserved']=c.exists()
 else:run('known boundary official ignores FF gate',['node',str(official),'archive','demo','--yes','--no-validate','--skip-specs','--json'],p);results[-1]['archived']=not c.exists()
# Validate configuration namespace through code with the same isolated environment.
js=f"import * as f from '{src}/.build/dist/core/global-config.js';import * as o from '{official_root}/dist/core/global-config.js';console.log(JSON.stringify({{ff:[f.getGlobalConfigDir(),f.getGlobalDataDir()],official:[o.getGlobalConfigDir(),o.getGlobalDataDir()]}}))"
run('config and data paths isolated',['node','--input-type=module','-e',js])
# Missing / official / runtime-corrupted build refusal before importing dependencies.
clone=out/'launcher';clone.mkdir()
for file in ['ff-spec.mjs','ff-build.mjs','upstream.json']:shutil.copy2(src/file,clone/file)
run('missing build refusal',['node',str(clone/'ff-spec.mjs'),'--version'],expect=1)
(clone/'.build').mkdir();shutil.copy2(official_root/'package.json',clone/'.build/package.json');shutil.copy2(src/'.build/FF-BUILD.json',clone/'.build/FF-BUILD.json')
run('official package identity refusal',['node',str(clone/'ff-spec.mjs'),'--version'],expect=1)
shutil.copy2(src/'.build/package.json',clone/'.build/package.json')
for directory in ['bin','dist','schemas']:shutil.copytree(src/'.build'/directory,clone/'.build'/directory)
entry=clone/'.build/bin/ff-spec.js';entry.write_text(entry.read_text()+'\nconsole.log("UNTRUSTED EXECUTED");\n')
run('modified runtime refusal',['node',str(clone/'ff-spec.mjs'),'--version'],expect=1)
report={'out':str(out),'repo':str(repo),'officialRoot':str(official_root),'patchSha256':json.loads((src/'upstream.json').read_text())['patchSha256'],'coverage':env['NODE_V8_COVERAGE'],'results':results}; dest=output_dir/'rc3-results.json';dest.write_text(json.dumps(report,ensure_ascii=False,indent=2));print(json.dumps([{'name':r['name'],'code':r['code'],'passCode':r['passCode'],**{k:v for k,v in r.items() if k in ['projectUnchanged','allExistingUnchanged','activePreserved','archived']}} for r in results],indent=2));print('Full evidence:',dest,'fixtures:',out)

assert all(r['passCode'] for r in results), 'Unexpected command exit status'
