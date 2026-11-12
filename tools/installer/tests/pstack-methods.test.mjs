// Package/routing integrity only. Behavioral and native-host results are separate.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { skillPayload } from '../source.mjs';
import { hostBase } from '../state.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

test('selected proof references resolve within each installed host skill', () => {
  for (const host of ['codex', 'claude', 'dsh']) {
    const payload = skillPayload(root, {version: 'fixture', hash: 'a'.repeat(64)}, host);
    const base = `${hostBase(host)}/ff-prove/`;
    const entry = payload[`${base}SKILL.md`].toString();
    const names = ['project-verification.md', 'measurement.md'];
    for (const name of names) {
      assert.ok(entry.includes(`references/${name}`));
      assert.equal(payload[`${base}references/${name}`].toString(), read(`skills/ff-prove/references/${name}`));
    }
  }
});

test('method integration uses existing skills and does not introduce a parallel harness', () => {
  const expected = ['ff-intake', 'ff-review', 'ff-architecture-derive', 'ff-prove', 'ff-tdd', 'ff-implement', 'ff-handoff', 'ff-retro'];
  for (const skill of expected) assert.ok(fs.existsSync(path.join(root, 'skills', skill, 'SKILL.md')));
  assert.equal(fs.readdirSync(path.join(root, 'skills')).filter(n => n.startsWith('pstack')).length, 0);
});

test('method cases are reusable with existing blind-evaluation protocol', () => {
  const cases = JSON.parse(read('evaluations/scenarios.json')).cases.filter(c => c.id.startsWith('PSTACK-'));
  assert.equal(cases.length, 5);
  assert.equal(new Set(cases.map(c => c.id)).size, 5);
  for (const c of cases) {
    assert.ok(c.prompt.length > 20);
    assert.equal(c.criteria.length, 3);
    assert.ok(c.critical_failures.length > 0);
    for (const skill of c.skills) assert.ok(fs.existsSync(path.join(root, 'skills', skill, 'SKILL.md')));
  }
});
