// Explicit Windows integration: no network, existing validated candidate build required.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { install, doctor } from '../install.mjs';
import { loadState } from '../state.mjs';
import { currentProject, doctorMain } from '../runtime.mjs';
assert.equal(process.platform,'win32');
const source=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
const [reusable,output]=process.argv.slice(2).map(p=>path.resolve(p));
assert.ok(reusable && output && !fs.existsSync(output)); fs.mkdirSync(output,{recursive:true});
const p=path.join(output,'中文 offline project');fs.mkdirSync(p);
const cases=[];
function check(name,action){action();cases.push(name);console.log(`PASS ${name}`);}
function run(entry,args,cwd=p,status=0){const r=spawnSync(process.execPath,[entry,...args],{cwd,encoding:'utf8',maxBuffer:8*1024*1024});assert.equal(r.status,status,r.stdout+r.stderr);return r;}
check('offline dual-host full and runtime/configuration separation',()=>{
  const result=install(p,source,{hosts:['codex','claude'],mode:'full','reuse-build':reusable});
  assert.equal(result.status,'INSTALLED');assert.ok(result.gitGuidance.generated.includes('/.forgeflow/install/'));
  const state=loadState(p);assert.equal(state.schema,2);assert.equal(state.hosts.length,2);
  for(const host of ['codex','claude']){const r=doctor(p,host);assert.equal(r.runtime,'READY');assert.equal(r.status,'RUNTIME_READY');assert.equal(r.gates.configuration,'UNCONFIGURED');}
  doctorMain(p,{version:state.version,hash:state.sourceHash},['--host','codex']);assert.ok(!process.exitCode);
  assert.match(run(path.join(p,'.forgeflow/ff-spec.mjs'),['--version']).stdout,/0\.9\.4-trial\.1/);
});
check('worktree boundary cannot select the main checkout state',()=>{
  const wt=path.join(p,'nested worktree');fs.mkdirSync(wt);fs.writeFileSync(path.join(wt,'.git'),'gitdir: example\n');
  const before=fs.readFileSync(path.join(p,'.forgeflow/install/state.json'));
  assert.throws(()=>currentProject(wt),/no local FF install/);
  assert.match(run(path.join(p,'.forgeflow/ff-spec.mjs'),['new','change','must-not-write'],wt,1).stderr,/no local FF install/);
  assert.deepEqual(fs.readFileSync(path.join(p,'.forgeflow/install/state.json')),before);assert.equal(fs.existsSync(path.join(p,'openspec/changes/must-not-write')),false);
});
check('doctor distinguishes policy with zero active checks',()=>{
  fs.mkdirSync(path.join(p,'openspec/changes'),{recursive:true});fs.mkdirSync(path.join(p,'openspec/specs'),{recursive:true});
  fs.writeFileSync(path.join(p,'openspec/config.yaml'),'schema: spec-driven\n');
  fs.writeFileSync(path.join(p,'openspec/ff-policy.json'),JSON.stringify({version:2,artifacts:[{id:'plan',paths:['openspec/changes/{change}/design.md'],requires:[],reviewRequired:true}]}));
  const result=doctor(p);assert.equal(result.gates.evidence,'NO_CHECKS');assert.equal(result.status,'RUNTIME_READY');run(path.join(p,'.forgeflow/ff-spec.mjs'),['validate','--all','--json'],p,1);
});
check('candidate dependency tampering is rejected before execution',()=>{
  // This owns only its explicit copy; the supplied reusable source is read-only.
  const copy=path.join(output,'tampered reuse');fs.mkdirSync(copy);
  fs.copyFileSync(path.join(reusable,'upstream.json'),path.join(copy,'upstream.json'));
  fs.cpSync(path.join(reusable,'.build'),path.join(copy,'.build'),{recursive:true,filter:()=>true,verbatimSymlinks:true});
  const dependency=path.join(copy,'.build/node_modules/fast-glob/package.json');fs.appendFileSync(dependency,' ');
  const target=path.join(output,'tamper target');fs.mkdirSync(target);
  assert.throws(()=>install(target,source,{hosts:['codex','claude'],mode:'full','reuse-build':copy}),/dependency hashes mismatch/);
  assert.equal(loadState(target),null);
});
check('GNU tar absolute-drive failure and relative-archive fix in Chinese path',()=>{
  const tar='C:/Program Files/Git/usr/bin/tar.exe';assert.ok(fs.existsSync(tar),'GNU tar required for this native verification');
  const env={...Object.fromEntries(Object.entries(process.env).filter(([k])=>k.toLowerCase()!=='path')),PATH:path.dirname(tar)+path.delimiter+process.env.PATH};
  const archive=path.join(output,'中文 archive');fs.mkdirSync(archive);fs.copyFileSync(path.join(source,'tools/openspec/upstream-v1.14.2.tar.gz'),path.join(archive,'source.tgz'));
  const bad=spawnSync(tar,['-tzf',path.join(archive,'source.tgz')],{cwd:archive,encoding:'utf8',env});assert.notEqual(bad.status,0);assert.match(bad.stderr,/Cannot connect|resolve failed/);fs.writeFileSync(path.join(output,'gnu-tar-before.log'),bad.stderr);
  const extracted=path.join(archive,'中文 extracted');fs.mkdirSync(extracted);const good=spawnSync(tar,['-xzf','source.tgz','-C',path.relative(archive,extracted)],{cwd:archive,encoding:'utf8',env});assert.equal(good.status,0,good.stderr);assert.ok(fs.existsSync(path.join(extracted,'src/core/archive.ts')));
  const bash='C:/Program Files/Git/bin/bash.exe';const gitBash=spawnSync(bash,['--noprofile','--norc','-c','tar -tzf source.tgz > /dev/null'],{cwd:archive,encoding:'utf8'});assert.equal(gitBash.status,0,gitBash.stderr);
});
check('Node Unicode rm minimal observation; no production workaround inferred',()=>{
  const target=path.join(output,'中文 rm probe');fs.mkdirSync(path.join(target,'nested'),{recursive:true});fs.writeFileSync(path.join(target,'nested/test.txt'),'fixture');
  fs.rmSync(target,{recursive:true,force:true});fs.writeFileSync(path.join(output,'rm-observation.json'),JSON.stringify({node:process.version,platform:process.platform,remaining:fs.existsSync(target),scope:'one small owned directory; not proof for large trees'},null,2));
});
fs.writeFileSync(path.join(output,'result.json'),JSON.stringify({status:'PASS',cases,source,version:JSON.parse(fs.readFileSync(path.join(source,'package.json'))).version,modelInvocations:'NOT_RUN'},null,2)+'\n');
