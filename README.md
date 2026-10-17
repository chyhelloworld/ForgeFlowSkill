> 当前工作分支：0.7.0候选，尚未发布或最终验收。0.6.1遗留GUI/CRAP/真人验收缺口见 iterations/0.6.1/README.md。历史0.6安装与测试说明保留在下方，不能代替本版证据。

# ForgeFlow Skill

ForgeFlow（FF）是一套项目内 AI 协作技能：把想法整理为可验证的规格和小任务，按需完成设计、实现、审核与交付。适合从零开始的新项目，也适合已有代码、半成品或换会话后的接手。

当前版本为 **0.6.0-experimental.7**，包含 **17 项技能**和项目本地 FF CLI。技能按当前缺口选择，已有有效结果直接复用；不要求走完全部流程。Codex 的项目技能发现已有实测，Claude Code 提供安装选项，实际宿主调用尚未验证。

## 快速开始：Windows + Codex

先准备 **Node.js >=20.19.0、npm、Git、tar**，并能访问 GitHub 和下载构建依赖。以下 PowerShell 示例把项目、外层 npm 缓存和临时目录放在 E 盘；旧项目请将 `$Project` 改为现有项目根目录。

```powershell
$Project = 'E:\projects\my-project'
$Cache = 'E:\forgeflow-cache'
New-Item -ItemType Directory -Force -Path $Project, "$Cache\tmp" | Out-Null
$env:TEMP = "$Cache\tmp"
$env:TMP = $env:TEMP
Set-Location $Project

npx --yes --ignore-scripts --cache "$Cache\npm" --package=github:chyhelloworld/ForgeFlowSkill#46d76a2374543fdb01018d3f5287a4df183d2e83 ff-install install --project . --host codex --mode full --build
node .forgeflow/install/doctor.mjs
node .forgeflow/ff-spec.mjs --help
```

