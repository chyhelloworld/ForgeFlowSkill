import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import childProcess from 'node:child_process';
import { syncBuiltinESMExports } from 'node:module';
import { fileURLToPath } from 'node:url';
import { createReleaseStage, install } from '../install.mjs';
import { inventory } from '../runtime.mjs';
import { loadState } from '../transaction.mjs';
import { json, regularFiles, sha } from '../files.mjs';

const source = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const suite = fs.mkdtempSync(path.join(process.env.FF_TEST_ROOT || os.tmpdir(), 'ff-windows-regression-'));
const nativePlatform = process.platform;
const directory = () => fs.mkdtempSync(path.join(suite, '中文 project '));
const bootstrapAt = stage => path.join(stage, 'tools/openspec/.bootstrap');
const put = (name, value = 'keep') => { fs.mkdirSync(path.dirname(name), { recursive: true }); fs.writeFileSync(name, value); };
const directoryLink = (target, name) => fs.symlinkSync(target, name, nativePlatform === 'win32' ? 'junction' : 'dir');
function freshStage() {
  const project = directory();
  const stage = createReleaseStage(project);
  fs.mkdirSync(path.join(stage.stage, 'tools/openspec'), { recursive: true });
  return { project, ...stage };
}

// These tests execute the platform branches; only execution on a Windows host proves native behavior.
test('staged bootstrap cleanup is Windows-only and leaves source, siblings, runtime and project data alone', () => {
  for (const platform of ['linux', 'darwin', 'win32']) {
    const fixture = freshStage();
    const sibling = createReleaseStage(fixture.project);
    const original = directory();
    const sentinels = [
      path.join(original, 'tools/openspec/.bootstrap/user-note'),
      path.join(fixture.project, '.bootstrap/user-note'),
      path.join(sibling.stage, 'tools/openspec/.bootstrap/user-note'),
      path.join(fixture.stage, 'tools/openspec/.build/runtime-file'),
    ];
    for (const sentinel of sentinels) put(sentinel);
    const cleanup = fixture.prepareBootstrapCleanup(platform);
    const generated = path.join(bootstrapAt(fixture.stage), 'generated-file');
    put(generated);
    cleanup();
    assert.equal(fs.existsSync(generated), platform !== 'win32');
    for (const sentinel of sentinels) assert.equal(fs.readFileSync(sentinel, 'utf8'), 'keep');
    cleanup(); // Missing generated cache is a safe, idempotent no-op.
  }
});

test('Windows cleanup cannot be prepared over a bootstrap copied from source', () => {
  const fixture = freshStage();
  const sentinel = path.join(bootstrapAt(fixture.stage), 'source-note');
  put(sentinel);
  assert.throws(() => fixture.prepareBootstrapCleanup('win32'), /Pre-existing bootstrap/);
  assert.equal(fs.readFileSync(sentinel, 'utf8'), 'keep');
});

test('cleanup refuses a replacement stage and cannot clean a moved release', () => {
  const fixture = freshStage();
  const cleanup = fixture.prepareBootstrapCleanup('win32');
  put(path.join(bootstrapAt(fixture.stage), 'generated'));
  const moved = `${fixture.stage}-moved`;
  fs.renameSync(fixture.stage, moved);
  put(path.join(bootstrapAt(fixture.stage), 'replacement-note'));
  assert.throws(cleanup, /ownership changed/);
  assert.equal(fs.readFileSync(path.join(bootstrapAt(fixture.stage), 'replacement-note'), 'utf8'), 'keep');
  assert.equal(fs.readFileSync(path.join(bootstrapAt(moved), 'generated'), 'utf8'), 'keep');
});

test('cleanup refuses symbolic links at the bootstrap or any stage ancestor', () => {
  for (const ancestor of ['', 'tools', 'tools/openspec', 'tools/openspec/.bootstrap']) {
    const fixture = freshStage();
    const cleanup = fixture.prepareBootstrapCleanup('win32');
    const outside = directory();
    put(path.join(outside, 'user-note'));
    const link = path.join(fixture.stage, ancestor);
    // Preserve the old fixture without depending on native recursive rm.
    if (fs.existsSync(link)) fs.renameSync(link, `${link}-before-link`);
    directoryLink(outside, link);
    assert.throws(cleanup, /Symlink/);
    assert.equal(fs.readFileSync(path.join(outside, 'user-note'), 'utf8'), 'keep');
  }
  const fixture = freshStage();
  const cleanup = fixture.prepareBootstrapCleanup('win32');
  put(bootstrapAt(fixture.stage), 'unexpected file');
  assert.throws(cleanup, /Expected generated bootstrap directory/);
  assert.equal(fs.readFileSync(bootstrapAt(fixture.stage), 'utf8'), 'unexpected file');
});

