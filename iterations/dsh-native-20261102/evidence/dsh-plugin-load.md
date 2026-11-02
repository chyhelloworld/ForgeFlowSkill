# DSH 插件：安装、注册与可解析性证据（2026-11-02）

范围：`.forgeflow/dsh-plugin` 是否由 payload 正确安装、register.mjs 是否能写出可被 DSH 解析的 profile 条目、
以及注册是否幂等；不含“重启后 DSH 实际加载插件”的运行时证据（见文末边界）。

## 1. 安装产物与源码一致

- `node source\bin\ff-install.mjs install --project E:\github\ForgeFlowSKill --host dsh --mode full --build` → exit 0。
- `.forgeflow/install/state.json`：version=0.9.8-dsh.1、mode=full、host=dsh、files=193。
- 5 个插件文件逐字节一致（sha256 前 12 位，源码 `source/dsh-plugin/` vs 安装副本 `.forgeflow/dsh-plugin/`）：
  - README.md a3a0fe75b0c9 = a3a0fe75b0c9
  - cordis.patch.yml ab2b01782230 = ab2b01782230
  - index.js 57c25c4af5f7 = 57c25c4af5f7
  - package.json 3c3ae734bcb7 = 3c3ae734bcb7
  - register.mjs 678d39f85c62 = 678d39f85c62
- `node .forgeflow/ff-spec.mjs --version` → 0.9.8-dsh.1。
- `node .forgeflow/install/doctor.mjs --host dsh` 关键字段：status=RUNTIME_READY、plugin.available=true、
  plugin.path=".forgeflow/dsh-plugin"、discovery.root=".dsh/skills"、skills=21、
  handshake.skills=0.9.8-dsh.1、verdict=MATCH、adapterPin=null。

## 2. 注册修复 node_modules 链接缺口

问题（修复前实测）：profile 的 `package.json` 已有 `"@local/forgeflow-dsh": "link:.../.forgeflow/dsh-plugin"`
与 `dsh.profile.bundles` 条目，但 `node_modules/@local/` 下没有 forgeflow-dsh，从 profile 目录
`import("@local/forgeflow-dsh")` 报 `Cannot find package` —— 重启 DSH 会解析失败。

修复：register.mjs 新增 `ensureLink()`（Windows 用 junction，其他平台用 dir symlink）、`linkBelongsTo()`、
`removeLink()`；register 先建链接再生效，`--remove` 只删指向本插件的链接。已有外来同名目录时拒绝覆盖并退出码 2。

修复后实测（`_verification/dsh-native-20261102/register-link.json`）：

```json
{"action":"register","profile":"C:\\Users\\admin\\.dsh\\profiles\\desktop","plugin":"E:\\github\\ForgeFlowSKill\\.forgeflow\\dsh-plugin","changed":["node_modules/@local/forgeflow-dsh"],"dryRun":false,"code":0,"message":"已修改：node_modules/@local/forgeflow-dsh；重启 DSH 后插件生效。"}
```

profile `node_modules/@local` 现有 3 个 Junction：dsh-sqlserver、dsh-toll-audit、**forgeflow-dsh → E:\github\ForgeFlowSKill\.forgeflow\dsh-plugin**。
从 profile 目录解析（`_verification/dsh-native-20261102/resolve-plugin.txt`）：

```text
RESOLVED name=forgeflow-dsh inject=["tools"] apply=function
exit=0
```

再次执行 register 返回 `{"changed":[],"code":0,"message":"已经注册，无需改动（幂等）…"}`。

## 3. 其余注册内容（沿用首次注册，未被本次重装破坏）

- `package.json`：`dependencies["@local/forgeflow-dsh"]="link:E:/github/ForgeFlowSKill/.forgeflow/dsh-plugin"`，
  `dsh.profile.bundles` 末尾追加 `@local/forgeflow-dsh`。
- `cordis.patch.yml`：追加带 `>>> forgeflow-dsh (managed by register.mjs) >>>` 标记的 insert 块
  （id=forgeflow-dsh，name=@local/forgeflow-dsh，enabled=true，guardTools=[pwsh,bash]），原有 8 个条目未动。
- 注册写前备份：`package.json.bak-<ts>`、`cordis.patch.yml.bak-<ts>`（首次注册时生成；
  `_verification/dsh-native-20261102/profile-package-before.json`、`profile-patch-before.yml` 另存了原文件）。
- 撤销命令：`node .forgeflow/dsh-plugin/register.mjs --profile "$env:USERPROFILE\.dsh\profiles\desktop" --remove`
  （会同时删除 junction；有测试覆盖，本次未对真实 profile 执行 remove）。

## 4. 边界

- **当前 GUI 未重启**：本条注册发生在 2026-11-02 13:25 前后，当前 GUI 进程启动更早，因此当前会话仍无插件。
  插件加载、`ff_status`/`ff_gate` 工具可见、四层锚点与守卫拒绝已在隔离 DSH 实例中实测，见
  `runtime-smoke.md` 与 `_verification/dsh-native-20261102/runtime-*.log`；真实 GUI 重启后的效果未验证。
  撤销后残留与 profile 重装依赖场景未实测。
- 守卫只检查 pwsh/bash 的 `command` 字符串，`run_code`、变量拼接、其他入口不可拦；最终门禁仍以 FF CLI 为准。
- register 只改指定 profile，不同步 pnpm-lock.yaml；DSH 启动时若重新安装依赖，junction 仍应保留（未实测重装依赖场景）。
