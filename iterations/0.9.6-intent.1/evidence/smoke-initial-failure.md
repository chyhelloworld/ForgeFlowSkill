# 分发冒烟夹具首轮失败（终端结果摘要）

原命令：`node E:/github/ForgeFlowSKill/_verification/intent-loop-096/smoke.mjs`。原脚本保留为 smoke-initial.mjs。退出1，tool session 63782 的原始终端输出为 AssertionError，位于 smoke.mjs:25。

失败比较：已安装 spec-lifecycle.md 为15384字节，源码15396字节；diff显示 `tools/openspec/ff-spec.mjs` 被改写为 `.forgeflow/ff-spec.mjs`。原夹具错误要求所有引用原字节一致，遗漏安装器既有的项目入口替换。这不是0.9.6实现故障，也不是门禁被放宽。

核对实际 `tools/installer/source.mjs:skillPayload`：文本引用按既有约定替换该入口，其他字节应一致。只修本轮临时夹具的期望为该明确变换后逐字相等，保留17技能、所有引用存在/内容、版本和skills-only拒绝CLI断言；不改产品源码、既有回归断言或权限。重跑原两端隔离安装流程，结果另存 smoke-corrected.log / smoke.json。未记录的首轮完整终端流仍在任务工具输出，本文件是摘要，不称原始全量日志。
