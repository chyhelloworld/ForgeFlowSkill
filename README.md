> 当前工作分支：0.9.0 候选，包含 17 项技能，尚未发布或最终人类验收。历史版本的安装与测试结果只适用于对应提交和包哈希。

# ForgeFlow Skill

ForgeFlow（FF）是一套项目内 AI 协作技能：把想法整理为可验证的规格和小任务，按需完成设计、实现、审核与交付。适合从零开始的新项目，也适合已有代码、半成品或换会话后的接手。

当前工作分支版本为 **0.9.0 候选**，包含 **17 项技能**和项目本地 FF CLI。技能按当前缺口选择，已有有效结果直接复用；不要求走完全部流程。Windows 本地构建、安装与 CLI 有实际证据；Codex 已发现 17 项技能，完整宿主调用仍受 setup refresh 错误阻塞。Claude Code 的实际宿主调用尚未验证。

## 具体能做什么

FF 帮助 AI 执行者沿同一份需求和项目事实工作：澄清目标、写行为与验收规格、探索设计或验证未知、拆小任务、实现、独立审核，再整理交付或交接。已有资料有效时直接复用，小修不必补一整套文档。研究、复盘和写作也可以单独使用。

| 版本增量 | 什么时候用 | 具体功能与输出 | 使用入口 |
| --- | --- | --- | --- |
| **0.7：阶段审核与证据摘要** | 想知道当前做到了哪一步、缺什么证据，而不只看“任务已勾选” | 要求把必须交付项、预期价值、证据与假设分开；以核心目标/主要流程、计划、代码三类审核给出短结论、风险、缺口和下一步。可选工具核对已导出的审核/证据索引，输出 `RECORDED`、`GAPS` 或 `INVALID`；缺同版复杂度/覆盖率时标 `NOT_MEASURED` | `ff-grill`、`ff-spec`、`ff-prove`、`ff-review`、`ff-deliver`；可选 `ff-review/scripts/health.py` |
| **0.8：变更范围与中断恢复** | 中途提新想法、明确改需求，或换会话后继续 | 在既有规则上补强：讨论不自动入计划，明确批准后只更新受影响规格/任务/测试/依赖；区分现行、活动和历史资料。恢复工具检查当前目标、依赖哈希和完成回执，逐动作输出 `SKIP_COMPLETED`、`VERIFY_CURRENT_AUTHORITY` 或 `INSPECT` | `ff-spec`、`ff-plan`、`ff-intake`、`ff-handoff`；新增可选 `ff-handoff/scripts/resume.py` |
| **0.9：完整旅程与同版交互证据** | 做界面设计、验证一条主要用户路径，或检查设计与实现是否对得上 | 实现前先写视觉方向、从入口到结果的主要步骤和关键返回/失败状态；预期与实测分开。工具核对当前设计/源码、步骤 ID/顺序/状态连续性、操作轨迹和 UI 截图引用，输出 `OBSERVED`、`GAPS` 或 `INVALID` | `ff-design`、`ff-review`；新增可选 `ff-design/scripts/journey.py` |

这三版没有增加技能数量或另建计划数据库。上表的流程要求写在技能提示词中，由执行者遵守；Python 工具只自动核对所列记录，不负责决定需求、执行恢复或操作浏览器。它们不是新的 `ff-spec health/resume/journey` 子命令。

## 按使用场景开始

以下是发给已发现 FF 技能的 AI 宿主的自然语言请求，不是 PowerShell 命令，也不保证注册同名斜杠命令。宿主必须能访问项目、运行相应工具，并已有本次操作所需授权。

| 场景 | 可以怎样说 | 应得到什么 |
| --- | --- | --- |
| 新项目 | “请用 ff-grill 明确这个预约工具的用户、首版范围和成功标准，先不要实现；确认后再用 ff-spec 写主要行为与验收。” | 原始目标、取舍和确认状态；确认后形成规格。不会因做完澄清就自动获准写代码 |
| 接手旧项目 | “请用 ff-intake 只读核对当前规格、活动任务、未提交改动和实际测试；保留已有有效结果，指出最小下一步。” | 当前事实、过期/未知项、可继续的切片；不因换人重做整个项目 |
| 中途只讨论想法 | “我们能否加批量导出？先讨论影响，不改代码、规格或任务。” | 候选、影响和待决定项；不把提问当批准 |
| 明确改需求 | “确认加入批量导出。请用 ff-spec、ff-plan 只更新受影响行为、任务、验收和依赖；在现有授权范围内推进。” | 受影响范围和更新后的规格/计划，旧结论保留为历史或失效；不扩展到无关重构 |
| 暂停和恢复 | “暂停前用 ff-handoff 留下检查点；新会话用 ff-intake 核对最新目标、原进程和完成回执，只继续未完成部分。” | 可核对的短交接与逐动作恢复建议，不盲目重跑副作用 |
| 设计与交互核对 | “请用 ff-design 写清从打开页面到完成主要任务的路径、视觉方向和关键状态，先只做设计；获准实现后，用 ff-review 对照真实操作和截图。” | 设计候选/约束、预期路径、实际结果及差异；没有真实操作时明确未验证 |

