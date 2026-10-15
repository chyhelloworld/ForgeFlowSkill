---
name: ff-review
description: 独立审核 ForgeFlow 计划、目标与主流程、代码规范，分别给出可复核结论；用于实现前计划审核和变化后的质量核查，只读不修代码。
metadata:
  version: "0.5.0-rc3"
---
# ff-review 0.5.0-rc3

选择 review_kind=plan | goal-mainflow | code。这是职责标签，不是承诺存在 CLI 参数。三类结论相互独立；小改可一位真正独立审核者覆盖适用项，不强制三人或三份长文档。

读取 [审核规则](references/reviews.md)，代码计量再读 [CRAP 数据与边界](references/crap.md)。拿原始用户目标/最新确认、现行规格/计划、冻结代码差异和原始证据；不先喂实现者“通过”结论或预期答案。独立子代理或真正新上下文只读核查；宿主不支持时标独立性未满足，角色扮演和作者自检不能冒充独立通过。

- plan：实施前，以及需求/关键依赖变化后，核对目标追溯、MECE、不重不漏、纵向切片、真实依赖及可执行验收。有效既有审核可复用；不必等实现结束才审计划。
- goal-mainflow：在相关切片完成和整合时，从核心目标检查真实主要业务流程、遗漏/越界及跨模块约束。静态存在、单测或代码规范不能证明主旅程走通。
- code：可审差异形成后检查项目规范、职责、重复、耦合与可维护性。逐函数/方法 CRAP 硬上限 ≤50，优化目标约10或更低；只用同版本真实 CC 与覆盖率计算，缺数据 NOT_MEASURED，不能捏造或拿估计值充通过。纯文案无逻辑变化可说明 N/A，不扩大成无关全仓重构或刷测试。

每类输出结论、版本、直接/引用证据、缺口与下一步；PASS/FAIL/待验证/有理由的 N/A 分开。发现交实现者或相应规格/计划负责人修正，再独立复核影响范围。未知不能平均掉，主流程失败不能用另外两类通过抵消。只读审核不批准合并、部署或替用户接受。

方法专项核查：Diagnose 的症状复现与因果证据、TDD 的独立期望/真实调用链/实际 red→green 不能以模板代替。重构建议需说明变化范围、风险和回归入口，交 ff-implement 在已有授权内执行；超范围先确认，本审核职责仍只读。

## OpenSpec 与 FF 有效性

遵循 [规格生命周期契约](references/spec-lifecycle.md)。所有 FF 子命令均通过项目本地 `node tools/openspec/ff-spec.mjs` 运行，工作目录为目标项目根；工具不在此相对位置时使用其真实路径，不回退到全局官方 CLI。仅允许 `init --tools none`，不刷新官方工具集成，`update` 拒绝；包名 `@forgeflow/ff-spec`、用户配置/数据命名空间 `ff-spec` 与官方入口分开，项目 `openspec/` 树仍兼容，这不是文件系统安全边界。现行规格只在 openspec/specs；活动 changes 保存差异和回执，Git 保存历史。按稳定 artifact ID、明确路径、排序内容指纹与依赖指纹判断有效性；review 必须绑定目标版本/内容及依赖。文件存在、任务勾选或旧审核均不自动代表 ready。status / instructions apply / validate / archive 共用 FF evaluator；apply 是实施指导，archive 正常路径同步规格并保存历史。不得继续写旧 spec-state.json，不自动导入旧接受或伪造 pass；取消/拒绝只能走显式 disposition+原因+决议引用的关闭路径，保留失败/未完成记录且不合入规格、不制造 pass。三类独立审核、真实主流程、CRAP ≤50（目标约10）、按需 Diagnose/TDD/Handoff 和既有权限边界保持不变。
