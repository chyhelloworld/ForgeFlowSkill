#!/usr/bin/env node
// Explicit success-only cleanup wrapper; no scan of previous runs or arbitrary deletion paths.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createTestWorkspace } from './testing/workspace.mjs';

const args = process.argv.slice(2);
const apply = args[0] === '--clean-success';
if (apply) args.shift();
if (args[0] === '--') args.shift();
if (args.some(arg => arg.startsWith('-'))) throw new Error('Expected test file paths, optionally preceded by --clean-success');
const tests = args.length ? args : fs.readdirSync(fileURLToPath(new URL('./tests/', import.meta.url)))
  .filter(name => name.endsWith('.test.mjs')).sort().map(name => fileURLToPath(new URL(`./tests/${name}`, import.meta.url)));
for (const file of tests) if (!fs.statSync(path.resolve(file)).isFile()) throw new Error(`Not a test file: ${file}`);
const workspace = createTestWorkspace();
console.error(`Test workspace: ${workspace.directory}`);
// A wrapper invoked by another node:test process must start a fresh test coordinator.
const env = { ...process.env, FF_TEST_ROOT: workspace.directory };
delete env.NODE_TEST_CONTEXT;
const child = spawnSync(process.execPath, ['--test', ...tests], { stdio: 'inherit', env });
process.exitCode = child.status === 0 && !child.error && !child.signal ? 0 : 1;
try { console.error(JSON.stringify(workspace.cleanup({ apply, success: process.exitCode === 0 }))); }
catch (error) {
  console.error(JSON.stringify(error.cleanupResult ?? { status: 'CLEANUP_UNKNOWN', directory: workspace.directory, reason: error.message }));
  process.exitCode = 1;
}
if (child.error) console.error(child.error.message);
