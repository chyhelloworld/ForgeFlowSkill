import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { baselineSkills, currentSkills, sharedFiles, hostBase, validateState, loadState } from '../state.mjs';
import { verifySource, skillPayload } from '../source.mjs';
import { install, doctor } from '../install.mjs';

const source = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
// Explicit fixture root prevents tests from silently creating projects on C:.
const base = process.env.FF_TEST_ROOT;
if (!base || !path.isAbsolute(base)) throw new Error('FF_TEST_ROOT must name an explicit absolute fixture directory');
const suite = fs.mkdtempSync(path.join(base, 'ff-architecture-'));
function fixtureState(names, hosts = ['codex']) {
  const files = Object.fromEntries(sharedFiles.map(name => [name, 'a'.repeat(64)]));
  for (const host of hosts) for (const name of names) files[`${hostBase(host)}/${name}/SKILL.md`] = 'a'.repeat(64);
  return { schema: 2, hosts, mode: 'skills-only', files };
}

test('legacy 17 and current 18 complete inventories remain readable', () => {
  for (const names of [baselineSkills, currentSkills]) {
    const state = fixtureState(names, ['codex', 'claude']);
    assert.equal(validateState(suite, state), state);
  }
});

test('missing baseline, renamed skill and mixed-host inventory are rejected', () => {
  for (const names of [currentSkills.filter(n => n !== 'ff-spec'), [...baselineSkills.slice(1), 'ff-unknown']]) {
    assert.throws(() => validateState(suite, fixtureState(names)), /skill inventory/);
  }
  const state = fixtureState(currentSkills, ['codex', 'claude']);
  delete state.files['.claude/skills/ff-architecture-review/SKILL.md'];
  assert.throws(() => validateState(suite, state), /Mixed skill inventory/);
});

test('both host payloads include standalone entry, metadata and local template', () => {
  const pin = verifySource(source);
  assert.deepEqual(pin.names, currentSkills);
  for (const host of ['codex', 'claude']) {
    const payload = skillPayload(source, pin, host);
    const prefix = `${hostBase(host)}/ff-architecture-review/`;
    for (const name of ['SKILL.md', 'agents/openai.yaml', 'references/scenario-review.md', 'NOTICE.md', 'LICENSE']) {
      assert.ok(payload[prefix + name], name);
    }
    assert.deepEqual(payload[prefix + 'references/scenario-review.md'], fs.readFileSync(path.join(source, 'skills/ff-architecture-review/references/scenario-review.md')));
  }
});

test('isolated skills-only install and reentry preserve optional entry on both hosts', () => {
  const project = fs.mkdtempSync(path.join(suite, '双宿主 '));
  const options = { hosts: ['codex', 'claude'], mode: 'skills-only' };
  assert.equal(install(project, source, options).status, 'INSTALLED_SKILLS_ONLY_GATES_BLOCKED');
  const statePath = path.join(project, '.forgeflow/install/state.json');
  const before = fs.readFileSync(statePath);
  assert.equal(loadState(project).schema, 2);
  for (const host of options.hosts) {
    assert.equal(fs.readdirSync(path.join(project, hostBase(host))).length, 18);
    assert.ok(fs.readFileSync(path.join(project, hostBase(host), 'ff-architecture-review/SKILL.md'), 'utf8').includes('references/scenario-review.md'));
    assert.throws(() => doctor(project, host), /skills-only/);
  }
  assert.equal(install(project, source, options).status, 'UNCHANGED');
  assert.deepEqual(fs.readFileSync(statePath), before);
});
