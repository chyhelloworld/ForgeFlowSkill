import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const clientFile = path.join(here, '..', 'client.js');

function loadPlugin(requireFn) {
  let plugin = null;
  globalThis.window = {
    __ModuleLoader__: {
      load: (definition) => {
        assert.equal(definition.id, '@local/forgeflow-dsh');
        plugin = definition.factory(requireFn);
      },
    },
  };
  return import(pathToFileURL(clientFile).href + '?case=' + Math.random().toString(36).slice(2)).then(() => plugin);
}

const fakeReact = {
  createElement: (type, props) => ({ type, props }),
};

test('client half registers the sidebar entry and main panel', async (t) => {
  t.after(() => { delete globalThis.window; });
  const plugin = await loadPlugin(() => fakeReact);
  assert.deepEqual(plugin.inject, ['slots', 'sessions', 'workspaces', 'remote', 'remote.workspaceFiles']);
  const registered = [];
  const ctx = {
    slots: {
      inject: (name, callback) => { registered.push({ name, value: callback() }); },
      register: (definition) => definition,
    },
  };
  plugin.apply(ctx);
  assert.equal(registered.length, 2);
  assert.equal(registered[0].name, 'sidebar.panellist');
  assert.equal(registered[0].value.id, 'ff-board');
  assert.equal(registered[0].value.label(), 'ForgeFlow 看板');
  assert.equal(registered[1].name, 'main');
  assert.equal(registered[1].value.key, 'ff-board');
});

test('apply keeps boot alive when slot registration throws', async (t) => {
  t.after(() => { delete globalThis.window; });
  const plugin = await loadPlugin(() => fakeReact);
  assert.doesNotThrow(() => plugin.apply({ slots: { inject: () => { throw new Error('slot missing'); } } }));
});

const sampleBoard = () => ({
  format: 'ff-board-v1',
  sources: ['source/planning/intent-view-links.json'],
  intent: { ref: 'source/planning/intent-view-links.json' },
  requirements: [{ id: 'R-1', title: '需求一', ref: 'source/planning/x.md#R-1', parent_ids: [] }],
  architecture: { items: [{ title: '架构', ref: 'source/docs/x.md', exists: true }] },
  modules: [{ id: 'M-1', title: '模块一', ref: 'source/skills/ff-x/SKILL.md', requirement_ids: ['R-1'] }],
  tasks: { items: [], progress: { source: null, done: null, total: null, changes: [], reason: '未启用 OpenSpec' } },
  acceptance: [],
});

function fakeContext(read) {
  const active = { id: 's1', cwd: 'E:/ws/a', retainedBy: { mainView: 1 }, updatedAt: 2 };
  const workspaces = {
    items: [
      { workspaceId: 'w1', path: 'E:/ws/a', title: 'A', sessionIds: ['s1'] },
      { workspaceId: 'w2', path: 'E:/ws/b', title: 'B', sessionIds: [] },
    ],
  };
  return {
    get(name) {
      if (name === 'sessions') return { list: { getSnapshot: () => ({ byId: { s1: active } }) } };
      if (name === 'workspaces') return { list: { getSnapshot: () => workspaces } };
      if (name === 'remote') return { workspaceFiles: { read: read || (async () => ({ ok: true, value: { text: JSON.stringify(sampleBoard()) } })) } };
      return null;
    },
  };
}

test('validateBoard rejects structurally corrupt snapshots', async (t) => {
  t.after(() => { delete globalThis.window; });
  const plugin = await loadPlugin(() => fakeReact);
  assert.equal(plugin.__test.validateBoard(sampleBoard()), null);
  const badSources = sampleBoard();
  badSources.sources = 'x';
  assert.match(plugin.__test.validateBoard(badSources), /sources/);
  const badItems = sampleBoard();
  badItems.requirements = [null];
  assert.match(plugin.__test.validateBoard(badItems), /requirements/);
  const badProgress = sampleBoard();
  badProgress.tasks.progress.total = '1';
  assert.match(plugin.__test.validateBoard(badProgress), /done\/total/);
  const impossible = sampleBoard();
  impossible.tasks.progress = { source: 'openspec/changes', done: 3, total: 2, changes: ['x'], reason: null };
  assert.match(plugin.__test.validateBoard(impossible), /0\.\.total/);
  const empty = sampleBoard();
  empty.tasks.progress = { source: 'openspec/changes', done: 0, total: 0, changes: [], reason: '没有勾选项' };
  assert.equal(plugin.__test.validateBoard(empty), null);
});

test('scopeFor does not lend another workspace session', async (t) => {
  t.after(() => { delete globalThis.window; });
  const plugin = await loadPlugin(() => fakeReact);
  const scope = plugin.__test.scopeFor(fakeContext(), 'w2');
  assert.equal(scope.workspace.workspaceId, 'w2');
  assert.equal(scope.sessionId, null);
});

test('loadBoard reads the snapshot and reports envelope failures', async (t) => {
  t.after(() => { delete globalThis.window; });
  const plugin = await loadPlugin(() => fakeReact);
  const ready = await plugin.__test.loadBoard(fakeContext(), 'w1');
  assert.equal(ready.status, 'ready');
  assert.equal(ready.board.requirements[0].id, 'R-1');
  const denied = await plugin.__test.loadBoard(fakeContext(async () => ({ ok: false, error: { message: 'not found' } })), 'w1');
  assert.equal(denied.status, 'no-snapshot');
  const corrupt = sampleBoard();
  corrupt.sources = 'x';
  const bad = await plugin.__test.loadBoard(fakeContext(async () => ({ ok: true, value: { text: JSON.stringify(corrupt) } })), 'w1');
  assert.equal(bad.status, 'bad-format');
  const noSession = await plugin.__test.loadBoard(fakeContext(), 'w2');
  assert.equal(noSession.status, 'no-session');
});

test('apply keeps boot alive when a deferred registration throws', async (t) => {
  t.after(() => { delete globalThis.window; });
  const plugin = await loadPlugin(() => fakeReact);
  const ctx = {
    slots: {
      inject: (name, callback) => { callback(); },
      register: () => { throw new Error('register failed'); },
    },
  };
  assert.doesNotThrow(() => plugin.apply(ctx));
});

test('client half degrades to an empty plugin when React is missing', async (t) => {
  t.after(() => { delete globalThis.window; });
  const plugin = await loadPlugin(() => { throw new Error('react missing'); });
  assert.deepEqual(plugin.inject, []);
  assert.equal(typeof plugin.apply, 'function');
  plugin.apply({});
});
