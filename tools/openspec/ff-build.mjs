/** Verify a local FF build before loading any of its code; never fall back to PATH. */
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
export const home = path.dirname(fileURLToPath(import.meta.url));
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
export function verifyBuild() {
  const build = path.join(home, '.build');
  try {
    const pin = JSON.parse(readFileSync(path.join(home, 'upstream.json'), 'utf8'));
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
