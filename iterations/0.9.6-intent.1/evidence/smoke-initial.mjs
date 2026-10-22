import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';
const base='E:/github/ForgeFlowSKill/_verification/intent-loop-096';
const source=path.join(base,'candidate-reviewed');
const {install}=await import(pathToFileURL(path.join(source,'tools/installer/install.mjs')).href);
const {loadState}=await import(pathToFileURL(path.join(source,'tools/installer/state.mjs')).href);
const results=[];
for(const host of ['codex','claude']) {
  const project=fs.mkdtempSync(path.join(base,'tmp',`smoke-${host}-`));
  install(project,source,{host,mode:'skills-only'});
  const state=loadState(project);
  assert.equal(state.version,'0.9.6-intent.1');
  const skills=path.join(project,host==='codex'?'.agents/skills':'.claude/skills');
  assert.equal(fs.readdirSync(skills).length,17);
  let references=0;
  for(const name of fs.readdirSync(skills)) {
    const skill=path.join(skills,name);
    const text=fs.readFileSync(path.join(skill,'SKILL.md'),'utf8');
    assert.ok(text.includes('0.9.6-intent.1'));
    assert.ok(text.includes('node .forgeflow/ff-spec.mjs'));
    for(const m of text.matchAll(/\]\((references\/[^)#]+)(?:#[^)]*)?\)/g)) {
      assert.deepEqual(fs.readFileSync(path.join(skill,m[1])),fs.readFileSync(path.join(source,'skills',name,m[1])));
      references++;
    }
    assert.ok(fs.existsSync(path.join(skill,'references/intent-loop.md')) || fs.existsSync(path.join(skill,'references/use-feedback.md')));
  }
  const cli=spawnSync(process.execPath,[path.join(project,'.forgeflow/ff-spec.mjs'),'--help'],{cwd:project,encoding:'utf8',env:{...process.env,OPENSPEC_TELEMETRY:'0'}});
  assert.equal(cli.status,1);
  assert.match(cli.stderr,/BLOCKED: skills-only/);
  results.push({host,project,version:state.version,skills:17,references,cli:'expected BLOCKED: skills-only',status:'PASS'});
}
fs.writeFileSync(path.join(base,'smoke.json'),JSON.stringify({kind:'isolated-skills-only-distribution',results,limits:'No live installation upgrade, host model loading, full-runtime readiness or business acceptance.'},null,2)+'\n');
console.log(JSON.stringify(results,null,2));
