# 0.4.0-rc1 变更映射

基线：ff-workflow-skills-0.3.2-rc1，保持未改。将五个较宽职责拆为九个可独立选用技能，遵循 Matt 风格单一任务边界而非照搬固定流程。

新增 Intake/Spec/Implement/Review；收窄 Deliver；Plan显式交独立计划审核；Grill下游路由更新。Design/Prove内容及Grill澄清/记录参考保留，仅更新相关职责路由和包版本。原 Deliver证据/恢复移至Implement，审核/CRAP移至Review，用户接受/交接保留Deliver。全部既有来源快照、许可证、变更来源保留；历史职责快照另存provenance/baseline-0.3.2。新增内容是ForgeFlow本次综合设计，不宣称出自上游。

统一入口仅做实际状态接入和必要路由；不强制九步。旧产物可复用，小修可短规格短任务，PR按仓库流程和授权条件进行。增加缺规格、过期任务、已有有效计划、中途变化、小修五种重放场景；静态检查不等于行为评估，均不代替真实用户验收。
