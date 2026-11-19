import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import {renderArchitectureHtml} from '../render-architecture.mjs';
const fixture = () => ({intent:{source_revision:'abc'},requirements:[{id:'R1',title:'人工审核',ref:'req.md#R1'}],tasks:{progress:{done:8,total:8}},acceptance:[{id:'A1',requirement_ids:['R1'],ref:'accept.md',result_ref:'result.md',evidence_refs:['proof.txt']}],architecture:{kind:'graph',items:[{ref:'arch.md'}],graph:{goal:'稽查',design:'confirmed',nodes:[{id:'a',label:'输入',stage:'输入',ref:'arch.md#a',requirement_ids:['R1']},{id:'b',label:'审核',stage:'审核',required:true}],edges:[{from:'a',to:'b',kind:'flow',label:'候选清单'}],path:['a','b'],gaps:[{label:'缺真实模型证据',ref:'evidence.md',required:true}]}}});
const payload = html => JSON.parse(html.match(/<script id="ff-data" type="application\/json">([\s\S]*?)<\/script>/)[1]);
const script = html => html.split('<script>')[1].split('</script>')[0];
test('renders graph and explicit design path without readiness inference',()=>{const h=renderArchitectureHtml(fixture()), d=payload(h);assert.equal(d.graph.nodes.length,2);assert.deepEqual(d.path,['a','b']);assert.equal(d.graph.edges[0].contract,'流程：候选清单');assert.match(h,/业务验收未判定/);assert.doesNotMatch(h,/骨架已贯通|可以开始写代码|已实现|WALKING_SKELETON_READY|DATA\.skeleton/);});
test('fixed FF gaps include required status and source outside collapsible lanes',()=>{const h=renderArchitectureHtml(fixture());assert.match(h,/FF 必需缺口：1 项/);assert.ok(h.indexOf('缺真实模型证据')<h.indexOf('<div class="main">'));assert.match(h,/evidence\.md/);});
test('task completion does not promote evidence or design',()=>{const f=fixture();f.architecture.graph.design='proposed';const h=renderArchitectureHtml(f);assert.equal(payload(h).graph.nodes[0].status,'hole');assert.match(h,/任务勾选 8\/8（工作区活动变更，不是本图验收结果）/);assert.match(h,/源文档未确认/);});
test('inspection retains requirement titles and acceptance sources without verdict',()=>{const d=payload(renderArchitectureHtml(fixture()));assert.deepEqual(d.graph.nodes[0].requirements,[{id:'R1',title:'人工审核',ref:'req.md#R1'}]);assert.equal(d.graph.nodes[0].acceptance[0].result_ref,'result.md');assert.deepEqual(d.graph.nodes[0].acceptance[0].evidence_refs,['proof.txt']);});
test('document-only and absent graph remain honest empty views',()=>{for(const kind of ['documents','none']){const h=renderArchitectureHtml({architecture:{kind,items:[{ref:'arch.md'}]}});assert.deepEqual(payload(h).graph.nodes,[]);assert.match(h,/未提供结构化设计图/);assert.match(h,/任务进度未知/);assert.match(h,/FF 必需缺口未知/);}});
test('untrusted strings are inert including closing scripts and replacement tokens',()=>{const f=fixture();f.architecture.graph.goal='</script><script>alert(1)</script>$&';f.architecture.graph.gaps[0].label='<img src=x onerror=alert(1)>$&';const h=renderArchitectureHtml(f);assert.equal((h.match(/<script>/g)||[]).length,1);assert.ok(h.includes('&lt;img'));assert.equal(payload(h).seed,f.architecture.graph.goal);assert.doesNotMatch(h,/__FF_SUMMARY__|__FF_DATA__|__FF_TITLE__/);});
test('readonly template contains no command-copy mutation transport',()=>{const h=renderArchitectureHtml(fixture());assert.doesNotMatch(h,/arch_cli|\.arch\/|commandsFor|data-copy|navigator\.clipboard|fetch\(|XMLHttpRequest|WebSocket/);assert.match(h,/data-fold-lane/);assert.match(h,/data-goto/);});
test('render is deterministic and leaves source object unchanged',()=>{const f=fixture(), before=JSON.stringify(f);assert.equal(renderArchitectureHtml(f),renderArchitectureHtml(f));assert.equal(JSON.stringify(f),before);});
test('generated JavaScript parses',()=>{new vm.Script(script(renderArchitectureHtml(fixture())));});
test('MIT attribution and source pin are distributed with template',()=>{const h=renderArchitectureHtml(fixture());assert.match(h,/Copyright \(c\) 2026 tobiichieigetsu/);assert.match(h,/e2ebc241d0528e93664c5345fd4bbe2cad821fe2/);assert.match(fs.readFileSync(new URL('../ARCH-GROWER-LICENSE.txt',import.meta.url),'utf8'),/MIT License/);});
test('phase fold handler hides and restores only local cards, never FF blockers',()=>{const js=script(renderArchitectureHtml(fixture()));const block=js.slice(js.indexOf("      const fold = ev.target.closest('[data-fold-lane]');"),js.indexOf("      const exp = ev.target.closest('[data-expand]');"));let folded=false, expanded=true, draws=0;const lane={classList:{toggle:()=>folded=!folded},contains:()=>false};const button={closest:()=>lane,setAttribute:(k,v)=>expanded=v,textContent:''};const context={ev:{target:{closest:()=>button}},state:{sel:null},scheduleDraw:()=>draws++,select:()=>assert.fail('unexpected selection mutation')};vm.runInNewContext('(function(){'+block+'})()',context);assert.equal(expanded,'false');assert.equal(button.textContent,'展开阶段');vm.runInNewContext('(function(){'+block+'})()',context);assert.equal(expanded,'true');assert.equal(draws,2);assert.doesNotMatch(block,/ff-blockers|DATA\.|G\./);});
test('graph node ID never implicitly matches module ID for evidence',()=>{const f=fixture();f.acceptance.push({id:'WRONG',module_ids:['b'],ref:'wrong.md'});const d=payload(renderArchitectureHtml(f));assert.equal(d.graph.nodes[1].acceptance.length,0);});
test('original goal and confirmation provenance remain fixed and distinct from display title',()=>{const f=fixture();f.architecture.graph.goal_id='R1';f.architecture.graph.confirmation_ref='decision.md#confirmed';const h=renderArchitectureHtml(f);const fixed=h.slice(h.indexOf('<section id="ff-blockers"'),h.indexOf('<div class="main">'));assert.match(fixed,/R1 人工审核/);assert.match(fixed,/req.md#R1/);assert.match(fixed,/decision.md#confirmed/);});

test('payload text resembling template placeholders does not consume a template token', ()=>{
  const f=fixture(); f.architecture.graph.goal='__FF_DATA__ __FF_SUMMARY__';
  const html=renderArchitectureHtml(f);
  assert.equal(payload(html).seed,f.architecture.graph.goal);
  assert.match(html, /id="ff-blockers"/);
  assert.match(html, /FF 必需缺口：1 项/);
});

test('takeover without a model presents distinct observed and target sources, never an invented graph', () => {
  const architecture={kind:'documents',items:[],takeover:{observed:[{ref:'docs/as-is.md'}],target:[{ref:'docs/to-be.md'}],missingIntent:true}};
  const html=renderArchitectureHtml({architecture,tasks:{progress:{done:2,total:2}}});
  assert.match(html,/没有意图索引，需求及验收未知/);
  assert.match(html,/现状资料：<\/strong><code>docs\/as-is\.md/);
  assert.match(html,/目标资料：<\/strong><code>docs\/to-be\.md/);
  assert.deepEqual(payload(html).graph.nodes,[]);
});
