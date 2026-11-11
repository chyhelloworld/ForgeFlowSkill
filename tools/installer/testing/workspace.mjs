// Maintainer test fixtures only. Never accepts an existing directory as owned.
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { checkedRoot } from '../files.mjs';

const marker = '.ff-test-owner.json';
const identity = file => fs.lstatSync(file, { bigint: true });
const same = (a, b) => a.isDirectory() && b.isDirectory() && a.dev === b.dev && a.ino === b.ino;
export function fixtureBase(base = process.env.FF_TEST_ROOT) {
  if (!base || !path.isAbsolute(base)) throw new Error('FF_TEST_ROOT must name an explicit absolute fixture directory');
  const root = checkedRoot(base);
  if (!identity(root).isDirectory()) throw new Error('FF_TEST_ROOT must be an existing directory');
  return root;
}
export function createFixtureDirectory(prefix, base) {
  if (!prefix || /[\\/]/.test(prefix) || prefix === '.' || prefix === '..') throw new Error('Invalid fixture prefix');
  return fs.mkdtempSync(path.join(fixtureBase(base), prefix));
}
export function createTestWorkspace(base = process.env.FF_TEST_ROOT) {
  const parent = fixtureBase(base), parentIdentity = identity(parent);
  const directory = createFixtureDirectory('ff-run-', parent), ownedIdentity = identity(directory);
  const ancestors = [];
  for (let current = parent; ; current = path.dirname(current)) {
    ancestors.unshift([current, identity(current)]);
    if (path.dirname(current) === current) break;
  }
  function verifyChain(chain) {
    for (const [file, expected] of chain) {
      if (!same(expected, identity(file))) throw new Error('Fixture ancestor identity changed; cleanup stopped');
    }
  }
  const receipt = JSON.stringify({ schema: 1, token: randomUUID(), pid: process.pid });
  fs.writeFileSync(path.join(directory, marker), receipt, { flag: 'wx' });
  let removed = false, cleanupError;
  let deletedEntries = 0, attempted;
  function verify() {
    fixtureBase(parent);
    if (!same(parentIdentity, identity(parent)) || !same(ownedIdentity, identity(directory))) throw new Error('Test workspace ownership changed; retained');
    const file = path.join(directory, marker), stat = fs.lstatSync(file);
    if (!stat.isFile() || fs.readFileSync(file, 'utf8') !== receipt) throw new Error('Test workspace receipt changed; retained');
  }
  function inspect(file) {
    if (path.basename(file) === '.ff-preserve') return true;
    const stat = fs.lstatSync(file);
    if (stat.isSymbolicLink() || stat.isFile()) return false;
    if (!stat.isDirectory()) throw new Error('Unexpected fixture entry; retained');
    return fs.readdirSync(file).map(name => inspect(path.join(file, name))).some(Boolean);
  }
  // Trusted, quiescent fixture trees only: Node path APIs do not provide dirfd/openat binding.
  // Recheck ancestor identities before each operation; unlink observed links themselves.
  function remove(file, chain) {
    verifyChain(chain);
    const stat = identity(file);
    if (stat.isSymbolicLink() || stat.isFile()) {
      verifyChain(chain);
      const current = identity(file);
      if (current.dev !== stat.dev || current.ino !== stat.ino || current.mode !== stat.mode) throw new Error('Fixture entry identity changed during cleanup');
      attempted = { operation: 'unlink', path: file };
      fs.unlinkSync(file);
      deletedEntries++;
      attempted = undefined;
    } else if (stat.isDirectory()) {
      const nested = [...chain, [file, stat]];
      verifyChain(nested);
      const names = fs.readdirSync(file);
      verifyChain(nested);
      for (const name of names) remove(path.join(file, name), nested);
      verifyChain(nested);
      attempted = { operation: 'rmdir', path: file };
      fs.rmdirSync(file);
      deletedEntries++;
      attempted = undefined;
    } else throw new Error('Unexpected fixture entry during cleanup');
  }
  return {
    directory,
    cleanup({ apply = false, success = false, preserve = false } = {}) {
      if (removed) return { status: 'ALREADY_REMOVED', directory };
      // A refused or uncertain cleanup is terminal for this handle: no implicit retry.
      if (cleanupError) throw cleanupError;
      try {
        verify();
        const keep = inspect(directory);
        if (!success || preserve || keep) return { status: 'RETAINED', directory, reason: !success ? 'test result not successful' : 'preservation requested' };
        if (!apply) return { status: 'PREVIEW', directory };
        verify();
        remove(directory, ancestors);
        if (fs.lstatSync(directory, { throwIfNoEntry: false })) throw new Error('Test workspace cleanup incomplete');
        removed = true;
        return { status: 'REMOVED', directory };
      } catch (error) {
        let remaining = 'UNKNOWN';
        try { remaining = fs.lstatSync(directory, { throwIfNoEntry: false }) ? 'EXISTS' : 'MISSING'; } catch {}
        const denied = ['EPERM', 'EACCES'].includes(error.code) || /blocked by policy/i.test(error.message);
        const status = deletedEntries > 0 && remaining === 'EXISTS' ? 'CLEANUP_INCOMPLETE'
          : (denied && deletedEntries === 0) || !attempted && deletedEntries === 0 ? 'CLEANUP_BLOCKED' : 'CLEANUP_UNKNOWN';
        error.cleanupResult = { status, directory, remaining, deletedEntries, denied,
          operation: attempted?.operation ?? 'verify', target: attempted?.path ?? directory,
          code: error.code ?? null, reason: error.message,
          nextStep: 'Stop cleanup. Inspect the remaining tree and evidence; resolve permission or policy denial before any separately authorized retry. Do not switch deletion commands.' };
        cleanupError = error;
        throw error;
      }
    }
  };
}
