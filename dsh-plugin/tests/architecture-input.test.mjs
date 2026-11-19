import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildBoard } from '../generate-board.mjs';

function fixture(t) {
  const workspace = fs.mkdtempSync(path.join(process.env.FF_TEST_ROOT || os.tmpdir(), 'ff-architecture-'));
  t.after(() => fs.rmSync(workspace, { recursive: true, force: true }));
  const write = (file, text) => {
    const target = path.join(workspace, file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, text);
  };
  const mapping = {
    format: 'intent-links-v1', source_revision: 'goal-r1',
    architecture_ref: 'docs/architecture.md', baseline_ref: 'planning/intent.md',
    requirements: [{ id: 'R1', ref: 'planning/intent.md#r1' }],
    acceptance: [{ id: 'A1', ref: 'planning/intent.md#a1', requirement_ids: ['R1'], evidence_refs: [] }],
  };
  const graph = {
    format: 'ff-architecture-v1', goal: '办结稽查记录', goal_id: 'R1', source_revision: 'goal-r1',
    design: 'proposed',
    nodes: [
      { id: 'open', label: '打开记录', stage: '取证', ref: '#打开', requirement_ids: ['R1'], required: true },
      { id: 'save', label: '保存判定', stage: '处置', ref: '#保存', requirement_ids: ['R1'], required: true },
    ],
    edges: [{ from: 'open', to: 'save', kind: 'flow', label: '判定后提交' },
      { from: 'save', to: 'open', kind: 'flow', label: '下一条' }],
    path: ['open', 'save'],
    gaps: [{ label: '未验证鉴权', ref: '#鉴权', required: true }],
  };
  const writeMapping = () => write('source/planning/intent-view-links.json', JSON.stringify(mapping));
  const writeGraph = (content) => write('source/docs/architecture.md',
    content ?? ('# 稽查架构\n<a id="打开"></a>\n<a id="保存"></a>\n<a id="鉴权"></a>\n<a id="来源"></a>\n\n```ff-architecture-v1\n' + JSON.stringify(graph) + '\n```\n'));
  write('source/planning/intent.md', '# 业务意图\n\n## R1 办结稽查记录\n## A1 实际办结\n');
  write('openspec/changes/c/tasks.md', '- [x] 打开\n- [x] 保存\n');
  writeMapping();
  writeGraph();
  const generate = (extra = {}) => buildBoard({ workspace, architectureGraph: 'source/docs/architecture.md', ...extra });
  return { workspace, write, mapping, graph, writeMapping, writeGraph, generate };
}

test('opt-in graph is bound to its own goal, preserves flow loop and does not equate 2/2 with acceptance', (t) => {
  const f = fixture(t);
  const board = f.generate();
  assert.equal(board.format, 'ff-board-v1');
  assert.equal(board.architecture.kind, 'graph');
  assert.equal(board.architecture.graph.goal_id, 'R1');
  assert.deepEqual(board.architecture.graph.path, ['open', 'save']);
  assert.equal(board.architecture.graph.edges.length, 2);
  assert.equal(board.architecture.graph.gaps[0].ref, 'source/docs/architecture.md#鉴权');
  assert.equal(board.architecture.graph.nodes[0].ref, 'source/docs/architecture.md#打开');
  assert.equal(board.architecture.graph.design, 'proposed');
  assert.equal(board.tasks.progress.done, 2);
  assert.equal(board.tasks.progress.total, 2);
  assert.equal(board.acceptance[0].result_ref, null);
  assert.equal(fs.existsSync(path.join(f.workspace, '.forgeflow')), false);
});

test('old --architecture-doc remains documents even when it has a valid graph block', (t) => {
  const f = fixture(t);
  const a = f.generate({ architectureGraph: undefined, architectureDocs: ['source/docs/architecture.md'] }).architecture;
  assert.equal(a.kind, 'documents');
  assert.equal(a.graph, undefined);
});

test('falls back to reference without faking a graph if source is unbound or stale', (t) => {
  const f = fixture(t);
  f.mapping.architecture_ref = 'docs/different.md';
  f.writeMapping();
  const unbound = f.generate().architecture;
  assert.equal(unbound.kind, 'documents');
  assert.equal(unbound.graph, undefined);
  assert.match(unbound.note, /architecture_ref/);
  f.mapping.architecture_ref = 'docs/architecture.md';
  f.mapping.source_revision = 'goal-r2';
  f.writeMapping();
  const stale = f.generate().architecture;
  assert.equal(stale.kind, 'documents');
  assert.match(stale.note, /source_revision/);
});

