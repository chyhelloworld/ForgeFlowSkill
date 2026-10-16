import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
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
export function validateRuntime(project, expected) {
  const state = JSON.parse(fs.readFileSync(path.join(project, '.forgeflow/install/state.json'), 'utf8'));
  if (state.version !== expected.version || state.sourceHash !== expected.hash) throw new Error('BLOCKED: launcher binding mismatch');
  if (state.mode !== 'full') throw new Error('BLOCKED: skills-only; FF gates unavailable. Reinstall full with --build.');
  if (!/^releases\/[a-zA-Z0-9.+-]+$/.test(state.release)) throw new Error('BLOCKED: unsafe release');
  for (const part of ['.forgeflow', '.forgeflow/install', '.forgeflow/install/releases']) {
    if (fs.lstatSync(path.join(project, part)).isSymbolicLink()) throw new Error('BLOCKED: runtime ancestor symlink');
  }
  const root = path.join(project, '.forgeflow/install', state.release);
  if (fs.lstatSync(root).isSymbolicLink()) throw new Error('BLOCKED: release symlink');
  if (JSON.stringify(inventory(root)) !== JSON.stringify(state.releaseInventory)) throw new Error('BLOCKED: runtime integrity mismatch');
  return path.join(root, 'tools/openspec/ff-spec.mjs');
}
export function launch(project, expected, args) {
  try { process.exitCode = runNode(project, validateRuntime(project, expected), args).status ?? 1; }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
