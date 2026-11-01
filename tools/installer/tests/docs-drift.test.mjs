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
  const capabilities = read(path.join(root, 'docs/user/capabilities.md')).toString();
  const install = read(path.join(root, 'docs/user/install.md')).toString();
  const handbook = read(path.join(root, 'docs/FF-中文使用手册.md')).toString();
  for (const [name, text] of [['docs/user/capabilities.md', capabilities], ['docs/user/install.md', install], ['docs/FF-中文使用手册.md', handbook]]) {
    assert.match(text, /ff-spec\.mjs adopt/, name + ' must mention ff-spec.mjs adopt');
  }
});
