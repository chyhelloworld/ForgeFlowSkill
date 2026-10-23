// Explicit integration driver; never part of the default unit-test glob.
// Downloads full-build dependencies only when this driver is deliberately run.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { doctor } from '../install.mjs';
import { loadState, hostBase, hostsOf } from '../state.mjs';
import { digest, sha } from '../files.mjs';
import { doctorMain } from '../runtime.mjs';

assert.equal(process.platform, 'win32', 'This driver provides native Windows evidence only');
const source = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const [baseline, output] = process.argv.slice(2).map(value => path.resolve(value));
assert.ok(baseline && output && output.includes(`${path.sep}_verification${path.sep}`));
assert.equal(fs.existsSync(output), false, 'Use a new owned evidence directory');
fs.mkdirSync(output, { recursive: true });
const project = path.join(output, '中文 shared full project'); fs.mkdirSync(project);
const runs = [];
// Explicit offline variant; default still exercises a fresh locked dependency build.
const full = ['--hosts', 'codex,claude', '--mode', 'full', ...(process.env.FF_REUSE_BUILD ? ['--reuse-build', process.env.FF_REUSE_BUILD] : ['--build'])];
const stateFile = () => path.join(project, '.forgeflow/install/state.json');
const bytes = () => fs.readFileSync(stateFile());
const skill = host => path.join(project, hostBase(host), 'ff-spec/SKILL.md');
function run(label, root, command, flags = [], expected = 0) {
  const result = spawnSync(process.execPath, [path.join(root, 'bin/ff-install.mjs'), command, '--project', project, ...flags], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  const record = { label, status: result.status, error: result.error?.message, stdout: result.stdout, stderr: result.stderr };
  runs.push(record); fs.writeFileSync(path.join(output, 'runs.json'), JSON.stringify(runs, null, 2) + '\n');
  assert.equal(result.status, expected, `${label}: ${result.stderr}`);
  return result;
}
function installed(label, entry, flags, expected = 0) {
  const result = spawnSync(process.execPath, [path.join(project, entry), ...flags], { cwd: project, encoding: 'utf8' });
  runs.push({ label, status: result.status, stdout: result.stdout, stderr: result.stderr });
  fs.writeFileSync(path.join(output, 'runs.json'), JSON.stringify(runs, null, 2) + '\n');
  assert.equal(result.status, expected, `${label}: ${result.stderr}`); return result;
}
run('actual-baseline-single', baseline, 'install', ['--host', 'codex', '--mode', 'skills-only']);
const old = loadState(project); assert.equal(old.schema, 1);
run('exact-package-single-to-dual-full', source, 'install', full);
const dual = loadState(project); assert.equal(dual.schema, 2); assert.deepEqual(hostsOf(dual), ['codex', 'claude']);
const manifestHash = sha(fs.readFileSync(path.join(source, 'MANIFEST.json')));
assert.equal(dual.sourceHash, manifestHash);
for (const host of ['codex', 'claude']) {
  assert.equal(fs.readdirSync(path.join(project, hostBase(host))).length, 18);
  assert.match(fs.readFileSync(skill(host), 'utf8'), new RegExp(manifestHash));
  assert.equal(JSON.parse(run(`package-doctor-${host}`, source, 'doctor', ['--host', host]).stdout).status, 'RUNTIME_READY');
  assert.equal(JSON.parse(installed(`installed-doctor-${host}`, '.forgeflow/install/doctor.mjs', ['--host', host]).stdout).status, 'RUNTIME_READY');
  assert.equal(doctor(project, host).status, 'RUNTIME_READY'); // Same source modules for coverage; actual built CLI.
}
assert.match(installed('actual-cli-version', '.forgeflow/ff-spec.mjs', ['--version']).stdout, /1\.14\.2-ff\.0\.9\.4-trial\.1/);
doctorMain(project, { version: dual.version, hash: dual.sourceHash }, ['--host', 'codex']);
assert.ok(!process.exitCode, 'Source doctor entry must accept the actual full install');
const stable = bytes();
assert.equal(JSON.parse(run('dual-full-reentry', source, 'install', full).stdout).status, 'UNCHANGED');
assert.deepEqual(bytes(), stable);
const claude = fs.readFileSync(skill('claude')); fs.appendFileSync(skill('claude'), '\nUSER EDIT\n');
assert.equal(doctor(project, 'codex').status, 'RUNTIME_READY');
assert.throws(() => doctor(project, 'claude'), /User modification/);
assert.throws(() => doctor(project), /User modification/);
run('edit-blocks-removal', source, 'remove-host', ['--host', 'claude'], 1);
assert.match(fs.readFileSync(skill('claude'), 'utf8'), /USER EDIT/); fs.writeFileSync(skill('claude'), claude);
const keep = Object.keys(dual.files).filter(name => !name.startsWith('.claude/skills/'));
const mtimes = Object.fromEntries(keep.map(name => [name, fs.statSync(path.join(project, name)).mtimeMs]));
const note = path.join(project, '.claude/skills/ff-spec/user-note.txt'); fs.writeFileSync(note, 'keep user data');
run('remove-claude-only', source, 'remove-host', ['--host', 'claude']);
for (const name of keep) {
  assert.equal(digest(path.join(project, name)), dual.files[name]);
  assert.equal(fs.statSync(path.join(project, name)).mtimeMs, mtimes[name]);
}
assert.equal(fs.existsSync(skill('claude')), false); assert.equal(fs.readFileSync(note, 'utf8'), 'keep user data');
assert.equal(doctor(project, 'codex').status, 'RUNTIME_READY');
run('removed-host-doctor-blocked', source, 'doctor', ['--host', 'claude'], 1);
run('rollback-removal-restores-both', source, 'rollback'); assert.deepEqual(loadState(project).files, dual.files);
run('full-to-skills-only', source, 'install', ['--hosts', 'codex,claude', '--mode', 'skills-only']);
for (const host of ['codex', 'claude']) {
  assert.match(run(`skills-only-doctor-${host}`, source, 'doctor', ['--host', host], 1).stderr, /skills-only/);
  assert.match(installed(`installed-skills-only-${host}`, '.forgeflow/install/doctor.mjs', ['--host', host], 1).stderr, /skills-only/);
}
run('skills-only-back-to-full', source, 'install', full);
assert.equal(loadState(project).release, dual.release);
assert.equal(doctor(project).status, 'RUNTIME_READY');
const final = loadState(project);
fs.writeFileSync(path.join(output, 'result.json'), JSON.stringify({ status: 'PASS', platform: process.platform, node: process.version,
  version: final.version, manifestHash, payloadHash: sha(fs.readFileSync(path.join(source, 'forgeflow-payload.tgz'))),
  baselineVersion: old.version, baselineHash: old.sourceHash, hosts: hostsOf(final), release: final.release, mode: final.mode,
  modelInvocations: 'NOT_RUN; file/CLI readiness only', project, cases: runs.map(({ label, status }) => ({ label, status })),
}, null, 2) + '\n');
console.log(JSON.stringify({ status: 'PASS', output, cases: runs.length, manifestHash }));
