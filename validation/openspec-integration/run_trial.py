#!/usr/bin/env python3
"""Run fresh isolated CLI fixtures. Usage: python run_trial.py --cli /path/bin/openspec.js --out /new/path"""
import argparse, base64, glob, hashlib, json, os, shutil, sys
from pathlib import Path
from harness import Harness, tree, write, write_json

p=argparse.ArgumentParser(); p.add_argument('--cli',required=True); p.add_argument('--out',required=True); p.add_argument('--expected-version',default='1.14.2-ff.0.5.0-rc3'); a=p.parse_args()
out=Path(a.out).resolve()
if out.exists(): raise SystemExit('Output must not exist; choose a fresh path.')
h=Harness(out,['node',Path(a.cli).resolve()])
project=out/'中文 project with spaces'; project.mkdir()
change='ff-independent'
change_rel=f'openspec/changes/{change}'
change_dir=project/change_rel

def sha(data): return hashlib.sha256(data).hexdigest()
def fingerprint(artifact, root=project):
    files={}
    for pattern in artifact['paths']:
        for name in glob.glob(str(root/pattern),recursive=True):
            path=Path(name)
            if path.is_file(): files[path.relative_to(root).as_posix()]=sha(path.read_bytes())
    entries=[{'path':name,'sha256':files[name]} for name in sorted(files)]
    return sha(json.dumps(entries,ensure_ascii=False,separators=(',',':')).encode())
def receipts(root=project):
    policy=json.loads((root/'openspec/ff-policy.json').read_text())
    hashes={x['id']:fingerprint(x,root) for x in policy['artifacts']}
    records={}
    for x in policy['artifacts']:
        i=x['id']; inputs={d:hashes[d] for d in x['requires']}
        records[i]={'version':'v1','fingerprint':hashes[i],'inputs':inputs,'review':{'verdict':'pass','targetId':i,'targetVersion':'v1','targetFingerprint':hashes[i],'inputs':inputs,'reviewer':'independent-fixture-reviewer','toolVersion':'blackbox-trial-1','evidence':[{'path':'evidence/审阅记录.md','sha256':sha((root/'evidence/审阅记录.md').read_bytes())}]}}
    observed=h.json(h.run('read-schema-binding',root,['status','--change',change,'--json']))
    schema_hash=observed.get('ffValidity',{}).get('schemaHash')
    if not schema_hash: raise RuntimeError('Rebuilt CLI did not expose required schemaHash')
    return {'version':1,'policyHash':sha((root/'openspec/ff-policy.json').read_bytes()),'schemaHash':schema_hash,'artifacts':records}
def save_receipts(root=project): write_json(root,change_rel+'/ff-artifacts.json',receipts(root))
def cli(name,args,root=project): return h.run(name,root,args)
def reject_archive(name,root=project,flags=None):
    before=tree(root); r=cli(name,['archive',change,'--yes','--json']+(flags or []),root); after=tree(root)
    h.check(name+' rejects',r['exit']!=0,r)
    h.check(name+' no mutation',before==after,{'before':before,'after':after})
    return r

def copy_case(name):
    root=out/name; shutil.copytree(project,root); return root

