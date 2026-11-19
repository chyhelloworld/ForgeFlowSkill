#!/usr/bin/env node
/**
 * Build the ForgeFlow board snapshot from the intent-link mapping.
 *
 * The panel is read-only: this generator is the only writer. It intentionally
 * uses Node built-ins so an installed copy needs no dependency or build step.
 *
 * Usage:
 *   node .forgeflow/dsh-plugin/generate-board.mjs --write
 *   node .forgeflow/dsh-plugin/generate-board.mjs --intent source/planning/intent-view-links.json --source-root source --architecture-doc source/docs/user/architecture-derivation.md --write
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { readArchitectureGraph } from './architecture-input.mjs';
import { renderArchitectureHtml } from './render-architecture.mjs';

export const FORMAT = 'ff-board-v1';
const INTENT_CANDIDATES = ['planning/intent-view-links.json', 'source/planning/intent-view-links.json'];
const DEFAULT_OUTPUT = '.forgeflow/board.json';
const HTML_OUTPUT = '.forgeflow/architecture-board.html';

function slash(value) {
  return value.replace(/\\/g, '/');
}

function normalizeRef(ref, sourceRoot) {
  if (typeof ref !== 'string' || ref.trim() === '') return null;
  const value = ref.trim().replace(/\\/g, '/').replace(/^\.\//, '');
  if (value.startsWith('/') || /^[A-Za-z]:\//.test(value)) return value;
  const root = slash(sourceRoot || '').replace(/\/+$/, '');
  if (!root) return value;
  return value === root || value.startsWith(root + '/') ? value : root + '/' + value;
}

function resolveInput(workspace, candidate, sourceRoot) {
  if (path.isAbsolute(candidate)) return candidate;
  const direct = path.join(workspace, candidate);
  if (fs.existsSync(direct)) return direct;
  if (sourceRoot) {
    const rooted = path.join(workspace, sourceRoot, candidate);
    if (fs.existsSync(rooted)) return rooted;
  }
  return direct;
}

function readText(file) {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch {
    return null;
  }
}

/** Read an existing file strictly: missing stays null, other failures throw. */
function readTextStrict(file) {
  if (!fs.existsSync(file)) return null;
  return fs.readFileSync(file, 'utf8');
}

