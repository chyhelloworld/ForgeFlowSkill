import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { safe, read, digest, sha, atomic, json, fail } from './files.mjs';
import { checkRelease } from './runtime.mjs';
import { control, owned, loadState, checkOwned, validateState } from './state.mjs';
export { control, owned, loadState, checkOwned } from './state.mjs';
export function preflight(project, state, files) {
  checkOwned(project, state);
  for (const name of Object.keys(files)) {
    owned(name);
    if (!state?.files[name] && digest(safe(project, name)) !== null) fail(`Unmanaged conflict: ${name}; move your file explicitly before retrying`);
  }
}
function restore(project, journal) {
  const paths = Object.keys(journal.before);
  for (const name of paths) {
    owned(name);
    const now = digest(safe(project, name));
    if (now !== journal.before[name] && now !== journal.after[name]) fail(`Recovery conflict: ${name}`);
    if (journal.before[name] !== null && digest(safe(project, `${control}/backups/${journal.id}/files/${name}`)) !== journal.before[name]) fail('Backup integrity mismatch');
  }
  for (const name of paths) {
    const target = safe(project, name);
    if (digest(target) === journal.before[name]) continue;
    if (journal.before[name] === null) { if (fs.existsSync(target)) fs.unlinkSync(target); }
    else atomic(target, fs.readFileSync(safe(project, `${control}/backups/${journal.id}/files/${name}`)));
  }
}
export function recover(project) {
  const file = safe(project, `${control}/pending.json`);
  if (!fs.existsSync(file)) return { status: 'NO_PENDING_TRANSACTION' };
  const journal = read(file);
  if (!/^[a-f0-9-]{36}$/.test(journal.id)) fail('Invalid journal ID');
  const state = loadState(project);
  if (state?.transaction !== journal.id) {
    const before = read(safe(project, `${control}/backups/${journal.id}/state.json`));
    if (JSON.stringify(state) !== JSON.stringify(before)) fail('Recovery state conflict; preserve state and pending for inspection');
    if ('beforeStateHash' in journal && digest(safe(project, `${control}/state.json`)) !== journal.beforeStateHash) fail('Recovery state hash mismatch');
    if (state) checkRelease(project, state);
    restore(project, journal);
  }
  else {
    const after = Object.fromEntries(Object.entries(journal.after).filter(([, hash]) => hash !== null).sort(([a], [b]) => a.localeCompare(b, 'en')));
    const current = Object.fromEntries(Object.entries(state.files).sort(([a], [b]) => a.localeCompare(b, 'en')));
    if (JSON.stringify(after) !== JSON.stringify(current)) fail('Committed state disagrees with journal');
    if (journal.nextStateHash && digest(safe(project, `${control}/state.json`)) !== journal.nextStateHash) fail('Committed state hash mismatch');
    for (const [name, expected] of Object.entries(journal.after)) {
      owned(name);
      if (digest(safe(project, name)) !== expected) fail(`Recovery conflict: ${name}`);
    }
    checkRelease(project, state);
  }
  fs.unlinkSync(file);
  return { status: state?.transaction === journal.id ? 'COMMITTED' : 'RECOVERED' };
}
function journalFor(project, before, files, id) {
  const names = [...new Set([...Object.keys(before?.files ?? {}), ...Object.keys(files)])].sort();
  const journal = { id, before: {}, after: {}, beforeStateHash: digest(safe(project, `${control}/state.json`)) };
  for (const name of names) {
    journal.before[name] = digest(safe(project, name));
    if (journal.before[name] !== (before?.files[name] ?? null)) fail(`User modification during transaction: ${name}`);
    journal.after[name] = files[name] ? sha(files[name]) : null;
    if (journal.before[name] !== null) {
      const data = fs.readFileSync(safe(project, name));
      if (sha(data) !== journal.before[name]) fail(`User modification during backup: ${name}`);
      atomic(safe(project, `${control}/backups/${id}/files/${name}`), data);
    }
  }
  json(safe(project, `${control}/backups/${id}/state.json`), before);
  return journal;
}
export function commit(project, before, next, files) {
  if (JSON.stringify(loadState(project)) !== JSON.stringify(before)) fail('Install state changed before commit');
  preflight(project, before, files); // Recheck after a potentially long dependency build.
  if (before) checkRelease(project, before);
  const id = randomUUID();
  next.transaction = id;
  next.previous = before ? id : null;
  next.files = Object.fromEntries(Object.entries(files).map(([name, data]) => [name, sha(data)]));
  validateState(project, next);
  const journal = journalFor(project, before, files, id);
  journal.nextStateHash = sha(JSON.stringify(next, null, 2) + '\n');
  json(safe(project, `${control}/pending.json`), journal);
  try {
    for (const name of Object.keys(journal.after)) {
      if (journal.before[name] === journal.after[name]) continue;
      const target = safe(project, name);
      if (digest(target) !== journal.before[name]) fail(`User modification during commit: ${name}`);
      if (files[name]) atomic(target, files[name]);
      else fs.unlinkSync(target);
    }
    checkOwned(project, next);
    checkRelease(project, next);
    if (digest(safe(project, `${control}/state.json`)) !== journal.beforeStateHash) fail('Install state changed during commit');
    json(safe(project, `${control}/state.json`), next);
    fs.unlinkSync(safe(project, `${control}/pending.json`));
  } catch (error) {
    if (recover(project).status !== 'COMMITTED') throw error;
  }
  return next;
}
export function rollback(project, current) {
  checkOwned(project, current);
  if (current) checkRelease(project, current);
  if (!current?.previous || !/^[a-f0-9-]{36}$/.test(current.previous)) fail('No previous installation');
  const prefix = `${control}/backups/${current.previous}`;
  const before = read(safe(project, `${prefix}/state.json`));
  if (!before) fail('No previous installation');
  validateState(project, before);
  if (!/^releases\/[a-zA-Z0-9.+-]+$/.test(before.release)) fail('Invalid rollback release');
  checkRelease(project, before, 'Rollback release integrity mismatch');
  const files = {};
  for (const [name, expected] of Object.entries(before.files)) {
    owned(name);
    const data = fs.readFileSync(safe(project, `${prefix}/files/${name}`));
    if (sha(data) !== expected) fail('Backup integrity mismatch');
    files[name] = data;
  }
  preflight(project, current, files);
  return commit(project, current, before, files);
}
