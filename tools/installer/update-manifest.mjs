// Release preparation only: not called by installation and never trusts a downloaded manifest.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { regularFiles, sha, json } from './files.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const files = regularFiles(root).filter(n => !['MANIFEST.json', 'forgeflow-payload.tgz', 'forgeflow-payload.sha256'].includes(n) && !n.startsWith('.git/') && !n.split('/').includes('__pycache__') && !n.startsWith('evidence/installer-coverage-raw/'));
json(path.join(root, 'MANIFEST.json'), { version: '0.6.0-experimental.7', status: 'npx-experiment-not-published',
  files: Object.fromEntries(files.map(n => [n, sha(fs.readFileSync(path.join(root, n)))])) });
