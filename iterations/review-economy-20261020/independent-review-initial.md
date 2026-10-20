# 综合独立审查原始报告

审核者：`/root/comprehensive_review`。下文为其本轮完整结论（绝对路径链接改为仓库相对证据说明，内容与结论未强化）。

候选暂不通过。发现 **1 项 P2 问题**：用户手册仍保留无条件前置计划审核的旧入口，会重新引入本轮要减少的审核调用。其余已检查的核心规则、v2 契约和有限案例决策符合授权范围。

本次为一名独立读者的只读综合审查，未修改文件、运行业务测试、调用真实 Codex/Claude CLI 或模型、联网、安装或推送。

审阅版本为 `work/review-economy`，基线及 HEAD 均为 `88b449d987291d4e799d96137dc3459f63dc26cf`。比较采用该基线到实际工作区的直接差异，另核对未跟踪材料。指定快照 SHA-256 为：

`3a30098ae25c67064a93f4e49fd6028f74995e1e2a5ad4e4ebfaa8287df07487`

开始和结束时均核实快照中的 **58 份文件与实际字节一致**。这是原始审阅输入快照，不是 FF 通过回执。

**发现 F1：两个常用入口仍无条件要求前置独立计划审核。**

- 中文手册 docs/FF-中文使用手册.md:71：已有规格但缺票据时，要求“用 ff-plan，然后做独立 plan 审核”。
- 中文手册 docs/FF-中文使用手册.md:169：票据缺失或过期时，要求“进入 ff-plan，随后执行独立 plan 审核”。
- docs/FF-离线图文手册.html 同步包含上述两句。

这两个入口没有限定关键风险、用户额外要求或既有门禁，普通任务按入口阅读即可再次进入实施前独立审核，与新路由及手册其他段落冲突。虽然句子来自基线，本候选明确承诺消除这些冲突，仍须修复。

建议只修改这两个入口及同源 HTML：普通切片先自检，阶段末综合审查；关键风险、用户要求和既有门禁要求前置时先审方案。局部复核范围为这四处文本、其相邻分流说明及生成后的一致性，不需要重审全部技能或重跑 CLI 回归。

| 审查职责 | 当前结论 | 证据与适用限制 |
|---|---|---|
| goal-mainflow | **FAIL** | F1 导致面向用户的实际分流不一致。ROUTING.md、Review/Implement 规则及 A–G 演练本身符合目标；有限演练不证明真实宿主遵循率或 token 收益。 |
| plan | **PASS，限覆盖性** | planning/REVIEW-ECONOMY-20261020.md 覆盖触发、证据包、复核、文档同步、回归及独立审查；未扩大为调度或缓存框架。该结论不证明计划各步骤已完成，也不代替此前前置审核的执行证据。 |
| code | **FAIL，限本次文档实现** | F1 是交付规则的实现缺陷。已检查差异未修改 CLI、v2 evaluator 或测试逻辑；脚本变动为图示内容和检查结果说明。新增生产函数 CRAP 计量 **N/A**，不能外推历史计量通过。 |

未发现第二项需要阻断本候选的新增问题。三类结论不能相互平均抵消 F1。

候选保留了以下关键约束：风险不按行数或文件数判断；阶段以可独立验收的功能切片划界；修复复核覆盖共享依赖和消费者；新关键缺陷仍阻断；关键未知按原因分流；自检不冒充独立审核；不得通过轮次或 token 上限强制放行。v2 reviewRequired:true、progress、适用规则和依赖闭包仍保留，不能关闭门禁套用新默认。十二份生命周期契约副本与维护者原文摘要一致。

有限演练仅作流程决策，没有执行合成业务修改：

