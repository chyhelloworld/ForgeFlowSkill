// Static distribution contract. No Docker daemon or model behaviour is simulated.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { skillPayload } from '../source.mjs';
import { hostBase } from '../state.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const skills = ['ff-implement', 'ff-tdd'];
test('implementation and test entry points route Docker work to a local contract', () => {
  for (const skill of skills) {
    const text = fs.readFileSync(path.join(root, 'skills', skill, 'SKILL.md'), 'utf8');
    assert.match(text, /Docker.*references\/docker-resources\.md/);
  }
});
test('each host receives the same self-contained Docker contract', () => {
  const contract = fs.readFileSync(path.join(root, 'docs/maintainers/DOCKER-RESOURCES.md'));
  for (const host of ['codex', 'claude', 'dsh']) {
    const payload = skillPayload(root, { version: 'fixture', hash: 'a'.repeat(64) }, host);
    for (const skill of skills) {
      assert.deepEqual(payload[`${hostBase(host)}/${skill}/references/docker-resources.md`], contract);
    }
  }
});
const cases = [
  ['reuse', ['--no-cache', '随机 tag', '内容', '缓存']],
  ['ownership', ['完整 ID', '创建前', 'endpoint', '本轮', 'label']],
  ['protected', ['数据卷', '已有服务', '共享镜像', '未知资源', 'BuildKit', 'prune']],
  ['outcomes', ['成功', '失败', '中断', 'SIGKILL', '重复测试', '残留']],
  ['approval', ['blocked by policy', '不换', 'UNKNOWN', '只读核查']],
  ['evidence', ['静态', '模拟', '真实 Docker', '真实 Codex', 'NOT_RUN']],
];
for (const [name, required] of cases) test(`contract explicitly covers ${name}`, () => {
  const text = fs.readFileSync(path.join(root, 'docs/maintainers/DOCKER-RESOURCES.md'), 'utf8');
  for (const term of required) assert.ok(text.includes(term), `missing ${term}`);
});

test('critical prohibitions retain explicit negative wording', () => {
  const text = fs.readFileSync(path.join(root, 'docs/maintainers/DOCKER-RESOURCES.md'), 'utf8');
  for (const sentence of [
    '不要默认 `--no-cache`',
    '不能假设镜像/container label 能隔离缓存',
    '不执行全局 `docker system prune`',
    '不换 shell、命令、工具或 endpoint 绕过',
    '名字、前缀、创建时间或 label 单独都不足以授权删除',
    '无法建立可信基线时停止依赖归属的删除',
    '数据卷（包括匿名卷）',
  ]) assert.ok(text.includes(sentence), `missing restriction: ${sentence}`);
});
