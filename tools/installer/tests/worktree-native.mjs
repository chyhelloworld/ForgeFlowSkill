// Explicit real Git worktree integration. Installs only into a new owned fixture.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {install} from '../install.mjs';
import {loadState} from '../state.mjs';
const [source,reusable,output]=process.argv.slice(2).map(p=>path.resolve(p));
assert.ok(source&&reusable&&output&&!fs.existsSync(output));fs.mkdirSync(output,{recursive:true});
const main=path.join(output,'中文 main'),worktree=path.join(main,'actual worktree');fs.mkdirSync(main);
function git(args){const r=spawnSync('git',args,{cwd:main,encoding:'utf8'});assert.equal(r.status,0,r.stderr);return r;}
git(['init','-q']);fs.writeFileSync(path.join(main,'baseline.txt'),'fixture\n');git(['add','baseline.txt']);git(['-c','user.name=Fixture','-c','user.email=fixture@example.invalid','commit','-qm','fixture']);
const options={hosts:['codex','claude'],mode:'full','reuse-build':reusable};install(main,source,options);
const statePath=path.join(main,'.forgeflow/install/state.json'),before=fs.readFileSync(statePath);
git(['worktree','add','--detach',worktree,'HEAD']);assert.ok(fs.statSync(path.join(worktree,'.git')).isFile());
const entry=path.join(main,'.forgeflow/ff-spec.mjs');
function cli(args,status){const r=spawnSync(process.execPath,[entry,...args],{cwd:worktree,encoding:'utf8'});assert.equal(r.status,status,r.stdout+r.stderr);return r;}
assert.match(cli(['new','change','blocked'],1).stderr,/no local FF install/);assert.deepEqual(fs.readFileSync(statePath),before);
install(worktree,source,options);assert.notEqual(loadState(main).transaction,loadState(worktree).transaction);
cli(['init','--tools','none'],0);cli(['new','change','only-in-worktree'],0);
assert.ok(fs.existsSync(path.join(worktree,'openspec/changes/only-in-worktree')));assert.equal(fs.existsSync(path.join(main,'openspec')),false);assert.deepEqual(fs.readFileSync(statePath),before);
fs.writeFileSync(path.join(output,'result.json'),JSON.stringify({status:'PASS',actualGitWorktree:true,uninstalledWorktree:'BLOCKED',installedWorktree:'local state selected through main launcher',mainStateUnchanged:true,main,worktree,modelInvocations:'NOT_RUN'},null,2)+'\n');
console.log('PASS actual worktree isolation, explicit offline install, main launcher targets worktree, main state unchanged');