h.check('CLI version',cli('version',['--version'])['stdout'].strip()==a.expected_version)
cli('init',['init','--tools','none','--no-animation'])
cli('new',['new','change',change,'--json'])
write(project,change_rel+'/proposal.md','## Why\nIndependent test of artifact identity.\n\n## What Changes\n- Require two reviewers.\n\n## Capabilities\n### Modified Capabilities\n- blog: review count\n\n## Impact\nDocuments only.\n')
write(project,change_rel+'/tasks.md','## Tasks\n- [x] 1. Test real CLI.\n')
write(project,change_rel+'/design.md','# Design\nKeep one canonical current.\n')
write(project,'openspec/specs/blog/spec.md','# Blog Specification\n\n## Purpose\nSpecify independent document acceptance.\n\n## Requirements\n### Requirement: Review policy\nThe system SHALL require one reviewer.\n\n#### Scenario: Review\n- **WHEN** a document is submitted\n- **THEN** require one reviewer\n')
write(project,change_rel+'/specs/blog/spec.md','## MODIFIED Requirements\n### Requirement: Review policy\nThe system SHALL require two reviewers.\n\n#### Scenario: Review\n- **WHEN** a document is submitted\n- **THEN** require two reviewers\n')
files={'proposal':'current 文档/proposal.md','spec':'openspec/specs/blog/spec.md','design':'current 文档/design.md','plan':'current 文档/plan.md','tasks':'current 文档/tasks.md','review':'current 文档/review.md','handoff':'current 文档/handoff.md','drawio':'current 文档/diagram.drawio','svg':'current 文档/diagram.svg','png':'current 文档/diagram.png','html':'current 文档/prototype.html','json':'current 文档/data/*.json'}
contents={'proposal':'# 目标\n初始目标 A\n','design':'# 设计\n保留唯一当前文档。\n','plan':'# 计划\n依赖设计。\n','tasks':'# 任务\n- [x] 已执行夹具检查\n','review':'# 审阅\n这是合成测试记录，不是用户验收。\n','handoff':'# 交接\n读取实际工件与证据。\n','drawio':'<mxfile><diagram name="初始"><mxGraphModel><root><mxCell id="0"/></root></mxGraphModel></diagram></mxfile>\n','svg':'<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12"><rect width="12" height="12" fill="green"/></svg>\n','png':base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6ocAAAAAASUVORK5CYII='),'html':'<!doctype html><html lang="zh"><meta charset="utf-8"><title>原型</title><body>初版</body></html>\n'}
for i,data in contents.items(): write(project,files[i],data)
write_json(project,'current 文档/data/a.json',{'版本':1}); write_json(project,'current 文档/data/b.json',{'版本':1,'other':True})
write(project,'evidence/审阅记录.md','# Fixture review\nSynthetic binding checks only, not product acceptance.\n')
# Seven Markdown identities and five visual/structured identities, with multiple files for spec and JSON.
deps={'proposal':[],'spec':['proposal'],'design':['spec'],'plan':['design'],'tasks':['plan'],'review':['tasks'],'handoff':['review'],'drawio':['design'],'svg':['drawio'],'png':['svg'],'html':['design'],'json':['spec']}
artifacts=[{'id':i,'paths':[files[i]]+([change_rel+'/specs/**/*.md'] if i=='spec' else []),'requires':deps[i],'reviewRequired':True} for i in files]
write_json(project,'openspec/ff-policy.json',{'version':1,'artifacts':artifacts}); save_receipts()
# Preserve all twelve fixture identities in archive snapshot as attachments, in addition to native specs.
for i,path in files.items():
    for filename in glob.glob(str(project/path)):
        f=Path(filename); write(project,change_rel+'/snapshot/'+f.relative_to(project).as_posix(),f.read_bytes())
base_tree=tree(project); write_json(out,'baseline-tree.json',base_tree)
for command,args in [('initial-status',['status','--change',change,'--json']),('initial-apply',['instructions','apply','--change',change,'--json']),('initial-validate',['validate',change,'--strict','--json'])]:
    r=cli(command,args); h.check(command+' succeeds',r['exit']==0,r)
    if command=='initial-status':
        validity=h.json(r).get('ffValidity',{})
        h.check('FF validity visible and all 12 valid',validity.get('valid') is True and len(validity.get('artifacts',[]))==12,validity)

# Missing, rejected, malformed and stale bindings must fail native archival without writes.
for case,mutator in [
 ('missing-review',lambda m:m['artifacts']['review'].pop('review')),
 ('rejected-review',lambda m:m['artifacts']['review']['review'].update(verdict='reject')),
 ('stale-review-hash',lambda m:m['artifacts']['review']['review'].update(targetFingerprint='0'*64)),
 ('wrong-policy-baseline',lambda m:m.update(policyHash='0'*64)),
 ('wrong-evidence-hash',lambda m:m['artifacts']['review']['review']['evidence'][0].update(sha256='0'*64)),
 ('wrong-dependency-input',lambda m:m['artifacts']['handoff']['inputs'].update(review='0'*64)),
 ('wrong-review-version',lambda m:m['artifacts']['review']['review'].update(targetVersion='v0')),
 ('empty-reviewer',lambda m:m['artifacts']['review']['review'].update(reviewer='')),
 ('unknown-review-verdict',lambda m:m['artifacts']['review']['review'].update(verdict='accepted')),
 ('missing-artifact-record',lambda m:m['artifacts'].pop('design'))]:
    root=copy_case(case); m=receipts(root); mutator(m); write_json(root,change_rel+'/ff-artifacts.json',m); reject_archive(case,root)
    if case=='missing-review':
        reject_archive(case+'-no-validate',root,['--no-validate']); reject_archive(case+'-skip-specs',root,['--skip-specs'])
for case in ['missing-manifest','malformed-manifest','empty-review-file','canonical-overwrite','missing-canonical-file']:
    root=copy_case(case)
    if case=='missing-manifest': (root/change_rel/'ff-artifacts.json').unlink()
    elif case=='malformed-manifest': write(root,change_rel+'/ff-artifacts.json','{broken')
    elif case=='empty-review-file': write(root,files['review'],'')
    elif case=='canonical-overwrite': write(root,files['design'],'# Unauthorized current overwrite\n')
    else: (root/files['design']).unlink()
    reject_archive(case,root)
# Invalid opt-in policy is never interpreted as opt-out.
for case in ['malformed-policy','policy-cycle','policy-unknown-dependency','empty-policy-artifacts']:
    root=copy_case(case)
    policy=json.loads((root/'openspec/ff-policy.json').read_text())
    if case=='malformed-policy': write(root,'openspec/ff-policy.json','{broken')
    else:
        if case=='policy-cycle': policy['artifacts'][0]['requires']=['handoff']
        elif case=='policy-unknown-dependency': policy['artifacts'][0]['requires']=['absent']
        else: policy['artifacts']=[]
        write_json(root,'openspec/ff-policy.json',policy)
    m=json.loads((root/change_rel/'ff-artifacts.json').read_text()); m['policyHash']=sha((root/'openspec/ff-policy.json').read_bytes()); write_json(root,change_rel+'/ff-artifacts.json',m)
    reject_archive(case,root)

# File-set identity must detect additions, deletions and renames without claiming semantic rename tracking.
for case in ['multifile-add','multifile-delete','multifile-rename']:
    root=copy_case(case)
    if case=='multifile-add': write_json(root,'current 文档/data/c.json',{'added':True})
    elif case=='multifile-delete': (root/'current 文档/data/b.json').unlink()
    else: (root/'current 文档/data/b.json').rename(root/'current 文档/data/重命名 b.json')
    reject_archive(case,root)

# Every declared glob scope must match; another matching scope cannot mask omission.
root=copy_case('unmatched-individual-glob')
policy=json.loads((root/'openspec/ff-policy.json').read_text()); policy['artifacts'][0]['paths'].append('missing-scope/**/*.md'); write_json(root,'openspec/ff-policy.json',policy)
save_receipts(root); reject_archive('unmatched-individual-glob',root)

# Bind receipts to the effective resolved OpenSpec schema, not only FF policy bytes.
root=copy_case('schema-changed')
original=json.loads((root/change_rel/'ff-artifacts.json').read_text())['schemaHash']
cli_path = Path(a.cli).resolve()
schema_source = (cli_path.parent / '.build' if cli_path.name == 'ff-spec.mjs' else cli_path.parent.parent) / 'schemas/spec-driven'
schema_target=root/'openspec/schemas/spec-driven'; schema_target.parent.mkdir(parents=True,exist_ok=True); shutil.copytree(schema_source,schema_target)
f=schema_target/'schema.yaml'; content=f.read_text(); content=content.replace('description:', 'description: Changed test schema. # ',1); f.write_text(content)
r=cli('schema-changed-status',['status','--change',change,'--json'],root)
h.check('resolved schema hash changes',h.json(r).get('ffValidity',{}).get('schemaHash') not in [None,original],r)
reject_archive('schema-changed',root)

# Explicit alternate schema cannot route status/apply around adopted receipts.
root=copy_case('schema-override')
schema_target=root/'openspec/schemas/alternate'; schema_target.parent.mkdir(parents=True,exist_ok=True); shutil.copytree(schema_source,schema_target)
f=schema_target/'schema.yaml'; f.write_text(f.read_text().replace('name: spec-driven','name: alternate').replace('description:', 'description: Alternate independent schema. # ',1))
for label,args in [('status',['status','--change',change,'--schema','alternate','--json']),('apply',['instructions','apply','--change',change,'--schema','alternate','--json'])]:
    before=tree(root); r=cli('schema-override-'+label,args,root); parsed=h.json(r)
    h.check('schema override '+label+' blocked',r['exit']!=0 or parsed.get('ffValidity',{}).get('valid') is False or parsed.get('state')=='blocked',r)
    h.check('schema override '+label+' no writes',before==tree(root))

# Passing FF receipts do not bypass native invalid-spec rejection or permit partial writes.
root=copy_case('native-invalid-delta')
write(root,change_rel+'/specs/zeta/spec.md','## MODIFIED Requirements\n### Requirement: Missing baseline\nThe system SHALL reject this.\n\n#### Scenario: Missing\n- **WHEN** a baseline is missing\n- **THEN** reject\n')
save_receipts(root)
reject_archive('native-invalid-delta',root)

# Removing adoption policy while its manifest remains must not silently disable FF.
root=copy_case('orphan-manifest'); (root/'openspec/ff-policy.json').unlink(); reject_archive('orphan-manifest',root)

# Explicit terminal closure retains incomplete/rejected evidence and NEVER promotes specs.
for disposition in ['canceled','rejected']:
    root=copy_case('terminal-'+disposition)
    m=json.loads((root/change_rel/'ff-artifacts.json').read_text())
    if disposition=='canceled': m['artifacts']['review'].pop('review')
    else: m['artifacts']['review']['review']['verdict']='reject'; write(root,files['review'],'# Review\nREJECT: synthetic fixture only.\n')
    write_json(root,change_rel+'/ff-artifacts.json',m)
    write(root,change_rel+'/specs/no-baseline/spec.md','## MODIFIED Requirements\n### Requirement: Cannot merge\nThe system SHALL not merge this canceled delta.\n')
    reject_archive('terminal-'+disposition+'-ordinary-still-blocked',root)
    for omitted in ['reason','decision-ref']:
        flags=['archive',change,'--ff-disposition',disposition,'--yes','--json']
        if omitted!='reason': flags+=['--ff-reason','Synthetic terminal test reason']
        if omitted!='decision-ref': flags+=['--ff-decision-ref','fixture:decision-only-not-user-acceptance']
        before=tree(root); r=cli('terminal-'+disposition+'-missing-'+omitted,flags,root)
        h.check('terminal '+disposition+' missing '+omitted+' rejects',r['exit']!=0,r)
        h.check('terminal '+disposition+' missing '+omitted+' no writes',before==tree(root))
    current_before=tree(root/'openspec/specs'); original_change=tree(root/change_rel)
    flags=['archive',change,'--ff-disposition',disposition,'--ff-reason','Synthetic terminal test reason','--ff-decision-ref','fixture:decision-only-not-user-acceptance','--yes','--json']
    r=cli('terminal-'+disposition+'-close',flags,root); h.check('terminal '+disposition+' closes',r['exit']==0,r)
    archived=h.json(r).get('archive',{}).get('path')
    h.check('terminal '+disposition+' never promotes specs',current_before==tree(root/'openspec/specs'))
    if archived:
        after=tree(archived)
        h.check('terminal '+disposition+' preserves every original byte',all(after.get(k)==v for k,v in original_change.items()),{'before':original_change,'after':after})
        receipt=json.loads((Path(archived)/'ff-disposition.json').read_text())
        h.check('terminal '+disposition+' explicit receipt',receipt.get('disposition')==disposition and receipt.get('decisionRef')=='fixture:decision-only-not-user-acceptance' and receipt.get('reason')=='Synthetic terminal test reason',receipt)
        h.check('terminal '+disposition+' receipt only added file',set(after)-set(original_change)=={'ff-disposition.json'})
    else: h.check('terminal '+disposition+' archive output has path',False,r)
    before=tree(root); r=cli('terminal-'+disposition+'-repeat',flags,root)
    h.check('terminal '+disposition+' repeat rejects',r['exit']!=0,r); h.check('terminal '+disposition+' repeat no writes',before==tree(root))
for case in ['missing-disposition','invalid-disposition','existing-receipt','no-ff-adoption','shared-archive-lock','no-validate-flag','skip-specs-flag']:
    root=copy_case('terminal-'+case)
    flags=['archive',change,'--ff-reason','Synthetic reason','--ff-decision-ref','fixture:decision','--yes','--json']
    if case!='missing-disposition': flags+=['--ff-disposition','accepted' if case=='invalid-disposition' else 'canceled']
    if case=='existing-receipt': write_json(root,change_rel+'/ff-disposition.json',{'preserve':'existing decision'})
    if case=='shared-archive-lock': write(root,'openspec/changes/archive/.openspec-archive.lock','existing-owner\n')
    if case=='no-validate-flag': flags+=['--no-validate']
    if case=='skip-specs-flag': flags+=['--skip-specs']
    if case=='no-ff-adoption': (root/'openspec/ff-policy.json').unlink(); (root/change_rel/'ff-artifacts.json').unlink()
    before=tree(root); r=cli('terminal-'+case,flags,root)
    h.check('terminal '+case+' rejects',r['exit']!=0,r);h.check('terminal '+case+' no writes',before==tree(root))

# Default behavior comparison: FF opt-in entirely removed, native workflow remains available.
default=copy_case('default-no-ff'); (default/'openspec/ff-policy.json').unlink(); (default/change_rel/'ff-artifacts.json').unlink()
write(default,files['review'],'# Review\nREJECT\n')
r=cli('default-status',['status','--change',change,'--json'],default); h.check('default status succeeds',r['exit']==0,r)
r=cli('default-archive',['archive',change,'--yes','--json'],default); h.check('default archive unchanged opt-out',r['exit']==0,r)

# Actual Git commits and two edits, all local to fixture.
for args in [['git','init'],['git','config','user.name','FF Independent Test'],['git','config','user.email','fixture@example.invalid'],['git','add','.'],['git','commit','-m','Initial synthetic artifact baseline']]: h.run('git-initial',project,args,cli=False)
first=h.run('git-first-hash',project,['git','rev-parse','HEAD'],cli=False)['stdout'].strip()
first_tree=tree(project)
for revision in [2,3]:
    write(project,files['proposal'],f'# 目标\n修改至版本 {revision}，明确为什么改变。\n')
    r=cli(f'edit-{revision}-status',['status','--change',change,'--json']);
    write_json(out,f'edit-{revision}-status.json',h.json(r))
    states={x['id']:x['state'] for x in h.json(r).get('ffValidity',{}).get('artifacts',[])}
    h.check(f'edit-{revision} transitive invalidation',all(states.get(i) in ['stale','needs-review'] for i in ['proposal','spec','design','plan','tasks','review','handoff']),states)
    reject_archive(f'edit-{revision}-archive-stale')
    r=cli(f'edit-{revision}-apply',['instructions','apply','--change',change,'--json']); h.check(f'edit-{revision} apply blocked',h.json(r).get('state')=='blocked',r)
    r=cli(f'edit-{revision}-validate',['validate',change,'--strict','--json']); h.check(f'edit-{revision} validate rejects',r['exit']!=0,r)
    # Explicit synthetic rereview of all affected receipts, never a product/user acceptance assertion.
    save_receipts()
    r=cli(f'edit-{revision}-rereview',['validate',change,'--strict','--json']); h.check(f'edit-{revision} rereview validates',r['exit']==0,r)
    for args in [['git','add','.'],['git','commit','-m',f'Synthetic revision {revision} with explicit receipt refresh']]: h.run('git-edit',project,args,cli=False)

snapshot_before=tree(change_dir); canonical_before={k:v for k,v in tree(project).items() if k.startswith('current 文档/')}
r=cli('valid-archive',['archive',change,'--yes','--json']); h.check('valid native archive succeeds',r['exit']==0,r)
archived=h.json(r).get('archive',{}).get('path')
if archived:
    snapshot_after=tree(archived); h.check('archived change exact bytes',snapshot_before==snapshot_after,{'files':len(snapshot_before),'before':snapshot_before,'after':snapshot_after})
    h.check('non-spec canonical unchanged',canonical_before=={k:v for k,v in tree(project).items() if k.startswith('current 文档/')})
    h.check('standard current spec updated','two reviewers' in (project/'openspec/specs/blog/spec.md').read_text())
restore=out/'git restore isolated'
h.run('git-clone',out,['git','clone','--no-local',str(project),str(restore)],cli=False)
r=h.run('git-restore',restore,['git','restore','--source='+first,'--staged','--worktree','.'],cli=False)
h.check('Git restore exact first snapshot',r['exit']==0 and tree(restore)==first_tree,{'expected':first_tree,'actual':tree(restore)})
write_json(out,'summary.json',{'checks':len(h.checks),'passed':sum(c['passed'] for c in h.checks),'failed':sum(not c['passed'] for c in h.checks),'commands':len(h.commands),'platform':sys.platform,'artifact_identities':len(artifacts),'claims':['fingerprint and receipt consistency only','synthetic review is not user acceptance','Git owns full history and restoration']})
print(json.dumps({'output':str(out),'checks':len(h.checks),'failed':[c['name'] for c in h.checks if not c['passed']]},ensure_ascii=False,indent=2))
