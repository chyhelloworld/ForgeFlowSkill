import fs from 'node:fs';
import { safe, read, digest, fail } from './files.mjs';
export const control = '.forgeflow/install';
export const hosts = ['codex', 'claude'];
export const sharedFiles = ['.forgeflow/ff-spec.mjs', ...['runtime', 'doctor', 'state', 'files'].map(name => `${control}/${name}.mjs`)];
export function hostBase(host) {
  if (!hosts.includes(host)) fail('Unknown host');
  return host === 'codex' ? '.agents/skills' : '.claude/skills';
}
export function normalizeHosts(values) {
  if (!Array.isArray(values) || !values.length || values.some(host => !hosts.includes(host)) || new Set(values).size !== values.length) fail('Invalid hosts');
  return hosts.filter(host => values.includes(host));
}
export function hostsOf(state) {
  if (state.schema === 1 && !('hosts' in state)) return normalizeHosts([state.host]);
  if (state.schema !== 2 || 'host' in state) fail('Invalid install state schema');
  const selected = normalizeHosts(state.hosts);
  if (JSON.stringify(selected) !== JSON.stringify(state.hosts)) fail('Noncanonical state hosts');
  return selected;
}
export function fileHost(name) {
  return hosts.find(host => name.startsWith(`${hostBase(host)}/`));
}
export function owned(name) {
  if (/^\.(agents|claude)\/skills\/ff-[a-z-]+\/.+/.test(name)) return;
  if (sharedFiles.includes(name)) return;
  fail('Invalid managed path');
}
export function validateState(project, state) {
  if (!state || !state.files || typeof state.files !== 'object' || Array.isArray(state.files)) fail('Invalid install state');
  const selected = hostsOf(state);
  for (const [name, hash] of Object.entries(state.files)) {
    owned(name); safe(project, name);
    if (!/^[a-f0-9]{64}$/.test(hash)) fail('Invalid managed hash');
    const host = fileHost(name);
    if (host && !selected.includes(host)) fail('Managed host disagrees with state');
  }
  if (!['full', 'skills-only'].includes(state.mode)) fail('Invalid install mode');
  // Schema 1 may be an old three-helper installation. Do not rewrite it on read.
  const required = state.schema === 2 ? sharedFiles : sharedFiles.slice(0, 3);
  if (required.some(name => !state.files[name])) fail('Missing shared entry in state');
  for (const host of selected) {
    const entries = Object.keys(state.files).filter(name => name.startsWith(`${hostBase(host)}/`) && /^ff-[a-z-]+\/SKILL\.md$/.test(name.slice(hostBase(host).length + 1)));
    if (entries.length !== 17) fail('Expected 17 skill entries per installed host');
  }
  return state;
}
export function loadState(project) {
  const file = safe(project, `${control}/state.json`);
  return fs.existsSync(file) ? validateState(project, read(file)) : null;
}
export function checkOwned(project, state, host) {
  if (host && !hostsOf(state).includes(host)) fail('Requested host is not installed');
  for (const [name, expected] of Object.entries(state?.files ?? {})) {
    if (host && fileHost(name) && fileHost(name) !== host) continue;
    if (digest(safe(project, name)) !== expected) fail(`User modification: ${name}; preserve/restore your file before retrying`);
  }
}
export function assertIdle(project) {
  for (const name of ['lock', 'pending.json']) {
    if (fs.existsSync(safe(project, `${control}/${name}`))) fail('Installation busy or pending transaction; inspect before doctor/CLI');
  }
}
