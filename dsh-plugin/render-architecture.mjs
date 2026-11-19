/** Read-only FF architecture projection. UI adapted from Arch-Grower (MIT).
 * No graph mutations, readiness inference, command execution or source writes.
 */
import fs from 'node:fs';
const templateUrl = new URL('./architecture-template.html', import.meta.url);
const list = value => Array.isArray(value) ? value : [];
const str = value => typeof value === 'string' ? value : '';
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeJson = value => JSON.stringify(value).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');

export function renderArchitectureHtml(board = {}) {
  const architecture = board.architecture || {};
  const graph = architecture.kind === 'graph' ? architecture.graph || {} : {};
  const reqs = list(board.requirements);
  const nodes = list(graph.nodes).map(n => {
    const ids = list(n.requirement_ids).filter(x => typeof x === 'string');
    return {
      id: str(n.id), label: str(n.label) || str(n.id), stage: str(n.stage), ref: str(n.ref),
      status: graph.design === 'confirmed' ? 'solid' : 'hole',
      spec: n.required === false ? '可选设计节点' : '必需设计节点', requirement_ids: ids,
      requirements: ids.map(id => { const r = reqs.find(x => x.id === id); return {id, title: str(r?.title), ref: str(r?.ref)}; }),
      acceptance: list(board.acceptance).filter(a => list(a.requirement_ids).some(id => ids.includes(id))).map(a => ({id:str(a.id),title:str(a.title),ref:str(a.ref),result_ref:str(a.result_ref),evidence_refs:list(a.evidence_refs).filter(x => typeof x === 'string')})),
    };
  }).filter(n => n.id);
  const known = new Set(nodes.map(n => n.id));
  const edges = list(graph.edges).filter(e => known.has(e.from) && known.has(e.to)).map(e => ({from:e.from,to:e.to,kind:e.kind,contract:[e.kind === 'dependency' ? '依赖' : '流程',str(e.label)].filter(Boolean).join('：')}));
  const progress = board.tasks?.progress;
  const taskSummary = progress && Number.isFinite(progress.done) && Number.isFinite(progress.total)
    ? `任务勾选 ${progress.done}/${progress.total}（工作区活动变更，不是本图验收结果）` : `任务进度未知${progress?.reason ? `：${progress.reason}` : ''}`;
  const gaps = list(graph.gaps);
  const required = gaps.filter(g => g.required !== false);
  const goalRequirement = reqs.find(r => r.id === graph.goal_id);
  const goal = str(graph.goal) || reqs.find(r => r.id === graph.goal_id)?.title || (architecture.takeover ? '旧项目接手 · 架构检视' : 'ForgeFlow 项目架构');
  const data = {
    seed:goal, source_revision:str(graph.source_revision) || str(board.intent?.source_revision), design:graph.design,
    graph:{nodes,edges}, path:list(graph.path).filter(id => known.has(id)), topo_order:nodes.map(n => n.id),
    next_focus:nodes.find(n => n.status === 'hole')?.id || null, documents:list(architecture.items), task_summary:taskSummary,
    empty_note:str(architecture.note) || '没有结构化项目架构模型；这里只能列出参考文档。',
  };
  const designSummary = architecture.kind !== 'graph' ? '未提供结构化设计图' : graph.design === 'confirmed' ? '源文档标注已确认' : '源文档未确认';
  const takeover = architecture.takeover;
  const sources = (label, items) => `<p><strong>${label}：</strong>${list(items).length ? list(items).map(item => `<code>${escapeHtml(item.ref)}</code>${item.exists === false ? '（文件不存在）' : ''}`).join('、') : '未知／未提供'}。</p>`;
  const oldProject = takeover ? `<p><strong>旧项目接手：</strong>${takeover.missingIntent ? '没有意图索引，需求及验收未知。' : ''}现状资料不是运行证明，目标资料不是当前实现。</p>
${sources('现状资料', takeover.observed)}${sources('目标资料', takeover.target)}` : '';
  const summary = `${oldProject}<p><strong>原始目标：</strong>${escapeHtml(goalRequirement ? `${goalRequirement.id} ${str(goalRequirement.title)}` : '未关联原始目标需求')} <code>${escapeHtml(goalRequirement?.ref || '未提供来源')}</code></p>
${graph.confirmation_ref ? `<p><strong>设计确认来源：</strong><code>${escapeHtml(graph.confirmation_ref)}</code></p>` : ''}
<p><strong>设计：</strong>${escapeHtml(designSummary)}。<strong>任务：</strong>${escapeHtml(taskSummary)}。<strong>证据：</strong>业务验收未判定。</p>
${architecture.kind === 'graph' ? `<p><strong>FF 必需缺口：${required.length} 项</strong>。折叠、搜索或隐藏卡片不会消除阻塞；零缺口也不等于验收通过。</p>` : '<p><strong>FF 必需缺口未知</strong>：没有有效的结构化图。</p>'}
${gaps.length ? `<ul>${gaps.map(g => `<li>${g.required === false ? '可选' : '必需'}：${escapeHtml(g.label)}${g.ref ? ` <code>${escapeHtml(g.ref)}</code>` : '（未提供来源）'}</li>`).join('')}</ul>` : '<p>没有列出的缺口；此处不推断全部需求完整。</p>'}`;
  const values = { TITLE: escapeHtml(goal), SUMMARY: summary, DATA: safeJson(data) };
  return fs.readFileSync(templateUrl, 'utf8').replace(/__FF_(TITLE|SUMMARY|DATA)__/g, (_, name) => values[name]);
}
