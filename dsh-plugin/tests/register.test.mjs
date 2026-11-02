/** node --test：register.mjs 在临时 profile 上的幂等注册、--remove 复原与退出码。 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { main, register, remove, LINK_LABEL, PLUGIN_NAME } from '../register.mjs';

const SELF_DIR = path.dirname(fileURLToPath(import.meta.url));
const PLUGIN_DIR = path.resolve(SELF_DIR, '..');
const REGISTER = path.join(PLUGIN_DIR, 'register.mjs');
const BASE_PATCH = [
  '# 测试用 profile patch 层',
  '- id: local-sqlserver',
  '  name: "@local/dsh-sqlserver"',
  '  config:',
  '    enabled: true',
  '',
].join(String.fromCharCode(10));

function makeProfile(withPatch = true, patch = BASE_PATCH) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ff-dsh-profile-'));
  const data = {
    name: 'dsh-profile-test',
    private: true,
    dependencies: { '@local/dsh-sqlserver': 'link:E:/github/DHAgent/dsh-sqlserver' },
    dsh: { profile: { bundles: ['@deepseek-ai/dsh-base'] } },
  };
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify(data, null, 2) + String.fromCharCode(10));
  if (withPatch) fs.writeFileSync(path.join(dir, 'cordis.patch.yml'), patch);
  return dir;
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function backups(dir) {
  return fs.readdirSync(dir).filter(name => name.includes('.bak-'));
}

function expectedLink() {
  return 'link:' + PLUGIN_DIR.split(path.sep).join('/');
}

function linkPathOf(dir) {
  return path.join(dir, 'node_modules', '@local', 'forgeflow-dsh');
}

test('register 写入 link 依赖、bundles 与 patch 块，并生成备份', () => {
  const dir = makeProfile();
  const result = register({ profile: dir });
  assert.equal(result.code, 0);
  assert.deepEqual(result.changed.sort(), ['cordis.patch.yml', 'node_modules/@local/forgeflow-dsh', 'package.json']);
  assert.equal(fs.realpathSync(linkPathOf(dir)).toLowerCase(), fs.realpathSync(PLUGIN_DIR).toLowerCase());
  const data = readJson(path.join(dir, 'package.json'));
  assert.equal(data.dependencies[PLUGIN_NAME], expectedLink());
  assert.ok(data.dsh.profile.bundles.includes(PLUGIN_NAME));
  const patch = fs.readFileSync(path.join(dir, 'cordis.patch.yml'), 'utf8');
  assert.match(patch, /- id: forgeflow-dsh/);
  assert.match(patch, /name: "@local\/forgeflow-dsh"/);
  assert.match(patch, /guardTools:/);
  assert.equal(patch.split('# >>> forgeflow-dsh').length - 1, 1);
  assert.ok(patch.includes(BASE_PATCH.trimEnd()));
  assert.equal(backups(dir).length, 2);
});

test('空模板 [] 被替换为注册块，remove 后恢复为合法空序列', () => {
  const template = ['# Your patch layer for this dsh profile:', '# a top-level YAML array of patch entries.', '[]', ''].join(String.fromCharCode(10));
  const dir = makeProfile(true, template);
  assert.equal(register({ profile: dir }).code, 0);
  const patch = fs.readFileSync(path.join(dir, 'cordis.patch.yml'), 'utf8');
  assert.equal(patch.split(String.fromCharCode(10)).some(line => line.trim() === '[]'), false);
  assert.ok(patch.startsWith('# Your patch layer'));
  assert.match(patch, /- id: forgeflow-dsh/);
  assert.ok(patch.trimEnd().endsWith('# <<< forgeflow-dsh <<<'));
  assert.equal(remove({ profile: dir }).code, 0);
  const restored = fs.readFileSync(path.join(dir, 'cordis.patch.yml'), 'utf8');
  assert.equal(restored.includes('forgeflow-dsh'), false);
  assert.match(restored.trimEnd(), /\[\]$/);
});

test('注释-only 的 patch 也补回 [] 哨兵，避免 remove 后留下 null 文档', () => {
  const dir = makeProfile(true, ['# only comments', ''].join(String.fromCharCode(10)));
  assert.equal(register({ profile: dir }).code, 0);
  const patch = fs.readFileSync(path.join(dir, 'cordis.patch.yml'), 'utf8');
  assert.match(patch, /- id: forgeflow-dsh/);
  assert.equal(remove({ profile: dir }).code, 0);
  const restored = fs.readFileSync(path.join(dir, 'cordis.patch.yml'), 'utf8');
  assert.equal(restored.includes('forgeflow-dsh'), false);
  assert.match(restored.trimEnd(), /\[\]$/);
});

test('register 第二次运行不重复写入（幂等）', () => {
  const dir = makeProfile();
  assert.equal(register({ profile: dir }).code, 0);
  const patchAfterFirst = fs.readFileSync(path.join(dir, 'cordis.patch.yml'), 'utf8');
  const backupsAfterFirst = backups(dir).length;
  const second = register({ profile: dir });
  assert.equal(second.code, 0);
  assert.deepEqual(second.changed, []);
  assert.match(second.message, /无需改动/);
  assert.equal(fs.readFileSync(path.join(dir, 'cordis.patch.yml'), 'utf8'), patchAfterFirst);
  assert.equal(backups(dir).length, backupsAfterFirst);
});

test('remove 精确复原 package.json 与 cordis.patch.yml', () => {
  const dir = makeProfile();
  assert.equal(register({ profile: dir }).code, 0);
  const result = remove({ profile: dir });
  assert.equal(result.code, 0);
  assert.deepEqual(result.changed.sort(), ['cordis.patch.yml', 'node_modules/@local/forgeflow-dsh', 'package.json']);
  assert.equal(fs.existsSync(linkPathOf(dir)), false);
  const data = readJson(path.join(dir, 'package.json'));
  assert.equal(Object.prototype.hasOwnProperty.call(data.dependencies, PLUGIN_NAME), false);
  assert.equal(data.dsh.profile.bundles.includes(PLUGIN_NAME), false);
  assert.equal(data.dependencies['@local/dsh-sqlserver'], 'link:E:/github/DHAgent/dsh-sqlserver');
  const patch = fs.readFileSync(path.join(dir, 'cordis.patch.yml'), 'utf8');
  assert.equal(patch.includes('forgeflow-dsh'), false);
  assert.ok(patch.includes(BASE_PATCH.trimEnd()));
});

test('remove 幂等，未注册时 changed 为空', () => {
  const dir = makeProfile();
  const result = remove({ profile: dir });
  assert.equal(result.code, 0);
  assert.deepEqual(result.changed, []);
  assert.match(result.message, /无需撤销/);
});

test('缺少 profile 或 package.json 退出码 2', () => {
  const missing = path.join(os.tmpdir(), 'ff-dsh-not-exists-' + Date.now());
  const result = register({ profile: missing });
  assert.equal(result.code, 2);
  assert.match(result.message, /找不到 DSH profile/);
  const empty = fs.mkdtempSync(path.join(os.tmpdir(), 'ff-dsh-empty-'));
  assert.equal(register({ profile: empty }).code, 2);
});

test('--dry-run 只报告改动，不写文件也不留备份', () => {
  const dir = makeProfile();
  const before = fs.readFileSync(path.join(dir, 'cordis.patch.yml'), 'utf8');
  const result = register({ profile: dir, dryRun: true });
  assert.equal(result.code, 0);
  assert.equal(result.changed.length, 3);
  assert.equal(fs.existsSync(linkPathOf(dir)), false);
  assert.equal(fs.readFileSync(path.join(dir, 'cordis.patch.yml'), 'utf8'), before);
  assert.equal(backups(dir).length, 0);
});

test('register 在 patch 文件缺失时创建，并在 remove 后删除空文件', () => {
  const dir = makeProfile(false);
  assert.equal(register({ profile: dir }).code, 0);
  assert.ok(fs.existsSync(path.join(dir, 'cordis.patch.yml')));
  assert.equal(remove({ profile: dir }).code, 0);
  assert.equal(fs.existsSync(path.join(dir, 'cordis.patch.yml')), false);
});

test('main 支持 --json 与未知参数', () => {
  const dir = makeProfile();
  const success = main(['--profile', dir, '--json']);
  assert.equal(success.code, 0);
  const parsed = JSON.parse(success.lines[0]);
  assert.equal(parsed.action, 'register');
  assert.equal(parsed.profile, path.resolve(dir));
  assert.equal(main(['--nope']).code, 2);
  assert.equal(main(['--help']).code, 0);
});

test('register.mjs 可直接用 node 运行（CLI 断言）', () => {
  const dir = makeProfile();
  const run = spawnSync(process.execPath, [REGISTER, '--profile', dir, '--json'], { encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr);
  const parsed = JSON.parse(run.stdout.trim());
  assert.equal(parsed.code, 0);
  assert.ok(parsed.changed.includes('package.json'));
  assert.ok(parsed.changed.includes('node_modules/@local/forgeflow-dsh'));
  const removed = spawnSync(process.execPath, [REGISTER, '--profile', dir, '--remove', '--json'], { encoding: 'utf8' });
  assert.equal(removed.status, 0, removed.stderr);
  assert.equal(JSON.parse(removed.stdout.trim()).action, 'remove');
});


test('--global 把插件物化到 DSH_HOME 并让 profile link 指向全局副本', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "ff-dsh-home-"));
  const dir = makeProfile();
  const result = register({ profile: dir, global: true, home });
  assert.equal(result.code, 0);
  const globalDir = path.join(home, "plugins", "forgeflow-dsh");
  assert.ok(fs.existsSync(path.join(globalDir, "package.json")));
  assert.ok(fs.existsSync(path.join(globalDir, "index.js")));
  assert.equal(fs.realpathSync(linkPathOf(dir)).toLowerCase(), fs.realpathSync(globalDir).toLowerCase());
  assert.equal(readJson(path.join(globalDir, 'package.json')).name, PLUGIN_NAME);
  const data = readJson(path.join(dir, "package.json"));
  assert.equal(data.dependencies[PLUGIN_NAME], "link:" + globalDir.split(path.sep).join("/"));
  assert.ok(result.changed.includes("plugins/forgeflow-dsh/index.js"));
});

test('--global 幂等，且全局副本被改写后自愈', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "ff-dsh-home-"));
  const dir = makeProfile();
  register({ profile: dir, global: true, home });
  assert.deepEqual(register({ profile: dir, global: true, home }).changed, []);
  const globalIndex = path.join(home, "plugins", "forgeflow-dsh", "index.js");
  fs.writeFileSync(globalIndex, "// tampered" + String.fromCharCode(10));
  const again = register({ profile: dir, global: true, home });
  assert.equal(again.code, 0);
  assert.deepEqual(again.changed, ["plugins/forgeflow-dsh/index.js"]);
  const sourceText = fs.readFileSync(path.join(PLUGIN_DIR, "index.js"), "utf8");
  assert.equal(fs.readFileSync(globalIndex, "utf8"), sourceText);
});

test('--global 迁移旧的本地 link 到全局副本', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "ff-dsh-home-"));
  const dir = makeProfile();
  assert.equal(register({ profile: dir }).code, 0);
  const result = register({ profile: dir, global: true, home });
  assert.equal(result.code, 0);
  assert.ok(result.changed.includes(LINK_LABEL + "（替换旧目标）"));
  const globalDir = path.join(home, "plugins", "forgeflow-dsh");
  assert.equal(fs.realpathSync(linkPathOf(dir)).toLowerCase(), fs.realpathSync(globalDir).toLowerCase());
});

test('remove --global 保留全局副本，--purge 才删除', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "ff-dsh-home-"));
  const dir = makeProfile();
  register({ profile: dir, global: true, home });
  const globalDir = path.join(home, "plugins", "forgeflow-dsh");
  const kept = remove({ profile: dir, global: true, home });
  assert.equal(kept.code, 0);
  assert.ok(fs.existsSync(path.join(globalDir, "index.js")));
  const purged = remove({ profile: dir, global: true, home, purge: true });
  assert.equal(purged.code, 0);
  assert.ok(purged.changed.includes("plugins/forgeflow-dsh"));
  assert.ok(!fs.existsSync(globalDir));
});

test('--global --dry-run 不创建全局副本', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "ff-dsh-home-"));
  const dir = makeProfile();
  const result = register({ profile: dir, global: true, home, dryRun: true });
  assert.equal(result.code, 0);
  assert.ok(!fs.existsSync(path.join(home, "plugins", "forgeflow-dsh", "package.json")));
});
test('已存在的 node_modules 目标是外来目录时不覆盖，退出码 2', () => {
  const dir = makeProfile();
  const foreign = path.join(dir, 'node_modules', '@local', 'forgeflow-dsh');
  fs.mkdirSync(foreign, { recursive: true });
  const packageBefore = fs.readFileSync(path.join(dir, 'package.json'), 'utf8');
  const result = register({ profile: dir });
  assert.equal(result.code, 2);
  assert.match(result.message, /未覆盖/);
  assert.equal(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'), packageBefore);
  assert.equal(backups(dir).length, 0);
});

test('register 建立 link，remove 后 link 与目录条目一并撤销', () => {
  const dir = makeProfile();
  assert.equal(register({ profile: dir }).code, 0);
  assert.ok(fs.existsSync(linkPathOf(dir)));
  assert.equal(remove({ profile: dir }).code, 0);
  assert.equal(fs.existsSync(linkPathOf(dir)), false);
});
