import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createFixtureDirectory, createTestWorkspace, fixtureBase } from '../testing/workspace.mjs';
import { regularFiles } from '../files.mjs';
const suite = createFixtureDirectory('ff-resource-tests-');
const runner = fileURLToPath(new URL('../test-workspace.mjs', import.meta.url));

test('fixtures require an explicit existing absolute root and a single-component prefix', () => {
  assert.throws(() => fixtureBase(''), /explicit absolute/);
  assert.throws(() => fixtureBase('relative'), /explicit absolute/);
  assert.throws(() => fixtureBase(path.join(suite, 'missing')), /ENOENT/);
  const file = path.join(suite, 'not-directory'); fs.writeFileSync(file, 'user data');
  assert.throws(() => fixtureBase(file), /directory/);
  assert.throws(() => createFixtureDirectory('../escape', suite), /prefix/);
  assert.throws(() => createFixtureDirectory('..\\escape', suite), /prefix/);
});

test('preview is default, failure and explicit preservation keep all files; success removes only owned tree', () => {
  const user = path.join(suite, 'user-backup'); fs.writeFileSync(user, 'keep');
  const workspace = createTestWorkspace(suite);
  const fixture = createFixtureDirectory('中文 空格 ', workspace.directory);
  fs.mkdirSync(path.join(fixture, '备份 backup'));
  fs.writeFileSync(path.join(fixture, '备份 backup', 'file.txt'), 'generated fixture');
  assert.equal(workspace.cleanup().status, 'RETAINED');
  assert.equal(workspace.cleanup({ success: true }).status, 'PREVIEW');
  assert.equal(workspace.cleanup({ success: true, apply: true, preserve: true }).status, 'RETAINED');
  const keep = path.join(fixture, '.ff-preserve'); fs.writeFileSync(keep, 'important evidence');
  assert.equal(workspace.cleanup({ success: true, apply: true }).status, 'RETAINED');
  fs.unlinkSync(keep);
  assert.equal(workspace.cleanup({ success: true, apply: true }).status, 'REMOVED');
  assert.equal(fs.existsSync(workspace.directory), false);
  assert.equal(fs.readFileSync(user, 'utf8'), 'keep');
  assert.equal(workspace.cleanup({ success: true, apply: true }).status, 'ALREADY_REMOVED');
});

test('changed receipt or replaced directory refuses cleanup', () => {
  let workspace = createTestWorkspace(suite);
  const marker = path.join(workspace.directory, '.ff-test-owner.json');
  const original = fs.readFileSync(marker);
  fs.writeFileSync(marker, 'tampered');
  assert.throws(() => workspace.cleanup({ apply: true, success: true }), /receipt changed/);
  fs.writeFileSync(marker, original);
  workspace = createTestWorkspace(suite);
  const replacementReceipt = fs.readFileSync(path.join(workspace.directory, '.ff-test-owner.json'));
  fs.renameSync(workspace.directory, `${workspace.directory}-saved`);
  fs.mkdirSync(workspace.directory);
  fs.writeFileSync(path.join(workspace.directory, '.ff-test-owner.json'), replacementReceipt);
  assert.throws(() => workspace.cleanup({ apply: true, success: true }), /ownership changed/);
  assert.ok(fs.existsSync(`${workspace.directory}-saved`));
});

test('linked roots are refused and cleanup never follows a child link', t => {
  const outside = createFixtureDirectory('outside-', suite);
  fs.writeFileSync(path.join(outside, 'user.txt'), 'keep');
  const link = path.join(suite, 'linked-root');
  try { fs.symlinkSync(outside, link, process.platform === 'win32' ? 'junction' : 'dir'); }
  catch (error) { if (['EPERM', 'EACCES', 'ENOSYS'].includes(error.code)) { t.skip(`symlink unavailable: ${error.code}`); return; } throw error; }
  assert.throws(() => fixtureBase(link), /symlink/);
  const workspace = createTestWorkspace(suite);
  fs.symlinkSync(outside, path.join(workspace.directory, 'link'), process.platform === 'win32' ? 'junction' : 'dir');
  assert.equal(workspace.cleanup({ apply: true, success: true }).status, 'REMOVED');
  assert.equal(fs.readFileSync(path.join(outside, 'user.txt'), 'utf8'), 'keep');
});

test('runner only cleans successful current runs on explicit request, preserving prior runs and failures', () => {
  const base = createFixtureDirectory('runner-', suite);
  const pass = path.join(suite, 'pass.test.mjs'), fail = path.join(suite, 'fail.test.mjs');
  fs.writeFileSync(pass, "import test from 'node:test'; test('pass', () => {});\n");
  fs.writeFileSync(fail, "import test from 'node:test'; test('failure', () => { throw Error('intentional'); });\n");
  const run = (...args) => spawnSync(process.execPath, [runner, ...args], { encoding: 'utf8', env: { ...process.env, FF_TEST_ROOT: base } });
  const preview = run(pass); assert.equal(preview.status, 0, preview.stderr); assert.match(preview.stderr, /PREVIEW/);
  const previous = fs.readdirSync(base); assert.equal(previous.length, 1);
  const cleaned = run('--clean-success', pass); assert.equal(cleaned.status, 0, cleaned.stderr); assert.match(cleaned.stderr, /REMOVED/);
  assert.deepEqual(fs.readdirSync(base), previous);
  const failed = run('--clean-success', fail); assert.equal(failed.status, 1); assert.match(failed.stderr, /RETAINED/);
  assert.equal(fs.readdirSync(base).length, 2);
});

