import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { main, parse } from '../../../installer.mjs';
import { install, doctor, buildDependencies } from '../install.mjs';
import { verifySource } from '../source.mjs';
import { safe, checkedRoot, relative, digest, sha, json, regularFiles } from '../files.mjs';
import { loadState, recover, rollback, commit, preflight } from '../transaction.mjs';
import { inventory, environment, validateRuntime } from '../runtime.mjs';
const source = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const suite = fs.mkdtempSync(path.join(process.env.FF_TEST_ROOT || os.tmpdir(), 'ff-installer-tests-'));
const project = () => fs.mkdtempSync(path.join(suite, '中文 project '));
const options = { host: 'codex', mode: 'skills-only' };
const setup = (host = 'codex') => { const p = project(); install(p, source, { ...options, host }); return p; };
const cli = (p, script) => spawnSync(process.execPath, [path.join(p, script), '--help'], { cwd: p, encoding: 'utf8' });
function fixture(version = '0.6.0-experimental.7') {
  const p = project(); fs.cpSync(source, p, { recursive: true, ...(process.platform === 'win32' ? { filter: () => true } : {}) });
  assert.ok(fs.existsSync(path.join(p, 'tools/openspec/upstream.json')), 'fixture copy must include upstream.json in a Chinese path');
  const manifest = JSON.parse(fs.readFileSync(path.join(p, 'MANIFEST.json')));
  manifest.version = version;
  fs.appendFileSync(path.join(p, 'skills/ff-spec/SKILL.md'), '\nfixture version change\n');
  manifest.files['skills/ff-spec/SKILL.md'] = sha(fs.readFileSync(path.join(p, 'skills/ff-spec/SKILL.md')));
  json(path.join(p, 'MANIFEST.json'), manifest); return p;
}
test('cold install: Chinese/space path, 18 skills, binding, honest blocked runtime', () => {
  const p = setup(); const state = loadState(p);
  assert.equal(fs.readdirSync(path.join(p, '.agents/skills')).length, 18);
  assert.equal(state.mode, 'skills-only');
  const upstream = path.join(p, '.forgeflow/install', state.release, 'tools/openspec/upstream.json');
  assert.ok(fs.statSync(upstream).isFile(), 'runtime copy must include upstream.json in a Chinese path');
  assert.deepEqual(fs.readFileSync(upstream), fs.readFileSync(path.join(source, 'tools/openspec/upstream.json')));
  assert.match(fs.readFileSync(path.join(p, '.agents/skills/ff-spec/SKILL.md'), 'utf8'), /node \.forgeflow\/ff-spec.mjs/);
  for (const entry of ['.forgeflow/ff-spec.mjs', '.forgeflow/install/doctor.mjs']) {
    const result = cli(p, entry); assert.equal(result.status, 1); assert.match(result.stderr, /BLOCKED: skills-only/);
  }
  assert.throws(() => doctor(p), /skills-only/);
});
test('Claude install and same-version reentry leave exact state unchanged', () => {
  const p = setup('claude'); const before = fs.readFileSync(path.join(p, '.forgeflow/install/state.json'));
  assert.equal(install(p, source, { ...options, host: 'claude' }).status, 'UNCHANGED');
  assert.deepEqual(fs.readFileSync(path.join(p, '.forgeflow/install/state.json')), before);
  assert.equal(fs.readdirSync(path.join(p, '.claude/skills')).length, 18);
});
test('unmanaged conflict blocks without overwriting', () => {
  const p = project(); const file = path.join(p, '.agents/skills/ff-spec/SKILL.md');
  fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, 'mine');
  assert.throws(() => install(p, source, options), /Unmanaged conflict/); assert.equal(fs.readFileSync(file, 'utf8'), 'mine');
  assert.equal(loadState(p), null);
});
test('user edit prevents same-version reinstall and rollback', () => {
  const p = setup(); fs.appendFileSync(path.join(p, '.agents/skills/ff-spec/SKILL.md'), 'mine');
  assert.throws(() => install(p, source, options), /User modification/);
  assert.throws(() => rollback(p, loadState(p)), /User modification/);
});
test('upgrade and rollback preserve unrelated files and restore exact old payload', () => {
  const p = setup(); const before = loadState(p); const newer = fixture();
  fs.writeFileSync(path.join(p, '.agents/skills/ff-spec/user-note.txt'), 'mine');
  fs.mkdirSync(path.join(p, 'openspec/specs'), { recursive: true }); fs.writeFileSync(path.join(p, 'openspec/specs/user.md'), 'spec');
  install(p, newer, options); assert.equal(loadState(p).version, '0.6.0-experimental.7');
  rollback(p, loadState(p)); assert.deepEqual(loadState(p).files, before.files);
  assert.equal(fs.readFileSync(path.join(p, '.agents/skills/ff-spec/user-note.txt'), 'utf8'), 'mine');
  assert.equal(fs.readFileSync(path.join(p, 'openspec/specs/user.md'), 'utf8'), 'spec');
  assert.equal(install(p, newer, options).version, '0.6.0-experimental.7');
});
test('same source can switch project hosts with rollback and no orphan blockage', () => {
  const p = setup(); install(p, source, { ...options, host: 'claude' });
  assert.equal(loadState(p).host, 'claude'); rollback(p, loadState(p)); assert.equal(loadState(p).host, 'codex');
});
test('state commit failure restores previous state and bytes', () => {
  const p = setup(); const before = loadState(p); const newer = fixture();
  const original = fs.renameSync;
  fs.renameSync = (a, b) => { if (b === path.join(p, '.forgeflow/install/state.json')) throw new Error('injected state write failure'); return original(a, b); };
  try { assert.throws(() => install(p, newer, options), /injected/); } finally { fs.renameSync = original; }
  assert.deepEqual(loadState(p), before);
  for (const [name, hash] of Object.entries(before.files)) assert.equal(digest(path.join(p, name)), hash);
  assert.equal(recover(p).status, 'NO_PENDING_TRANSACTION');
});
test('pending recovery preserves user conflict; source and destination symlinks rejected', () => {
  const p = project(); const outside = project(); fs.symlinkSync(outside, path.join(p, '.agents'), process.platform === 'win32' ? 'junction' : 'dir');
  assert.throws(() => install(p, source, options), /Symlink path/);
  assert.throws(() => checkedRoot(path.join(p, '.agents')), /symlink/);
  const src = fixture(); fs.symlinkSync(outside, path.join(src, 'skills/ff-spec/extra'), process.platform === 'win32' ? 'junction' : 'dir');
  assert.throws(() => verifySource(src), /Unsupported source/);
});
test('tampered source, runtime, and unsafe state are blocked', () => {
  const src = fixture(); fs.appendFileSync(path.join(src, 'skills/ff-spec/SKILL.md'), 'tamper');
  assert.throws(() => verifySource(src), /Source integrity/);
  const p = setup(); const state = loadState(p);
  fs.appendFileSync(path.join(p, '.forgeflow/install', state.release, 'tools/openspec/ff-spec.mjs'), 'tamper');
  assert.throws(() => install(p, source, options), /Release was modified/);
  state.files['../../escape'] = 'x'; json(path.join(p, '.forgeflow/install/state.json'), state);
  assert.throws(() => loadState(p), /Invalid managed/);
});
test('project move remains bound locally and official openspec never invoked', () => {
  const p = setup(); const moved = `${p} moved`; fs.renameSync(p, moved);
  const bin = path.join(moved, 'bin'); fs.mkdirSync(bin); const marker = path.join(moved, 'official-called');
  fs.writeFileSync(path.join(bin, 'openspec'), `#!/bin/sh\ntouch '${marker}'\n`, { mode: 0o755 });
  const result = spawnSync(process.execPath, [path.join(moved, '.forgeflow/ff-spec.mjs'), '--help'], { cwd: moved, encoding: 'utf8', env: { ...process.env, PATH: `${bin}${path.delimiter}${process.env.PATH}` } });
  assert.match(result.stderr, /BLOCKED: skills-only/); assert.equal(fs.existsSync(marker), false);
});
test('CLI arguments, full build consent, uninstalled doctor and lock checks', () => {
  assert.throws(() => parse([]), /Usage/); assert.throws(() => parse(['install', '--project', 'x']), /Explicit/);
  assert.throws(() => parse(['install', '--project', 'x', '--project', 'y']), /duplicate/);
  assert.throws(() => parse(['doctor', '--project', 'x', '--build']), /Install flags/);
  assert.throws(() => parse(['install', '--project', 'x', '--host', 'codex', '--mode', 'skills-only', '--build']), /conflicts/);
  const p = project(); assert.throws(() => install(p, source, { ...options, mode: 'full' }), /requires --build/);
  assert.throws(() => doctor(p), /Not installed/);
  fs.mkdirSync(path.join(p, '.forgeflow/install/lock'), { recursive: true });
  assert.throws(() => main(['recover', '--project', p]), /Lock exists/);
  assert.throws(() => main(['install', '--project', p, '--host', 'codex', '--mode', 'skills-only']), /locked/);
});
test('path and local-home isolation checks', () => {
  for (const name of ['../x', '/x', 'C:x', 'a\\b', 'a//b', 'a/./b']) assert.throws(() => relative(name), /Unsafe/);
  const p = project(); const env = environment(p); assert.ok(env.HOME.startsWith(p)); assert.equal(env.DO_NOT_TRACK, '1');
  fs.symlinkSync(project(), path.join(env.HOME, 'escape'), process.platform === 'win32' ? 'junction' : 'dir'); assert.throws(() => environment(p), /escaping runtime link/);
  assert.throws(() => inventory(env.HOME), /escaping runtime link/);
  const q = setup(); assert.throws(() => validateRuntime(q, { version: 'wrong', hash: 'wrong' }), /binding mismatch/);
});

test('rollback refuses a modified inactive runtime release', () => {
  const p = setup(); const old = loadState(p); install(p, fixture(), options);
  const active = loadState(p);
  fs.appendFileSync(path.join(p, '.forgeflow/install', old.release, 'tools/openspec/ff-spec.mjs'), 'user change');
  assert.throws(() => rollback(p, active), /Rollback release integrity mismatch/);
  assert.deepEqual(loadState(p), active);
});
test('Python skill caches are not install payload; installed health helper is executable', () => {
  const candidate = fixture();
  const cache = path.join(candidate, 'skills/ff-review/scripts/__pycache__');
  fs.mkdirSync(cache, { recursive: true }); fs.writeFileSync(path.join(cache, 'health.cpython-312.pyc'), 'generated-cache');
  const p = project(); install(p, candidate, options);
  assert.equal(fs.existsSync(path.join(p, '.agents/skills/ff-review/scripts/__pycache__')), false);
  const helper = path.join(p, '.agents/skills/ff-review/scripts/health.py');
  assert.ok(fs.existsSync(helper));
  const result = spawnSync('python', [helper, '--help'], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
});