test('ignores quoted fence examples and refuses ambiguous or malformed blocks', (t) => {
  const f = fixture(t);
  f.writeGraph('# 说明\n\n````markdown\n```ff-architecture-v1\n{}\n```\n````\n');
  assert.match(f.generate().architecture.note, /找不到.*ff-architecture-v1/);
  f.writeGraph('```ff-architecture-v1\n{}\n```\n~~~ff-architecture-v1\n{}\n~~~\n');
  assert.match(f.generate().architecture.note, /只能有一个/);
  f.writeGraph('```ff-architecture-v1\n{}\n');
  assert.match(f.generate().architecture.note, /没有闭合/);
  f.writeGraph('```ff-architecture-v1\n{not json}\n```\n');
  assert.match(f.generate().architecture.note, /JSON/);
});

test('rejects bad provenance, graph keys, edges and paths instead of filling them in', (t) => {
  const f = fixture(t);
  const baseline = structuredClone(f.graph);
  const cases = [
    [g => { g.goal_id = 'OTHER'; }, /goal_id/],
    [g => { g.nodes[0].requirement_ids = ['R9']; }, /requirement_ids/],
    [g => { g.nodes[1].id = 'open'; }, /重复/],
    [g => { g.nodes[0].ref = '../other.md'; }, /#锚点/],
    [g => { g.nodes[0].ref = '#不存在'; }, /#锚点/],
    [g => { g.nodes[0].required = 'true'; }, /required/],
    [g => { g.edges[0].to = 'missing'; }, /边/],
    [g => { g.edges[0].kind = 'dependency'; }, /主链/],
    [g => { g.edges.push({from:'open', to:'save', kind:'dependency'}, {from:'save', to:'open', kind:'dependency'}); }, /循环/],
    [g => { g.design = 'confirmed'; }, /confirmation_ref/],
  ];
  for (const [mutate, expected] of cases) {
    Object.assign(f.graph, structuredClone(baseline));
    mutate(f.graph);
    f.writeGraph();
    const a = f.generate().architecture;
    assert.equal(a.kind, 'documents');
    assert.match(a.note, expected);
  }
});

test('refuses a graph symlink outside an otherwise valid workspace', (t) => {
  const f = fixture(t);
  const outside = fs.mkdtempSync(path.join(process.env.FF_TEST_ROOT || os.tmpdir(), 'ff-architecture-outside-'));
  t.after(() => fs.rmSync(outside, { recursive: true, force: true }));
  const target = path.join(f.workspace, 'source/docs/architecture.md');
  const source = path.join(outside, 'external.md');
  fs.copyFileSync(target, source);
  fs.unlinkSync(target);
  try {
    fs.symlinkSync(source, target, 'file');
  } catch (error) {
    if (error.code === 'EPERM' && process.platform === 'win32') return t.skip('Windows symlink permission unavailable');
    throw error;
  }
  const a = f.generate().architecture;
  assert.equal(a.kind, 'none');
  assert.equal(a.items.length, 0);
  assert.match(a.note, /工作区/);
});

test('design confirmation is a source declaration with a checked anchor, not acceptance', (t) => {
  const f = fixture(t);
  f.graph.design = 'confirmed';
  f.graph.confirmation_ref = '#来源';
  f.writeGraph();
  const board = f.generate();
  assert.equal(board.architecture.graph.design, 'confirmed');
  assert.match(board.architecture.graph.confirmation_ref, /#来源$/);
  assert.equal(board.acceptance[0].result_ref, null);
});

test('confirmation anchor inside a fenced example is not evidence', (t) => {
  const f = fixture(t);
  f.graph.design = 'confirmed';
  f.graph.confirmation_ref = '#虚构';
  f.writeGraph('```text\n<a id="虚构"></a>\n```\n```ff-architecture-v1\n' + JSON.stringify(f.graph) + '\n```\n');
  const a = f.generate().architecture;
  assert.equal(a.kind, 'documents');
  assert.match(a.note, /confirmation_ref/);
});

test('CLI writes only the chosen projection, is idempotent and leaves source byte-for-byte intact', async (t) => {
  const { spawnSync } = await import('node:child_process');
  const { fileURLToPath } = await import('node:url');
  const f = fixture(t);
  const files = ['source/docs/architecture.md', 'source/planning/intent-view-links.json', 'openspec/changes/c/tasks.md'];
  const read = (name) => fs.readFileSync(path.join(f.workspace, name));
  const before = files.map(read);
  const run = (...flags) => spawnSync(process.execPath,
    [fileURLToPath(new URL('../generate-board.mjs', import.meta.url)), '--workspace', f.workspace, '--architecture-graph', files[0], ...flags],
    { encoding: 'utf8' });
  const preview = run('--html');
  assert.equal(preview.status, 0, preview.stderr);
  assert.match(preview.stdout, /FF 必需缺口：1 项/);
  assert.equal(fs.existsSync(path.join(f.workspace, '.forgeflow')), false);
  const exported = run('--html', '--write');
  assert.equal(exported.status, 0, exported.stderr);
  const html = '.forgeflow/architecture-board.html';
  assert.match(read(html).toString(), /业务验收未判定/);
  assert.equal(fs.existsSync(path.join(f.workspace, '.forgeflow/board.json')), false);
  assert.match(run('--html', '--write').stdout, /未变化/);
  const json = run('--write');
  assert.equal(json.status, 0, json.stderr);
  assert.equal(JSON.parse(read('.forgeflow/board.json')).architecture.kind, 'graph');
  files.forEach((name, i) => assert.deepEqual(read(name), before[i]));
  f.mapping.source_revision = 'new-goal';
  f.writeMapping();
  assert.equal(run('--html', '--write').status, 0);
  assert.match(read(html).toString(), /必需缺口未知/);
});

test('takeover works without an intent index, keeps current and target apart and leaves acceptance unknown', (t) => {
  const f = fixture(t);
  fs.rmSync(path.join(f.workspace, 'source/planning/intent-view-links.json'));
  f.write('docs/current.md', '# 已有审片代码\n');
  f.write('docs/target.md', '# 候选电子记录\n');
  const opts = { workspace: f.workspace, architectureDocs: ['docs/current.md'], targetDocs: ['docs/target.md'] };
  assert.throws(() => buildBoard(opts), /找不到 intent-view-links/);
  const board = buildBoard({ ...opts, takeover: true });
  assert.equal(board.intent.ref, null);
  assert.equal(board.architecture.takeover.missingIntent, true);
  assert.deepEqual(board.architecture.takeover.observed.map(x => x.ref), ['docs/current.md']);
  assert.deepEqual(board.architecture.takeover.target.map(x => x.ref), ['docs/target.md']);
  assert.equal(board.architecture.graph, undefined);
  assert.equal(board.tasks.progress.done, 2);
  assert.deepEqual(board.requirements, []);
  assert.deepEqual(board.acceptance, []);
  assert.match(board.architecture.note, /需求及验收未知/);
  assert.throws(() => buildBoard({ ...opts, takeover: true, targetDocs: ['docs/current.md'] }), /同一资料/);
  assert.throws(() => buildBoard({ ...opts, takeover: true, architectureDocs: ['../outside.md'] }), /工作区内/);
  assert.throws(() => buildBoard({ ...opts, takeover: true, intent: 'not-found.json' }), /找不到 intent-view-links/);
  f.write('planning/intent-view-links.json', 'bad json');
  assert.throws(() => buildBoard({ ...opts, takeover: true }), /不是合法 JSON/);
});

test('with a bound intent, takeover graph is a target view and cannot reuse the current document', (t) => {
  const f = fixture(t);
  f.write('source/docs/current.md', '# 现状摘要');
  const board = f.generate({ takeover: true, architectureDocs: ['source/docs/current.md'] });
  assert.equal(board.architecture.kind, 'graph');
  assert.equal(board.architecture.takeover.missingIntent, false);
  assert.equal(board.architecture.takeover.target[0].ref, 'source/docs/architecture.md');
  assert.throws(() => f.generate({ takeover: true, architectureDocs: ['source/docs/architecture.md'] }), /现状资料不能作为目标主干图/);
});

test('HTML comments cannot create a source anchor or an active graph block', (t) => {
  const f = fixture(t);
  const file = path.join(f.workspace, 'source/docs/architecture.md');
  const original = fs.readFileSync(file, 'utf8');
  f.writeGraph(original.replace('<a id="鉴权"></a>', '<!--\n<a id="鉴权"></a>\n-->'));
  assert.match(f.generate().architecture.note, /待补项 ref/);
  f.writeGraph('<!--\n' + original + '-->\n');
  assert.match(f.generate().architecture.note, /找不到/);
});
