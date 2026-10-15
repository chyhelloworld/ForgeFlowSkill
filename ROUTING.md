# ForgeFlow 0.5.0-rc3：薄路由

此文件供宿主既有指令引用，不是额外技能或强制流水线。先复用有效产物，只调用当前缺口需要的职责。

1. 新项目、存量项目接入或恢复：ff-intake 只读核对实际状态、规格/任务有效性和权限，指出缺口。
2. 按缺口选：目标取舍→ff-grill；确认行为/范围/约束/验收→ff-spec；视觉方向→ff-design；真实交互/技术未知→ff-prove；纵向切片与依赖→ff-plan。
3. 有效计划在实现前由 ff-review(plan) 独立审核；已有有效审核直接复用。实施已获准且前置可用→ff-implement。
4. 形成变更后按适用范围独立 ff-review(goal-mainflow / code)，缺陷回原负责人修正、复核；ff-deliver 汇总有效证据、条件性 PR 与交接。

中途变化只修受影响链：确认来源→规格/设计/方案→任务及已完切片→证据和用户接受失效→最小复验，保留无关有效结果。简单修复可内联短规格+单条任务，无需新文件、全部十二技能、固定票数或提前 PR。技术 ready 不授予权限，测试绿灯和技能模拟评估不等于用户接受。独立性缺失必须明示，不角色扮演通过。

## 三个按需方法（共十二技能）

- 实际故障/性能回归 → ff-diagnose；需修代码回已获准 ff-implement，适用回归测试交 ff-tdd，随后按适用范围独立 Review。
- 实现阶段适用测试驱动 → ff-tdd，单行为真实 red→green；不要求所有任务 TDD 或批量全测试先行。
- 暂停/换会话/换执行者 → ff-handoff 交出短项目内检查点；接收 → ff-intake 核对真实状态 → 当前所需职责。用户交付仍 ff-deliver。

九个主职责保持选择性使用，三个方法不是附加必经阶段；无故障不做 Diagnose、无适用测试不做 TDD、无交接需求不做 Handoff。

## OpenSpec 原生接入

FF 命令统一在目标项目根运行 `node tools/openspec/ff-spec.mjs <子命令>`；工具位于其他 checkout/嵌套目录时使用实际相对/绝对路径，不回退到全局官方 CLI。包名 `@forgeflow/ff-spec`、可执行名 `ff-spec`，用户配置/数据命名空间 `ff-spec`。仅允许显式 `init --tools none`，不刷新官方工具集成，FF `update` 拒绝；十二个技能单独安装。官方 CLI 有文件系统权限时仍能改兼容的 `openspec/` 树而不执行 FF gate，这不是安全边界。

启用 FF 的项目只读 openspec/specs 作为现行规格。Intake 先查活动 change 与 status 的 ffValidity，按缺失/过期原因路由；不要仅凭文件存在跳到 Implement。Review 绑定目标和依赖指纹；通过 gate 仍需真实授权与接受。instructions apply 不是规格合入；archive 正常路径同步 specs。取消/拒绝按真实决议走显式 --ff-disposition + 原因 + 决议引用的原生关闭路径，保留未完成/失败记录且不合入 specs；不能改成 pass。旧 spec-state 只供历史审计，不再写入。
