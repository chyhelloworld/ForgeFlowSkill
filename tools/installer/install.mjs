import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { safe, fail, read, json } from './files.mjs';
import { verifySource, skillPayload } from './source.mjs';
import { inventory, runNode, validateRuntime, environment } from './runtime.mjs';
import { control, loadState, preflight, checkOwned, commit } from './transaction.mjs';
export function dependencies() {
  const [major, minor] = process.versions.node.split('.').map(Number);
  const node = major > 20 || (major === 20 && minor >= 19);
  return { node, version: process.version };
}
export function buildDependencies(project) {
  const env = environment(project);
  const result = { ...dependencies() };
  for (const tool of ['npm', 'git', 'tar']) {
    const npm = path.join(path.dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js');
    const windowsNpm = tool === 'npm' && process.platform === 'win32';
    const probe = spawnSync(windowsNpm ? process.execPath : tool, windowsNpm ? [npm, '--version'] : ['--version'], { env, shell: false, encoding: 'utf8' });
    result[tool] = !probe.error && probe.status === 0;
  }
  return result;
}
function bindings(source, pin, files) {
  const expected = JSON.stringify({ version: pin.version, hash: pin.hash });
  files['.forgeflow/ff-spec.mjs'] = Buffer.from(`import { fileURLToPath } from 'node:url';\nimport { launch } from './install/runtime.mjs';\nlaunch(fileURLToPath(new URL('../', import.meta.url)), ${expected}, process.argv.slice(2));\n`);
  files[`${control}/runtime.mjs`] = fs.readFileSync(path.join(source, 'tools/installer/runtime.mjs'));
  files[`${control}/doctor.mjs`] = Buffer.from(`import { fileURLToPath } from 'node:url';\nimport { launch } from './runtime.mjs';\nlaunch(fileURLToPath(new URL('../../', import.meta.url)), ${expected}, ['--help']);\n`);
  return files;
}
// A cleanup capability belongs only to this newly created stage, never a caller path.
export function createReleaseStage(project) {
  const name = `${control}/staging-${randomUUID()}`;
  const stage = safe(project, name);
  fs.mkdirSync(path.dirname(stage), { recursive: true });
  fs.mkdirSync(stage); // Exclusive creation: never adopt a pre-existing directory.
  const identity = fs.lstatSync(stage, { bigint: true });
  function bootstrapPath() {
    safe(project, name); // Recheck all stage ancestors before any removal.
    const current = fs.lstatSync(stage, { bigint: true });
    if (!current.isDirectory() || current.dev !== identity.dev || current.ino !== identity.ino) fail('Staging directory ownership changed');
    return safe(stage, 'tools/openspec/.bootstrap');
  }
  function prepareBootstrapCleanup(platform = process.platform) {
    if (platform !== 'win32') return () => {};
    // Called after source copy, before building. Pre-existing source data is not disposable.
    if (fs.existsSync(bootstrapPath())) fail('Pre-existing bootstrap in staged source; preserve it and inspect before rebuilding');
    return function cleanupBootstrap() {
      const bootstrap = bootstrapPath();
      if (!fs.existsSync(bootstrap)) return;
      if (!fs.lstatSync(bootstrap).isDirectory()) fail('Expected generated bootstrap directory');
      // Node 24's Windows recursive rm can silently leave Unicode paths behind.
      // This walker is private to the generated bootstrap of this owned stage.
      function removeGenerated(file) {
        const entry = fs.lstatSync(file);
        if (entry.isSymbolicLink() || entry.isFile()) fs.unlinkSync(file);
        else if (entry.isDirectory()) {
          for (const name of fs.readdirSync(file)) removeGenerated(path.join(file, name));
          fs.rmdirSync(file);
        } else fail('Unexpected generated bootstrap entry');
      }
      removeGenerated(bootstrap);
      if (fs.lstatSync(bootstrap, { throwIfNoEntry: false })) fail('Generated bootstrap cleanup incomplete');
    };
  }
  return { stage, prepareBootstrapCleanup };
}
function release(project, source, pin, mode, build) {
  const id = `${pin.version}-${pin.hash.slice(0, 16)}-${mode}`;
  const name = `releases/${id}`;
  const target = safe(project, `${control}/${name}`);
  const recordPath = safe(project, `${control}/release-records/${id}.json`);
  if (fs.existsSync(target)) {
    if (!fs.existsSync(recordPath)) fail('Unrecorded release exists; preserve it and inspect before retrying');
    const record = read(recordPath);
    if (record.sourceHash !== pin.hash || JSON.stringify(inventory(target)) !== JSON.stringify(record.inventory)) fail('Existing release integrity mismatch');
    return { release: name, releaseInventory: record.inventory };
  }
  const { stage, prepareBootstrapCleanup } = createReleaseStage(project);
  const src = path.join(source, 'tools/openspec');
  fs.cpSync(src, path.join(stage, 'tools/openspec'), { recursive: true, errorOnExist: true,
    // The callback avoids Node 24's Windows Unicode-path native-copy omission.
    ...(process.platform === 'win32' ? { filter: () => true } : {}),
  });
  if (mode === 'full') {
    if (!build) fail('full requires --build; networked dependency build is explicit');
    const cleanupBootstrap = prepareBootstrapCleanup();
    const result = runNode(project, path.join(stage, 'tools/openspec/build.mjs'), []);
    if (result.status !== 0) fail('Build failed; staged diagnostic output retained inside project; active install unchanged');
    const probe = runNode(project, path.join(stage, 'tools/openspec/ff-spec.mjs'), ['--help'], true);
    if (probe.status !== 0) fail(`Built CLI failed verification: ${probe.stderr}`);
    cleanupBootstrap(); // Only a successful full build; before strict runtime inventory.
  }
  const hashes = inventory(stage);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  json(recordPath, { sourceHash: pin.hash, inventory: hashes });
  fs.renameSync(stage, target);
  return { release: name, releaseInventory: hashes };
}
export function install(project, source, options) {
  if (!dependencies().node) fail('Node >=20.19 required');
  const pin = verifySource(source);
  const before = loadState(project);
  const files = bindings(source, pin, skillPayload(source, pin, options.host));
  preflight(project, before, files);
  if (before?.sourceHash === pin.hash && before.host === options.host && before.mode === options.mode) {
    if (JSON.stringify(inventory(safe(project, `${control}/${before.release}`))) !== JSON.stringify(before.releaseInventory)) fail('Release was modified');
    return { status: 'UNCHANGED', version: pin.version, mode: options.mode };
  }
  if (options.mode === 'full' && !options.build) fail('full requires --build; build downloads locked dependencies');
  if (options.mode === 'full') {
    const deps = buildDependencies(project);
    if (!deps.node || !deps.npm || !deps.git || !deps.tar) fail(`Build dependencies missing: ${JSON.stringify(deps)}`);
  }
  const runtime = release(project, source, pin, options.mode, options.build);
  const next = { schema: 1, version: pin.version, sourceHash: pin.hash, host: options.host, mode: options.mode, ...runtime };
  commit(project, before, next, files);
  return { status: options.mode === 'full' ? 'INSTALLED' : 'INSTALLED_SKILLS_ONLY_GATES_BLOCKED', version: pin.version, host: options.host, mode: options.mode };
}
export function doctor(project) {
  const state = loadState(project);
  if (!state) fail(`Not installed; build prerequisites: ${JSON.stringify(buildDependencies(project))}`);
  checkOwned(project, state);
  if (!dependencies().node) fail('Node >=20.19 required');
  const entry = validateRuntime(project, { version: state.version, hash: state.sourceHash });
  const result = runNode(project, entry, ['--help'], true);
  if (result.status !== 0) fail(`CLI probe failed: ${result.stderr}`);
  return { status: 'READY', version: state.version, host: state.host, mode: state.mode, cli: '.forgeflow/ff-spec.mjs', note: 'CLI available; this is not spec/policy acceptance or native-host verification' };
}
