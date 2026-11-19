import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createFixtureDirectory } from '../installer/testing/workspace.mjs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { adoptMain } from '../openspec/ff-adopt.mjs';
import { statusOverview } from '../openspec/ff-status.mjs';

const root = createFixtureDirectory('ff-intake-review-');
function write(p, name, content) {
  const file = path.join(p, name);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}
function snapshot(p) {
  return fs.readdirSync(p, { recursive: true }).sort().filter(n => fs.statSync(path.join(p, n)).isFile())
    .map(n => [n, fs.readFileSync(path.join(p, n)).toString('base64')]);
}
async function invoke(fn, project, args) {
  let out = '', err = '';
  const code = await fn(null, args, { project, out: { write: s => { out += s; } }, err: { write: s => { err += s; } } });
  return { code, out, err };
}
test('small confirmed behavior runs at its entry without formal spec or plan files', () => {
  const p = path.join(root, 'small');
  write(p, 'hello.mjs', "console.log(process.argv[2]?.trim() ? `Hello, ${process.argv[2].trim()}!` : 'Hello!');\n");
  write(p, 'user-draft.txt', 'Unrelated user content.\n');
  const before = snapshot(p);
  for (const [args, expected] of [[[], 'Hello!\n'], [[' Lin '], 'Hello, Lin!\n'], [['   '], 'Hello!\n']]) {
    const r = spawnSync(process.execPath, ['hello.mjs', ...args], { cwd: p, encoding: 'utf8' });
    assert.equal(r.status, 0); assert.equal(r.stdout, expected); assert.equal(r.stderr, '');
  }
  assert.deepEqual(snapshot(p), before);
  assert.equal(fs.existsSync(path.join(p, 'openspec')), false);
});
test('existing project adoption preview preserves artifacts, unrelated notes, and existing policy bytes', async () => {
  const p = path.join(root, 'existing');
  write(p, 'openspec/changes/fix-label/design.md', '# Existing scope\nRetain fallback greeting.\n');
  write(p, 'openspec/changes/fix-label/tasks.md', '- [x] T1 claimed complete\n');
  write(p, 'openspec/ff-policy.json', JSON.stringify({ version: 1, artifacts: [{ id: 'design', paths: ['openspec/changes/{change}/design.md'], requires: [], reviewRequired: true }] }));
  write(p, 'user-draft.txt', 'Unrelated user notes must survive.\n');
  const before = snapshot(p);
  const r = await invoke(adoptMain, p, ['--json']);
  assert.equal(r.code, 0); const report = JSON.parse(r.out);
  assert.equal(report.written, false); assert.deepEqual(report.policy.artifacts.map(a => a.id), ['design']);
  assert.equal(report.progress, false); // A checked task is not a valid plan mapping or acceptance.
  assert.equal(report.preview, undefined); // No validity assertion in a read-only inference.
  assert.deepEqual(snapshot(p), before);
});
test('missing real evaluator reports inability to evaluate instead of synthesizing valid receipts', async () => {
  const p = path.join(root, 'missing-build');
  write(p, 'openspec/ff-policy.json', '{"version":1,"artifacts":[]}\n');
  const before = snapshot(p);
  const r = await invoke(statusOverview, p, ['--strict', '--json']);
  assert.equal(r.code, 1); assert.match(r.err, /requires the bundled build/); assert.equal(r.out, '');
  assert.deepEqual(snapshot(p), before);
});
