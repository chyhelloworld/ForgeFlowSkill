// Distribution contract only: not a native Codex/DSH session test.
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { skillPayload } from '../source.mjs';
import { hostBase, currentSkills } from '../state.mjs';

const source = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const pin = { version: 'test-fixture', hash: 'a'.repeat(64) };

test('every activated host skill carries four-layer guidance without a reference read', () => {
  for (const host of ['codex', 'claude', 'dsh']) {
    const payload = skillPayload(source, pin, host);
    for (const name of currentSkills) {
      const entry = payload[`${hostBase(host)}/${name}/SKILL.md`].toString();
      assert.equal(entry.split('## 四层失效自检（已激活 FF 技能内）').length, 2);
      for (const layer of ['L1', 'L2', 'L3', 'L4']) assert.ok(entry.includes(`- ${layer} `), `${host}/${name}/${layer}`);
      assert.match(entry, /重大取舍至少比较/);
      assert.match(entry, /普通小任务不强造比较/);
      assert.match(entry, /目标不清或实质变化才补确认/);
      assert.equal(entry.includes('## 宿主协作（DSH）'), host === 'dsh');
    }
  }
});
