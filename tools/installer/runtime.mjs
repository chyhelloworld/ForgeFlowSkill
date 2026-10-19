import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { safe, fail } from './files.mjs';
import { control, loadState, hostsOf, checkOwned, assertIdle } from './state.mjs';
const hash = data => createHash('sha256').update(data).digest('hex');
export function inventory(root, relative = '') {
  const result = {};
  for (const item of fs.readdirSync(path.join(root, relative), { withFileTypes: true })) {
    const name = relative ? `${relative}/${item.name}` : item.name;
    const file = path.join(root, name);
    if (item.isDirectory()) Object.assign(result, inventory(root, name));
    else if (item.isFile()) result[name] = hash(fs.readFileSync(file));
    else if (item.isSymbolicLink()) {
      const link = fs.readlinkSync(file);
      const target = path.resolve(path.dirname(file), link);
      if (path.isAbsolute(link) || !target.startsWith(root + path.sep)) throw new Error('BLOCKED: escaping runtime link');
      if (!fs.realpathSync(file).startsWith(fs.realpathSync(root) + path.sep)) throw new Error('BLOCKED: escaping runtime link chain');
      result[name] = `link:${link}`;
    } else throw new Error('BLOCKED: unsupported runtime entry');
  }
  return Object.fromEntries(Object.entries(result).sort(([a], [b]) => a.localeCompare(b, 'en')));
}
export function environment(project) {
  const home = path.join(project, '.forgeflow/install/local-home');
  for (const name of ['.forgeflow', '.forgeflow/install', '.forgeflow/install/local-home']) {
    const file = path.join(project, name);
    if (fs.existsSync(file) && fs.lstatSync(file).isSymbolicLink()) throw new Error('BLOCKED: local home symlink');
  }
  fs.mkdirSync(home, { recursive: true });
  inventory(home); // Reject escaping links in pre-existing cache/config trees before any subprocess.
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !/^(npm_|pnpm_|node_options$|node_path$)/i.test(key)));
  return { ...env, HOME: home, USERPROFILE: home, XDG_CONFIG_HOME: path.join(home, 'config'),
    XDG_DATA_HOME: path.join(home, 'data'), XDG_CACHE_HOME: path.join(home, 'cache'),
    APPDATA: path.join(home, 'config'), LOCALAPPDATA: path.join(home, 'data'),
    npm_config_cache: path.join(home, 'npm-cache'), npm_config_userconfig: path.join(home, 'npmrc'),
    npm_config_globalconfig: path.join(home, 'global-npmrc'), COREPACK_HOME: path.join(home, 'corepack'),
    TMPDIR: home, TEMP: home, TMP: home, PNPM_HOME: path.join(home, 'pnpm'), DO_NOT_TRACK: '1', OPENSPEC_TELEMETRY: '0', CI: '1' };
}
export function runNode(project, entry, args, capture = false) {
  const result = spawnSync(process.execPath, [entry, ...args], { cwd: project, env: environment(project),
    shell: false, stdio: capture ? 'pipe' : 'inherit', encoding: 'utf8' });
  if (result.error) throw result.error;
  return result;
}
export function checkRelease(project, state, message = 'Release was modified') {
  if (!/^releases\/[a-zA-Z0-9.+-]+$/.test(state.release)) fail('unsafe release');
  const root = safe(project, `${control}/${state.release}`);
  if (JSON.stringify(inventory(root)) !== JSON.stringify(state.releaseInventory)) fail(message);
  return path.join(root, 'tools/openspec/ff-spec.mjs');
}
export function validateRuntime(project, expected) {
  assertIdle(project);
  const state = loadState(project);
  if (!state) fail('Not installed');
  if (state.version !== expected.version || state.sourceHash !== expected.hash) throw new Error('BLOCKED: launcher binding mismatch');
  if (state.mode !== 'full') throw new Error('BLOCKED: skills-only; FF gates unavailable. Reinstall full with --build.');
  return checkRelease(project, state, 'runtime integrity mismatch');
}
export function diagnose(project, host, expected) {
  assertIdle(project);
  const state = loadState(project);
  if (!state) fail('Not installed');
  checkOwned(project, state, host);
  const entry = validateRuntime(project, expected ?? { version: state.version, hash: state.sourceHash });
  const result = runNode(project, entry, ['--help'], true);
  if (result.status !== 0) fail(`CLI probe failed: ${result.stderr}`);
  assertIdle(project);
  if (JSON.stringify(loadState(project)) !== JSON.stringify(state)) fail('Install state changed during doctor; retry when idle');
  checkOwned(project, state, host);
  checkRelease(project, state, 'runtime changed during doctor');
  return { status: 'READY', version: state.version, ...(state.schema === 1 ? { host: state.host } : {}), hosts: host ? [host] : hostsOf(state), mode: state.mode, cli: '.forgeflow/ff-spec.mjs', note: 'Managed entries and shared CLI available; not actual model invocation, spec/policy acceptance or human acceptance' };
}
export function doctorMain(project, expected, args) {
  try {
    let host;
    if (args.length === 2 && args[0] === '--host') host = args[1];
    else if (args.length && !(args.length === 1 && args[0] === '--help')) fail('Usage: doctor.mjs [--host codex|claude]');
    if (args.length === 2 && !['codex', 'claude'].includes(host)) fail('Unknown host');
    console.log(JSON.stringify(diagnose(project, host, expected), null, 2));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
export function launch(project, expected, args) {
  try { process.exitCode = runNode(project, validateRuntime(project, expected), args).status ?? 1; }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
