import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { main } from '../../../installer.mjs';
import { install, removeHost } from '../install.mjs';
import { loadState, hostBase, hostRoots, hosts, pluginDir, pluginFiles } from '../state.mjs';
import { discovery, handshake } from '../runtime.mjs';

const source = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const suite = fs.mkdtempSync(path.join(process.env.FF_TEST_ROOT || os.tmpdir(), 'ff-dsh-host-'));
const project = () => fs.mkdtempSync(path.join(suite, '中文 project '));
const skill = (p, host) => path.join(p, hostBase(host), 'ff-spec/SKILL.md');
const setup = (host, mode = 'skills-only') => { const p = project(); install(p, source, { host, mode }); return p; };

test('dsh is a first-class host with its own discovery root', () => {
  assert.deepEqual(hosts, ['codex', 'claude', 'dsh']);
  assert.equal(hostBase('dsh'), '.dsh/skills');
  assert.equal(hostRoots.dsh, '.dsh/skills');
  assert.throws(() => hostBase('cursor'), /Unknown host/);
});
test('install writes the DSH collaboration block only for the DSH host', () => {
  const p = setup('dsh');
  assert.equal(fs.readdirSync(path.join(p, '.dsh/skills')).length, 21);
  const text = fs.readFileSync(skill(p, 'dsh'), 'utf8');
  assert.match(text, /node \.forgeflow\/ff-spec\.mjs/);
  assert.match(text, /## 宿主协作（DSH）/);
  assert.match(text, /subagent/);
  assert.match(text, /exit_plan_mode/);
  const codex = setup('codex');
  assert.doesNotMatch(fs.readFileSync(skill(codex, 'codex'), 'utf8'), /宿主协作（DSH）/);
  assert.match(fs.readFileSync(skill(codex, 'codex'), 'utf8'), /项目安装绑定/);
});
test('DSH install ships the native plugin and only DSH owns it', () => {
  const p = setup('dsh');
  for (const name of pluginFiles) {
    const installed = path.join(p, name);
    assert.ok(fs.existsSync(installed), name);
    assert.deepEqual(fs.readFileSync(installed), fs.readFileSync(path.join(source, 'dsh-plugin', path.basename(name))));
    assert.ok(name in loadState(p).files, name);
  }
  const codex = setup('codex');
  assert.equal(fs.existsSync(path.join(codex, pluginDir)), false);
  assert.ok(pluginFiles.every(name => !(name in loadState(codex).files)));
});
test('remove-host dsh takes the plugin files; removing codex keeps them', () => {
  const p = project();
  main(['install', '--project', p, '--hosts', 'codex,dsh', '--mode', 'skills-only']);
  assert.ok(pluginFiles.every(name => fs.existsSync(path.join(p, name))));
  removeHost(p, 'codex');
  assert.ok(pluginFiles.every(name => fs.existsSync(path.join(p, name))));
  install(p, source, { hosts: ['codex', 'dsh'], mode: 'skills-only' });
  removeHost(p, 'dsh');
  assert.ok(pluginFiles.every(name => !fs.existsSync(path.join(p, name))));
  assert.ok(pluginFiles.every(name => !(name in loadState(p).files)));
});
test('doctor accepts --host dsh and reports skills-only instead of an unknown host', () => {
  const p = setup('dsh');
  const result = spawnSync(process.execPath, [path.join(p, '.forgeflow/install/doctor.mjs'), '--host', 'dsh'], { cwd: p, encoding: 'utf8' });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /BLOCKED: skills-only/);
  assert.doesNotMatch(result.stderr, /Unknown host/);
});
test('dsh state stays single-host and cannot be removed while it is the only host', () => {
  const p = setup('dsh');
  const state = loadState(p);
  assert.deepEqual(state.hosts ?? [state.host], ['dsh']);
  assert.ok(Object.keys(state.files).every(name => name.startsWith('.dsh/skills/') || name.startsWith('.forgeflow/')));
  assert.throws(() => removeHost(p, 'dsh'), /Cannot remove last host/);
});
test('discovery reports the DSH root, the Codex fallback root and their rank order', () => {
  const p = project();
  main(['install', '--project', p, '--hosts', 'codex,dsh', '--mode', 'skills-only']);
  const report = discovery(p, 'dsh');
  assert.equal(report.root, '.dsh/skills');
  assert.equal(report.skills, 21);
  assert.equal(report.others[0].host, 'codex');
  assert.equal(report.others[0].skills, 21);
  assert.match(report.note, /100/);
  assert.match(report.note, /200/);
  assert.equal(discovery(p, 'codex').note, undefined);
});
test('handshake names the stale side', () => {
  assert.equal(handshake('0.9.7-dsh.1', '0.9.7-dsh.1', '1.14.2-ff.0.9.4-trial.1').verdict, 'MATCH');
  assert.equal(handshake('0.9.7-dsh.1', '0.9.6-derivation.4', '1.14.2-ff.0.9.4-trial.1').verdict, 'DRIFT');
  assert.equal(handshake('0.9.7-dsh.1', null, null).verdict, 'UNKNOWN');
  const stale = handshake('0.9.7-dsh.1', '0.9.7-dsh.1', '1.14.2-ff.0.9.4-trial.1');
  assert.equal(stale.adapterPin, '0.9.4-trial.1');
  assert.match(stale.note, /重建/);
  assert.equal(handshake('0.9.7-dsh.1', '0.9.7-dsh.1', '1.14.2-ff.0.9.7-dsh.1').note, undefined);
});
