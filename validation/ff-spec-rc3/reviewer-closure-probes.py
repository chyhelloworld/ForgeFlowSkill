"""Independent native CLI terminal closure checks; fixtures are synthetic and isolated."""
import datetime, hashlib, json, os, pathlib, shutil, subprocess, tempfile
ROOT=pathlib.Path(__file__).resolve().parents[2];BUILD=ROOT/'tools/openspec/.build';CLI=ROOT/'tools/openspec/ff-spec.mjs';checks=[];commands=[]
def write(root,name,text):
 p=root/name;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(text)
def tree(root):return {p.relative_to(root).as_posix():hashlib.sha256(p.read_bytes()).hexdigest() for p in root.rglob('*') if p.is_file()}
def run(root,name,args):
 cmd=['node',str(CLI),'archive','check',*args,'--json'];r=subprocess.run(cmd,cwd=root,env=dict(os.environ,OPENSPEC_TELEMETRY='0',DO_NOT_TRACK='1'),capture_output=True,text=True)
 commands.append(dict(name=name,command=cmd,exit=r.returncode,stdout=r.stdout,stderr=r.stderr));return r,json.loads(r.stdout)
with tempfile.TemporaryDirectory(prefix='ff-terminal-review-') as tmp:
 base=pathlib.Path(tmp)/'base';base.mkdir()
 for name,text in {'openspec/config.yaml':'schema: spec-driven\n','openspec/ff-policy.json':'{BROKEN POLICY','openspec/specs/current/spec.md':'Current accepted specification MUST remain byte-identical.\n','openspec/changes/check/.openspec.yaml':'schema: spec-driven\n','openspec/changes/check/tasks.md':'- [ ] Unfinished implementation\n','openspec/changes/check/specs/current/spec.md':'Proposed text MUST NEVER be promoted.\n','openspec/changes/check/ff-artifacts.json':'{"prior":"failed and stale review"}','openspec/changes/check/review.md':'REJECT\n'}.items():write(base,name,text)
 def fixture(name):p=pathlib.Path(tmp)/name;shutil.copytree(base,p);return p
 def terminal(disposition):return ['--ff-disposition',disposition,'--ff-reason','Synthetic terminal decision','--ff-decision-ref','fixture:reviewer-decision']
 for disposition in ['canceled','rejected']:
  p=fixture(disposition);before=tree(p/'openspec/changes/check');canonical=tree(p/'openspec/specs');r,data=run(p,disposition,terminal(disposition));ar=data.get('archive') or {};target=pathlib.Path(ar.get('path','/NONEXISTENT'))
  ok=r.returncode==0 and ar.get('disposition')==disposition and ar.get('specsUpdated') is False and not (p/'openspec/changes/check').exists() and canonical==tree(p/'openspec/specs')
  aft=tree(target);receipt=json.loads((target/'ff-disposition.json').read_text()) if target.exists() else {};aft.pop('ff-disposition.json',None)
  ok &= aft==before and receipt.get('disposition')==disposition and receipt.get('decisionRef')=='fixture:reviewer-decision'
  checks.append(dict(name=disposition+'-preserves-failed-evidence-and-no-promotion',passed=ok))
 cases=[('ordinary',['--yes']),('no-ref',['--ff-disposition','canceled','--ff-reason','Synthetic']),('ambiguous-flags',terminal('rejected')+['--skip-specs']),('existing-receipt',terminal('canceled')),('shared-archive-lock',terminal('canceled')),('destination-conflict',terminal('canceled'))]
 for name,args in cases:
  p=fixture(name)
  if name=='existing-receipt':write(p,'openspec/changes/check/ff-disposition.json','Existing decision must survive.')
  if name=='shared-archive-lock':write(p,'openspec/changes/archive/.openspec-archive.lock','Existing native archive claim must survive.')
  if name=='destination-conflict':write(p,f'openspec/changes/archive/{datetime.date.today().isoformat()}-check/existing.md','Existing archived content')
  before=tree(p);r,data=run(p,name,args);checks.append(dict(name=name+'-refuses-without-byte-mutation',passed=r.returncode!=0 and tree(p)==before))
 for fault in ['EXDEV','EIO','ENOSPC']:
  p=fixture('fault-'+fault);before=tree(p);module=BUILD/'dist/core/ff-close.js';cmd=['node',str(ROOT/'validation/openspec-integration/reviewer-close-faults.mjs'),str(module),str(p),fault]
  r=subprocess.run(cmd,capture_output=True,text=True);data=json.loads(r.stdout)
  commands.append(dict(name='fault-'+fault,command=cmd,exit=r.returncode,stdout=r.stdout,stderr=r.stderr))
  checks.append(dict(name='fault-'+fault+'-rolls-back-owned-receipt-and-archive-only',passed=r.returncode==0 and data.get('expectedFailure') is True and tree(p)==before and not (p/'openspec/changes/archive').exists()))
report=dict(cli=str(CLI),source_sha256=hashlib.sha256((BUILD/'src/core/ff-close.ts').read_bytes()).hexdigest(),checks=checks,commands=commands)
(ROOT/'validation/ff-spec-rc3/reviewer-closure-probes.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(dict(passed=sum(x['passed'] for x in checks),total=len(checks),failed=[x['name'] for x in checks if not x['passed']])))

raise SystemExit(0 if all(row['passed'] for row in checks) else 1)
