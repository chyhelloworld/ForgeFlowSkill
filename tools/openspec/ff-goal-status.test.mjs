import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { goalStatus, projectGoalStatus } from './ff-goal-status.mjs';
import { statusOverview } from './ff-status.mjs';
import { createTestWorkspace } from '../installer/testing/workspace.mjs';

const owned = createTestWorkspace();
let success = true;
test.after(() => owned.cleanup({ apply: true, success }));
const runTest = (name, fn) => test(name, async t => { try { await fn(t); } catch (error) { success = false; throw error; } });
const now = new Date('2026-11-12T12:00:00Z');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
function fixture() {
  const root = fs.mkdtempSync(path.join(owned.directory, '中文 goal '));
  const put = (name, data) => fs.writeFileSync(path.join(root, name), typeof data === 'string' ? data : JSON.stringify(data));
  const evidence = name => ({ path: name, sha256: hash(fs.readFileSync(path.join(root, name))) });
  put('plan.md', 'approved goal R2\n'); put('output.txt', 'true behavior result');
  const dependencies = [evidence('plan.md')];
  // Python canonical sorted JSON uses the same ASCII strings here.
  const fingerprint = hash(JSON.stringify(dependencies.map(record => ({ path: record.path, sha256: record.sha256 }))));
  put('receipt.json', { actionId: 'T1', goalRevision: 'R2', dependencyFingerprint: fingerprint, operation: 'test actual behavior', exitCode: 0, outputs: [evidence('output.txt')] });
  const data = { version: 1, projectRoot: root, goalRevision: 'R2', dependencies,
    actions: [{ id: 'T1', title: '输入边界', state: 'done', receipt: [evidence('receipt.json')] }, { id: 'T2', state: 'pending' }],
    progress: { goal: '完成扣库存', scope: '不含支付', plan: 'plan.md', recordedAt: '2026-11-12T11:50:00Z',
      lastFactCheckAt: '2026-11-12T11:40:00Z', currentActionId: 'T2', nextStep: '测试并发库存',
      execution: { state: 'ready', observedAt: '2026-11-12T11:50:00Z', source: 'test session result' },
      checkpoints: [{ id: 'C1', at: '2026-11-12T09:00:00Z', goalRevision: 'R2', verifiedActionIds: ['T1'] }] } };
  const save = () => put('checkpoint.json', data); save();
  return { root, data, put, evidence, save };
}
function sink() { let value = ''; return { write: chunk => value += chunk, get value() { return value; } }; }
function run(f, argv = [], options = {}) {
  f.save(); const out = sink(), err = sink();
  const code = goalStatus(['--goal', 'checkpoint.json', '--current-goal', 'R2', '--json', ...argv], { project: f.root, out, err, now, ...options });
  return { code, err: err.value, report: out.value ? JSON.parse(out.value) : null };
}
function noProgress(f, count = 3, minutes = 40) {
  for (let index = 0; index < count; index++) f.data.progress.checkpoints.push({ id: `C${index + 2}`, at: new Date(Date.parse('2026-11-12T09:00:00Z') + (index + 1) * 40 * 60000).toISOString(),
    goalRevision: 'R2', verifiedActionIds: ['T1'], activeMinutes: minutes, workSource: 'recorded active interval excluding waits' });
}
runTest('current receipts are verified, checkbox/pending is not; query leaves all bytes unchanged', () => {
  const f = fixture(), before = Object.fromEntries(fs.readdirSync(f.root).map(name => [name, hash(fs.readFileSync(path.join(f.root, name)))]));
  const r = run(f); assert.equal(r.code, 0, r.err); assert.equal(r.report.counts.VERIFIED, 1); assert.equal(r.report.counts.NOT_STARTED, 1);
  assert.equal(r.report.execution.current, 'UNKNOWN'); assert.equal(r.report.times.queriedAt, now.toISOString());
  assert.deepEqual(Object.fromEntries(fs.readdirSync(f.root).map(name => [name, hash(fs.readFileSync(path.join(f.root, name)))])), before);
});
runTest('legacy v1 checkpoint works with unknown progress, no second state file', () => {
  const f = fixture(); delete f.data.progress; const r = run(f);
  assert.equal(r.report.counts.VERIFIED, 1); assert.equal(r.report.goal.text, null); assert.equal(r.report.retrospective.recommendation, 'UNKNOWN');
});
runTest('stale output does not count as verified', () => {
  const f = fixture(); f.put('output.txt', 'changed'); const r = run(f);
  assert.equal(r.report.counts.VERIFIED, 0); assert.match(r.report.gaps.join(' '), /stale file/);
});
runTest('fresh dependency list cannot reuse an old completion receipt', () => {
  const f = fixture(); f.put('plan.md', 'changed'); f.data.dependencies = [f.evidence('plan.md')];
  assert.equal(run(f).report.counts.VERIFIED, 0);
});
runTest('goal revision change exposes history and requires inspection, never resigns receipts', () => {
  const f = fixture(); const r = run(f, ['--current-goal', 'R3']);
  assert.equal(r.report.goal.revisionMatches, false); assert.equal(r.report.counts.VERIFIED, 0); assert.equal(r.report.progress.state, 'UNKNOWN');
});
runTest('three no-progress checkpoints and configured active threshold trigger a retrospective', () => {
  const f = fixture(); noProgress(f); const r = run(f);
  assert.equal(r.report.retrospective.recommendation, 'RETROSPECTIVE_DUE'); assert.equal(r.report.progress.recordedActiveMinutesWithoutProgress, 120);
  assert.equal(run(f, ['--stalled-minutes', '200', '--slow-checkpoints', '4']).report.retrospective.recommendation, 'NOT_TRIGGERED');
});
runTest('status refresh, repeated receipts and a new summary do not reset progress', () => {
  const f = fixture(); noProgress(f); f.data.progress.recordedAt = now.toISOString();
  const r = run(f); assert.equal(r.report.progress.lastEffectiveProgress.at, '2026-11-12T09:00:00Z'); assert.equal(r.report.progress.noProgressCheckpoints, 3);
});
runTest('unknown active time is not inferred from wall clock; checkpoint evidence still works', () => {
  const f = fixture(); noProgress(f, 2); for (const item of f.data.progress.checkpoints) delete item.workSource;
  const r = run(f); assert.equal(r.report.progress.recordedActiveMinutesWithoutProgress, null); assert.equal(r.report.retrospective.recommendation, 'NOT_TRIGGERED');
  noProgress(f, 1); // duplicate history must not be used to trigger
  assert.equal(run(f).report.progress.state, 'UNKNOWN');
});
runTest('paused and approval/external waiting are not technical stagnation', () => {
  for (const state of ['paused', 'waiting_approval', 'waiting_external']) {
    const f = fixture(); noProgress(f); f.data.progress.execution.state = state;
    assert.equal(run(f).report.retrospective.recommendation, 'WAITING');
  }
});
runTest('a long build or old running entry requires observation and never declares current running', () => {
  const f = fixture(); noProgress(f); f.data.progress.execution.state = 'running';
  const r = run(f); assert.equal(r.report.execution.current, 'UNKNOWN'); assert.equal(r.report.retrospective.recommendation, 'INSPECT_RUNTIME');
});
runTest('retrospective decision is shown without resetting progress or looping the same trigger', () => {
  const f = fixture(); noProgress(f); f.data.progress.retrospective = { at: '2026-11-12T11:00:00Z', decision: 'help', reason: 'Need current permission', nextStep: 'Ask concrete question' };
  const r = run(f); assert.equal(r.report.retrospective.recommendation, 'FOLLOW_RECORDED_DECISION'); assert.equal(r.report.progress.recordedActiveMinutesWithoutProgress, 120);
});
runTest('future/out-of-order/different-revision history cannot manufacture progress', () => {
  for (const mutation of [r => r.at = '2027-01-01T00:00:00Z', r => r.goalRevision = 'R1', r => r.verifiedActionIds = ['T1', 'T1']]) {
    const f = fixture(); mutation(f.data.progress.checkpoints[0]); assert.equal(run(f).report.progress.state, 'UNKNOWN');
  }
});
runTest('an unverified action listed as progress is not counted', () => {
  const f = fixture(); f.data.progress.checkpoints[0].verifiedActionIds = ['T2'];
  assert.equal(run(f).report.progress.lastEffectiveProgress, null);
});
runTest('missing checker or failed checker does not turn done into verified', () => {
  const f = fixture(); const r = run(f, [], { inspect: () => ({ status: 'UNAVAILABLE', actions: [], gaps: ['Python missing'] }) });
  assert.equal(r.code, 2); assert.equal(r.report.counts.VERIFIED, 0); assert.equal(r.report.times.evidenceCheckedAt, null);
});
runTest('malformed checkpoint, traversal and linked checkpoints are rejected', () => {
  const f = fixture(); const out = sink(), err = sink();
  for (const name of ['../checkpoint.json', '/etc/passwd', 'C:checkpoint.json']) assert.equal(goalStatus(['--goal', name, '--current-goal', 'R2'], { project: f.root, out, err }), 2);
  fs.symlinkSync(path.join(f.root, 'checkpoint.json'), path.join(f.root, 'link.json'));
  assert.equal(goalStatus(['--goal', 'link.json', '--current-goal', 'R2'], { project: f.root, out, err }), 2);
  f.put('checkpoint.json', '[]'); assert.equal(goalStatus(['--goal', 'checkpoint.json', '--current-goal', 'R2'], { project: f.root, out, err }), 2);
});
runTest('unsafe or malformed optional thresholds and missing latest revision fail clearly', () => {
  const f = fixture();
  for (const args of [['--stalled-minutes', 'NaN'], ['--slow-checkpoints', '0'], ['--slow-checkpoints', '1.5'], ['--execute']]) assert.equal(run(f, args).code, 2);
  assert.equal(goalStatus(['--goal', 'checkpoint.json'], { project: f.root, out: sink(), err: sink() }), 2);
});
runTest('status --goal uses the projection without build or gate evaluation', async () => {
  const f = fixture(), out = sink(), err = sink();
  const code = await statusOverview(null, ['--goal', 'checkpoint.json', '--current-goal', 'R2'], { project: f.root, out, err,
    evaluate: () => { throw new Error('must not evaluate gates for a goal query'); } });
  assert.equal(code, 0, err.value); assert.match(out.value, /ForgeFlow 目标进度/);
});
runTest('actual CLI routes goal status without requiring a build', () => {
  const f = fixture();
  const cli = fileURLToPath(new URL('./ff-spec.mjs', import.meta.url));
  const r = spawnSync(process.execPath, [cli, 'status', '--goal', 'checkpoint.json', '--current-goal', 'R2', '--json'], { cwd: f.root, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr); assert.equal(JSON.parse(r.stdout).counts.VERIFIED, 1);
});

runTest('stale history is unknown rather than a false stagnation trigger', () => {
  const f = fixture(); noProgress(f); f.put('output.txt', 'changed after checkpoint');
  const r = run(f); assert.equal(r.report.progress.state, 'UNKNOWN'); assert.equal(r.report.retrospective.recommendation, 'UNKNOWN');
});
runTest('ready without an observation source or valid timestamp cannot trigger', () => {
  for (const mutate of [p => delete p.source, p => delete p.observedAt, p => p.observedAt = '2027-01-01T00:00:00Z']) {
    const f = fixture(); noProgress(f); mutate(f.data.progress.execution);
    assert.equal(run(f).report.retrospective.recommendation, 'UNKNOWN');
  }
});
runTest('recorded active minutes exceeding the checkpoint interval are not accumulated', () => {
  const f = fixture(); noProgress(f, 2, 1000);
  const r = run(f); assert.equal(r.report.progress.recordedActiveMinutesWithoutProgress, null);
  assert.equal(r.report.retrospective.recommendation, 'NOT_TRIGGERED');
});
