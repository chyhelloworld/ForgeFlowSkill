/** Read-only projection of an existing handoff checkpoint, never another task store. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const checker = fileURLToPath(new URL('../../skills/ff-handoff/scripts/resume.py', import.meta.url));
const usage = 'Usage: node .forgeflow/ff-spec.mjs status --goal <project-relative-checkpoint.json> --current-goal <revision> [--json] [--stalled-minutes 120] [--slow-checkpoints 3]';
const text = value => typeof value === 'string' && value.trim() ? value : null;
const object = value => value && typeof value === 'object' && !Array.isArray(value);
const instant = value => typeof value === 'string' && /^\d{4}-\d\d-\d\dT.*(?:Z|[+-]\d\d:\d\d)$/.test(value) && Number.isFinite(Date.parse(value)) ? Date.parse(value) : null;
const states = new Set(['ready', 'running', 'paused', 'waiting_approval', 'waiting_external', 'unknown']);
const decisions = new Set(['continue', 'adjust', 'help', 'stop']);

function localFile(root, name) {
  if (!text(name) || path.isAbsolute(name) || /[\\:\0]/.test(name) || name.split('/').includes('..')) throw new Error('checkpoint must be a project-relative path without links');
  let current = root;
  for (const part of name.split('/').filter(part => part && part !== '.')) {
    current = path.join(current, part);
    if (fs.lstatSync(current).isSymbolicLink()) throw new Error('checkpoint links are not supported');
  }
  const stat = fs.statSync(current);
  if (!stat.isFile() || stat.size > 1024 * 1024) throw new Error('checkpoint must be a file of at most 1 MiB');
  return current;
}

/** Calls only the pinned FF reader, with arguments, not shell or project scripts. */
export function inspectCheckpoint(root, file, goal) {
  const command = process.platform === 'win32' ? 'python' : 'python3';
  const result = spawnSync(command, ['-I', '-S', '-B', checker, file, '--root', root, '--current-goal', goal], {
    cwd: root, shell: false, encoding: 'utf8', timeout: 15000, maxBuffer: 2 * 1024 * 1024,
    env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' },
  });
  if (result.error || ![0, 1].includes(result.status)) return {
    status: 'UNAVAILABLE', actions: [], gaps: [`resume checker unavailable: ${result.error?.message ?? result.stderr?.trim() ?? `exit ${result.status}`}`],
  };
  try {
    const report = JSON.parse(result.stdout);
    if (!['INSPECT', 'CHECKPOINT_CURRENT'].includes(report.status) || !Array.isArray(report.actions) || !Array.isArray(report.gaps)) throw new Error('unexpected report');
    return report;
  } catch { return { status: 'UNAVAILABLE', actions: [], gaps: ['resume checker returned an invalid report'] }; }
}

function progressHistory(progress, actions, revision, now) {
  const records = progress.checkpoints;
  if (records === undefined) return { state: 'UNKNOWN', reason: 'No progress checkpoints recorded', lastEffectiveProgress: null };
  if (!Array.isArray(records)) return { state: 'UNKNOWN', reason: 'Invalid progress checkpoints', lastEffectiveProgress: null };
  const verified = new Set(actions.filter(action => action.status === 'VERIFIED').map(action => action.id));
  const seen = new Set(), ids = new Set();
  let previous = -Infinity, last = null, noProgress = 0, activeMinutes = 0, timeKnown = true;
  for (const record of records) {
    const at = instant(record?.at);
    if (!object(record) || !text(record.id) || ids.has(record.id) || at === null || at <= previous || at > now || record.goalRevision !== revision ||
      !Array.isArray(record.verifiedActionIds) || record.verifiedActionIds.some(id => !text(id)) || new Set(record.verifiedActionIds).size !== record.verifiedActionIds.length) {
      return { state: 'UNKNOWN', reason: 'History has invalid, duplicated, out-of-order, future or different-revision records', lastEffectiveProgress: null };
    }
    const intervalMinutes = Number.isFinite(previous) ? (at - previous) / 60000 : null;
    ids.add(record.id); previous = at;
    if (record.verifiedActionIds.some(id => !verified.has(id))) return {
      state: 'UNKNOWN', reason: 'Recorded progress references unverified or stale action evidence', lastEffectiveProgress: null };
    // A checkbox, fresh status timestamp or repeated green test is not new evidence.
    const fresh = record.verifiedActionIds.filter(id => verified.has(id) && !seen.has(id));
    for (const id of record.verifiedActionIds) if (verified.has(id)) seen.add(id);
    if (fresh.length) {
      last = { at: record.at, actionIds: fresh, basis: 'recorded checkpoint; receipts verified at query time' };
      noProgress = 0; activeMinutes = 0; timeKnown = true;
    } else {
      noProgress++;
      if (typeof record.activeMinutes === 'number' && Number.isFinite(record.activeMinutes) && record.activeMinutes >= 0 && intervalMinutes !== null && record.activeMinutes <= intervalMinutes && text(record.workSource)) activeMinutes += record.activeMinutes;
      else timeKnown = false;
    }
  }
  return { state: records.length ? 'RECORDED' : 'UNKNOWN', lastEffectiveProgress: last, noProgressCheckpoints: noProgress,
    recordedActiveMinutesWithoutProgress: timeKnown && records.length ? activeMinutes : null,
    latestCheckpointAt: records.at(-1)?.at ?? null,
    basis: 'Recorded active minutes exclude pause/wait; they are not wall-clock measurements by this command.' };
}