**0.8 的实际例子**：导出完成后索引进程被真实中断，新上下文接收者核对后保留已完成导出，只继续索引和后续审查。恢复检查器提供判断记录，真正的进程观察与业务命令由执行者完成。

**0.9 的实际例子**：对现有离线手册执行“打开→筛选→跳转阅读→空筛选→恢复→窄视口打开/筛选/跳转”，保存真实 Chrome 截图和操作轨迹，核对最终 HTML 的同版证据。这是已完成的文档使用旅程实验，不代表 FF 已自动验收任意应用或真实手机。

## 快速开始：Windows + Codex

先取得并核对本仓库 `work/061-through-09` 工作分支源码，把下面 `$Source` 改为源码根目录（其中有 `package.json` 和 `bin/ff-install.mjs`）。`$Project` 是你要使用 FF 的目标项目，两者可以不同。已有 FF 安装先按[安装指南](docs/项目内安装指南.md)盘点，不把同版本号的不同包哈希当作相同安装。

先准备 **Node.js >=20.19.0、npm、Git、tar**，并能访问 GitHub 和下载构建依赖。以下 PowerShell 示例把项目、外层 npm 缓存和临时目录放在 E 盘；旧项目请将 `$Project` 改为现有项目根目录。

```powershell
$Source = 'E:\tools\ForgeFlowSkill' # 已检出并核对的本仓库源码根目录
$Project = 'E:\projects\my-project'
$Cache = 'E:\forgeflow-cache'
New-Item -ItemType Directory -Force -Path $Project, "$Cache\tmp" | Out-Null
$env:TEMP = "$Cache\tmp"
$env:TMP = $env:TEMP
$env:npm_config_cache = "$Cache\npm"
node "$Source\bin\ff-install.mjs" install --project "$Project" --host codex --mode full --build
Set-Location $Project
node .forgeflow/install/doctor.mjs
node .forgeflow/ff-spec.mjs --help
```

