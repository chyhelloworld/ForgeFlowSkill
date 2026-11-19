# DSH 运行时冒烟（非仅静态检查）

日期：2026-11-02
结论：在隔离的 DSH 实例（独立 `DSH_HOME`、从默认 headless 模板新建 profile）中，插件被真实加载：`ff_status`/`ff_gate` 工具出现在模型请求的 `tools` 列表、四层常驻锚点出现在 `system` 提示、`ff_status` 实际执行并返回状态摘要、`tools/pre-execute` 守卫实际拒绝被门禁阻塞的 `archive` 命令。**未重启用户当前 GUI**，GUI 仍需重启后才加载该插件。

## 方法

1. 用 Electron 作为 Node 运行 DSH CLI（不启动 GUI）：
   ```powershell
   $env:ELECTRON_RUN_AS_NODE='1'
   & 'D:\Programs\DeepSeek Harness\DeepSeek Harness.exe' 'D:\Programs\DeepSeek Harness\resources\app.asar\dsh\node_modules\@deepseek-ai\dsh\lib\bin.js' --help
   ```
   输出 DSH `0.2.1-rc.5` 的 launcher 帮助。
2. 隔离环境：`$env:DSH_HOME='E:\github\ForgeFlowSKill\_verify_tmp\dsh-smoke-home'`（不触碰真实 `~/.dsh`；临时目录已在验证后整体删除）；
   `--profile ffsmoke --from-default-profile headless --dump-config` 初始化临时 profile。
3. 用本迭代的 `source/dsh-plugin/register.mjs` 把插件注册进该临时 profile；`--dump-config` 的组合树出现且仅出现一条 `id: forgeflow-dsh`（第 383–385 行），无重复 entry。
4. 因没有可用真实 API Key，本地起一个最小 Anthropic Messages 兼容 mock（`_verification/dsh-native-20261102/runtime-smoke-artifacts/mock-anthropic.mjs`，仅监听 `127.0.0.1:8731`），用 `$env:DEEPSEEK_BASE_URL='http://127.0.0.1:8731'` + dummy key 让 headless 完成一轮模型调用；mock 记录每次请求体，并按模式返回纯文本或单个 `tool_use`。
5. headless 实际调用：`dsh --profile ffsmoke --json '<task>'`，读取 NDJSON 事件与 mock 捕获的请求体。

## 结果

### 1. 插件加载、工具可见、常驻锚点可见

`dsh --profile ffsmoke --json 'say OK'` → exit 0。mock 捕获的第一条模型请求中：

- `tools` 列表包含 `ff_status`、`ff_gate`（全部 27 个工具，含 DSH 内置工具）；
- `system` 提示包含四层失效文本（匹配 `四层失效` 与 `L1`），system 长度 3030；第二条请求（mock 的收尾调用）不含这些内容。

这证明插件 `apply()` 在真实 DSH 启动中执行，工具与 systemPrompt section 都已注册到当前会话。

### 2. `ff_status` 工具真实执行

mock 返回 `tool_use(ff_status, {})`，headless 事件：

```json
{"type":"tool_call","callId":"toolu_mock_1","tool":"ff_status","input":{}}
{"type":"tool_result","callId":"toolu_mock_1","status":"completed","result":"FF 0.9.8-dsh.1（full）；gates=UNCONFIGURED / evidence=NOT_CHECKED / checked=0；discovery=root=.dsh/skills skills=21 others=none；handshake=skills=0.9.8-dsh.1 state=0.9.8-dsh.1 cli=match verdict=MATCH"}
```

### 3. 守卫真实拒绝

在临时 fixture `_verify_tmp/dsh-guard-smoke-20261102`（验证后已删除，可用下方方法重建）放一个 stub `.forgeflow/ff-spec.mjs`（对 `status --json` 返回 `policy.state='invalid'`）与 `openspec/ff-policy.json`，mock 返回 `tool_use(pwsh, {command:'node .forgeflow/ff-spec.mjs archive demo --yes'})`：

```json
{"type":"tool_call","callId":"toolu_mock_2","tool":"pwsh","input":{"description":"archive demo","command":"node .forgeflow/ff-spec.mjs archive demo --yes"}}
{"type":"tool_result","callId":"toolu_mock_2","status":"error","result":"Error: FF 门禁配置无效：mock invalid policy for guard smoke。先修复 openspec/ff-policy.json，或运行 node .forgeflow/ff-spec.mjs adopt --write --force 后重试；确需跳过请设置 FF_ALLOW_UNGATED=1。"}
```

即命令在 `tools/pre-execute` 被拒绝，未执行到 shell；拒绝原因与实现文案一致。

### 4. 顺带修复：空模板 patch 的 YAML 哨兵

默认 profile 模板的 `cordis.patch.yml` 是“注释 + `[]` 空序列哨兵”。旧 `appendBlock` 直接在后面追加块序列，`--dump-config` 报 `YAMLException: end of the stream or a document separator is expected (7:1)`。已修：最后有效行为 `[]`/`{}`/`null`/`~`/`---` 时用注册块替换该行；`--remove` 后若只剩注释则补回 `[]`。新增两条 register 测试覆盖。

## 证据文件

- `_verification/dsh-native-20261102/runtime-ff-status-tool.log`：`ff_status` 工具调用与结果的 NDJSON。
- `_verification/dsh-native-20261102/runtime-guard-deny.log`：守卫拒绝的 NDJSON。
- `_verification/dsh-native-20261102/runtime-plain-boot.log`：纯文本一轮的 NDJSON（插件加载成功）。
- `_verification/dsh-native-20261102/mock-request-boot2.jsonl`：mock 捕获的完整模型请求（含 `tools` 与 `system`，可用于复核工具名与锚点）。
- 归档的 smoke 脚本与请求捕获：`_verification/dsh-native-20261102/runtime-smoke-artifacts/`（`mock-anthropic.mjs`、`mock-requests.jsonl`、`dsh-smoke-dump2.yml`、`dsh-smoke-guard1.log`）。
- 临时 `DSH_HOME`（`_verify_tmp/dsh-smoke-home`）与守卫 fixture（`_verify_tmp/dsh-guard-smoke-20261102`）验证后已删除；守卫 fixture 可用第 3 节描述的两个文件按原样重建。

## 边界

- 这是**另一个 DSH 进程与临时 profile** 的真实运行，不是用户当前 GUI 的重启效果；真实 `~/.dsh/profiles/desktop` 已注册但需重启 GUI 才生效。
- mock 模型只验证运行时管线与工具/守卫注册，不验证真实模型如何选择这些工具；四层行为评测见 `replay-E39-E42.md`。
- 守卫仍是 best-effort（只看 `pwsh`/`bash` 的 `command` 字面量），不是安全边界；`run_code`、变量拼接等不可拦截。
- 没有修改真实 profile 之外的全局文件；`DSH_HOME` 指向 `_verify_tmp`，已于验证后整体删除以释放磁盘（约 13.6 GB）。