function cleanTitle(value) {
  if (typeof value !== 'string') return null;
  const title = value
    .replace(/\*\*/g, '')
    .replace(/`/g, '')
    .replace(/\s+/g, ' ')
    .replace(/^[-–—:：\s]+|[-–—:：\s]+$/g, '')
    .trim();
  return title === '' ? null : title;
}

/** Find the first heading, table cell or bold list item naming one entry. */
function findTitle(text, id) {
  if (!text) return null;
  const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const visible = linesOutsideFences(text).join('\n');
  const patterns = [
    new RegExp('^#{1,6}[ \\t]+' + escaped + '(?![A-Za-z0-9_-])[ \\t:：\\-–—]*(.+?)[ \\t]*$', 'm'),
    new RegExp('^\\|[ \\t]*' + escaped + '[ \\t]*\\|[ \\t]*([^|\\n]+?)[ \\t]*\\|', 'm'),
    new RegExp('^\\|[ \\t]*[^|\\n]*\\|[ \\t]*[^|\\n]*\\|[ \\t]*' + escaped + '[：:][ \\t]*([^|\\n]+?)[ \\t]*\\|', 'm'),
    new RegExp('^[ \\t]*[-*][ \\t]+\\*\\*' + escaped + '\\*\\*[：: \\t-]*(.+?)[ \\t]*$', 'm'),
  ];
  for (const pattern of patterns) {
    const match = visible.match(pattern);
    if (match) {
      const title = cleanTitle(match[1]);
      if (title) return title;
    }
  }
  return null;
}

function firstHeading(text) {
  if (!text) return null;
  const match = text.match(/^#[ \t]+(.+?)[ \t]*$/m);
  return cleanTitle(match && match[1] ? match[1] : '');
}

function moduleHeading(text) {
  const heading = firstHeading(text);
  return heading ? heading.replace(/\s+v?\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/, '') : null;
}

function shortModuleTitle(title) {
  if (!title) return title;
  const first = title.split(/[；。]/)[0].trim();
  const value = first || title.trim();
  return value.length > 60 ? value.slice(0, 57) + '…' : value;
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function buildEntries(list, kind, workspace, sourceRoot, titleCache) {
  return asArray(list).map(function (entry) {
    const id = entry && typeof entry.id === 'string' ? entry.id : '';
    const ref = normalizeRef(entry && entry.ref, sourceRoot);
    let title = null;
    if (id && ref) {
      const refPath = ref.split('#')[0];
      const file = path.isAbsolute(refPath) ? refPath : path.join(workspace, refPath);
      if (!titleCache.has(file)) titleCache.set(file, readText(file));
      const text = titleCache.get(file);
      title = findTitle(text, id) || (kind === 'module' ? moduleHeading(text) : null);
      if (kind === 'module') title = shortModuleTitle(title);
    }
    const base = { id: id, title: title, ref: ref };
    if (kind === 'requirement') return Object.assign({}, base, { parent_ids: asArray(entry && entry.parent_ids) });
    if (kind === 'module') return Object.assign({}, base, { requirement_ids: asArray(entry && entry.requirement_ids) });
    if (kind === 'task') {
      return Object.assign({}, base, {
        requirement_ids: asArray(entry && entry.requirement_ids),
        module_ids: asArray(entry && entry.module_ids),
        acceptance_ids: asArray(entry && entry.acceptance_ids),
        progress_ref: normalizeRef(entry && entry.progress_ref, sourceRoot),
      });
    }
    return Object.assign({}, base, {
      requirement_ids: asArray(entry && entry.requirement_ids),
      module_ids: asArray(entry && entry.module_ids),
      result_ref: normalizeRef(entry && entry.result_ref, sourceRoot),
      evidence_refs: asArray(entry && entry.evidence_refs).map(function (ref) { return normalizeRef(ref, sourceRoot); }).filter(Boolean),
    });
  });
}

function architectureDocs(workspace, docs, sourceRoot) {
  return docs.map(function (doc) {
    const file = resolveInput(workspace, doc, sourceRoot);
    const relative = slash(path.relative(workspace, file));
    const text = readText(file);
    return {
      title: firstHeading(text) || path.basename(file),
      ref: relative,
      exists: text !== null,
    };
  });
}

// In takeover mode a reference is an explicitly selected local document, not proof of current code.
function takeoverDocs(workspace, names, sourceRoot) {
  const root = fs.realpathSync(workspace);
  return names.map((name) => {
    const candidate = resolveInput(workspace, name, sourceRoot);
    const ref = slash(path.relative(workspace, candidate));
    const inside = (rel) => rel && rel !== '..' && !rel.startsWith('../') && !path.isAbsolute(rel);
    if (!inside(ref) || !/\.md$/i.test(ref)) throw new Error('接手资料必须是工作区内的 Markdown 文件');
    try {
      const real = fs.realpathSync(candidate);
      if (!inside(slash(path.relative(root, real)))) throw new Error('接手资料不能指向工作区外');
      const stat = fs.statSync(real);
      if (!stat.isFile() || stat.size > 1024 * 1024) throw new Error('接手资料不是普通文件或超过 1 MiB');
      return { ref, title: firstHeading(fs.readFileSync(real, 'utf8')) || path.basename(candidate), exists: true };
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      return { ref, title: path.basename(candidate), exists: false };
    }
  });
}

/** Lines that are not inside a fenced code block (```` or longer, or ~~~). */
function linesOutsideFences(text) {
  const visible = [];
  let fenceChar = null;
  let fenceLength = 0;
  for (const line of text.split(/\r?\n/)) {
    const fence = line.match(/^[ \t]*(`{3,}|~{3,})/);
    if (fence) {
      const run = fence[1];
      if (fenceChar === null) {
        fenceChar = run[0];
        fenceLength = run.length;
      } else if (run[0] === fenceChar && run.length >= fenceLength) {
        fenceChar = null;
        fenceLength = 0;
      }
      continue;
    }
    if (fenceChar === null) visible.push(line);
  }
  return visible;
}