`--build` 明确允许安装器构建本地 CLI。**未发布到 npm registry**；不要假定存在可直接安装的公开 FF npm 版本。原生 Windows full 构建/安装已在 0.8/0.9 冻结提交执行，具体版本与哈希见对应[证据入口](#已验证到哪里)。

安装内容位于项目的 `.forgeflow/` 与 `.agents/skills/`。full 构建的内层缓存和临时数据仍在项目 `.forgeflow/install/` 下；上述外层设置不保证所有系统工具都不写项目外文件。工具源无需复制进每个项目，也不替换全局 OpenSpec。

只要技能、暂不需要 CLI 门禁：将 `--mode full --build` 改为 `--mode skills-only`。此模式的 doctor 和 CLI 会返回 **BLOCKED**。Claude Code 将宿主参数改为 `--host claude`，技能安装至 `.claude/skills/`，其实际宿主调用未验证。CodeGraph 默认关闭。

## 第一次在 Codex 中使用

在 Codex 中打开上面安装的**目标项目根目录**；若会话早于安装，重新打开项目或启动新会话，先核对技能是否已发现。可以直接输入：

```text
请用 $ff-intake 只读检查这个项目：核对目标、规格、活动任务、Git 工作区和已有验证，说明当前缺口与建议的下一步，保留现有改动。
```

技能文件存在、Codex 能发现技能、模型实际完成任务是不同的验证层次；不保证自动注册同名斜杠命令。上述本地自检成功（显示 CLI 帮助、退出码 0）只表示 CLI 可运行。安装也不会自动初始化规格、批准计划或执行发布。

## 实际命令入口与前置条件

下面均在**已安装的目标项目根目录**运行。技能文本可单独使用；三个可选 Python 工具另需 **Python 3.9+** 和真实导出的 JSON 记录。命令不会替你采集证据、生成可信回执或取得批准；输入格式见各协议，示例记录不能当实际执行结果。

| 要做什么 | 确实存在的入口 | 输出与边界 |
| --- | --- | --- |
| 检查已安装 CLI 能否启动 | `node .forgeflow/install/doctor.mjs` | full 模式可探测 CLI，skills-only 会 BLOCKED；不是业务或宿主验收 |
| 列出已有变更 | `node .forgeflow/ff-spec.mjs list --json` | 实际项目中的变更列表，不自动创建任务 |
| 查看活动变更有效性 | `node .forgeflow/ff-spec.mjs status --change CHANGE --json` | 产物状态与适用的 FF 规则结果；`CHANGE` 要换成真实活动变更名 |
| 读取实施指导 | `node .forgeflow/ff-spec.mjs instructions apply --change CHANGE --json` | 指导与就绪信息，不执行代码、不表示人类接受 |
| 校验已有变更 | `node .forgeflow/ff-spec.mjs validate CHANGE --strict --json` | 校验发现；配置 FF policy 后按现有规则核对声明的产物/审核有效性，不证明语义正确或授权 |
| 0.7 审核证据摘要 | `python -X utf8 .agents/skills/ff-review/scripts/health.py health-record.json --root .` | `RECORDED` / `GAPS` / `INVALID`；[索引格式](skills/ff-review/references/health.md)，不替代三类独立审核或真实计量 |
| 0.8 中断恢复核对 | `python -X utf8 .agents/skills/ff-handoff/scripts/resume.py checkpoint.json --root . --current-goal R2` | `R2` 必须来自当前确认的目标修订；[格式与逐动作状态](skills/ff-handoff/references/resume.md)，不检测进程存活、不执行动作、不保证 exactly-once |
| 0.9 主要旅程证据核对 | `python -X utf8 .agents/skills/ff-design/scripts/journey.py journey.json --root . --current-target T1` | `T1` 必须对应当前目标/版本；[记录格式](skills/ff-design/references/journey.md)。UI 需操作轨迹与 PNG 引用，CLI 需实际命令/结果轨迹；`OBSERVED` 不等于验收 |

Python 工具的退出码均为 0（声明记录通过本工具核对）、1（有缺口）或 2（格式/读取错误）。没有自动接入 CI、持续监控或拦截其他命令；调用者仍要处理结果。`health.py` 的旧 Windows rooted/junction/ADS 路径边界另有[已知限制](iterations/0.8/independent-health-legacy-boundary.json)，只使用可信证据索引，不能将它当安全或权限边界。

新项目确实需要建立 OpenSpec 目录时，在获准写入后运行 `node .forgeflow/ff-spec.mjs init --tools none`；已有项目先盘点，不重复初始化。当前规格放 `openspec/specs/`，活动变更放 `openspec/changes/`，历史归档不冒充现行承诺。更完整的生命周期、归档与取消/拒绝规则见[生命周期契约](SPEC-LIFECYCLE.md)。

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

## 用户主动复盘与 RSI 的边界

可以主动请求 **`ff-retro`**，例如：“请用 ff-retro 复盘 FF 本仓库这轮实际执行中的重复代价，只提出有证据的改进候选，先不要改代码或技能。”这是技能调用请求，**没有 `ff-spec retro` 或 `ff-spec rsi` 命令**。

复盘面向已发生的项目或工作流程事件，并不限定只能分析业务项目；用户可明确指定 FF 自身的一次真实执行作为对象。输出包含事件与来源、实际代价、已有机制、少量可证伪候选、最小补丁与撤销方式，最后给保留/撤销/暂缓及证据；没有值得做的候选也可以结束。候选本身不授予修改 FF 的权限。

现有[复盘技能](skills/ff-retro/SKILL.md)和[候选模板](skills/ff-retro/references/template.md)要求：已有批准范围覆盖才实施；用原失败样本与正常样本验证最小改动，再独立复核，失败则撤销自有改动。这是由执行者遵守的流程，不是自动实验引擎。

如果 RSI 指“递归自我改进”，当前尚无专用递归循环、自动创建 FF 改进分支、完整自动对照评估或自动晋级为默认版本的系统。一次用户发起的复盘可以提出改进 FF 的候选，但不会递归改写自己的技能、权限或批准记录，也不会自动合并、发布。这里说明现有能力边界，不把 RSI 讨论当新功能授权。

## 技能索引

| 技能 | 什么时候用 | 主要输出或动作 |
| --- | --- | --- |
| [ff-intake](skills/ff-intake/SKILL.md) | 接手、恢复、状态不明 | 只读事实对账、有效/失效/未知项和下一职责 |
| [ff-grill](skills/ff-grill/SKILL.md) | 目标、范围或重要取舍不清 | 用户原意、目标、约束、候选与确认状态；按既有记录模式处理讨论 |
| [ff-spec](skills/ff-spec/SKILL.md) | 缺行为规格或获准变更需求 | 主要行为、边界、失败路径、验收及受影响范围 |
| [ff-design](skills/ff-design/SKILL.md) | 有视觉与交互未知 | 可评审设计候选、主要旅程、状态与视觉约束；需要真实用户选定的取舍保持候选 |
| [ff-prove](skills/ff-prove/SKILL.md) | 可行性或真实入口存在关键未知 | 有预算/停止条件的实验、实际观察、限制和建议 |
| [ff-plan](skills/ff-plan/SKILL.md) | 需要拆任务、依赖或重排 | 可独立验收的纵向切片、依赖和验证方式；只更新受影响工作 |
| [ff-implement](skills/ff-implement/SKILL.md) | 计划有效且任务已获准 | 实际实现、相关测试与变更证据；不代替独立审核 |
| [ff-review](skills/ff-review/SKILL.md) | 实施前审计划、实现后核对切片 | 计划、核心目标/主要流程、代码三类独立结论及缺口；小改可同一独立审核者覆盖适用项 |
| [ff-deliver](skills/ff-deliver/SKILL.md) | 阶段交付或用户验收准备 | 当前版本证据、偏差、未验证项、用户接受状态与授权范围内的交付 |
| [ff-diagnose](skills/ff-diagnose/SKILL.md) | 故障或性能回归根因不明 | 症状复现、竞争假设、因果证据和最小修复建议 |
| [ff-tdd](skills/ff-tdd/SKILL.md) | 实现中有可测试的业务行为 | 独立期望、真实调用链、实际 red → green 与相关回归 |
| [ff-handoff](skills/ff-handoff/SKILL.md) | 暂停、换会话或换执行者 | 当前版本/脏状态、已做/未做、运行中动作、证据和下一步的短检查点 |
| [ff-research](skills/ff-research/SKILL.md) | 需要回答具体事实疑问 | 带一手来源的事实、推论和待实测项，不自动启动开发 |
| [ff-retro](skills/ff-retro/SKILL.md) | 用户要求复盘已发生事件 | 基于真实代价的少量改进候选及保留/撤销/暂缓结论；不自动改变流程权限 |
| [ff-writing-fragments](skills/ff-writing-fragments/SKILL.md) | 需要采访和收集素材 | 经核对的素材片段、来源和待补缺口 |
| [ff-writing-shape](skills/ff-writing-shape/SKILL.md) | 已有素材，需要组织成文 | 文章结构与成稿，保留素材来源与未知项 |
| [ff-writing-beats](skills/ff-writing-beats/SKILL.md) | 希望按叙事节拍组织文章 | 节拍安排及对应文章内容；与 Shape 按需选一路 |

前九项是主职责，Diagnose / TDD / Handoff 是三个按需执行方法，后五项为独立可选方法。写作的 Shape 与 Beats 选一路即可；决策索引与 CodeGraph 也按需选用，不增加必经阶段。

## 详细文档

| 想了解什么 | 入口 |
| --- | --- |
| 完整流程、示例与流程图 | [中文使用手册](docs/FF-中文使用手册.md) · [离线图文手册](docs/FF-离线图文手册.html) · [可编辑图源](docs/diagrams/) |
| 安装布局、缓存、重入、回滚和恢复 | [npx 安装指南](docs/npx安装指南.md) · [项目内安装指南](docs/项目内安装指南.md) · [INSTALL](INSTALL.md) |
| 按缺口选择技能 | [路由说明](ROUTING.md) · [可选方法](docs/FF-可选方法中文使用说明.md) |
| 规格有效性、迁移与 CLI 源码 | [生命周期契约](SPEC-LIFECYCLE.md) · [迁移说明](MIGRATION.md) · [OpenSpec 构建与来源](tools/openspec/README.md) |
| 可选扩展 | [决策索引](docs/FF-决策索引中文说明.md) · [CodeGraph 适配器](docs/FF-CodeGraph可选适配器.md) |
| 当前版本功能与证据 | [0.7 阶段审核](iterations/0.7/README.md) · [0.8 变更与恢复](iterations/0.8/README.md) · [0.9 设计与旅程](iterations/0.9/README.md) |
| 历史变更、测试与来源 | [实验 7 变更](CHANGE-MAP-0.6.0-experimental.7.md) · [历史测试记录](测试过程与结果.md) · [技能来源与许可](provenance/sources.json) |

部分详细文档保留旧版候选状态和源码路径，供流程、实现与历史追溯使用；当前功能与安装入口以本页和对应版本记录为准。已安装项目使用 `.forgeflow/ff-spec.mjs`，旧文档中的 `tools/openspec/ff-spec.mjs` 属于源码构建入口。[PR #1](https://github.com/chyhelloworld/ForgeFlowSkill/pull/1) 保留历史安装证据，不代表当前包验收。

## 自动检查与使用边界

| 层次 | 已提供的能力 | 仍需执行者/用户判断 |
| --- | --- | --- |
| 技能提示词 | 说明如何澄清、更新规格、只动受影响工作、审核、交接和保留未知 | AI 是否遵守、讨论是否明确批准、需求是否正确、设计是否适合；不是强制运行时隔离，不能保证绝不跑偏 |
| 三个只读 Python 检查器 | 确定性核对声明字段、版本/目标、所列文件与哈希，以及各自协议中的状态/顺序 | 来源是否真实、关键依赖是否漏列、独立审核是否真正独立；不会执行业务、浏览器操作或生成权限 |
| 项目本地 FF CLI | 在已有 OpenSpec/FF policy 配置下处理状态、指导、校验和生命周期门禁 | 记录的语义、业务结果和真实接受；`apply` 指导不等于执行，归档/合并/发布仍需各自授权 |

0.9 对 UI 截图只验 PNG 文件头、正尺寸和与轨迹绑定的路径/哈希，**不解码整图、不自动判断美观、不识别作者主动把旧像素伪称新截图**。静态 CodeGraph 只能提供结构线索。`RECORDED`、`SKIP_COMPLETED`、`OBSERVED` 都不能代替真人接受、来源真实性或 exactly-once 保证。

## 已验证到哪里

- [0.7 最终复核](iterations/0.7/independent-replay-final.md)：阶段审核、证据摘要和有界行为重放，限制与失败修复记录保留。
- [0.8 记录](iterations/0.8/README.md)：完成真实中断与全新上下文接手，保留已完成导出、继续剩余工作；Windows full 构建/安装与 CLI 有绑定版本的原生证据。
- [0.9 记录](iterations/0.9/README.md)：实现前设计、真实 Windows Chrome 的八步手册旅程、截图/操作轨迹与独立核对；Windows full 构建/安装及安装后检查器有实际回执。窄视口是仿真，不能当真实手机/触控/辅助技术验收。

Codex 实际发现过 17 技能，但本机完整宿主调用受 `setup refresh` / `helper_unknown_error` 阻塞；Claude 宿主、真人接受及全平台矩阵未验证。没有 CI 成功证据，不把本地结果说成 CI 通过。旧 health 的 Windows 路径边界与 symlink 权限限制仍保留，详见 0.8 记录。[0.6.1 遗留 GUI/CRAP/真人验收缺口](iterations/0.6.1/README.md) 不因后续版本推进消失。

详细测试、逐函数计量、失败与修复放在以上链接中。CRAP 硬上限 50、目标约 10；缺可信同版数据标 `NOT_MEASURED`，不能把未知当 0。包版本为 0.9.0，沿用固定 CLI 依赖的 `--version` 为 `1.14.2-ff.0.5.0-rc3`，两者含义不同。

README 更新会产生新的 manifest/payload 哈希，不改变产品逻辑。历史安装与实验结论保持原提交身份；本次新包核对范围和精确哈希记在对应 Git 提交说明，不把旧冻结包的结果自动继承为新包验收。没有主分支合并、发布或部署。

## 历史安装参考（0.6，不能获取 0.9）

以下固定 SHA 和 [PR #1](https://github.com/chyhelloworld/ForgeFlowSkill/pull/1) 留作历史重放。`--ignore-scripts` 禁止 npm 自动执行生命周期脚本；只有显式 `--build` 才允许 FF 安装器构建本地 CLI。不要用此命令安装或验证当前 0.9。

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
