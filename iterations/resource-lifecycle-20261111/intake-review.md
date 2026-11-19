# 轻量任务与已有项目 intake/review 有界实证

## 结果与范围

三个隔离 fixture 在真实 Node 24.22.1 环境通过：小行为可直接运行入口且不依赖正式规格/计划文件；已有项目只读 adoption 预览不改原文件；缺少真实 evaluator 时明确拒绝求值。既有技能已支持这些边界，本轮不改 intake/review 规则，不给用户项目新增必需文档或阶段。

用户原话：“可以,现在你的电脑完成”。任务摘要：下一版资源生命周期、四层加载、DSH 锚点及轻量小任务/已有项目 intake-review 实证；本子任务不合并、不发布、不下载 full build。

这不是完整自动模型路由、全量原生宿主或整版产品验收，也不是用户接受。

## 当前仓库只读 intake

- 读取 ff-intake / ff-review SKILL、相关 state-contract、full-workflow、intent-loop、review-handoff、ROUTING 与评估/工具说明。
- 仓库：`/workspace/shared/ForgeFlow/next-version`；分支 `work/resource-lifecycle-20261111`；观察基线 HEAD `15dfe8ec681d7772069295eb03257d45050baa6a`。实际查看 Git status/diff，安装器、DSH 等并行 dirty/untracked 内容未改动或清理，HEAD 不代表它们的版本。
- 本次内联目标/验收和单条测试任务映射 valid。无根目录 openspec/、policy、回执或 tools/openspec/.build，记 missing；真实 FF gate 有效性 unknown，不能凭文件存在或任务勾选判 ready。其他并行改动与整版计划覆盖未审。
- 本切片下一职责是有界 Review，不需补造规格/计划。真正已有 policy 而回执缺失的项目必须核对生命周期/原始证据，不能删门禁、补签或因“小任务”降级。

## 最终可重放命令与实际结果

先创建一个本次专用的现存绝对目录，再运行：

```sh
FF_TEST_ROOT=/workspace/shared/ForgeFlow/intake-validation-20261111 \
  node tools/installer/test-workspace.mjs --clean-success tools/workflow/test_lightweight_intake.mjs
```

2026-11-11 UTC 实际输出：

```text
Test workspace: /workspace/shared/ForgeFlow/intake-validation-20261111/ff-run-g4N8y7
✔ small confirmed behavior runs at its entry without formal spec or plan files
✔ existing project adoption preview preserves artifacts, unrelated notes, and existing policy bytes
✔ missing real evaluator reports inability to evaluate instead of synthesizing valid receipts
ℹ tests 3
ℹ pass 3
ℹ fail 0
{"status":"REMOVED","directory":"/workspace/shared/ForgeFlow/intake-validation-20261111/ff-run-g4N8y7"}
exit 0
```

1. `hello.mjs` 的真实进程入口接收无参数、` Lin `、空白参数，stdout 分别为 `Hello!\n`、`Hello, Lin!\n`、`Hello!\n`，exit 0、无 stderr、没有 openspec 树。confirmed 是 fixture 前提，不是用户确认来源断言，也未调用模型路由器。
2. `adoptMain(null, ['--json'], ...)` 读取已有 design、已勾选 tasks、review-required policy、无关笔记，返回 `written=false`、仅 design 候选、`progress=false`、无 validity preview。候选 policy 不是原 policy 的有效性结论。fixture 没有 Git 索引，不冒称验证 dirty/untracked Git 语义。
3. `statusOverview(null, ['--strict', '--json'], ...)` 未注入假 evaluator，返回 1、stdout 空、stderr 含 `status requires the bundled build to evaluate gates`。策略未送入 evaluator，不能替代真实 gate 对无效策略/缺回执的拒绝测试。

**三案的执行前后全部 fixture 文件字节相同断言在最终 runner 重跑中仍通过。** 最终测试用 `createFixtureDirectory` 强制显式 FF_TEST_ROOT，不自清理；runner 仅成功且身份凭证仍匹配时清理。此次返回 REMOVED，检查专用父目录为空后以 rmdir 移除父目录。没有扫描或清理历史目录。

## 修复及审查边界

初始测试曾使用 os.tmpdir + test.after 无条件删除自己的 fixture。上层审查指出失败现场也会被删除，不符合本轮资源生命周期要求；已改为统一 workspace helper/runner，并以上述最终命令复验。初始运行与初始独立审查不冒充最终资源生命周期结论。

首次独立新上下文读取真实仓库/技能及 ff-adopt/ff-status 调用链并自行运行初始测试：goal-mainflow 与单条 plan 映射在限定范围 PASS，code 未发现功能阻断问题；CRAP NOT_MEASURED。此结论只适用旧测试 hash `66bc51189c5a1859e247e35b5819132d947839eaf2f5d1a0800862b49767ff6d`。同一审查者已完成第 2 轮局部复核，限本条测试资源生命周期通过，不作为第二次独立首审。读者明确纠正首审漏识别无条件清理风险，以本轮修复为准；源码核对显式绝对根、成功清理、失败/信号/.ff-preserve 保留及身份核验，复用上述实际成功运行。失败现场保留在本次复核中仅做源码检查，未另造失败实测。

仍未执行：full launcher/build validity、真实回执判定、宿主安装/发现/加载、归档、跨平台和完整下一版验收。缺 full build 不下载，不签有效性或接受回执。

## 最终版本绑定

- 测试 SHA256：`8f22fe034d969bdf552d23ac1a0ad6c95fae9d1e463d94eae65f1b9614fa9353`。
- ff-adopt.mjs SHA256：`a400d68edd309b4ebbe0270a0411306246894a0839aa406fa4d25e31b9fa6e33`。
- ff-status.mjs SHA256：`d97a432b4f20ec9ccd7c9a9c608b786903fb3855c7e7b66379c4e0b3668f7ca4`。
- 独立读者读取的 intake/review SHA256：`0f478f42360cd2ec120883c6099030b37ec27ddb0ade9ed7709e1cbcf943a2e7` / `93dc3d55205fc13311d32c4e194e74eaf02bfbe5f76be0d73d72b18a44955871`。并行版本更新不扩大为冻结全包结论。

本轮清理复核绑定：testing/workspace.mjs `82f8d6b8a29ce6db41acceb11612041aed75f11f7f04fd22b72403d58581af11`；test-workspace.mjs `8a8f697ff9f8302ec3e4bd8e263d80883e42bb653c3b94dac14e518339a8940a`。
