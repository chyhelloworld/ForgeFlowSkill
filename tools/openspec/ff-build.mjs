/** Verify a local FF build before loading any of its code; never fall back to PATH. */
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, readlinkSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
export const home = path.dirname(fileURLToPath(import.meta.url));
export function dependencyHashes(root) {
  const result = {};
  const base = path.resolve(root, 'node_modules');
  function walk(directory, prefix = '') {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const name = prefix ? `${prefix}/${entry.name}` : entry.name;
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(file, name);
      else if (entry.isFile()) result[name] = createHash('sha256').update(readFileSync(file)).digest('hex');
      else if (entry.isSymbolicLink()) {
        const link = readlinkSync(file);
        if (path.isAbsolute(link) || !realpathSync(file).startsWith(realpathSync(base) + path.sep)) throw new Error(`Escaping dependency link: ${name}`);
        result[name] = `link:${link}`;
      } else throw new Error(`Unsupported dependency entry: ${name}`);
    }
  }
  walk(base);
  return Object.fromEntries(Object.entries(result).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0));
}
export function verifyReusableBuild(candidate) {
  const build = verifyBuild(candidate);
  const marker = JSON.parse(readFileSync(path.join(build, 'FF-BUILD.json'), 'utf8'));
  if (marker.platform !== process.platform || marker.arch !== process.arch || !marker.dependencyHashes ||
      JSON.stringify(dependencyHashes(build)) !== JSON.stringify(marker.dependencyHashes)) throw new Error('Reusable build platform/dependency hashes mismatch; rebuild explicitly');
  return build;
}
export function runtimeHashes(root) {
  const files = ['package.json'];
  function walk(relative) {
    for (const entry of readdirSync(path.join(root, relative), { withFileTypes: true })) {
      const name = `${relative}/${entry.name}`;
      if (entry.isDirectory()) walk(name);
      else if (entry.isFile()) files.push(name);
      else throw new Error(`Unsupported runtime entry: ${name}`);
    }
  }
  for (const directory of ['bin', 'dist', 'schemas']) walk(directory);
  return Object.fromEntries(files.sort().map(name => [name, createHash('sha256').update(readFileSync(path.join(root, name))).digest('hex')]));
}
export function verifyBuild(candidate = home) {
  const build = path.join(candidate, '.build');
  try {
    const pin = JSON.parse(readFileSync(path.join(candidate, 'upstream.json'), 'utf8'));
    const marker = JSON.parse(readFileSync(path.join(build, 'FF-BUILD.json'), 'utf8'));
    const pkg = JSON.parse(readFileSync(path.join(build, 'package.json'), 'utf8'));
    if (pkg.name !== '@forgeflow/ff-spec' || pkg.version !== `1.14.2-ff.${pin.adapter}` || pkg.bin?.['ff-spec'] !== './bin/ff-spec.js' || pkg.bin?.openspec) throw new Error('package identity mismatch');
    for (const key of ['commit', 'archiveSha256', 'patchSha256', 'adapter']) {
      if (marker[key] !== pin[key]) throw new Error(`stale build ${key}`);
    }
    if (JSON.stringify(runtimeHashes(build)) !== JSON.stringify(marker.runtimeHashes)) throw new Error('runtime hashes mismatch');
    return build;
  } catch (error) {
    throw new Error(`FF build unavailable or invalid (${error.message}). Run node tools/openspec/build.mjs --clean. No official CLI fallback is permitted.`);
  }
}
