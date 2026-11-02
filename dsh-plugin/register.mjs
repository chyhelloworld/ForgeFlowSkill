#!/usr/bin/env node
/** 把 @local/forgeflow-dsh 注册进指定 DSH profile：改该 profile 的 package.json 与 cordis.patch.yml，并建立 node_modules/@local/forgeflow-dsh 目录链接。 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

export const PLUGIN_NAME = '@local/forgeflow-dsh';
const BEGIN = '# >>> forgeflow-dsh (managed by register.mjs) >>>';
const END = '# <<< forgeflow-dsh <<<';
const NL = '\n';
const BLOCK = [
  BEGIN,
  '- id: forgeflow-dsh',
  '  name: "@local/forgeflow-dsh"',
  '  config:',
  '    enabled: true',
  '    guardTools:',
  '      - pwsh',
  '      - bash',
  END,
  '',
].join(NL);
const SELF_DIR = path.dirname(fileURLToPath(import.meta.url));
export const LINK_LABEL = 'node_modules/' + PLUGIN_NAME.replace(/\\/g, '/');

export function defaultProfile() {
  const home = process.env.USERPROFILE || os.homedir();
  return path.join(home, '.dsh', 'profiles', 'desktop');
}

function compactStamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function normalizeLink(pluginDir) {
  return 'link:' + pluginDir.replace(/\\/g, '/');
}

function linkPath(profileDir) {
  return path.join(profileDir, 'node_modules', ...PLUGIN_NAME.split('/'));
}

function sameTarget(left, right) {
  const normalize = value => {
    const resolved = path.resolve(value).replace(/\\/g, '/');
    return process.platform === 'win32' ? resolved.toLowerCase() : resolved;
  };
  return normalize(left) === normalize(right);
}

function linkTargetIfExists(target) {
  try {
    fs.lstatSync(target);
  } catch {
    return null;
  }
  try {
    return fs.realpathSync(target);
  } catch {
    return '';
  }
}

// DSH 从 profile 的 node_modules 解析 bundle；link 依赖必须先落成符号链接/junction，
// 否则重启后解析不到 @local/forgeflow-dsh（package.json 里有 link: 条目不代表已链接）。
export function ensureLink(profileDir, pluginDir, options, changed) {
  const target = linkPath(profileDir);
  const existing = linkTargetIfExists(target);
  if (existing !== null) {
    if (existing && sameTarget(existing, pluginDir)) return true;
    const forgeflowTarget = existing && isForgeflowPluginDir(existing);
    const replace = options.replaceLink || (options.global && forgeflowTarget);
    if (!replace) {
      return { code: 2, message: '已存在 ' + LINK_LABEL + '，但它指向 ' + (existing || '不可解析目标') + '；未覆盖，请手动处理后重试（--global 可自动替换旧的 FF 插件链接，其他目标需手动清理）。' };
    }
    if (!options.dryRun) {
      try { fs.unlinkSync(target); } catch { fs.rmdirSync(target); }
    }
    changed.push(LINK_LABEL + '（替换旧目标）');
  }
  if (!options.dryRun) {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.symlinkSync(pluginDir, target, process.platform === 'win32' ? 'junction' : 'dir');
  }
  changed.push(LINK_LABEL);
  return true;
}

export function linkBelongsTo(profileDir, pluginDir) {
  const existing = linkTargetIfExists(linkPath(profileDir));
  return existing !== null && Boolean(existing) && sameTarget(existing, pluginDir);
}


// --- 全局安装（--global）----------------------------------------------------
// profile 里的 link 若指向某个项目目录，会随该项目移动/删除而失效，并让“其他项目”
// 实际依赖该项目存在。--global 先把插件物化到 <dshHome>/plugins/forgeflow-dsh，
// 再让 profile link 到这个稳定副本；项目内 .forgeflow/dsh-plugin 仍是安装器产物。
export const PLUGIN_FILES = [
  'package.json',
  'index.js',
  'register.mjs',
  'client.js',
  'generate-board.mjs',
  'cordis.patch.yml',
  'README.md',
];

export function dshHome(options = {}) {
  if (options.home) return path.resolve(options.home);
  if (process.env.DSH_HOME) return path.resolve(process.env.DSH_HOME);
  const home = process.env.USERPROFILE || os.homedir();
  return path.join(home, '.dsh');
}

export function globalPluginDir(options = {}) {
  return path.join(dshHome(options), 'plugins', 'forgeflow-dsh');
}

export function isForgeflowPluginDir(dir) {
  try {
    const data = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));
    const name = data && data.name;
    return typeof name === 'string' && (name === 'forgeflow-dsh' || name.endsWith('/forgeflow-dsh'));
  } catch {
    return false;
  }
}

// 幂等物化：逐文件按字节比较，只在缺失或内容不同时写入。
export function materializeGlobal(sourceDir, targetDir, options, changed) {
  for (const name of PLUGIN_FILES) {
    const from = path.join(sourceDir, name);
    if (!fs.existsSync(from)) {
      return { code: 2, message: '插件目录不完整：缺少 ' + name + '（' + sourceDir + '）' };
    }
  }
  if (!options.dryRun) fs.mkdirSync(targetDir, { recursive: true });
  for (const name of PLUGIN_FILES) {
    const from = path.join(sourceDir, name);
    const to = path.join(targetDir, name);
    const next = fs.readFileSync(from);
    if (fs.existsSync(to) && fs.readFileSync(to).equals(next)) continue;
    if (!options.dryRun) fs.writeFileSync(to, next);
    changed.push('plugins/forgeflow-dsh/' + name);
  }
  return true;
}

export function removeGlobal(options, changed) {
  const target = globalPluginDir(options);
  if (!fs.existsSync(target)) return false;
  if (!options.dryRun) fs.rmSync(target, { recursive: true, force: true });
  changed.push('plugins/forgeflow-dsh');
  return true;
}

export function removeLink(profileDir, pluginDir) {
  const target = linkPath(profileDir);
  const existing = linkTargetIfExists(target);
  if (existing === null) return false;
  if (!existing || !sameTarget(existing, pluginDir)) return false;
  try {
    fs.unlinkSync(target);
  } catch {
    fs.rmdirSync(target);
  }
  return true;
}

function updatePackageJson(text, pluginDir) {
  const data = JSON.parse(text);
  const dependencies = data.dependencies && typeof data.dependencies === 'object' ? data.dependencies : {};
  const dsh = data.dsh && typeof data.dsh === 'object' ? data.dsh : {};
  const profile = dsh.profile && typeof dsh.profile === 'object' ? dsh.profile : {};
  const bundles = Array.isArray(profile.bundles) ? profile.bundles.slice() : [];
  const link = normalizeLink(pluginDir);
  let changed = false;
  if (dependencies[PLUGIN_NAME] !== link) {
    dependencies[PLUGIN_NAME] = link;
    changed = true;
  }
  if (!bundles.includes(PLUGIN_NAME)) {
    bundles.push(PLUGIN_NAME);
    changed = true;
  }
  if (!changed) return text;
  data.dependencies = dependencies;
  data.dsh = Object.assign({}, dsh, { profile: Object.assign({}, profile, { bundles }) });
  return JSON.stringify(data, null, 2) + NL;
}

function removeFromPackageJson(text) {
  const data = JSON.parse(text);
  let changed = false;
  if (data.dependencies && Object.prototype.hasOwnProperty.call(data.dependencies, PLUGIN_NAME)) {
    delete data.dependencies[PLUGIN_NAME];
    changed = true;
  }
  const profile = data.dsh && data.dsh.profile ? data.dsh.profile : null;
  if (profile && Array.isArray(profile.bundles) && profile.bundles.includes(PLUGIN_NAME)) {
    profile.bundles = profile.bundles.filter(item => item !== PLUGIN_NAME);
    changed = true;
  }
  if (!changed) return text;
  return JSON.stringify(data, null, 2) + NL;
}

export function hasBlock(text) {
  return typeof text === 'string' && text.includes(BEGIN) && text.includes(END);
}

// 注册块只追加一次；重复运行不会重复追加（幂等）。
// 空模板（如 DSH 生成的 []）不能直接追加 block sequence：YAML 里空 flow
// sequence 后接序列元素是语法错误，因此先把哨兵行换成注册块。
function lastMeaningfulLine(lines) {
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    const line = lines[index].trim();
    if (!line || line.startsWith('#')) continue;
    return index;
  }
  return -1;
}

export function appendBlock(text) {
  const trimmed = typeof text === 'string' ? text.trimEnd() : '';
  if (!trimmed) return BLOCK;
  const lines = trimmed.split(NL);
  const sentinel = lastMeaningfulLine(lines);
  if (sentinel !== -1 && /^(?:\[\]|\{\}|null|~|---)$/.test(lines[sentinel].trim())) {
    const head = lines.slice(0, sentinel).join(NL).trimEnd();
    return (head ? head + NL + NL : '') + BLOCK;
  }
  return trimmed + NL + NL + BLOCK;
}

// --remove 时精确删除自己追加的块，不留残余空行；不完整的块不擅自删除。
export function removeBlock(text) {
  if (typeof text !== 'string') return text;
  const start = text.indexOf(BEGIN);
  if (start === -1) return text;
  const endIndex = text.indexOf(END, start);
  if (endIndex === -1) return text;
  const head = text.slice(0, start).trimEnd();
  let rest = text.slice(endIndex + END.length);
  if (rest.startsWith('\r\n')) rest = rest.slice(2);
  else if (rest.startsWith(NL)) rest = rest.slice(1);
  if (!rest.trim()) rest = '';
  if (!head) return rest;
  if (!rest) return lastMeaningfulLine(head.split(NL)) === -1 ? head + NL + NL + '[]' + NL : head + NL;
  // 原文件只有注释 + 空序列哨兵时，尾部补回 []，保证仍是合法 YAML。
  const restLines = rest.trimEnd().split(NL);
  const tail = lastMeaningfulLine(restLines);
  if (tail === -1) return head + NL + NL + '[]' + NL;
  return head + NL + NL + rest.trimEnd() + NL;
}

function readText(file) {
  return fs.readFileSync(file, 'utf8');
}

function writeWithBackup(file, text, options, changed) {
  if (options.dryRun) {
    changed.push(path.basename(file));
    return;
  }
  if (fs.existsSync(file)) {
    fs.copyFileSync(file, file + '.bak-' + compactStamp());
  }
  fs.writeFileSync(file, text);
  changed.push(path.basename(file));
}

function resolveProfile(options) {
  if (options.profile) return path.resolve(options.profile);
  if (options.global) return path.join(dshHome(options), 'profiles', 'desktop');
  return path.resolve(defaultProfile());
}

function resolvePlugin(options) {
  return path.resolve(options.plugin || SELF_DIR);
}

function checkPlugin(pluginDir, result) {
  if (fs.existsSync(path.join(pluginDir, 'package.json'))) return true;
  result.code = 2;
  result.message = '插件目录无效：' + pluginDir + '（缺少 package.json）';
  return false;
}

export function register(options = {}) {
  const profileDir = resolveProfile(options);
  let pluginDir = resolvePlugin(options);
  const result = { action: 'register', profile: profileDir, plugin: pluginDir, changed: [], dryRun: Boolean(options.dryRun), code: 0, message: '' };
  const packageFile = path.join(profileDir, 'package.json');
  const patchFile = path.join(profileDir, 'cordis.patch.yml');
  if (!fs.existsSync(packageFile)) {
    result.code = 2;
    result.message = '找不到 DSH profile：' + profileDir + '（缺少 package.json）；用 --profile <目录> 指定，或先启动一次 DSH 生成 desktop profile。';
    return result;
  }
  if (!checkPlugin(pluginDir, result)) return result;
  if (options.global) {
    const target = globalPluginDir(options);
    const materialized = materializeGlobal(pluginDir, target, options, result.changed);
    if (materialized !== true) {
      result.code = materialized.code;
      result.message = materialized.message;
      return result;
    }
    result.source = pluginDir;
    pluginDir = target;
    result.plugin = target;
  }
  const packageText = readText(packageFile);
  const patchText = fs.existsSync(patchFile) ? readText(patchFile) : '';
  let nextPackage;
  try {
    nextPackage = updatePackageJson(packageText, pluginDir);
  } catch (error) {
    result.code = 2;
    result.message = 'profile/package.json 不是合法 JSON：' + error.message;
    return result;
  }
  const nextPatch = hasBlock(patchText) ? patchText : appendBlock(patchText);
  let createdLink = false;
  try {
    const linked = ensureLink(profileDir, pluginDir, options, result.changed);
    if (linked !== true) {
      result.code = linked.code;
      result.message = linked.message;
      return result;
    }
    createdLink = !options.dryRun && result.changed.includes(LINK_LABEL);
    if (nextPackage !== packageText) writeWithBackup(packageFile, nextPackage, options, result.changed);
    if (nextPatch !== patchText) writeWithBackup(patchFile, nextPatch, options, result.changed);
  } catch (error) {
    if (createdLink) {
      try { removeLink(profileDir, pluginDir); } catch {}
    }
    result.code = 1;
    result.message = '写入 profile 失败：' + error.message;
    return result;
  }
  result.message = result.changed.length
    ? (result.dryRun ? '将修改：' : '已修改：') + result.changed.join('、') + '；重启 DSH 后插件生效。'
    : '已经注册，无需改动（幂等）；如未生效请检查 profile 是否被 DSH 加载。';
  return result;
}

export function remove(options = {}) {
  const profileDir = resolveProfile(options);
  const pluginDir = options.global ? globalPluginDir(options) : resolvePlugin(options);
  const result = { action: 'remove', profile: profileDir, plugin: pluginDir, changed: [], dryRun: Boolean(options.dryRun), code: 0, message: '' };
  const packageFile = path.join(profileDir, 'package.json');
  const patchFile = path.join(profileDir, 'cordis.patch.yml');
  if (!fs.existsSync(packageFile)) {
    result.code = 2;
    result.message = '找不到 DSH profile：' + profileDir + '（缺少 package.json）。';
    return result;
  }
  const packageText = readText(packageFile);
  let nextPackage;
  try {
    nextPackage = removeFromPackageJson(packageText);
  } catch (error) {
    result.code = 2;
    result.message = 'profile/package.json 不是合法 JSON：' + error.message;
    return result;
  }
  const patchText = fs.existsSync(patchFile) ? readText(patchFile) : '';
  const nextPatch = removeBlock(patchText);
  let linkNote = '';
  try {
    if (nextPackage !== packageText) writeWithBackup(packageFile, nextPackage, options, result.changed);
    if (nextPatch !== patchText) {
      if (!nextPatch.trim()) {
        if (!options.dryRun) fs.rmSync(patchFile, { force: true });
        result.changed.push(path.basename(patchFile));
      } else {
        writeWithBackup(patchFile, nextPatch, options, result.changed);
      }
    }
    const hasLink = linkTargetIfExists(linkPath(profileDir)) !== null;
    if (hasLink) {
      if (!linkBelongsTo(profileDir, pluginDir)) {
        linkNote = '未删除 ' + LINK_LABEL + '：它不指向当前插件目录（' + pluginDir + '），请手动清理。';
      } else if (!options.dryRun && !removeLink(profileDir, pluginDir)) {
        linkNote = '未删除 ' + LINK_LABEL + '：删除符号链接失败，请手动清理。';
      } else {
        result.changed.push(LINK_LABEL);
      }
    }
  } catch (error) {
    result.code = 1;
    result.message = '撤销失败：' + error.message;
    return result;
  }
  result.message = result.changed.length
    ? (result.dryRun ? '将撤销：' : '已撤销：') + result.changed.join('、') + '；重启 DSH 后不再加载插件。'
    : (linkNote || '未发现已注册内容，无需撤销（幂等）。');
  if (options.purge && removeGlobal(options, result.changed) && !options.dryRun) {
    if (!result.changed.includes(LINK_LABEL)) result.changed.push('plugins/forgeflow-dsh');
  }
  if (linkNote && result.changed.length) result.message += ' ' + linkNote;
  return result;
}

export function usage() {
  return [
    '用法：node register.mjs [--profile <DSH profile 目录>] [--plugin <插件目录>] [--remove] [--dry-run] [--json]',
    '',
    '  --profile <dir>  默认 %USERPROFILE%/.dsh/profiles/desktop',
    '  --plugin <dir>   默认本文件所在目录（应包含 package.json）',
    '  --remove         撤销注册（删除 dependencies/bundles 条目与 cordis.patch.yml 注册块）',
    '  --global         把插件物化到 <DSH_HOME>/plugins/forgeflow-dsh 并 link 到该稳定副本',
    '                   （默认 DSH_HOME=%USERPROFILE%/.dsh；不带此参数时 link 指向 --plugin 目录）',
    '  --purge          仅与 --remove + --global 一起用：同时删除全局插件副本',
    '  --dry-run        只报告将改动的文件，不写入',
    '  --json           以 JSON 输出结果',
    '',
    '注意：本脚本不启动、不重启 DSH；注册后需重启 DSH 才生效。',
  ].join(NL);
}

export function main(argv = process.argv.slice(2)) {
  const options = { profile: null, plugin: null, home: null, remove: false, global: false, purge: false, replaceLink: false, dryRun: false, json: false, help: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--profile') {
      options.profile = argv[index + 1];
      index += 1;
      if (!options.profile) return { code: 2, lines: ['--profile 需要一个目录参数。'] };
    } else if (arg === '--plugin') {
      options.plugin = argv[index + 1];
      index += 1;
      if (!options.plugin) return { code: 2, lines: ['--plugin 需要一个目录参数。'] };
    } else if (arg === '--home') {
      options.home = argv[index + 1];
      index += 1;
      if (!options.home) return { code: 2, lines: ['--home 需要一个目录参数。'] };
    } else if (arg === '--remove') {
      options.remove = true;
    } else if (arg === '--global') {
      options.global = true;
    } else if (arg === '--purge') {
      options.purge = true;
    } else if (arg === '--replace-link') {
      options.replaceLink = true;
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--json') {
      options.json = true;
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else {
      return { code: 2, lines: ['未知参数：' + arg + '。'] };
    }
  }
  if (options.help) return { code: 0, lines: usage() };
  const result = options.remove ? remove(options) : register(options);
  const lines = options.json
    ? [JSON.stringify(result)]
    : [result.message, ...(options.dryRun ? ['（--dry-run：未写入任何文件）'] : [])];
  return { code: result.code, lines };
}

function invokedDirectly() {
  const invoked = process.argv[1] ? path.resolve(process.argv[1]) : '';
  return invoked !== '' && path.normalize(invoked) === path.normalize(SELF_DIR + path.sep + 'register.mjs');
}

if (invokedDirectly()) {
  const result = main();
  for (const line of result.lines) console.log(line);
  process.exitCode = result.code;
}
