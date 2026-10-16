#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkedRoot, safe, fail } from './tools/installer/files.mjs';
import { install, doctor } from './tools/installer/install.mjs';
import { control, recover, rollback, loadState } from './tools/installer/transaction.mjs';
export function parse(args) {
  const options = { command: args.shift() };
  if (!['install', 'doctor', 'rollback', 'recover'].includes(options.command)) fail('Usage: node installer.mjs install|doctor|rollback|recover --project PATH [--host codex|claude --mode full|skills-only --build]');
  while (args.length) {
    const key = args.shift();
    if (key === '--build' && !options.build) { options.build = true; continue; }
    if (!['--project', '--host', '--mode'].includes(key) || options[key.slice(2)] || !args.length) fail('Invalid or duplicate argument');
    options[key.slice(2)] = args.shift();
  }
  if (!options.project) fail('--project is required');
  if (options.command === 'install' && (!['codex', 'claude'].includes(options.host) || !['full', 'skills-only'].includes(options.mode))) fail('Explicit --host codex|claude and --mode full|skills-only required');
  if (options.command !== 'install' && (options.host || options.mode || options.build)) fail('Install flags apply only to install');
  if (options.mode === 'skills-only' && options.build) fail('--build conflicts with skills-only');
  return options;
}
export function main(args) {
  const options = parse([...args]);
  const project = checkedRoot(options.project);
  const source = checkedRoot(path.dirname(fileURLToPath(import.meta.url)));
  const lock = safe(project, `${control}/lock`);
  if (options.command === 'doctor') return doctor(project);
  fs.mkdirSync(path.dirname(lock), { recursive: true });
  if (options.command === 'recover') {
    if (fs.existsSync(lock)) fail('Lock exists: verify no installer is running, then manually remove only the empty .forgeflow/install/lock directory before recover');
  }
  try { fs.mkdirSync(lock); } catch (e) { if (e.code === 'EEXIST') fail('Installation locked; do not run concurrently'); throw e; }
  try {
    if (options.command === 'recover') return recover(project);
    if (fs.existsSync(safe(project, `${control}/pending.json`))) fail('Pending transaction; run recover first');
    if (options.command === 'rollback') return { status: 'ROLLED_BACK', version: rollback(project, loadState(project)).version };
    return install(project, source, options);
  } finally { fs.rmdirSync(lock); }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { console.log(JSON.stringify(main(process.argv.slice(2)), null, 2)); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
