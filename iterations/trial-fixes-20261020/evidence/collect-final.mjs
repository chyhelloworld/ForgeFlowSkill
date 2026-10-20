import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
const root=path.resolve('.');
const suffix=process.argv[2]??'';if(!/^(?:-\d+)?$/.test(suffix))throw Error('Invalid collection suffix');
const output=path.join(root,'final-validation'+suffix);fs.mkdirSync(output);
const coverageDir=path.join(root,'coverage-final'+suffix);fs.mkdirSync(coverageDir);
const source=path.join(root,'candidate-final-code'+suffix);
const builder=path.join(root,'build-source-final'+suffix);
const powershellBuilder=path.join(root,'build-source-ps-final'+suffix);
const freezeFile='coverage-freeze-final'+suffix+'.json';
const targets=['installer.mjs','tools/installer/install.mjs','tools/installer/runtime.mjs','tools/openspec/build.mjs','tools/openspec/ff-build.mjs','tools/openspec/ff-receipt.mjs','tools/openspec/ff-spec.mjs','tools/openspec/.build/dist/core/ff-validity.js','tools/openspec/.build/dist/core/archive.js','tools/openspec/.build/dist/commands/validate.js'];
const hash=file=>createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const frozen=targets.map(name=>{
  const primary=path.join(root,'forgeflow',name);const sha256=hash(primary);const paths=[primary];
  const exported=path.join(source,name);if(fs.existsSync(exported)){if(hash(exported)!==sha256)throw Error('Export differs: '+name);paths.push(exported);}
  if(name.startsWith('tools/openspec/')&&!name.includes('/.build/')){const file=path.join(builder,path.basename(name));if(fs.existsSync(file)){if(hash(file)!==sha256)throw Error('Builder differs: '+name);paths.push(file);}}
  if(name.startsWith('tools/openspec/')&&!name.includes('/.build/')){const file=path.join(powershellBuilder,path.basename(name));if(fs.existsSync(file)){if(hash(file)!==sha256)throw Error('PowerShell builder differs: '+name);paths.push(file);}}
  return{name,sha256,paths};
});
const freeze={startedAt:new Date().toISOString(),coverageDir,targets:frozen,completed:false};
fs.writeFileSync(freezeFile,JSON.stringify(freeze,null,2)+'\n');
const env={...process.env,FF_TEST_ROOT:path.join(root,'tmp'),TEMP:path.join(root,'tmp'),TMP:path.join(root,'tmp'),NODE_V8_COVERAGE:coverageDir,OPENSPEC_TELEMETRY:'0',DO_NOT_TRACK:'1',npm_config_audit:'false',npm_config_fund:'false',npm_config_cache:path.join(root,'tmp/npm-cache-final')};
const results=[];
function run(label,command,args,cwd=root,extra={},dependency){
  if(dependency&&results.find(r=>r.label===dependency)?.status!==0){results.push({label,status:'NOT_RUN',reason:'dependency failed: '+dependency});save();return;}
  save(label);
  const stdout=fs.openSync(path.join(output,label+'.stdout.log'),'w'),stderr=fs.openSync(path.join(output,label+'.stderr.log'),'w');
  const start=Date.now();const result=spawnSync(command,args,{cwd,env:{...env,...extra},stdio:['ignore',stdout,stderr],shell:false,timeout:900000});fs.closeSync(stdout);fs.closeSync(stderr);
  results.push({label,status:result.status,signal:result.signal,error:result.error?.message,elapsedMs:Date.now()-start});save();
}
function save(running=null){fs.writeFileSync(path.join(output,'status.json'),JSON.stringify({running,results,updatedAt:new Date().toISOString()},null,2)+'\n');}
try{
  run('gitbash-locked-build','C:/Program Files/Git/bin/bash.exe',['--noprofile','--norc','-c','node build.mjs'],builder);
  run('powershell-locked-build','powershell.exe',['-NoProfile','-Command','node build.mjs'],powershellBuilder);
  run('trial',process.execPath,['--test',path.join(root,'forgeflow/tools/openspec/trial.test.mjs')]);
  const tests=fs.readdirSync(path.join(source,'tools/installer/tests')).filter(n=>n.endsWith('.test.mjs')).map(n=>path.join(source,'tools/installer/tests',n));
  run('installer',process.execPath,['--test',...tests],source);
  run('native-dual',process.execPath,[path.join(source,'tools/installer/tests/native-windows.mjs'),path.join(root,'baseline-clean'),path.join(root,'_verification/dual-native-final'+suffix)],source,{FF_REUSE_BUILD:builder},'gitbash-locked-build');
  run('native-trial',process.execPath,[path.join(source,'tools/installer/tests/trial-native.mjs'),builder,path.join(root,'_verification/trial-native-final'+suffix)],source,{},'gitbash-locked-build');
  run('optional-cli','python',['-X','utf8',path.join(source,'validation/optional-methods/test_optional_cli.py'),path.join(root,'_verification/optional-final'+suffix)],source,{FF_CLI:path.join(root,'forgeflow/tools/openspec/ff-spec.mjs')});
  run('package-static','python',['-X','utf8','tools/validate_package.py','.'],source);
  run('package-mutation','python',['-X','utf8','tools/test_validate_package.py','.'],source);
}finally{
  freeze.finishedAt=new Date().toISOString();freeze.completed=true;freeze.unchanged=frozen.every(t=>t.paths.every(p=>hash(p)===t.sha256));
  fs.writeFileSync(freezeFile,JSON.stringify(freeze,null,2)+'\n');save();
}
