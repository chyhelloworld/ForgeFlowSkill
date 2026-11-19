import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { install } from '../install.mjs';
import { inventory } from '../runtime.mjs';
import { createTestWorkspace } from '../testing/workspace.mjs';

const source = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const owned = createTestWorkspace();
let success = true;
test.after(() => owned.cleanup({ apply: true, success }));
const sha = value => createHash('sha256').update(value).digest('hex');
test('installed skills-only goal query validates real receipts without creating home or changing any project bytes', () => {
  try {
    const root = fs.mkdtempSync(path.join(owned.directory, '目标 project '));
    install(root, source, { host: 'codex', mode: 'skills-only' });
    const put = (name, data) => fs.writeFileSync(path.join(root, name), typeof data === 'string' ? data : JSON.stringify(data));
    const evidence = name => ({ path: name, sha256: sha(fs.readFileSync(path.join(root, name))) });
    put('plan.md', 'approved goal'); put('result.txt', 'actual test output');
    const dependencies = [evidence('plan.md')];
    put('receipt.json', { actionId: 'T1', goalRevision: 'R2', dependencyFingerprint: sha(JSON.stringify(dependencies)), operation: 'test', exitCode: 0, outputs: [evidence('result.txt')] });
    put('checkpoint.json', { version: 1, projectRoot: root, goalRevision: 'R2', dependencies, actions: [{ id: 'T1', state: 'done', receipt: [evidence('receipt.json')] }] });
    const before = inventory(root);
    const args = [path.join(root, '.forgeflow/ff-spec.mjs'), 'status', '--goal', 'checkpoint.json', '--current-goal', 'R2', '--json'];
    const result = spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(JSON.parse(result.stdout).counts.VERIFIED, 1);
    assert.deepEqual(inventory(root), before, 'read-only query preserves every file byte and creates no files');
    assert.equal(fs.existsSync(path.join(root, '.forgeflow/install/local-home')), false);
    const outside = spawnSync(process.execPath, [args[0], 'status'], { cwd: root, encoding: 'utf8' });
    assert.notEqual(outside.status, 0); assert.match(outside.stderr, /skills-only/);
    const state = JSON.parse(fs.readFileSync(path.join(root, '.forgeflow/install/state.json')));
    const reader = path.join(root, '.forgeflow/install', state.release, 'skills/ff-handoff/scripts/resume.py');
    fs.appendFileSync(reader, '\n# changed reader\n');
    const tampered = spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8' });
    assert.notEqual(tampered.status, 0); assert.match(tampered.stderr, /integrity/);
  } catch (error) { success = false; throw error; }
});
