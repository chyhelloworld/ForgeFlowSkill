import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { safe, fail } from './files.mjs';
import { control, loadState, hostsOf, checkOwned, assertIdle, hostBase, hosts, pluginDir } from './state.mjs';
const hash = data => createHash('sha256').update(data).digest('hex');
// DSH 插件只是项目内副本；doctor 只报告它是否存在，不读取全局 profile。
function pluginStatus(project) {
  const dir = path.join(project, pluginDir);
  const available = ['package.json', 'index.js', 'register.mjs'].every(name => fs.existsSync(path.join(dir, name)));
  return { available, path: available ? pluginDir : null, note: '项目内 DSH 插件副本；register.mjs 只写显式 --profile 指定的 profile，doctor 不读取全局 profile。' };
}
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
function skillDirs(project, root) {
  const dir = safe(project, root);
  if (!fs.existsSync(dir)) return 0;
  return fs.readdirSync(dir, { withFileTypes: true }).filter(entry => entry.isDirectory() && /^ff-[a-z-]+$/.test(entry.name) && fs.existsSync(path.join(dir, entry.name, 'SKILL.md'))).length;
}
function installedSkillVersion(project, host) {
  const file = safe(project, `${hostBase(host)}/ff-spec/SKILL.md`);
  if (!fs.existsSync(file)) return null;
  const header = fs.readFileSync(file, 'utf8').split('---')[1] ?? '';
  return header.match(/^\s+version: "([^"]+)"\s*$/m)?.[1] ?? null;
}
// Report where each host actually looks, so a "loaded nothing" surprise is diagnosable.
export function discovery(project, host) {
  const others = hosts.filter(other => other !== host).map(other => ({ host: other, root: hostBase(other), skills: skillDirs(project, hostBase(other)) })).filter(entry => entry.skills > 0);
  return { root: hostBase(host), skills: skillDirs(project, hostBase(host)), gitRoot: fs.existsSync(path.join(project, '.git')), projectRoot: path.resolve(project), others,
    note: host === 'dsh' && others.length ? 'DSH ranks project .dsh/skills (100) above .agents/skills (200); other roots stay readable to their own host but cannot shadow DSH.' : undefined };
}
// Skills, install state and the CLI version can drift independently; name which one is stale.
export function handshake(stateVersion, skillVersion, cliVersion) {
  // Builds made before the version stamp carry "1.14.2-ff.<adapter>"; newer ones carry the FF version.
  const adapterPin = cliVersion?.match(/(?:^|-)ff\.(.+)$/)?.[1] ?? null;
  const cliMatchesState = Boolean(cliVersion) && cliVersion === stateVersion;
  const cliNote = !cliVersion ? 'CLI 未返回版本，运行 .forgeflow/install/doctor.mjs 查看具体错误。'
    : adapterPin && adapterPin !== stateVersion ? `CLI 内嵌 adapter 固定为 ${adapterPin}，与安装版本 ${stateVersion} 不同；这是旧构建的硬编码版本，用当前源码重建 .build 后重新安装即可对齐。`
    : !cliMatchesState && !adapterPin ? `CLI 报告 ${cliVersion}，与安装版本 ${stateVersion} 不同；用当前源码重建 .build 后重新安装。`
    : null;
  return { skills: skillVersion, state: stateVersion, verdict: !skillVersion ? 'UNKNOWN' : skillVersion === stateVersion ? 'MATCH' : 'DRIFT', cli: cliVersion, cliMatchesState, adapterPin,
    ...(cliNote ? { note: cliNote } : {}) };
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
  const gateProbe = runNode(project, entry, ['receipt', 'diagnose'], true);
  let gates;
  try { if (gateProbe.status !== 0) throw new Error(gateProbe.stderr); gates = JSON.parse(gateProbe.stdout); }
  catch { gates = { configuration: 'UNKNOWN', evidence: 'NOT_CHECKED', checked: 0, reason: 'Gate diagnostics unavailable; runtime help is not a gate check' }; }
  assertIdle(project);
  if (JSON.stringify(loadState(project)) !== JSON.stringify(state)) fail('Install state changed during gate diagnostics; retry when idle');
  checkOwned(project, state, host);
  checkRelease(project, state, 'runtime changed during gate diagnostics');
  const selected = host ? [host] : hostsOf(state);
  const plugin = selected.includes('dsh') ? pluginStatus(project) : null;
  const cliProbe = runNode(project, entry, ['--version'], true);
  const cliVersion = cliProbe.status === 0 ? (cliProbe.stdout.trim().split(/\r?\n/)[0] || null) : null;
  return { status: gates.configuration === 'CONFIGURED' && gates.evidence === 'VALID' ? 'READY' : 'RUNTIME_READY', runtime: 'READY', gates,
    version: state.version, ...(state.schema === 1 ? { host: state.host } : {}), hosts: selected, mode: state.mode, cli: '.forgeflow/ff-spec.mjs',
    ...(plugin ? { plugin } : {}),
    discovery: discovery(project, selected[0]),
    handshake: handshake(state.version, installedSkillVersion(project, selected[0]), cliVersion),
    note: 'Runtime, configuration and evidence are separate. No actual model invocation, semantic review or human acceptance is established.' };
}
export function doctorMain(project, expected, args) {
  try {
    let host;
    if (args.length === 2 && args[0] === '--host') host = args[1];
    else if (args.length && !(args.length === 1 && args[0] === '--help')) fail('Usage: doctor.mjs [--host codex|claude|dsh]');
    if (args.length === 2 && !hosts.includes(host)) fail('Unknown host');
    console.log(JSON.stringify(diagnose(project, host, expected), null, 2));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
export function launch(project, expected, args) {
  try {
    project = currentProject(process.cwd());
    process.exitCode = runNode(project, validateRuntime(project, expected), args).status ?? 1;
  }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
export function currentProject(start) {
  let current = path.resolve(start);
  while (true) {
    if (fs.existsSync(path.join(current, control, 'state.json'))) return current;
    // A worktree's .git file is a project boundary too: never climb into its main checkout.
    if (fs.existsSync(path.join(current, '.git'))) break;
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  fail('Current project/worktree has no local FF install. Install here explicitly; full can use --reuse-build PATH.');
}
