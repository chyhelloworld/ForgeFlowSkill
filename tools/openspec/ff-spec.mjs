#!/usr/bin/env node
// Resolves only the sibling verified build, independently of cwd, PATH and npx.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { verifyBuild } from './ff-build.mjs';
import { receiptMain } from './ff-receipt.mjs';
import { statusOverview } from './ff-status.mjs';

const argv = process.argv.slice(2);
const ungated = () => !fs.existsSync(path.resolve(process.cwd(), 'openspec/ff-policy.json'));
try {
  const build = verifyBuild();
  if (argv[0] === 'receipt') await receiptMain(build, argv.slice(1));
  else if (argv[0] === 'status' && !argv.includes('--change') && !argv.includes('--all')) process.exitCode = await statusOverview(build, argv.slice(1));
  else {
    // Completing a change without a policy is a silent pass; say so instead of implying the gates ran.
    if (argv[0] === 'archive' && ungated() && process.env.FF_ALLOW_UNGATED !== '1')
      console.error('⚠ FF gates disabled: openspec/ff-policy.json not found, so this archive was not checked for FF artifacts, review receipts or task progress (set FF_ALLOW_UNGATED=1 to silence).');
    await import(pathToFileURL(path.join(build, 'bin/ff-spec.js')).href);
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
