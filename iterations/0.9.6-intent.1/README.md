# 0.9.6-intent.1 阶段记录

唯一设计、计划、路线图与验收：[INTENT-LOOP-096](../../planning/INTENT-LOOP-096.md)。基线 `898b6ef`，分支 `work/intent-loop-096`，旧分支保留。未合并、推送、发布或升级实际安装。

| 阶段 | 状态 | 证据/下一步 |
| --- | --- | --- |
| 接手与设计 | PASS | 已核实工作区、版本、分支、实际全局规范与0.9.5安装；见设计记录 |
| T096-1～3 实现 | PASS（候选指引/格式已实现） | 10个闭环职责接线，17技能均能单独任务收尾；同源引用、关联示例与完整跨模块验收 |
| T096-4 确定性验证 | PASS（下列限定范围） | 3项结构、17技能格式、静态包/负向变异、v2回归、隔离双端分发 |
| 综合独立审查 | 初审FAIL → 局部复核PASS（限定范围） | 1项P2及3项P3关闭，无剩余阻断；原报告/修复版本见下方，不改签初审结论 |

本轮完成的是0.9.6候选能力实现，不代表真实宿主行为、用户接受或1.0成熟度通过。

## 改动与使用入口

- [公共闭环契约](../../docs/maintainers/INTENT-LOOP.md)：多轮提炼、来源覆盖、确认/事实/假设、转向影响、旧项目可选未知对齐、UX/架构/首片验证。
- [Spec内嵌模板](../../skills/ff-spec/references/intent-template.md)与[可读取合成例](../../examples/intent-loop-minimal.md)：总需求/子需求→模块→任务→验收的稳定多对多引用；进度和结果各指向原记录，不复制状态。示例明确局部PASS、整体FAIL。
- [使用反馈契约](../../docs/maintainers/USE-FEEDBACK.md)：任务末一次五维评价、最小问题记录、归并→最小改进→回归→真实复验。初审F1补齐了独立技能收尾，不强制调用Deliver/Retro。
- 包及17技能为 `0.9.6-intent.1`；未增技能、CLI命令、运行时、看板、数据库或审批门禁。0.9.5最小阅读、综合审查、局部复核保留；v1/v2及安装器源码未改。

## 验证与证据边界

| 类别 | 本次结果 | 可复核证据 |
| --- | --- | --- |
| 静态引用/格式 | 3/3结构测试；17/17 quick_validate；手册HTML生成及guide检查通过 | evidence/intent-structure.log、skill-*.log、guide-final.log；修复后结构检查另见independent-followup-structure.log |
| 包完整性 | 干净导出逐文件原始/提交字节一致，17技能、链接、版本及哈希校验通过；11项静态负向包用例通过；payload decoder 4/4 | evidence/candidate-pre*.json及*.log、package-mutations.log、payload-decoder.log；这些不是模型行为保证 |
| 旧运行时回归 | 7个来源文件与已有缓存逐字一致、运行时/依赖哈希核对；v2受控原生15/15 | evidence/runtime-source-equality.json、runtime-verify.log、trial-v2-native.log。未构建运行时 |
| 沙箱失败原件 | 首轮15项失败，首要可见诊断为schema读取异常；与受控原生结果分开 | evidence/trial-v2.log。未逐一诊断底层沙箱原因，不把首轮失败删除或重标PASS |
| 合成模型回答 | 7案实际作答，5案符合、2案表达不完整；F1单独Grill收尾局部合成回归另存 | [语义评分](behavior-evaluation.md)、evidence/independent-responses.md、independent-followup-response.md；一独立上下文，不是7个真实宿主，不是稳定性统计 |
| 隔离分发 | Codex/Claude skills-only各17技能、70引用检查通过；CLI预期BLOCKED | evidence/smoke.json、smoke-corrected.log；仅自有E盘fixture，不是升级用户安装或模型发现/调用 |
| 冒烟夹具纠正 | 首轮误将安装器既有入口替换当字节异常；仅纠正本轮临时夹具的明确期望，产品及既有回归断言未改 | evidence/smoke-initial-failure.md、smoke-initial.mjs、smoke.mjs；原失败为终端摘要，未伪称保存完整终端流 |

最终包以干净导出生成，包外回执位于 `E:/github/ForgeFlowSKill/_verification/intent-loop-096/candidate-final.json`；该回执包含最终payload摘要，避免把自身哈希写进自身产生循环。最终与冒烟包的可安装技能/安装器/CLI文件须逐字相同；收口证据和说明新增不改签旧测试输入。原始命令与阶段快照随 evidence 保存，完整夹具保留在上述E盘目录。

独立审查：[初审](evidence/independent-review-initial.md)绑定原快照，F1为唯一P2阻断；F2记录授权OR歧义、F3合成证据枚举、F4离线段落字面链接为P3。已按局部影响修复，不重跑全部合成例；[局部复核](evidence/independent-review-followup.md)确认F1–F4均关闭，三类限定结论PASS。作者评分及最终收口说明由实施者负责，不属于审查者初审语义范围。

## 未验证范围与下一步

真实Codex/Claude候选安装发现/加载/自动路由/模型调用：NOT_RUN。真实业务项目纵向操作、真人体验及接受、长期需求漂移/扩展收益：NOT_RUN。真实token/总耗时及相对0.9.5收益：缺失；不宣称节省。HTML做了静态生成/导航检查，未重新做浏览器视觉验收。没有重跑未受影响的全套安装器/Health/Resume回归。

生产运行逻辑未改，文案/格式CRAP N/A；新增结构测试辅助方法未采集同版CC/覆盖率，为NOT_MEASURED。继承 archive/validate 等既有复杂度债务未修，不宣称全仓达标。两项合成表达缺口（模块未知/引用需更显式、转向维护成本）保留观察，未靠追加永久门禁或反复抽样洗成全绿。

下一步在用户另行授权的真实任务中加载候选，先跑一条完整新项目/旧项目切片，关注上述两项表达缺口和任务级评价负担；确认实际质量/成本后再决定晋级或0.9.7，不提前合并、发布或更新安装。

## 本次FF使用评价

需求理解：符合｜AI推断｜与可信本轮摘录及R096-1～6逐项对应，用户对成品的反馈仍未知。设计：符合｜AI推断｜复用17职责和原有效性机制，无新运行时；真实体验未验证。交付：问题→已局部修复｜客观测量/独立审查｜F1收尾规则缺失及2案表达不足保留证据，不能概括为全部行为通过。变化适应：符合｜客观测量｜审查发现只局部改接线/示例，不重做运行时。成本：未知｜token与可靠任务总耗时缺失，不估节省。

I096-1：0.9.6-intent.1 / Codex本任务；目的为所有任务收尾可评估；期望独立技能也有完整最短规则，实际初版只在Deliver/Handoff/Retro有细则；影响R096-5，复现见F1；归因为本轮职责覆盖遗漏（有静态证据）。最小修复已完成，结构及单例合成回归通过，真实任务复验待进行，不新增永久门禁。

I096-2：同版本/宿主；目的为验证分发；期望比较正确安装内容，实际临时冒烟夹具忽略既有入口改写而失败；影响验证阶段，证据见smoke-initial-failure.md；归因夹具期望错误已核实。只改夹具，双端复验通过，不改产品。schema沙箱限制归并0.9.5既有环境现象，本轮保留失败与原生复核，不制造新的产品规则。
