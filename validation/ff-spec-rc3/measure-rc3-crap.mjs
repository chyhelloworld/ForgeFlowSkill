#!/usr/bin/env node
import { tmpdir } from 'node:os';
// Read-only rc3 measurement. Uses actual ESLint complexity and actual V8 observations.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
const fixtureRoot=path.resolve(process.env.FF_MEASURE_FIXTURE_ROOT || path.join(tmpdir(),'ff-rc3-measure-fixtures'));
function isFixturePath(file){const relative=path.relative(fixtureRoot,file);return relative!=='' && relative!=='..' && !relative.startsWith('..'+path.sep) && !path.isAbsolute(relative);}
const repo=path.resolve(process.argv[2]);
const coverageDir=path.resolve(process.argv[3]);
const output=process.argv[4];
const cutoff=Number(process.argv[5] || 0);
const root=path.join(repo,'tools/openspec');
const req=createRequire(path.join(root,'.build/package.json'));
const {Linter}=req('eslint');
const rule=req('eslint/use-at-your-own-risk').builtinRules.get('complexity');
const hash=x=>createHash('sha256').update(x).digest('hex');
const allJson=dir=>fs.existsSync(dir)?fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?allJson(path.join(dir,e.name)):e.name.endsWith('.json')?[path.join(dir,e.name)]:[]):[];
const coverageFiles=allJson(coverageDir).filter(f=>{const m=path.basename(f).match(/^coverage-\d+-(\d+)-\d+\.json$/);return !m||+m[1]>=cutoff;});
const observations=coverageFiles.flatMap(file=>{const raw=JSON.parse(fs.readFileSync(file));return (raw.result??[]).map(s=>({...s,coverageFile:file,sourceHashAttestation:raw.ffCoverageProvenance?.sourceHashes?.find(v=>v.url===s.url)?.sha256}));});
function astFunctions(source){
 const found=[];const diagnostics=new Linter().verify(source,[{languageOptions:{ecmaVersion:2022,sourceType:'module'},plugins:{m:{rules:{c:{meta:rule.meta,create(context){return rule.create({sourceCode:context.sourceCode,options:[0],report({node,data}){
 const isMethod=node.parent?.type==='MethodDefinition';const range=isMethod?node.parent.range:node.range;
 found.push({name:node.id?.name??(isMethod?node.parent.key?.name:undefined)??(node.parent?.type==='VariableDeclarator'?node.parent.id?.name:undefined)??`<anonymous@${node.loc.start.line}:${node.loc.start.column+1}>`,start:range[0],end:range[1],astFunctionStart:node.range[0],line:node.loc.start.line,complexity:Number(data.complexity),kind:isMethod?'method':'function'});
 }})}}}}},rules:{'m/c':['warn',0]}}]);if(diagnostics.length)throw Error(JSON.stringify(diagnostics));return found.sort((a,b)=>a.start-b.start);
}
function effectiveCount(ranges,start,end){const covering=ranges.filter(r=>r.startOffset<=start&&r.endOffset>=end).sort((a,b)=>(a.endOffset-a.startOffset)-(b.endOffset-b.startOffset));return covering[0]?.count??0;}
function observedCoverage(fn,samples){if(!samples.length)return;const boundaries=new Set([fn.start,fn.end]);for(const s of samples)for(const r of s.ranges){boundaries.add(Math.max(fn.start,r.startOffset));boundaries.add(Math.min(fn.end,r.endOffset));}const points=[...boundaries].filter(n=>n>=fn.start&&n<=fn.end).sort((a,b)=>a-b);let coveredBytes=0,coveredBlocks=0;for(let i=0;i<points.length-1;i++){const a=points[i],b=points[i+1];if(samples.some(s=>effectiveCount(s.ranges,a,b)>0)){coveredBytes+=b-a;coveredBlocks++;}}const blocks=Math.max(1,points.length-1);const byteCoverage=coveredBytes/(fn.end-fn.start),blockCoverage=coveredBlocks/blocks;return {byteCoverage,blockCoverage,coverage:Math.min(byteCoverage,blockCoverage),coveredBytes,totalBytes:fn.end-fn.start,coveredBlocks,blocks,samples:samples.length,preciseBlockCoverage:samples.every(s=>s.isBlockCoverage)};}
const descriptors=[
 {file:'tools/openspec/ff-build.mjs',scope:'All newly added runtime verification functions and nested functions'},
 {file:'tools/openspec/ff-spec.mjs',scope:'New launcher module; contains no functions, module coverage only'},
 {file:'tools/openspec/build.mjs',scope:'Conservative entire modified build helper, including unchanged helper functions'},
 {file:'tools/openspec/.build/dist/core/init.js',scope:'New InitCommand.execute only; old executeUpstreamDisabled and other upstream methods excluded',pick:f=>f.name==='execute'},
 {file:'tools/openspec/.build/dist/core/update.js',scope:'New UpdateCommand.execute rejection only; upstream methods excluded',pick:f=>f.name==='execute'},
 {file:'tools/openspec/.build/dist/cli/index.js',scope:'Modified getCommandPath and complete enclosing preAction callback including newly added predicate; other upstream callbacks excluded',pick:(f,source)=>f.name==='getCommandPath'||source.slice(f.start,f.end).includes('commandPathFF')},
];
const files=descriptors.map(d=>{
 const full=path.join(repo,d.file),source=fs.readFileSync(full,'utf8'),sha256=hash(source);
 let rejectedModuleLengths=0;const samples=observations.filter(s=>{
  let p;try{p=s.url.startsWith('repo:')?path.join(repo,s.url.slice(5)):fileURLToPath(s.url)}catch{return false}
  // An isolated fixture source may contribute only if byte-identical to this exact source now.
  if(p!==full){if(!isFixturePath(p))return false;try{if(hash(fs.readFileSync(p))!==sha256)return false}catch{return false}}
  if(s.sourceHashAttestation&&s.sourceHashAttestation!==sha256)throw Error(`Coverage source hash mismatch for ${d.file}`);
  const module=s.functions.find(f=>f.ranges[0]?.startOffset===0);if(!module||module.ranges[0].endOffset!==source.length){rejectedModuleLengths++;return false;}return true;
 });
 const functions=astFunctions(source).filter(f=>!d.pick||d.pick(f,source)).map(fn=>{
 const matches=samples.flatMap(s=>s.functions).filter(s=>s.ranges[0]?.startOffset===fn.start&&s.ranges[0]?.endOffset===fn.end);const cov=observedCoverage(fn,matches);if(!cov)return {...fn,status:'NOT_MEASURED',reason:'No exact-offset V8 coverage matching this function/method range',crap:null};const crap=fn.complexity**2*(1-cov.coverage)**3+fn.complexity;return {...fn,...cov,crap,hardGate:crap<=50?'PASS':'FAIL',target:crap<=10?'PASS':'ABOVE_TARGET',status:'MEASURED'};
 });
 const moduleSamples=samples.flatMap(s=>s.functions).filter(f=>f.ranges[0]?.startOffset===0&&f.ranges[0]?.endOffset===source.length);
 return {file:d.file,sha256,scope:d.scope,sourceLength:source.length,scriptSamples:samples.length,rejectedModuleLengths,functions,module:!functions.length?{status:moduleSamples.length?'OBSERVED_MODULE_NO_FUNCTION_CRAP':'NOT_MEASURED',...observedCoverage({start:0,end:source.length},moduleSamples)}:undefined};
});
const measured=files.flatMap(f=>f.functions).filter(f=>f.status==='MEASURED');
const pinBytes=fs.readFileSync(path.join(root,'upstream.json'));const pin=JSON.parse(pinBytes);const markerBytes=fs.readFileSync(path.join(root,'.build/FF-BUILD.json'));const marker=JSON.parse(markerBytes);if(marker.patchSha256!==pin.patchSha256||hash(fs.readFileSync(path.join(root,pin.patch)))!==pin.patchSha256)throw Error('Frozen build/patch provenance mismatch');for(const f of files.filter(f=>f.file.includes('/.build/'))){const rel=f.file.split('/.build/')[1];if(marker.runtimeHashes?.[rel]!==f.sha256)throw Error(`Frozen runtime marker mismatch: ${rel}`);}
const report={generatedAt:new Date().toISOString(),coverageDir,cutoffTimestampMs:cutoff,buildProvenance:{upstreamPinSha256:hash(pinBytes),buildMarkerSha256:hash(markerBytes),patchSha256:pin.patchSha256,upstreamCommit:pin.commit,adapter:pin.adapter},method:{complexity:'Actual installed ESLint classic complexity rule with zero threshold on emitted JavaScript AST. Class method ranges use the AST MethodDefinition start, matching actual V8 method ranges; their function-node complexity is unchanged.',coverage:'Union actual V8 exact function/method observations across processes; most-specific range wins. Conservative coverage=min(observed executed range-segment fraction, executed byte fraction). Full source module length must match. Files copied into dedicated fixtures contribute only if current bytes hash-identically to target source.',formula:'CRAP = CC^2 * (1 - coverage)^3 + CC. Hard <=50; aspirational <=10.',limitations:'V8 range coverage is not Istanbul statement/branch coverage. Unobserved branch boundaries cannot be inferred; non-executed optional paths are disclosed. V8 data does not contain source hashes; cutoff and build freeze provided by caller determine source provenance, with file SHA256/module length/exact offsets as checks. Top-level launcher logic has no function CRAP; module coverage reported separately. Unchanged upstream execute methods are excluded, not claimed as new FF work.'},coverageFiles:coverageFiles.map(f=>({file:f,sha256:hash(fs.readFileSync(f))})),files,summary:{measuredFunctions:measured.length,unmeasuredFunctions:files.flatMap(f=>f.functions).filter(f=>f.status==='NOT_MEASURED').length,hardFailures:measured.filter(f=>f.hardGate==='FAIL').map(f=>({name:f.name,line:f.line,complexity:f.complexity,coverage:f.coverage,crap:f.crap})),aboveTarget:measured.filter(f=>f.target==='ABOVE_TARGET').map(f=>({name:f.name,line:f.line,complexity:f.complexity,coverage:f.coverage,crap:f.crap})),maximumCrap:Math.max(...measured.map(f=>f.crap))}};
function logicalPaths(value){if(Array.isArray(value))return value.map(logicalPaths);if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,logicalPaths(v)]));if(typeof value==='string'&&path.isAbsolute(value)){const rel=path.relative(repo,value);return rel.startsWith('..')?'external-evidence/'+path.basename(value):rel.split(path.sep).join('/');}return value;}
if(output)fs.writeFileSync(output,JSON.stringify(logicalPaths(report),null,2)+'\n');console.log(JSON.stringify({summary:report.summary,files:files.map(f=>({file:f.file,module:f.module,scriptSamples:f.scriptSamples,rejectedModuleLengths:f.rejectedModuleLengths,functions:f.functions.map(g=>({name:g.name,line:g.line,cc:g.complexity,cov:g.coverage,crap:g.crap,status:g.status}))}))},null,2));
