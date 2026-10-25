import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { main, parse } from '../../../installer.mjs';
import { install, removeHost } from '../install.mjs';
import { loadState, hostsOf, hostBase } from '../state.mjs';
import { digest, json, sha } from '../files.mjs';
import { doctorMain } from '../runtime.mjs';

const source = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const suite = fs.mkdtempSync(path.join(process.env.FF_TEST_ROOT || os.tmpdir(), 'ff-dual-host-'));
const project = () => fs.mkdtempSync(path.join(suite, '中文 project '));
const stateFile = p => path.join(p, '.forgeflow/install/state.json');
const pendingFile = p => path.join(p, '.forgeflow/install/pending.json');
const args = ['--hosts', 'codex,claude', '--mode', 'skills-only'];
const invoke = (p, rest = args) => main(['install', '--project', p, ...rest]);
const single = p => invoke(p, ['--host', 'codex', '--mode', 'skills-only']);
const file = (p, host) => path.join(p, hostBase(host), 'ff-spec/SKILL.md');
function assertBytes(p, state) {
  assert.deepEqual(loadState(p).files, state.files);
  for (const [name, hash] of Object.entries(state.files)) assert.equal(digest(path.join(p, name)), hash, name);
}
function newer() {
  const candidate = project();
  fs.cpSync(source, candidate, { recursive: true, filter: name => path.basename(name) !== '.git' });
  const manifest = JSON.parse(fs.readFileSync(path.join(candidate, 'MANIFEST.json')));
  manifest.version = '0.9.3-dual-host.2-test';
  fs.appendFileSync(path.join(candidate, 'skills/ff-spec/SKILL.md'), '\nNew fixture revision.\n');
  manifest.files['skills/ff-spec/SKILL.md'] = sha(fs.readFileSync(path.join(candidate, 'skills/ff-spec/SKILL.md')));
  json(path.join(candidate, 'MANIFEST.json'), manifest);
  return candidate;
}
function interrupt(p, point = 'files', command = 'install') {
  const code = `
    import fs from 'node:fs';
    import { main } from ${JSON.stringify(pathToFileURL(path.join(source, 'installer.mjs')).href)};
    const rename = fs.renameSync;
    const unlink = fs.unlinkSync;
    fs.unlinkSync = target => {
      const result = unlink(target);
      if (${JSON.stringify(point)} === 'files' && ${JSON.stringify(command)} === 'remove-host' && target === ${JSON.stringify(file(p, 'claude'))}) process.exit(73);
      return result;
    };
    fs.renameSync = (a, b) => {
      const result = rename(a, b);
      if (${JSON.stringify(point)} === 'state' ? b === ${JSON.stringify(stateFile(p))} : b === ${JSON.stringify(file(p, 'claude'))}) process.exit(73);
      return result;
    };
    main(${JSON.stringify(command === 'install' ? ['install', '--project', p, ...args] : ['remove-host', '--project', p, '--host', 'claude'])});
  `;
  const result = spawnSync(process.execPath, ['--input-type=module', '--eval', code], { encoding: 'utf8' });
  assert.equal(result.status, 73, result.stderr);
  assert.ok(fs.existsSync(pendingFile(p)));
  // spawnSync has reaped this owned child; only its empty lock is removed.
  const lock = path.join(p, '.forgeflow/install/lock');
  assert.deepEqual(fs.readdirSync(lock), []);
  fs.rmdirSync(lock);
}

test('explicit dual install and reentry share one release and preserve exact state', () => {
  const p = project();
  assert.equal(invoke(p).status, 'INSTALLED_SKILLS_ONLY_GATES_BLOCKED');
  const state = loadState(p), bytes = fs.readFileSync(stateFile(p));
  assert.equal(state.schema, 2); assert.deepEqual(hostsOf(state), ['codex', 'claude']);
  assert.equal('host' in state, false);
  for (const host of hostsOf(state)) {
    assert.equal(fs.readdirSync(path.join(p, hostBase(host))).length, 19);
    assert.match(fs.readFileSync(file(p, host), 'utf8'), new RegExp(`doctor.mjs --host ${host}`));
    assert.match(fs.readFileSync(file(p, host), 'utf8'), new RegExp(state.sourceHash));
    assert.throws(() => main(['doctor', '--project', p, '--host', host]), /skills-only/);
  }
  assert.equal(invoke(p, ['--hosts', 'claude,codex', '--mode', 'skills-only']).status, 'UNCHANGED');
  assert.deepEqual(fs.readFileSync(stateFile(p)), bytes);
  assert.equal(fs.readdirSync(path.join(p, '.forgeflow/install/releases')).length, 1);
  assert.throws(() => single(p), /Dual-host/); assertBytes(p, state);
});

