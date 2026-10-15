#!/usr/bin/env node
import { tmpdir } from 'node:os';
// Filter actual raw V8 observations to frozen, measured source files and exact function ranges.
// No count or range is added, changed or inferred. Copy origin is attested by current source bytes.
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {createHash} from 'node:crypto';
const fixtureRoot=path.resolve(process.env.FF_MEASURE_FIXTURE_ROOT || path.join(tmpdir(),'ff-rc3-measure-fixtures'));
function isFixturePath(file){const relative=path.relative(fixtureRoot,file);return relative!=='' && relative!=='..' && !relative.startsWith('..'+path.sep) && !path.isAbsolute(relative);}
const repo=path.resolve(process.argv[2]),rawDir=path.resolve(process.argv[3]),reportPath=path.resolve(process.argv[4]),out=path.resolve(process.argv[5]);
const report=JSON.parse(fs.readFileSync(reportPath));const hash=x=>createHash('sha256').update(x).digest('hex');
const auxiliary=[['tools/openspec/.build/dist/core/ff-validity.js','All legacy FF validity functions retained for separate core measurement',true],['tools/openspec/.build/dist/core/ff-close.js','All legacy FF closure functions retained for separate core measurement',true],['tools/openspec/.build/dist/core/archive.js','Legacy beforeFFMutation plus module envelope retained for separate core measurement',false],['tools/openspec/ff-snapshot.mjs','All legacy FF snapshot helper functions retained for separate core measurement',true]].map(([file,scope,retainAllFunctions])=>{const source=fs.readFileSync(path.join(repo,file),'utf8');return {file,scope,sha256:hash(source),sourceLength:source.length,retainAllFunctions,retainFunctionNames:retainAllFunctions?[]:['beforeFFMutation'],functions:[]};});
const sources=[...report.files,...auxiliary].map(f=>({...f,full:path.join(repo,f.file)}));for(const f of sources){if(hash(fs.readFileSync(f.full))!==f.sha256)throw Error(`Source changed since measurement: ${f.file}`);}
fs.mkdirSync(out,{recursive:true});if(fs.readdirSync(out).length)throw Error('Output directory must be empty; choose a fresh directory.');
const records=[];let rawBytes=0,retainedBytes=0;
for(const name of fs.readdirSync(rawDir).filter(n=>n.endsWith('.json')).sort()){
 const rawPath=path.join(rawDir,name),bytes=fs.readFileSync(rawPath),raw=JSON.parse(bytes),selected=[],origins=[];
 for(const script of raw.result??[]){
  let full;try{full=fileURLToPath(script.url)}catch{continue}
  let source=sources.find(f=>f.full===full),origin='repository-frozen-source';
  if(!source&&isFixturePath(full)){let sha;try{sha=hash(fs.readFileSync(full))}catch{continue}source=sources.find(f=>f.sha256===sha);origin='byte-identical-isolated-fixture';}
  if(!source)continue;
  const whole=script.functions.find(fn=>fn.ranges[0]?.startOffset===0&&fn.ranges[0]?.endOffset===source.sourceLength);if(!whole)continue;
  const functions=script.functions.filter(fn=>fn===whole||source.retainAllFunctions||source.retainFunctionNames?.includes(fn.functionName)||source.functions.some(m=>m.start===fn.ranges[0]?.startOffset&&m.end===fn.ranges[0]?.endOffset));
  selected.push({...script,functions});origins.push({originalUrl:script.url,url:'repo:'+source.file,sha256:source.sha256,origin,functionsRetained:functions.length});
 }
 if(!selected.length)continue;
 const subset={result:selected};const preBytes=Buffer.from(JSON.stringify(subset)+'\n');
 const normalized={result:selected.map((s,i)=>({...s,url:origins[i].url})),ffCoverageProvenance:{rawFile:name,rawSha256:hash(bytes),sourceHashes:origins.map(({originalUrl,...rest})=>rest)}};
 const normalizedBytes=Buffer.from(JSON.stringify(normalized)+'\n');fs.writeFileSync(path.join(out,name),normalizedBytes);
 rawBytes+=bytes.length;retainedBytes+=normalizedBytes.length;
 records.push({file:name,originalRawSha256:hash(bytes),preNormalizationSubsetSha256:hash(preBytes),normalizedSubsetSha256:hash(normalizedBytes),originalRawBytes:bytes.length,normalizedSubsetBytes:normalizedBytes.length,sources:origins.map(({originalUrl,...rest})=>rest)});
}
const index={generatedAt:new Date().toISOString(),method:'Retain actual V8 module envelope and exact measured function/method records only. Normalize script URLs to repo: paths. Functions, ranges, counts and isBlockCoverage retain exact captured values. Sources outside the frozen repository contribute only when byte-identical from the dedicated isolated-fixture directory; each origin is recorded. Raw hashes and pre-/post-normalization subset hashes establish provenance without publishing host paths.',buildProvenance:report.buildProvenance,limitations:'Original raw V8 files remain outside this published subset. Source hashes are checked at normalization time; V8 itself does not store source hashes. Source freeze and final-only collection are required. Whole unchanged upstream init/update/CLI functions are excluded from scope.',sources:sources.map(({file,sha256,scope})=>({file,sha256,scope})),summary:{retainedFiles:records.length,originalRawBytes:rawBytes,normalizedSubsetBytes:retainedBytes},files:records};
fs.writeFileSync(path.join(path.dirname(out),'coverage-subset-index.json'),JSON.stringify(index,null,2)+'\n');console.log(JSON.stringify(index.summary));
