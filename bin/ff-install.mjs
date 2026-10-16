#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { decodePayload } from './payload.mjs';
import { parse } from '../installer.mjs';
import { checkedRoot, safe, sha, fail } from '../tools/installer/files.mjs';
export function unpack(project) {
  const root = path.dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
  const archive = path.join(root, 'forgeflow-payload.tgz');
  const expected = fs.readFileSync(path.join(root, 'forgeflow-payload.sha256'), 'utf8').trim();
  if (!/^[a-f0-9]{64}$/.test(expected) || sha(fs.readFileSync(archive)) !== expected) fail('Bundled payload SHA256 mismatch');
  const base = safe(project, '.forgeflow/install');
  fs.mkdirSync(base, { recursive: true });
  const stage = fs.mkdtempSync(path.join(base, 'source-'));
  const identity = fs.lstatSync(stage, { bigint: true });
  function cleanup() {
    safe(project, '.forgeflow/install');
    const current = fs.lstatSync(stage, { bigint: true });
    if (!current.isDirectory() || current.dev !== identity.dev || current.ino !== identity.ino) fail('Unpacked source ownership changed');
    function removeGenerated(file) {
      const entry = fs.lstatSync(file);
      if (entry.isSymbolicLink() || entry.isFile()) fs.unlinkSync(file);
      else if (entry.isDirectory()) {
        for (const name of fs.readdirSync(file)) removeGenerated(path.join(file, name));
        fs.rmdirSync(file);
      } else fail('Unexpected unpacked source entry');
    }
    removeGenerated(stage);
    if (fs.lstatSync(stage, { throwIfNoEntry: false })) fail('Unpacked source cleanup incomplete');
  }
  try {
    for (const [name, data] of decodePayload(fs.readFileSync(archive))) {
      const target = safe(stage, name);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, data, { flag: 'wx' });
    }
  } catch (error) {
    cleanup();
    throw error;
  }
  return { stage, cleanup };
}
export async function run(args) {
  const options = parse([...args]);
  const project = checkedRoot(options.project);
  const { stage, cleanup } = unpack(project);
  try {
    const { main } = await import(pathToFileURL(path.join(stage, 'installer.mjs')).href);
    return main(args);
  } finally { cleanup(); }
}
try { console.log(JSON.stringify(await run(process.argv.slice(2)), null, 2)); }
catch (error) { console.error(error.message); process.exitCode = 1; }