test('schema 1 migrates to dual, rollback restores old state and schema 2 re-add works', () => {
  const p = project(); single(p); const old = loadState(p);
  assert.equal(old.schema, 1); invoke(p);
  main(['rollback', '--project', p]); assert.equal(loadState(p).schema, 1); assertBytes(p, old);
  invoke(p); main(['remove-host', '--project', p, '--host', 'claude']);
  assert.equal(loadState(p).schema, 2); assert.deepEqual(hostsOf(loadState(p)), ['codex']);
  const bytes = fs.readFileSync(stateFile(p));
  assert.equal(single(p).status, 'UNCHANGED'); assert.deepEqual(fs.readFileSync(stateFile(p)), bytes);
  invoke(p); assert.deepEqual(hostsOf(loadState(p)), ['codex', 'claude']);
  const beforeUpgrade = loadState(p);
  install(p, newer(), { hosts: ['codex', 'claude'], mode: 'skills-only' });
  assert.equal(loadState(p).version, '0.9.3-dual-host.2-test');
  for (const host of ['codex', 'claude']) assert.match(fs.readFileSync(file(p, host), 'utf8'), /New fixture revision/);
  main(['rollback', '--project', p]); assertBytes(p, beforeUpgrade);
  assert.equal(loadState(p).version, beforeUpgrade.version); assert.equal(loadState(p).sourceHash, beforeUpgrade.sourceHash);
});

test('remove one host preserves other bytes/mtime, user extras and shared runtime; rollback restores both', () => {
  for (const host of ['codex', 'claude']) {
    const p = project(); invoke(p); const before = loadState(p);
    const keep = host === 'codex' ? 'claude' : 'codex';
    const retained = Object.keys(before.files).filter(name => !name.startsWith(`${hostBase(host)}/`));
    const timestamps = Object.fromEntries(retained.map(name => [name, fs.statSync(path.join(p, name)).mtimeMs]));
    const note = path.join(p, hostBase(host), 'ff-spec/user-note.txt'); fs.writeFileSync(note, 'mine');
    assert.equal(main(['remove-host', '--project', p, '--host', host]).status, 'HOST_REMOVED');
    assert.deepEqual(hostsOf(loadState(p)), [keep]); assert.equal(fs.existsSync(file(p, host)), false);
    for (const name of retained) {
      assert.equal(digest(path.join(p, name)), before.files[name]);
      assert.equal(fs.statSync(path.join(p, name)).mtimeMs, timestamps[name]);
    }
    assert.equal(fs.readFileSync(note, 'utf8'), 'mine');
    assert.equal(removeHost(p, host).status, 'UNCHANGED');
    assert.throws(() => removeHost(p, keep), /last host/);
    assert.throws(() => main(['doctor', '--project', p, '--host', host]), /not installed/);
    main(['rollback', '--project', p]); assertBytes(p, before);
    assert.deepEqual(hostsOf(loadState(p)), ['codex', 'claude']);
  }
});

test('new host conflicts and edits in either host block mutations without overwriting', () => {
  const p = project(); single(p); const before = fs.readFileSync(stateFile(p));
  const conflict = file(p, 'claude'); fs.mkdirSync(path.dirname(conflict), { recursive: true }); fs.writeFileSync(conflict, 'mine');
  assert.throws(() => invoke(p), /Unmanaged conflict/); assert.equal(fs.readFileSync(conflict, 'utf8'), 'mine');
  assert.deepEqual(fs.readFileSync(stateFile(p)), before);
  for (const host of ['codex', 'claude']) {
    const q = project(); invoke(q); fs.appendFileSync(file(q, host), 'my edit');
    const bytes = fs.readFileSync(stateFile(q));
    for (const action of [() => invoke(q), () => removeHost(q, 'claude'), () => main(['rollback', '--project', q])]) assert.throws(action, /User modification/);
    assert.deepEqual(fs.readFileSync(stateFile(q)), bytes); assert.match(fs.readFileSync(file(q, host), 'utf8'), /my edit$/);
  }
});

