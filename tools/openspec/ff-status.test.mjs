import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { statusOverview } from './ff-status.mjs';

const home = path.dirname(fileURLToPath(import.meta.url));
const suite = fs.mkdtempSync(path.join(process.env.FF_TEST_ROOT || os.tmpdir(), 'ff-status-'));
const project = () => fs.mkdtempSync(path.join(suite, '中文 project '));
const write = (p, name, data) => { const file = path.join(p, name); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, data); };
const policy = p => write(p, 'openspec/ff-policy.json', JSON.stringify({ version: 1, artifacts: [] }));
const change = (p, name, tasks) => write(p, `openspec/changes/${name}/tasks.md`, tasks);
function sink() { let text = ''; return { write: chunk => { text += chunk; }, get text() { return text; } }; }
const valid = () => ({ valid: true, artifacts: [{ id: 'design', state: 'valid' }] });
const invalid = () => ({ valid: false, artifacts: [{ id: 'design', state: 'invalid' }], reasons: ['design: Artifact record is missing'] });
async function run(p, argv, options = {}) {
  const out = sink(), err = sink();
  const gate = (root) => fs.existsSync(path.join(root, 'openspec/ff-policy.json')) ? valid() : undefined;
  const code = await statusOverview(null, argv, { project: p, out, err, evaluate: gate, ...options });
  return { code, out: out.text, err: err.text };
}

test('a project without openspec says so instead of implying the gates ran', async () => {
  const r = await run(project(), []);
  assert.equal(r.code, 0);
  assert.match(r.out, /openspec\/ not found/);
  assert.match(r.out, /init/);
});
test('openspec without a policy is DISABLED and lists untracked changes with task counts', async () => {
  const p = project(); change(p, 'add-login', '- [x] T1: form\n- [ ] T2: session\n');
  const r = await run(p, []);
  assert.equal(r.code, 0);
  assert.match(r.out, /gates: DISABLED — openspec\/ff-policy\.json missing/);
  assert.match(r.out, /add-login\s+—\s+1\/2\s+not tracked/);
});
test('a tracked but invalid change is BLOCKED and fails only under --strict', async () => {
  const p = project(); policy(p); change(p, 'add-export', '- [ ] T1');
  const plain = await run(p, [], { evaluate: invalid });
  assert.equal(plain.code, 0);
  assert.match(plain.out, /gates: CONFIGURED/);
  assert.match(plain.out, /BLOCKED/);
  assert.match(plain.out, /design: Artifact record is missing/);
  assert.equal((await run(p, ['--strict'], { evaluate: invalid })).code, 1);
});
test('a valid change passes --strict and names the artifact ratio', async () => {
  const p = project(); policy(p); change(p, 'add-export', '- [x] T1');
  const r = await run(p, ['--strict']);
  assert.equal(r.code, 0);
  assert.match(r.out, /add-export\s+1\/1\s+1\/1\s+valid/);
});
test('--json exposes blocked changes for other tools', async () => {
  const p = project(); policy(p); change(p, 'add-export', '- [ ] T1');
  const r = await run(p, ['--json'], { evaluate: invalid });
  const report = JSON.parse(r.out);
  assert.equal(report.configured, true);
  assert.deepEqual(report.blocked, ['add-export']);
  assert.equal(report.rows[0].tasks.total, 1);
});
test('unknown arguments print usage instead of guessing', async () => {
  const r = await run(project(), ['--everything']);
  assert.equal(r.code, 1);
  assert.match(r.err, /Usage: node \.forgeflow\/ff-spec\.mjs status \[--strict\] \[--json\]/);
});
test('status without a build refuses to invent a verdict', async () => {
  const out = sink(), err = sink();
  const code = await statusOverview(null, [], { project: project(), out, err });
  assert.equal(code, 1);
  assert.match(err.text, /requires the bundled build/);
});
const built = fs.existsSync(path.join(home, '.build/dist/core/ff-validity.js'));
test('the launcher routes bare status to the overview but leaves status --change to the CLI', { skip: !built && 'run node tools/openspec/build.mjs first' }, () => {
  const p = project(); change(p, 'add-login', '- [ ] T1');
  const overview = spawnSync(process.execPath, [path.join(home, 'ff-spec.mjs'), 'status'], { cwd: p, encoding: 'utf8' });
  assert.equal(overview.status, 0, overview.stderr);
  assert.match(overview.stdout, /ForgeFlow status/);
  const scoped = spawnSync(process.execPath, [path.join(home, 'ff-spec.mjs'), 'status', '--change', 'add-login'], { cwd: p, encoding: 'utf8' });
  assert.doesNotMatch(scoped.stdout, /ForgeFlow status/);
  const archive = spawnSync(process.execPath, [path.join(home, 'ff-spec.mjs'), 'archive', 'missing', '--yes'], { cwd: p, encoding: 'utf8' });
  assert.match(archive.stderr, /FF gates disabled/);
  assert.doesNotMatch(spawnSync(process.execPath, [path.join(home, 'ff-spec.mjs'), 'archive', 'missing', '--yes'], { cwd: p, encoding: 'utf8', env: { ...process.env, FF_ALLOW_UNGATED: '1' } }).stderr, /FF gates disabled/);
});