test('manifest enumeration excludes both Git worktree pointer files and Git directories', () => {
  const source = createFixtureDirectory('source-', suite);
  fs.writeFileSync(path.join(source, 'keep.txt'), 'payload');
  fs.writeFileSync(path.join(source, '.git'), 'gitdir: /private/worktree/path');
  assert.deepEqual(regularFiles(source), ['keep.txt']);
  fs.unlinkSync(path.join(source, '.git')); fs.mkdirSync(path.join(source, '.git'));
  fs.writeFileSync(path.join(source, '.git', 'config'), 'private');
  assert.deepEqual(regularFiles(source), ['keep.txt']);
  assert.deepEqual(regularFiles(source, '', name => name === '.git' || name === 'keep.txt'), []);
});

test('directory replacement during traversal is detected before deleting external children', t => {
  const workspace = createTestWorkspace(suite);
  const target = path.join(workspace.directory, 'child'); fs.mkdirSync(target);
  fs.writeFileSync(path.join(target, 'generated.txt'), 'fixture');
  const outside = createFixtureDirectory('external-race-', suite);
  const victim = path.join(outside, 'user.txt'); fs.writeFileSync(victim, 'must survive');
  const probe = path.join(suite, `probe-${path.basename(outside)}`);
  try { fs.symlinkSync(outside, probe, process.platform === 'win32' ? 'junction' : 'dir'); }
  catch (error) { if (['EPERM', 'EACCES', 'ENOSYS'].includes(error.code)) { t.skip(`symlink unavailable: ${error.code}`); return; } throw error; }
  fs.unlinkSync(probe);
  const original = fs.readdirSync;
  let visits = 0;
  fs.readdirSync = function (file, ...options) {
    if (file === target && ++visits === 2) {
      fs.renameSync(target, `${target}-saved`);
      fs.symlinkSync(outside, target, process.platform === 'win32' ? 'junction' : 'dir');
    }
    return original.call(this, file, ...options);
  };
  try { assert.throws(() => workspace.cleanup({ apply: true, success: true }), /ancestor identity changed/); }
  finally { fs.readdirSync = original; }
  assert.equal(fs.readFileSync(victim, 'utf8'), 'must survive');
  assert.equal(fs.readFileSync(path.join(`${target}-saved`, 'generated.txt'), 'utf8'), 'fixture');
});

test('permission or policy refusal is structured, leaves the tree, and never retries', () => {
  for (const code of ['EPERM', 'EACCES', 'POLICY']) {
    const workspace = createTestWorkspace(suite);
    const original = fs.unlinkSync;
    let calls = 0, caught;
    fs.unlinkSync = () => { calls++; const error = new Error(code === 'POLICY' ? 'blocked by policy' : 'permission denied'); error.code = code; throw error; };
    try {
      try { workspace.cleanup({ apply: true, success: true }); } catch (error) { caught = error; }
      assert.equal(caught?.cleanupResult.status, 'CLEANUP_BLOCKED');
      assert.equal(caught.cleanupResult.denied, true);
      assert.equal(caught.cleanupResult.deletedEntries, 0);
      assert.equal(caught.cleanupResult.remaining, 'EXISTS');
      assert.throws(() => workspace.cleanup({ apply: true, success: true }), error => error === caught);
      assert.equal(calls, 1, 'no implicit retry or alternate removal');
    } finally { fs.unlinkSync = original; }
    assert.ok(fs.existsSync(workspace.directory));
  }
});

test('partial deletion and uncertain operation never report complete removal', () => {
  for (const partial of [true, false]) {
    const workspace = createTestWorkspace(suite);
    fs.writeFileSync(path.join(workspace.directory, 'z-evidence.txt'), 'keep remaining evidence');
    const original = fs.unlinkSync;
    let calls = 0, caught;
    fs.unlinkSync = function (file) {
      calls++;
      if (partial && calls === 1) return original(file);
      // Simulate an operation that completed but whose response failed: not safe to retry blindly.
      if (!partial) original(file);
      const error = new Error(partial ? 'denied after one deletion' : 'operation result lost');
      error.code = partial ? 'EACCES' : 'EIO'; throw error;
    };
    try {
      try { workspace.cleanup({ apply: true, success: true }); } catch (error) { caught = error; }
      assert.equal(caught?.cleanupResult.status, partial ? 'CLEANUP_INCOMPLETE' : 'CLEANUP_UNKNOWN');
      assert.equal(caught.cleanupResult.deletedEntries, partial ? 1 : 0);
      assert.equal(caught.cleanupResult.operation, 'unlink');
      assert.equal(caught.cleanupResult.remaining, 'EXISTS');
      assert.match(caught.cleanupResult.nextStep, /Do not switch deletion commands/);
    } finally { fs.unlinkSync = original; }
    assert.equal(fs.readFileSync(path.join(workspace.directory, 'z-evidence.txt'), 'utf8'), 'keep remaining evidence');
  }
});
