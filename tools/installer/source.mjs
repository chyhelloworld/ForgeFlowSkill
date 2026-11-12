import fs from 'node:fs';
import path from 'node:path';
import { safe, sha, read, fail, regularFiles, relative } from './files.mjs';
import { hostBase, currentSkills } from './state.mjs';
// Walk from the source root so excluded build caches under tools/openspec are never listed as payload.
function skillFiles(source) {
  return regularFiles(source, 'skills').filter(n => !n.split('/').includes('__pycache__') && !n.endsWith('.pyc')).map(n => n.slice('skills/'.length));
}
export function verifySource(source) {
  const manifest = read(safe(source, 'MANIFEST.json'));
  if (!/^[0-9A-Za-z][0-9A-Za-z.+-]{0,79}$/.test(manifest.version)) fail('Invalid source version');
  for (const [name, expected] of Object.entries(manifest.files)) {
    const file = safe(source, name);
    if (!/^[a-f0-9]{64}$/.test(expected) || sha(fs.readFileSync(file)) !== expected) fail(`Source integrity: ${name}`);
  }
  const needed = skillFiles(source).map(n => `skills/${n}`);
  needed.push(...regularFiles(source, 'tools/openspec'));
  for (const name of needed) if (!manifest.files[name]) fail(`Unlisted payload: ${name}`);
  const names = fs.readdirSync(path.join(source, 'skills')).sort();
  if (JSON.stringify(names) !== JSON.stringify(currentSkills)) fail('Expected current FF skill inventory');
  return { version: manifest.version, hash: sha(fs.readFileSync(path.join(source, 'MANIFEST.json'))), names, files: manifest.files };
}
// Host-specific guidance appended to every installed SKILL.md. Only behaviour the
// host actually provides is claimed here; unknown capabilities stay silent.
const dshBinding = [
  '## 宿主协作（DSH）',
  '- 独立审查用 subagent：父上下文只交出产物路径与判据，子代理只读并回传 verdict 与证据；不得在同一上下文自审后宣称独立审查。',
  '- tasks.md 是进度权威；todo_write 只是镜像，不作为完成证据。',
  '- 交付用 present 呈现关键产物，最终回复给出验收命令。',
  '- plan mode 下先 exit_plan_mode 提交计划，批准后再改文件。',
].join('\n');
// Inline guidance is loaded with an activated skill, not a global Codex hook.
const fourLayerBinding = [
  '## 四层失效自检（已激活 FF 技能内）',
  '实质工作按触发信号自检，不新增阶段、门禁或台账；不要求为低风险小任务制造方案比较或重复确认。',
  '- L1 局部正确、整体偏航：切片/测试通过仍须核对总需求的当版验收证据；缺失记未知，不以通过率求和。',
  '- L2 过度防御、复杂度失控：不为纯假设新增机制；说明具体失败路径、触发依据、影响、已有机制为何不足及实现维护成本；概率无数据写未知。超范围或显著增复杂度先经用户同意，必要安全、授权与数据完整性不因低概率省略。同一信任边界且条件未变不重复校验；新边界、状态变化或当前授权仍须检查。',
  '- L3 过早接受平庸方案：重大取舍至少比较两个候选或做一个可证伪实验；无实质替代可记 N/A 并说明，普通小任务不强造比较。',
  '- L4 过早收敛、原始问题被替换：先核对用户原话、未解项与授权再命名或拆任务；目标不清或实质变化才补确认，不把设计讨论当实现授权。',
].join('\n');
export function bindingNote(host, pin, independent) {
  const run = `node .forgeflow/ff-spec.mjs`;
  const doctor = `node .forgeflow/install/doctor.mjs --host ${host}`;
  const tail = `从项目根运行 ${run}。先运行 ${doctor}；BLOCKED 时不得宣称门禁可用，不回退到官方 openspec。`;
  const head = independent
    ? `## 项目安装绑定\n独立技能 ${independent.name} ${independent.version}；技能内容 SHA256 ${independent.hash}；技能来源 manifest SHA256 ${pin.hash}。保留运行时安装版本 ${independent.runtime.version}；运行时源 manifest SHA256 ${independent.runtime.sourceHash}；宿主 ${host}。`
    : `## 项目安装绑定\n安装版本 ${pin.version}；源 manifest SHA256 ${pin.hash}；宿主 ${host}。`;
  return ['', '', head + tail, '', fourLayerBinding, ...(host === 'dsh' ? ['', dshBinding] : []), ''].join('\n');
}
export function skillPayload(source, pin, host, selectedSkill, installed) {
  const base = hostBase(host);
  const files = {};
  for (const name of skillFiles(source)) {
    if (selectedSkill && !name.startsWith(`${selectedSkill}/`)) continue;
    let data = fs.readFileSync(path.join(source, 'skills', name));
    if (/\.(md|yaml|yml|json|txt)$/.test(name)) data = Buffer.from(data.toString().replaceAll('tools/openspec/ff-spec.mjs', '.forgeflow/ff-spec.mjs'));
    if (name.endsWith('/SKILL.md')) {
      const independent = selectedSkill && installed ? { ...skillIdentity(source, pin, selectedSkill), runtime: installed } : null;
      data = Buffer.concat([data, Buffer.from(bindingNote(host, pin, independent))]);
    }
    files[`${base}/${relative(name)}`] = data;
  }
  return files;
}

// Only reviewed runtime-independent meta-skills may use independent updates.
// Registry membership alone does not establish runtime/dependency compatibility.
export const independentlyUpdatable = ['ff-diagram', 'ff-writing-document'];
export function skillIdentity(source, pin, name) {
  if (!independentlyUpdatable.includes(name)) fail('Unsupported independent skill update');
  if (!pin.files['skill-versions.json']) fail('Independent skill registry must be manifest-listed');
  const registry = read(safe(source, 'skill-versions.json'));
  const version = registry[name];
  if (typeof version !== 'string' || !/^[0-9]+\.[0-9]+\.[0-9]+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(version)) fail('Invalid independent skill version');
  const prefix = `skills/${name}/`;
  const entries = Object.entries(pin.files).filter(([n]) => n.startsWith(prefix)).map(([n, hash]) => [n.slice(prefix.length), hash]).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0);
  if (!entries.some(([n]) => n === 'SKILL.md')) fail('Independent skill missing');
  const header = fs.readFileSync(safe(source, `${prefix}SKILL.md`), 'utf8').split('---')[1] ?? '';
  if (!header.split('\n').some(line => line.trim() === `version: "${version}"`)) fail('Independent skill version disagrees with registry');
  return { version, hash: sha(JSON.stringify(entries)) };
}
export function checkSkillPins(source, pin, state) {
  for (const [name, expected] of Object.entries(state?.skillOverrides ?? {})) {
    const actual = skillIdentity(source, pin, name);
    if (actual.version !== expected.version || actual.hash !== expected.hash) fail(`Independent skill pin conflict: ${name}; use a matching full source, intentional update-skill, or rollback first`);
  }
}

export function compareStableSkillVersions(candidate, current) {
  const stable = /^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$/;
  if (!stable.test(candidate) || !stable.test(current)) fail('Only stable X.Y.Z independent skill versions are supported');
  const a = candidate.split('.').map(BigInt), b = current.split('.').map(BigInt);
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] > b[i] ? 1 : -1;
  return 0;
}