这是 [PR #1](https://github.com/chyhelloworld/ForgeFlowSkill/pull/1) 中已验证的完整 Git 提交。安装来源是 GitHub，**未发布到 npm registry**，无需 npm 发布账号。`--ignore-scripts` 禁止 npm 自动执行生命周期脚本，`--build` 明确允许安装器构建本地 CLI。

安装内容位于项目的 `.forgeflow/` 与 `.agents/skills/`。full 构建的内层缓存和临时数据仍在项目 `.forgeflow/install/` 下；上述外层设置不保证所有系统工具都不写项目外文件。工具源无需复制进每个项目，也不替换全局 OpenSpec。

只要技能、暂不需要 CLI 门禁：将 `--mode full --build` 改为 `--mode skills-only`。此模式的 doctor 和 CLI 会返回 **BLOCKED**。Claude Code 将宿主参数改为 `--host claude`，技能安装至 `.claude/skills/`，其实际宿主调用未验证。CodeGraph 默认关闭。

## 第一次在 Codex 中使用

在 Codex 中打开上面安装的**目标项目根目录**；若会话早于安装，重新打开项目或启动新会话，先核对技能是否已发现。可以直接输入：

```text
请用 $ff-intake 只读检查这个项目：核对目标、规格、活动任务、Git 工作区和已有验证，说明当前缺口与建议的下一步，保留现有改动。
```

技能文件存在、Codex 能发现技能、模型实际完成任务是不同的验证层次；不保证自动注册同名斜杠命令。doctor 的 READY 仅表示本地 CLI 可运行。安装也不会自动初始化规格、批准计划或执行发布。

## 新项目怎么开始

1. **明确要解决的问题**：目标或取舍不清时用 `ff-grill`，再用 `ff-spec` 写清主流程、边界与验收标准；目标已明确就直接复用。
2. **解决关键未知**：需要视觉方向时用 `ff-design`，需要验证技术可行性或真实入口时用 `ff-prove`，没有这类缺口可跳过。
3. **按小切片实施**：用 `ff-plan` 拆出可验收任务，经独立 `ff-review` 计划审核后，由 `ff-implement` 在已授权范围内实施和验证。
4. **核验并交付**：按适用范围独立审核真实主流程与代码，由 `ff-deliver` 整理证据、未验证项和人工接受状态。提交、PR、合并和发布按各自授权处理。

示例：`请用 $ff-grill 帮我明确这个新项目的用户、问题、首版范围和验收目标，先不要实现。`

## 旧项目或半成品怎么继续

先用 `ff-intake` 只读对账，核对当前规格、活动变更、任务、代码、测试和未提交改动。按缺口接下一步：需求不清回到 Grill/Spec，缺任务用 Plan，条件有效且已获准则进入 Implement；不重复已经有效的步骤。

故障原因不明时用 `ff-diagnose`；实现中有适合测试驱动的行为时用 `ff-tdd`；暂停或换会话时用 `ff-handoff` 留下短检查点，接收方再用 Intake 核实。

若项目已有旧版 FF/OpenSpec 状态，先读 [迁移说明](MIGRATION.md)。现行规格在 `openspec/specs/`，活动变更在 `openspec/changes/`；旧回执不能自动当作新版本的通过证据。项目安装后的 CLI 入口统一为 `node .forgeflow/ff-spec.mjs`。

## 技能索引

| 技能 | 什么时候用 |
| --- | --- |
| [ff-intake](skills/ff-intake/SKILL.md) | 接手、恢复、只读核对状态 |
| [ff-grill](skills/ff-grill/SKILL.md) | 澄清目标、范围和关键取舍 |
| [ff-spec](skills/ff-spec/SKILL.md) | 明确行为、边界和验收标准 |
| [ff-design](skills/ff-design/SKILL.md) | 探索产品交互与视觉方向 |
| [ff-prove](skills/ff-prove/SKILL.md) | 用有界实验验证关键未知 |
| [ff-plan](skills/ff-plan/SKILL.md) | 拆分纵向切片、任务和依赖 |
| [ff-implement](skills/ff-implement/SKILL.md) | 实现并验证已获准的任务 |
| [ff-review](skills/ff-review/SKILL.md) | 独立审核计划、主流程和代码 |
| [ff-deliver](skills/ff-deliver/SKILL.md) | 整理验收证据与交付说明 |
| [ff-diagnose](skills/ff-diagnose/SKILL.md) | 定位故障和性能回归根因 |
| [ff-tdd](skills/ff-tdd/SKILL.md) | 对单个行为执行 red → green |
| [ff-handoff](skills/ff-handoff/SKILL.md) | 暂停、换会话或换执行者时交接 |
| [ff-research](skills/ff-research/SKILL.md) | 研究具体事实疑问 |
| [ff-retro](skills/ff-retro/SKILL.md) | 复盘真实事件及其代价 |
| [ff-writing-fragments](skills/ff-writing-fragments/SKILL.md) | 采访与收集写作素材 |
| [ff-writing-shape](skills/ff-writing-shape/SKILL.md) | 将已有素材组织成文 |
| [ff-writing-beats](skills/ff-writing-beats/SKILL.md) | 按叙事节拍组织文章 |

前九项是主职责，Diagnose / TDD / Handoff 是三个按需执行方法，后五项为独立可选方法。写作的 Shape 与 Beats 选一路即可；决策索引与 CodeGraph 也按需选用，不增加必经阶段。

## 详细文档

| 想了解什么 | 入口 |
| --- | --- |
| 完整流程、示例与流程图 | [中文使用手册](docs/FF-中文使用手册.md) · [离线图文手册](docs/FF-离线图文手册.html) · [可编辑图源](docs/diagrams/) |
| 安装布局、缓存、重入、回滚和恢复 | [npx 安装指南](docs/npx安装指南.md) · [项目内安装指南](docs/项目内安装指南.md) · [INSTALL](INSTALL.md) |
| 按缺口选择技能 | [路由说明](ROUTING.md) · [可选方法](docs/FF-可选方法中文使用说明.md) |
| 规格有效性、迁移与 CLI 源码 | [生命周期契约](SPEC-LIFECYCLE.md) · [迁移说明](MIGRATION.md) · [OpenSpec 构建与来源](tools/openspec/README.md) |
| 可选扩展 | [决策索引](docs/FF-决策索引中文说明.md) · [CodeGraph 适配器](docs/FF-CodeGraph可选适配器.md) |
| 版本变更、测试与来源 | [实验 7 变更](CHANGE-MAP-0.6.0-experimental.7.md) · [历史测试记录](测试过程与结果.md) · [技能来源与许可](provenance/sources.json) |

部分详细文档保留旧版候选状态和源码路径，供流程、实现与历史追溯使用；当前安装命令与验证边界以本页和 [PR #1](https://github.com/chyhelloworld/ForgeFlowSkill/pull/1) 为准。已安装项目使用 `.forgeflow/ff-spec.mjs`，旧文档中的 `tools/openspec/ff-spec.mjs` 属于源码构建入口。

## 已验证到哪里

[PR #1](https://github.com/chyhelloworld/ForgeFlowSkill/pull/1) 记录实验 7 冻结 tgz 和上述 GitHub 固定 SHA 的原生 Windows 安装、自检与 CLI 验证，以及重复安装、整体搬迁和 Codex 17 项技能发现。原生回归为 **31 通过、0 失败、1 因相对 symlink 权限不足跳过**；junction 测试已执行。

这些结果绑定当时的版本、环境和包哈希。**真实模型业务调用与 Claude 实际宿主调用未验证**；安装、自检、静态检查或技能发现通过，都不等于业务验收或生产就绪。历史报告只证明对应历史版本。

本次 README 调整会同步更新 MANIFEST 与 payload，产生新的包哈希；本轮只验证文档、包一致性及相关安装器回归，不把旧冻结包的 Windows full 端到端结果当作新包已测。
