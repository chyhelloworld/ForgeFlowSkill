# 独立限域审核

2026-11-11 UTC。基线 `15dfe8ec681d7772069295eb03257d45050baa6a`；审查本轮冻结的资源治理、分发绑定与 DSH 锚点增量，不对整个 PR 历史或生产发布签字。审核未修改实现、未调用外部模型、未删除用户已有文件。

## 结论

在可信、无并发写入的本次独占测试树这一明确边界内，未发现尚未解决的阻断问题。初审 R1–R3 已关闭；删除拒绝增量符合停止、不重试、不绕过、区分部分残留与未知的目标。此结论不等于原生 Windows、真实自动审批器或模型会话验证通过。

## 发现与修复复核

- **R1，已关闭（边界限定）**：初版 helper 在递归后才检查目录身份，目录被换为外链时可能先触及外部子文件。当前 `tools/installer/testing/workspace.mjs:49–74` 在目录读取前后、每次子项操作和删除前核对祖先/entry 身份，新增替换注入回归确认外部文件及原夹具存活。实现与 TEST-RESOURCES 明确 Node 路径 API 无 dirfd/openat 绑定，仍存在检查/使用窗口，不承诺恶意并发安全；存在外部写入可能时不得清理。
- **R2，已关闭**：`docs/maintainers/development.md` 已撤销清空整个 FF_TEST_ROOT 的旧指导，改用本次 run 生命周期与独立证据目录。wrapper 不扫描旧目录，不接收任意删除目标。
- **R3，已关闭**：`tools/workflow/test_lightweight_intake.mjs:4–10` 改用显式根的 helper，移除系统临时目录回落与无条件 after 删除，失败现场由统一规则保留。

## 删除拒绝与未知结果

`workspace.mjs:78–103` 将首次异常锁定在句柄上，再次调用抛同一错误而不重试。报告包含操作、目标、原因、已确认删除数和根存在状态。`CLEANUP_BLOCKED` 不等于证明所有文件完整；`CLEANUP_INCOMPLETE` 表示已确认删除且根残留；`CLEANUP_UNKNOWN` 不声称成功。runner 输出结构化错误并非零退出，没有换命令或后备删除流程。

模拟覆盖 EPERM、EACCES、blocked by policy、部分删除后拒绝及删除已完成但响应失败。文档明确真实 auto-review 若阻止 exec 启动，helper 未执行、不会产生回执，必须由调用方据工具结果报告拒绝；模拟不冒充审批器联通证明。

## 其他检查

- regularFiles 将 skip 应用于文件及目录，正确排除 .git worktree 指针与目录；未发现此次过滤修复扩大载荷范围。
- 四层短规则从统一 binding 注入 Codex/Claude/DSH 已激活技能，独立更新复用该路径。静态分发不证明宿主实际读取。
- DSH L3 限于重大取舍，允许有理由的 N/A；小任务不强造比较，已确认目标不重复确认。注册证据与真实会话证据分开。
- Windows 中文/空格、junction 与权限行为仍须原生验证；本次 Linux 测试不能替代。部分清理会丢失已删夹具，重要证据应留在树外。

## 独立运行证据

Linux、Node v24.22.1。独立运行 `node --test tools/installer/tests/resource-workspace.test.mjs`：**9 PASS，0 FAIL，0 SKIP**，退出 0。FF_TEST_ROOT 为验证区新建的独占目录，原始输出保存于 `../../../next-version-verification/independent-resource-DgSlwU/result.tap`；测试证据与残留保留，未执行整根清理。仅测试自身明确创建的合成文件在用例中被删除。

主实施者报告的完整 installer 107/107、其他 Node/workflow 结果及原生会话阻断不是本审核独立复跑结果；最终包应在加入本报告后重新打包核对。

冻结文件 SHA256：

- helper：`72280dda4540f893eec30656826bc50d7b6a0474d583b8fc5d7d438c7f23eff4`
- runner：`98c7b57fb14b94bb771277f4dcf65d4517b3703f570732c51b3c321b61ae030d`
- 资源测试：`1acb37afbdce49b7be8ed0e2d91d7203386d4157529471eef3d0d04b7b4dd256`
- source binding：`97011090df30d4aad89eed75ecb8e1cd9b9d04ebb5bcd54b0bc5e438611738d4`
- DSH index：`995955241e1416bd1da09de4afcc563a08644720e73fd2148a6cdd791241fbbf`
