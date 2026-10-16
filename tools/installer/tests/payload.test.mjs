import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { gzipSync, gunzipSync } from 'node:zlib';
import { decodePayload } from '../../../bin/payload.mjs';
import { sha } from '../files.mjs';
function tar(entries) {
 const chunks = [];
 for (const [name, bytes, type = '0'] of entries) {
  const data = Buffer.from(bytes); const h = Buffer.alloc(512);
  h.write(name); h.write(data.length.toString(8).padStart(11,'0'),124); h.write(type,156); h.write('ustar',257); h.fill(32,148,156); h.write(h.reduce((a,b)=>a+b,0).toString(8).padStart(6,'0')+'\0 ',148);
  chunks.push(h, data, Buffer.alloc((512 - data.length % 512) % 512));
 }
 return gzipSync(Buffer.concat([...chunks, Buffer.alloc(1024)]));
}
function valid(extra = []) {
 const data = Buffer.from('hello');
 return tar([['MANIFEST.json', JSON.stringify({files:{'a.txt':sha(data)}})], ['a.txt',data], ...extra]);
}
test('strict decoder accepts complete manifest payload', () => {
 assert.equal(decodePayload(valid()).get('a.txt').toString(),'hello');
 const payload = fs.readFileSync(new URL('../../../forgeflow-payload.tgz',import.meta.url));
 assert.ok(decodePayload(payload).size > 800);
});
test('strict decoder rejects traversal, absolute paths, links, special files', () => {
 for(const name of ['../escape','/escape','a/../../escape','a\\escape']) assert.throws(()=>decodePayload(tar([[name,'x']])));
 for(const type of ['1','2','3','4','5','6']) assert.throws(()=>decodePayload(tar([['a','x',type]])),/regular files/);
});
test('strict decoder rejects missing, extra, duplicate and corrupt members', () => {
 assert.throws(()=>decodePayload(valid([['extra','x']])),/membership/);
 assert.throws(()=>decodePayload(valid([['a.txt','x']])),/Duplicate/);
 assert.throws(()=>decodePayload(tar([['MANIFEST.json','{"files":{"missing":"x"}}']])),/membership/);
 assert.throws(()=>decodePayload(tar([['MANIFEST.json','{"files":{"a":"wrong"}}'],['a','x']])),/integrity/);
 assert.throws(()=>decodePayload(Buffer.from('not gzip')));
});

test('strict decoder rejects missing terminators and nonzero trailers', () => {
 const bytes = gunzipSync(valid());
 assert.throws(() => decodePayload(gzipSync(bytes.subarray(0,-1024))), /terminator/);
 assert.throws(() => decodePayload(gzipSync(bytes.subarray(0,-512))), /terminator/);
 assert.throws(() => decodePayload(gzipSync(Buffer.concat([bytes,Buffer.from('bad')]))), /Trailing/);
 const bad = Buffer.from(bytes); bad[0] ^= 1;
 assert.throws(() => decodePayload(gzipSync(bad)), /checksum/);
});