/** Count task checkboxes outside Markdown code fences. */
export function countCheckboxes(text) {
  let done = 0;
  let total = 0;
  for (const line of linesOutsideFences(text)) {
    const match = line.match(/^[ \t]*[-*][ \t]+\[([ xX])\]/);
    if (!match) continue;
    total += 1;
    if (match[1] !== ' ') done += 1;
  }
  return { done: done, total: total };
}

function readProgress(workspace) {
  const dir = path.join(workspace, 'openspec', 'changes');
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
    return { source: null, done: null, total: null, changes: [], reason: '未启用 OpenSpec（openspec/changes 不存在）' };
  }
  const changes = fs.readdirSync(dir, { withFileTypes: true })
    .filter(function (entry) { return entry.isDirectory() && entry.name !== 'archive'; })
    .map(function (entry) { return entry.name; })
    .sort();
  const counted = [];
  let done = 0;
  let total = 0;
  for (const name of changes) {
    const file = path.join(dir, name, 'tasks.md');
    const text = readTextStrict(file);
    if (text === null) continue;
    const result = countCheckboxes(text);
    if (result.total === 0) continue;
    counted.push(name);
    done += result.done;
    total += result.total;
  }
  if (!counted.length) {
    return {
      source: 'openspec/changes',
      done: 0,
      total: 0,
      changes: [],
      reason: changes.length ? '活动变更的 tasks.md 中没有可统计的勾选项' : 'openspec/changes 下没有活动变更',
    };
  }
  return { source: 'openspec/changes', done: done, total: total, changes: counted, reason: null };
}

function validateMapping(mapping) {
  const collections = ['requirements', 'modules', 'tasks', 'acceptance'];
  const arrays = ['parent_ids', 'requirement_ids', 'module_ids', 'acceptance_ids', 'evidence_refs'];
  for (const name of collections) {
    const list = mapping[name];
    if (list === undefined) continue;
    if (!Array.isArray(list)) throw new Error('意图映射的 ' + name + ' 必须是数组');
    for (const entry of list) {
      if (!entry || typeof entry !== 'object') throw new Error('意图映射的 ' + name + ' 条目必须是对象');
      if (typeof entry.id !== 'string' || entry.id.trim() === '') throw new Error('意图映射的 ' + name + ' 条目缺少有效 id');
      if (typeof entry.ref !== 'string' || entry.ref.trim() === '') throw new Error('意图映射条目 ' + entry.id + ' 缺少有效 ref');
      for (const field of arrays) {
        if (entry[field] !== undefined && !Array.isArray(entry[field])) {
          throw new Error('意图映射条目 ' + entry.id + ' 的 ' + field + ' 必须是数组');
        }
      }
    }
  }
  if (mapping.baseline_ref !== undefined && mapping.baseline_ref !== null && typeof mapping.baseline_ref !== 'string') {
    throw new Error('意图映射的 baseline_ref 必须是字符串或 null');
  }
  if (mapping.source_revision !== undefined && mapping.source_revision !== null && typeof mapping.source_revision !== 'string') {
    throw new Error('意图映射的 source_revision 必须是字符串或 null');
  }
}

