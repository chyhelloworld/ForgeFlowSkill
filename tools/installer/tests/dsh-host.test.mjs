import { createFixtureDirectory } from '../testing/workspace.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { main } from '../../../installer.mjs';
import { install, removeHost } from '../install.mjs';
import { loadState, hostBase, hostRoots, hosts, pluginDir, pluginFiles, rsiFile, reviewFile } from '../state.mjs';
import { discovery, handshake } from '../runtime.mjs';

const source = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const suite = createFixtureDirectory('ff-dsh-host-');
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
  const manifest = JSON.parse(fs.readFileSync(path.join(p, pluginDir, 'package.json'), 'utf8'));
  assert.equal(manifest.exports['./client'], './client.js');
  assert.equal(manifest.dsh.client.platform, 'web');
  for (const name of ['client.js', 'generate-board.mjs']) assert.ok(fs.existsSync(path.join(p, pluginDir, name)), name);
  const codex = setup('codex');
  assert.equal(fs.existsSync(path.join(codex, pluginDir)), false);
  assert.ok(pluginFiles.every(name => !(name in loadState(codex).files)));
});
test('reinstall repairs a plugin inventory that predates client and generator', () => {
  // Node 24's Windows rmSync can silently leave Unicode paths behind, so this
  // repair test uses an ASCII project name; Unicode project paths stay covered above.
  const p = fs.mkdtempSync(path.join(suite, 'upgrade-'));
  install(p, source, { host: 'dsh', mode: 'skills-only' });
  const statePath = path.join(p, '.forgeflow/install/state.json');
  const state = loadState(p);
  const added = ['.forgeflow/dsh-plugin/client.js', '.forgeflow/dsh-plugin/generate-board.mjs'];
  for (const name of added) {
    delete state.files[name];
    fs.rmSync(path.join(p, name));
  }
  // An install that predates these files was made from an older payload, so its
  // source hash differs; install then runs a full commit instead of UNCHANGED.
  state.sourceHash = '0'.repeat(64);
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
  const result = install(p, source, { host: 'dsh', mode: 'skills-only' });
  assert.equal(result.status, 'INSTALLED_SKILLS_ONLY_GATES_BLOCKED');
  const next = loadState(p);
  for (const name of added) {
    assert.ok(fs.existsSync(path.join(p, name)), name);
    assert.ok(name in next.files, name);
  }
});

test('install ships the host-independent ff-rsi tool and keeps it when a host is removed', () => {
  const p = setup('codex');
  assert.ok(fs.existsSync(path.join(p, rsiFile)), rsiFile);
  assert.ok(rsiFile in loadState(p).files);
  assert.deepEqual(fs.readFileSync(path.join(p, rsiFile)), fs.readFileSync(path.join(source, 'tools/rsi/ff-rsi.mjs')));
  const result = spawnSync(process.execPath, [path.join(p, rsiFile), 'status', '--dir', path.join(p, 'missing-run'), '--json'], { cwd: p, encoding: 'utf8' });
  assert.equal(result.status, 0);
  assert.equal(JSON.parse(result.stdout).state, 'EMPTY');
  const both = project();
  main(['install', '--project', both, '--hosts', 'codex,dsh', '--mode', 'skills-only']);
  removeHost(both, 'codex');
  assert.ok(fs.existsSync(path.join(both, rsiFile)));
  assert.ok(rsiFile in loadState(both).files);
});
test('install ships the host-independent ff-reviewer runner and keeps it when a host is removed', () => {
  const p = setup('codex');
  assert.ok(fs.existsSync(path.join(p, reviewFile)), reviewFile);
  assert.ok(reviewFile in loadState(p).files);
  assert.deepEqual(fs.readFileSync(path.join(p, reviewFile)), fs.readFileSync(path.join(source, 'tools/review/ff-reviewer.mjs')));
  const result = spawnSync(process.execPath, [path.join(p, reviewFile), 'version'], { cwd: p, encoding: 'utf8' });
  assert.equal(result.status, 0);
  assert.match(result.stdout, /ff-reviewer 0\.9\./);
  const both = project();
  main(['install', '--project', both, '--hosts', 'codex,dsh', '--mode', 'skills-only']);
  removeHost(both, 'codex');
  assert.ok(fs.existsSync(path.join(both, reviewFile)));
  assert.ok(reviewFile in loadState(both).files);
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
