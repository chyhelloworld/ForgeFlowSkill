import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { adoptMain } from './ff-adopt.mjs';

const home = path.dirname(fileURLToPath(import.meta.url));
const built = fs.existsSync(path.join(home, '.build/FF-BUILD.json'));
const suite = fs.mkdtempSync(path.join(process.env.FF_TEST_ROOT || os.tmpdir(), 'ff-adopt-'));
process.on('exit', () => { try { fs.rmSync(suite, { recursive: true, force: true, maxRetries: 3 }); } catch (error) { console.error('temp cleanup failed: ' + error.message); } });
const project = () => fs.mkdtempSync(path.join(suite, '中文 project '));
const write = (p, name, data) => { const file = path.join(p, name); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, data); };
const change = (p, name, files) => { for (const [file, data] of Object.entries(files)) write(p, `openspec/changes/${name}/${file}`, data); };
function sink() { let text = ''; return { write: chunk => { text += chunk; }, get text() { return text; } }; }
// A gate that only knows about missing receipts, so the preview path is deterministic.
const awaiting = () => ({ valid: false, reasons: ['design: Artifact record is missing'] });
async function run(p, argv, options = {}) {
  const out = sink(), err = sink();
  const code = await adoptMain(null, argv, { project: p, out, err, evaluate: awaiting, ...options });
  return { code, out: out.text, err: err.text };
}
test('prints an inferred policy without writing it', async () => {
  const p = project(); change(p, 'add-export', { 'design.md': '# D\n', 'tasks.md': '- [ ] T1\n' }); change(p, 'fix-doc', { 'design.md': '# D2\n', 'tasks.md': '- [x] T1\n' });
  fs.mkdirSync(path.join(p, 'openspec'), { recursive: true });
  const r = await run(p, []);
  assert.equal(r.code, 0);
  assert.match(r.out, /artifact: design/);
  assert.match(r.out, /rerun with --write/);
  assert.equal(fs.existsSync(path.join(p, 'openspec/ff-policy.json')), false);
});
test('--write stores a v2 policy and previews each change against it', async () => {
  const p = project(); fs.mkdirSync(path.join(p, 'openspec'), { recursive: true });
  change(p, 'add-export', { 'design.md': '# D\n\n## Task plan\n- T1: Ship the export; acceptance: it downloads.\n', 'tasks.md': '- [ ] T1\n' });
  const r = await run(p, ['--write']);
  assert.equal(r.code, 0);
  const policy = JSON.parse(fs.readFileSync(path.join(p, 'openspec/ff-policy.json'), 'utf8'));
  assert.equal(policy.version, 2);
  assert.deepEqual(policy.artifacts.map(a => a.id), ['design']);
  assert.deepEqual(policy.artifacts[0].progress, { plan: 'openspec/changes/{change}/design.md', tasks: 'openspec/changes/{change}/tasks.md' });
  assert.match(r.out, /add-export: awaiting receipt/);
});
test('an existing policy is never replaced without --force', async () => {
  const p = project(); fs.mkdirSync(path.join(p, 'openspec'), { recursive: true });
  write(p, 'openspec/ff-policy.json', '{"version":1,"artifacts":[]}\n');
  change(p, 'add-export', { 'design.md': '# D\n' });
  const refused = await run(p, ['--write']);
  assert.equal(refused.code, 1);
  assert.match(refused.err, /exists; review it, or pass --force/);
  assert.equal(fs.readFileSync(path.join(p, 'openspec/ff-policy.json'), 'utf8'), '{"version":1,"artifacts":[]}\n');
  const forced = await run(p, ['--write', '--force']);
  assert.equal(forced.code, 0);
  assert.equal(JSON.parse(fs.readFileSync(path.join(p, 'openspec/ff-policy.json'), 'utf8')).version, 2);
});
test('an artifact missing from one active change is skipped, not silently required', async () => {
  const p = project(); fs.mkdirSync(path.join(p, 'openspec'), { recursive: true });
  change(p, 'add-export', { 'design.md': '# D\n', 'plan.md': '# P\n', 'tasks.md': '- [ ] T1\n' });
  change(p, 'fix-doc', { 'design.md': '# D2\n' });
  const r = await run(p, ['--json']);
  const report = JSON.parse(r.out);
  assert.deepEqual(report.policy.artifacts.map(a => a.id), ['design']);
  assert.equal(report.skipped[0].id, 'plan');
  assert.match(report.skipped[0].reason, /missing in fix-doc/);
  assert.match(report.note, /no progress mapping/);
});
test('adopt refuses a project that was never initialized', async () => {
  const r = await run(project(), ['--write']);
  assert.equal(r.code, 1);
  assert.match(r.err, /run node .forgeflow\/ff-spec.mjs init first/);
});
test('the CLI wires adopt to the bundled evaluator', { skip: !built && 'run node tools/openspec/build.mjs first' }, () => {
  const p = project(); fs.mkdirSync(path.join(p, 'openspec'), { recursive: true });
  change(p, 'add-export', { 'design.md': '# D\n', 'tasks.md': '- [ ] T1\n' });
  const adopt = spawnSync(process.execPath, [path.join(home, 'ff-spec.mjs'), 'adopt', '--write'], { cwd: p, encoding: 'utf8' });
  assert.equal(adopt.status, 0, adopt.stderr);
  assert.match(adopt.stdout, /awaiting receipt/);
  const status = spawnSync(process.execPath, [path.join(home, 'ff-spec.mjs'), 'status'], { cwd: p, encoding: 'utf8' });
  assert.equal(status.status, 0, status.stderr);
  assert.match(status.stdout, /gates: CONFIGURED/);
  assert.match(status.stdout, /BLOCKED/);
});