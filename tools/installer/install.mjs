import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { safe, fail, read, json } from './files.mjs';
import { verifySource, skillPayload } from './source.mjs';
import { inventory, runNode, checkRelease, diagnose, environment } from './runtime.mjs';
import { control, loadState, preflight, checkOwned, commit } from './transaction.mjs';
import { hostsOf, normalizeHosts, fileHost } from './state.mjs';
import { verifyReusableBuild } from '../openspec/ff-build.mjs';
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
  for (const name of ['runtime', 'state', 'files']) files[`${control}/${name}.mjs`] = fs.readFileSync(path.join(source, `tools/installer/${name}.mjs`));
  files[`${control}/doctor.mjs`] = Buffer.from(`import { fileURLToPath } from 'node:url';\nimport { doctorMain } from './runtime.mjs';\ndoctorMain(fileURLToPath(new URL('../../', import.meta.url)), ${expected}, process.argv.slice(2));\n`);
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
function release(project, source, pin, mode, build, reuse) {
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
    filter: () => true,
  });
  if (mode === 'full') {
    if (!build && !reuse) fail('full requires --build or --reuse-build');
    const cleanupBootstrap = prepareBootstrapCleanup();
    if (reuse) {
      const reusable = path.resolve(reuse);
      if (JSON.stringify(read(path.join(reusable, 'upstream.json'))) !== JSON.stringify(read(path.join(src, 'upstream.json')))) fail('Reusable build source pin mismatch');
      const built = verifyReusableBuild(reusable);
      fs.cpSync(built, path.join(stage, 'tools/openspec/.build'), { recursive: true, filter: () => true, verbatimSymlinks: true });
      verifyReusableBuild(path.join(stage, 'tools/openspec'));
    } else {
      const result = runNode(project, path.join(stage, 'tools/openspec/build.mjs'), []);
      if (result.status !== 0) fail('Build failed; staged diagnostic output retained inside project; active install unchanged');
    }
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
  if (options.host && options.hosts) fail('--host conflicts with --hosts');
  const selected = normalizeHosts(options.hosts ?? [options.host]);
  if (options.hosts && selected.length !== 2) fail('--hosts requires codex,claude');
  if (!['full', 'skills-only'].includes(options.mode)) fail('Invalid install mode');
  if (options['reuse-build'] && (options.build || options.mode !== 'full')) fail('--reuse-build requires full and conflicts with --build');
  if (options.mode === 'skills-only' && options.build) fail('--build conflicts with skills-only');
  if (!options.hosts && before && hostsOf(before).length > 1) fail('Dual-host install requires --hosts codex,claude; use remove-host explicitly to remove one');
  const files = bindings(source, pin, Object.assign({}, ...selected.map(host => skillPayload(source, pin, host))));
  preflight(project, before, files);
  if (before) checkRelease(project, before);
  if (before?.sourceHash === pin.hash && JSON.stringify(hostsOf(before)) === JSON.stringify(selected) && before.mode === options.mode) {
    return { status: 'UNCHANGED', version: pin.version, mode: options.mode };
  }
  if (options.mode === 'full' && !options.build && !options['reuse-build']) fail('full requires --build or --reuse-build; build downloads locked dependencies');
  if (options.mode === 'full' && options.build) {
    const deps = buildDependencies(project);
    if (!deps.node || !deps.npm || !deps.git || !deps.tar) fail(`Build dependencies missing: ${JSON.stringify(deps)}`);
  }
  const runtime = release(project, source, pin, options.mode, options.build, options['reuse-build']);
  const hostState = options.hosts || before?.schema === 2 ? { schema: 2, hosts: selected } : { schema: 1, host: selected[0] };
  const next = { ...hostState, version: pin.version, sourceHash: pin.hash, mode: options.mode, ...runtime };
  commit(project, before, next, files);
  return { status: options.mode === 'full' ? 'INSTALLED' : 'INSTALLED_SKILLS_ONLY_GATES_BLOCKED', version: pin.version, ...(next.schema === 1 ? { host: selected[0] } : {}), hosts: selected, mode: options.mode,
    gitGuidance: { generated: ['/.forgeflow/install/', '/.forgeflow/ff-spec.mjs', ...selected.flatMap(host => pin.names.map(name => `/${host === 'codex' ? '.agents' : '.claude'}/skills/${name}/`))],
      versionControl: ['openspec/ff-policy.json', 'openspec/changes/<change>/design.md', 'openspec/changes/<change>/tasks.md', 'openspec/changes/<change>/ff-artifacts.json', '.gitattributes'],
      note: 'Choose whether to ignore generated entries or vendor them. No ignore file was modified. Keep project policy, plans and evidence; never ignore all of .forgeflow.' } };
}
export function doctor(project, host) {
  if (!dependencies().node) fail('Node >=20.19 required');
  return diagnose(project, host);
}
export function removeHost(project, host) {
  normalizeHosts([host]);
  const before = loadState(project);
  if (!before) fail('Not installed');
  checkOwned(project, before);
  checkRelease(project, before);
  const selected = hostsOf(before);
  if (!selected.includes(host)) return { status: 'UNCHANGED', hosts: selected };
  if (selected.length === 1) fail('Cannot remove last host; full uninstall is outside this operation');
  const files = Object.fromEntries(Object.keys(before.files).filter(name => fileHost(name) !== host).map(name => [name, fs.readFileSync(safe(project, name))]));
  const next = { ...before, hosts: selected.filter(item => item !== host) };
  commit(project, before, next, files);
  return { status: 'HOST_REMOVED', host, hosts: next.hosts, version: next.version, mode: next.mode };
}
