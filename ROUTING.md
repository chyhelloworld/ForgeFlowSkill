# ForgeFlow 0.6.0-experimental.3：薄路由

此文件供宿主既有指令引用，不是额外技能或强制流水线。先复用有效产物，只调用当前缺口需要的职责。

1. 新项目、存量项目接入或恢复：ff-intake 只读核对实际状态、规格/任务有效性和权限，指出缺口。
2. 按缺口选：目标取舍→ff-grill；确认行为/范围/约束/验收→ff-spec；视觉方向→ff-design；真实交互/技术未知→ff-prove；纵向切片与依赖→ff-plan。
3. 普通任务由执行者自检目标映射、计划覆盖及相关确定性检查；实施已获准且前置可用→ff-implement。核心替换、主要用户路径、数据迁移、安全边界、验收口径变化须先独立审方案；用户额外审核要求和项目既有门禁仍遵守，风险不按行数/文件数判断。
4. 阶段末默认一次 ff-review 综合独立审查：一名独立读者复用证据，分别给 goal-mainflow / plan / code 适用结论。阶段是可独立验收的功能切片，不是每个小任务，也不能拖到全项目结束。修复只复核发现及影响链；新关键缺陷仍阻断，无关非阻断建议进待办。ff-deliver 消费有效证据、按授权交 PR 与交接。

最小审查包含原始目标来源、不可破坏约束、验收、本次范围/差异、关键测试、已有结论/未验证项；摘要只导航，按需定位原文并查跨模块影响。复用须目标、规则、依赖/配置/输入和证据均仍有效，不能只比源码。沿用 v2 绑定，不建缓存。既有 policy 强制计划回执时仍可能要实施前审查，不关闭门禁套用默认。

中途变化只修受影响链：确认来源→规格/设计/方案→任务及已完切片→证据和用户接受失效→最小复验，保留无关有效结果。简单修复可内联短规格+单条任务，无需新文件、全部十二技能、固定票数或提前 PR。技术 ready 不授予权限，测试绿灯和技能模拟评估不等于用户接受。独立性缺失必须明示，不角色扮演通过。

## 三个按需方法（共十二技能）

- 实际故障/性能回归 → ff-diagnose；需修代码回已获准 ff-implement，适用回归测试交 ff-tdd，随后按适用范围独立 Review。
- 实现阶段适用测试驱动 → ff-tdd，单行为真实 red→green；不要求所有任务 TDD 或批量全测试先行。
- 暂停/换会话/换执行者 → ff-handoff 交出短项目内检查点；接收 → ff-intake 核对真实状态 → 当前所需职责。用户交付仍 ff-deliver。

九个主职责保持选择性使用，三个方法不是附加必经阶段；无故障不做 Diagnose、无适用测试不做 TDD、无交接需求不做 Handoff。

## OpenSpec 原生接入

本节保留源码接入的工具路径约定。通过当前项目安装器使用时，目标项目入口为 `node .forgeflow/ff-spec.mjs`；full / skills-only 的区别见[安装说明](docs/user/install.md)。源码工具路径不等于安装后目录。

FF 命令统一在目标项目根运行 `node tools/openspec/ff-spec.mjs <子命令>`；工具位于其他 checkout/嵌套目录时使用实际相对/绝对路径，不回退到全局官方 CLI。包名 `@forgeflow/ff-spec`、可执行名 `ff-spec`，用户配置/数据命名空间 `ff-spec`。仅允许显式 `init --tools none`，不刷新官方工具集成，FF `update` 拒绝；十二个技能单独安装。官方 CLI 有文件系统权限时仍能改兼容的 `openspec/` 树而不执行 FF gate，这不是安全边界。

启用 FF 的项目只读 openspec/specs 作为现行规格。Intake 先查活动 change 与 status 的 ffValidity，按缺失/过期原因路由；不要仅凭文件存在跳到 Implement。Review 绑定目标和依赖指纹；通过 gate 仍需真实授权与接受。instructions apply 不是规格合入；archive 正常路径同步 specs。取消/拒绝按真实决议走显式 --ff-disposition + 原因 + 决议引用的原生关闭路径，保留未完成/失败记录且不合入 specs；不能改成 pass。旧 spec-state 只供历史审计，不再写入。

## 五项新增可选方法