export function buildBoard(options) {
  const workspace = path.resolve(options.workspace || process.cwd());
  const intentPath = options.intent
    ? resolveInput(workspace, options.intent, options.sourceRoot)
    : INTENT_CANDIDATES.map(function (candidate) { return path.join(workspace, candidate); }).find(function (candidate) { return fs.existsSync(candidate); });
  const hasIntent = Boolean(intentPath && fs.existsSync(intentPath));
  if (!hasIntent && (!options.takeover || options.intent)) {
    throw new Error('找不到 intent-view-links.json；用 --intent 指定路径，或用 --takeover 查看接手资料');
  }
  if (!options.takeover && options.targetDocs?.length) throw new Error('--target-doc 仅用于 --takeover');
  let mapping = { format: 'intent-links-v1' };
  if (hasIntent) {
    const raw = readText(intentPath);
    if (raw === null) throw new Error('无法读取意图映射：' + intentPath);
    try {
      mapping = JSON.parse(raw);
    } catch (error) {
      throw new Error('意图映射不是合法 JSON：' + error.message);
    }
    if (!mapping || mapping.format !== 'intent-links-v1') {
      throw new Error('不支持的意图映射格式：' + String(mapping && mapping.format));
    }
    validateMapping(mapping);
  }
  const intentRel = hasIntent ? slash(path.relative(workspace, intentPath)) : null;
  const sourceRoot = options.sourceRoot !== undefined
    ? slash(options.sourceRoot).replace(/\/+$/, '')
    : intentRel?.startsWith('source/') ? 'source' : '';

  const titleCache = new Map();
  const sources = intentRel ? [intentRel] : [];
  const observed = options.takeover ? takeoverDocs(workspace, options.architectureDocs || [], sourceRoot) : [];
  const target = options.takeover ? takeoverDocs(workspace, options.targetDocs || [], sourceRoot) : [];
  const architecture = options.takeover ? [...observed, ...target] : architectureDocs(workspace, options.architectureDocs || [], sourceRoot);
  if (options.takeover && observed.some(doc => target.some(candidate => candidate.ref === doc.ref))) {
    throw new Error('同一资料不能同时作为现状和目标；请分别指定');
  }
  let projection;
  if (options.architectureGraph && !hasIntent) {
    projection = { note: '缺少意图索引，目标主干图未绑定。只显示显式提供的资料，不能推断当前实现。' };
  } else if (options.architectureGraph) {
    const file = resolveInput(workspace, options.architectureGraph, sourceRoot);
    projection = readArchitectureGraph({ workspace, file, intentPath, sourceRoot, mapping });
    if (options.takeover && projection.item && observed.some(doc => doc.ref === projection.item.ref)) {
      throw new Error('接手时现状资料不能作为目标主干图，请分开指定');
    }
    if (projection.item && !architecture.some(item => item.ref === projection.item.ref)) architecture.push(projection.item);
    if (options.takeover && projection.item && !target.some(item => item.ref === projection.item.ref)) target.push(projection.item);
  }
  for (const doc of architecture) sources.push(doc.ref);

  return {
    format: FORMAT,
    sources: sources,
    intent: { ref: intentRel, source_revision: mapping.source_revision || null, baseline_ref: normalizeRef(mapping.baseline_ref, sourceRoot) },
    requirements: buildEntries(mapping.requirements, 'requirement', workspace, sourceRoot, titleCache),
    architecture: {
      kind: projection?.graph ? 'graph' : architecture.length ? 'documents' : 'none',
      items: architecture,
      ...(projection?.graph ? { graph: projection.graph } : {}),
      ...(options.takeover ? { takeover: { observed, target, missingIntent: !hasIntent } } : {}),
      note: projection?.note || (!hasIntent ? '未提供意图索引：需求及验收未知。现状与目标分别列出，不从文档存在推断实现。' : null) || (projection?.graph ? '架构图来自显式绑定的推演文档。任务、证据与验收独立，图不判断门禁。' : architecture.length
        ? '没有结构化项目架构模型；以下为参考文档，其中可能包含方法说明而非本项目的组件与依赖。'
        : '没有提供架构文档；重新生成时可用 --architecture-doc 指定。'),
    },
    modules: buildEntries(mapping.modules, 'module', workspace, sourceRoot, titleCache),
    tasks: {
      items: buildEntries(mapping.tasks, 'task', workspace, sourceRoot, titleCache),
      progress: readProgress(workspace),
    },
    acceptance: buildEntries(mapping.acceptance, 'acceptance', workspace, sourceRoot, titleCache),
  };
}