| 案例 | 下一动作与审查时机 | 必要原文、依赖及当前可得结论 |
|---|---|---|
| **A** | 继续同一切片的 T2、T3；完成空结果→清空→恢复列表的实际验证后，一次综合独立审查。T1 完成不触发单独审核。 | 读取 R1、批准文案、唯一计划、现有清空入口及查询接口。当前只能确认 T1 已自检；切片未完成，主流程和整体代码结论尚待验证。 |
| **B** | 暂停扩大实施；先修正规格、方案和验收，实施前独立审查核心替换及安全边界。若外部恢复机制存在技术未知，先做有判断标准的最小实验。 | 读取 R2、两种恢复实现、令牌来源和信任边界、调用者、配置与实际验收路径。一行差异仍属关键变更；R1 列表验收不能验证 R2，当前方案/验收不成立。 |
| **C** | 局部复核 F1 及 writer 影响链，补查 download 消费者和必要回归；S1 进入待办。拒绝“最多两轮即通过”。 | 读取原失败、cancel/finally/writer 实际修改、download 调用合同及原始测试输出。download 自身字节未改不能排除回归。当前是“修复已报告、受影响范围未充分复核”，不能整体通过。 |
| **D** | 使 G1 相关旧结论失效；更新 G2 的规格、计划、验收和绑定范围，因验收口径变化先独立审方案，再验证 export/download。 | 读取 G1→G2 确认来源、formats.json、适用 policy、依赖与旧证据。源码相同不足以复用。独立图标切片可保留，但须核实其目标、适用规则、输入和证据确实未受影响。 |
| **E1** | 转 ff-prove，对当前驱动/平台的原子替换行为做最小实验；阻止依赖该假设的导出结论通过，独立图标文案可继续。 | 需要驱动及版本、文件系统/平台、真实替换入口与明确成功/失败判据。“应该支持”是关键未知。 |
| **E2** | 回 Grill/澄清，消除“保留与删除”矛盾，再更新唯一规格及受影响计划。 | 读取同一份确认来源和约束，不能替用户任选或折中。当前需求冲突未决。 |
| **E3** | 回 Plan，为已确认取消行为补任务及验收映射，再自检覆盖性，并按适用风险/既有门禁安排审核。 | 读取确认取消要求、唯一计划和验收映射。当前计划覆盖 **FAIL**；不必把已确认行为重新包装为新需求。 |
| **E4** | 先裁决意见冲突；验收语义含糊时回来源澄清，再修规格、计划及相关审核。 | 读取两份原报告、同一验收原文和覆盖行为。不能平均意见后判通过，当前冲突仍阻断相关结论。 |
| **F** | 阻断该回归，交实现者修复显示名称与稳定 ID 的职责混用，再局部复核列表和审计导出影响链。 | 必须读 display-name、list、audit-export 及 CSV 字段合同。现有调用链已支持“匿名昵称进入 user_id”的缺陷判断，goal-mainflow/code **FAIL**；计划覆盖尚需计划原文。截图和单测不能抵消跨模块约束破坏。 |
| **G** | 实施前取得真实独立计划审核，完成当前有效绑定后才继续；阶段末综合审查可复用仍有效的计划结论。 | 读取 v2 policy/progress、实际计划、missing 回执、apply 阻塞及用户额外要求。当前前置未满足，禁止关闭 reviewRequired 或将自检写成独立 pass。 |

证据检查结果及限制：

- 独立运行只读 git diff --check，通过。
- 独立检查三张变化流程图：SVG 与 draw.io 文本对应、连接端点存在，HTML 精确嵌入相应 SVG；分别为 58、61、33 条文本。亲自查看三张 PNG，未见影响本次流程阅读的截断或重叠。
- 阅读原始日志：首次 trial 为 **15 失败**；原生复跑为 **15 通过、0 失败**。首次 workflow 为 **53 项、1 失败、1 跳过**；原生复跑为 **53 项、0 失败、1 跳过**，即 52 项通过。原失败没有被后续绿灯删除。
- workflow 的真实符号链接创建仍因 Windows 权限跳过，不能写成该项实测通过。
- CLI 固定构建复用的依据见 evidence/runtime-reuse.log；本审核没有重新构建或复跑这些测试，也没有独立重建全部运行时摘要来源。
- 未验证当前 HTML 的浏览器交互布局、真实模型行为或其他平台。分发包及安装证据由外层补证，不在本次源规则结论覆盖内，也未将尚待冻结的包认定为源逻辑缺陷。
- 历史真实模型/其他平台 **NOT_RUN**、build.mjs:removeGenerated **NOT_MEASURED**、继承 archive/validate 的复杂度债务继续保留；不得宣称全库 CRAP≤50。