test('current runtime tampering blocks upgrade, remove and rollback', () => {
  const p = project(); single(p); invoke(p); const state = loadState(p);
  fs.appendFileSync(path.join(p, '.forgeflow/install', state.release, 'tools/openspec/ff-spec.mjs'), 'my change');
  for (const action of [() => install(p, newer(), { hosts: ['codex', 'claude'], mode: 'skills-only' }), () => removeHost(p, 'claude'), () => main(['rollback', '--project', p])]) assert.throws(action, /Release was modified/);
  assert.deepEqual(loadState(p), state);
});

test('write and state failures restore all old bytes and remove only attempted new entries', () => {
  for (const point of ['host', 'state']) {
    const p = project(); single(p); const before = loadState(p), bytes = fs.readFileSync(stateFile(p));
    const rename = fs.renameSync;
    fs.renameSync = (a, b) => {
      if (b === (point === 'host' ? file(p, 'claude') : stateFile(p))) throw new Error('injected write failure');
      return rename(a, b);
    };
    try { assert.throws(() => invoke(p), /injected write failure/); } finally { fs.renameSync = rename; }
    assertBytes(p, before); assert.deepEqual(fs.readFileSync(stateFile(p)), bytes);
    assert.equal(fs.existsSync(file(p, 'claude')), false); assert.equal(fs.existsSync(pendingFile(p)), false);
  }
});

test('actual child exit leaves pending; recovery conflicts preserve diagnostics until repaired', () => {
  const p = project(); single(p); const before = loadState(p), bytes = fs.readFileSync(stateFile(p));
  interrupt(p);
  assert.throws(() => main(['doctor', '--project', p]), /pending/);
  const installed = spawnSync(process.execPath, [path.join(p, '.forgeflow/install/doctor.mjs'), '--host', 'codex'], { encoding: 'utf8' });
  assert.equal(installed.status, 1); assert.match(installed.stderr, /pending/);
  const interruptedBytes = fs.readFileSync(file(p, 'claude')); fs.appendFileSync(file(p, 'claude'), 'later user edit');
  assert.throws(() => main(['recover', '--project', p]), /Recovery conflict/);
  assert.ok(fs.existsSync(pendingFile(p))); assert.match(fs.readFileSync(file(p, 'claude'), 'utf8'), /later user edit$/);
  fs.writeFileSync(file(p, 'claude'), interruptedBytes);
  assert.equal(main(['recover', '--project', p]).status, 'RECOVERED');
  assertBytes(p, before); assert.deepEqual(fs.readFileSync(stateFile(p)), bytes); assert.equal(fs.existsSync(file(p, 'claude')), false);
});

test('exit after state commit verifies COMMITTED and refuses altered committed state or files', () => {
  const p = project(); single(p); interrupt(p, 'state'); const committed = loadState(p), bytes = fs.readFileSync(stateFile(p));
  json(stateFile(p), { ...committed, transaction: '00000000-0000-0000-0000-000000000000' });
  const alteredBytes = fs.readFileSync(stateFile(p));
  assert.throws(() => main(['recover', '--project', p]), /Recovery state conflict/);
  assert.deepEqual(fs.readFileSync(stateFile(p)), alteredBytes); assert.equal(fs.existsSync(file(p, 'claude')), true);
  fs.writeFileSync(stateFile(p), bytes);
  json(stateFile(p), { ...committed, version: 'forged' });
  assert.throws(() => main(['recover', '--project', p]), /state hash mismatch/); assert.ok(fs.existsSync(pendingFile(p)));
  fs.writeFileSync(stateFile(p), bytes); const skill = fs.readFileSync(file(p, 'claude')); fs.appendFileSync(file(p, 'claude'), 'user edit');
  assert.throws(() => main(['recover', '--project', p]), /Recovery conflict/); assert.ok(fs.existsSync(pendingFile(p)));
  fs.writeFileSync(file(p, 'claude'), skill);
  assert.equal(main(['recover', '--project', p]).status, 'COMMITTED'); assertBytes(p, committed);
  assert.equal(main(['recover', '--project', p]).status, 'NO_PENDING_TRANSACTION');
});

