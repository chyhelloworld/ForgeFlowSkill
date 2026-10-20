// Deterministic evidence bookkeeping. Content binding is not reviewer authentication.
import fs from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
function safe(root, name) {
  if (!name || name.includes('\\') || name.includes(':') || name.startsWith('/') || name.split('/').some(n => !n || n === '.' || n === '..')) throw new Error(`Unsafe project path: ${name}`);
  let current = root;
  for (const part of name.split('/')) {
    current = path.join(current, part);
    const stat = fs.lstatSync(current, { throwIfNoEntry: false });
    if (stat?.isSymbolicLink()) throw new Error(`Symlink in evidence path: ${name}`);
  }
  return current;
}
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
function keys(value, allowed, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be an object`);
  for (const key of Object.keys(value)) if (!allowed.includes(key)) throw new Error(`${label}: unknown field ${key}`);
}
function create(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
}
function changePath(root, change) {
  if (!/^[\p{L}\p{N}_-]+$/u.test(change) || change === 'archive') throw new Error('A flat active change name is required');
  const directory = safe(root, `openspec/changes/${change}`);
  if (!fs.statSync(directory).isDirectory()) throw new Error('Active change directory is required');
  return directory;
}
function capture(root, change, evaluate) {
  const result = evaluate(root, changePath(root, change));
  if (result?.protocol !== 2 || !result.rules?.length || !result.artifacts.length || result.artifacts.some(a => !a.fingerprint || !a.inputs || !a.files?.length)) throw new Error(`A valid v2 policy and readable artifact scopes are required: ${result?.reasons.join('; ') ?? 'FF unconfigured'}`);
  if (result.artifacts.some(a => a.reasons.some(r => r.startsWith('Progress') || r.startsWith('Stable plan')))) throw new Error(result.reasons.join('; '));
  return { protocol: 2, change, policyHash: result.policyHash, schemaHash: result.schemaHash, rules: result.rules,
    artifacts: result.artifacts.map(a => ({ id: a.id, fingerprint: a.fingerprint, inputs: a.inputs, files: a.files })) };
}
function snapshot(file) {
  const saved = read(file);
  if (saved.version !== 1 || saved.snapshotHash !== sha(JSON.stringify(saved.binding))) throw new Error('Invalid review snapshot');
  return saved;
}
function sameSnapshot(saved, binding) {
  if (saved.snapshotHash !== sha(JSON.stringify(binding))) throw new Error('Review snapshot is stale: content, applicable rules, schema or inputs changed; review the changed scope');
}
function boundEvidence(root, evidence, reportPath) {
  if (!Array.isArray(evidence)) throw new Error('Report evidence must be an array of frozen path/sha256 records; use template --evidence PATH');
  const seen = new Set([reportPath]);
  return evidence.map(item => {
    keys(item, ['path', 'sha256'], 'Report evidence');
    const file = safe(root, item.path);
    if (seen.has(item.path) || !fs.statSync(file).isFile() || !/^[a-f0-9]{64}$/.test(item.sha256)) throw new Error('Evidence paths must be unique regular files with frozen sha256');
    seen.add(item.path);
    if (sha(fs.readFileSync(file)) !== item.sha256) throw new Error(`Review evidence hash mismatch: ${item.path}`);
    return item;
  });
}
function recordsFromReport(root, saved, report, reportPath, bytes) {
  keys(report, ['version', 'snapshotHash', 'artifacts'], 'Report');
  if (report.version !== 1 || report.snapshotHash !== saved.snapshotHash || !report.artifacts || typeof report.artifacts !== 'object') throw new Error('Report must bind the reviewed snapshotHash');
  const expected = saved.binding.artifacts.map(a => a.id).sort();
  if (JSON.stringify(Object.keys(report.artifacts).sort()) !== JSON.stringify(expected)) throw new Error('Report must cover exactly the snapshot artifacts');
  return Object.fromEntries(saved.binding.artifacts.map(a => {
    const review = report.artifacts[a.id];
    keys(review, ['version', 'verdict', 'reviewer', 'toolVersion', 'unverified', 'evidence'], 'Artifact report');
    for (const field of ['version', 'reviewer', 'toolVersion']) if (typeof review[field] !== 'string' || !review[field].trim()) throw new Error(`Report requires explicit ${field}`);
    if (!['pass', 'fail'].includes(review.verdict) || !Array.isArray(review.unverified) || review.unverified.some(s => typeof s !== 'string')) throw new Error('Report requires an explicit pass/fail verdict and unverified array; draft is not a verdict');
    return [a.id, { version: review.version, fingerprint: a.fingerprint, inputs: a.inputs,
      review: { verdict: review.verdict, targetId: a.id, targetVersion: review.version, targetFingerprint: a.fingerprint, inputs: a.inputs,
        reviewer: review.reviewer, toolVersion: review.toolVersion, snapshotHash: saved.snapshotHash,
        evidence: [{ path: reportPath, sha256: sha(bytes) }, ...boundEvidence(root, review.evidence ?? [], reportPath)] } }];
  }));
}
function record(root, change, snapshotPath, reportPath, migrate, evaluate) {
  const saved = snapshot(safe(root, snapshotPath));
  const current = capture(root, change, evaluate);
  sameSnapshot(saved, current);
  const target = safe(root, `openspec/changes/${change}/ff-artifacts.json`);
  const reportFile = safe(root, reportPath);
  if ([snapshotPath, reportPath].some(n => current.artifacts.some(a => a.files.some(f => f.path === n))) || reportFile === target) throw new Error('Review snapshot/report must be separate from artifacts and receipt');
  const bytes = fs.readFileSync(reportFile);
  const report = JSON.parse(bytes.toString('utf8'));
  const records = recordsFromReport(root, saved, report, reportPath, bytes);
  const old = fs.existsSync(target) ? fs.readFileSync(target) : undefined;
  if (old) {
    let previous;
    try { previous = JSON.parse(old.toString('utf8')); } catch { if (!migrate) throw new Error('Malformed old receipt: preserve evidence and use --migrate after review'); }
    if (!migrate && (previous.version !== 2 || previous.change !== change || Object.keys(previous.artifacts ?? {}).some(id => !Object.hasOwn(records, id)))) throw new Error('Protocol/removed-ID migration requires --migrate; old bytes will be preserved');
  }
  sameSnapshot(saved, capture(root, change, evaluate));
  for (const review of Object.values(report.artifacts)) boundEvidence(root, review.evidence ?? [], reportPath);
  if (!fs.readFileSync(reportFile).equals(bytes)) throw new Error('Review evidence changed during recording');
  if (old ? !fs.readFileSync(target).equals(old) : fs.existsSync(target)) throw new Error('Receipt changed during recording');
  let history;
  if (old) { history = `${target.slice(0, -5)}.history-${randomUUID()}.json`; fs.writeFileSync(history, old, { flag: 'wx' }); }
  const temporary = `${target}.${randomUUID()}.tmp`;
  create(temporary, { version: 2, change, policyHash: current.policyHash, schemaHash: current.schemaHash, artifacts: records });
  try { fs.renameSync(temporary, target); } finally { if (fs.existsSync(temporary)) fs.unlinkSync(temporary); }
  // A concurrent writer is detectable by the ordinary evaluator as well as this final check.
  sameSnapshot(saved, capture(root, change, evaluate));
  if (!fs.readFileSync(reportFile).equals(bytes)) throw new Error('Receipt recorded but review evidence changed; receipt is invalid, inspect before retrying');
  return { status: 'RECORDED', valid: evaluate(root, changePath(root, change)).valid, ...(history ? { history: path.relative(root, history).split(path.sep).join('/') } : {}) };
}
function diagnose(root, evaluate) {
  const policy = path.join(root, 'openspec/ff-policy.json');
  if (!fs.existsSync(policy)) return { configuration: 'UNCONFIGURED', evidence: 'NOT_CHECKED', checked: 0, lineEndings: { checked: 0, unprotected: [] } };
  let parsed;
  try { parsed = read(policy); } catch { return { configuration: 'INVALID', evidence: 'NOT_CHECKED', checked: 0 }; }
  const changes = path.join(root, 'openspec/changes');
  const names = fs.existsSync(changes) ? fs.readdirSync(changes, { withFileTypes: true }).filter(d => d.isDirectory() && d.name !== 'archive').map(d => d.name) : [];
  const results = names.map(change => ({ change, validity: evaluate(root, changePath(root, change)) }));
  const files = [...new Set(results.flatMap(r => r.validity?.artifacts.flatMap(a => a.files?.map(f => f.path) ?? []) ?? []))];
  const unprotected = [], crlf = [];
  for (const name of files) {
    const bytes = fs.readFileSync(safe(root, name));
    // Only text containing line breaks is diagnosed. Binary bytes are never normalized.
    if (bytes.includes(0) || !bytes.includes(10)) continue;
    const attr = spawnSync('git', ['check-attr', '-z', 'eol', '--', name], { cwd: root, encoding: 'utf8', shell: false });
    // Attribute patterns are globs even inside C-style quotes. Escape pattern
    // metacharacters first, then quote spaces/quotes/backslashes for Git.
    const literal = '/' + name.replace(/[\\*?\[\]]/g, '\\$&');
    if (attr.status !== 0 || attr.stdout.split('\0')[2] !== 'lf') unprotected.push({ path: name, suggestion: `${JSON.stringify(literal)} text eol=lf` });
    if (bytes.includes(Buffer.from('\r\n'))) crlf.push(name);
  }
  return { configuration: [1, 2].includes(parsed.version) && Array.isArray(parsed.artifacts) && parsed.artifacts.length ? 'CONFIGURED' : 'INVALID',
    evidence: !results.length ? 'NO_CHECKS' : results.every(r => r.validity?.valid) ? 'VALID' : 'INVALID', checked: results.length, changes: results,
    lineEndings: { checked: files.length, unprotected, crlf, note: 'Byte hashes remain unchanged; establish exact LF attributes before a new review. Never refresh old receipt hashes to claim acceptance.' } };
}
export async function receiptMain(build, args, project = process.cwd()) {
  const { evaluateFF } = await import(pathToFileURL(path.join(build, 'dist/core/ff-validity.js')).href);
  const root = fs.realpathSync(project);
  const [command, ...rest] = args;
  let result;
  if (command === 'snapshot' && rest.length === 2) {
    const binding = capture(root, rest[0], evaluateFF);
    result = { version: 1, binding, snapshotHash: sha(JSON.stringify(binding)) };
    create(safe(root, rest[1]), result);
    result = { status: 'SNAPSHOT_CREATED', file: rest[1], snapshotHash: result.snapshotHash };
  } else if (command === 'template' && (rest.length === 2 || (rest.length > 3 && rest[2] === '--evidence'))) {
    const saved = snapshot(safe(root, rest[0]));
    const evidence = rest.slice(3).map(name => ({ path: name, sha256: sha(fs.readFileSync(safe(root, name))) }));
    boundEvidence(root, evidence, rest[1]);
    create(safe(root, rest[1]), { version: 1, snapshotHash: saved.snapshotHash, artifacts: Object.fromEntries(saved.binding.artifacts.map(a => [a.id,
      { version: `${a.id}-v1`, verdict: 'not-reviewed', reviewer: '', toolVersion: '', evidence, unverified: ['Replace with actual unverified scope; independently inspect snapshot rules, files and inputs.'] }])) });
    result = { status: 'DRAFT_CREATED', file: rest[1] };
  } else if (command === 'check' && rest.length === 2) {
    const saved = snapshot(safe(root, rest[1])); sameSnapshot(saved, capture(root, rest[0], evaluateFF)); result = { status: 'MATCHES', snapshotHash: saved.snapshotHash };
  } else if (command === 'record' && (rest.length === 3 || (rest.length === 4 && rest[3] === '--migrate'))) {
    result = record(root, rest[0], rest[1], rest[2], rest[3] === '--migrate', evaluateFF);
  } else if (command === 'diagnose' && !rest.length) result = diagnose(root, evaluateFF);
  else throw new Error('Usage: node .forgeflow/ff-spec.mjs receipt snapshot CHANGE FILE | template SNAPSHOT REPORT [--evidence PATH ...] | check CHANGE SNAPSHOT | record CHANGE SNAPSHOT REPORT [--migrate] | diagnose');
  console.log(JSON.stringify(result, null, 2));
  return result;
}
