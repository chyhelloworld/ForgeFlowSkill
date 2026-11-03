# 四层验证：DSH 宿主 0.9.7-dsh.1（2026-11-02）

对象：E:\github\ForgeFlowSKill（Windows 11，node v24.12.0，python 3.11.5）。
安装：`node source\bin\ff-install.mjs install --project E:\github\ForgeFlowSKill --host dsh --mode full --build`
→ `status=INSTALLED`，`version=0.9.7-dsh.1`，`host=dsh`，`mode=full`，exit=0，耗时 148s。
证据：`evidence/install-install-20261102-124540.log`、`evidence/install-summary.txt`、`evidence/state-summary.txt`。

分层判断：本任务的"四层"按安装器实际暴露的四个可独立失效的接口划分——
(1) 技能分发/发现层；(2) CLI 运行时与版本握手层；(3) FF 门禁层；(4) 技能文本协作契约层（宿主状态交付）。
四层互不推导：文件齐全不等于模型加载，runtime READY 不等于门禁通过，文本约定不等于模型执行。

## 第 1 层：技能分发与发现

| 检查 | 命令 | 结果 | 退出码 |
| --- | --- | --- | --- |
| 技能目录数 | `(Get-ChildItem .dsh\skills -Directory -Filter 'ff-*').Count` | 21 | 0 |
| 版本头 | `SKILL.md` frontmatter `metadata.version` | 19 项 = 0.9.7-dsh.1；ff-diagram、ff-writing-document = 0.1.0（技能自身版本，非安装版本） | 0 |
| doctor discovery | `node .forgeflow/install/doctor.mjs --host dsh` | `root=.dsh/skills`, `skills=21`, `others=[]`, `gitRoot=false` | 0 |
| 宿主目录隔离 | 同上 | 安装器把 DSH 技能放独立根，未覆盖 Codex 根 | 0 |

关键原始片段（doctor-dsh.json）：

```json
"discovery": { "root": ".dsh/skills", "skills": 21, "gitRoot": false,
  "projectRoot": "E:\\github\\ForgeFlowSKill", "others": [] }
```

`others=[]` 的实测原因（不是漏报）：`.agents/skills` 下仍有 17 个 `ff-*` 目录，但递归 `SKILL.md` 计数为 0、文件数为 0（旧 Codex 安装只剩空壳目录 `agents/`、`references/`）。
doctor 的 `skillDirs` 只统计"目录 + SKILL.md 同时存在"的技能，因此不计入。这意味着本机没有可供 DSH 误加载的旧 Codex 技能副本。
证据：`evidence/skills-inventory.txt`（逐项 version/bytes/协作块命中）。
另：安装完成后本会话的技能目录摘要更新为 0.9.7 文案（例如 ff-retro 新描述"收集任务级使用问题…"与 `.dsh/skills/ff-retro/SKILL.md` 的 `description` 逐字一致），说明宿主重新扫描了 `.dsh/skills`；这只证明"被发现"，不证明"被调用/ obeyed"。

结论：**PASS（文件与发现层）**；模型实际加载调用技能：**NOT_PROVEN**。

## 第 2 层：CLI 运行时与版本握手

| 检查 | 命令 | 结果 | 退出码 |
| --- | --- | --- | --- |
| CLI 版本 | `node .forgeflow/ff-spec.mjs --version` | `0.9.7-dsh.1` | 0 |
| doctor 状态 | `node .forgeflow/install/doctor.mjs --host dsh` | `status=RUNTIME_READY`, `runtime=READY` | 0 |
| 握手 | 同上 | `skills=0.9.7-dsh.1`, `state=0.9.7-dsh.1`, `cli=0.9.7-dsh.1`, `verdict=MATCH` | 0 |
| 项目状态 | `node .forgeflow/ff-spec.mjs status` | `gates: DISABLED — openspec/ not found` | 0 |
| CLI 帮助 | `node .forgeflow/ff-spec.mjs --help` | 子命令可见（archive/status/init/adopt 等） | 0 |

证据：`evidence/doctor-dsh.json`、`evidence/ff-spec-version.txt`、`evidence/ff-spec-status.txt`。
注意 doctor 的 `gates.configuration=UNCONFIGURED`、`evidence=NOT_CHECKED`、`checked=0`；`READY/RUNTIME_READY` 只说明程序可运行，不能当作门禁通过。

结论：**PASS（CLI 与握手）**。

## 第 3 层：FF 门禁

### 3a 无 policy 的负例（真实项目，无 openspec/）

