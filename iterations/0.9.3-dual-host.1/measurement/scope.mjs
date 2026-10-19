import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

export const files = ['installer.mjs', ...['install', 'runtime', 'transaction', 'source', 'state'].map(name => `tools/installer/${name}.mjs`)];
export const sha256 = value => createHash('sha256').update(value).digest('hex');
// The JavaScript implementation works in this Windows restricted workspace;
// native realpath can return EPERM for otherwise readable allowed directories.
export const canonical = file => fs.realpathSync(path.resolve(file));
export const pathKey = file => process.platform === 'win32' ? canonical(file).toLowerCase() : canonical(file);
export function snapshot(repo) {
  return files.map(file => {
    try {
      const bytes = fs.readFileSync(path.join(repo, file));
      return { file, sha256: sha256(bytes), byteLength: bytes.length, utf16Length: bytes.toString('utf8').length };
    } catch (error) { return { file, error: error.code ?? error.message }; }
  });
}
export function inventoryCoverage(dir) {
  return fs.readdirSync(dir).filter(file => /^coverage-.+\.json$/.test(file)).sort().map(file => {
    const bytes = fs.readFileSync(path.join(dir, file));
    return { file, sha256: sha256(bytes), byteLength: bytes.length };
  });
}
