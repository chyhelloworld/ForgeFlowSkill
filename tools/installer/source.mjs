import fs from 'node:fs';
import path from 'node:path';
import { safe, sha, read, fail, regularFiles, relative } from './files.mjs';
import { hostBase, currentSkills } from './state.mjs';
function skillFiles(source) {
  return regularFiles(path.join(source, 'skills')).filter(n => !n.split('/').includes('__pycache__') && !n.endsWith('.pyc'));
}
export function verifySource(source) {
  const manifest = read(safe(source, 'MANIFEST.json'));
  if (!/^[0-9A-Za-z][0-9A-Za-z.+-]{0,79}$/.test(manifest.version)) fail('Invalid source version');
  for (const [name, expected] of Object.entries(manifest.files)) {
    const file = safe(source, name);
    if (!/^[a-f0-9]{64}$/.test(expected) || sha(fs.readFileSync(file)) !== expected) fail(`Source integrity: ${name}`);
  }
  const needed = skillFiles(source).map(n => `skills/${n}`);
  needed.push(...regularFiles(path.join(source, 'tools/openspec')).map(n => `tools/openspec/${n}`));
  for (const name of needed) if (!manifest.files[name]) fail(`Unlisted payload: ${name}`);
  const names = fs.readdirSync(path.join(source, 'skills')).sort();
  if (JSON.stringify(names) !== JSON.stringify(currentSkills)) fail('Expected current FF skill inventory');
  return { version: manifest.version, hash: sha(fs.readFileSync(path.join(source, 'MANIFEST.json'))), names, files: manifest.files };
}
export function skillPayload(source, pin, host) {
  const base = hostBase(host);
  const files = {};
  for (const name of skillFiles(source)) {
    let data = fs.readFileSync(path.join(source, 'skills', name));
    if (/\.(md|yaml|yml|json|txt)$/.test(name)) data = Buffer.from(data.toString().replaceAll('tools/openspec/ff-spec.mjs', '.forgeflow/ff-spec.mjs'));
    if (name.endsWith('/SKILL.md')) data = Buffer.concat([data, Buffer.from(`\n\n## 项目安装绑定\n安装版本 ${pin.version}；源 manifest SHA256 ${pin.hash}；宿主 ${host}。从项目根运行 \`node .forgeflow/ff-spec.mjs\`。先运行 \`node .forgeflow/install/doctor.mjs --host ${host}\`；BLOCKED 时不得宣称门禁可用，不回退到官方 openspec。\n`)]);
    files[`${base}/${relative(name)}`] = data;
  }
  return files;
}
