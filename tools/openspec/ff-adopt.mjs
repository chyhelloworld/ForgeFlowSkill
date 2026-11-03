#!/usr/bin/env node
/**
 * Infer a v2 gate policy from artifacts a project already writes.
 * Printing is the default; --write saves openspec/ff-policy.json so gates can be turned on
 * without hand-writing glob syntax. Inference stays conservative: an artifact is proposed
 * only when every active change already carries that file, and never invents tasks.
 */
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';

const usage = 'Usage: node .forgeflow/ff-spec.mjs adopt [--write] [--force] [--json]';
const CANDIDATES = [
  { id: 'design', file: 'design.md', requires: [] },
  { id: 'plan', file: 'plan.md', requires: ['design'] },
];

function activeChanges(project) {
  const dir = path.join(project, 'openspec/changes');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter(entry => entry.isDirectory() && entry.name !== 'archive' && !entry.name.startsWith('.'))
    .map(entry => entry.name)
    .sort();
}
// The evaluator rejects missing, empty and nonregular files; inference must not propose
// a path it would reject, or --write would succeed and the preview would fail afterwards.
function has(project, change, file) {
  const target = path.join(project, 'openspec/changes', change, file);
  try { const stat = fs.lstatSync(target); return stat.isFile() && stat.size > 0; }
  catch { return false; }
}
function infer(project, changes) {
  const artifacts = [], skipped = [];
  for (const candidate of CANDIDATES) {
    const present = changes.filter(change => has(project, change, candidate.file));
    if (!present.length) continue;
    if (present.length !== changes.length) {
      const missing = changes.filter(change => !present.includes(change));
      skipped.push({ id: candidate.id, file: candidate.file, reason: 'missing in ' + missing.join(', ') });
      continue;
    }
    artifacts.push({ id: candidate.id, changes: ['*'], paths: ['openspec/changes/{change}/' + candidate.file],
      requires: candidate.requires.filter(id => artifacts.some(done => done.id === id)), reviewRequired: true });
  }
  const planFile = artifacts.some(a => a.id === 'plan') ? 'plan.md' : 'design.md';
  const timed = artifacts.find(a => a.id === (planFile === 'plan.md' ? 'plan' : 'design'));
  // Progress is only meaningful when the plan document actually parses as a task plan.
  const planned = (change, file) => {
    const target = path.join(project, 'openspec/changes', change, file);
    return fs.existsSync(target) && /^##\s+Task plan\s*$/m.test(fs.readFileSync(target, 'utf8'));
  };
  const tracked = changes.length > 0 && changes.every(change => has(project, change, 'tasks.md') && planned(change, planFile));
  if (timed && tracked) timed.progress = { plan: 'openspec/changes/{change}/' + planFile, tasks: 'openspec/changes/{change}/tasks.md' };
  const note = artifacts.length && !(timed && tracked)
    ? 'no progress mapping: add tasks.md and a plan document with a ## Task plan heading to every active change to gate task completion'
    : undefined;
  return { policy: { version: 2, artifacts }, skipped, timed: Boolean(timed && tracked), ...(note ? { note } : {}) };
}
function preview(project, changes, evaluate) {
  return changes.map(change => {
    const dir = path.join(project, 'openspec/changes', change);
    try {
      const result = evaluate(project, dir);
      const reasons = result.reasons ?? [];
      const only = reasons.every(reason => /Artifact record is missing/.test(reason));
      return { change, state: result.valid ? 'valid' : only ? 'awaiting receipt' : 'blocked', reasons: only ? [] : reasons.slice(0, 3) };
    } catch (error) { return { change, state: 'blocked', reasons: [error?.message ?? String(error)] }; }
  });
}
function render(report) {
  const lines = ['ForgeFlow adopt  (' + report.project + ')'];
  lines.push('  changes: ' + (report.changes.length ? report.changes.join(', ') : 'none active'));
  if (!report.policy.artifacts.length) lines.push('  detected: no artifact file present in every active change');
  for (const artifact of report.policy.artifacts) lines.push('  artifact: ' + artifact.id + '  <- ' + artifact.paths[0]
    + (artifact.progress ? '  (progress: ' + artifact.progress.tasks + ')' : ''));
  for (const skip of report.skipped) lines.push('  skipped:  ' + skip.id + ' — ' + skip.reason);
  if (report.note) lines.push('  note:     ' + report.note);
  if (report.written) lines.push('  wrote:    openspec/ff-policy.json');
  else lines.push('  policy (not written; rerun with --write):');
  if (!report.written) for (const line of JSON.stringify(report.policy, null, 2).split('\n')) lines.push('    ' + line);
  for (const row of report.preview ?? []) lines.push('  ' + row.change + ': ' + row.state + (row.reasons.length ? ' — ' + row.reasons[0] : ''));
  if (report.written) {
    lines.push('  next:  node .forgeflow/ff-spec.mjs status');
    if (report.changes.length) lines.push('         node .forgeflow/ff-spec.mjs receipt snapshot ' + report.changes[0] + ' reviews/' + report.changes[0] + '-snapshot.json');
  }
  return lines;
}
export async function adoptMain(build, argv, options = {}) {
  const out = options.out ?? process.stdout;
  const err = options.err ?? process.stderr;
  const project = path.resolve(options.project ?? process.cwd());
  let write = false, force = false, json = false;
  for (const arg of argv) {
    if (arg === '--write') write = true;
    else if (arg === '--force') force = true;
    else if (arg === '--json') json = true;
    else { err.write(usage + '\n'); return 1; }
  }
  if (force && !write) { err.write(usage + '\n'); return 1; }
  if (!fs.existsSync(path.join(project, 'openspec'))) { err.write('adopt expects an initialized project: run node .forgeflow/ff-spec.mjs init first\n'); return 1; }
  const changes = activeChanges(project);
  const { policy, skipped, timed, note } = infer(project, changes);
  const target = path.join(project, 'openspec/ff-policy.json');
  if (write && fs.existsSync(target) && !force) { err.write('openspec/ff-policy.json exists; review it, or pass --force to replace it\n'); return 1; }
  // An empty policy is rejected by the evaluator, so writing one would leave status and validate disagreeing.
  if (write && !policy.artifacts.length) { err.write('no artifact file is present in every active change; nothing written\n'); return 1; }
  const report = { project, changes, policy, skipped, progress: Boolean(timed), ...(note ? { note } : {}), written: false };
  if (write) {
    const temporary = target + '.' + randomUUID() + '.tmp';
    fs.writeFileSync(temporary, JSON.stringify(policy, null, 2) + '\n');
    try { fs.renameSync(temporary, target); } finally { if (fs.existsSync(temporary)) fs.unlinkSync(temporary); }
    report.written = true;
    if (build || options.evaluate) {
      let evaluate = options.evaluate;
      if (!evaluate) ({ evaluateFF: evaluate } = await import(pathToFileURL(path.join(build, 'dist/core/ff-validity.js')).href));
      report.preview = preview(project, changes, evaluate);
    }
  }
  if (json) out.write(JSON.stringify(report, null, 2) + '\n');
  else out.write(render(report).join('\n') + '\n');
  return report.preview?.some(row => row.state === 'blocked') ? 1 : 0;
}