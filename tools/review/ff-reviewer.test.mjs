import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  ReviewError,
  VERSION,
  applyOverrides,
  buildClaudeArgs,
  buildCodexArgs,
  buildPrompt,
  check,
  init,
  normalizeConfig,
  parseArgs,
  parseReviewerMessage,
  run,
  runProcess,
} from './ff-reviewer.mjs';

function tempProject() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ff-reviewer-test-'));
  fs.mkdirSync(path.join(dir, 'openspec'), { recursive: true });
  return dir;
}

function writeConfig(project, config) {
  fs.writeFileSync(path.join(project, 'openspec', 'ff-review.json'), JSON.stringify(config));
}

function fakeCodexExec(project, body) {
  const file = path.join(project, 'exec');
  fs.writeFileSync(file, body);
  return file;
}

test('VERSION is the release version', () => {
  assert.equal(VERSION, '0.9.14-dsh.1');
});

test('parseArgs accepts known flags and rejects malformed input', () => {
  assert.deepEqual(parseArgs(['--project', 'x', '--json', '--force']), { project: 'x', json: true, force: true });
  assert.throws(() => parseArgs(['--project']), ReviewError);
  assert.throws(() => parseArgs(['positional']), ReviewError);
});

test('normalizeConfig validates backend, reasoning, timeout and command', () => {
  assert.deepEqual(normalizeConfig({ version: 1, backend: 'codex', model: 'gpt-test', reasoning: 'high', timeoutSeconds: 30 }), {
    version: 1,
    enabled: true,
    backend: 'codex',
    command: 'codex',
    timeoutSeconds: 30,
    model: 'gpt-test',
    reasoning: 'high',
  });
  assert.equal(normalizeConfig({ version: 1, backend: 'claude', enabled: false }).enabled, false);
  assert.throws(() => normalizeConfig({ version: 1, backend: 'bogus' }), /backend/);
  assert.throws(() => normalizeConfig({ version: 1, backend: 'codex', reasoning: 'max' }), /reasoning/);
  assert.throws(() => normalizeConfig({ version: 1, backend: 'claude', reasoning: 'minimal' }), /reasoning/);
  assert.throws(() => normalizeConfig({ version: 1, backend: 'codex', timeoutSeconds: 0 }), /timeoutSeconds/);
  assert.throws(() => normalizeConfig({ version: 1, backend: 'codex', model: 'bad model' }), /model/);
  assert.throws(() => normalizeConfig({ version: 1, backend: 'codex', command: 'a\nb' }), /command/);
});

test('applyOverrides lets CLI and environment override config without mutating input', () => {
  const base = normalizeConfig({ version: 1, backend: 'codex', reasoning: 'low' });
  const next = applyOverrides(base, { backend: 'claude', model: 'claude-test', reasoning: 'max' }, { FF_REVIEW_TIMEOUT_SECONDS: '45' });
  assert.equal(next.backend, 'claude');
  assert.equal(next.model, 'claude-test');
  assert.equal(next.reasoning, 'max');
  assert.equal(next.timeoutSeconds, 45);
  assert.equal(base.backend, 'codex');
  assert.throws(() => applyOverrides(base, { reasoning: 'max' }), /reasoning/);
});

test('backend override drops stale backend-specific command, model and reasoning', () => {
  const base = normalizeConfig({ version: 1, backend: 'codex', model: 'gpt-test', reasoning: 'low', command: 'codex', timeoutSeconds: 30 });
  const switched = applyOverrides(base, { backend: 'claude' }, {});
  assert.equal(switched.backend, 'claude');
  assert.equal(switched.command, 'claude');
  assert.equal(switched.model, undefined);
  assert.equal(switched.reasoning, undefined);
  const same = applyOverrides(base, { model: 'gpt-other' }, {});
  assert.equal(same.backend, 'codex');
  assert.equal(same.command, 'codex');
  assert.equal(same.model, 'gpt-other');
  assert.equal(same.reasoning, 'low');
});

test('init and check create and describe a config without calling a backend', () => {
  const project = tempProject();
  const missing = check({ project }, {});
  assert.equal(missing.code, 2);
  assert.equal(missing.data.configExists, false);

  const created = init({ project, backend: 'codex', model: 'gpt-test', reasoning: 'medium', command: process.execPath });
  assert.equal(created.code, 0);
  const config = JSON.parse(fs.readFileSync(path.join(project, 'openspec', 'ff-review.json'), 'utf8'));
  assert.equal(config.backend, 'codex');
  assert.equal(config.model, 'gpt-test');
  assert.equal(config.reasoning, 'medium');
  assert.equal(config.command, process.execPath);

  const checked = check({ project }, {});
  assert.equal(checked.data.configExists, true);
  assert.equal(checked.data.backend, 'codex');
  assert.equal(checked.data.available, true);
  assert.match(checked.data.authHint, /Codex|codex/);

  assert.throws(() => init({ project }), /拒绝覆盖/);
  fs.rmSync(project, { recursive: true, force: true });
});