test('cleanup unlinks nested directory links without traversing external data', () => {
  const fixture = freshStage();
  const cleanup = fixture.prepareBootstrapCleanup('win32');
  const outside = directory();
  put(path.join(outside, 'user-note'));
  fs.mkdirSync(bootstrapAt(fixture.stage));
  directoryLink(outside, path.join(bootstrapAt(fixture.stage), 'external-cache-link'));
  directoryLink(path.join(outside, 'missing'), path.join(bootstrapAt(fixture.stage), 'dangling-link'));
  cleanup();
  assert.equal(fs.existsSync(bootstrapAt(fixture.stage)), false);
  assert.equal(fs.readFileSync(path.join(outside, 'user-note'), 'utf8'), 'keep');
});

test('cleanup reports deletion errors and retains remaining diagnostics', () => {
  const fixture = freshStage();
  const cleanup = fixture.prepareBootstrapCleanup('win32');
  const diagnostic = path.join(bootstrapAt(fixture.stage), 'diagnostic');
  put(diagnostic);
  const unlink = fs.unlinkSync;
  fs.unlinkSync = file => {
    if (file === diagnostic) throw Object.assign(new Error('deletion denied'), { code: 'EACCES' });
    return unlink(file);
  };
  try { assert.throws(cleanup, { code: 'EACCES' }); }
  finally { fs.unlinkSync = unlink; }
  assert.equal(fs.readFileSync(diagnostic, 'utf8'), 'keep');
});

test('cleanup rejects a silent no-op instead of reporting success', () => {
  const fixture = freshStage();
  const cleanup = fixture.prepareBootstrapCleanup('win32');
  const bootstrap = bootstrapAt(fixture.stage);
  put(path.join(bootstrap, 'generated'));
  const rmdir = fs.rmdirSync;
  fs.rmdirSync = file => file === bootstrap ? undefined : rmdir(file);
  try { assert.throws(cleanup, /Generated bootstrap cleanup incomplete/); }
  finally { fs.rmdirSync = rmdir; }
  assert.equal(fs.lstatSync(bootstrap).isDirectory(), true);
});

test('stage creation rejects a linked destination ancestor', () => {
  const project = directory();
  const outside = directory();
  directoryLink(outside, path.join(project, '.forgeflow'));
  assert.throws(() => createReleaseStage(project), /Symlink/);
  assert.deepEqual(fs.readdirSync(outside), []);
});

function smallSource() {
  const root = directory();
  for (const name of fs.readdirSync(path.join(source, 'skills'))) put(path.join(root, 'skills', name, 'SKILL.md'), '# Test skill\n');
  put(path.join(root, 'tools/openspec/upstream.json'), '{}\n');
  put(path.join(root, 'tools/openspec/build.mjs'), '// Mocked subprocess fixture\n');
  put(path.join(root, 'tools/openspec/ff-spec.mjs'), '// Mocked CLI fixture\n');
  put(path.join(root, 'tools/installer/runtime.mjs'), fs.readFileSync(path.join(source, 'tools/installer/runtime.mjs')));
  json(path.join(root, 'MANIFEST.json'), { version: '0.0.0-test', files: Object.fromEntries(regularFiles(root).map(name => [name, sha(fs.readFileSync(path.join(root, name)))])) });
  return root;
}
function withWindowsToolchain(onBuild, onProbe, action) {
  const platform = Object.getOwnPropertyDescriptor(process, 'platform');
  const spawn = childProcess.spawnSync;
  const copy = fs.cpSync;
  let copyCount = 0;
  Object.defineProperty(process, 'platform', { value: 'win32' });
  fs.cpSync = (from, to, options) => {
    assert.equal(typeof options.filter, 'function', 'Windows directory copy must use a filter callback');
    assert.equal(options.filter(from, to), true, 'callback must not exclude source content');
    copyCount++;
    return copy(from, to, options);
  };
  childProcess.spawnSync = (command, args) => {
    if (args[0]?.endsWith(`${path.sep}build.mjs`)) return onBuild(path.dirname(args[0]));
    if (args[0]?.endsWith(`${path.sep}ff-spec.mjs`)) return onProbe(path.dirname(args[0]));
    return { status: 0, stdout: 'test version', stderr: '' }; // npm/git/tar prerequisite probes only.
  };
  syncBuiltinESMExports();
  try { const result = action(); assert.equal(copyCount, 1); return result; }
  finally { Object.defineProperty(process, 'platform', platform); childProcess.spawnSync = spawn; fs.cpSync = copy; syncBuiltinESMExports(); }
}

