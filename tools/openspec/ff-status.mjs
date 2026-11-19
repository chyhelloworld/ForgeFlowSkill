#!/usr/bin/env node
/**
 * Gate overview for one project: what is configured, what is blocked, what to run next.
 * Reads only openspec/ state; gate verdicts come from the bundled ff-validity build.
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { goalStatus } from './ff-goal-status.mjs';

const usage = 'Usage: node .forgeflow/ff-spec.mjs status [--strict] [--json]';

function taskCounts(file) {
  if (!fs.existsSync(file)) return null;
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  let done = 0, total = 0;
  for (const line of lines) {
    const match = /^- \[([ xX])\]\s+\S/.exec(line);
    if (!match) continue;
    total += 1;
    if (match[1].toLowerCase() === 'x') done += 1;
  }
  return { done, total };
}

function activeChanges(project) {
  const dir = path.join(project, 'openspec/changes');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter(entry => entry.isDirectory() && entry.name !== 'archive' && !entry.name.startsWith('.'))
    .map(entry => entry.name)
    .sort();
}

function relativeChange(name) {
  return `openspec/changes/${name}`.split(path.sep).join('/');
}

// A present file is not a usable gate: the evaluator rejects version/artifacts shapes.
function policyState(file) {
  if (!fs.existsSync(file)) return { state: 'missing' };
  let parsed;
  try { parsed = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return { state: 'invalid', reason: 'unreadable JSON' }; }
  if (![1, 2].includes(parsed?.version) || !Array.isArray(parsed?.artifacts) || !parsed.artifacts.length)
    return { state: 'invalid', reason: 'requires version 1 or 2 and nonempty artifacts' };
  return { state: 'configured' };
}

function collect(project, evaluate) {
  const policy = policyState(path.join(project, 'openspec/ff-policy.json'));
  const configured = policy.state === 'configured';
  const rows = activeChanges(project).map(change => {
    const dir = path.join(project, 'openspec/changes', change);
    const tasks = taskCounts(path.join(dir, 'tasks.md'));
    let validity;
    let error;
    try { validity = evaluate(project, relativeChange(change)); } catch (reason) { error = reason?.message ?? String(reason); }
    const artifacts = validity?.artifacts?.length ? { valid: validity.artifacts.filter(a => a.state === 'valid').length, total: validity.artifacts.length } : null;
    return { change, configured, tasks, artifacts, valid: Boolean(validity?.valid), tracked: Boolean(validity), reasons: [...(validity?.reasons ?? []), ...(error ? [error] : [])].slice(0, 3) };
  });
  return { project, configured, policy, rows };
}

function render(report) {
  const lines = [`ForgeFlow status  (${report.project})`];
  if (!report.openspec) {
    lines.push('  gates: DISABLED — openspec/ not found; this project has no ForgeFlow configuration.');
    lines.push('  next:  node .forgeflow/ff-spec.mjs init');
    return lines;
  }
  lines.push(report.policy.state === 'configured'
    ? '  gates: CONFIGURED — openspec/ff-policy.json present; archive and validate enforce FF artifacts.'
    : report.policy.state === 'invalid'
      ? '  gates: INVALID — openspec/ff-policy.json is present but ' + report.policy.reason + '; run node .forgeflow/ff-spec.mjs receipt diagnose.'
      : '  gates: DISABLED — openspec/ff-policy.json missing; archive still succeeds without validity or receipt checks.');
  if (!report.rows.length) {
    lines.push('  changes: none active');
    if (report.policy.state === 'invalid') lines.push('  next:  fix openspec/ff-policy.json, or rerun node .forgeflow/ff-spec.mjs adopt --write --force');
    else if (!report.configured) lines.push('  next:  node .forgeflow/ff-spec.mjs adopt --write  (infers a policy from files you already have)');
    return lines;
  }
  lines.push(`  changes: ${report.rows.length} active`);
  const head = ['change', 'artifacts', 'tasks', 'state'];
  const body = report.rows.map(row => [
    row.change,
    row.artifacts ? `${row.artifacts.valid}/${row.artifacts.total}` : '—',
    row.tasks ? `${row.tasks.done}/${row.tasks.total}` : '—',
    !row.tracked ? 'not tracked' : row.valid ? 'valid' : 'BLOCKED',
  ]);
  const width = head.map((cell, index) => Math.max(cell.length, ...body.map(line => line[index].length)));
  const format = line => '  ' + line.map((cell, index) => index === line.length - 1 ? cell : cell.padEnd(width[index] + 2)).join('');
  lines.push(format(head));
  for (const line of body) lines.push(format(line));
  for (const row of report.rows) if (row.reasons.length) lines.push(`  ${row.change}: ${row.reasons[0]}`);
  if (report.policy.state === 'invalid') lines.push('  next:  fix openspec/ff-policy.json, or rerun node .forgeflow/ff-spec.mjs adopt --write --force, then node .forgeflow/ff-spec.mjs receipt diagnose');
  else if (!report.configured) lines.push('  next:  node .forgeflow/ff-spec.mjs adopt --write, then node .forgeflow/ff-spec.mjs receipt diagnose');
  else if (report.rows.some(row => !row.valid)) lines.push('  next:  node .forgeflow/ff-spec.mjs receipt diagnose');
  return lines;
}

export async function statusOverview(build, argv, options = {}) {
  if (argv.includes('--goal')) return goalStatus(argv, options);
  const out = options.out ?? process.stdout;
  const err = options.err ?? process.stderr;
  const project = path.resolve(options.project ?? process.cwd());
  let strict = false, json = false;
  for (const arg of argv) {
    if (arg === '--strict') strict = true;
    else if (arg === '--json') json = true;
    else { err.write(`${usage}\n`); return 1; }
  }
  let evaluate = options.evaluate;
  if (!evaluate) {
    if (!build) { err.write('status requires the bundled build to evaluate gates; run node tools/openspec/build.mjs\n'); return 1; }
    ({ evaluateFF: evaluate } = await import(pathToFileURL(path.join(build, 'dist/core/ff-validity.js')).href));
  }
  const openspec = fs.existsSync(path.join(project, 'openspec'));
  const report = { ...collect(project, openspec ? evaluate : () => undefined), openspec };
  if (json) out.write(JSON.stringify({ ...report, blocked: report.rows.filter(row => row.tracked && !row.valid).map(row => row.change) }, null, 2) + '\n');
  else out.write(render(report).join('\n') + '\n');
  const blocked = report.rows.filter(row => row.tracked && !row.valid);
  // A malformed policy is a failing gate even when no change is active to expose it.
  return strict && (blocked.length || report.policy.state === 'invalid') ? 1 : 0;
}
