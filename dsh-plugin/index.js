/** ForgeFlow DSH 插件：四层常驻锚点、只读状态/门禁工具，以及 archive 的本地 best-effort 守卫。 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

export const name = 'forgeflow-dsh';
export const inject = ['tools'];

export const FF_SPEC = '.forgeflow/ff-spec.mjs';
export const DOCTOR = '.forgeflow/install/doctor.mjs';
const FF_SPEC_NAME = /\.forgeflow[\\/]ff-spec\.mjs$/i;
const NODE_PREFIX = /^(?:node|node\.exe|npx|npx\.cmd)$/i;
const DEFAULT_TOOLS = ['pwsh', 'bash'];
const DEFAULT_TIMEOUT = 15000;

// 四层失效的常驻锚点：每次会话都在 systemPrompt 里，不依赖技能被读取。
export const FOUR_LAYER_ANCHOR = [
  'ForgeFlow 四层失效自检（常驻；完整规则见 ForgeFlow 的 INTENT-LOOP 契约）：',
  '- L1 局部正确、整体偏航：切片都通过时先核对“总需求是否有当版验收证据”，不要用通过率求和代替总体验收。',
  '- L2 过度防御、复杂度失控：为“以后可能”新增机制/抽象/状态库前，先指出已存在的等价机制、为何不够，并给出可复现失败样本；没有失败样本就先不加。',
  '- L3 过早接受平庸方案：能跑通不等于值得实施；至少比较 2 个候选或做一个可证伪实验，并回答“更简单的替代是什么”。',
  '- L4 过早收敛、原始问题被替换：先复述用户原话与未解项，再命名/归类/拆票；设计讨论不等于实现授权。',
].join('\n');

// 边界：DSH 宿主的 run_code 等不透明调用在工具管道里看不到真实命令行，
// 本守卫只覆盖 pwsh/bash 的 command 参数；这是 best-effort，不能当安全边界。

function spawnNode(cwd, entry, args, timeoutMs) {
  const env = { ...process.env };
  // DSH 桌面版是 Electron：用同一可执行文件的 Node 模式，避免依赖 PATH 里的 node。
  if (process.versions.electron) env.ELECTRON_RUN_AS_NODE = '1';
  return spawnSync(process.execPath, [entry, ...args], {
    cwd, env, encoding: 'utf8', timeout: timeoutMs, windowsHide: true, shell: false,
  });
}

export function normalizeSettings(config = {}) {
  const tools = Array.isArray(config.guardTools) && config.guardTools.length
    ? config.guardTools.filter(item => typeof item === 'string' && item)
    : DEFAULT_TOOLS;
  const timeout = Number.isFinite(config.timeoutMs) && config.timeoutMs > 0 ? config.timeoutMs : DEFAULT_TIMEOUT;
  return {
    enabled: config.enabled !== false,
    anchor: config.anchor !== false,
    guardTools: tools,
    timeoutMs: timeout,
    project: typeof config.project === 'string' && config.project ? config.project : null,
  };
}

// 从会话目录向上找项目根；没有 .forgeflow 时返回起点，由调用方报“未安装”。
export function discoverProject(start) {
  let current = path.resolve(start);
  while (true) {
    if (fs.existsSync(path.join(current, '.forgeflow'))) return current;
    if (fs.existsSync(path.join(current, '.git'))) break;
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return path.resolve(start);
}

export function sessionDirectory(ctx, invocation, settings) {
  try {
    const service = ctx && typeof ctx.get === 'function' ? ctx.get('workingDirectory') : null;
    const dir = service && typeof service.get === 'function'
      ? service.get(invocation && invocation.agent ? invocation.agent.session : undefined)
      : service && service.defaultDirectory;
    if (typeof dir === 'string' && dir) return dir;
  } catch {}
  if (settings && settings.project) return settings.project;
  return process.cwd();
}

// 按 shell 引号规则切词：引号内不拆，单/双引号只去除定界符。
export function tokenize(command) {
  const tokens = [];
  let current = '';
  let quote = null;
  const flush = () => {
    if (current) tokens.push(current);
    current = '';
  };
  for (const ch of command) {
    if (quote) {
      if (ch === quote) quote = null;
      else current += ch;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }
    if (/\s/.test(ch)) {
      flush();
      continue;
    }
    current += ch;
  }
  flush();
  return tokens;
}

function isCommandPrefix(token) {
  return NODE_PREFIX.test(token) || /[\\/]node(?:\.exe)?$/i.test(token) || /[\\/]npx(?:\.cmd)?$/i.test(token)
    || /[;&|(]$/.test(token) || token === '&';
}

function allowsReadOnlyArchive(tokens, start) {
  for (let index = start; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token === '-h' || token === '--help') return true;
    if (token === '--ff-disposition') {
      const value = tokens[index + 1];
      if (value === 'canceled' || value === 'rejected') return true;
    }
    if (/^--ff-disposition=(canceled|rejected)$/.test(token)) return true;
  }
  return false;
}

// 从命令行提取“真正在执行 ff-spec.mjs archive”的路径并推出项目根。
// 只认命令位置的 node/npx 调用；--help 与文档化的取消路径不进守卫。
export function gateTarget(command, sessionDir) {
  if (typeof command !== 'string') return null;
  const tokens = tokenize(command);
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (!FF_SPEC_NAME.test(token)) continue;
    if (tokens[index + 1] !== 'archive') continue;
    if (index > 0 && !isCommandPrefix(tokens[index - 1])) continue;
    // 前缀 node/npx 本身也要在命令位置，避免把 echo 的参数当成调用。
    const start = index > 0 ? index - 1 : index;
    if (start > 0 && !isCommandPrefix(tokens[start - 1])) continue;
    if (allowsReadOnlyArchive(tokens, index + 2)) return null;
    const specPath = path.isAbsolute(token) ? path.normalize(token) : path.resolve(sessionDir, token);
    return { specPath, project: path.dirname(path.dirname(specPath)) };
  }
  return null;
}

function blockReasons(report) {
  const blocked = new Set(Array.isArray(report && report.blocked) ? report.blocked : []);
  return (Array.isArray(report && report.rows) ? report.rows : [])
    .filter(row => blocked.has(row.change))
    .map(row => row.change + '：' + (Array.isArray(row.reasons) && row.reasons.length ? row.reasons.join('；') : '未通过 FF 门禁'));
}

// 运行 .forgeflow/ff-spec.mjs status --json，把结果归纳成门禁状态。
export function evaluateGate(project, options = {}) {
  const ff = path.join(project, FF_SPEC);
  if (!fs.existsSync(ff)) {
    return { state: 'missing', project, report: null, blocked: [], reasons: ['未找到 .forgeflow/ff-spec.mjs（该项目没有 FF 安装）'] };
  }
  const result = spawnNode(project, ff, ['status', '--json'], options.timeoutMs || DEFAULT_TIMEOUT);
  const stderr = typeof result.stderr === 'string' ? result.stderr.trim() : '';
  if (result.error) return { state: 'unavailable', project, report: null, blocked: [], reasons: ['无法执行 FF CLI：' + result.error.message] };
  if (result.status !== 0) {
    const first = stderr ? stderr.split(/\r?\n/)[0] : '';
    return { state: 'unavailable', project, report: null, blocked: [], reasons: ['FF status 退出码 ' + result.status + (first ? '：' + first : '')] };
  }
  let report;
  try { report = JSON.parse(result.stdout); } catch { return { state: 'unavailable', project, report: null, blocked: [], reasons: ['FF status 未返回可解析的 JSON'] }; }
  const policy = report && report.policy ? report.policy.state : undefined;
  const blocked = Array.isArray(report && report.blocked) ? report.blocked.slice() : [];
  if (policy === 'invalid') {
    const reason = report && report.policy && report.policy.reason ? report.policy.reason : 'openspec/ff-policy.json 结构无效';
    return { state: 'invalid', project, report, blocked, reasons: [reason] };
  }
  if (blocked.length) return { state: 'blocked', project, report, blocked, reasons: blockReasons(report) };
  if ((report && report.configured === true) || policy === 'configured') return { state: 'valid', project, report, blocked: [], reasons: [] };
  return { state: 'disabled', project, report, blocked: [], reasons: [] };
}

export function denialReason(gate) {
  if (gate.state === 'invalid') {
    return 'FF 门禁配置无效：' + gate.reasons.join('；') + '。先修复 openspec/ff-policy.json，或运行 node .forgeflow/ff-spec.mjs adopt --write --force 后重试；确需跳过请设置 FF_ALLOW_UNGATED=1。';
  }
  return 'FF 门禁未通过：' + gate.reasons.slice(0, 3).join('；') + '。先运行 node .forgeflow/ff-spec.mjs status 查看并补齐 artifacts/回执；确需跳过请设置 FF_ALLOW_UNGATED=1。';
}

export function createGuard(ctx, settings) {
  return function guard(exec, next) {
    try {
      // 优先级：插件停用 > 显式豁免 > 工具名与命令匹配。
      if (!settings.enabled) return next();
      if (process.env.FF_ALLOW_UNGATED === '1') return next();
      if (!settings.guardTools.includes(exec && exec.name)) return next();
      const args = exec && typeof exec.arguments === 'object' && exec.arguments ? exec.arguments : null;
      const target = gateTarget(args ? args.command : undefined, sessionDirectory(ctx, exec, settings));
      if (!target) return next();
      if (!fs.existsSync(target.specPath)) return next(); // 命令里的 FF 路径在磁盘上不存在：不拦
      const gate = evaluateGate(target.project, settings);
      if (gate.state === 'blocked' || gate.state === 'invalid') return { kind: 'deny', reason: denialReason(gate) };
      return next();
    } catch {
      // 守卫自身异常不应误伤正常操作；best-effort 放行。
      return next();
    }
  };
}

function describeGates(gates) {
  if (!gates || typeof gates !== 'object') return 'unknown';
  const checked = Number.isFinite(gates.checked) ? gates.checked : 0;
  return (gates.configuration || 'UNKNOWN') + ' / evidence=' + (gates.evidence || 'NOT_CHECKED') + ' / checked=' + checked;
}

function describeDiscovery(discovery) {
  if (!discovery || typeof discovery !== 'object') return '';
  const others = Array.isArray(discovery.others) && discovery.others.length
    ? discovery.others.map(item => item.host + '=' + item.skills).join(',')
    : 'none';
  return 'root=' + (discovery.root || '?') + ' skills=' + (discovery.skills ?? '?') + ' others=' + others;
}

function describeHandshake(handshake) {
  if (!handshake || typeof handshake !== 'object') return '';
  return 'skills=' + (handshake.skills || 'unknown') + ' state=' + (handshake.state || 'unknown')
    + ' cli=' + (handshake.cliMatchesState ? 'match' : 'mismatch') + ' verdict=' + (handshake.verdict || 'UNKNOWN');
}

function statusLine(version, mode, gates, discovery, handshake) {
  const parts = ['FF ' + version + '（' + mode + '）', 'gates=' + gates];
  if (discovery) parts.push('discovery=' + discovery);
  if (handshake) parts.push('handshake=' + handshake);
  return parts.join('；');
}

function gateLabel(gate) {
  const labels = { missing: 'missing', disabled: 'disabled', invalid: 'invalid', blocked: 'blocked', valid: 'configured', unavailable: 'unavailable' };
  return labels[gate.state] || gate.state;
}

// 轻量状态摘要：优先 doctor.mjs（含 discovery/handshake/gates），否则回退 status --json。
export function statusSummary(project, settings) {
  const root = typeof project === 'string' && project ? path.resolve(project) : process.cwd();
  const result = { source: 'none', project: root, version: 'unknown', mode: 'unknown', gates: 'unknown', discovery: '', handshake: '', note: '', summary: '' };
  let state = null;
  try { state = JSON.parse(fs.readFileSync(path.join(root, '.forgeflow/install/state.json'), 'utf8')); } catch { state = null; }
  if (!state) {
    const gate = evaluateGate(root, settings);
    result.source = gate.state === 'missing' ? 'none' : 'status';
    result.gates = gateLabel(gate);
    result.note = gate.state === 'missing'
      ? '未检测到 ForgeFlow 安装（.forgeflow/install/state.json 与 .forgeflow/ff-spec.mjs 都不存在）；先运行安装器。'
      : '存在 FF CLI 但没有可读的安装状态；运行 node .forgeflow/install/doctor.mjs 排查。';
    result.summary = 'FF 未安装：' + result.note;
    return result;
  }
  result.version = state.version || 'unknown';
  result.mode = state.mode || 'unknown';
  const hosts = Array.isArray(state.hosts) ? state.hosts : state.host ? [state.host] : [];
  if (state.mode !== 'full') {
    result.source = 'state';
    result.gates = 'blocked（skills-only 安装没有 CLI 门禁；full 安装后可用）';
    result.note = 'skills-only 安装只有技能，没有本地 CLI 门禁；doctor 与 ff-spec.mjs 会返回 BLOCKED。';
    result.summary = statusLine(result.version, result.mode, result.gates, '', '');
    return result;
  }
  const doctor = path.join(root, DOCTOR);
  if (fs.existsSync(doctor)) {
    const args = hosts.includes('dsh') ? ['--host', 'dsh'] : [];
    const run = spawnNode(root, doctor, args, settings.timeoutMs);
    if (run.status === 0) {
      try {
        const report = JSON.parse(run.stdout);
        result.source = 'doctor';
        result.version = report.version || result.version;
        result.mode = report.mode || result.mode;
        result.gates = describeGates(report.gates);
        result.discovery = describeDiscovery(report.discovery);
        result.handshake = describeHandshake(report.handshake);
        result.note = report.status ? 'doctor=' + report.status : '';
        result.summary = statusLine(result.version, result.mode, result.gates, result.discovery, result.handshake);
        return result;
      } catch {
        // doctor 输出异常时继续走 status 回退。
      }
    } else {
      const first = typeof run.stderr === 'string' ? run.stderr.trim().split(/\r?\n/)[0] : '';
      result.note = 'doctor 执行失败：' + (first || '未知错误');
    }
  }
  const gate = evaluateGate(root, settings);
  result.source = 'status';
  result.gates = gateLabel(gate);
  if (gate.state === 'invalid') result.note = gate.reasons.join('；');
  else if (gate.state === 'blocked') result.note = gate.reasons.slice(0, 3).join('；');
  else if (gate.report && gate.report.openspec === false) result.note = 'openspec/ 不存在：FF 门禁未启用，archive 只打印提示。';
  result.summary = statusLine(result.version, result.mode, result.gates, '', '');
  return result;
}

// 门禁摘要：没有 openspec/ff-policy.json 时明确返回 disabled。
export function gateSummary(project, settings) {
  const root = typeof project === 'string' && project ? path.resolve(project) : process.cwd();
  const result = { project: root, ff: 'missing', gates: 'missing', blocked: '', reasons: '', note: '', summary: '' };
  if (!fs.existsSync(path.join(root, FF_SPEC))) {
    result.note = '项目内没有 .forgeflow/ff-spec.mjs：不拦截 archive，也没有可评估的门禁。';
    result.summary = 'FF 未安装：' + result.note;
    return result;
  }
  result.ff = 'present';
  const gate = evaluateGate(root, settings);
  result.gates = gateLabel(gate);
  result.blocked = gate.blocked.join(', ');
  result.reasons = gate.reasons.join('；');
  if (gate.state === 'blocked') result.note = '以下 change 未通过门禁：archive 会被本地插件拦截。';
  else if (gate.state === 'invalid') result.note = 'openspec/ff-policy.json 无效：archive 会被本地插件拦截。';
  else if (gate.state === 'valid') result.note = '门禁已配置且当前没有阻塞的 change。';
  else if (gate.state === 'disabled') result.note = 'openspec/ff-policy.json 不存在：门禁未启用，archive 只打印提示。';
  else if (gate.state === 'unavailable') result.note = '无法评估门禁（FF CLI 不可用）；本地守卫不会拦截。';
  result.summary = 'FF 门禁=' + result.gates + (result.blocked ? '；blocked=' + result.blocked : '') + (result.reasons ? '；' + result.reasons : '');
  return result;
}

const STATUS_PARAMETERS = {
  type: 'object',
  properties: {
    project: { type: 'string', description: '项目根目录；省略时从会话工作目录向上查找 .forgeflow' },
  },
  additionalProperties: false,
};

function outputSchema(properties) {
  return { type: 'object', properties, required: Object.keys(properties), additionalProperties: false };
}

const STATUS_OUTPUT = outputSchema({
  summary: { type: 'string', description: '一行摘要' },
  source: { type: 'string' },
  project: { type: 'string' },
  version: { type: 'string' },
  mode: { type: 'string' },
  gates: { type: 'string' },
  discovery: { type: 'string' },
  handshake: { type: 'string' },
  note: { type: 'string' },
});

const GATE_OUTPUT = outputSchema({
  summary: { type: 'string', description: '一行摘要' },
  project: { type: 'string' },
  ff: { type: 'string' },
  gates: { type: 'string' },
  blocked: { type: 'string' },
  reasons: { type: 'string' },
  note: { type: 'string' },
});

function renderText(_args, value) {
  return [{ type: 'text', text: value && typeof value.summary === 'string' ? value.summary : 'ForgeFlow 状态不可用' }];
}

function resolveProject(ctx, args, exec, settings) {
  if (args && typeof args.project === 'string' && args.project.trim()) return path.resolve(args.project.trim());
  return discoverProject(sessionDirectory(ctx, exec, settings));
}

export function registerTools(ctx, settings) {
  const disposers = [];
  disposers.push(ctx.tools.register({
    name: 'ff_status',
    description: '只读汇总当前项目的 ForgeFlow 安装状态、门禁、discovery 与 handshake；不构建、不改文件。',
    parameters: STATUS_PARAMETERS,
    output: { schema: STATUS_OUTPUT, render: renderText },
    presentCall: () => ({ card: 'generic', title: 'ForgeFlow 状态', kind: 'read' }),
    execute: (args, exec) => statusSummary(resolveProject(ctx, args, exec, settings), settings),
  }));
  disposers.push(ctx.tools.register({
    name: 'ff_gate',
    description: '只读检查 openspec/ff-policy.json 和当前 change 的 FF 门禁，列出 blocked 与原因；无 openspec 时返回 disabled。',
    parameters: STATUS_PARAMETERS,
    output: { schema: GATE_OUTPUT, render: renderText },
    presentCall: () => ({ card: 'generic', title: 'ForgeFlow 门禁', kind: 'read' }),
    execute: (args, exec) => gateSummary(resolveProject(ctx, args, exec, settings), settings),
  }));
  return disposers.filter(disposer => typeof disposer === 'function');
}

function registerCommand(ctx, settings) {
  try {
    if (typeof ctx.inject !== 'function') return;
    ctx.inject(['commands'], child => {
      const commands = child && child.commands ? child.commands : ctx.commands;
      if (!commands || typeof commands.register !== 'function') return;
      commands.register({
        name: 'ff-status',
        description: '查看 ForgeFlow 安装状态与门禁',
        handler: invocation => {
          try {
            const report = statusSummary(discoverProject(sessionDirectory(ctx, invocation, settings)), settings);
            return { kind: 'success', text: report.summary };
          } catch (error) {
            return { kind: 'error', text: 'ForgeFlow 状态读取失败：' + (error && error.message ? error.message : String(error)) };
          }
        },
      });
    });
  } catch {
    // commands 服务不可用时安全降级：只保留两个工具。
  }
}

// 把四层失效自检挂成常驻 systemPrompt 段；没有该服务的宿主静默跳过。
function registerAnchor(ctx, settings, disposers) {
  if (!settings.anchor) return;
  try {
    let prompt = null;
    try {
      if (ctx && typeof ctx.get === 'function') prompt = ctx.get('systemPrompt');
    } catch {}
    if (!prompt && ctx) prompt = ctx.systemPrompt;
    if (!prompt || typeof prompt.section !== 'function') return;
    const disposer = prompt.section({
      name: 'forgeflow:four-layer',
      order: 240,
      text: FOUR_LAYER_ANCHOR,
    });
    if (typeof disposer === 'function') disposers.push(disposer);
  } catch {
    // 宿主不支持 systemPrompt 时不影响工具与守卫。
  }
}

export function apply(ctx, config = {}) {
  const settings = normalizeSettings(config);
  const setup = () => {
    const disposers = registerTools(ctx, settings);
    registerAnchor(ctx, settings, disposers);
    const off = ctx.on('tools/pre-execute', createGuard(ctx, settings), { prepend: true });
    if (typeof off === 'function') disposers.push(off);
    return () => {
      for (const dispose of disposers.reverse()) {
        try { dispose(); } catch {}
      }
    };
  };
  if (typeof ctx.effect === 'function') ctx.effect(setup);
  else setup();
  registerCommand(ctx, settings);
}