test('mocked Windows full install cleans only after successful build and probe, before inventory', () => {
  const project = directory();
  const input = smallSource();
  const outside = directory();
  put(path.join(outside, 'user-note'));
  withWindowsToolchain(home => {
    assert.ok(fs.statSync(path.join(home, 'upstream.json')).isFile());
    put(path.join(home, '.build/runtime-file'));
    put(path.join(home, '.bootstrap/generated-file'));
    directoryLink(outside, path.join(home, '.bootstrap/external-cache-link'));
    return { status: 0 };
  }, home => {
    assert.ok(fs.existsSync(path.join(home, '.bootstrap/generated-file')), 'cleanup must follow CLI verification');
    return { status: 0 };
  }, () => assert.equal(install(project, input, { host: 'codex', mode: 'full', build: true }).status, 'INSTALLED'));
  const state = loadState(project);
  const release = path.join(project, '.forgeflow/install', state.release);
  assert.ok(fs.statSync(path.join(release, 'tools/openspec/upstream.json')).isFile());
  assert.equal(fs.existsSync(bootstrapAt(release)), false);
  assert.equal(fs.readFileSync(path.join(release, 'tools/openspec/.build/runtime-file'), 'utf8'), 'keep');
  assert.equal(Object.keys(state.releaseInventory).some(name => name.includes('/.bootstrap/')), false);
  assert.equal(fs.readFileSync(path.join(outside, 'user-note'), 'utf8'), 'keep');
  assert.equal(fs.existsSync(path.join(input, 'tools/openspec/.bootstrap')), false);
});

test('mocked Windows install preserves pre-existing source bootstrap and rejects before any build', () => {
  const project = directory();
  const input = smallSource();
  const sentinel = path.join(input, 'tools/openspec/.bootstrap/source-note');
  put(sentinel);
  const manifest = JSON.parse(fs.readFileSync(path.join(input, 'MANIFEST.json'), 'utf8'));
  manifest.files['tools/openspec/.bootstrap/source-note'] = sha(fs.readFileSync(sentinel));
  json(path.join(input, 'MANIFEST.json'), manifest);
  withWindowsToolchain(() => assert.fail('pre-existing bootstrap must block before build'),
    () => assert.fail('pre-existing bootstrap must block before CLI probe'), () => {
      assert.throws(() => install(project, input, { host: 'codex', mode: 'full', build: true }), /Pre-existing bootstrap/);
    });
  assert.equal(fs.readFileSync(sentinel, 'utf8'), 'keep');
  const control = path.join(project, '.forgeflow/install');
  const stage = fs.readdirSync(control).find(name => name.startsWith('staging-'));
  assert.ok(stage);
  assert.equal(fs.readFileSync(path.join(control, stage, 'tools/openspec/.bootstrap/source-note'), 'utf8'), 'keep');
  assert.equal(loadState(project), null);
});

test('mocked Windows failed build or CLI probe retains stage diagnostics and no active installation', () => {
  for (const failure of ['build', 'probe']) {
    const project = directory();
    const input = smallSource();
    let stagedHome;
    withWindowsToolchain(home => {
      stagedHome = home;
      put(path.join(home, '.bootstrap/diagnostics'));
      return { status: failure === 'build' ? 1 : 0 };
    }, () => ({ status: failure === 'probe' ? 1 : 0, stderr: 'mock probe failure' }), () => {
      assert.throws(() => install(project, input, { host: 'codex', mode: 'full', build: true }), failure === 'build' ? /Build failed/ : /Built CLI failed/);
    });
    assert.equal(fs.readFileSync(path.join(stagedHome, '.bootstrap/diagnostics'), 'utf8'), 'keep');
    assert.equal(loadState(project), null);
  }
});

