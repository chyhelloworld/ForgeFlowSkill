#!/usr/bin/env node
// Read-only hash inspection. This deliberately never produces a passing review receipt.
import path from 'node:path';
import { verifyBuild } from './ff-build.mjs';
import { pathToFileURL, fileURLToPath } from 'node:url';
const home = path.dirname(fileURLToPath(import.meta.url));
const [project, change] = process.argv.slice(2);
if (!project || !change) {
  console.error('Usage: node tools/openspec/ff-snapshot.mjs <project-root> <change-name>');
  process.exitCode = 2;
} else {
  const root = path.resolve(project);
  const changeDir = path.resolve(root, 'openspec/changes', change);
  if (!changeDir.startsWith(path.resolve(root, 'openspec/changes') + path.sep)) throw new Error('Unsafe change name');
  const { evaluateFF } = await import(pathToFileURL(path.join(verifyBuild(), 'dist/core/ff-validity.js')));
  const validity = evaluateFF(root, changeDir);
  console.log(JSON.stringify(validity ?? { enabled: false }, null, 2));
  // Invalid is expected before explicitly recording producer/reviewer baselines.
}
