import { gunzipSync } from 'node:zlib';
import { relative, sha, fail } from '../tools/installer/files.mjs';
function field(header, start, size) {
  return header.subarray(start, start + size).toString('utf8').split('\0')[0];
}
function checkHeader(header) {
  const expected = parseInt(field(header, 148, 8).trim(), 8);
  const copy = Buffer.from(header);
  copy.fill(32, 148, 156);
  if (copy.reduce((sum, byte) => sum + byte, 0) !== expected) fail('Invalid payload header checksum');
}
function entry(header) {
  checkHeader(header);
  if (field(header, 257, 6) !== 'ustar') fail('Unsupported payload tar format');
  const prefix = field(header, 345, 155);
  const name = relative(`${prefix ? prefix + '/' : ''}${field(header, 0, 100)}`);
  if (![0, 48].includes(header[156])) fail('Payload must contain only regular files');
  const sizeText = field(header, 124, 12).trim();
  if (!/^[0-7]+$/.test(sizeText)) fail('Invalid payload entry size');
  const size = parseInt(sizeText, 8);
  return { name, size };
}
function verify(files) {
  const manifest = JSON.parse(files.get('MANIFEST.json').toString('utf8'));
  const expectedNames = [...Object.keys(manifest.files), 'MANIFEST.json'].sort();
  if (JSON.stringify([...files.keys()].sort()) !== JSON.stringify(expectedNames)) fail('Payload manifest membership mismatch');
  for (const [name, expected] of Object.entries(manifest.files)) {
    if (sha(files.get(name)) !== expected) fail(`Payload manifest integrity: ${name}`);
  }
  return files;
}
export function decodePayload(archive) {
  const data = gunzipSync(archive, { maxOutputLength: 128 * 1024 * 1024 });
  const files = new Map();
  let offset = 0;
  while (offset + 512 <= data.length) {
    const header = data.subarray(offset, offset + 512);
    if (header.every(byte => byte === 0)) {
      if (data.length - offset < 1024) fail('Missing payload terminator');
      if (!data.subarray(offset).every(byte => byte === 0)) fail('Trailing payload data');
      return verify(files);
    }
    const { name, size } = entry(header);
    offset += 512;
    if (files.has(name) || offset + size > data.length) fail('Duplicate or truncated payload entry');
    files.set(name, data.subarray(offset, offset + size));
    offset += Math.ceil(size / 512) * 512;
  }
  fail('Missing payload terminator');
}
