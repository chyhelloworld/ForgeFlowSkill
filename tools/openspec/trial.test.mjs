import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const home = path.dirname(fileURLToPath(import.meta.url));
const { evaluateFF, requireFF } = await import('./.build/dist/core/ff-validity.js');
const suite = fs.mkdtempSync(path.join(process.env.FF_TEST_ROOT || os.tmpdir(), 'ff-trial-'));
const write = (p, n, data) => { const f = path.join(p,n); fs.mkdirSync(path.dirname(f),{recursive:true}); fs.writeFileSync(f,typeof data === 'string' ? data : JSON.stringify(data,null,2)+'\n'); };
const json = f => JSON.parse(fs.readFileSync(f,'utf8'));
const rule = (id, changes, paths, requires=[]) => ({id,changes,paths,requires,reviewRequired:true});
function fixture(version=2) {
  const p=fs.mkdtempSync(path.join(suite,'中文 project '));
  write(p,'openspec/config.yaml','schema: spec-driven\n');
  for (const c of ['a','b']) {
    write(p,`openspec/changes/${c}/.openspec.yaml`,'schema: spec-driven\nskip_specs: true\n');
    write(p,`openspec/changes/${c}/design.md`,'# Plan\n\n## Task plan\n- T1: Keep the required behavior; acceptance: regression passes.\n');
    write(p,`openspec/changes/${c}/tasks.md`,'- [ ] T1\n');
    write(p,`openspec/changes/${c}/proposal.md`,'## Why\nA focused tooling repair with no specification behavior change.\n\n## What Changes\nRepair local tooling.\n\n## Impact\nLocal tooling only.\n');
  }
  write(p,'shared.txt','shared v1\n');
  const artifacts=version===2 ? [rule('plan',['*'],['openspec/changes/{change}/design.md'])] : [{id:'plan',paths:['openspec/changes/a/design.md'],requires:[],reviewRequired:true}];
  write(p,'openspec/ff-policy.json',{version,artifacts}); return p;
}
const validity=(p,c='a')=>evaluateFF(p,path.join(p,'openspec/changes',c));
function cli(p,args,ok=0) {
  const r=spawnSync(process.execPath,[path.join(home,'ff-spec.mjs'),...args],{cwd:p,encoding:'utf8',env:{...process.env,OPENSPEC_TELEMETRY:'0'}});
  assert.equal(r.status,ok,r.stdout+r.stderr); return r;
}
function reviewed(p,c='a',opts={}) {
  const snap=`reviews/${c}-${Date.now()}-${Math.random()}.json`, report=snap+'.report.json';
  cli(p,['receipt','snapshot',c,snap]); cli(p,['receipt','template',snap,report]);
  const r=json(path.join(p,report));
  for (const a of Object.values(r.artifacts)) Object.assign(a,{verdict:'pass',reviewer:'independent fixture reviewer',toolVersion:'fixture-1',unverified:['Semantic quality is outside this deterministic fixture.']});
  write(p,report,r); cli(p,['receipt','record',c,snap,report,...(opts.migrate?['--migrate']:[])]); return {snap,report};
}
test('v1 removed IDs retain current fingerprints and fail with migration diagnostic',()=>{
  const p=fixture(1); write(p,'openspec/changes/a/ff-artifacts.json',{version:1,artifacts:{removed:{version:'old'}}});
  const r=validity(p); assert.equal(r.valid,false); assert.ok(r.artifacts[0]?.fingerprint); assert.match(r.reasons.join(),/Unknown artifact record.*removed/);
});
test('v2 independent same-ID A/B additions, edits and archive do not invalidate A; shared changes do',()=>{
  const p=fixture(); reviewed(p); const a=validity(p); assert.equal(a.valid,true);
  reviewed(p,'b'); assert.equal(validity(p).valid,true);
  write(p,'openspec/changes/b/design.md','B changed\n'); assert.equal(validity(p,'b').valid,false); assert.equal(validity(p).valid,true);
  const policy=json(path.join(p,'openspec/ff-policy.json')); policy.artifacts.push(rule('only-b',['b'],['only-b.txt'])); write(p,'only-b.txt','B\n'); write(p,'openspec/ff-policy.json',policy);
  assert.equal(validity(p).valid,true);
  fs.mkdirSync(path.join(p,'openspec/changes/archive')); fs.renameSync(path.join(p,'openspec/changes/b'),path.join(p,'openspec/changes/archive/b')); assert.equal(validity(p).valid,true);
  policy.artifacts[0].requires=['shared']; policy.artifacts.push(rule('shared',['*'],['shared.txt'])); write(p,'openspec/ff-policy.json',policy);
  reviewed(p); assert.equal(validity(p).valid,true); write(p,'shared.txt','changed\n'); assert.equal(validity(p).valid,false);
});
test('v2 progress ticks preserve plan review; task scope changes fail; archive requires completion',()=>{
  const p=fixture(); const policy=json(path.join(p,'openspec/ff-policy.json')); policy.artifacts[0].progress={plan:'openspec/changes/{change}/design.md',tasks:'openspec/changes/{change}/tasks.md'}; write(p,'openspec/ff-policy.json',policy);
  reviewed(p); const before=validity(p); assert.equal(before.valid,true); assert.throws(()=>requireFF(p,path.join(p,'openspec/changes/a'),true),/incomplete/);
  write(p,'openspec/changes/a/tasks.md','- [x] T1\n'); assert.equal(validity(p).valid,true); assert.equal(validity(p).artifacts[0].fingerprint,before.artifacts[0].fingerprint); assert.doesNotThrow(()=>requireFF(p,path.join(p,'openspec/changes/a'),true));
  write(p,'openspec/changes/a/tasks.md','- [x] T1: changed scope\n'); assert.equal(validity(p).valid,false);
  write(p,'openspec/changes/a/tasks.md',''); assert.equal(validity(p).valid,false);
  write(p,'openspec/changes/a/tasks.md','- [x] T1\n- [x] T2\n'); assert.equal(validity(p).valid,false);
  write(p,'openspec/changes/a/tasks.md','- [x] T1\n'); write(p,'openspec/changes/a/design.md','## Task plan\n- T1: Different acceptance\n'); assert.equal(validity(p).valid,false);
});
test('valid v1 receipts never automatically become valid v2; explicit reviewed migration keeps original bytes',()=>{
  const p=fixture(1);write(p,'legacy-review.md','legacy reviewed bytes\n');const before=validity(p);const a=before.artifacts[0];const hash=createHash('sha256').update(fs.readFileSync(path.join(p,'legacy-review.md'))).digest('hex');
  write(p,'openspec/changes/a/ff-artifacts.json',{version:1,policyHash:before.policyHash,schemaHash:before.schemaHash,artifacts:{plan:{version:'legacy-1',fingerprint:a.fingerprint,inputs:{},review:{verdict:'pass',targetId:'plan',targetVersion:'legacy-1',targetFingerprint:a.fingerprint,inputs:{},reviewer:'legacy fixture',toolVersion:'1',evidence:[{path:'legacy-review.md',sha256:hash}]}}}});
  assert.equal(validity(p).valid,true);const old=fs.readFileSync(path.join(p,'openspec/changes/a/ff-artifacts.json'));
  write(p,'openspec/ff-policy.json',{version:2,artifacts:[rule('plan',['*'],['openspec/changes/{change}/design.md'])]});assert.equal(validity(p).valid,false);
  cli(p,['receipt','snapshot','a','snapshot.json']);cli(p,['receipt','template','snapshot.json','report.json']);assert.deepEqual(fs.readFileSync(path.join(p,'openspec/changes/a/ff-artifacts.json')),old);
  const report=json(path.join(p,'report.json'));Object.assign(report.artifacts.plan,{verdict:'pass',reviewer:'new fixture reviewer',toolVersion:'2',unverified:[]});write(p,'report.json',report);
  cli(p,['receipt','record','a','snapshot.json','report.json'],1);assert.deepEqual(fs.readFileSync(path.join(p,'openspec/changes/a/ff-artifacts.json')),old);cli(p,['receipt','record','a','snapshot.json','report.json','--migrate']);assert.equal(validity(p).valid,true);
  assert.ok(fs.readdirSync(path.join(p,'openspec/changes/a')).some(n=>n.startsWith('ff-artifacts.history-')&&fs.readFileSync(path.join(p,'openspec/changes/a',n)).equals(old)));
});
test('native archive requires completed progress and preserves the independent change',()=>{
  const p=fixture(); const policy=json(path.join(p,'openspec/ff-policy.json')); policy.artifacts[0].progress={plan:'openspec/changes/{change}/design.md',tasks:'openspec/changes/{change}/tasks.md'}; write(p,'openspec/ff-policy.json',policy);
  reviewed(p); reviewed(p,'b'); cli(p,['archive','a','--yes','--json'],1);
  write(p,'openspec/changes/a/tasks.md','- [x] T1\n'); cli(p,['archive','a','--yes','--json']); assert.equal(validity(p,'b').valid,true);
});
test('snapshot rejects dirty content, rule changes, report replacement and cross-change receipts',()=>{
  const p=fixture(); const {snap,report}=reviewed(p); const receipt=json(path.join(p,'openspec/changes/a/ff-artifacts.json'));
  write(p,'openspec/changes/b/ff-artifacts.json',receipt); assert.equal(validity(p,'b').valid,false);
  write(p,'openspec/changes/a/design.md','modified during review\n'); cli(p,['receipt','record','a',snap,report],1); assert.equal(validity(p).valid,false);
  const q=fixture(); const evidence=reviewed(q); fs.appendFileSync(path.join(q,evidence.report),' '); assert.equal(validity(q).valid,false);
  const policy=json(path.join(q,'openspec/ff-policy.json')); policy.artifacts[0].reviewRequired=false; write(q,'openspec/ff-policy.json',policy); cli(q,['receipt','check','a',evidence.snap],1);
});
test('gate diagnostics separate unconfigured, zero checks, invalid evidence and valid evidence',()=>{
  const p=fixture(); fs.unlinkSync(path.join(p,'openspec/ff-policy.json')); assert.equal(JSON.parse(cli(p,['receipt','diagnose']).stdout).configuration,'UNCONFIGURED');
  write(p,'openspec/ff-policy.json',{version:2,artifacts:[rule('plan',['*'],['openspec/changes/{change}/design.md'])]}); assert.equal(JSON.parse(cli(p,['receipt','diagnose']).stdout).evidence,'INVALID');
  reviewed(p); reviewed(p,'b'); assert.equal(JSON.parse(cli(p,['receipt','diagnose']).stdout).evidence,'VALID');
  fs.renameSync(path.join(p,'openspec/changes'),path.join(p,'old-changes')); assert.equal(JSON.parse(cli(p,['receipt','diagnose']).stdout).evidence,'NO_CHECKS');
});
test('autocrlf checkout and worktree preserve protected text; unprotected bytes and real edits invalidate',()=>{
  const p=fixture(); const policy={version:2,artifacts:[rule('protected',['*'],['src/protected.txt']),rule('raw',['*'],['src/raw.txt'])]}; write(p,'openspec/ff-policy.json',policy);
  write(p,'src/protected.txt','protected\n'); write(p,'src/raw.txt','raw\n'); write(p,'.gitattributes','/src/protected.txt text eol=lf\n/openspec/** text eol=lf\n/reviews/** text eol=lf\n');
  const git=(args,cwd=p)=>{const r=spawnSync('git',args,{cwd,encoding:'utf8'}); assert.equal(r.status,0,r.stderr);return r;};
  git(['init','-q']);git(['config','--local','core.autocrlf','true']);reviewed(p);
  const diagnostic=JSON.parse(cli(p,['receipt','diagnose']).stdout); assert.ok(diagnostic.lineEndings.unprotected.some(f=>f.path==='src/raw.txt')); assert.ok(!diagnostic.lineEndings.unprotected.some(f=>f.path==='src/protected.txt'));
  git(['add','.']);git(['-c','user.name=Fixture','-c','user.email=fixture@example.invalid','commit','-qm','fixture']);
  const worktree=path.join(suite,'autocrlf worktree '+Date.now());git(['worktree','add','--detach',worktree,'HEAD']);
  const result=validity(worktree);assert.equal(result.artifacts.find(a=>a.id==='protected').state,'valid');assert.equal(result.artifacts.find(a=>a.id==='raw').state,'stale');
  write(worktree,'src/protected.txt','real change\n');assert.equal(validity(worktree).artifacts.find(a=>a.id==='protected').state,'stale');
});
test('doctor LF suggestions protect literal bracket paths without matching unrelated siblings',()=>{
  const p=fixture();write(p,'src/[id].txt','literal bracket\n');write(p,'src/i.txt','unrelated sibling\n');write(p,'openspec/ff-policy.json',{version:2,artifacts:[rule('code',['*'],['src/*.txt'])]});
  const git=args=>{const r=spawnSync('git',args,{cwd:p,encoding:'utf8'});assert.equal(r.status,0,r.stderr);return r;};git(['init','-q']);
  const diagnostic=JSON.parse(cli(p,['receipt','diagnose']).stdout);const suggestion=diagnostic.lineEndings.unprotected.find(f=>f.path==='src/[id].txt').suggestion;write(p,'.gitattributes',suggestion+'\n');
  assert.equal(git(['check-attr','-z','eol','--','src/[id].txt']).stdout.split('\0')[2],'lf');assert.equal(git(['check-attr','-z','eol','--','src/i.txt']).stdout.split('\0')[2],'unspecified');
});
test('report template is not pass; fail verdict differs from stale binding; migration preserves old bytes',()=>{
  const p=fixture(); cli(p,['receipt','snapshot','a','snapshot.json']); cli(p,['receipt','template','snapshot.json','report.json']); cli(p,['receipt','record','a','snapshot.json','report.json'],1);
  const r=json(path.join(p,'report.json')); Object.assign(r.artifacts.plan,{verdict:'fail',reviewer:'reviewer',toolVersion:'test',unverified:['none tested']}); write(p,'report.json',r); cli(p,['receipt','record','a','snapshot.json','report.json']);
  assert.match(validity(p).reasons.join(),/verdict is fail/); assert.doesNotMatch(validity(p).reasons.join(),/does not match/);
  const old=fs.readFileSync(path.join(p,'openspec/changes/a/ff-artifacts.json')); const policy=json(path.join(p,'openspec/ff-policy.json')); policy.artifacts[0].id='replacement'; write(p,'openspec/ff-policy.json',policy);
  const state=validity(p); assert.ok(state.artifacts[0].fingerprint); assert.equal(state.valid,false); reviewed(p,'a',{migrate:true});
  assert.ok(fs.readdirSync(path.join(p,'openspec/changes/a')).filter(n=>n.startsWith('ff-artifacts.history-')).some(n=>fs.readFileSync(path.join(p,'openspec/changes/a',n)).equals(old)));
});
test('malformed old receipts migrate from a fixed reviewed snapshot without deleting evidence',()=>{
  const p=fixture(); cli(p,['receipt','snapshot','a','snapshot.json']); cli(p,['receipt','template','snapshot.json','report.json']);
  const report=json(path.join(p,'report.json')); Object.assign(report.artifacts.plan,{verdict:'pass',reviewer:'fixture reviewer',toolVersion:'1',unverified:[]});write(p,'report.json',report);
  write(p,'openspec/changes/a/ff-artifacts.json','{ malformed original\n');cli(p,['receipt','record','a','snapshot.json','report.json'],1);cli(p,['receipt','record','a','snapshot.json','report.json','--migrate']);assert.equal(validity(p).valid,true);
  assert.ok(fs.readdirSync(path.join(p,'openspec/changes/a')).some(n=>n.startsWith('ff-artifacts.history-')&&fs.readFileSync(path.join(p,'openspec/changes/a',n),'utf8')==='{ malformed original\n'));
});
test('external review evidence is frozen by the tool and checked before and after recording',()=>{
  const p=fixture();write(p,'test.log','tested version\n');cli(p,['receipt','snapshot','a','snapshot.json']);cli(p,['receipt','template','snapshot.json','report.json','--evidence','test.log']);
  const report=json(path.join(p,'report.json'));Object.assign(report.artifacts.plan,{verdict:'pass',reviewer:'fixture',toolVersion:'1',unverified:[]});write(p,'report.json',report);
  write(p,'test.log','replaced before record\n');cli(p,['receipt','record','a','snapshot.json','report.json'],1);write(p,'test.log','tested version\n');cli(p,['receipt','record','a','snapshot.json','report.json']);assert.equal(validity(p).valid,true);
  write(p,'test.log','replaced after record\n');assert.equal(validity(p).valid,false);
  report.artifacts.plan.unexpected='ignored?';write(p,'report.json',report);cli(p,['receipt','record','a','snapshot.json','report.json'],1);
});
test('v2 archive requires stable progress mapping and zero archived checks cannot pass',()=>{
  const p=fixture();reviewed(p);assert.throws(()=>requireFF(p,path.join(p,'openspec/changes/a'),true),/stable plan and progress/);
  cli(p,['archive','a','--yes','--json'],1);const result=JSON.parse(cli(p,['validate','--archived','--json'],1).stdout);assert.equal(result.summary.totals.items,0);
  const policy=json(path.join(p,'openspec/ff-policy.json'));policy.artifacts[0].progress={plan:'openspec/changes/{change}/design.md',tasks:'openspec/changes/{change}/tasks.md'};policy.artifacts[0].reviewRequired=false;write(p,'openspec/ff-policy.json',policy);write(p,'openspec/changes/a/tasks.md','- [x] T1\n');assert.equal(validity(p).valid,false);assert.throws(()=>requireFF(p,path.join(p,'openspec/changes/a'),true),/reviewRequired/);
});
test('zero validation is non-success and installed CLI hints use project entry',()=>{
  const p=fs.mkdtempSync(path.join(suite,'empty-')); write(p,'openspec/config.yaml','schema: spec-driven\n'); fs.mkdirSync(path.join(p,'openspec/changes')); fs.mkdirSync(path.join(p,'openspec/specs'));
  const r=cli(p,['validate','--all','--json'],1); const out=JSON.parse(r.stdout); assert.equal(out.summary.totals.items,0);
  const hint=cli(p,['new','change','example']); assert.doesNotMatch(hint.stdout+hint.stderr,/node tools\/openspec\/ff-spec/);
  const status=cli(p,['status','--change','example','--json']); assert.doesNotMatch(status.stdout,/node tools\/openspec\/ff-spec/);
  assert.doesNotMatch(cli(p,['validate','--help']).stdout,/node tools\/openspec\/ff-spec/);
  const error=cli(p,['validate','--json'],1);assert.doesNotMatch(error.stdout+error.stderr,/node tools\/openspec\/ff-spec/);
});
test('Chinese prose obeys explicit MUST/SHALL body format; header-only and non-normative fail strict',()=>{
  const p=fixture(1); fs.unlinkSync(path.join(p,'openspec/ff-policy.json'));
  const spec=body=>'# Capability\n\n## Purpose\nProvide a clear local contract for deterministic validation without model execution.\n\n## Requirements\n### Requirement: Example\n'+body+'\n\n#### Scenario: Example\n- **WHEN** invoked\n- **THEN** works\n';
  write(p,'openspec/specs/zh/spec.md',spec('系统 MUST 保留已经审核的内容。')); cli(p,['validate','zh','--type','spec','--strict','--json']);
  write(p,'openspec/specs/zh/spec.md',spec('系统必须保留已经审核的内容。')); cli(p,['validate','zh','--type','spec','--strict','--json'],1);
  write(p,'openspec/specs/zh/spec.md',spec('保留已经审核的内容。').replace('Requirement: Example','Requirement: MUST Example'));cli(p,['validate','zh','--type','spec','--strict','--json'],1);
});
console.log(`Trial fixtures retained: ${suite}`);
