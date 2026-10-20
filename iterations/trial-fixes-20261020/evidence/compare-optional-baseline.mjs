import fs from 'node:fs';import path from 'node:path';import{spawnSync}from'node:child_process';import{createHash}from'node:crypto';
const root=process.cwd(),out=path.join(root,'baseline-optional-comparison');fs.mkdirSync(out);
const builder=path.join(root,'baseline-main-build');const oldScript=path.join(root,'candidate-final-code-2/validation/optional-methods/test_optional_cli.py');
const raw=spawnSync('git',['show','3d664f963d62bf05a0587265a6f6b92116370c7b:validation/optional-methods/test_optional_cli.py'],{cwd:path.join(root,'forgeflow'),maxBuffer:1024*1024});if(raw.status!==0)throw Error(raw.stderr.toString());
const sha=b=>createHash('sha256').update(b).digest('hex');if(sha(raw.stdout)!==sha(fs.readFileSync(oldScript)))throw Error('Comparison must use byte-identical original main harness');
const env={...process.env,TEMP:path.join(root,'tmp'),TMP:path.join(root,'tmp'),OPENSPEC_TELEMETRY:'0',DO_NOT_TRACK:'1',npm_config_audit:'false',npm_config_fund:'false'};delete env.NODE_V8_COVERAGE;
function run(label,command,args,cwd){const stdout=fs.openSync(path.join(out,label+'.stdout.log'),'w'),stderr=fs.openSync(path.join(out,label+'.stderr.log'),'w');const r=spawnSync(command,args,{cwd,env,stdio:['ignore',stdout,stderr],timeout:300000});fs.closeSync(stdout);fs.closeSync(stderr);return{status:r.status,error:r.error?.message};}
const build=run('build',process.execPath,['build.mjs'],builder);
let test;if(build.status===0){env.FF_CLI=path.join(builder,'ff-spec.mjs');test=run('original-harness','python',['-X','utf8',oldScript,path.join(root,'_verification/optional-original-main')],root);}
const current=JSON.parse(fs.readFileSync(path.join(root,'_verification/optional-final-2/checks.json')));
const baseline=fs.existsSync(path.join(root,'_verification/optional-original-main/checks.json'))?JSON.parse(fs.readFileSync(path.join(root,'_verification/optional-original-main/checks.json'))):[];
const oldFailed=baseline.filter(x=>!x.passed).map(x=>x.name),newFailed=current.filter(x=>!x.passed).map(x=>x.name);
fs.writeFileSync(path.join(out,'result.json'),JSON.stringify({baselineCommit:'3d664f963d62bf05a0587265a6f6b92116370c7b',originalHarnessSha256:sha(raw.stdout),node:process.version,platform:process.platform,build,test,baselineChecks:baseline.length,baselineFailed:oldFailed,candidateChecks:current.length,candidateFailed:newFailed,sameFailures:JSON.stringify(oldFailed)===JSON.stringify(newFailed),scope:'same original harness, same Node/Windows environment; no assertions relaxed'},null,2)+'\n');
