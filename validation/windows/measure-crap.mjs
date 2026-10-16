// Actual ESLint CC + actual V8 range coverage; no simulated coverage.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
const [repo, coverageDir, dependencyRoot, output] = process.argv.slice(2).map(p => path.resolve(p));
const req = createRequire(path.join(dependencyRoot, 'package.json'));
const { Linter } = req('eslint');
const rule = req('eslint/use-at-your-own-risk').builtinRules.get('complexity');
const hash = value => createHash('sha256').update(value).digest('hex');
const rawFiles = fs.readdirSync(coverageDir).filter(n => n.endsWith('.json'));
const observations = rawFiles.flatMap(n => JSON.parse(fs.readFileSync(path.join(coverageDir,n))).result || []);
function astFunctions(source){
 const found=[];const diagnostics=new Linter().verify(source,[{languageOptions:{ecmaVersion:2022,sourceType:'module'},plugins:{m:{rules:{c:{meta:rule.meta,create(context){return rule.create({sourceCode:context.sourceCode,options:[0],report({node,data}){
 const isMethod=node.parent?.type==='MethodDefinition';const range=isMethod?node.parent.range:node.range;
 found.push({name:node.id?.name??(isMethod?node.parent.key?.name:undefined)??(node.parent?.type==='VariableDeclarator'?node.parent.id?.name:undefined)??`<anonymous@${node.loc.start.line}:${node.loc.start.column+1}>`,start:range[0],end:range[1],astFunctionStart:node.range[0],line:node.loc.start.line,complexity:Number(data.complexity),kind:isMethod?'method':'function'});
 }})}}}}},rules:{'m/c':['warn',0]}}]);if(diagnostics.length)throw Error(JSON.stringify(diagnostics));return found.sort((a,b)=>a.start-b.start);
}
function effectiveCount(ranges,start,end){const covering=ranges.filter(r=>r.startOffset<=start&&r.endOffset>=end).sort((a,b)=>(a.endOffset-a.startOffset)-(b.endOffset-b.startOffset));return covering[0]?.count??0;}
function observedCoverage(fn,samples){if(!samples.length)return;const boundaries=new Set([fn.start,fn.end]);for(const s of samples)for(const r of s.ranges){boundaries.add(Math.max(fn.start,r.startOffset));boundaries.add(Math.min(fn.end,r.endOffset));}const points=[...boundaries].filter(n=>n>=fn.start&&n<=fn.end).sort((a,b)=>a-b);let coveredBytes=0,coveredBlocks=0;for(let i=0;i<points.length-1;i++){const a=points[i],b=points[i+1];if(samples.some(s=>effectiveCount(s.ranges,a,b)>0)){coveredBytes+=b-a;coveredBlocks++;}}const blocks=Math.max(1,points.length-1);const byteCoverage=coveredBytes/(fn.end-fn.start),blockCoverage=coveredBlocks/blocks;return {byteCoverage,blockCoverage,coverage:Math.min(byteCoverage,blockCoverage),coveredBytes,totalBytes:fn.end-fn.start,coveredBlocks,blocks,samples:samples.length,preciseBlockCoverage:samples.every(s=>s.isBlockCoverage)};}

const names = ['tools/openspec/build.mjs', 'bin/ff-install.mjs', 'bin/payload.mjs', 'installer.mjs', ...['files', 'source', 'runtime', 'transaction', 'install'].map(n => `tools/installer/${n}.mjs`)];
const files = names.map(name => {
  const file = path.join(repo, name);
  const source = fs.readFileSync(file, 'utf8');
  const sha256 = hash(source);
  const samples = observations.filter(item => {
    try {
      const observed = fileURLToPath(item.url);
      return hash(fs.readFileSync(observed)) === sha256 && item.functions.some(f => f.ranges[0].startOffset === 0 && f.ranges[0].endOffset === source.length);
    } catch { return false; }
  });
  const functions = astFunctions(source).map(fn => {
    const matches = samples.flatMap(s => s.functions).filter(f => f.ranges[0]?.startOffset === fn.start && f.ranges[0]?.endOffset === fn.end);
    const coverage = observedCoverage(fn, matches);
    if (!coverage) return {...fn, status: 'NOT_MEASURED'};
    const crap = fn.complexity ** 2 * (1 - coverage.coverage) ** 3 + fn.complexity;
    return {...fn, ...coverage, crap, hardGate: crap <= 50 ? 'PASS' : 'FAIL', target: crap <= 10 ? 'PASS' : 'ABOVE_TARGET', status: 'MEASURED'};
  });
  return {file: name, sha256, functions};
});
const functions = files.flatMap(f => f.functions);
const report = { version: '0.6.0-experimental.7', method: {
 complexity: 'ESLint classic complexity rule against real AST; includes nested functions',
 coverage: 'Actual V8 range observations; exact offsets and identical current source hash; union executions with most-specific ranges; conservative minimum of byte and range-segment coverage',
 formula: 'CC^2 * (1 - coverage)^3 + CC',
 limitations: 'V8 ranges are not Istanbul statement/branch coverage. Raw V8 files retained privately; public report contains hashes only. Full runtime build integration is tested separately; coverage does not claim Windows or host invocation.'
}, evidence: rawFiles.map(n => ({file: n, sha256: hash(fs.readFileSync(path.join(coverageDir,n)))})), files,
 summary: { functions: functions.length, unmeasured: functions.filter(f => f.status !== 'MEASURED').length,
 hardFailures: functions.filter(f => f.crap > 50), aboveTarget: functions.filter(f => f.crap > 10).map(f => ({ name: f.name, line: f.line, crap: f.crap })), maximumCrap: Math.max(...functions.map(f => f.crap || 0)) }};
fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report.summary, null, 2));