test('actual removal child exits recover before deletion commit and confirm after state commit', () => {
  for (const point of ['files', 'state']) {
    const p = project(); invoke(p); const before = loadState(p);
    interrupt(p, point, 'remove-host');
    assert.equal(main(['recover', '--project', p]).status, point === 'state' ? 'COMMITTED' : 'RECOVERED');
    if (point === 'files') assertBytes(p, before);
    else {
      assert.deepEqual(hostsOf(loadState(p)), ['codex']); assert.equal(fs.existsSync(file(p, 'claude')), false);
      main(['rollback', '--project', p]); assertBytes(p, before);
    }
  }
});

test('transient pending cleanup failure confirms committed state instead of claiming rollback', () => {
  const p = project(); single(p); const unlink = fs.unlinkSync; let failed = false;
  fs.unlinkSync = target => {
    if (target === pendingFile(p) && !failed) { failed = true; throw new Error('injected pending cleanup failure'); }
    return unlink(target);
  };
  try { assert.equal(invoke(p).status, 'INSTALLED_SKILLS_ONLY_GATES_BLOCKED'); } finally { fs.unlinkSync = unlink; }
  assert.equal(failed, true); assert.deepEqual(hostsOf(loadState(p)), ['codex', 'claude']); assert.equal(fs.existsSync(pendingFile(p)), false);
});

test('schema 2 rejects undeclared hosts, missing skill/helper entries and malformed host sets', () => {
  const p = project(); invoke(p); const state = loadState(p);
  const cases = [s => { s.hosts = ['codex']; }, s => { s.hosts.reverse(); }, s => { s.hosts = ['codex', 'codex']; }, s => { s.host = 'codex'; }, s => { delete s.files['.claude/skills/ff-spec/SKILL.md']; }, s => { delete s.files['.forgeflow/install/state.mjs']; }, s => { s.files = null; }];
  for (const mutate of cases) {
    const next = structuredClone(state); mutate(next); json(stateFile(p), next);
    assert.throws(() => loadState(p), /BLOCKED/);
  }
});

test('command grammar rejects ambiguous/destructive combinations before touching a project', () => {
  const base = ['install', '--project', 'not-an-existing-project'];
  for (const flags of [[], ['--hosts', 'codex'], ['--hosts', 'codex,codex'], ['--hosts', 'codex,unknown'], ['--hosts', 'codex,claude', '--host', 'codex'], ['--host', 'unknown'], ['--hosts', 'codex,claude', '--mode', 'other'], ['--hosts', 'codex,claude', '--mode', 'skills-only', '--build']]) assert.throws(() => parse([...base, ...flags]), /BLOCKED/);
  for (const command of ['doctor', 'remove-host', 'recover', 'rollback']) assert.throws(() => parse([command, '--project', 'x', '--hosts', 'codex,claude']), /Install flags/);
  assert.throws(() => parse(['remove-host', '--project', 'x']), /requires --host/);
  assert.throws(() => parse(['rollback', '--project', 'x', '--host', 'codex']), /applies only/);
});

test('installed doctor argument protocol and skills-only errors stay explicit', () => {
  const p = project(); assert.equal(single(p).host, 'codex'); const state = loadState(p);
  const previous = process.exitCode, error = console.error; const errors = [];
  console.error = message => errors.push(message);
  try {
    for (const [args, expected] of [[[], /skills-only/], [['--help'], /skills-only/], [['--host', 'codex'], /skills-only/], [['--other'], /Usage/], [['--host', 'other'], /Unknown host/]]) {
      process.exitCode = 0; doctorMain(p, { version: state.version, hash: state.sourceHash }, args);
      assert.equal(process.exitCode, 1); assert.match(errors.at(-1), expected);
    }
  } finally { console.error = error; process.exitCode = previous; }
});

test('older journals without state hashes remain recoverable with backup state verification', () => {
  for (const point of ['files', 'state']) {
    const p = project(); single(p); const before = loadState(p); interrupt(p, point);
    const journal = JSON.parse(fs.readFileSync(pendingFile(p))); delete journal.beforeStateHash; delete journal.nextStateHash;
    json(pendingFile(p), journal);
    assert.equal(main(['recover', '--project', p]).status, point === 'state' ? 'COMMITTED' : 'RECOVERED');
    if (point === 'files') assertBytes(p, before);
    else assert.deepEqual(hostsOf(loadState(p)), ['codex', 'claude']);
  }
});
