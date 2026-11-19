import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildBoard, countCheckboxes, main } from '../generate-board.mjs';

const root = process.env.FF_TEST_ROOT || os.tmpdir();
const workspace = () => fs.mkdtempSync(path.join(root, 'ff-board-'));
const clean = (dir) => fs.rmSync(dir, { recursive: true, force: true });

function fixture() {
  const ws = workspace();
  fs.mkdirSync(path.join(ws, 'source/planning'), { recursive: true });
  fs.mkdirSync(path.join(ws, 'source/docs'), { recursive: true });
  fs.writeFileSync(path.join(ws, 'source/planning/INTENT.md'), [
    '# 意图基线',
    '',
    '| ID | 标题 | 任务 |',
    '| --- | --- | --- |',
    '| R-1 | 需求一 | T-1：任务一 |',
    '| R-2 | 需求二 | T-2：任务二 |',
    '',
    '## M-1 模块一',
    '',
    '- **A-1** 验收一',
  ].join('\n'));
  fs.writeFileSync(path.join(ws, 'source/docs/ARCH.md'), '# 架构参考\n\n正文\n');
  const mapping = {
    format: 'intent-links-v1',
    source_revision: 'rev-1',
    baseline_ref: 'planning/INTENT.md',
    requirements: [
      { id: 'R-1', ref: 'planning/INTENT.md#R-1', parent_ids: [] },
      { id: 'R-2', ref: 'planning/INTENT.md#R-2', parent_ids: ['R-1'] },
    ],
    modules: [{ id: 'M-1', ref: 'planning/INTENT.md#M-1', requirement_ids: ['R-1'] }],
    tasks: [
      { id: 'T-1', ref: 'planning/INTENT.md#T-1', requirement_ids: ['R-1'], module_ids: ['M-1'], acceptance_ids: ['A-1'], progress_ref: null },
      { id: 'T-2', ref: 'planning/INTENT.md#T-2', requirement_ids: ['R-2'], module_ids: [], acceptance_ids: [], progress_ref: 'planning/PROGRESS.md' },
    ],
    acceptance: [{ id: 'A-1', ref: 'planning/INTENT.md#A-1', requirement_ids: ['R-1'], module_ids: ['M-1'], result_ref: null, evidence_refs: [] }],
  };
  fs.writeFileSync(path.join(ws, 'source/planning/intent-view-links.json'), JSON.stringify(mapping, null, 2));
  return ws;
}

test('countCheckboxes counts outside fences only', () => {
  const text = ['- [x] done', '- [ ] open', '```', '- [x] ignored', '```', '* [X] upper'].join('\n');
  assert.deepEqual(countCheckboxes(text), { done: 2, total: 3 });
});

test('countCheckboxes keeps mixed fence characters and lengths closed correctly', () => {
  const longer = ['````', '```', '- [x] fake one', '````', '- [ ] real'].join('\n');
  assert.deepEqual(countCheckboxes(longer), { done: 0, total: 1 });
  const mixed = ['~~~', '```', '- [x] fake two', '~~~', '- [x] real'].join('\n');
  assert.deepEqual(countCheckboxes(mixed), { done: 1, total: 1 });
});

test('buildBoard rejects corrupt mapping collections instead of writing a happy snapshot', (t) => {
  const ws = fixture();
  t.after(() => clean(ws));
  const mappingPath = path.join(ws, 'source/planning/intent-view-links.json');
  const mapping = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));
  mapping.requirements = {};
  fs.writeFileSync(mappingPath, JSON.stringify(mapping));
  assert.throws(() => buildBoard({ workspace: ws, intent: 'source/planning/intent-view-links.json', sourceRoot: 'source' }), /requirements 必须是数组/);
  mapping.requirements = [];
  mapping.modules.push({ ref: 'planning/INTENT.md' });
  fs.writeFileSync(mappingPath, JSON.stringify(mapping));
  assert.throws(() => buildBoard({ workspace: ws, intent: 'source/planning/intent-view-links.json', sourceRoot: 'source' }), /缺少有效 id/);
  mapping.modules.pop();
  mapping.source_revision = { rev: 1 };
  fs.writeFileSync(mappingPath, JSON.stringify(mapping));
  assert.throws(() => buildBoard({ workspace: ws, intent: 'source/planning/intent-view-links.json', sourceRoot: 'source' }), /source_revision/);
});

test('title lookup stays on one line and ignores fenced examples', (t) => {
  const ws = fixture();
  t.after(() => clean(ws));
  fs.appendFileSync(path.join(ws, 'source/planning/INTENT.md'), [
    '', '## R-9', '## R-10 标题十', '', '```', '## R-11 围栏示例', '```', '', '## R-11 标题十一',
  ].join('\n'));
  const mappingPath = path.join(ws, 'source/planning/intent-view-links.json');
  const mapping = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));
  for (const id of ['R-9', 'R-10', 'R-11']) mapping.requirements.push({ id: id, ref: 'planning/INTENT.md#' + id, parent_ids: [] });
  fs.writeFileSync(mappingPath, JSON.stringify(mapping));
  const board = buildBoard({ workspace: ws, intent: 'source/planning/intent-view-links.json', sourceRoot: 'source' });
  const byId = new Map(board.requirements.map((item) => [item.id, item.title]));
  assert.equal(byId.get('R-9'), null);
  assert.equal(byId.get('R-10'), '标题十');
  assert.equal(byId.get('R-11'), '标题十一');
});

