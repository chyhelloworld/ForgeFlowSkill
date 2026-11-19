// Static content/distribution checks; not evidence of a host model following prompts.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { skillPayload } from '../source.mjs';
import { hostBase } from '../state.mjs';
import { FOUR_LAYER_ANCHOR } from '../../../dsh-plugin/index.js';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const restrictions = [
  '没有概率数据就写“未知”，不编数字',
  '超出已确认范围或显著增加复杂度时，先征得用户同意',
  '范围内必要检查不逐项重复审批',
  '必要的安全、授权和数据完整性保障不能仅因概率低而省略',
  '同一信任边界内，同一条件未变时不要逐层重复校验',
  '跨越新信任边界、依赖状态变化或操作需要当前授权时，仍做必要检查',
  '类型标注不能代替运行时校验',
  '事务、唯一约束和原子操作不是多余的类型校验',
];
function check(text) { for (const sentence of restrictions) assert.ok(text.includes(sentence), sentence); }
test('short and full implementation/review paths carry the approved guardrails', () => {
  for (const rel of ['skills/ff-implement/SKILL.md', 'skills/ff-review/SKILL.md',
    'skills/ff-implement/references/full-workflow.md', 'skills/ff-review/references/reviews.md']) check(read(rel));
});
test('three host payloads retain guardrails and concise L2 activation', () => {
  for (const host of ['codex', 'claude', 'dsh']) {
    const payload = skillPayload(root, { version: 'fixture', hash: 'a'.repeat(64) }, host);
    for (const name of ['ff-implement', 'ff-review']) {
      const entry = payload[`${hostBase(host)}/${name}/SKILL.md`].toString();
      check(entry);
      assert.ok(entry.includes('概率无数据写未知'));
      assert.ok(entry.includes('新边界、状态变化或当前授权仍须检查'));
    }
  }
  assert.ok(FOUR_LAYER_ANCHOR.includes('必要安全、授权与数据完整性不因低概率省略'));
});
test('all existing intent contract copies remain byte-identical', () => {
  const expected = read('docs/maintainers/INTENT-LOOP.md');
  let count = 0;
  for (const name of fs.readdirSync(path.join(root, 'skills'))) {
    const rel = `skills/${name}/references/intent-loop.md`;
    if (fs.existsSync(path.join(root, rel))) { assert.equal(read(rel), expected); count++; }
  }
  assert.equal(count, 10);
});
test('missing or inverted critical wording fails content check', () => {
  const text = read('skills/ff-implement/SKILL.md');
  for (const sentence of restrictions) assert.throws(() => check(text.replace(sentence, '可忽略该条件')));
});
test('five contrasting replay cases have explicit criteria and rejection conditions', () => {
  const cases = JSON.parse(read('evaluations/scenarios.json')).cases.filter(c => c.id.startsWith('DEF-'));
  assert.deepEqual(cases.map(c => c.id), ['DEF-D01','DEF-D02','DEF-D03','DEF-D04','DEF-D05']);
  for (const c of cases) { assert.equal(c.criteria.length, 3); assert.ok(c.critical_failures.length); }
});
