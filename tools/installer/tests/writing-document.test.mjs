import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { currentSkills, baselineSkills, architectureSkills, derivationSkills, hostBase, loadState } from '../state.mjs';
import { independentlyUpdatable } from '../source.mjs';
import { install, updateSkill } from '../install.mjs';
import { rollback, recover } from '../transaction.mjs';
import { json, digest, regularFiles } from '../files.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const base = process.env.FF_TEST_ROOT || os.tmpdir();
const temp = fs.mkdtempSync(path.join(base, 'ff-writing-document-'));
after(() => fs.rmSync(temp, { recursive: true, force: true }));
const document = 'ff-writing-document';
const diagram = 'ff-diagram';
const opts = { hosts: ['codex', 'claude'], mode: 'skills-only' };
function refresh(source) {
 json(path.join(source, 'MANIFEST.json'), { version: '0.9.6-derivation.4', files: Object.fromEntries(regularFiles(source).filter(n => n !== 'MANIFEST.json').map(n => [n, digest(path.join(source, n))])) });
}
function source(versions = {}) {
 const dest = fs.mkdtempSync(path.join(temp, 'source-'));
 for (const folder of ['skills', 'tools/openspec', 'tools/installer']) fs.cpSync(path.join(root, folder), path.join(dest, folder), { recursive: true });
 const registry = JSON.parse(fs.readFileSync(path.join(root, 'skill-versions.json')));
 for (const [name, version] of Object.entries(versions)) {
  const file = path.join(dest, 'skills', name, 'SKILL.md');
  fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace(`version: "${registry[name]}"`, `version: "${version}"`) + `\nFixture revision ${name} ${version}.\n`);
  registry[name] = version;
 }
 json(path.join(dest, 'skill-versions.json'), registry); refresh(dest); return dest;
}
function setup(src = source()) {
 const project = fs.mkdtempSync(path.join(temp, 'project-'));
 install(project, src, opts); return project;
}
function unchangedExcept(project, before, selected) {
 for (const [name, hash] of Object.entries(before.files)) if (!name.includes(`/skills/${selected}/`)) assert.equal(digest(path.join(project, name)), hash, name);
 const after = loadState(project);
 for (const key of ['version', 'sourceHash', 'release', 'releaseInventory', 'mode', 'hosts']) assert.deepEqual(after[key], before[key], key);
}
function stripTo(project, names) {
 const state = loadState(project);
 for (const name of Object.keys(state.files)) {
  const match = name.match(/^\.(agents|claude)\/skills\/([^/]+)\//);
  if (match && !names.includes(match[2])) { fs.unlinkSync(path.join(project, name)); delete state.files[name]; }
 }
 for (const host of state.hosts) for (const name of currentSkills) if (!names.includes(name)) fs.rmSync(path.join(project, hostBase(host), name), { recursive: true });
 json(path.join(project, '.forgeflow/install/state.json'), state); return state;
}

test('21-skill inventory includes independently updatable writing and diagram skills', () => {
 assert.equal(currentSkills.length, 21);
 assert.ok(currentSkills.includes(document));
 assert.deepEqual(independentlyUpdatable, [diagram, document]);
});
test('complete legacy 17/18/19/20 inventories upgrade to 21 on both hosts and rollback', async () => {
 const src = source();
 for (const names of [baselineSkills, architectureSkills, derivationSkills, [...derivationSkills, diagram].sort()]) {
  // Compatibility fixture: real installer transaction and runtime, with a frozen older skill inventory.
  // This models supported state layouts; it is not a historical-package or Windows execution claim.
  const legacy = source();
  for (const name of currentSkills) if (!names.includes(name)) fs.rmSync(path.join(legacy, 'skills', name), { recursive: true });
  const stateFile = path.join(legacy, 'tools/installer/state.mjs');
  fs.writeFileSync(stateFile, fs.readFileSync(stateFile, 'utf8').replace(/^export const currentSkills = .*;$/m, `export const currentSkills = ${JSON.stringify(names)};`));
  refresh(legacy);
  const oldInstaller = await import(pathToFileURL(path.join(legacy, 'tools/installer/install.mjs')).href);
  const project = fs.mkdtempSync(path.join(temp, 'legacy-project-'));
  oldInstaller.install(project, legacy, opts);
  const before = loadState(project);
  assert.equal(Object.keys(loadState(project).files).filter(n => n.endsWith('/SKILL.md')).length, names.length * 2);
  assert.equal(install(project, src, opts).status, 'INSTALLED_SKILLS_ONLY_GATES_BLOCKED');
  for (const host of opts.hosts) assert.equal(fs.readdirSync(path.join(project, hostBase(host))).length, 21);
  rollback(project, loadState(project)); assert.deepEqual(loadState(project).files, before.files);
  for (const [name, hash] of Object.entries(before.files)) assert.equal(digest(path.join(project, name)), hash);
 }
});
test('writing update preserves all unselected bytes and runtime; repeat is exact no-op', () => {
 const project = setup(), before = loadState(project), src = source({ [document]: '0.1.1' });
 assert.equal(updateSkill(project, src, { skill: document }).status, 'SKILL_UPDATED');
 unchangedExcept(project, before, document);
 for (const host of opts.hosts) assert.match(fs.readFileSync(path.join(project, hostBase(host), document, 'SKILL.md'), 'utf8'), /Fixture revision ff-writing-document 0.1.1/);
 const bytes = fs.readFileSync(path.join(project, '.forgeflow/install/state.json'));
 assert.equal(updateSkill(project, src, { skill: document }).status, 'UNCHANGED');
 assert.deepEqual(fs.readFileSync(path.join(project, '.forgeflow/install/state.json')), bytes);
});
test('two independent pins survive updating either skill; rollback removes only latest change', () => {
 const project = setup();
 updateSkill(project, source({ [diagram]: '0.1.1' }), { skill: diagram });
 const diagramState = loadState(project);
 updateSkill(project, source({ [document]: '0.1.1' }), { skill: document });
 unchangedExcept(project, diagramState, document);
 const both = loadState(project); assert.deepEqual(both.skillOverrides[diagram], diagramState.skillOverrides[diagram]);
 assert.equal(both.skillOverrides[document].version, '0.1.1');
 updateSkill(project, source({ [diagram]: '0.1.2' }), { skill: diagram });
 unchangedExcept(project, both, diagram); assert.deepEqual(loadState(project).skillOverrides[document], both.skillOverrides[document]);
 rollback(project, loadState(project)); assert.deepEqual(loadState(project).files, both.files); assert.deepEqual(loadState(project).skillOverrides, both.skillOverrides);
});
test('legacy install cannot add writing through independent update', () => {
 const project = setup(); stripTo(project, [...derivationSkills, diagram].sort());
 const before = fs.readFileSync(path.join(project, '.forgeflow/install/state.json'));
 assert.throws(() => updateSkill(project, source({ [document]: '0.1.1' }), { skill: document }), /already installed|full install/);
 assert.deepEqual(fs.readFileSync(path.join(project, '.forgeflow/install/state.json')), before);
});
test('writing user modifications, same-version changes and downgrade reject without overwriting', () => {
 const project = setup(), src = source({ [document]: '0.1.1' });
 const file = path.join(project, '.agents/skills', document, 'SKILL.md');
 const old = fs.readFileSync(file); fs.appendFileSync(file, '\nuser edit'); const edited = fs.readFileSync(file);
 assert.throws(() => updateSkill(project, src, { skill: document }), /User modification/); assert.deepEqual(fs.readFileSync(file), edited);
 fs.writeFileSync(file, old);
 assert.throws(() => updateSkill(project, source({ [document]: '0.1.0' }), { skill: document }), /same-version content conflict/);
 updateSkill(project, src, { skill: document });
 const before = fs.readFileSync(path.join(project, '.forgeflow/install/state.json'));
 assert.throws(() => updateSkill(project, source(), { skill: document }), /downgrade refused/);
 assert.deepEqual(fs.readFileSync(path.join(project, '.forgeflow/install/state.json')), before);
});
test('interrupted writing update restores content and existing independent pin', () => {
 const project = setup(); updateSkill(project, source({ [diagram]: '0.1.1' }), { skill: diagram });
 const before = loadState(project), rename = fs.renameSync;
 fs.renameSync = (a, b) => { if (b === path.join(project, '.forgeflow/install/state.json')) throw Error('injected writing failure'); return rename(a, b); };
 try { assert.throws(() => updateSkill(project, source({ [document]: '0.1.1' }), { skill: document }), /injected writing failure/); }
 finally { fs.renameSync = rename; }
 assert.deepEqual(loadState(project), before); for (const [name, hash] of Object.entries(before.files)) assert.equal(digest(path.join(project, name)), hash);
 assert.equal(recover(project).status, 'NO_PENDING_TRANSACTION');
});
test('full installation requires both pinned skills to match, then clears both overrides', () => {
 const project = setup();
 updateSkill(project, source({ [diagram]: '0.1.1' }), { skill: diagram });
 updateSkill(project, source({ [document]: '0.1.1' }), { skill: document });
 const before = fs.readFileSync(path.join(project, '.forgeflow/install/state.json'));
 assert.throws(() => install(project, source({ [document]: '0.1.1' }), opts), /pin conflict/);
 assert.deepEqual(fs.readFileSync(path.join(project, '.forgeflow/install/state.json')), before);
 install(project, source({ [diagram]: '0.1.1', [document]: '0.1.1' }), opts);
 assert.equal(loadState(project).skillOverrides, undefined);
});
