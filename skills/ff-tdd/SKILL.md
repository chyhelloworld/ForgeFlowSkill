---
name: ff-tdd
description: 对获准切片按单个可观察行为执行真实 red→green，使用独立期望与真实接口；不强制全量测试或直接重构。
metadata:
  version: "0.9.2-goal.2"
---
# ff-tdd 0.9.2-goal.2

这是 ff-implement 内按需选用的方法，不是每项任务强制阶段。测试聚焦主要业务流程、复杂逻辑及本次变化风险，纯文案等不适用时说明即可。先复用有效规格、计划审核与用户已确认的测试边界；已有授权覆盖时不逐测试重新审批。边界不明确或超出范围才提出最小决定，未确认行为交 ff-spec。

读 [单行为循环与测试质量](references/test-loop.md)。明确一个可观察行为、真实公共接口/调用链及其能捕捉和不能捕捉的风险。期望来自规格、独立人工算例或已知正确固定值，不能从被测实现复制算法或即时生成“预期”。复杂跨调用者缺陷须覆盖真实触发链，不用浅层替身获得绿灯。

一次一个行为：写一个有意义的失败测试 → 实际运行并确认因预期行为缺失而 red → 最小实现 → 同一测试实际 green → 必要受影响回归 → 再选择下一行为。语法错误、零测试发现、环境缺依赖或不可运行不算行为 red；未运行标 NOT_RUN。不能先批量写全部测试再批量实现；已有测试意外全绿先核对其能否捕捉缺陷，不编造失败。

重构留到 ff-review 的审查建议与范围门控后，由 ff-implement 在已获准范围内实施并回归；ff-review 本身只读。不要在每轮 green 后扩展架构、顺手清理全仓或提前实现未来需求。循环输出引用现有任务的 red/green 命令、实际日志和代码版本，交独立审核；绿灯不等于主要旅程全部通过、用户接受或部署许可。

## OpenSpec 与 FF 有效性

遵循 [规格生命周期契约](references/spec-lifecycle.md)。所有 FF 子命令均通过项目本地 `node tools/openspec/ff-spec.mjs` 运行，工作目录为目标项目根；工具不在此相对位置时使用其真实路径，不回退到全局官方 CLI。仅允许 `init --tools none`，不刷新官方工具集成，`update` 拒绝；包名 `@forgeflow/ff-spec`、用户配置/数据命名空间 `ff-spec` 与官方入口分开，项目 `openspec/` 树仍兼容，这不是文件系统安全边界。现行规格只在 openspec/specs；活动 changes 保存差异和回执，Git 保存历史。按稳定 artifact ID、明确路径、排序内容指纹与依赖指纹判断有效性；review 必须绑定目标版本/内容及依赖。文件存在、任务勾选或旧审核均不自动代表 ready。status / instructions apply / validate / archive 共用 FF evaluator；apply 是实施指导，archive 正常路径同步规格并保存历史。不得继续写旧 spec-state.json，不自动导入旧接受或伪造 pass；取消/拒绝只能走显式 disposition+原因+决议引用的关闭路径，保留失败/未完成记录且不合入规格、不制造 pass。三类独立审核、真实主流程、CRAP ≤50（目标约10）、按需 Diagnose/TDD/Handoff 和既有权限边界保持不变。
