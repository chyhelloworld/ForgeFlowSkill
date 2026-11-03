#!/usr/bin/env node
/**
 * ff-reviewer.mjs — 把「独立审查」指向可配置的外部审查后端。
 *
 * 只负责一件事：按项目配置调用 codex exec 或 claude -p，把审查者原始回答
 * 和调用元数据写成可复核的记录。它不自动修改代码、不自动接受审查结论，
 * 也不把后端模型的身份当成密码学证明。
 *
 * 配置默认是 openspec/ff-review.json，用法见 --help 或 docs/user/review-backends.md。
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';

export const VERSION = '0.9.13-dsh.1';
export const DEFAULT_CONFIG = 'openspec/ff-review.json';
export const BACKENDS = ['codex', 'claude'];
const REASONING = {
  codex: ['minimal', 'low', 'medium', 'high', 'xhigh'],
  claude: ['low', 'medium', 'high', 'xhigh', 'max'],
};
const DEFAULT_TIMEOUT_SECONDS = 900;
const MAX_TIMEOUT_SECONDS = 3600;
const NL = String.fromCharCode(10);

export class ReviewError extends Error {
  constructor(message, code = 2) {
    super(message);
    this.name = 'ReviewError';
    this.exitCode = code;
  }
}

function fail(message, code = 2) {
  throw new ReviewError(message, code);
}

export function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function readText(file) {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch (error) {
    fail('读取失败：' + file + '（' + error.message + '）');
  }
}

function readJson(file) {
  let text;
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch (error) {
    fail('读取配置失败：' + file + '（' + error.message + '）');
  }
  try {
    return JSON.parse(text);
  } catch (error) {
    fail('配置不是合法 JSON：' + file + '（' + error.message + '）');
  }
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + NL);
}

function writeText(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, value);
}

function relativeDisplay(project, file) {
  const rel = path.relative(project, file);
  if (rel && !rel.startsWith('..') && !path.isAbsolute(rel)) return rel.split(path.sep).join('/');
  return file;
}

function isString(value) {
  return typeof value === 'string' && value.length > 0;
}

export function parseArgs(argv) {
  const options = {};
  const booleans = new Set(['json', 'help', 'force']);
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith('--')) fail('未知参数：' + arg);
    const key = arg.slice(2);
    if (booleans.has(key)) {
      options[key] = true;
      continue;
    }
    const value = argv[index + 1];
    if (value === undefined || value.startsWith('--')) fail('参数 ' + arg + ' 缺少值');
    options[key] = value;
    index += 1;
  }
  return options;
}

function resolveProject(options) {
  const project = path.resolve(options.project || process.cwd());
  let stat;
  try {
    stat = fs.statSync(project);
  } catch (error) {
    fail('项目目录不存在：' + project);
  }
  if (!stat.isDirectory()) fail('项目路径不是目录：' + project);
  return project;
}

export function configPath(project, options = {}) {
  if (isString(options.config)) return path.resolve(project, options.config);
  return path.join(project, DEFAULT_CONFIG);
}

function validateBackend(value) {
  if (!BACKENDS.includes(value)) fail('backend 只能是 ' + BACKENDS.join(' 或 ') + '，收到：' + String(value));
  return value;
}

function validateModel(value) {
  if (value === undefined || value === null || value === '') return undefined;
  if (!isString(value) || !/^[A-Za-z0-9][A-Za-z0-9._:@/-]{0,199}$/.test(value)) {
    fail('model 只能包含字母、数字、点、下划线、冒号、@、斜杠或连字符，且以字母/数字开头');
  }
  return value;
}

function validateReasoning(value, backend) {
  if (value === undefined || value === null || value === '') return undefined;
  const allowed = REASONING[backend];
  if (!allowed.includes(value)) fail('backend=' + backend + ' 的 reasoning 只能是 ' + allowed.join('/') + '，收到：' + String(value));
  return value;
}

function validateTimeout(value) {
  if (value === undefined || value === null || value === '') return DEFAULT_TIMEOUT_SECONDS;
  const number = typeof value === 'number' ? value : Number(value);
  if (!Number.isInteger(number) || number < 1 || number > MAX_TIMEOUT_SECONDS) fail('timeoutSeconds 必须是 1..' + MAX_TIMEOUT_SECONDS + ' 的整数');
  return number;
}

function validateCommand(value, backend) {
  if (value === undefined || value === null || value === '') return backend === 'codex' ? 'codex' : 'claude';
  if (!isString(value) || value.includes(String.fromCharCode(0)) || /[\r\n]/.test(value)) fail('command 必须是单行可执行文件名或路径');
  return value;
}

export function normalizeConfig(raw, source = 'config') {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) fail(source + ' 必须是 JSON 对象');
  if (raw.version !== 1) fail(source + ' 的 version 必须是 1');
  if (raw.enabled !== undefined && typeof raw.enabled !== 'boolean') fail(source + ' 的 enabled 必须是布尔值');
  const backend = validateBackend(raw.backend);
  const model = validateModel(raw.model);
  const reasoning = validateReasoning(raw.reasoning, backend);
  const timeoutSeconds = validateTimeout(raw.timeoutSeconds);
  const command = validateCommand(raw.command, backend);
  const config = { version: 1, enabled: raw.enabled !== false, backend, command, timeoutSeconds };
  if (model) config.model = model;
  if (reasoning) config.reasoning = reasoning;
  return config;
}

function overrideValue(options, flags, env, envName, current) {
  for (const flag of flags) {
    if (options[flag] !== undefined) return options[flag];
  }
  if (env[envName] !== undefined && env[envName] !== '') return env[envName];
  return current;
}

export function applyOverrides(config, options = {}, env = process.env) {
  const backend = validateBackend(overrideValue(options, ['backend'], env, 'FF_REVIEW_BACKEND', config.backend));
  const backendChanged = backend !== config.backend;
  // 后端一旦被覆盖，codex/claude 专属的默认命令、模型名与强度档位不能沿用到另一后端。
  // 只有显式覆盖（CLI 或 FF_REVIEW_* 环境变量）才保留；否则回落到新后端的默认值。
  const modelOverride = overrideValue(options, ['model'], env, 'FF_REVIEW_MODEL', undefined);
  const model = validateModel(modelOverride !== undefined ? modelOverride : (backendChanged ? undefined : config.model));
  const reasoningOverride = overrideValue(options, ['reasoning'], env, 'FF_REVIEW_REASONING', undefined);
  const reasoning = validateReasoning(reasoningOverride !== undefined ? reasoningOverride : (backendChanged ? undefined : config.reasoning), backend);
  const timeoutSeconds = validateTimeout(overrideValue(options, ['timeout-seconds'], env, 'FF_REVIEW_TIMEOUT_SECONDS', config.timeoutSeconds));
  const commandOverride = overrideValue(options, ['command'], env, 'FF_REVIEW_COMMAND', undefined);
  const command = validateCommand(commandOverride !== undefined ? commandOverride : (backendChanged ? undefined : config.command), backend);
  const next = { version: 1, enabled: config.enabled, backend, command, timeoutSeconds };
  if (model) next.model = model;
  if (reasoning) next.reasoning = reasoning;
  return next;
}

export function loadConfig(project, options = {}, env = process.env) {
  const file = configPath(project, options);
  if (!fs.existsSync(file)) fail('找不到审查配置：' + file + '。先运行 ff-reviewer.mjs init，或手动创建该文件。');
  const text = readText(file);
  let raw;
  try {
    raw = JSON.parse(text);
  } catch (error) {
    fail('配置不是合法 JSON：' + file + '（' + error.message + '）');
  }
  const config = applyOverrides(normalizeConfig(raw, file), options, env);
  return { config, configPath: file, configSha256: sha256(text) };
}

function invocationFor(command) {
  if (process.platform !== 'win32') return { file: command, args: [] };
  if (/\.exe$/i.test(command)) return { file: command, args: [] };
  if (/\.(cmd|bat)$/i.test(command) && fs.existsSync(command)) return { file: process.env.ComSpec || 'cmd.exe', args: [] , shellCommand: command };
  const probe = spawnSync('where', [command], { encoding: 'utf8', windowsHide: true, shell: false });
  if (probe.status === 0) {
    const candidates = String(probe.stdout || '').split(/\r?\n/).map(item => item.trim()).filter(Boolean);
    const exe = candidates.find(item => /\.exe$/i.test(item));
    if (exe) return { file: exe, args: [] };
    const script = candidates.find(item => /\.(cmd|bat)$/i.test(item));
    if (script) return { file: process.env.ComSpec || 'cmd.exe', args: [], shellCommand: script };
  }
  return { file: command, args: [] };
}

function cmdQuote(value) {
  if (value === '') return '""';
  if (!/[\s"&|<>^]/.test(value)) return value;
  return '"' + value.replace(/"/g, '""') + '"';
}

function buildWindowsInvocation(command, args) {
  const base = invocationFor(command);
  if (base.shellCommand) {
    const line = [cmdQuote(base.shellCommand), ...args.map(cmdQuote)].join(' ');
    return { file: base.file, args: ['/d', '/s', '/c', '"' + line + '"'], verbatim: true };
  }
  if (!/\.exe$/i.test(base.file) && !path.isAbsolute(base.file)) {
    // A bare command may still be a .cmd shim; let cmd.exe resolve it.
    const line = [cmdQuote(base.file), ...args.map(cmdQuote)].join(' ');
    return { file: process.env.ComSpec || 'cmd.exe', args: ['/d', '/s', '/c', '"' + line + '"'], verbatim: true };
  }
  return { file: base.file, args };
}

export function buildCodexArgs(config, lastMessageFile) {
  const args = ['exec', '--skip-git-repo-check', '--sandbox', 'read-only', '--ephemeral', '--color', 'never'];
  if (lastMessageFile) args.push('-o', lastMessageFile);
  if (config.model) args.push('-m', config.model);
  if (config.reasoning) args.push('-c', 'model_reasoning_effort=' + config.reasoning);
  args.push('-');
  return args;
}

export function buildClaudeArgs(config) {
  const args = ['-p', '--output-format', 'json', '--permission-mode', 'plan', '--permission-prompts', 'none', '--no-session-persistence', '--bare', '--strict-mcp-config'];
  if (config.model) args.push('--model', config.model);
  if (config.reasoning) args.push('--effort', config.reasoning);
  return args;
}

export function buildPrompt(project, briefPath, brief) {
  const display = relativeDisplay(project, briefPath);
  return [
    '你是 ForgeFlow 的独立审查者，由 ff-reviewer 以只读方式调用。',
    '只审查下面给出的材料；不要修改任何文件，不要执行写操作、安装命令或提交。需要查看文件时只做只读读取。',
    '项目根：' + project,
    '审查材料文件：' + display,
    '',
    '--- 审查材料开始 ---',
    brief.trim(),
    '--- 审查材料结束 ---',
    '',
    '按 ForgeFlow 的三类判断分别核对：目标/主要流程、计划覆盖、实现质量。',
    '关键原文缺失时判 needs-evidence；不要让摘要代替原文，不要把测试通过数量当作目标通过。',
    '你的结论会记录为 L2（不同模型）独立审查；不要声称这是人工审查、用户接受或已获得合并授权。',
    '只返回一个 JSON 对象，不要 Markdown 代码围栏，不要额外文字。格式：',
    '{"verdict":"pass|fail|needs-evidence","summary":"一两句话","findings":[{"id":"F1","severity":"blocker|major|minor","claim":"具体问题","evidence":"文件:行或原文引用","recommendation":"最小修复"}],"notes":["未验证事项"]}',
  ].join(NL);
}

export function parseReviewerMessage(text) {
  let value = String(text || '').trim();
  const fenced = value.match(/^```(?:json)?\s*([\s\S]*?)```$/i);
  if (fenced) value = fenced[1].trim();
  const start = value.indexOf('{');
  const end = value.lastIndexOf('}');
  if (start < 0 || end <= start) return { ok: false, error: '审查者输出中没有 JSON 对象' };
  let parsed;
  try {
    parsed = JSON.parse(value.slice(start, end + 1));
  } catch (error) {
    return { ok: false, error: '审查者 JSON 无法解析：' + error.message };
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return { ok: false, error: '审查者 JSON 必须是对象' };
  const verdict = String(parsed.verdict || '').toLowerCase();
  if (!['pass', 'fail', 'needs-evidence'].includes(verdict)) return { ok: false, error: 'verdict 必须是 pass、fail 或 needs-evidence' };
  const rawFindings = parsed.findings === undefined ? [] : parsed.findings;
  if (!Array.isArray(rawFindings)) return { ok: false, error: 'findings 必须是数组' };
  const findings = [];
  for (let index = 0; index < rawFindings.length; index += 1) {
    const item = rawFindings[index];
    if (!item || typeof item !== 'object' || Array.isArray(item)) return { ok: false, error: 'findings[' + index + '] 必须是对象' };
    const severity = String(item.severity || '').toLowerCase();
    if (!['blocker', 'major', 'minor'].includes(severity)) return { ok: false, error: 'findings[' + index + '].severity 必须是 blocker、major 或 minor' };
    const claim = typeof item.claim === 'string' ? item.claim.trim() : '';
    if (!claim) return { ok: false, error: 'findings[' + index + '].claim 不能为空' };
    findings.push({
      id: typeof item.id === 'string' && item.id.trim() ? item.id.trim() : 'F' + (index + 1),
      severity,
      claim,
      evidence: typeof item.evidence === 'string' ? item.evidence.trim() : '',
      recommendation: typeof item.recommendation === 'string' ? item.recommendation.trim() : '',
    });
  }
  const notes = Array.isArray(parsed.notes) ? parsed.notes.filter(note => typeof note === 'string' && note.trim()).map(note => note.trim()) : [];
  return {
    ok: true,
    verdict,
    summary: typeof parsed.summary === 'string' ? parsed.summary.trim() : '',
    findings,
    notes,
  };
}

function extractClaudePayload(stdout) {
  const text = String(stdout || '').trim();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function authHint(backend, env = process.env) {
  if (backend === 'claude') {
    if (env.ANTHROPIC_API_KEY) return 'ANTHROPIC_API_KEY 已设置；token 有效性未验证';
    const file = path.join(os.homedir(), '.claude', '.credentials.json');
    if (fs.existsSync(file)) return '~/.claude/.credentials.json 存在；登录有效性未验证';
    return 'Claude CLI 可能未登录；先在终端运行 claude 并 /login，或设置 ANTHROPIC_API_KEY';
  }
  const file = path.join(os.homedir(), '.codex', 'auth.json');
  if (fs.existsSync(file)) return '~/.codex/auth.json 存在；token 有效性未验证';
  return 'Codex CLI 可能未登录；先运行 codex login';
}

function commandProbe(command) {
  const invocation = process.platform === 'win32' ? buildWindowsInvocation(command, ['--version']) : { file: command, args: ['--version'] };
  const result = spawnSync(invocation.file, invocation.args, { encoding: 'utf8', timeout: 15000, windowsHide: true, shell: false, windowsVerbatimArguments: Boolean(invocation.verbatim) });
  if (result.error) return { available: false, error: result.error.message };
  return { available: result.status === 0, status: result.status, output: String(result.stdout || result.stderr || '').trim().split(/\r?\n/)[0] };
}

export function check(options = {}, env = process.env) {
  const project = resolveProject(options);
  const file = configPath(project, options);
  if (!fs.existsSync(file)) {
    const data = { tool: 'ff-reviewer', version: VERSION, config: file, configExists: false, enabled: false };
    return { code: 2, data, lines: ['配置不存在：' + file, '运行：node .forgeflow/ff-reviewer.mjs init'] };
  }
  const loaded = loadConfig(project, options, env);
  const config = loaded.config;
  const command = config.command || config.backend;
  const probe = commandProbe(command);
  const data = {
    tool: 'ff-reviewer',
    version: VERSION,
    config: file,
    configExists: true,
    configSha256: loaded.configSha256,
    enabled: config.enabled,
    backend: config.backend,
    model: config.model || 'default',
    reasoning: config.reasoning || 'default',
    command,
    available: probe.available,
    commandVersion: probe.output || '',
    authHint: authHint(config.backend, env),
  };
  const lines = [
    'config=' + file,
    'enabled=' + config.enabled,
    'backend=' + config.backend + ' model=' + (config.model || 'default') + ' reasoning=' + (config.reasoning || 'default'),
    'command=' + command + ' available=' + probe.available,
    'authHint=' + data.authHint,
  ];
  if (probe.error) lines.push('commandError=' + probe.error);
  return { code: probe.available ? 0 : 1, data, lines };
}

export function init(options = {}) {
  const project = resolveProject(options);
  const file = configPath(project, options);
  if (fs.existsSync(file)) fail('配置已存在，拒绝覆盖：' + file);
  const backend = options.backend ? validateBackend(options.backend) : 'codex';
  const reasoning = options.reasoning ? validateReasoning(options.reasoning, backend) : 'high';
  const model = validateModel(options.model);
  const timeoutSeconds = validateTimeout(options['timeout-seconds']);
  const command = validateCommand(options.command, backend);
  const config = { version: 1, enabled: true, backend, command, timeoutSeconds };
  if (model) config.model = model;
  if (reasoning) config.reasoning = reasoning;
  writeJson(file, config);
  return { code: 0, data: { tool: 'ff-reviewer', version: VERSION, config: file, ...config }, lines: ['已写入 ' + file] };
}

function terminate(child) {
  if (!child || !child.pid) return;
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
    return;
  }
  try { child.kill('SIGTERM'); } catch {}
  const timer = setTimeout(() => { try { child.kill('SIGKILL'); } catch {} }, 2000);
  if (typeof timer.unref === 'function') timer.unref();
}

export function runProcess(invocation, options = {}) {
  return new Promise(resolve => {
    let child;
    try {
      child = spawn(invocation.file, invocation.args, {
        cwd: options.cwd,
        env: options.env || process.env,
        windowsHide: true,
        windowsVerbatimArguments: Boolean(invocation.verbatim),
        stdio: ['pipe', 'pipe', 'pipe'],
      });
    } catch (error) {
      resolve({ error, stdout: '', stderr: '', timedOut: false });
      return;
    }
    let stdout = '';
    let stderr = '';
    let settled = false;
    let timedOut = false;
    const finish = result => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ ...result, stdout, stderr, timedOut });
    };
    const timer = setTimeout(() => {
      timedOut = true;
      terminate(child);
      setTimeout(() => finish({ error: new Error('审查进程超时'), timedOut: true }), 5000);
    }, options.timeoutMs);
    child.stdout.on('data', chunk => { stdout += chunk.toString(); });
    child.stderr.on('data', chunk => { stderr += chunk.toString(); });
    child.on('error', error => finish({ error }));
    child.on('close', (status, signal) => finish({ status, signal }));
    child.stdin.on('error', () => {});
    child.stdin.end(options.input || '');
  });
}

function backendInvocation(config, lastMessageFile) {
  if (config.backend === 'codex') {
    const args = buildCodexArgs(config, lastMessageFile);
    return { command: config.command || 'codex', args };
  }
  const args = buildClaudeArgs(config);
  return { command: config.command || 'claude', args };
}

async function execute(config, prompt, options) {
  const invocation = backendInvocation(config, options.lastMessageFile);
  const built = process.platform === 'win32' ? buildWindowsInvocation(invocation.command, invocation.args) : { file: invocation.command, args: invocation.args };
  return {
    command: invocation.command,
    args: invocation.args,
    result: await runProcess(built, { cwd: options.cwd, input: prompt, timeoutMs: options.timeoutMs, env: options.env }),
  };
}

function finalMessage(backend, result, lastMessageFile) {
  if (backend === 'codex') {
    if (lastMessageFile && fs.existsSync(lastMessageFile)) {
      const text = fs.readFileSync(lastMessageFile, 'utf8').trim();
      if (text) return { text, payload: null };
    }
    return { text: String(result.stdout || '').trim(), payload: null };
  }
  const payload = extractClaudePayload(result.stdout);
  if (payload && payload.is_error) {
    return { text: String(payload.result || '').trim(), payload, error: String(payload.result || 'Claude 返回 is_error') };
  }
  if (payload && typeof payload.result === 'string') return { text: payload.result.trim(), payload };
  return { text: String(result.stdout || '').trim(), payload, error: payload ? undefined : 'Claude stdout 不是 JSON' };
}

export async function run(options = {}, env = process.env) {
  const project = resolveProject(options);
  if (!isString(options.brief)) fail('run 需要 --brief <审查材料文件>');
  if (!isString(options.out)) fail('run 需要 --out <记录基名>');
  const briefPath = path.resolve(project, options.brief);
  if (!fs.existsSync(briefPath) || !fs.statSync(briefPath).isFile()) fail('审查材料不存在：' + briefPath);
  const brief = readText(briefPath);
  if (!brief.trim()) fail('审查材料为空：' + briefPath);
  const loaded = loadConfig(project, options, env);
  const config = loaded.config;
  if (!config.enabled) fail('审查配置 enabled=false；没有调用后端');
  const outBase = path.resolve(project, options.out);
  if (outBase.endsWith(path.sep) || (fs.existsSync(outBase) && fs.statSync(outBase).isDirectory())) fail('--out 必须是记录文件的基名，不是目录');
  const recordFile = outBase + '.json';
  const rawFile = outBase + '.md';
  if (!options.force && (fs.existsSync(recordFile) || fs.existsSync(rawFile))) fail('记录已存在，拒绝覆盖：' + recordFile + '（需要覆盖加 --force）');
  fs.mkdirSync(path.dirname(outBase), { recursive: true });
  const startedAt = new Date().toISOString();
  const started = Date.now();
  const prompt = buildPrompt(project, briefPath, brief);
  const lastMessageFile = outBase + '.last.txt';
  const execution = await execute(config, prompt, { cwd: project, timeoutMs: config.timeoutSeconds * 1000, lastMessageFile, env });
  const result = execution.result;
  const extracted = finalMessage(config.backend, result, lastMessageFile);
  const rawText = extracted.text || String(result.stdout || result.stderr || '').trim();
  writeText(rawFile, rawText + (rawText.endsWith(NL) ? '' : NL));
  const stdoutFile = outBase + '.stdout.txt';
  const stderrFile = outBase + '.stderr.txt';
  if (result.stdout) writeText(stdoutFile, result.stdout); else if (fs.existsSync(stdoutFile)) fs.unlinkSync(stdoutFile);
  if (result.stderr) writeText(stderrFile, result.stderr); else if (fs.existsSync(stderrFile)) fs.unlinkSync(stderrFile);
  if (fs.existsSync(lastMessageFile)) fs.unlinkSync(lastMessageFile);
  const parsed = parseReviewerMessage(rawText);
  let failure = extracted.error;
  if (result.timedOut) failure = '审查进程超过 ' + config.timeoutSeconds + ' 秒未结束';
  else if (result.error) failure = result.error.message;
  else if (result.status !== 0) failure = '审查后端退出码 ' + String(result.status);
  else if (!rawText) failure = '审查后端没有返回内容';
  else if (!parsed.ok) failure = parsed.error;
  const durationMs = Date.now() - started;
  const usage = extracted.payload && extracted.payload.usage ? extracted.payload.usage : null;
  const costUsd = extracted.payload && typeof extracted.payload.total_cost_usd === 'number' ? extracted.payload.total_cost_usd : null;
  const record = {
    schema: 'ff-reviewer-v1',
    tool: 'ff-reviewer',
    version: VERSION,
    backend: config.backend,
    model: config.model || 'default',
    reasoning: config.reasoning || 'default',
    reviewer: config.backend + ':' + (config.model || 'default'),
    independence: 'L2',
    independenceNote: '不同模型厂商的独立审查；由配置声明，ff-reviewer 不验证模型身份或账号。',
    project,
    brief: { path: relativeDisplay(project, briefPath), sha256: sha256(brief) },
    config: { path: relativeDisplay(project, loaded.configPath), sha256: loaded.configSha256 },
    startedAt,
    finishedAt: new Date().toISOString(),
    durationMs,
    timeoutSeconds: config.timeoutSeconds,
    command: [execution.command, ...execution.args],
    exitCode: result.status === undefined ? null : result.status,
    timedOut: Boolean(result.timedOut),
    verdict: parsed.ok ? parsed.verdict : 'unparsed',
    summary: parsed.ok ? parsed.summary : '',
    findings: parsed.ok ? parsed.findings : [],
    notes: parsed.ok ? parsed.notes : [],
    parseError: parsed.ok ? null : parsed.error,
    raw: { path: relativeDisplay(project, rawFile), sha256: sha256(rawText) },
    logs: {
      stdout: result.stdout ? relativeDisplay(project, stdoutFile) : null,
      stderr: result.stderr ? relativeDisplay(project, stderrFile) : null,
    },
    usage,
    costUsd,
    error: failure || null,
    unverified: [
      '后端模型身份与账号由配置和 CLI 登录状态决定，未做密码学验证',
      '只读限制依赖后端参数（codex --sandbox read-only / claude --permission-mode plan），ff-reviewer 不验证文件是否被修改',
      '审查结论不等于用户接受、合并或发布授权',
    ],
  };
  writeJson(recordFile, record);
  const lines = [
    'backend=' + record.backend + ' model=' + record.model + ' reasoning=' + record.reasoning,
    'verdict=' + record.verdict + ' findings=' + record.findings.length + ' duration_ms=' + durationMs,
    'record=' + relativeDisplay(project, recordFile),
    'raw=' + relativeDisplay(project, rawFile),
  ];
  if (record.error) lines.push('error=' + record.error);
  const code = failure ? (/没有 JSON 对象|JSON 无法解析|verdict 必须|findings|审查者输出/.test(failure) ? 4 : 3) : 0;
  return { code, data: record, lines };
}

function usage() {
  return [
    'ff-reviewer ' + VERSION + ' — 可配置的独立审查后端调用器（只读）',
    '',
    '用法：',
    '  ff-reviewer.mjs init   [--project <dir>] [--config <file>] [--backend codex|claude]',
    '                         [--model <model>] [--reasoning <level>] [--timeout-seconds <n>]',
    '  ff-reviewer.mjs check  [--project <dir>] [--config <file>] [--json]',
    '  ff-reviewer.mjs run    --brief <file> --out <base> [--project <dir>] [--config <file>]',
    '                         [--backend codex|claude] [--model <model>] [--reasoning <level>]',
    '                         [--timeout-seconds <n>] [--command <exe>] [--force] [--json]',
    '  ff-reviewer.mjs version',
    '',
    '配置默认：<project>/openspec/ff-review.json',
    'reasoning: codex=minimal/low/medium/high/xhigh; claude=low/medium/high/xhigh/max',
    'run 写出 <base>.json、<base>.md，以及（有输出时）<base>.stdout.txt / <base>.stderr.txt。',
    '后端失败或输出不是合法审查 JSON 时返回非零，但仍保留原始记录。',
  ].join(NL);
}

export async function main(argv = process.argv.slice(2), env = process.env) {
  if (!argv.length || argv[0] === '--help' || argv[0] === '-h') return { code: 0, lines: [usage()] };
  const verb = argv[0];
  const options = parseArgs(argv.slice(1));
  if (options.help) return { code: 0, lines: [usage()] };
  let result;
  if (verb === 'version' || verb === '--version') result = { code: 0, data: { version: VERSION }, lines: ['ff-reviewer ' + VERSION] };
  else if (verb === 'init') result = init(options);
  else if (verb === 'check') result = check(options, env);
  else if (verb === 'run') result = await run(options, env);
  else fail('未知命令：' + verb + '（可用：init/check/run/version）');
  const payload = options.json ? [JSON.stringify(result.data)] : result.lines;
  return { code: result.code, lines: payload };
}

if (process.argv[1] && path.basename(process.argv[1]) === 'ff-reviewer.mjs') {
  main().then(result => {
    for (const line of result.lines) console.log(line);
    process.exitCode = result.code;
  }).catch(error => {
    console.error('Error: ' + error.message);
    process.exitCode = error.exitCode || 1;
  });
}