test('buildCodexArgs and buildClaudeArgs carry model, effort and read-only flags', () => {
  const codex = buildCodexArgs({ model: 'gpt-test', reasoning: 'xhigh' }, path.join('tmp', 'last.txt'));
  assert.ok(codex.includes('--sandbox'));
  assert.ok(codex.includes('read-only'));
  assert.ok(codex.includes('--ephemeral'));
  assert.deepEqual(codex.slice(codex.indexOf('-m'), codex.indexOf('-m') + 2), ['-m', 'gpt-test']);
  assert.ok(codex.includes('model_reasoning_effort=xhigh'));
  assert.equal(codex.at(-1), '-');

  const claude = buildClaudeArgs({ model: 'claude-test', reasoning: 'max' });
  assert.ok(claude.includes('--permission-mode'));
  assert.ok(claude.includes('plan'));
  assert.deepEqual(claude.slice(claude.indexOf('--model'), claude.indexOf('--model') + 2), ['--model', 'claude-test']);
  assert.deepEqual(claude.slice(claude.indexOf('--effort'), claude.indexOf('--effort') + 2), ['--effort', 'max']);
  assert.ok(claude.includes('--bare'));
});

test('buildPrompt includes the brief and JSON output contract', () => {
  const prompt = buildPrompt('E:/project', 'E:/project/openspec/brief.md', '原文 ABC');
  assert.match(prompt, /原文 ABC/);
  assert.match(prompt, /只返回一个 JSON 对象/);
  assert.match(prompt, /needs-evidence/);
  assert.match(prompt, /L2/);
});

test('parseReviewerMessage accepts JSON and fenced JSON', () => {
  const valid = parseReviewerMessage(JSON.stringify({
    verdict: 'fail',
    summary: '有一个阻断',
    findings: [{ id: 'F1', severity: 'blocker', claim: '问题', evidence: 'a.mjs:1', recommendation: '修' }],
    notes: ['未验证'],
  }));
  assert.equal(valid.ok, true);
  assert.equal(valid.verdict, 'fail');
  assert.equal(valid.findings[0].severity, 'blocker');

  const fenced = parseReviewerMessage('前置说明\n\n\x60\x60\x60json\n{"verdict":"pass","findings":[]}\n\x60\x60\x60');
  assert.equal(fenced.ok, true);
  assert.equal(fenced.verdict, 'pass');
  assert.deepEqual(fenced.findings, []);
});

test('parseReviewerMessage rejects malformed or incomplete output', () => {
  assert.equal(parseReviewerMessage('没有 JSON').ok, false);
  assert.equal(parseReviewerMessage('{"verdict":"maybe","findings":[]}').ok, false);
  assert.equal(parseReviewerMessage('{"verdict":"pass","findings":[{"severity":"critical","claim":"x"}]}').ok, false);
  assert.equal(parseReviewerMessage('{"verdict":"pass","findings":[{"severity":"minor"}]}').ok, false);
});

test('runProcess sends stdin and captures stdout and exit code', async () => {
  const result = await runProcess({ file: process.execPath, args: ['-e', 'let s="";process.stdin.on("data",c=>s+=c);process.stdin.on("end",()=>console.log("got:"+s));'] }, {
    input: 'hello',
    timeoutMs: 10000,
    env: process.env,
  });
  assert.equal(result.status, 0);
  assert.match(result.stdout, /got:hello/);
  assert.equal(result.timedOut, false);
});

test('run invokes a fake codex backend, parses its JSON and writes a record', async () => {
  const project = tempProject();
  fakeCodexExec(project, [
    'const fs = require("node:fs");',
    'const args = process.argv.slice(2);',
    'const out = args[args.indexOf("-o") + 1];',
    'const input = fs.readFileSync(0, "utf8");',
    'const payload = { verdict: "fail", summary: "fake review", findings: [{ id: "F1", severity: "major", claim: "fake claim", evidence: "fake:1", recommendation: "fix" }], notes: ["fake note"] };',
    'fs.writeFileSync(out, JSON.stringify(payload));',
    'console.log("stdout marker " + input.length);',
  ].join('\n'));
  writeConfig(project, { version: 1, backend: 'codex', command: process.execPath, reasoning: 'low', timeoutSeconds: 20 });
  fs.writeFileSync(path.join(project, 'openspec', 'brief.md'), '审查材料');
  const result = await run({ project, brief: 'openspec/brief.md', out: 'openspec/reviews/review' }, {});
  assert.equal(result.code, 0);
  assert.equal(result.data.verdict, 'fail');
  assert.equal(result.data.findings[0].claim, 'fake claim');
  assert.equal(result.data.independence, 'L2');
  assert.equal(result.data.model, 'default');
  assert.ok(fs.existsSync(path.join(project, 'openspec', 'reviews', 'review.json')));
  assert.ok(fs.existsSync(path.join(project, 'openspec', 'reviews', 'review.md')));
  assert.ok(fs.existsSync(path.join(project, 'openspec', 'reviews', 'review.stdout.txt')));
  assert.equal(fs.existsSync(path.join(project, 'openspec', 'reviews', 'review.last.txt')), false);
  const record = JSON.parse(fs.readFileSync(path.join(project, 'openspec', 'reviews', 'review.json'), 'utf8'));
  assert.match(record.brief.sha256, /^[0-9a-f]{64}$/);
  assert.match(record.config.sha256, /^[0-9a-f]{64}$/);
  await assert.rejects(() => run({ project, brief: 'openspec/brief.md', out: 'openspec/reviews/review' }, {}), /拒绝覆盖/);
  const forced = await run({ project, brief: 'openspec/brief.md', out: 'openspec/reviews/review', force: true }, {});
  assert.equal(forced.code, 0);
  fs.rmSync(project, { recursive: true, force: true });
});
