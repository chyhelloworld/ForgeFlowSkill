import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const entry = fileURLToPath(new URL('../../../bin/ff-install.mjs', import.meta.url));
const project = fs.mkdtempSync(path.join(process.env.FF_TEST_ROOT || os.tmpdir(), 'npx 中文 空格 '));
const invoke = args => spawnSync(process.execPath, [entry, ...args, '--project', project], { encoding: 'utf8' });
const temporary = () => fs.readdirSync(path.join(project, '.forgeflow/install')).filter(n => n.startsWith('source-') || n.startsWith('staging-') || n === 'lock');

test('npx bootstrap removes its Unicode temporary source after success, reentry and installer failure', () => {
  const installed = invoke(['install', '--host', 'codex', '--mode', 'skills-only']);
  assert.equal(installed.status, 0, installed.stderr);
  assert.equal(JSON.parse(installed.stdout).status, 'INSTALLED_SKILLS_ONLY_GATES_BLOCKED');
  assert.deepEqual(temporary(), []);
  const unchanged = invoke(['install', '--host', 'codex', '--mode', 'skills-only']);
  assert.equal(unchanged.status, 0, unchanged.stderr);
  assert.equal(JSON.parse(unchanged.stdout).status, 'UNCHANGED');
  assert.deepEqual(temporary(), []);
  const blocked = invoke(['doctor']);
  assert.equal(blocked.status, 1);
  assert.match(blocked.stderr, /BLOCKED: skills-only/);
  assert.deepEqual(temporary(), []);
});
