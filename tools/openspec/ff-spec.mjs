#!/usr/bin/env node
// Resolves only the sibling verified build, independently of cwd, PATH and npx.
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { verifyBuild } from './ff-build.mjs';
import { receiptMain } from './ff-receipt.mjs';
try {
  const build = verifyBuild();
  if (process.argv[2] === 'receipt') await receiptMain(build, process.argv.slice(3));
  else await import(pathToFileURL(path.join(build, 'bin/ff-spec.js')).href);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
