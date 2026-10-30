import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { install } from '../install.mjs';
import { hostBase } from '../state.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const names = ['ff-diagram'];
const files = ['core.md', 'architecture.md', 'data.md', 'uml.md'];
const base = process.env.FF_TEST_ROOT;
if (!base || !path.isAbsolute(base)) throw new Error('FF_TEST_ROOT must name an explicit absolute fixture directory');
const suite = fs.mkdtempSync(path.join(base, 'ff-diagrams-'));
function checkLinks(folder) {
  for (const name of files) {
    const file = path.join(folder, 'references', name);
    for (const [, link] of fs.readFileSync(file, 'utf8').matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
      if (link.includes('://') || link.startsWith('#')) continue;
      const target = path.resolve(path.dirname(file), link.split('#')[0]);
      assert.ok(target.startsWith(folder + path.sep), 'external dependency: ' + link);
      assert.ok(fs.statSync(target).isFile(), link);
    }
  }
}
test('only the standalone diagram skill owns references; old entries have optional name routing', () => {
  for (const name of fs.readdirSync(path.join(root, 'skills'))) {
    const folder = path.join(root, 'skills', name);
    if (name !== 'ff-diagram') assert.equal(fs.existsSync(path.join(folder, 'references/diagrams')), false);
  }
  for (const name of ['ff-architecture-derive', 'ff-spec', 'ff-architecture-review', 'ff-review']) {
    assert.ok(fs.readFileSync(path.join(root, 'skills', name, 'SKILL.md'), 'utf8').includes('ff-diagram'));
  }
  const folder = path.join(root, 'skills/ff-diagram');
  assert.deepEqual(fs.readdirSync(path.join(folder, 'references')).sort(), [...files].sort());
  checkLinks(folder);
});
test('individual skill folder copies resolve diagram references without siblings', () => {
  for (const name of names) {
    const folder = path.join(suite, 'single', name);
    fs.cpSync(path.join(root, 'skills', name), folder, { recursive: true });
    checkLinks(folder);
  }
});
test('real skills-only dual-host install includes every guidance byte and is idempotent', () => {
  const project = fs.mkdtempSync(path.join(suite, 'installed-'));
  const options = { hosts: ['codex', 'claude'], mode: 'skills-only' };
  assert.equal(install(project, root, options).status, 'INSTALLED_SKILLS_ONLY_GATES_BLOCKED');
  for (const host of options.hosts) for (const name of names) {
    const folder = path.join(project, hostBase(host), name);
    checkLinks(folder);
    for (const file of files) assert.deepEqual(fs.readFileSync(path.join(folder, 'references', file)), fs.readFileSync(path.join(root, 'skills', name, 'references', file)));
  }
  assert.equal(install(project, root, options).status, 'UNCHANGED');
});
