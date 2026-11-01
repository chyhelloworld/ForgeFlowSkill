import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { install } from '../install.mjs';
import { rollback } from '../transaction.mjs';
import { loadState, hostBase, currentSkills } from '../state.mjs';
import { json, digest, regularFiles } from '../files.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const temp = fs.mkdtempSync(path.join(process.env.FF_TEST_ROOT || os.tmpdir(), 'ff-landing-reference-'));
after(() => fs.rmSync(temp, { recursive: true, force: true }));
const added = ['references/landing-page.md', 'LICENSE-AI-DESIGN-SKILLS', 'LICENSE-TASTE-SKILL'];
function source(old = false) {
 const dest = fs.mkdtempSync(path.join(temp, 'source-'));
 for (const folder of ['skills', 'tools/openspec', 'tools/installer']) fs.cpSync(path.join(root, folder), path.join(dest, folder), { recursive: true });
 fs.copyFileSync(path.join(root, 'skill-versions.json'), path.join(dest, 'skill-versions.json'));
 // Controlled previous-layout fixture, not a historical installer or native-host test.
 if (old) for (const name of added) fs.rmSync(path.join(dest, 'skills/ff-design', name));
 json(path.join(dest, 'MANIFEST.json'), { version: '0.9.6-derivation.4', files: Object.fromEntries(regularFiles(dest).map(n => [n, digest(path.join(dest, n))])) });
 return dest;
}
const options = { hosts: ['codex', 'claude'], mode: 'skills-only' };
test('optional landing reference and both licenses install on two hosts without a new skill', () => {
 const src = source(), project = fs.mkdtempSync(path.join(temp, 'project-'));
 install(project, src, options);
 assert.equal(currentSkills.length, 21);
 for (const host of options.hosts) {
  assert.equal(fs.readdirSync(path.join(project, hostBase(host))).length, 21);
  for (const name of added) assert.equal(digest(path.join(project, hostBase(host), 'ff-design', name)), digest(path.join(src, 'skills/ff-design', name)));
 }
});
test('adding optional reference preserves unselected content except manifest bindings; rollback restores prior layout', () => {
 const project = fs.mkdtempSync(path.join(temp, 'project-'));
 install(project, source(true), options);
 const before = loadState(project);
 const bytes = Object.fromEntries(Object.keys(before.files).map(name => [name, fs.readFileSync(path.join(project, name))]));
 install(project, source(), options);
 const afterState = loadState(project);
 for (const name of Object.keys(before.files)) if (!name.includes('/skills/ff-design/')) {
  // Full-package installs intentionally rebind entry points to the new manifest.
  const generated = name.endsWith('/SKILL.md') || name === '.forgeflow/ff-spec.mjs' || name === '.forgeflow/install/doctor.mjs';
  const expected = generated ? Buffer.from(bytes[name].toString().replaceAll(before.sourceHash, afterState.sourceHash)) : bytes[name];
  assert.deepEqual(fs.readFileSync(path.join(project, name)), expected, name);
 }
 for (const host of options.hosts) for (const name of added) assert.ok(fs.existsSync(path.join(project, hostBase(host), 'ff-design', name)));
 rollback(project, loadState(project));
 assert.deepEqual(loadState(project).files, before.files);
 for (const [name, hash] of Object.entries(before.files)) assert.equal(digest(path.join(project, name)), hash, name);
 for (const host of options.hosts) for (const name of added) assert.equal(fs.existsSync(path.join(project, hostBase(host), 'ff-design', name)), false);
});