function retrospective(progress, history, thresholds, now, gaps) {
  const raw = object(progress.retrospective) ? progress.retrospective : {};
  const at = instant(raw.at);
  const recorded = at !== null && at <= now && decisions.has(raw.decision) && text(raw.reason)
    ? { at: raw.at, decision: raw.decision, reason: raw.reason, nextStep: text(raw.nextStep) } : null;
  const observation = progress.execution;
  const observedAt = instant(observation?.observedAt);
  const state = observedAt !== null && observedAt <= now && text(observation?.source) ? observation.state : 'unknown';
  const result = { recommendation: 'UNKNOWN', reason: 'No reliable progress history', thresholds, recorded,
    action: 'Read-only recommendation at an existing checkpoint; no pause, retry, process termination or wake is performed.' };
  if (['paused', 'waiting_approval', 'waiting_external'].includes(state)) return { ...result, recommendation: 'WAITING', reason: `Last recorded state is ${state}; verify current waiting condition, do not count it as technical stagnation.` };
  if (state === 'running') return { ...result, recommendation: 'INSPECT_RUNTIME', reason: 'Last recorded operation was running; inspect its result/liveness before classifying a long build or retrying.' };
  if (gaps.length) return { ...result, reason: 'Resolve evidence gaps before classifying technical stagnation.' };
  if (history.state !== 'RECORDED') return result;
  if (state !== 'ready') return { ...result, reason: 'Execution state is unknown; verify it before treating recorded inactivity as technical stagnation.' };
  // Do not reissue an identical retrospective for the same unchanged snapshot.
  if (recorded && Date.parse(recorded.at) >= Date.parse(history.latestCheckpointAt)) return {
    ...result, recommendation: 'FOLLOW_RECORDED_DECISION', reason: 'A retrospective already covers the latest checkpoint; it does not reset effective progress.' };
  const stalled = history.recordedActiveMinutesWithoutProgress !== null && history.recordedActiveMinutesWithoutProgress >= thresholds.stalledMinutes;
  const slow = history.noProgressCheckpoints >= thresholds.slowCheckpoints;
  return { ...result, recommendation: stalled || slow ? 'RETROSPECTIVE_DUE' : 'NOT_TRIGGERED',
    reason: stalled ? 'Recorded active-work threshold reached without newly verified action evidence.' : slow ? 'Consecutive checkpoints have no newly verified action evidence.' : 'Recorded thresholds not reached; unknown active duration is not assumed to be zero.' };
}

export function projectGoalStatus(data, inspection, { currentGoal, now = new Date(), thresholds = { stalledMinutes: 120, slowCheckpoints: 3 } } = {}) {
  const queriedAt = now.toISOString(), time = now.getTime();
  const progress = object(data.progress) ? data.progress : {};
  const results = new Map(inspection.actions.map(action => [action.id, action]));
  const actions = (Array.isArray(data.actions) ? data.actions : []).map(action => {
    const checked = results.get(action?.id);
    const status = checked?.recommendation === 'SKIP_COMPLETED' ? 'VERIFIED'
      : ['blocked', 'waiting_approval', 'waiting_external'].includes(action?.state) ? 'BLOCKED'
      : action?.state === 'paused' ? 'PAUSED'
      : action?.state === 'pending' && checked?.recommendation === 'VERIFY_CURRENT_AUTHORITY' ? 'NOT_STARTED' : 'NEEDS_VERIFICATION';
    return { id: text(action?.id), title: text(action?.title), status, lastRecordedState: text(action?.state),
      blocker: text(action?.blocker), nextStep: text(action?.nextStep), gaps: checked?.gaps ?? ['No verified resume result'] };
  });
  const knownTime = value => instant(value) !== null && instant(value) <= time ? value : null;
  const observation = object(progress.execution) ? progress.execution : {};
  const history = progressHistory(progress, actions, currentGoal, time);
  // Without fresh host/process observation, even a recent running record is historical.
  return {
    status: inspection.status === 'UNAVAILABLE' ? 'UNKNOWN' : inspection.gaps.length ? 'NEEDS_INSPECTION' : 'EVIDENCE_CHECKED',
    goal: { text: text(progress.goal), scope: text(progress.scope), plan: text(progress.plan), currentRevision: currentGoal,
      recordedRevision: text(data.goalRevision), revisionMatches: data.goalRevision === currentGoal },
    times: { queriedAt, evidenceCheckedAt: inspection.status === 'UNAVAILABLE' ? null : queriedAt,
      recordedAt: knownTime(progress.recordedAt), lastRecordedFactCheckAt: knownTime(progress.lastFactCheckAt) },
    currentActionId: actions.some(action => action.id === progress.currentActionId) ? progress.currentActionId : null,
    execution: { current: 'UNKNOWN', lastRecordedState: states.has(observation.state) ? observation.state : 'unknown',
      observedAt: knownTime(observation.observedAt), source: text(observation.source), note: 'This query does not observe host jobs or processes.' },
    counts: Object.fromEntries(['VERIFIED', 'NEEDS_VERIFICATION', 'BLOCKED', 'PAUSED', 'NOT_STARTED'].map(state => [state, actions.filter(action => action.status === state).length])),
    actions, progress: history, nextStep: text(progress.nextStep), retrospective: retrospective(progress, history, thresholds, time, inspection.gaps),
    gaps: inspection.gaps,
    limits: ['Receipt validation is evidence of recorded operations, not user acceptance or completeness of the business goal.',
      'No completion percentage or ETA is inferred from task counts.', 'Read only: no build, test, cleanup, receipt writing, native-goal sync or scheduler.'],
  };
}

