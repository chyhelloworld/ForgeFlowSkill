# OpenSpec × ForgeFlow 整合：独立实际云端 E2E

日期：2026-10-15。环境：云端 Linux，真实 Node CLI、真实文件系统、真实 Git；没有远端上传、发布、部署或主分支合并。

## 当前结论

交付前新增 canceled/rejected 兼容性回归已在最终重建包上完整复跑：40 项终止关闭断言，加原有 85 项全部通过。上一候选 85/85 单独保留，不替代最终结果。

最终分发包重建的 CLI `1.14.2-ff.0.5.0-rc2` 已完成 **125/125 独立黑盒断言、94 条实际命令**。旧 Python 写入器退休另测 **11/11 断言**。两类结果分开计算，不把历史测试、模拟审阅或 Git 能力算作新 CLI 的语义验收。

分发包来自 repository/tools/openspec/.build，测试启动与结束的 evaluator/archive/ff-close 源文件与编译文件 **6/6 SHA256 完全相同**，确认本轮没有混用并发重建版本。独立完整性结果见 package-terminal-integrity-check.json。

## 实测范围与结果

1. **12 个稳定工件身份**：proposal、spec、design、plan、tasks、review、handoff 七类 Markdown，及 draw.io、SVG、PNG、HTML、JSON 五类。实际文件数超过身份数：spec 同时绑定 current 与活动 delta，JSON 为多文件集合。中文与空格项目/文件路径真实执行通过。
2. **两次修改**：连续修改 proposal 后，规格、设计、计划、任务、审阅、交接的传递依赖失效；apply instructions 返回 blocked，validate 和原生 archive 拒绝。明确重建合成审阅绑定后恢复可校验。没有把刷新哈希称为产品审阅或用户接受。
3. **门禁不可由常见标志绕过**：缺失审阅时 `archive --yes --json`、追加 `--no-validate`、追加 `--skip-specs` 均 exit 1。拒绝审阅、过期目标 hash、错误版本、错误 evidence hash、错误依赖输入、空 reviewer 和未知 verdict 也拒绝。
4. **fail-closed**：缺失/破损 manifest，缺失工件记录，空审阅文件，删除或覆盖 canonical，破损 policy，循环/未知依赖，空工件列表，残留 manifest 而 policy 被删，均拒绝。
5. **文件集合及 schema 绑定**：JSON 新增、删除、重命名均使记录失效；一个 glob 有匹配而另一个 glob 无匹配不能静默放行。只修改实际解析的 OpenSpec schema、不改 FF policy，也检测 schemaHash 变化并拒绝旧记录。status/apply 显式传入不同 --schema 同样被阻止，且没有写入。
6. **失败不变**：45 次 native archive 拒绝均比较执行前后完整文件树，SHA256 与路径集合完全一致。其中包括 FF 记录有效、原生 spec delta 无有效 baseline 的失败，不只测试 FF 提前退出。
7. **成功归档**：标准 OpenSpec current spec 更新为两人审阅。活动变更目录归档后 **19/19 文件逐字节相同**；generic current 文档的路径和字节未自动移动、复制或提升为另一套真源。
8. **默认模式**：移除 FF policy 与 manifest 后，默认 status 与 native archive 成功；无 FF 采用时没有强加新的审阅门禁。
9. **Git 历史**：真实创建初始与两次编辑提交，隔离 `git clone --no-local` 后用首次提交 restore，恢复文件树与初始完整 SHA256 集合相同。完整中间历史、diff、回滚来自 Git。
10. **显式终止关闭**：canceled 与 rejected 各自以不完整/拒绝审阅及无效 delta 测试。两种关闭都成功、current specs 完全不变、各自 20/20 原文件字节保留，仅新增 ff-disposition.json；原审阅没有被伪造成通过。缺 reason/decision-ref、缺或非法 disposition、已有 receipt、未采用 FF、已有共享 archive lock、混用 --no-validate/--skip-specs、重复关闭全部拒绝且无写入。普通 archive 仍拒绝相同夹具，不能暗中关闭。decisionRef 只是记录引用，不认证真实决策。
11. **退休写入器**：validate 只读；apply/archive 返回明确 retired 拒绝且无写入；模块 transition/atomic_write/mutate 入口同样拒绝且文件树不变。

## 证据

- 实现前独立计划：CASE_PLAN.md。
- 初轮、旧合同开发构建：run-01，72/72。此轮没有 schemaHash 最终合同，不能替代后续结果。
- 最终合同开发构建：run-02/summary.json、commands.json、checks.json；81/81、75 条命令、30 次拒绝前后完整哈希相同。
- 上一候选分发包：run-03-packaged/summary.json、commands.json、checks.json；85/85、77 条命令；package-start-hashes.json 与 package-end-hashes.json 固定测试版本。
- 最终含终止关闭的分发包：run-04-terminal-packaged/summary.json、commands.json、checks.json；125/125、94 条命令，45 次 archive 拒绝及无写入断言。package-terminal-start-hashes.json 与 package-terminal-end-hashes.json 固定 6 个关键源码/编译文件。
- 退休写入器：初轮 legacy-run-01；最终再验 legacy-run-02-final/commands.json 与 checks.json，11/11。
- 重放脚本：run_trial.py、harness.py、probe_legacy.py、legacy-input.json；README.md 给出无需联网的全新目录用法。
- 实际 V8 覆盖：开发构建 final-coverage、上一候选 final-packaged-coverage、最终含终止关闭包 final-terminal-packaged-coverage，交由实现者映射函数并单独报告覆盖/CRAP；本报告不凭通过断言数捏造覆盖率。
- 新上下文 skill 接手：fresh-handoff 独立案例；由另一执行者另行评估，不混入 CLI 断言数。

## 能力边界

这些结果证明路径/字节指纹、依赖传播、schema 与审阅记录绑定及原生 CLI 的一致拒绝机制。不能证明 reviewer 身份、证据真实性、图形/PNG/HTML 内容语义正确、用户接受、真实产品主流程、所有磁盘错误下事务原子性、恶意并发写入安全、Windows 本机兼容或 GUI 原生安装。

审阅凭据均明确为合成夹具，不能用它们代替真正验收。归档凭据保存当时状态，不应把已归档记录重新当作最新 current 的通过证明。默认非 FF 模式保持原行为，因此组织仍须明确采用 policy；本机制不是跨仓库防篡改系统。
