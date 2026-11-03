/** node --test：DSH 插件注册、四层锚点、两个只读工具与 archive 守卫的分支断言。 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { apply, name, inject, gateTarget, statusSummary, gateSummary, FOUR_LAYER_ANCHOR } from '../index.js';

function tempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'ff-dsh-plugin-'));
}

function writeStub(project, report) {
  const dir = path.join(project, '.forgeflow');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, 'ff-spec.mjs');
  fs.writeFileSync(file, 'console.log(JSON.stringify(' + JSON.stringify(report) + '));' + String.fromCharCode(10));
  return file;
}

function writeDoctor(project, report) {
  const dir = path.join(project, '.forgeflow', 'install');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, 'doctor.mjs');
  fs.writeFileSync(file, 'console.log(JSON.stringify(' + JSON.stringify(report) + '));' + String.fromCharCode(10));
  return file;
}

function fakeCtx(options = {}) {
  const services = Object.assign({}, options.services);
  const tools = new Map();
  const listeners = [];
  const commands = [];
  const effects = [];
  const sections = [];
  const ctx = {
    services,
    tools: {
      register(tool) {
        tools.set(tool.name, tool);
        return () => tools.delete(tool.name);
      },
    },
    on(event, listener, opts) {
      listeners.push({ event, listener, opts });
      return () => {};
    },
    effect(fn) {
      const dispose = fn();
      if (typeof dispose === 'function') effects.push(dispose);
      return () => {};
    },
    get(serviceName) {
      return services[serviceName];
    },
    inject(names, fn) {
      if (names.every(item => services[item])) fn({ commands: services.commands });
    },
    toolsMap: tools,
    listeners,
    commands,
    effects,
    sections,
  };
  if (!options.noSystemPrompt) {
    ctx.systemPrompt = {
      section(spec) {
        sections.push(spec);
        return () => {};
      },
    };
  }
  if (options.commands) {
    const registry = {
      register(command) {
        commands.push(command);
        return () => {};
      },
    };
    services.commands = registry;
    ctx.inject = (names, fn) => {
      if (names.includes('commands')) fn({ commands: registry });
    };
  }
  return ctx;
}

function guardOf(ctx) {
  const found = ctx.listeners.find(item => item.event === 'tools/pre-execute');
  assert.ok(found, '应注册 tools/pre-execute 监听');
  return found;
}

function execFor(command, toolName = 'pwsh') {
  return { callId: 'call-1', name: toolName, arguments: { command }, signal: new AbortController().signal };
}

const ALLOW = { kind: 'allow' };
const next = async () => ALLOW;

test('插件导出 name/inject', () => {
  assert.equal(name, 'forgeflow-dsh');
  assert.deepEqual(inject, ['tools']);
});

test('注册两个只读工具且 output.render 是函数', () => {
  const ctx = fakeCtx();
  apply(ctx, {});
  assert.deepEqual([...ctx.toolsMap.keys()].sort(), ['ff_gate', 'ff_status']);
  for (const tool of ctx.toolsMap.values()) {
    assert.equal(typeof tool.description, 'string');
    assert.ok(tool.description.length > 0);
    assert.equal(tool.parameters.type, 'object');
    assert.equal(typeof tool.output.render, 'function');
    assert.equal(tool.output.schema.type, 'object');
    assert.equal(typeof tool.presentCall, 'function');
    assert.equal(tool.presentCall({}).kind, 'read');
    const text = tool.output.render({}, { summary: 'hello' });
    assert.deepEqual(text, [{ type: 'text', text: 'hello' }]);
  }
  assert.equal(guardOf(ctx).opts.prepend, true);
  assert.equal(ctx.sections.length, 1, '应注册一条常驻 systemPrompt 段');
  assert.equal(ctx.sections[0].name, 'forgeflow:four-layer');
  assert.equal(ctx.sections[0].order, 240);
  assert.match(ctx.sections[0].text, /L1/);
  assert.match(ctx.sections[0].text, /L4/);
  assert.equal(typeof ctx.sections[0].text, 'string');
  assert.equal(ctx.sections[0].text, FOUR_LAYER_ANCHOR);
});

test('anchor=false 或宿主无 systemPrompt 时不注册四层段', () => {
  const off = fakeCtx();
  apply(off, { anchor: false });
  assert.equal(off.sections.length, 0);
  const legacy = fakeCtx({ noSystemPrompt: true });
  assert.doesNotThrow(() => apply(legacy, {}));
  assert.equal(legacy.sections.length, 0);
  assert.deepEqual([...legacy.toolsMap.keys()].sort(), ['ff_gate', 'ff_status']);
});

test('ff_status 在未安装项目返回 missing 摘要', async () => {
  const project = tempDir();
  const ctx = fakeCtx({ services: { workingDirectory: { defaultDirectory: project } } });
  apply(ctx, {});
  const value = await ctx.toolsMap.get('ff_status').execute({}, execFor('', 'run_code'));
  assert.equal(value.source, 'none');
  assert.equal(value.gates, 'missing');
  assert.match(value.summary, /未安装|未检测到/);
  assert.equal(value.project, project);
});

test('ff_status 优先使用 doctor 并在 full 安装下汇总', () => {
  const project = tempDir();
  fs.mkdirSync(path.join(project, '.forgeflow', 'install'), { recursive: true });
  fs.writeFileSync(path.join(project, '.forgeflow', 'install', 'state.json'), JSON.stringify({ version: '0.9.7-dsh.1', mode: 'full', hosts: ['dsh'] }));
  writeDoctor(project, {
    status: 'READY',
    runtime: 'READY',
    version: '0.9.7-dsh.1',
    mode: 'full',
    gates: { configuration: 'CONFIGURED', evidence: 'VALID', checked: 2 },
    discovery: { root: '.dsh/skills', skills: 21, others: [] },
    handshake: { skills: '0.9.7-dsh.1', state: '0.9.7-dsh.1', verdict: 'MATCH', cliMatchesState: true },
  });
  const value = statusSummary(project, { enabled: true, timeoutMs: 15000 });
  assert.equal(value.source, 'doctor');
  assert.equal(value.gates, 'CONFIGURED / evidence=VALID / checked=2');
  assert.match(value.discovery, /skills=21/);
  assert.match(value.handshake, /verdict=MATCH/);
});

test('ff_status 对 skills-only 安装报告 BLOCKED', () => {
  const project = tempDir();
  fs.mkdirSync(path.join(project, '.forgeflow', 'install'), { recursive: true });
  fs.writeFileSync(path.join(project, '.forgeflow', 'install', 'state.json'), JSON.stringify({ version: '0.9.7', mode: 'skills-only', host: 'dsh' }));
  const value = statusSummary(project, { enabled: true, timeoutMs: 15000 });
  assert.match(value.gates, /skills-only/);
});

test('ff_gate 无 openspec 时返回 disabled', () => {
  const project = tempDir();
  writeStub(project, { project, configured: false, policy: { state: 'missing' }, rows: [], openspec: false, blocked: [] });
  const value = gateSummary(project, { enabled: true, timeoutMs: 15000 });
  assert.equal(value.ff, 'present');
  assert.equal(value.gates, 'disabled');
  assert.match(value.note, /未启用/);
});

test('守卫对 blocked 的 archive 命令返回 deny', async () => {
  const project = tempDir();
  writeStub(project, {
    project, configured: true, policy: { state: 'configured' }, openspec: true,
    rows: [{ change: 'change-x', reasons: ['tasks 2/3'] }], blocked: ['change-x'],
  });
  const ctx = fakeCtx({ services: { workingDirectory: { defaultDirectory: project } } });
  apply(ctx, {});
  const guard = guardOf(ctx).listener;
  const decision = await guard(execFor('node .forgeflow/ff-spec.mjs archive change-x'), next);
  assert.equal(decision.kind, 'deny');
  assert.match(decision.reason, /门禁未通过/);
  assert.match(decision.reason, /change-x/);
});

test('守卫对 invalid policy 返回 deny', async () => {
  const project = tempDir();
  writeStub(project, { project, configured: false, policy: { state: 'invalid', reason: 'bad json' }, rows: [], openspec: true, blocked: [] });
  const ctx = fakeCtx({ services: { workingDirectory: { defaultDirectory: project } } });
  apply(ctx, {});
  const decision = await guardOf(ctx).listener(execFor('node .forgeflow/ff-spec.mjs archive'), next);
  assert.equal(decision.kind, 'deny');
  assert.match(decision.reason, /配置无效/);
});

test('守卫放行无 FF 的项目', async () => {
  const project = tempDir();
  const ctx = fakeCtx({ services: { workingDirectory: { defaultDirectory: project } } });
  apply(ctx, {});
  const decision = await guardOf(ctx).listener(execFor('node .forgeflow/ff-spec.mjs archive'), next);
  assert.deepEqual(decision, ALLOW);
});

test('守卫放行 enabled=false 与 FF_ALLOW_UNGATED=1', async () => {
  const project = tempDir();
  writeStub(project, { project, configured: true, policy: { state: 'configured' }, rows: [{ change: 'x', reasons: ['r'] }], openspec: true, blocked: ['x'] });
  const disabled = fakeCtx({ services: { workingDirectory: { defaultDirectory: project } } });
  apply(disabled, { enabled: false });
  assert.deepEqual(await guardOf(disabled).listener(execFor('node .forgeflow/ff-spec.mjs archive'), next), ALLOW);

  const before = process.env.FF_ALLOW_UNGATED;
  process.env.FF_ALLOW_UNGATED = '1';
  try {
    const exempt = fakeCtx({ services: { workingDirectory: { defaultDirectory: project } } });
    apply(exempt, {});
    assert.deepEqual(await guardOf(exempt).listener(execFor('node .forgeflow/ff-spec.mjs archive'), next), ALLOW);
  } finally {
    if (before === undefined) delete process.env.FF_ALLOW_UNGATED;
    else process.env.FF_ALLOW_UNGATED = before;
  }
});

test('守卫跳过非 pwsh/bash 工具与不匹配的命令', async () => {
  const project = tempDir();
  writeStub(project, { project, configured: true, policy: { state: 'configured' }, rows: [{ change: 'x', reasons: ['r'] }], openspec: true, blocked: ['x'] });
  const ctx = fakeCtx({ services: { workingDirectory: { defaultDirectory: project } } });
  apply(ctx, {});
  const guard = guardOf(ctx).listener;
  assert.deepEqual(await guard(execFor('node .forgeflow/ff-spec.mjs archive', 'run_code'), next), ALLOW);
  assert.deepEqual(await guard(execFor('node .forgeflow/ff-spec.mjs status'), next), ALLOW);
  assert.deepEqual(await guard({ name: 'pwsh', arguments: { command: 42 } }, next), ALLOW);
});

test('守卫放行 archive --help 与文档化的取消/拒绝路径', async () => {
  const project = tempDir();
  writeStub(project, {
    project, configured: true, policy: { state: 'configured' }, openspec: true,
    rows: [{ change: 'change-x', reasons: ['tasks 2/3'] }], blocked: ['change-x'],
  });
  const ctx = fakeCtx({ services: { workingDirectory: { defaultDirectory: project } } });
  apply(ctx, {});
  const guard = guardOf(ctx).listener;
  assert.deepEqual(await guard(execFor('node .forgeflow/ff-spec.mjs archive --help'), next), ALLOW);
  assert.deepEqual(await guard(execFor('node .forgeflow/ff-spec.mjs archive -h'), next), ALLOW);
  assert.deepEqual(await guard(execFor('node .forgeflow/ff-spec.mjs archive change-x --ff-disposition canceled'), next), ALLOW);
  assert.deepEqual(await guard(execFor('node .forgeflow/ff-spec.mjs archive change-x --ff-disposition=rejected'), next), ALLOW);
  const decision = await guard(execFor('node .forgeflow/ff-spec.mjs archive change-x -y'), next);
  assert.equal(decision.kind, 'deny');
});

test('守卫不把引号文本、echo 参数或 build 当成 archive 命令', async () => {
  const project = tempDir();
  writeStub(project, {
    project, configured: true, policy: { state: 'configured' }, openspec: true,
    rows: [{ change: 'change-x', reasons: ['tasks 2/3'] }], blocked: ['change-x'],
  });
  const ctx = fakeCtx({ services: { workingDirectory: { defaultDirectory: project } } });
  apply(ctx, {});
  const guard = guardOf(ctx).listener;
  assert.deepEqual(await guard(execFor('echo "node .forgeflow/ff-spec.mjs archive change-x"'), next), ALLOW);
  assert.deepEqual(await guard(execFor('echo node .forgeflow/ff-spec.mjs archive change-x'), next), ALLOW);
  assert.deepEqual(await guard(execFor('node .forgeflow/ff-spec.mjs build'), next), ALLOW);
  assert.equal(gateTarget('node .forgeflow/ff-spec.mjs build', process.cwd()), null);
});

test('gateTarget 解析相对与绝对路径', () => {
  const session = path.join(tempDir(), 'project');
  const relative = gateTarget('node .forgeflow/ff-spec.mjs archive', session);
  assert.equal(path.normalize(relative.specPath), path.normalize(path.join(session, '.forgeflow', 'ff-spec.mjs')));
  assert.equal(path.normalize(relative.project), path.normalize(session));
  const absolute = path.join(tempDir(), '.forgeflow', 'ff-spec.mjs');
  const target = gateTarget('node "' + absolute + '" archive', process.cwd());
  assert.equal(path.normalize(target.specPath), path.normalize(absolute));
});

test('commands 服务可用时注册 /ff-status，不可用时安全降级', () => {
  const project = tempDir();
  const ctx = fakeCtx({ commands: true, services: { workingDirectory: { defaultDirectory: project } } });
  apply(ctx, {});
  assert.equal(ctx.commands.length, 1);
  assert.equal(ctx.commands[0].name, 'ff-status');
  const result = ctx.commands[0].handler({});
  assert.equal(result.kind, 'success');
  assert.match(result.text, /FF/);

  const legacy = fakeCtx();
  assert.doesNotThrow(() => apply(legacy, {}));
  assert.equal(legacy.commands.length, 0);
});
