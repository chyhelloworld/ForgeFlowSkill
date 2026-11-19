// Read-only projection of one explicitly bound FF architecture document.
import fs from 'node:fs';
import path from 'node:path';

const FORMAT = 'ff-architecture-v1';
const MAX_DOC_BYTES = 1024 * 1024;
const MAX_BLOCK_BYTES = 128 * 1024;
const ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;
const ANCHOR = /^#[\p{L}\p{N}_.-]{1,120}$/u;
const list = (v) => Array.isArray(v) ? v : [];
const isObject = (v) => v && typeof v === 'object' && !Array.isArray(v);
const asText = (v, max) => typeof v === 'string' && v.trim() && v.length <= max && !/[\u0000-\u001f\u007f]/.test(v);
const requireValue = (condition, reason) => { if (!condition) throw new Error(reason); };

function inWorkspace(root, file) {
  const rel = path.relative(root, file);
  return rel !== '' && rel !== '..' && !rel.startsWith('..' + path.sep) && !path.isAbsolute(rel);
}

function safeProjectRef(ref) {
  return asText(ref, 320) && !/[\\:%?#]/.test(ref) &&
    ref.split('/').every(part => part && part !== '.' && part !== '..');
}

function findGraphBlock(text) {
  let fence;
  let inComment = false;
  let blocks = 0;
  const lines = [];
  const anchors = new Set();
  for (const line of text.split(/\r?\n/)) {
    const marker = line.match(/^ {0,3}(`{3,}|~{3,})([^\r\n]*)$/);
    if (!fence) {
      if (inComment) {
        if (line.includes('-->')) inComment = false;
        continue;
      }
      if (!marker) {
        const open = line.indexOf('<!--');
        if (open >= 0) {
          inComment = !line.includes('-->', open + 4);
          continue;
        }
        const anchor = line.trim().match(/^<a id="([\p{L}\p{N}_.-]{1,120})"><\/a>$/u);
        if (anchor) anchors.add('#' + anchor[1]);
        continue;
      }
      if (marker[1][0] === '`' && marker[2].includes('`')) continue;
      const selected = marker[2].trim() === FORMAT;
      if (selected && ++blocks > 1) throw new Error('只能有一个 ' + FORMAT + ' 区块');
      fence = { run: marker[1], selected };
      continue;
    }
    if (marker && marker[1][0] === fence.run[0] && marker[1].length >= fence.run.length && !marker[2].trim()) {
      fence = null;
      continue;
    }
    if (fence.selected) lines.push(line);
  }
  requireValue(!fence?.selected, FORMAT + ' 区块没有闭合');
  requireValue(blocks, '找不到 ' + FORMAT + ' 区块');
  const raw = lines.join('\n');
  requireValue(Buffer.byteLength(raw) <= MAX_BLOCK_BYTES, FORMAT + ' 区块过大');
  try { return { graph: JSON.parse(raw), anchors }; } catch { throw new Error(FORMAT + ' 区块不是合法 JSON'); }
}

function validateGraph(graph, mapping) {
  requireValue(isObject(graph) && graph.format === FORMAT, '结构化架构 format 应为 ' + FORMAT);
  requireValue(asText(graph.source_revision, 140) && graph.source_revision === mapping.source_revision, 'source_revision 与当前意图索引不一致');
  const requirements = list(mapping.requirements).map(row => row.id);
  requireValue(new Set(requirements).size === requirements.length, '意图索引含重复需求 ID');
  const req = new Set(requirements);
  requireValue(asText(graph.goal, 180) && req.has(graph.goal_id) && asText(graph.goal_id, 100), 'goal_id 未指向当前意图索引中的目标');
  requireValue(graph.design === 'proposed' || graph.design === 'confirmed', 'design 应为 proposed 或 confirmed');
  requireValue(Array.isArray(graph.nodes) && graph.nodes.length >= 1 && graph.nodes.length <= 128, 'nodes 应有 1–128 项');
  requireValue(Array.isArray(graph.edges) && graph.edges.length <= 384, 'edges 应至多有 384 项');
  requireValue(Array.isArray(graph.gaps) && graph.gaps.length <= 64, 'gaps 应至多有 64 项');
  requireValue(Array.isArray(graph.path) && graph.path.length >= 1 && graph.path.length <= 128, '主链 path 应有 1–128 个节点');
  return req;
}

function projectNodes(graph, req, ref, anchors) {
  const ids = new Set();
  const nodes = graph.nodes.map(row => {
    requireValue(isObject(row) && typeof row.id === 'string' && ID.test(row.id) && asText(row.label, 140) && asText(row.stage, 60), '节点缺少有效 id、label 或 stage');
    requireValue(!ids.has(row.id), '节点 id 重复');
    ids.add(row.id);
    requireValue(typeof row.ref === 'string' && ANCHOR.test(row.ref) && anchors.has(row.ref), '节点 ref 必须为同一架构文档内的显式 #锚点');
    requireValue(typeof row.required === 'boolean', '节点 required 必须为布尔值');
    requireValue(Array.isArray(row.requirement_ids) && row.requirement_ids.length <= 24 &&
      row.requirement_ids.every(id => req.has(id)) && new Set(row.requirement_ids).size === row.requirement_ids.length, '节点 requirement_ids 无效或含未知需求');
    if (row.required) requireValue(row.requirement_ids.length, '必需节点缺少原始需求映射');
    return { id: row.id, label: row.label, stage: row.stage, ref: ref + row.ref, requirement_ids: row.requirement_ids, required: row.required };
  });
  return { ids, nodes };
}

function projectEdges(graph, ids) {
  const links = new Set();
  const outgoing = new Map([...ids].map(id => [id, []]));
  const edges = graph.edges.map(row => {
    requireValue(isObject(row) && ids.has(row.from) && ids.has(row.to) &&
      (row.kind === 'flow' || row.kind === 'dependency'), '边引用未知节点或类型无效');
    requireValue(row.label === undefined || asText(row.label, 160), '边的 label 无效');
    const key = [row.kind, row.from, row.to].join(':');
    requireValue(!links.has(key), '边重复');
    links.add(key);
    if (row.kind === 'dependency') outgoing.get(row.from).push(row.to);
    return { from: row.from, to: row.to, kind: row.kind, label: row.label || '' };
  });
  const active = new Set(), done = new Set();
  function visit(id) {
    requireValue(!active.has(id), 'dependency 边不能形成循环（运行步骤请用 flow）');
    if (done.has(id)) return;
    active.add(id);
    outgoing.get(id).forEach(visit);
    active.delete(id);
    done.add(id);
  }
  ids.forEach(visit);
  requireValue(graph.path.every((id, i, route) => ids.has(id) && (i === 0 || links.has('flow:' + route[i - 1] + ':' + id))),
    '主链 path 含未知节点或相邻步骤缺少 flow 边');
  return edges;
}

function projectGaps(graph, ref, anchors) {
  return graph.gaps.map(row => {
    requireValue(isObject(row) && asText(row.label, 180) && typeof row.required === 'boolean', '待补项缺少 label 或 required');
    requireValue(typeof row.ref === 'string' && ANCHOR.test(row.ref) && anchors.has(row.ref), '待补项 ref 必须为同一架构文档内的显式 #锚点');
    return { label: row.label, ref: ref + row.ref, required: row.required };
  });
}

export function readArchitectureGraph({ workspace, file, intentPath, sourceRoot, mapping }) {
  let item = null;
  try {
    const realWorkspace = fs.realpathSync(workspace);
    const realFile = fs.realpathSync(file);
    requireValue(inWorkspace(realWorkspace, realFile) && inWorkspace(realWorkspace, fs.realpathSync(intentPath)),
      '架构文档与意图索引必须位于同一工作区内');
    const ref = path.relative(workspace, file).split(path.sep).join('/');
    requireValue(safeProjectRef(ref) && /\.md$/i.test(ref), '架构输入必须为工作区内 Markdown 文档');
    item = { title: path.basename(file), ref, exists: true };
    const expected = mapping.architecture_ref;
    requireValue(safeProjectRef(expected), '意图索引未用 architecture_ref 绑定有效的项目内架构文档');
    const rooted = sourceRoot && expected !== sourceRoot && !expected.startsWith(sourceRoot + '/') ? sourceRoot + '/' + expected : expected;
    requireValue(safeProjectRef(rooted) && path.resolve(workspace, rooted) === path.resolve(file), 'architecture_ref 未绑定所选架构文档');
    const stat = fs.statSync(realFile);
    requireValue(stat.isFile() && stat.size <= MAX_DOC_BYTES, '架构文档不是普通文件或超过 1 MiB');
    const text = fs.readFileSync(realFile, 'utf8');
    item.title = text.match(/^#\s+([^\r\n]+)/m)?.[1]?.trim().slice(0, 180) || item.title;
    const { graph, anchors } = findGraphBlock(text);
    const requirements = validateGraph(graph, mapping);
    let confirmationRef;
    if (graph.design === 'confirmed') {
      confirmationRef = graph.confirmation_ref;
      requireValue(typeof confirmationRef === 'string' && ANCHOR.test(confirmationRef) &&
        anchors.has(confirmationRef),
      '设计声明为 confirmed 时须以 confirmation_ref 指到文档内确认记录的显式锚点');
    }
    const { ids, nodes } = projectNodes(graph, requirements, ref, anchors);
    const edges = projectEdges(graph, ids);
    const gaps = projectGaps(graph, ref, anchors);
    return {
      item, graph: {
        goal: graph.goal, goal_id: graph.goal_id, source_revision: graph.source_revision, design: graph.design,
        ...(confirmationRef ? { confirmation_ref: ref + confirmationRef } : {}),
        nodes, edges, path: graph.path, gaps,
      },
    };
  } catch (error) {
    const reason = error.code ? '无法读取工作区内的架构文档或意图索引（' + error.code + '）' : error.message;
    return { item, note: '未生成架构图：' + reason + '。只显示已知文档引用，不推测缺失关系。' };
  }
}
