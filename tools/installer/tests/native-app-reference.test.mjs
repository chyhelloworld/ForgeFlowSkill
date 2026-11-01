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
const temp = fs.mkdtempSync(path.join(process.env.FF_TEST_ROOT || os.tmpdir(), 'ff-native-reference-'));
after(() => fs.rmSync(temp, { recursive: true, force: true }));
const added = ['references/native-app.md', 'references/ios.md', 'references/android.md', 'references/native-audit.md', 'LICENSE-PLATFORM-DESIGN-SKILLS'];
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
test('optional native references install on two hosts without changing skill count', () => {
 const src = source(), project = fs.mkdtempSync(path.join(temp, 'project-'));
 install(project, src, options);
 assert.equal(currentSkills.length, 21);
 for (const host of options.hosts) {
  assert.equal(fs.readdirSync(path.join(project, hostBase(host))).length, 21);
  for (const name of added) assert.equal(digest(path.join(project, hostBase(host), 'ff-design', name)), digest(path.join(src, 'skills/ff-design', name)));
 }
});
test('native reference upgrade preserves other skills and landing reference; rollback restores prior layout', () => {
 const project = fs.mkdtempSync(path.join(temp, 'project-'));
 install(project, source(true), options);
 const before = loadState(project);
 const bytes = Object.fromEntries(Object.keys(before.files).map(name => [name, fs.readFileSync(path.join(project, name))]));
 install(project, source(), options);
 const afterState = loadState(project);
 for (const name of Object.keys(before.files)) if (!name.includes('/skills/ff-design/') || name.endsWith('/references/landing-page.md')) {
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
test('native upstream snapshots and transitive MIT license match pinned provenance', () => {
 const provenance = JSON.parse(fs.readFileSync(path.join(root, 'provenance/native-app-design-sources.json'), 'utf8'));
 assert.equal(provenance.commit, '2f98774f86bc05563876643db37e6c37c322850f');
 for (const [name, hash] of Object.entries(provenance.source_sha256)) assert.equal(digest(path.join(root, name)), hash, name);
 assert.equal(digest(path.join(root, 'skills/ff-design/LICENSE-PLATFORM-DESIGN-SKILLS')), provenance.transitive_mit_license.sha256);
});
