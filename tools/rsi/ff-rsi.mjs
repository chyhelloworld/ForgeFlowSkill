#!/usr/bin/env node
/**
 * ff-rsi.mjs — 有界的「复盘 → 候选 → 对照 → 审核 → 晋级记录」证据绑定工具。
 *
 * 它不是自动晋级引擎：compare 只校验你提供的观测，promote 只写记录不激活，
 * 没有任何命令会修改技能、安装目录、policy 或全局指令。状态由文件哈希推导，
 * 不保存 status 字段，因此不存在第二套状态库。
 *
 * 用法见 --help 或 docs/user/rsi.md。
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export const VERSION = '0.9.12-dsh.1';
const VERDICTS = ['PASS', 'FAIL', 'SKIP', 'NOT_RUN', 'NO_EFFECT'];
const NL = String.fromCharCode(10);

function fail(message, code = 2) {
  const error = new Error(message);
  error.exitCode = code;
  throw error;
}

function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeOnce(file, value) {
  if (fs.existsSync(file)) fail('拒绝覆盖已存在的 ' + path.basename(file) + '；需要新记录请开新的 run 目录。');
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + NL);
}

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith('--')) fail('未知参数：' + arg);
    const key = arg.slice(2);
    if (key === 'json' || key === 'help') {
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

function listTree(root) {
  const out = [];
  function walk(dir, prefix) {
    for (const name of fs.readdirSync(dir).sort()) {
      const full = path.join(dir, name);
      const rel = prefix ? prefix + '/' + name : name;
      const stat = fs.lstatSync(full);
      if (stat.isSymbolicLink()) fail('候选/base 不能包含符号链接：' + rel);
      if (stat.isDirectory()) walk(full, rel);
      else if (stat.isFile()) out.push({ path: rel, sha256: sha256(fs.readFileSync(full)) });
    }
  }
  walk(root, '');
  return out;
}

export function treeHash(root) {
  return sha256(JSON.stringify(listTree(root)));
}

function copyTree(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const name of fs.readdirSync(from)) {
    const src = path.join(from, name);
    const dst = path.join(to, name);
    const stat = fs.lstatSync(src);
    if (stat.isSymbolicLink()) fail('base 不能包含符号链接：' + src);
    if (stat.isDirectory()) copyTree(src, dst);
    else if (stat.isFile()) fs.copyFileSync(src, dst);
  }
}

function inside(parent, child) {
  const rel = path.relative(path.resolve(parent), path.resolve(child));
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}

function caseList(options) {
  const fails = [].concat(options.fail || []);
  const normals = [].concat(options.normal || []);
  if (!fails.length) fail('freeze 至少需要一个 --fail 失败样本');
  if (!normals.length) fail('freeze 至少需要一个 --normal 正常对照（无正常对照不得冻结）');
  const read = (file, role) => {
    const data = readJson(file);
    for (const key of ['id', 'prompt', 'expected', 'command']) {
      if (typeof data[key] !== 'string' || !data[key].trim()) fail('用例 ' + file + ' 缺少字段 ' + key);
    }
    return { id: data.id, role, prompt: data.prompt, expected: data.expected, command: data.command, cwd: data.cwd || '.', env: data.env || {}, sha256: sha256(fs.readFileSync(file)) };
  };
  const cases = [...fails.map(file => read(file, 'fail')), ...normals.map(file => read(file, 'normal'))];
  const ids = new Set(cases.map(item => item.id));
  if (ids.size !== cases.length) fail('用例 id 必须唯一');
  return cases;
}

export function freeze(options) {
  const dir = path.resolve(required(options, 'dir'));
  const base = path.resolve(required(options, 'base'));
  const target = required(options, 'target');
  const version = required(options, 'version');
  const quote = required(options, 'request-quote');
  const ref = required(options, 'request-ref');
  const existing = required(options, 'existing');
  const why = required(options, 'why-insufficient');
  const counterexample = required(options, 'counterexample');
  if (!fs.existsSync(base) || !fs.statSync(base).isDirectory()) fail('--base 必须是存在的目录：' + base);
  if (inside(dir, base)) fail('--base 不能位于 run 目录内（旧版必须冻结为副本）');
  if (fs.existsSync(path.join(dir, 'run.json'))) fail('该 run 已冻结（run.json 已存在）；一次 run 只允许冻结一次');
  const cases = caseList(options);
  fs.mkdirSync(dir, { recursive: true });
  const casesText = JSON.stringify({ schema: 1, cases }, null, 2) + NL;
  fs.writeFileSync(path.join(dir, 'cases.json'), casesText);
  copyTree(base, path.join(dir, 'base'));
  const run = {
    schema: 1,
    target,
    version,
    baseSource: base,
    baseManifest: listTree(path.join(dir, 'base')),
    casesSha256: sha256(casesText),
    request: { quote, ref },
    l2: { existingMechanism: existing, whyInsufficient: why, counterexample },
    budget: { maxCandidates: 1 },
    frozenAt: new Date().toISOString(),
  };
  writeOnce(path.join(dir, 'run.json'), run);
  return { state: 'FROZEN', dir, cases: cases.length };
}

function required(options, key) {
  const value = options[key];
  if (typeof value !== 'string' || !value.trim()) fail('缺少 --' + key + '（该字段是冻结/晋级的前置条件）');
  return value;
}

function loadRun(dir) {
  const file = path.join(dir, 'run.json');
  if (!fs.existsSync(file)) fail('run 不存在：' + file + '（先执行 freeze）');
  return { dir, run: readJson(file) };
}

function currentStale(dir, run) {
  const stale = [];
  const casesFile = path.join(dir, 'cases.json');
  if (!fs.existsSync(casesFile)) stale.push('cases.json 缺失');
  else if (sha256(fs.readFileSync(casesFile)) !== run.casesSha256) stale.push('cases.json 内容与冻结哈希不符');
  let actual;
  try { actual = listTree(path.join(dir, 'base')); } catch (error) { stale.push('base/ 不可读：' + error.message); actual = null; }
  if (actual && JSON.stringify(actual) !== JSON.stringify(run.baseManifest)) stale.push('base/ 内容与冻结清单不符');
  return stale;
}

export function compare(options) {
  const dir = path.resolve(required(options, 'dir'));
  const { run } = loadRun(dir);
  const stale = currentStale(dir, run);
  if (stale.length) fail('冻结证据已漂移：' + stale.join('；'));
  const observationsFile = path.resolve(required(options, 'runs'));
  if (!fs.existsSync(observationsFile)) fail('找不到 --runs 观测文件：' + observationsFile);
  const observationsText = fs.readFileSync(observationsFile, 'utf8');
  const observations = JSON.parse(observationsText).observations;
  if (!Array.isArray(observations) || !observations.length) fail('--runs 必须包含非空 observations 数组');
  const cases = readJson(path.join(dir, 'cases.json')).cases;
  const candidate = path.join(dir, 'candidate');
  if (!fs.existsSync(candidate) || !fs.statSync(candidate).isDirectory()) fail('缺少 candidate/（由 agent 复制候选生成）');
  const candidateHash = treeHash(candidate);
  const baseHash = treeHash(path.join(dir, 'base'));
  if (candidateHash === baseHash) fail('candidate/ 与 base/ 逐字节相同（no delta），拒绝记录空候选');
  const rows = [];
  for (const item of cases) {
    const sides = ['old', 'new'].map(side => observations.find(entry => entry.caseId === item.id && entry.side === side));
    if (sides.some(side => !side)) fail('用例 ' + item.id + ' 缺少 old/new 任一观测（两侧都要，同命令）');
    const [oldSide, newSide] = sides;
    if (oldSide.command !== newSide.command) fail('用例 ' + item.id + ' 两侧 command 不一致，破坏“同命令对照”');
    for (const side of sides) {
      if (!VERDICTS.includes(side.verdict)) fail('用例 ' + item.id + ' 的 verdict 非法：' + side.verdict);
      if (typeof side.observed !== 'string' || !side.observed.trim()) fail('用例 ' + item.id + ' 缺少 observed');
    }
    rows.push({ caseId: item.id, role: item.role, command: oldSide.command, old: oldSide.verdict, new: newSide.verdict, rawSha256: [oldSide.rawSha256 || null, newSide.rawSha256 || null] });
  }
  let conclusion = 'PASS';
  for (const row of rows) {
    const passed = verdict => verdict === 'PASS';
    if (row.role === 'fail') {
      if (!passed(row.old) && row.old !== 'FAIL') conclusion = 'NO_EFFECT';
      if (!passed(row.old) && row.old === 'FAIL' && !passed(row.new)) conclusion = 'REJECTED';
      if (passed(row.old)) conclusion = 'NO_EFFECT';
    } else if (!passed(row.old)) {
      conclusion = 'NO_EFFECT';
    } else if (!passed(row.new)) {
      conclusion = 'REJECTED';
    }
  }
  const compareValue = { schema: 1, casesSha256: run.casesSha256, candidateHash, observationsSha256: sha256(observationsText), conclusion, rows, comparedAt: new Date().toISOString() };
  writeOnce(path.join(dir, 'compare.json'), compareValue);
  return { state: conclusion, dir, candidateHash, comparedAt: compareValue.comparedAt };
}

export function promote(options) {
  const dir = path.resolve(required(options, 'dir'));
  const { run } = loadRun(dir);
  const stale = currentStale(dir, run);
  if (stale.length) fail('冻结证据已漂移：' + stale.join('；'));
  const compareFile = path.join(dir, 'compare.json');
  const reviewFile = path.join(dir, 'review.json');
  if (!fs.existsSync(compareFile)) fail('缺少 compare.json（先执行 compare）');
  if (!fs.existsSync(reviewFile)) fail('缺少 review.json（由独立上下文写一次）');
  const compared = readJson(compareFile);
  const review = readJson(reviewFile);
  if (compared.conclusion !== 'PASS') fail('对照结论不是 PASS（' + compared.conclusion + '），不得晋级');
  if (review.verdict !== 'pass') fail('review.json 的 verdict 必须是 pass');
  if (review.independence === 'L0') fail('independence=L0 是自检冒充独立，拒绝晋级');
  if (review.reviewMode !== undefined && !['initial', 're-review'].includes(review.reviewMode)) fail('reviewMode 只能是 initial 或 re-review');
  const round = review.reviewRound;
  if (round !== undefined && (!Number.isInteger(round) || round < 1)) fail('reviewRound 必须是 >=1 的整数');
  if (review.reviewMode === 're-review') {
    if (!Number.isInteger(round) || round < 2) fail('reviewMode=re-review 需要 reviewRound 为 >=2 的整数（记录这是第几轮复核）');
    if (typeof review.priorReviewHash !== 'string' || !/^[0-9a-f]{64}$/.test(review.priorReviewHash)) fail('re-review 需要 priorReviewHash（上一份 review.json 的 sha256）');
  } else if (Number.isInteger(round) && round > 1 && typeof review.priorReviewHash !== 'string') {
    fail('reviewRound>1 需要 priorReviewHash，且应标 reviewMode=re-review');
  }
  const candidateHash = treeHash(path.join(dir, 'candidate'));
  if (review.candidateHash !== candidateHash) fail('review.json 记录的 candidateHash 与当前 candidate/ 不符（stale 审核）');
  if (review.compareHash !== sha256(fs.readFileSync(compareFile))) fail('review.json 记录的 compareHash 与 compare.json 不符（stale 审核）');
  const quote = required(options, 'user-quote');
  const ref = required(options, 'user-ref');
  const promotion = {
    schema: 1,
    userQuote: quote,
    userRef: ref,
    candidateHash,
    reviewHash: sha256(fs.readFileSync(reviewFile)),
    reviewMode: review.reviewMode || 'initial',
    reviewRound: Number.isInteger(round) ? round : 1,
    recordedAt: new Date().toISOString(),
    activationHint: '记录不是激活：按仓库流程发布/安装（node .forgeflow/ff-spec.mjs --version 确认）后才生效。',
    rollbackHint: '回退用安装器 rollback 或恢复冻结的 base/ 副本；不要直接改 review.json/promotion.json。',
  };
  writeOnce(path.join(dir, 'promotion.json'), promotion);
  return { state: 'PROMOTION_RECORDED', dir, activationHint: promotion.activationHint, rollbackHint: promotion.rollbackHint };
}

export function withdraw(options) {
  const dir = path.resolve(required(options, 'dir'));
  const reason = required(options, 'reason');
  const { run } = loadRun(dir);
  const file = path.join(dir, 'withdraw.md');
  if (fs.existsSync(file)) fail('该 run 已 withdraw（记录写一次）');
  const lines = ['# RSI withdraw', '', '- 时间：' + new Date().toISOString(), '- 目标：' + run.target, '- 原因：' + reason, '', '保留：run.json、cases.json、base/、compare/review/promotion 原件（不删除证据）。', '若已激活：按安装器 rollback 或恢复 base/ 副本，并重新跑正常对照。', ''];
  fs.writeFileSync(file, lines.join(NL));
  return { state: 'WITHDRAWN', dir };
}

export function status(options) {
  const json = Boolean(options.json);
  if (options.list) {
    const root = path.resolve(options.list);
    if (!fs.existsSync(root)) fail('--list 目录不存在：' + root);
    const runs = fs.readdirSync(root).filter(name => fs.existsSync(path.join(root, name, 'run.json'))).sort().map(name => statusOne(path.join(root, name), options));
    return { mode: 'list', runs };
  }
  const dir = path.resolve(required(options, 'dir'));
  return statusOne(dir, options);
}

function statusOne(dir, options) {
  if (!fs.existsSync(path.join(dir, 'run.json'))) return { dir, state: 'EMPTY' };
  const run = readJson(path.join(dir, 'run.json'));
  const stale = currentStale(dir, run);
  const report = { dir, target: run.target, version: run.version, stale };
  if (stale.length) return Object.assign(report, { state: 'STALE' });
  if (fs.existsSync(path.join(dir, 'withdraw.md'))) return Object.assign(report, { state: 'WITHDRAWN' });
  const compareFile = path.join(dir, 'compare.json');
  const reviewFile = path.join(dir, 'review.json');
  const promotionFile = path.join(dir, 'promotion.json');
  if (fs.existsSync(promotionFile)) {
    const promotion = readJson(promotionFile);
    let installed = false;
    if (options.installed) {
      const target = path.resolve(options.installed);
      try { installed = treeHash(target) === treeHash(path.join(dir, 'candidate')); } catch { installed = false; }
    }
    return Object.assign(report, { state: installed ? 'PROMOTED' : 'PROMOTION_RECORDED', activationHint: promotion.activationHint, rollbackHint: promotion.rollbackHint });
  }
  if (fs.existsSync(reviewFile)) {
    const review = readJson(reviewFile);
    const candidateHash = fs.existsSync(path.join(dir, 'candidate')) ? treeHash(path.join(dir, 'candidate')) : null;
    if (review.candidateHash !== candidateHash) return Object.assign(report, { state: 'STALE', stale: ['review.json 的 candidateHash 与当前 candidate/ 不符'] });
    return Object.assign(report, { state: 'REVIEWED' });
  }
  if (fs.existsSync(compareFile)) {
    const compared = readJson(compareFile);
    const candidateHash = fs.existsSync(path.join(dir, 'candidate')) ? treeHash(path.join(dir, 'candidate')) : null;
    if (compared.candidateHash !== candidateHash) return Object.assign(report, { state: 'STALE', stale: ['compare.json 的 candidateHash 与当前 candidate/ 不符'] });
    if (compared.conclusion === 'REJECTED') return Object.assign(report, { state: 'REJECTED' });
    if (compared.conclusion === 'NO_EFFECT') return Object.assign(report, { state: 'NO_EFFECT' });
    return Object.assign(report, { state: 'COMPARED' });
  }
  if (fs.existsSync(path.join(dir, 'candidate'))) {
    const baseHash = treeHash(path.join(dir, 'base'));
    const candidateHash = treeHash(path.join(dir, 'candidate'));
    return Object.assign(report, { state: candidateHash === baseHash ? 'FROZEN' : 'ISOLATED' });
  }
  return Object.assign(report, { state: 'FROZEN' });
}

function usage() {
  return [
    'ff-rsi ' + VERSION + ' — 有界 RSI 证据绑定（不自动判分/晋级/激活）',
    '',
    '用法：',
    '  ff-rsi.mjs freeze   --dir <run> --target <skill> --version <v> --base <旧版目录>',
    '                      --fail <case.json> [--fail ...] --normal <case.json>',
    '                      --request-quote "<用户原话>" --request-ref <ref>',
    '                      --existing "<已有等价机制>" --why-insufficient "<为何不够>"',
    '                      --counterexample "<可复现失败样本>"',
    '  ff-rsi.mjs compare  --dir <run> --runs <observations.json>   # 只校验你给的观测',
    '  ff-rsi.mjs promote  --dir <run> --user-quote "<原话>" --user-ref <ref>',
    '  ff-rsi.mjs withdraw --dir <run> --reason "<原因>"',
    '  ff-rsi.mjs status   --dir <run> [--installed <目录>] [--json] | --list <父目录>',
    '',
    '状态由文件哈希推导：EMPTY/FROZEN/ISOLATED/COMPARED/REJECTED/NO_EFFECT/REVIEWED/',
    'PROMOTION_RECORDED/PROMOTED/WITHDRAWN/STALE。promote 只写记录并打印激活/回滚命令。',
  ].join(NL);
}

export function main(argv = process.argv.slice(2)) {
  if (!argv.length || argv[0] === '--help' || argv[0] === '-h') return { code: 0, lines: [usage()] };
  const verb = argv[0];
  const options = parseArgs(argv.slice(1));
  let result;
  if (verb === 'freeze') result = freeze(options);
  else if (verb === 'compare') result = compare(options);
  else if (verb === 'promote') result = promote(options);
  else if (verb === 'withdraw') result = withdraw(options);
  else if (verb === 'status') result = status(options);
  else if (verb === 'version' || verb === '--version') result = { version: VERSION };
  else fail('未知动词：' + verb + '（可用：freeze/compare/promote/withdraw/status）');
  const lines = options.json || verb === 'version' || verb === '--version'
    ? [JSON.stringify(result)]
    : [result.state ? 'STATE ' + result.state : '', ...(result.activationHint ? ['激活：' + result.activationHint] : []), ...(result.rollbackHint ? ['回滚：' + result.rollbackHint] : []), ...(result.stale && result.stale.length ? ['STALE：' + result.stale.join('；')] : [])].filter(Boolean);
  return { code: result.state === 'REJECTED' || result.state === 'NO_EFFECT' ? 3 : 0, lines };
}

if (process.argv[1] && path.basename(process.argv[1]) === 'ff-rsi.mjs') {
  try {
    const result = main();
    for (const line of result.lines) console.log(line);
    process.exitCode = result.code;
  } catch (error) {
    console.error('Error: ' + error.message);
    process.exitCode = error.exitCode || 1;
  }
}
