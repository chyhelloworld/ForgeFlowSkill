# DSH 嵌入安装与验证（2026-11-02）

目标项目：`E:\github\ForgeFlowSKill`（Windows，node v24.12.0，python 3.11.5）。
源码：`source/`（分支 `feat/dsh-adapter`，HEAD `c1f53b6`，安装前 `git status --porcelain` 为空；`--build` 使用包内 payload，不改写源码）。
安装器入口：`source\bin\ff-install.mjs`；本项目安装后入口：`.forgeflow\install\doctor.mjs`、`.forgeflow\ff-spec.mjs`。

## 阶段记录

| 阶段 | 状态 | 证据文件 | 关键数字 |
| --- | --- | --- | --- |
| 安装：`node source\bin\ff-install.mjs install --project E:\github\ForgeFlowSKill --host dsh --mode full --build` | PASS（exit 0） | `evidence/install-install-20261102-124540.log`、`evidence/install-summary.txt`、`evidence/state-summary.txt`；原始日志另存 `_verification/dsh-embed-20261102/install-20261102-124540.log` | 版本 0.9.7-dsh.1；host=dsh；mode=full；耗時 148s；release `0.9.7-dsh.1-9d9cbee074c18280-full`；state 管理文件 188、releaseInventory 7994；21 个 `.dsh/skills/ff-*` |
| doctor：`node .forgeflow/install/doctor.mjs --host dsh` | PASS（exit 0） | `evidence/doctor-dsh.json` | `status=RUNTIME_READY`；`runtime=READY`；`gates.configuration=UNCONFIGURED`,`evidence=NOT_CHECKED`；`discovery.root=.dsh/skills`,`skills=21`,`others=[]`；`handshake.verdict=MATCH`（skills=state=cli=0.9.7-dsh.1） |
| 四层验证：技能 / CLI 握手 / 门禁 / 状态交付 | 见 `evidence/four-layers.md` | `evidence/four-layers.md`、`evidence/skills-inventory.txt`、`evidence/ff-spec-version.txt`、`evidence/ff-spec-status.txt`、`evidence/ff-spec-adopt.txt`、`evidence/gate-probe-archive-no-openspec.txt`、`evidence/gate-positive-probe.txt`、`evidence/gate-positive-archive-blocked.txt` | 21/21 技能含 `subagent/tasks.md/present/exit_plan_mode`；`--version=0.9.7-dsh.1`；无 policy 时 archive 打印 `⚠ FF gates disabled`（`FF_ALLOW_UNGATED=1` 静默）；临时项目有 policy 时 `archive` 被 `FF validity gate failed` 拦截（exit 1） |

逐层结论（详见 `evidence/four-layers.md`）：

| 层 | 结论 |
| --- | --- |
| 技能分发/发现 | PASS —— `.dsh/skills` 21 个 ff-*，全部含 DSH 协作块；`.agents/skills` 仅剩 17 个空壳目录（0 个 SKILL.md），故 `discovery.others=[]` |
| CLI 与握手 | PASS —— `ff-spec --version` exit 0；doctor `verdict=MATCH` |
| 门禁 | PASS —— 无 policy 警告路径与实际拦截路径均在 source 外实测；真实项目 `adopt` 只读预览 NOT_RUN（无 openspec，未获授权 init） |
| 状态交付文本 | PASS（文本存在性）；模型是否按约定调用 `subagent`/`present`/`exit_plan_mode`、是否把 tasks.md 当权威：NOT_PROVEN |

## 边界与未证明项

- 本记录只证明：文件已落盘、运行时与 CLI 可执行、版本三方握手一致、门禁开关行为符合文档。
- **不证明** DSH 模型实际加载/调用技能，不证明语义审查、业务验收或真人接受；doctor 自身 note 亦写明 "No actual model invocation, semantic review or human acceptance is established."
- 无 `openspec/` 与 `openspec/ff-policy.json`，本项目门禁为 DISABLED/UNCONFIGURED；临时正例位于 `_verify_tmp/dsh-gate-positive-20261102/`（source 外，最小项目，非业务验收）。
- 安装前该项目的旧安装为 0.6.0-experimental.5.windows-test.2（schema 1，Codex）；本次 full 安装按 host dsh 重建，旧 `.agents/skills` 只剩空壳目录，未删除。
- 安装期间（12:49:20，构建完成后）`source/docs/guide-qa.json` 被其他 agent 修改；本 agent 未修改 source/ 下既有文件。

## 复现命令

```powershell
cd E:\github\ForgeFlowSKill
node source\bin\ff-install.mjs install --project E:\github\ForgeFlowSKill --host dsh --mode full --build
node .forgeflow/install/doctor.mjs --host dsh
node .forgeflow/ff-spec.mjs --version
node .forgeflow/ff-spec.mjs status
node .forgeflow/ff-spec.mjs adopt            # 本项目无 openspec，预期 exit 1
node .forgeflow/ff-spec.mjs archive --help   # 预期打印 ⚠ FF gates disabled
```
