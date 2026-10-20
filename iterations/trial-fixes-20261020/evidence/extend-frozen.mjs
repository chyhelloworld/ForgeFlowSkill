import fs from 'node:fs';import path from 'node:path';import{createHash}from'node:crypto';import{spawnSync}from'node:child_process';
const file='coverage-freeze-final-2.json',original=fs.readFileSync(file),freeze=JSON.parse(original);
const hash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const unchanged=()=>freeze.targets.every(t=>t.paths.every(p=>hash(p)===t.sha256));
if(!freeze.completed||!freeze.unchanged||!unchanged())throw Error('Cannot extend changed or running source freeze');
fs.writeFileSync('coverage-freeze-before-optional-retest.json',original,{flag:'wx'});
freeze.completed=false;freeze.extraRuns=[{label:'optional-cli-portable',startedAt:new Date().toISOString(),reason:'Historical Python harness emitted Windows backslashes contrary to the existing POSIX policy contract. Only path serialization fixed; assertions unchanged.'}];
fs.writeFileSync(file,JSON.stringify(freeze,null,2)+'\n');
const out=fs.openSync('final-validation-2/optional-cli-portable.stdout.log','w'),err=fs.openSync('final-validation-2/optional-cli-portable.stderr.log','w');
try{const result=spawnSync('python',['-X','utf8',path.resolve('forgeflow/validation/optional-methods/test_optional_cli.py'),path.resolve('_verification/optional-final-portable')],{cwd:process.cwd(),env:{...process.env,FF_CLI:path.resolve('forgeflow/tools/openspec/ff-spec.mjs'),NODE_V8_COVERAGE:freeze.coverageDir,FF_TEST_ROOT:path.resolve('tmp'),TEMP:path.resolve('tmp'),TMP:path.resolve('tmp')},stdio:['ignore',out,err],timeout:180000});Object.assign(freeze.extraRuns[0],{status:result.status,error:result.error?.message,finishedAt:new Date().toISOString()});}
finally{fs.closeSync(out);fs.closeSync(err);freeze.completed=true;freeze.unchanged=unchanged();freeze.finishedAt=new Date().toISOString();fs.writeFileSync(file,JSON.stringify(freeze,null,2)+'\n');}