test('buildBoard maps titles, refs and empty arrays', (t) => {
  const ws = fixture();
  t.after(() => clean(ws));
  const board = buildBoard({ workspace: ws, intent: 'source/planning/intent-view-links.json', sourceRoot: 'source', architectureDocs: ['source/docs/ARCH.md'] });
  assert.equal(board.format, 'ff-board-v1');
  assert.equal(board.intent.ref, 'source/planning/intent-view-links.json');
  assert.equal(board.intent.baseline_ref, 'source/planning/INTENT.md');
  assert.equal(board.requirements[0].title, '需求一');
  assert.equal(board.requirements[0].ref, 'source/planning/INTENT.md#R-1');
  assert.deepEqual(board.requirements[1].parent_ids, ['R-1']);
  assert.equal(board.modules[0].title, '模块一');
  assert.equal(board.tasks.items[0].title, '任务一');
  assert.equal(board.tasks.items[0].progress_ref, null);
  assert.equal(board.tasks.items[1].progress_ref, 'source/planning/PROGRESS.md');
  assert.deepEqual(board.tasks.items[1].module_ids, []);
  assert.equal(board.acceptance[0].title, '验收一');
  assert.equal(board.architecture.items[0].title, '架构参考');
  assert.equal(board.architecture.items[0].exists, true);
  assert.equal(board.tasks.progress.total, null);
  assert.match(board.tasks.progress.reason, /未启用 OpenSpec/);
});

test('module falls back to the referenced file heading', (t) => {
  const ws = fixture();
  t.after(() => clean(ws));
  fs.mkdirSync(path.join(ws, 'source/skills/ff-x'), { recursive: true });
  fs.writeFileSync(path.join(ws, 'source/skills/ff-x/SKILL.md'), '# ff-x 技能 1.2.3\n');
  const mappingPath = path.join(ws, 'source/planning/intent-view-links.json');
  const mapping = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));
  mapping.modules.push({ id: 'M-2', ref: 'skills/ff-x/SKILL.md', requirement_ids: [] });
  fs.writeFileSync(mappingPath, JSON.stringify(mapping, null, 2));
  const board = buildBoard({ workspace: ws, intent: 'source/planning/intent-view-links.json', sourceRoot: 'source' });
  assert.equal(board.modules[1].title, 'ff-x 技能');
  assert.equal(board.modules[0].title, '模块一');
  assert.equal(board.modules[1].ref, 'source/skills/ff-x/SKILL.md');
});

test('buildBoard counts active OpenSpec changes outside archive and fences', (t) => {
  const ws = fixture();
  t.after(() => clean(ws));
  fs.mkdirSync(path.join(ws, 'openspec/changes/change-a'), { recursive: true });
  fs.mkdirSync(path.join(ws, 'openspec/changes/archive/change-old'), { recursive: true });
  fs.writeFileSync(path.join(ws, 'openspec/changes/change-a/tasks.md'), '- [x] a\n- [ ] b\n```\n- [ ] fake\n```\n');
  fs.writeFileSync(path.join(ws, 'openspec/changes/archive/change-old/tasks.md'), '- [x] old\n');
  const board = buildBoard({ workspace: ws, intent: 'source/planning/intent-view-links.json', sourceRoot: 'source' });
  assert.deepEqual(board.tasks.progress, { source: 'openspec/changes', done: 1, total: 2, changes: ['change-a'], reason: null });
});

test('buildBoard reports no active changes without inventing progress', (t) => {
  const ws = fixture();
  t.after(() => clean(ws));
  fs.mkdirSync(path.join(ws, 'openspec/changes/change-empty'), { recursive: true });
  fs.writeFileSync(path.join(ws, 'openspec/changes/change-empty/tasks.md'), '# no checkboxes\n');
  const board = buildBoard({ workspace: ws, intent: 'source/planning/intent-view-links.json', sourceRoot: 'source' });
  assert.equal(board.tasks.progress.done, 0);
  assert.equal(board.tasks.progress.total, 0);
  assert.match(board.tasks.progress.reason, /没有可统计的勾选项/);
});

test('main writes once and stays idempotent', (t) => {
  const ws = fixture();
  t.after(() => clean(ws));
  const args = ['--workspace', ws, '--intent', 'source/planning/intent-view-links.json', '--source-root', 'source', '--architecture-doc', 'source/docs/ARCH.md', '--write'];
  assert.equal(main(args), 0);
  const file = path.join(ws, '.forgeflow/board.json');
  const first = fs.readFileSync(file, 'utf8');
  const firstMtime = fs.statSync(file).mtimeMs;
  assert.equal(JSON.parse(first).format, 'ff-board-v1');
  assert.equal(main(args), 0);
  assert.equal(fs.readFileSync(file, 'utf8'), first);
  assert.equal(fs.statSync(file).mtimeMs, firstMtime);
});

test('main fails clearly without an intent mapping', (t) => {
  const ws = workspace();
  t.after(() => clean(ws));
  assert.equal(main(['--workspace', ws, '--write']), 1);
  assert.equal(main(['--workspace', ws, '--bogus']), 1);
});
