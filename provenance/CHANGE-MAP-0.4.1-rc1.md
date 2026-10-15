# ForgeFlow 0.4.1-rc1 变化映射

基线：0.4.0-rc1 已有简短诊断/TDD/交接约束，本轮展开为可独立调用的专项方法；新增三个按需方法，共十二技能。当前为云端候选，未安装原生宿主。

| 方法 | Matt 固定来源 | ForgeFlow 改编 |
|---|---|---|
| ff-diagnose | engineering/diagnosing-bugs | 真实用户症状、已运行红信号、缩减、单变量和性能基线；明显小错不硬凑3–5假设，无复现不能宣称原因；不扩大调试权限 |
| ff-tdd | engineering/tdd + tests.md + mocking.md | 单行为红绿、独立期望、真实接口；复用获准seam、不逐测试审批，不全量测试先行；重构在Review建议和范围门控后回Implement |
| ff-handoff | productivity/handoff | 短摘要+引用；改为已授权项目内位置，遵守记录模式，不全局temp、不自动新会话；接收Intake核实实际状态 |

路由、Implement/Intake/Review/Deliver 相互衔接；原九职责与原来源许可证保留。加入 E12–E18 重放模板和静态负向变异检查；模板未执行不能称行为通过。静态结构、模拟上下文行为、原生集成、项目验收、用户接受分别报告。

新增来源快照与哈希见 provenance/sources.json；具体映射见 provenance/execution-method-change-sources.json。历史变更记录在 provenance/CHANGE-MAP-0.4.0-rc1.md。