| 检查 | 命令 | 结果 | 退出码 |
| --- | --- | --- | --- |
| status | `node .forgeflow/ff-spec.mjs status` | `gates: DISABLED — openspec/ not found` | 0 |
| archive 帮助 | `node .forgeflow/ff-spec.mjs archive --help` | 打印 `⚠ FF gates disabled: openspec/ff-policy.json not found, so this archive was not checked…` | 0 |
| archive 不存在对象 | `node .forgeflow/ff-spec.mjs archive nonexistent-change-xyz` | 先打印同一警告，再 `Error: Change 'nonexistent-change-xyz' not found`；未落任何写操作 | 1 |
| 静默开关 | 同上，`$env:FF_ALLOW_UNGATED='1'` | 警告行数 0（`WARN_LINES=0`）；不设置时 `PLAIN_WARN_LINES=1` | 0 |
| adopt（只读） | `node .forgeflow/ff-spec.mjs adopt`（不加 --write） | `adopt expects an initialized project: run … init first` —— 项目无 openspec，只读预览 **NOT_RUN**（未获授权执行 init） | 1 |

证据：`evidence/gate-probe-archive-no-openspec.txt`、`evidence/ff-spec-adopt.txt`、`evidence/ff-spec-status.txt`。

### 3b 有 policy 的正例（source 外临时项目，验证门禁真的会拦）

为避免在真实项目落 openspec，在 `E:\github\ForgeFlowSKill\_verify_tmp\dsh-gate-positive-20261102\` 造最小项目（`openspec/changes/demo/{proposal,design,tasks}.md`），
直接用已安装 release 内的 CLI（`.forgeflow/install/releases/0.9.7-dsh.1-…-full/tools/openspec/ff-spec.mjs`，cwd=临时项目）执行：

| 检查 | 结果 | 退出码 |
| --- | --- | --- |
| `adopt`（预览） | 推断出 `design` artifact + progress 映射；不写盘 | 0 |
| `adopt --write` | 写出 `openspec/ff-policy.json`（version 2, artifacts[design]），随后预览报 `demo: blocked — design: Stable plan requires unique task IDs under ## Task plan` | 1 |
| `status --json` | `configured: true`；row `valid: false`，`reasons: ["design: Stable plan requires unique task IDs under ## Task plan"]`；**无** ⚠ FF gates disabled | 0 |
| `archive demo --yes` | `Error: FF validity gate failed: design: Stable plan requires unique task IDs…`；`openspec/changes/demo` 仍在，未被归档 | 1 |

关键片段：

```text
× Error: FF validity gate failed: design: Stable plan requires unique task IDs under ## Task plan
```

证据：`evidence/gate-positive-probe.txt`、`evidence/gate-positive-archive-blocked.txt`。
边界：临时项目只验证"policy 存在 → gate 生效、archive 被拦"，不构成业务项目门禁验收；真实项目当前 UNCONFIGURED。

结论：**PASS（无 policy 警告路径 + policy 生效路径）**；真实项目 adopt 只读预览 **NOT_RUN**。

## 第 4 层：技能文本协作契约（宿主状态交付）

| 检查 | 命令 | 结果 |
| --- | --- | --- |
| 21 个 SKILL.md 协作块 | 逐文件正则统计 | 21/21 同时出现 `subagent`、`tasks.md`、`present`、`exit_plan_mode`；另 `todo_write` 存在 |
| ff-spec 抽查 | `Select-String` | 命中 1/1/1/1；文件 6157 bytes，frontmatter `version: "0.9.7-dsh.1"` |

证据：`evidence/skills-inventory.txt`。

可验证的只是"文本约定已写入每个技能"，以下均**不可由本层证明**：
- DSH 模型会真的把独立审查交给 `subagent`、把 tasks.md 当权威、用 `present` 交付、plan mode 先 `exit_plan_mode`；
- docs/user/install.md:62 已声明的边界同样适用："READY 证明文件与 CLI 可用，不证明宿主模型已经加载/调用技能，也不证明业务或真人验收"。

结论：**PASS（文本存在性）**；行为层 **NOT_PROVEN**。

## 汇总

| 层 | 结论 | 证据 |
| --- | --- | --- |
| 1 技能分发/发现 | PASS（21/21，discovery 一致） | skills-inventory.txt, doctor-dsh.json |
| 2 CLI 与握手 | PASS（verdict=MATCH, cli 0.9.7-dsh.1, exit 0） | doctor-dsh.json, ff-spec-version.txt, ff-spec-status.txt |
| 3 门禁 | PASS（警告路径 + policy 生效路径）；真实项目 adopt 只读预览 NOT_RUN | gate-*.txt, ff-spec-adopt.txt |
| 4 状态交付文本 | PASS（21/21 块存在）；行为 NOT_PROVEN | skills-inventory.txt |

不证明：DSH 模型实际加载/调用技能、语义审查、业务验收、真人接受。
读环境提示：安装期间 `source/docs/guide-qa.json` 被其他 agent 修改（12:49:20，version→0.9.7-dsh.1、package_skill_directories 17→21）；发生在构建完成（12:47:17）之后，不影响本次安装与校验；本 agent 未修改 source/ 下任何既有文件。
