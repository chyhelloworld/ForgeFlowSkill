#!/usr/bin/env node
/** Rebuild the pinned upstream TypeScript plus the reviewed FF source patch. */
import { runtimeHashes } from './ff-build.mjs';
import { createHash } from 'node:crypto';
import { readFileSync, mkdirSync, cpSync, existsSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const home = path.dirname(fileURLToPath(import.meta.url));
const build = path.join(home, '.build');
const bootstrap = path.join(home, '.bootstrap');
const pin = JSON.parse(readFileSync(path.join(home, 'upstream.json'), 'utf8'));
function run(command, args, cwd = home, env = {}) {
  const result = spawnSync(command, args, { cwd, stdio: 'inherit', env: { ...process.env, ...env }, shell: false });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} failed (${result.status})`);
}
function verify(name, expected) {
  const actual = createHash('sha256').update(readFileSync(path.join(home, name))).digest('hex');
  if (actual !== expected) throw new Error(`Integrity mismatch: ${name}`);
}
function npm(args) {
  // npm is a .cmd shim on Windows; invoke its official JS entry via node.
  const found = process.env.npm_execpath;
  if (found && /npm-cli\.js$/.test(found)) return run(process.execPath, [found, ...args]);
  if (process.platform === 'win32') {
    const cli = path.join(path.dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js');
    if (!existsSync(cli)) throw new Error('Run via npm exec -- node tools/openspec/build.mjs so npm_execpath is available.');
    return run(process.execPath, [cli, ...args]);
  }
  run('npm', args);
}
function main() {
  const [major, minor] = process.versions.node.split('.').map(Number);
  if (major < 20 || (major === 20 && minor < 19)) throw new Error('Node >=20.19 required');
  verify(pin.archive, pin.archiveSha256);
  verify(pin.patch, pin.patchSha256);
  for (const [name, hash] of Object.entries(pin.bootstrapSha256)) verify(name, hash);
  if (existsSync(build)) throw new Error('.build already exists; inspect it, then rerun with --clean to rebuild.');
  mkdirSync(build, { recursive: true });
  mkdirSync(bootstrap, { recursive: true });
  cpSync(path.join(home, 'bootstrap/package.json'), path.join(bootstrap, 'package.json'));
  cpSync(path.join(home, 'bootstrap/package-lock.json'), path.join(bootstrap, 'package-lock.json'));
  run('tar', ['-xzf', path.join(home, pin.archive), '-C', build]);
  run('git', ['apply', '--check', path.join(home, pin.patch)], build, { GIT_CEILING_DIRECTORIES: home });
  run('git', ['apply', path.join(home, pin.patch)], build, { GIT_CEILING_DIRECTORIES: home });
  if (!existsSync(path.join(build, 'src/core/ff-validity.ts'))) throw new Error('FF source patch was not applied');
  npm(['ci', '--prefix', bootstrap, '--ignore-scripts', '--cache', path.join(bootstrap, 'cache')]);
  const pnpm = path.join(bootstrap, 'node_modules/pnpm/bin/pnpm.cjs');
  run(process.execPath, [pnpm, 'install', '--frozen-lockfile', '--ignore-scripts', '--store-dir', path.join(bootstrap, 'store')], build, {
    XDG_DATA_HOME: path.join(bootstrap, 'data'), XDG_CACHE_HOME: path.join(bootstrap, 'cache'),
  });
  run(process.execPath, ['build.js'], build);
  writeFileSync(path.join(build, 'FF-BUILD.json'), JSON.stringify({ ...pin, runtimeHashes: runtimeHashes(build), node: process.version, builtAt: new Date().toISOString() }, null, 2) + '\n');
  console.log(`Built project-local CLI: ${path.join(home, 'ff-spec.mjs')}`);
}
if (process.argv.includes('--clean')) rmSync(build, { recursive: true, force: true });
try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
