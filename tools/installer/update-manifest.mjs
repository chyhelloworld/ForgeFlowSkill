// Release preparation only: not called by installation and never trusts a downloaded manifest.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { regularFiles, sha, json } from './files.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const files = regularFiles(root).filter(n => !['MANIFEST.json', 'forgeflow-payload.tgz', 'forgeflow-payload.sha256'].includes(n) && !n.startsWith('.git/') && !n.split('/').includes('__pycache__') && !n.startsWith('evidence/installer-coverage-raw/'));
json(path.join(root, 'MANIFEST.json'), { version: JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version, status: 'candidate-not-published',
  files: Object.fromEntries(files.map(n => [n, sha(fs.readFileSync(path.join(root, n)))])) });
