import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { safe, read, digest, sha, atomic, json, fail } from './files.mjs';
import { inventory } from './runtime.mjs';
export const control = '.forgeflow/install';
export function owned(name) {
  if (/^\.(agents|claude)\/skills\/ff-[a-z-]+\/.+/.test(name)) return;
  if (['.forgeflow/ff-spec.mjs', `${control}/runtime.mjs`, `${control}/doctor.mjs`].includes(name)) return;
  fail('Invalid managed path');
}
export function loadState(project) {
  const file = safe(project, `${control}/state.json`);
  if (!fs.existsSync(file)) return null;
  const state = read(file);
  if (state.schema !== 1 || typeof state.files !== 'object') fail('Invalid install state');
  for (const name of Object.keys(state.files)) { owned(name); safe(project, name); }
  return state;
}
export function checkOwned(project, state) {
  for (const [name, expected] of Object.entries(state?.files ?? {})) {
    if (digest(safe(project, name)) !== expected) fail(`User modification: ${name}; preserve/restore your file before retrying`);
  }
}
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
  if (state?.transaction !== journal.id) restore(project, journal);
  fs.unlinkSync(file);
  return { status: state?.transaction === journal.id ? 'COMMITTED' : 'RECOVERED' };
}
function journalFor(project, before, files, id) {
  const names = [...new Set([...Object.keys(before?.files ?? {}), ...Object.keys(files)])].sort();
  const journal = { id, before: {}, after: {} };
  for (const name of names) {
    journal.before[name] = digest(safe(project, name));
    journal.after[name] = files[name] ? sha(files[name]) : null;
    if (journal.before[name] !== null) atomic(safe(project, `${control}/backups/${id}/files/${name}`), fs.readFileSync(safe(project, name)));
  }
  json(safe(project, `${control}/backups/${id}/state.json`), before);
  return journal;
}
export function commit(project, before, next, files) {
  const id = randomUUID();
  const journal = journalFor(project, before, files, id);
  json(safe(project, `${control}/pending.json`), journal);
  try {
    for (const name of Object.keys(journal.after)) {
      const target = safe(project, name);
      if (files[name]) atomic(target, files[name]);
      else fs.unlinkSync(target);
    }
    next.transaction = id;
    next.previous = before ? id : null;
    next.files = Object.fromEntries(Object.entries(files).map(([name, data]) => [name, sha(data)]));
    json(safe(project, `${control}/state.json`), next);
    fs.unlinkSync(safe(project, `${control}/pending.json`));
  } catch (error) { recover(project); throw error; }
  return next;
}
export function rollback(project, current) {
  checkOwned(project, current);
  if (!current?.previous || !/^[a-f0-9-]{36}$/.test(current.previous)) fail('No previous installation');
  const prefix = `${control}/backups/${current.previous}`;
  const before = read(safe(project, `${prefix}/state.json`));
  if (!before) fail('No previous installation');
  if (!/^releases\/[a-zA-Z0-9.+-]+$/.test(before.release)) fail('Invalid rollback release');
  if (JSON.stringify(inventory(safe(project, `${control}/${before.release}`))) !== JSON.stringify(before.releaseInventory)) fail('Rollback release integrity mismatch');
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
