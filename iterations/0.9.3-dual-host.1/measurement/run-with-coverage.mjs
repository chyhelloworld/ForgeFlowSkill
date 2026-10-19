// Capture actual test coverage with source/coverage provenance. No installation or network calls.
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { canonical, snapshot, inventoryCoverage, sha256 } from './scope.mjs';

const [repoArg, runArg, separator, executable, ...args] = process.argv.slice(2);
if (!repoArg || !runArg || separator !== '--' || !executable) {
  throw new Error('Usage: node run-with-coverage.mjs REPO NEW_RUN_DIR -- EXECUTABLE [ARGS...]');
}
const repo = canonical(repoArg);
if (canonical(executable).toLowerCase() !== canonical(process.execPath).toLowerCase()) {
  throw new Error('Invoke the captured test directly with the same explicit Node executable as this collector');
}
const runDir = path.resolve(runArg);
if (fs.existsSync(runDir)) throw new Error('Run directory must be new, to prevent stale coverage reuse');
fs.mkdirSync(runDir, { recursive: true });
const coverageDir = path.join(runDir, 'coverage');
fs.mkdirSync(coverageDir);
const before = snapshot(repo);
if (before.some(file => file.error)) throw new Error(`Target files must exist before final capture: ${JSON.stringify(before.filter(file => file.error))}`);
const startedAt = new Date().toISOString();
const collector = {
  file: fileURLToPath(import.meta.url),
  sha256: sha256(fs.readFileSync(fileURLToPath(import.meta.url))),
  scopeSha256: sha256(fs.readFileSync(new URL('./scope.mjs', import.meta.url))),
  node: process.version,
  v8: process.versions.v8,
  executable: process.execPath,
  executableSha256: sha256(fs.readFileSync(process.execPath))
};
const result = await new Promise(resolve => {
  const child = spawn(executable, args, {
    cwd: repo, windowsHide: true, stdio: 'inherit',
    env: { ...process.env, PATH: `${path.dirname(process.execPath)}${path.delimiter}${process.env.PATH ?? ''}`, NODE_V8_COVERAGE: coverageDir }
  });
  child.once('error', error => resolve({ code: null, signal: null, error: error.message }));
  child.once('close', (code, signal) => resolve({ code, signal }));
});
const after = snapshot(repo);
const provenance = {
  schema: 1, purpose: 'dual-host-production-function-crap', repo, coverageDir,
  startedAt, completedAt: new Date().toISOString(), collector,
  command: { executable, args }, result, before, after,
  unchanged: JSON.stringify(before) === JSON.stringify(after),
  coverageFiles: inventoryCoverage(coverageDir)
};
fs.writeFileSync(path.join(runDir, 'coverage-provenance.json'), JSON.stringify(provenance, null, 2) + '\n');
console.log(JSON.stringify({ provenance: path.join(runDir, 'coverage-provenance.json'), result, unchanged: provenance.unchanged, coverageFiles: provenance.coverageFiles.length }));
process.exitCode = result.code === 0 && provenance.unchanged && provenance.coverageFiles.length > 0 ? 0 : result.code || 2;
