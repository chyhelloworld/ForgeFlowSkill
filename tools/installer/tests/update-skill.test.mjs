import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import * as installer from '../install.mjs';
const { install } = installer;
const updateSkill = (...args) => installer.updateSkill(...args);
import { parse } from '../../../installer.mjs';
import { loadState, rollback, recover } from '../transaction.mjs';
import { sha, digest, json, regularFiles } from '../files.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ff-update-skill-'));
function source(version = '0.1.0', extra = '') {
  const dest = fs.mkdtempSync(path.join(temp, 'source-'));
  for (const folder of ['skills', 'tools/openspec', 'tools/installer']) fs.cpSync(path.join(root, folder), path.join(dest, folder), { recursive: true });
  fs.copyFileSync(path.join(root, 'skill-versions.json'), path.join(dest, 'skill-versions.json'));
  json(path.join(dest, 'skill-versions.json'), { ...JSON.parse(fs.readFileSync(path.join(dest, 'skill-versions.json'))), 'ff-diagram': version });
  const skill = path.join(dest, 'skills/ff-diagram/SKILL.md');
  fs.writeFileSync(skill, fs.readFileSync(skill, 'utf8').replace('version: "0.1.0"', `version: "${version}"`) + extra);
  refresh(dest); return dest;
}
function refresh(dest) { json(path.join(dest, 'MANIFEST.json'), {version:'0.9.6-derivation.4', files:Object.fromEntries(regularFiles(dest).filter(n => n !== 'MANIFEST.json').map(n => [n, digest(path.join(dest,n))]))}); }
const original = source();
const newer = source('0.1.1', '\nUpdated diagram fixture.\n');
const opts = {host:'codex',mode:'skills-only'};
function setup(dual = false) { const p=fs.mkdtempSync(path.join(temp,'project-')); install(p,original,dual ? {hosts:['codex','claude'],mode:'skills-only'} : opts); return p; }
function unchangedOutside(p, before) { const after=loadState(p); for(const [n,h] of Object.entries(before.files)) if(!n.includes('/skills/ff-diagram/')) assert.equal(digest(path.join(p,n)),h,n); for(const k of ['version','sourceHash','release','releaseInventory','mode']) assert.deepEqual(after[k],before[k],k); }
const update = (p,s=newer) => updateSkill(p,s,{skill:'ff-diagram'});
test('CLI accepts only explicit update-skill target and rejects install flags',()=>{
 assert.equal(parse(['update-skill','--project','x','--skill','ff-diagram']).skill,'ff-diagram');
 for(const tail of [[],['--skill','ff-diagram','--host','codex'],['--skill','ff-diagram','--mode','full']]) assert.throws(()=>parse(['update-skill','--project','x',...tail]));
 assert.throws(()=>parse(['doctor','--project','x','--skill','ff-diagram']));
});
test('single skill success keeps every nonselected byte and runtime pin; repeat exact no-op',()=>{
 const p=setup(), before=loadState(p); assert.equal(update(p).status,'SKILL_UPDATED'); unchangedOutside(p,before);
 const current=loadState(p); assert.equal(current.skillOverrides['ff-diagram'].version,'0.1.1');
 assert.equal(current.skillOverrides['ff-diagram'].sourceHash,sha(fs.readFileSync(path.join(newer,'MANIFEST.json'))));
 const raw=fs.readFileSync(path.join(p,'.forgeflow/install/state.json')); assert.equal(update(p).status,'UNCHANGED'); assert.deepEqual(fs.readFileSync(path.join(p,'.forgeflow/install/state.json')),raw);
});
test('dual host updates together and keeps runtime and other skill hashes',()=>{
 const p=setup(true), before=loadState(p); update(p); unchangedOutside(p,before);
 for(const base of ['.agents','.claude']) assert.match(fs.readFileSync(path.join(p,base,'skills/ff-diagram/SKILL.md'),'utf8'),/Updated diagram fixture/);
});
test('user edits in selected and unselected files reject without overwrite',()=>{
 for(const skill of ['ff-diagram','ff-spec']) {const p=setup(), f=path.join(p,`.agents/skills/${skill}/SKILL.md`); fs.appendFileSync(f,'user'); const bytes=fs.readFileSync(f); assert.throws(()=>update(p),/User modification/); assert.deepEqual(fs.readFileSync(f),bytes);}
});
test('selected managed deletions/new files are reconciled; unmanaged collision rejects',()=>{
 const src=source('0.1.2'); const removed='skills/ff-diagram/CHANGELOG.md'; fs.unlinkSync(path.join(src,removed)); fs.writeFileSync(path.join(src,'skills/ff-diagram/new.txt'),'new'); refresh(src);
 const p=setup(); update(p,src); assert.equal(fs.existsSync(path.join(p,'.agents',removed)),false); assert.equal(fs.readFileSync(path.join(p,'.agents/skills/ff-diagram/new.txt'),'utf8'),'new');
 const q=setup(); fs.writeFileSync(path.join(q,'.agents/skills/ff-diagram/new.txt'),'mine'); assert.throws(()=>update(q,src),/Unmanaged conflict/);
});
test('source tamper anywhere rejects and uninstalled or unsupported skill rejects',()=>{
 const src=source(); fs.appendFileSync(path.join(src,'skills/ff-spec/SKILL.md'),'tamper'); const p=setup(); assert.throws(()=>update(p,src),/Source integrity/);
 assert.throws(()=>updateSkill(p,newer,{skill:'ff-spec'}),/independent|supported/);
 assert.throws(()=>update(fs.mkdtempSync(path.join(temp,'empty-'))),/Not installed/);
});
test('legacy state without selected skill rejects without adding runtime helpers',()=>{
 const p=setup(), before=loadState(p); for(const n of Object.keys(before.files)) if(n.includes('/skills/ff-diagram/') || n.includes('/skills/ff-writing-document/')) {fs.unlinkSync(path.join(p,n));delete before.files[n];} json(path.join(p,'.forgeflow/install/state.json'),before);
 const bytes=fs.readFileSync(path.join(p,'.forgeflow/install/state.json')); assert.throws(()=>update(p),/already installed|full install/); assert.deepEqual(fs.readFileSync(path.join(p,'.forgeflow/install/state.json')),bytes);
});
test('failure before state commit restores bytes and state, rollback restores successful update',()=>{
 const p=setup(),before=loadState(p),rename=fs.renameSync;
 fs.renameSync=(a,b)=>{if(b===path.join(p,'.forgeflow/install/state.json')) throw Error('injected failure');return rename(a,b);};
 try {assert.throws(()=>update(p),/injected failure/);} finally {fs.renameSync=rename;}
 assert.deepEqual(loadState(p),before); for(const [n,h]of Object.entries(before.files)) assert.equal(digest(path.join(p,n)),h); assert.equal(recover(p).status,'NO_PENDING_TRANSACTION');
 update(p); rollback(p,loadState(p)); assert.deepEqual(loadState(p).files,before.files); assert.equal(loadState(p).skillOverrides,undefined);
});
test('full install rejects mismatched pin before unchanged; exact pin accepts and clears override',()=>{
 const p=setup();update(p);const bytes=fs.readFileSync(path.join(p,'.forgeflow/install/state.json'));
 assert.throws(()=>install(p,original,opts),/pin conflict/); assert.deepEqual(fs.readFileSync(path.join(p,'.forgeflow/install/state.json')),bytes);
 install(p,newer,opts);assert.equal(loadState(p).skillOverrides,undefined);
});
test('old source without independent registry rejects; malformed override rejects',()=>{
 const src=source(); fs.unlinkSync(path.join(src,'skill-versions.json')); refresh(src); const p=setup();
 assert.throws(()=>update(p,src),/registry/);
 const state=loadState(p); state.skillOverrides={'ff-diagram':{version:'0.1.1',hash:'invalid',sourceHash:'invalid'}}; json(path.join(p,'.forgeflow/install/state.json'),state);
 assert.throws(()=>loadState(p),/Invalid skill override/);
});
test('same version and bytes on initial install is a state-byte no-op',()=>{
 const p=setup(), bytes=fs.readFileSync(path.join(p,'.forgeflow/install/state.json'));
 assert.equal(update(p,original).status,'UNCHANGED');assert.deepEqual(fs.readFileSync(path.join(p,'.forgeflow/install/state.json')),bytes);
});
test('recovery refuses an intervening user edit, then completes after explicit restoration',()=>{
 const p=setup(), before=loadState(p), rename=fs.renameSync;
 const changed=path.join(p,'.agents/skills/ff-diagram/SKILL.md'); let afterBytes;
 fs.renameSync=(a,b)=>{if(b===path.join(p,'.forgeflow/install/state.json')) {afterBytes=fs.readFileSync(changed);fs.appendFileSync(changed,'user during commit');throw Error('injected interruption');}return rename(a,b);};
 try {assert.throws(()=>update(p),/Recovery conflict/);} finally {fs.renameSync=rename;}
 assert.match(fs.readFileSync(changed,'utf8'),/user during commit/); assert.ok(fs.existsSync(path.join(p,'.forgeflow/install/pending.json')));
 fs.writeFileSync(changed,afterBytes); assert.equal(recover(p).status,'RECOVERED'); assert.deepEqual(loadState(p),before);
 for(const [n,h]of Object.entries(before.files)) assert.equal(digest(path.join(p,n)),h);
});

test('same-version content mutation and version downgrade are refused',()=>{
 const changed=source('0.1.0','\nUnversioned mutation.\n');const p=setup();
 assert.throws(()=>update(p,changed),/same-version content conflict/);
 update(p);const bytes=fs.readFileSync(path.join(p,'.forgeflow/install/state.json'));
 assert.throws(()=>update(p,original),/downgrade refused/);
 const mutatedNew=source('0.1.1','\nDifferent content than current override.\n');assert.throws(()=>update(p,mutatedNew),/same-version content conflict/);
 assert.deepEqual(fs.readFileSync(path.join(p,'.forgeflow/install/state.json')),bytes);
 const minor=source('0.2.0','\nMinor upgrade.\n');assert.equal(update(p,minor).version,'0.2.0');
});
test('full source with same skill pin but different unrelated content accepts',()=>{
 const p=setup();update(p);const src=source('0.1.1','\nUpdated diagram fixture.\n');fs.appendFileSync(path.join(src,'skills/ff-spec/SKILL.md'),'\nunrelated full update');refresh(src);
 install(p,src,opts);assert.equal(loadState(p).skillOverrides,undefined);
});
