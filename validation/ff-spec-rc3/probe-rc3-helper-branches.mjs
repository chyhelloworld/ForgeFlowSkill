import { tmpdir } from 'node:os';
import fs from 'node:fs';import path from 'node:path';import {pathToFileURL} from 'node:url';import {createHash} from 'node:crypto';import {spawnSync} from 'node:child_process';import assert from 'node:assert/strict';
const fixtureRoot=path.resolve(process.env.FF_MEASURE_FIXTURE_ROOT || path.join(tmpdir(),'ff-rc3-measure-fixtures'));
const source=process.argv[2],home=path.join(fixtureRoot,'helper');fs.mkdirSync(home,{recursive:true});for(const n of ['ff-build.mjs','ff-spec.mjs'])fs.copyFileSync(path.join(source,n),path.join(home,n));
const {runtimeHashes,verifyBuild}=await import(pathToFileURL(path.join(home,'ff-build.mjs')));
const pin=JSON.parse(fs.readFileSync(path.join(source,'upstream.json')));fs.writeFileSync(path.join(home,'upstream.json'),JSON.stringify(pin));const build=path.join(home,'.build');const checks=[];
const goodPkg={name:'@forgeflow/ff-spec',version:`1.14.2-ff.${pin.adapter}`,type:'module',bin:{'ff-spec':'./bin/ff-spec.js'}};
function reset(){fs.rmSync(build,{recursive:true,force:true});for(const dir of ['bin','dist/nested','schemas'])fs.mkdirSync(path.join(build,dir),{recursive:true});fs.writeFileSync(path.join(build,'package.json'),JSON.stringify(goodPkg));fs.writeFileSync(path.join(build,'bin/ff-spec.js'),'// isolated launcher import fixture\n');fs.writeFileSync(path.join(build,'dist/nested/probe.js'),'export const fixture = true;\n');fs.writeFileSync(path.join(build,'FF-BUILD.json'),JSON.stringify({...pin,runtimeHashes:runtimeHashes(build)}));}
function check(name,operation,pattern){operation();if(pattern)assert.throws(()=>verifyBuild(),pattern);else assert.equal(verifyBuild(),build);checks.push({name,status:'PASS'});}
reset();check('valid runtime',()=>{});
for(const [name,value] of [['name','wrong'],['version','wrong'],['bin',undefined],['bin',{'ff-spec':'wrong'}],['bin',{'ff-spec':'./bin/ff-spec.js',openspec:'./bin/openspec.js'}]]){reset();check(`package ${name} ${JSON.stringify(value)}`,()=>{fs.writeFileSync(path.join(build,'package.json'),JSON.stringify({...goodPkg,[name]:value}));},/package identity mismatch/);}
for(const k of ['commit','archiveSha256','patchSha256','adapter']){reset();check(`marker stale ${k}`,()=>{const marker=JSON.parse(fs.readFileSync(path.join(build,'FF-BUILD.json')));marker[k]='wrong';fs.writeFileSync(path.join(build,'FF-BUILD.json'),JSON.stringify(marker));},new RegExp(`stale build ${k}`));}
reset();check('runtime byte tamper',()=>fs.appendFileSync(path.join(build,'bin/ff-spec.js'),'//tamper'),/runtime hashes mismatch/);
reset();check('missing marker',()=>fs.unlinkSync(path.join(build,'FF-BUILD.json')),/unavailable or invalid/);
reset();check('malformed marker',()=>fs.writeFileSync(path.join(build,'FF-BUILD.json'),'{'),/unavailable or invalid/);
reset();check('symlink runtime entry rejected',()=>fs.symlinkSync('probe.js',path.join(build,'dist/nested/link.js')),/Unsupported runtime entry/);
reset();assert.equal(spawnSync(process.execPath,[path.join(home,'ff-spec.mjs')],{env:process.env,encoding:'utf8'}).status,0);checks.push({name:'launcher successful import',status:'PASS'});
fs.unlinkSync(path.join(build,'FF-BUILD.json'));const bad=spawnSync(process.execPath,[path.join(home,'ff-spec.mjs')],{env:process.env,encoding:'utf8'});assert.equal(bad.status,1);assert.match(bad.stderr,/FF build unavailable/);checks.push({name:'launcher invalid build catch',status:'PASS'});
reset();fs.writeFileSync(path.join(fixtureRoot,'helper-probes.json'),JSON.stringify({checks,sourceCopies:['ff-build.mjs','ff-spec.mjs'].map(n=>({source:path.join(source,n),copy:path.join(home,n),sha256:createHash('sha256').update(fs.readFileSync(path.join(home,n))).digest('hex')}))},null,2));console.log(JSON.stringify({checks:checks.length,status:'PASS'}));
