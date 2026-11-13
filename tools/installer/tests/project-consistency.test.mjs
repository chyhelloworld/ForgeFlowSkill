// Static distribution/contract tests, not proof of native model compliance.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { skillPayload } from '../source.mjs';
import { hostBase } from '../state.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const read = p => fs.readFileSync(path.join(root,p),'utf8');
const skills = ['ff-design','ff-architecture-derive','ff-implement','ff-review'];
const contract = read('docs/maintainers/PROJECT-CONSISTENCY.md');
const anchors = ['动手前','样式与组件','配置与常量','模块复用','重复逻辑','旧实现退役','现行文档同步','不宣称全仓不存在','不把所有字面量配置化','不为消灭重复提前抽象','不能自动按代码改需求','不增加阶段、门禁、六份报告或默认全仓扫描'];
function validate(s) {for (const a of anchors) assert.ok(s.includes(a),a);}
test('six constraints apply before/during execution with small-task boundaries',()=>validate(contract));
test('each design/implementation/review entry resolves its own consistent reference',()=>{
 for(const skill of skills){
 assert.ok(read(`skills/${skill}/SKILL.md`).includes('references/project-consistency.md'));
 assert.ok(read(`skills/${skill}/SKILL.md`).includes('新增、修改、修复或替换'));
 assert.equal(read(`skills/${skill}/references/project-consistency.md`),contract);
 }
 for(const rel of ['ff-implement/references/full-workflow.md','ff-review/references/reviews.md','ff-architecture-derive/references/architecture-derivation.md']) assert.ok(read('skills/'+rel).includes('(project-consistency.md)'));
});
test('all host payloads preserve executable entry references and contract',()=>{
 for(const host of ['codex','claude','dsh']){
 const payload=skillPayload(root,{version:'fixture',hash:'a'.repeat(64)},host);
 for(const skill of skills){const base=`${hostBase(host)}/${skill}/`;assert.ok(payload[base+'SKILL.md'].toString().includes('references/project-consistency.md'));assert.equal(payload[base+'references/project-consistency.md'].toString(),contract);}
 }
});
test('removed category or safety boundary is caught by the content check',()=>{
 for(const a of anchors) assert.throws(()=>validate(contract.replaceAll(a,'')));
});
test('seven contrasting cases are evaluable without keyword-only behavioral claims',()=>{
 const cases=JSON.parse(read('evaluations/scenarios.json')).cases.filter(c=>c.id.startsWith('CONS-'));
 assert.equal(cases.length,7);assert.equal(new Set(cases.map(c=>c.id)).size,7);
 for(const c of cases){assert.equal(c.criteria.length,3);assert.ok(c.critical_failures.length);assert.ok(c.prompt.length>20);}
});