test('Windows cleanup does not relax strict absolute or escaping runtime link rejection', () => {
  for (const kind of ['absolute-internal', 'external']) {
    const project = directory();
    const outside = directory();
    put(path.join(outside, 'user-note'));
    withWindowsToolchain(home => {
      put(path.join(home, '.bootstrap/generated'));
      const runtime = path.join(home, '.build');
      fs.mkdirSync(path.join(runtime, 'internal'), { recursive: true });
      directoryLink(kind === 'absolute-internal' ? path.join(runtime, 'internal') : outside, path.join(runtime, 'link'));
      return { status: 0 };
    }, () => ({ status: 0 }), () => {
      assert.throws(() => install(project, smallSource(), { host: 'codex', mode: 'full', build: true }), /escaping runtime link/);
    });
    assert.equal(loadState(project), null);
    assert.equal(fs.readFileSync(path.join(outside, 'user-note'), 'utf8'), 'keep');
  }
});

test('runtime inventory still rejects relative escaping links and chained escapes', t => {
  const root = directory();
  const outside = directory();
  try { fs.symlinkSync(path.relative(root, outside), path.join(root, 'escape'), 'dir'); }
  catch (error) {
    if (nativePlatform === 'win32' && ['EPERM', 'EACCES'].includes(error.code)) {
      t.skip('Relative symlink creation denied; Windows Developer Mode or elevation is required. Junction checks run above.');
      return;
    }
    throw error;
  }
  assert.throws(() => inventory(root), /escaping runtime link/);
  fs.mkdirSync(path.join(root, 'probes'));
  fs.symlinkSync('../escape', path.join(root, 'probes/chain'), 'dir');
  assert.throws(() => inventory(root, 'probes'), /escaping runtime link chain/);
});

test('standalone builder preserves an existing bootstrap and adds hoisted only on Windows (mocked subprocesses)', () => {
  for (const platform of ['linux', 'darwin', 'win32']) {
    const fixture = directory();
    const home = path.join(fixture, 'tools/openspec');
    fs.cpSync(path.join(source, 'tools/openspec'), home, { recursive: true, ...(nativePlatform === 'win32' ? { filter: () => true } : {}) });
    assert.ok(fs.statSync(path.join(home, 'upstream.json')).isFile());
    put(path.join(home, '.bootstrap/user-note'));
    put(path.join(home, '.build/old-output'));
    const outside = path.join(fixture, 'outside-build');
    put(path.join(outside, 'user-note'));
    directoryLink(outside, path.join(home, '.build/external-link'));
    const trace = path.join(fixture, 'commands.json');
    const harness = `
      import fs from 'node:fs';
      import path from 'node:path';
      import childProcess from 'node:child_process';
      import { syncBuiltinESMExports } from 'node:module';
      import { pathToFileURL } from 'node:url';
      const home = ${JSON.stringify(home)};
      const commands = [];
      Object.defineProperty(process, 'platform', { value: ${JSON.stringify(platform)} });
      process.env.npm_execpath = path.join(home, 'fake-npm-cli.js');
      childProcess.spawnSync = (command, args, options) => {
        commands.push({ command, args, cwd: options.cwd });
        if (command === 'tar') {
          const build = path.join(home, '.build');
          for (const dir of ['src/core', 'bin', 'dist', 'schemas']) fs.mkdirSync(path.join(build, dir), { recursive: true });
          fs.writeFileSync(path.join(build, 'src/core/ff-validity.ts'), '// mock patched source');
          fs.writeFileSync(path.join(build, 'package.json'), '{}');
        }
        return { status: 0 };
      };
      syncBuiltinESMExports();
      process.argv = [process.execPath, path.join(home, 'build.mjs'), '--clean'];
      await import(pathToFileURL(path.join(home, 'build.mjs')).href);
      fs.writeFileSync(${JSON.stringify(trace)}, JSON.stringify(commands));
    `;
    const result = childProcess.spawnSync(process.execPath, ['--input-type=module', '--eval', harness], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(fs.readFileSync(path.join(home, '.bootstrap/user-note'), 'utf8'), 'keep');
    assert.equal(fs.existsSync(path.join(home, '.build/old-output')), false);
    assert.equal(fs.readFileSync(path.join(outside, 'user-note'), 'utf8'), 'keep');
    assert.ok(fs.existsSync(path.join(home, '.build/FF-BUILD.json')));
    const commands = JSON.parse(fs.readFileSync(trace, 'utf8'));
    const pnpm = commands.find(call => call.args[0]?.endsWith('pnpm.cjs'));
    assert.ok(pnpm, 'builder must invoke its pinned local pnpm');
    assert.equal(pnpm.args.includes('--node-linker=hoisted'), platform === 'win32');
    for (const flag of ['install', '--frozen-lockfile', '--ignore-scripts', '--store-dir']) assert.ok(pnpm.args.includes(flag));
    assert.equal(pnpm.cwd, path.join(home, '.build'));
  }
});
