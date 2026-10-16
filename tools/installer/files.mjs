import fs from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
export const sha = data => createHash('sha256').update(data).digest('hex');
export const read = p => JSON.parse(fs.readFileSync(p, 'utf8'));
export function fail(message) { throw new Error(`BLOCKED: ${message}`); }
export function relative(name) {
  if (typeof name !== 'string' || !name || name.includes('\\') || name.includes(':') || name.startsWith('/') || name.split('/').some(x => !x || x === '.' || x === '..')) fail('Unsafe relative path');
  return name;
}
export function safe(root, name) {
  relative(name);
  let current = root;
  if (fs.lstatSync(root).isSymbolicLink()) fail('Symlink root');
  for (const part of name.split('/')) {
    current = path.join(current, part);
    if (fs.existsSync(current) && fs.lstatSync(current).isSymbolicLink()) fail(`Symlink path: ${name}`);
    try { if (fs.lstatSync(current).isSymbolicLink()) fail(`Symlink path: ${name}`); } catch (e) { if (e.code !== 'ENOENT') throw e; }
  }
  return current;
}
export function digest(file) {
  try { if (!fs.lstatSync(file).isFile()) fail('Expected regular managed file'); }
  catch (e) { if (e.code === 'ENOENT') return null; throw e; }
  return sha(fs.readFileSync(file));
}
export function atomic(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${randomUUID()}.tmp`;
  try { fs.writeFileSync(tmp, data, { flag: 'wx' }); fs.renameSync(tmp, file); }
  finally { if (fs.existsSync(tmp)) fs.unlinkSync(tmp); }
}
export const json = (p, data) => atomic(p, JSON.stringify(data, null, 2) + '\n');
export function regularFiles(root, prefix = '') {
  const result = [];
  for (const entry of fs.readdirSync(path.join(root, prefix), { withFileTypes: true })) {
    const name = prefix ? `${prefix}/${entry.name}` : entry.name;
    relative(name);
    if (entry.isDirectory()) result.push(...regularFiles(root, name));
    else if (entry.isFile()) result.push(name);
    else fail(`Unsupported source entry: ${name}`);
  }
  return result.sort();
}
export function checkedRoot(value) {
  const root = path.resolve(value);
  let cursor = root;
  while (true) {
    if (fs.lstatSync(cursor).isSymbolicLink()) fail('Project/source ancestor is a symlink');
    const parent = path.dirname(cursor);
    if (parent === cursor) break;
    cursor = parent;
  }
  if (!fs.statSync(root).isDirectory()) fail('Project must be an existing directory');
  return root;
}
