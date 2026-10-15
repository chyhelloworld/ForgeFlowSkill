# 0.4.0 → 0.4.1 职责迁移

云端候选，未安装宿主；原0.4.0包不变。十二个技能的 metadata 统一0.5.0-rc1，历史来源快照保持原样。

- 新增 ff-diagnose、ff-tdd、ff-handoff 三种按需方法，原九主职责无强制步骤增量。
- Implement 在故障/适用测试驱动时选择 Diagnose/TDD；Review 仍独立只读，重构回 Implement。
- 原 Deliver 仍交付用户；暂停/换会话检查点可调用 Handoff，接收始终先 Intake 只读核实。
- 保留现有项目事实载体、记录0/1/2、主流程优先、三类独立审核、真实 CRAP ≤50/目标约10、Windows等目标平台未测边界及全部许可证。

安装另需指定宿主和路径授权；备份后更新原九技能及新增三技能，不能并存同名新旧副本。回滚恢复原九技能、原路由和用户修改，新增三项仅按实际安装清单撤回。不要移动现有项目规格/票/证据，不创建全局交接临时文件或自动新会话。历史迁移见 provenance/CHANGE-MAP-0.4.0-rc1.md。

## 0.4.1 to 0.5.0

Keep existing project state authoritative. For authorized projects adopting lifecycle tracking, map its current confirmed behavior into the minimal templates/spec-state.example.json shape; do not relabel proposals or implemented behavior as accepted. Copy only a project-specific record, replacing all example text and confirmation references. Run the read-only validator before any explicit apply/archive. No OpenSpec dependency or additional skill is installed. See SPEC-LIFECYCLE.md.