function parseArgs(argv) {
  const options = { architectureDocs: [], targetDocs: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--write') options.write = true;
    else if (arg === '--html') options.html = true;
    else if (arg === '--takeover') options.takeover = true;
    else if (arg === '--help' || arg === '-h') options.help = true;
    else if (arg === '--workspace' || arg === '--intent' || arg === '--source-root' || arg === '--architecture-doc' || arg === '--architecture-graph' || arg === '--target-doc') {
      const value = argv[index + 1];
      if (value === undefined) throw new Error(arg + ' 需要一个值');
      index += 1;
      if (arg === '--workspace') options.workspace = value;
      else if (arg === '--intent') options.intent = value;
      else if (arg === '--source-root') options.sourceRoot = value;
      else if (arg === '--architecture-graph') {
        if (options.architectureGraph) throw new Error('--architecture-graph 只能指定一份架构文档');
        options.architectureGraph = value;
      } else if (arg === '--target-doc') options.targetDocs.push(value);
      else options.architectureDocs.push(value);
    } else {
      throw new Error('未知参数：' + arg);
    }
  }
  return options;
}

// Export only the fixed generated-view path; never follow a symlink or touch source records.
function writeHtml(workspace, html) {
  const dir = path.join(workspace, '.forgeflow');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir);
  if (!fs.lstatSync(dir).isDirectory()) throw new Error('HTML 导出要求 .forgeflow 是普通目录');
  const file = path.join(workspace, HTML_OUTPUT);
  const state = fs.lstatSync(file, { throwIfNoEntry: false });
  if (state && !state.isFile()) throw new Error('HTML 导出目标必须是普通文件');
  const text = html + '\n';
  if (state && readText(file) === text) return '架构看板未变化：' + HTML_OUTPUT;
  const transfer = fs.mkdtempSync(path.join(dir, '.ff-board-'));
  const next = path.join(transfer, 'view.html');
  try {
    fs.writeFileSync(next, text, { encoding: 'utf8', flag: 'wx' });
    fs.renameSync(next, file);
  } finally {
    if (fs.existsSync(next)) fs.unlinkSync(next);
    fs.rmdirSync(transfer);
  }
  return '架构看板已写入：' + HTML_OUTPUT;
}

export function main(argv) {
  const args = argv || process.argv.slice(2);
  let options;
  try {
    options = parseArgs(args);
  } catch (error) {
    console.error('board: ' + error.message);
    return 1;
  }
  if (options.help) {
    console.log('用法：generate-board.mjs [--workspace DIR] [--intent FILE] [--source-root DIR] [--architecture-doc FILE]... [--architecture-graph FILE] [--takeover [--target-doc FILE]...] [--html] [--write]');
    return 0;
  }
  try {
    const board = buildBoard(options);
    const workspace = path.resolve(options.workspace || process.cwd());
    if (options.html) {
      const html = renderArchitectureHtml(board);
      if (!options.write) process.stdout.write(html + '\n');
      else console.log(writeHtml(workspace, html));
      return 0;
    }
    const progress = board.tasks.progress;
    const summary = '需求 ' + board.requirements.length + ' / 模块 ' + board.modules.length + ' / 任务 ' + board.tasks.items.length;
    const progressText = progress.total === null ? '进度未知（' + progress.reason + '）' : '勾选 ' + progress.done + '/' + progress.total;
    if (!options.write) {
      console.log(JSON.stringify(board, null, 2));
      return 0;
    }
    const file = path.join(workspace, DEFAULT_OUTPUT);
    const text = JSON.stringify(board, null, 2) + '\n';
    const previous = readText(file);
    if (previous === text) {
      console.log('看板快照未变化：' + slash(path.relative(workspace, file)) + '（' + summary + '；' + progressText + '）');
      return 0;
    }
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, text, 'utf8');
    console.log('看板快照已写入：' + slash(path.relative(workspace, file)) + '（' + summary + '；' + progressText + '）');
    return 0;
  } catch (error) {
    console.error('board: ' + error.message);
    return 1;
  }
}

const invoked = process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (invoked) process.exitCode = main();
