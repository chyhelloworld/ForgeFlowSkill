#!/usr/bin/env node
// Resolves only the sibling verified build, independently of cwd, PATH and npx.
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { verifyBuild } from './ff-build.mjs';
try {
  const build = verifyBuild();
  await import(pathToFileURL(path.join(build, 'bin/ff-spec.js')).href);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
