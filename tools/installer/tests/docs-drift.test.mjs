import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const canonical = path.join(root, 'docs/maintainers/SPEC-LIFECYCLE.md');
const read = file => fs.readFileSync(file);

test('every skill reference copy matches the canonical lifecycle contract', () => {
  const expected = read(canonical);
  const skills = fs.readdirSync(path.join(root, 'skills'), { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .sort();
  const copies = skills
    .map(name => path.join(root, 'skills', name, 'references/spec-lifecycle.md'))
    .filter(file => fs.existsSync(file));
  assert.equal(copies.length, 12, 'expected one lifecycle reference for each of the 12 workflow skills');
  for (const copy of copies) {
    assert.deepEqual(read(copy), expected, path.relative(root, copy) + ' drifted from docs/maintainers/SPEC-LIFECYCLE.md; copy the canonical file instead of editing the skill copy');
  }
});

test('user docs name the adopt command wherever policies are introduced', () => {
  const docs = ['docs/user/capabilities.md', 'docs/user/install.md', 'docs/FF-中文使用手册.md', 'docs/user/optional-methods.md', 'docs/user/codegraph.md'];
  for (const name of docs) {
    const text = read(path.join(root, name)).toString();
    assert.match(text, /ff-spec\.mjs adopt/, name + ' must mention ff-spec.mjs adopt');
  }
});

test('the example policy shows the v2 shape adopt infers', () => {
  const policy = JSON.parse(read(path.join(root, 'templates/ff-policy.example.json')).toString());
  assert.equal(policy.version, 2);
  assert.deepEqual(policy.artifacts.map(artifact => artifact.id), ['design', 'plan']);
  for (const artifact of policy.artifacts) {
    assert.deepEqual(artifact.changes, ['*']);
    assert.equal(artifact.reviewRequired, true);
    assert.ok(artifact.paths.every(target => target.startsWith('openspec/changes/{change}/')), artifact.id + ' must stay change-relative');
  }
  const plan = policy.artifacts[1];
  assert.deepEqual(plan.requires, ['design']);
  assert.deepEqual(plan.progress, { plan: 'openspec/changes/{change}/plan.md', tasks: 'openspec/changes/{change}/tasks.md' });
});
