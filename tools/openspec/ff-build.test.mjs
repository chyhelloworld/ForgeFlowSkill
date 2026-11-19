import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { runtimeHashes, verifyReusableBuild } from './ff-build.mjs';

const home = path.dirname(fileURLToPath(import.meta.url));

const suite = fs.mkdtempSync(path.join(process.env.FF_TEST_ROOT || os.tmpdir(), 'ff-build-'));
process.on('exit', () => { try { fs.rmSync(suite, { recursive: true, force: true, maxRetries: 3 }); } catch (error) { console.error('temp cleanup failed: ' + error.message); } });

// A minimal build that satisfies verifyBuild: identity, pinned marker fields and runtime hashes.
function reusable(version) {
  const root = fs.mkdtempSync(path.join(suite, 'build-'));
  const pin = { commit: 'c', archiveSha256: 'a', patchSha256: 'p', adapter: '0.9.4-trial.1' };
  const build = path.join(root, '.build');
  for (const name of ['bin', 'dist', 'schemas', 'node_modules']) fs.mkdirSync(path.join(build, name), { recursive: true });
  fs.writeFileSync(path.join(root, 'upstream.json'), JSON.stringify(pin) + '\n');
  fs.writeFileSync(path.join(build, 'package.json'), JSON.stringify({ name: '@forgeflow/ff-spec', version, bin: { 'ff-spec': './bin/ff-spec.js' } }) + '\n');
  fs.writeFileSync(path.join(build, 'bin/ff-spec.js'), '// cli\n');
  fs.writeFileSync(path.join(build, 'dist/core.js'), '// core\n');
  const marker = { ...pin, sourceVersion: version, runtimeHashes: runtimeHashes(build), dependencyHashes: {}, platform: process.platform, arch: process.arch };
  fs.writeFileSync(path.join(build, 'FF-BUILD.json'), JSON.stringify(marker) + '\n');
  return root;
}

test('a reusable build is accepted only for the version being installed', () => {
  const root = reusable('0.9.7-dsh.1');
  assert.equal(verifyReusableBuild(root, '0.9.7-dsh.1'), path.join(root, '.build'));
  assert.throws(() => verifyReusableBuild(root, '9.9.9'), /FF version 0\.9\.7-dsh\.1 does not match 9\.9\.9/);
  // An unstamped build from before version derivation carries the frozen adapter pin and
  // cannot prove it matches the FF version being installed.
  const legacy = reusable('1.14.2-ff.0.9.4-trial.1');
  const markerPath = path.join(legacy, '.build/FF-BUILD.json');
  const marker = JSON.parse(fs.readFileSync(markerPath, 'utf8'));
  delete marker.sourceVersion;
  fs.writeFileSync(markerPath, JSON.stringify(marker) + '\n');
  assert.throws(() => verifyReusableBuild(legacy, '0.9.7-dsh.1'), /unstamped/);
});

test('a malformed --source-version fails before --clean touches .build', () => {
  const fixture = fs.mkdtempSync(path.join(suite, 'arg-'));
  for (const name of ['build.mjs', 'ff-build.mjs', 'upstream.json']) fs.copyFileSync(path.join(home, name), path.join(fixture, name));
  fs.mkdirSync(path.join(fixture, '.build'));
  fs.writeFileSync(path.join(fixture, '.build/keep'), 'x');
  for (const bad of [['--source-version'], ['--source-version=']]) {
    const result = spawnSync(process.execPath, ['build.mjs', '--clean', ...bad], { cwd: fixture, encoding: 'utf8' });
    assert.equal(result.status, 1, bad.join(' '));
    assert.match(result.stderr, /--source-version requires a value/);
    assert.equal(fs.existsSync(path.join(fixture, '.build/keep')), true, '--clean must not run before the stamp is validated');
  }
});