阅读与耗时记录：开始 **2026-10-20T15:56:33Z**，结束 **2026-10-20T16:02:01Z**，共 **328 秒**；发现 **1 项**。实际 token **unknown**，没有同一真实业务任务的新旧流程对照，不能承诺节省比例。

为使阅读代理可复核，按“每次命令对同一路径的一次正文、diff 或搜索命中访问”计数：**106 个不同路径、175 次访问，其中重复访问 69 次**。包括编码纠正、输出截断后的定位重读；因此不是“全文精读了 106 份文件”。文件名清单及纯字节摘要校验不计入阅读次数。访问集合如下，花括号表示所列路径展开：

```text
README.md
ROUTING.md
package.json
planning/REVIEW-ECONOMY-20261020.md

docs/{build_diagrams.py,check_guide.py,guide-qa.json,
      FF-中文使用手册.md,FF-离线图文手册.html}
docs/diagrams/{new-project-workflow,existing-project-workflow,spec-lifecycle}.{drawio,png,svg}
docs/maintainers/{CODEX-GOAL-BRIDGE.md,development.md,SPEC-LIFECYCLE.md}
docs/user/capabilities.md

iterations/0.8/README.md
iterations/0.9/{README.md,PLAN.md,independent-review-initial.md,independent-review-final.md}
iterations/0.9.3-dual-host.1/{README.md,measurement/README.md}
iterations/trial-fixes-20261020/{README.md,evidence/trial.log,evidence/trial-native-result.json}
iterations/review-economy-20261020/{README.md,cases.md,source-snapshot.json}
iterations/review-economy-20261020/evidence/{guide.log,runtime-reuse.log,
    trial.log,trial-native.log,workflow.log,workflow-native.log}

skills/{ff-intake,ff-grill,ff-spec,ff-design,ff-prove,ff-plan,
    ff-implement,ff-review,ff-deliver,ff-diagnose,ff-tdd,ff-handoff,
    ff-research,ff-retro,ff-writing-beats,ff-writing-fragments,ff-writing-shape}/SKILL.md
skills/{ff-intake,ff-grill,ff-spec,ff-design,ff-prove,ff-plan,
    ff-implement,ff-review,ff-deliver,ff-diagnose,ff-tdd,ff-handoff}/references/spec-lifecycle.md
skills/ff-deliver/references/{goal-bridge.md,handoff.md}
skills/ff-design/NOTICE.md
skills/ff-design/references/{design-craft.md,journey.md,visual-direction.md}
skills/ff-grill/references/clarify.md
skills/ff-handoff/references/goal-bridge.md
skills/ff-implement/references/{continuity.md,evidence.md,goal-bridge.md}
skills/ff-intake/references/{goal-bridge.md,state-contract.md}
skills/ff-plan/references/{goal-bridge.md,slicing.md}
skills/ff-prove/references/design.md
skills/ff-retro/references/{ff-improvement.md,template.md}
skills/ff-review/references/{crap.md,health.md,reviews.md,visual-review.md}

tools/openspec/{README.md,ff-receipt.mjs,forgeflow.patch,trial.test.mjs}
validation/{independent-review.md,independent-review-0.4.1.md,
    intake-behavior-smoke.md,method-behavior-smoke.md}
validation/ff-spec-rc3/measure-rc3-crap.mjs
validation/installer/{measure-crap.mjs,REPORT.md}
validation/openspec-integration/{independent-review.md,measure-ff-crap.mjs}
validation/windows/measure-crap.mjs
```

没有权限拒绝或结果不明的写操作。剩余源规则阻塞仅为 **F1 待修及其局部复核**；本报告不授予合并、发布或真实安装授权。
