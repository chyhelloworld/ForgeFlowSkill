/** node --test：ff-rsi.mjs 的命令契约、证据绑定与拒绝条件。 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { treeHash } from './ff-rsi.mjs';

const CLI = path.join(path.dirname(fileURLToPath(import.meta.url)), 'ff-rsi.mjs');
const NL = String.fromCharCode(10);

function run(args, cwd) {
  const result = spawnSync(process.execPath, [CLI, ...args], { cwd, encoding: 'utf8' });
  return { code: result.status, out: result.stdout || '', err: result.stderr || '' };
}

function tempRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'ff-rsi-test-'));
}

function writeJson(file, value) {
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + NL);
}

function makeCase(dir, name, id) {
  const file = path.join(dir, name);
  writeJson(file, { id, prompt: '复现样本 ' + id, expected: '不应出现的问题', command: 'node case.mjs ' + id });
  return file;
}

function fixture() {
  const root = tempRoot();
  const base = path.join(root, 'base');
  fs.mkdirSync(base, { recursive: true });
  fs.writeFileSync(path.join(base, 'SKILL.md'), 'old skill' + NL);
  const failCase = makeCase(root, 'fail.json', 'F1');
  const normalCase = makeCase(root, 'normal.json', 'N1');
  return { root, base, failCase, normalCase, runDir: path.join(root, 'run') };
}

function freeze(f) {
  return run(['freeze', '--dir', f.runDir, '--target', 'ff-retro', '--version', '0.9.11', '--base', f.base,
    '--fail', f.failCase, '--normal', f.normalCase,
    '--request-quote', '让 Retro 能记录一次有界改进', '--request-ref', 'm04592',
    '--existing', 'ff-receipt snapshot', '--why-insufficient', '不绑执行者原始回答', '--counterexample', 'E40 3/3 5/6'], f.root);
}

function freezeOk(f) {
  assert.equal(freeze(f).code, 0, 'freeze should succeed');
}

function candidate(f, text = 'new skill' + NL) {
  const dir = path.join(f.runDir, 'candidate');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'SKILL.md'), text);
  return dir;
}

function observations(f, overrides = {}) {
  const rows = [
    { caseId: 'F1', side: 'old', command: 'node case.mjs F1', observed: '问题复现', verdict: 'FAIL', rawSha256: 'a'.repeat(64) },
    { caseId: 'F1', side: 'new', command: 'node case.mjs F1', observed: '问题消失', verdict: 'PASS', rawSha256: 'b'.repeat(64) },
    { caseId: 'N1', side: 'old', command: 'node case.mjs N1', observed: '正常', verdict: 'PASS', rawSha256: 'c'.repeat(64) },
    { caseId: 'N1', side: 'new', command: 'node case.mjs N1', observed: '正常', verdict: 'PASS', rawSha256: 'd'.repeat(64) },
  ];
  for (const row of rows) if (overrides[row.caseId + row.side]) Object.assign(row, overrides[row.caseId + row.side]);
  const file = path.join(f.root, 'observations-' + Math.random().toString(16).slice(2) + '.json');
  writeJson(file, { observations: rows });
  return file;
}

function compare(f, obs) {
  return run(['compare', '--dir', f.runDir, '--runs', obs || observations(f)], f.root);
}

function review(f, patch = {}) {
  const compareJson = path.join(f.runDir, 'compare.json');
  const candidateHash = treeHash(path.join(f.runDir, 'candidate'));
  const value = {
    candidateHash,
    compareHash: crypto.createHash('sha256').update(fs.readFileSync(compareJson)).digest('hex'),
    independence: 'L2',
    verdict: 'pass',
    reviewer: 'independent-context',
    unverified: ['independence is recorded, not verified'],
  };
  Object.assign(value, patch);
  writeJson(path.join(f.runDir, 'review.json'), value);
}

test('EMPTY：空目录 status', () => {
  const root = tempRoot();
  const dir = path.join(root, 'run');
  const result = run(['status', '--dir', dir, '--json'], root);
  assert.equal(result.code, 0);
  assert.equal(JSON.parse(result.out).state, 'EMPTY');
});

test('freeze 强制 L2 三字段：缺 --existing 退出 2 并报字段名', () => {
  const f = fixture();
  const result = run(['freeze', '--dir', f.runDir, '--target', 't', '--version', 'v', '--base', f.base,
    '--fail', f.failCase, '--normal', f.normalCase,
    '--request-quote', 'q', '--request-ref', 'm1',
    '--why-insufficient', 'w', '--counterexample', 'c'], f.root);
  assert.equal(result.code, 2);
  assert.match(result.err, /existing/);
});

test('freeze 拒绝没有正常对照的 run', () => {
  const f = fixture();
  const result = run(['freeze', '--dir', f.runDir, '--target', 't', '--version', 'v', '--base', f.base,
    '--fail', f.failCase, '--request-quote', 'q', '--request-ref', 'm1',
    '--existing', 'e', '--why-insufficient', 'w', '--counterexample', 'c'], f.root);
  assert.equal(result.code, 2);
  assert.match(result.err, /normal/);
});

test('freeze 成功 → FROZEN；重复 freeze 写一次被拒', () => {
  const f = fixture();
  freezeOk(f);
  assert.ok(fs.existsSync(path.join(f.runDir, 'run.json')));
  assert.ok(fs.existsSync(path.join(f.runDir, 'base', 'SKILL.md')));
  const status = run(['status', '--dir', f.runDir, '--json'], f.root);
  assert.equal(JSON.parse(status.out).state, 'FROZEN');
  const again = freeze(f);
  assert.equal(again.code, 2);
  assert.match(again.err, /run\.json/);
});

test('冻结证据被改写 → STALE 并指出字段', () => {
  const f = fixture();
  freezeOk(f);
  const cases = path.join(f.runDir, 'cases.json');
  fs.writeFileSync(cases, fs.readFileSync(cases, 'utf8').replace('不应出现的问题', '改掉'));
  const result = run(['status', '--dir', f.runDir, '--json'], f.root);
  assert.equal(JSON.parse(result.out).state, 'STALE');
  assert.match(JSON.parse(result.out).stale.join(' '), /cases\.json/);
});

test('compare 缺少 candidate 或候选与 base 相同都拒绝', () => {
  const f = fixture();
  freezeOk(f);
  const noCandidate = compare(f);
  assert.equal(noCandidate.code, 2);
  assert.match(noCandidate.err, /candidate/);
  candidate(f, 'old skill' + NL);
  const noDelta = compare(f);
  assert.equal(noDelta.code, 2);
  assert.match(noDelta.err, /no delta/);
});

test('compare 缺一侧观测、命令不一致均拒绝', () => {
  const f = fixture();
  freezeOk(f);
  candidate(f);
  const missing = path.join(f.root, 'missing.json');
  writeJson(missing, { observations: [{ caseId: 'F1', side: 'old', command: 'c', observed: 'x', verdict: 'FAIL' }] });
  const result = compare(f, missing);
  assert.equal(result.code, 2);
  assert.match(result.err, /缺少 old\/new/);
  const mismatched = observations(f, { F1new: { command: 'node other.mjs F1' } });
  const result2 = compare(f, mismatched);
  assert.equal(result2.code, 2);
  assert.match(result2.err, /command 不一致/);
});

test('compare PASS → COMPARED', () => {
  const f = fixture();
  freezeOk(f);
  candidate(f);
  const result = compare(f);
  assert.equal(result.code, 0);
  const status = JSON.parse(run(['status', '--dir', f.runDir, '--json'], f.root).out);
  assert.equal(status.state, 'COMPARED');
});

test('fail 用例旧版不失败 → NO_EFFECT，退出码 3', () => {
  const f = fixture();
  freezeOk(f);
  candidate(f);
  const result = compare(f, observations(f, { F1old: { verdict: 'PASS' } }));
  assert.equal(result.code, 3);
  const status = JSON.parse(run(['status', '--dir', f.runDir, '--json'], f.root).out);
  assert.equal(status.state, 'NO_EFFECT');
});

test('正常对照被误伤 → REJECTED，退出码 3', () => {
  const f = fixture();
  freezeOk(f);
  candidate(f);
  const result = compare(f, observations(f, { N1new: { verdict: 'FAIL' } }));
  assert.equal(result.code, 3);
  const status = JSON.parse(run(['status', '--dir', f.runDir, '--json'], f.root).out);
  assert.equal(status.state, 'REJECTED');
});

test('SKIP/NOT_RUN 不能当作通过', () => {
  const f = fixture();
  freezeOk(f);
  candidate(f);
  const result = compare(f, observations(f, { F1new: { verdict: 'SKIP' } }));
  assert.equal(result.code, 3);
});

test('promote 拒绝缺少 review、L0、verdict=fail、stale 审核', () => {
  const f = fixture();
  freezeOk(f);
  candidate(f);
  compare(f);
  const noReview = run(['promote', '--dir', f.runDir, '--user-quote', 'q', '--user-ref', 'm1'], f.root);
  assert.equal(noReview.code, 2);
  review(f, { independence: 'L0' });
  const l0 = run(['promote', '--dir', f.runDir, '--user-quote', 'q', '--user-ref', 'm1'], f.root);
  assert.equal(l0.code, 2);
  assert.match(l0.err, /L0/);
  review(f, { verdict: 'fail' });
  const failed = run(['promote', '--dir', f.runDir, '--user-quote', 'q', '--user-ref', 'm1'], f.root);
  assert.equal(failed.code, 2);
  assert.match(failed.err, /verdict/);
  review(f);
  fs.appendFileSync(path.join(f.runDir, 'candidate', 'SKILL.md'), 'tamper');
  const stale = run(['promote', '--dir', f.runDir, '--user-quote', 'q', '--user-ref', 'm1'], f.root);
  assert.equal(stale.code, 2);
  assert.match(stale.err, /candidateHash/);
});

test('promote 成功只写记录并打印激活/回滚命令', () => {
  const f = fixture();
  freezeOk(f);
  candidate(f);
  compare(f);
  review(f);
  const result = run(['promote', '--dir', f.runDir, '--user-quote', '按这个方案改', '--user-ref', 'm04700', '--json'], f.root);
  assert.equal(result.code, 0);
  const value = JSON.parse(result.out);
  assert.equal(value.state, 'PROMOTION_RECORDED');
  assert.match(value.activationHint, /记录不是激活/);
  assert.match(value.rollbackHint, /rollback/);
  const status = JSON.parse(run(['status', '--dir', f.runDir, '--json'], f.root).out);
  assert.equal(status.state, 'PROMOTION_RECORDED');
  const installed = path.join(f.root, 'installed');
  fs.cpSync(path.join(f.runDir, 'candidate'), installed, { recursive: true });
  const promoted = JSON.parse(run(['status', '--dir', f.runDir, '--installed', installed, '--json'], f.root).out);
  assert.equal(promoted.state, 'PROMOTED');
});

test('re-review 必须记录轮次与上一份 review 哈希', () => {
  const f = fixture();
  freezeOk(f);
  candidate(f);
  compare(f);
  review(f, { reviewMode: 're-review', reviewRound: 1, priorReviewHash: 'a'.repeat(64) });
  const wrongRound = run(['promote', '--dir', f.runDir, '--user-quote', 'q', '--user-ref', 'm1'], f.root);
  assert.equal(wrongRound.code, 2);
  assert.match(wrongRound.err, /reviewRound/);
  review(f, { reviewMode: 're-review', reviewRound: 2 });
  const missingPrior = run(['promote', '--dir', f.runDir, '--user-quote', 'q', '--user-ref', 'm1'], f.root);
  assert.equal(missingPrior.code, 2);
  assert.match(missingPrior.err, /priorReviewHash/);
  review(f, { reviewMode: 'bogus' });
  const badMode = run(['promote', '--dir', f.runDir, '--user-quote', 'q', '--user-ref', 'm1'], f.root);
  assert.equal(badMode.code, 2);
  assert.match(badMode.err, /reviewMode/);
  review(f, { reviewMode: 're-review', reviewRound: 2, priorReviewHash: 'a'.repeat(64) });
  const ok = run(['promote', '--dir', f.runDir, '--user-quote', 'q', '--user-ref', 'm1', '--json'], f.root);
  assert.equal(ok.code, 0);
  const promotion = JSON.parse(fs.readFileSync(path.join(f.runDir, 'promotion.json'), 'utf8'));
  assert.equal(promotion.reviewMode, 're-review');
  assert.equal(promotion.reviewRound, 2);
});

test('withdraw 保留原件与结论', () => {
  const f = fixture();
  freezeOk(f);
  candidate(f);
  compare(f);
  const result = run(['withdraw', '--dir', f.runDir, '--reason', '正常对照不足', '--json'], f.root);
  assert.equal(result.code, 0);
  assert.equal(JSON.parse(result.out).state, 'WITHDRAWN');
  assert.ok(fs.existsSync(path.join(f.runDir, 'cases.json')));
  assert.ok(fs.existsSync(path.join(f.runDir, 'base', 'SKILL.md')));
  const status = JSON.parse(run(['status', '--dir', f.runDir, '--json'], f.root).out);
  assert.equal(status.state, 'WITHDRAWN');
});

test('status --list 只扫给定目录', () => {
  const f = fixture();
  freezeOk(f);
  const other = path.join(f.root, 'empty');
  fs.mkdirSync(other);
  const result = run(['status', '--list', f.root, '--json'], f.root);
  assert.equal(result.code, 0);
  const value = JSON.parse(result.out);
  assert.equal(value.mode, 'list');
  assert.deepEqual(value.runs.map(item => item.dir), [f.runDir]);
});