export function renderGoalStatus(report) {
  const lines = [`ForgeFlow 目标进度 (${report.status})`, `目标: ${report.goal.text ?? 'unknown'} [${report.goal.currentRevision}]`,
    `范围/非目标: ${report.goal.scope ?? 'unknown'}`, `唯一计划: ${report.goal.plan ?? 'unknown'}`,
    `查询: ${report.times.queriedAt}; 证据核查: ${report.times.evidenceCheckedAt ?? 'unknown'}`,
    `状态记录: ${report.times.recordedAt ?? 'unknown'}; 上次记录的事实核查: ${report.times.lastRecordedFactCheckAt ?? 'unknown'}`,
    `当前切片: ${report.currentActionId ?? 'unknown'}`, `运行: UNKNOWN; 最后记录 ${report.execution.lastRecordedState} @ ${report.execution.observedAt ?? 'unknown'}`,
    `已验证操作 ${report.counts.VERIFIED}; 待核查 ${report.counts.NEEDS_VERIFICATION}; 受阻 ${report.counts.BLOCKED}; 暂停 ${report.counts.PAUSED}; 未开始 ${report.counts.NOT_STARTED}`];
  for (const action of report.actions) lines.push(`  ${action.id ?? '?'} ${action.status} ${action.title ?? ''}${action.blocker ? ` — ${action.blocker}` : ''}`);
  lines.push(`最近有效进展: ${report.progress.lastEffectiveProgress ? `${report.progress.lastEffectiveProgress.at} (${report.progress.lastEffectiveProgress.actionIds.join(', ')})` : 'unknown'}`,
    `下一步: ${report.nextStep ?? 'unknown'}`, `复盘: ${report.retrospective.recommendation} — ${report.retrospective.reason}`);
  if (report.retrospective.recorded) lines.push(`上次复盘: ${report.retrospective.recorded.decision} — ${report.retrospective.recorded.reason}`);
  for (const gap of report.gaps) lines.push(`待核查: ${gap}`);
  lines.push('只读证据投影；不是实时进程监控、真人验收或完成百分比。');
  return lines.join('\n') + '\n';
}

export function goalStatus(argv, options = {}) {
  const out = options.out ?? process.stdout, err = options.err ?? process.stderr;
  let checkpoint, currentGoal, json = false;
  const thresholds = { stalledMinutes: 120, slowCheckpoints: 3 };
  try {
    for (let index = 0; index < argv.length; index++) {
      const arg = argv[index];
      if (arg === '--json') json = true;
      else if (['--goal', '--current-goal', '--stalled-minutes', '--slow-checkpoints'].includes(arg)) {
        const value = argv[++index];
        if (!value || value.startsWith('--')) throw new Error('Missing option value');
        if (arg === '--goal') checkpoint = value;
        else if (arg === '--current-goal') currentGoal = value;
        else {
          const number = Number(value);
          if (!Number.isFinite(number) || number <= 0 || (arg === '--slow-checkpoints' && !Number.isInteger(number))) throw new Error('Threshold must be positive (checkpoint count must be an integer)');
          thresholds[arg === '--stalled-minutes' ? 'stalledMinutes' : 'slowCheckpoints'] = number;
        }
      } else throw new Error(`Unsupported option: ${arg}`);
    }
    if (!checkpoint || !text(currentGoal)) throw new Error('Checkpoint and independently confirmed current goal revision are required');
    const root = fs.realpathSync(path.resolve(options.project ?? process.cwd()));
    const file = localFile(root, checkpoint), bytes = fs.readFileSync(file);
    const data = JSON.parse(bytes);
    if (!object(data)) throw new Error('checkpoint must be an object');
    const inspection = (options.inspect ?? inspectCheckpoint)(root, file, currentGoal);
    if (!bytes.equals(fs.readFileSync(file))) throw new Error('Checkpoint changed during query; retry a fresh read before relying on the result');
    const report = projectGoalStatus(data, inspection, { currentGoal, now: options.now ?? new Date(), thresholds });
    if (json) out.write(JSON.stringify(report, null, 2) + '\n'); else out.write(renderGoalStatus(report));
    return inspection.status === 'UNAVAILABLE' ? 2 : 0;
  } catch (error) {
    err.write(`${error.message}\n${usage}\n`);
    return 2;
  }
}
