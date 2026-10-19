---
name: ff-diagnose
description: 定位实际故障或性能回归，建立可重复失败信号与有证据的原因；不替代实现、审核或扩大调试权限。
metadata:
  version: "0.9.3-dual-host.1"
---
# ff-diagnose 0.9.3-dual-host.1

按需调用的诊断方法，不是必经阶段。先读最新目标、用户原始症状、项目 GLOSSARY/ADR（若有）、授权环境与当前版本。未知目标先回 Grill/Spec；不要用附近异常替换用户问题；无关配置、导入或fixture错误不算用户症状的复现。诊断结论和证据引用回现有任务，不另建事实库。

读 [诊断反馈与证据](references/diagnosis.md)。先构建一个到达真实故障调用链、断言用户实际症状的 red-capable 命令，并至少实际运行一次，保存脱敏调用、输出、版本及时间。无工具或无法复现时标 NOT_REPRODUCED / UNKNOWN，列已尝试与所缺环境/输入；不得宣称原因已证实或修复通过。可做有限只读排查以构建复现，不凭猜测实施未经验证的修复。

缩成仍能触发同一症状的最小可行用例，每次只删一项并重跑；成本高时明确剩余范围和局限，不为“完美最小”无限停滞。复杂问题提出少量有区别、可证伪的候选与预测，逐个单变量验证；明显简单缺陷不硬凑3–5条。性能问题先记录可比基线与条件，再测量定位。关联不等于因果；只报告证据支持的置信范围。

有正确回归接口时将复现交 ff-tdd，按真实 red→green 修复；实际改代码由已获准 ff-implement 承担，先满足有效规格/计划与计划审核。没有覆盖真实调用链的 seam 就报告缺口，不用浅层单测冒充锁定。修后重跑原始场景、回归与受影响主流程，清理本轮临时探针。把原因、证据、未证项交 ff-review 独立核查，最终汇总由 ff-deliver。

## OpenSpec 与 FF 有效性

遵循 [规格生命周期契约](references/spec-lifecycle.md)。所有 FF 子命令均通过项目本地 `node tools/openspec/ff-spec.mjs` 运行，工作目录为目标项目根；工具不在此相对位置时使用其真实路径，不回退到全局官方 CLI。仅允许 `init --tools none`，不刷新官方工具集成，`update` 拒绝；包名 `@forgeflow/ff-spec`、用户配置/数据命名空间 `ff-spec` 与官方入口分开，项目 `openspec/` 树仍兼容，这不是文件系统安全边界。现行规格只在 openspec/specs；活动 changes 保存差异和回执，Git 保存历史。按稳定 artifact ID、明确路径、排序内容指纹与依赖指纹判断有效性；review 必须绑定目标版本/内容及依赖。文件存在、任务勾选或旧审核均不自动代表 ready。status / instructions apply / validate / archive 共用 FF evaluator；apply 是实施指导，archive 正常路径同步规格并保存历史。不得继续写旧 spec-state.json，不自动导入旧接受或伪造 pass；取消/拒绝只能走显式 disposition+原因+决议引用的关闭路径，保留失败/未完成记录且不合入规格、不制造 pass。三类独立审核、真实主流程、CRAP ≤50（目标约10）、按需 Diagnose/TDD/Handoff 和既有权限边界保持不变。
