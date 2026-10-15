---
name: ff-intake
description: 只读核对 ForgeFlow 新任务或存量项目的真实状态、规格与工作票有效性，选择当前需要的职责；不写规格、不拆票、不实现。
metadata:
  version: "0.6.0-experimental.3"
---
# ff-intake 0.6.0-experimental.3

先读现有项目约定、用户最新目标/确认来源、授权边界、规格与计划，再查实际工作区/代码/未跟踪文件、相关运行证据和任务状态。没有源码或工具访问就标 unknown，不把口述完成当实际完成。

只读产出短接入结论：目标和来源；现有产物位置/版本；规格、计划、设计与证据各为 valid / stale / missing / unknown 及理由；真实完成/部分完成/未开始/受阻；当前需要哪个职责及其最小输入。不创建或改写任何工程产物、任务状态或讨论记录。

按缺口路由，不按固定步骤顺序：
- 目标/取舍尚不清楚 → ff-grill；确认行为/范围/约束/验收尚未形成可靠规格 → ff-spec。
- 已有代码而缺规格：先从实际入口与证据提取候选行为，交 ff-spec；代码只是事实，不能自动升格为用户确认要求。只问无法查明的取舍。
- 视觉方向真有缺口 → ff-design；影响方向的交互/技术未知 → ff-prove；有效规格但缺票/票过期 → ff-plan。
- 有效规格与有效计划、计划独立审核有效、必要验证入口可用且实施已获准 → ff-implement，跳过不需要的澄清/原型/重规划。
- 有效计划缺独立审核 → ff-review 的 plan 审核；已有实现待核 → ff-review 的 goal-mainflow / code；仅待交接 → ff-deliver。

阅读 [状态与证据契约](references/state-contract.md) 处理接手、暂停恢复或中途变更。只指出失效影响及更新责任，不替其他职责写产物。很小的明确修复可用内联规格与单条任务，不要求新文件。readiness 不等于 authorization；状态未知先核查，不能猜测命令已结束或重复启动有副作用的操作。

若收到 ff-handoff 检查点，先对照实际版本、dirty/untracked、部分输出和可观察进程，再判断 valid/stale/missing/unknown；不能只凭交出者叙述盲续。故障定位缺口选 ff-diagnose，已获准实现内的测试驱动选 ff-tdd；它们是按需方法，不是追加固定步骤。

## OpenSpec 与 FF 有效性

遵循 [规格生命周期契约](references/spec-lifecycle.md)。所有 FF 子命令均通过项目本地 `node tools/openspec/ff-spec.mjs` 运行，工作目录为目标项目根；工具不在此相对位置时使用其真实路径，不回退到全局官方 CLI。仅允许 `init --tools none`，不刷新官方工具集成，`update` 拒绝；包名 `@forgeflow/ff-spec`、用户配置/数据命名空间 `ff-spec` 与官方入口分开，项目 `openspec/` 树仍兼容，这不是文件系统安全边界。现行规格只在 openspec/specs；活动 changes 保存差异和回执，Git 保存历史。按稳定 artifact ID、明确路径、排序内容指纹与依赖指纹判断有效性；review 必须绑定目标版本/内容及依赖。文件存在、任务勾选或旧审核均不自动代表 ready。status / instructions apply / validate / archive 共用 FF evaluator；apply 是实施指导，archive 正常路径同步规格并保存历史。不得继续写旧 spec-state.json，不自动导入旧接受或伪造 pass；取消/拒绝只能走显式 disposition+原因+决议引用的关闭路径，保留失败/未完成记录且不合入规格、不制造 pass。三类独立审核、真实主流程、CRAP ≤50（目标约10）、按需 Diagnose/TDD/Handoff 和既有权限边界保持不变。

## 跨会话决策恢复（按需）

跨会话或复杂取舍容易丢失原始目标时，按 [决策索引契约](references/decision-index.md) 使用同一权威记录的轻索引。简单任务跳过；不新增技能、状态库或授权。Intake 只读，不创建或维护索引。