具体事实疑问→ff-research；真实事件代价复盘→ff-retro（零候选有效）；素材采访→ff-writing-fragments；已有素材成文→ff-writing-shape或ff-writing-beats，作者选一路，不强制串行。任一入口均可独立使用，不触发全流程或自动健康检查。详见 docs/user/optional-methods.md。

## 0.9.6 可选架构评估入口（引入时18技能，本候选合计19）

架构初稿/定稿取舍、接手旧项目或重构准备→独立 `ff-architecture-review`。Design/Spec 只在真实复杂度或风险需要时推荐，说明收益/额外工作/视角并等用户选择，小 demo 默认跳过；拒绝不构成门禁失败，不反复劝说。主动调用即选择评估，不重复启动确认；安全权限与既有强制审查仍在。入口及共享模板只按需读取，不是第18个必经步骤，也不新增 `ff-spec` 子命令。详见[可选架构评估](docs/user/architecture-review.md)。上文17项是历史增量描述。

## 实验2：可选决策索引

保留17个技能。Grill、Research、Handoff、Intake 可按需引用单一决策权威记录，恢复原始目标和未决依赖；简单任务跳过。索引不授予执行、不增加状态数据库；[中文说明](docs/user/decision-index.md)。CLI 不变。

## 实验3：可关闭的 CodeGraph 适配器

仅显式启用时辅助静态代码定位，不新增技能或必经门禁。详见 [使用说明](docs/user/codegraph.md) 与 [真实试验报告](docs/archive/reports/CodeGraph试验报告.md)。沿用实验2决策索引；旧报告仅代表对应历史版本。

## 技术方案、接手与审核失败

需要从需求得到整体或模块的逻辑层、组件职责、依赖和目录→独立 `ff-architecture-derive`，详见[可选架构推导](docs/user/architecture-derivation.md)。Spec/Design按意图、规则/协作、外部变化、现有架构及代价动态推荐；简单默认跳过，复杂只给理由/未知/额外工作待选择，拒绝继续，实质新信息才再建议。主动调用直接按所选范围处理，无需重走Spec；与architecture-review独立，不自动实现或评估。结构经用户确认后在已有需求/设计/计划引用为实现参照，实质变更沿已有确认流程，不给层内细节加审批。
技术取舍 → ff-grill；关键技术假设未知 → 必要时 ff-prove；行为规格与已选结构引用 → ff-spec；逻辑架构方案 → 可选 ff-architecture-derive。ff-design 聚焦界面和视觉。ff-intake / ff-handoff 可单独执行受影响功能基线审查，仅在接手、核心替换或影响不明时需要；不扩成普通小改的全库盘点。
FAIL 按原因回澄清、技术实验、计划修正或意见裁决，不按失败次数切换，不默认全量回归；不同 change 不合并计数。

## 0.9.6 需求闭环增量

持续项目按[需求闭环契约](docs/maintainers/INTENT-LOOP.md)在同一载体提炼需求，以稳定 ID 关联子需求、模块、任务与验收。Intake 旧项目先观察并提供可跳过的未知对齐；Grill 分清探索和转向决定；Spec/Plan/Design/Prove/Implement 复用同一场景。Review 保持阶段末一次综合审查和局部复核。Deliver/Handoff 复用事实附[任务级使用评价](docs/maintainers/USE-FEEDBACK.md)，失败/中断也收集，深入 Retro 按需。不新增技能、运行时门禁或每消息仪式。

## 独立图示（引入时20技能）

软件图的创建、修改或审查 → `ff-diagram`，参考国内软件工程/系统架构设计常用要求及适用国标，按需处理架构、DFD、E-R、UML与流程图。可独立使用，不触发全FF或架构推导/评估；与现有技能组合时只支持当前授权产物。技能缺席不阻断原有工作。详见[图示使用说明](docs/user/diagrams.md)。

## 独立工作文档（当前21技能）

需求说明、方案、报价、报告等工作文档的新写或实质修订 → `ff-writing-document`：澄清读者、用途和质量相关缺口，先出章节目录，明确确认后再补正文，最后按读者任务检查。局部改字不重走整套流程。可独立使用，不强制 Spec 或全FF；不改变逐段共创文章的 ff-writing-shape / beats。绘图按需用 ff-diagram，Word/PDF 排版交格式工具。详见[工作文档使用说明](docs/user/writing-document.md)。
