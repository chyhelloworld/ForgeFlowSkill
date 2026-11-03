# 看板客户端加固：重复 apply 与缺快照空态（0.9.9-dsh.1）

日期：2026-11-02
范围：`dsh-plugin/client.js`、`dsh-plugin/tests/client.test.mjs`、`dsh-plugin/package.json`（插件版本 0.1.0 → 0.1.1）
触发：真实 GUI 重启验收时发现两处非阻断缺陷

## 1. 同一 client 被 apply 两次时槽位注册报错

现象（DevTools Console，重启后的 desktop GUI）：

```
[forgeflow-board] main registration failed Error: keyed slot "main" already has an entry for key "ff-board" at priority 0 (registered by Gb)
[forgeflow-board] sidebar registration failed Error: list slot "sidebar.panellist" already has an entry with id "ff-board" at priority 0 (registered by Gb)
```

原因：宿主对同一 client 模块执行了两次 `apply(ctx)`（首次注册成功、第二次被槽位拒绝）。`guarded()` 把异常降级为 `console.error`，所以启动不受影响，但控制台出现误导性错误；后续若宿主把重复注册当致命错误，会直接导致面板消失。

修复（`client.js`）：

- 新增 `alreadyRegistered(ctx, slotName, matches)`（:497）：只读调用 `ctx.slots.entries(slotName)`，按 `entry.options` 判断是否已有同 id/key 的条目；宿主未暴露 `entries` 或调用抛错时返回 `false`，行为与旧版一致。
- `apply()`（:509）在两次 `ctx.slots.register` 前分别检查 `options.id === PANEL_ID`（:513）与 `options.key === PANEL_ID`（:522），已存在则跳过注册并返回 `undefined`。
- 不改 `guarded()`：真正的注册失败仍会记录错误，只有“已注册”这一种情况被当作成功。

## 2. 工作区没有快照时显示“读取快照失败：no entry at …”

现象：在 `E:\github\DHAgent`（无 `.forgeflow/board.json`）打开面板，显示 `读取快照失败：no entry at "E:\github\DHAgent/.forgeflow/board.json"`。

原因：`loadBoard` 的缺文件判定正则（`client.js:206`）只匹配 `not.?found|ENOENT|不存在|no such file`；宿主 `remote.workspaceFiles` 对不存在的条目返回的错误文本是 `no entry at "<path>"`，因此被归为 `read-error`，而不是 `no-snapshot`。

修复：正则加入 `ENOTDIR` 与 `no entry at`（`client.js:206`），缺快照统一走 `no-snapshot` 空态，显示“未找到 .forgeflow/board.json。在项目根运行：node .forgeflow/dsh-plugin/generate-board.mjs --write”。

## 测试

`node --test dsh-plugin/tests/{board,client,plugin,register}.test.mjs` → **48 tests / 48 pass / 0 fail**（client 9 项，新增 2 项）：

- `apply skips entries that a previous apply already registered`：`slots.entries` 已含同 id/key 时两次 register 都不被调用。
- `apply registers when the slot reports unrelated entries`：`entries` 只有其他插件条目时仍正常注册两项。
- `loadBoard reads the snapshot and reports envelope failures` 增补：`no entry at "…"` 错误映射为 `no-snapshot`。

原有 “注册抛错/延迟注册抛错/React 缺失” 三条降级测试保持通过，确认加固没有把真实失败也吞掉。

## 重启后验收（2026-11-02 21:09–21:11）

用户重启 DSH（pid 29076，21:02:29 启动）后，在真实 desktop GUI 完成验收：

- bundle 已重新编译：Electron `Code Cache\js\55f87542a06cc7d5_0`（mtime 21:02:38）的 key 含 `@local/forgeflow-dsh/client.js`、`rev=dc29c94a46e3`（旧条目 rev=3763a1d97838）。
- 面板可打开：侧栏「ForgeFlow 看板」→ 主面板显示项目根、快照 `.forgeflow/board.json`、需求 10 条（基线 `source/planning/INTENT-LOOP-096.md`，列出 R096-1…R096-6 与 R-view）；截图 `_verification/client-hardening-20261102/post-restart-board.png`。
- 幂等注册生效：DevTools Console 只有 3 条既有 404（`api/ch…seq=11139`、`api/fi…lick-20261102.png`、`plugins/events ERR_FAILED`），没有 `[forgeflow-board] … already has an entry` 报错；截图 `post-restart-console.png`。
- 缺快照空态：切到 DHAgent（无 `.forgeflow/board.json`）显示“未找到 .forgeflow/board.json。在项目根运行：node .forgeflow/dsh-plugin/generate-board.mjs --write”，不再是 `读取快照失败：no entry at …`；截图 `post-restart-empty-state.png`，侧栏展开见 `post-restart-sidebar.png`。

## 边界

- 这两处修复已在上述重启后的真实 GUI 验收；Node 测试仍使用 fake `__ModuleLoader__` 与 fake ctx，不能替代真实 GUI 验收。
- `alreadyRegistered` 只按 id/key 判断，不区分注册者；若第三方插件占用了 `ff-board` 这个 id/key，本插件会选择跳过而不是覆盖（槽位本身也不允许同 id 重复注册）。
- 缺快照判定仍是文本匹配，宿主错误文案变化时可能需要再补关键词；这是 best-effort 的显示降级，不影响快照读取的正确性。
