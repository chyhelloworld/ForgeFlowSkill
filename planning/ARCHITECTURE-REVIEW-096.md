# 0.9.6 可选架构评估入口

用户确认（2026-10-23）：小 demo 没必要，复杂项目由 AI 推荐但不强制；讨论独立命令后明确“直接加入0.9.6”。本轮实现独立 `ff-architecture-review` 技能，设计流程只推荐；不对当前 FF 项目开展全面架构评估，不改主线/真实安装或 FF CLI 门禁。

分支 `work/architecture-review-096` 从 `da0ce532332dc56da96bd399afa50019a0da5bf7` 建立，包含 intent-view；它的父提交是 handoff 修复 `8b9858aa8795d83ea33881b3d8c2e1ef40cce6b8`。review-contamination、handoff-validation、small-task-trial 等旁支不是本次集成来源。候选版本 `0.9.6-architecture.1`，按仓库约定同步全部技能元数据，固定 CLI 版本不变。

## 目的、映射与最小设计

| 需求 | 责任/边界 | 验收 |
| --- | --- | --- |
| AR-1 独立可选入口 | 新技能负责有界架构比较；Design/Spec 只推荐，用户主动调用即选择，不重复开工确认 | 小 demo 跳过；复杂项目仅推荐待选择；拒绝继续；主动选择才分析 |
| AR-2 共享质量场景 | 新技能自带一份按需参考：需求引用与六要素、按需 SAAM/ATAM/CBAM 视角、现状替代与假设实验 | 不三套串行，不称正式认证；缺数 unknown，不编 ROI；输出简短决策与证据 |
| AR-3 可分发及兼容 | 沿用 skills/agents 布局；名录加入第18项，旧17项状态可读；不新增命令引擎或状态schema | 静态引用/manifest/payload；隔离 skills-only 分发到两种宿主目录；旧名录及缺失/错误名录反例 |

单条任务 AR-T1：入口/推荐指针→本地参考→名录登记与文档→静态及固定合成样例→一次综合检查→候选打包/本地提交。技术方案在现有 ff-spec，视觉在 ff-design，各加短推荐指针，避免把技术评估强塞视觉流程。支持 `$ff-architecture-review`，支持斜杠技能的宿主可用 `/ff-architecture-review`；没有新增 `ff-spec` 子命令。

普通小 demo 默认不建议/不读参考。复杂或跨模块、多质量属性冲突、难回退决策只先说明收益、预计额外工作和视角，询问用户；未答不分析。用户拒绝/跳过不构成门禁失败，也不反复劝说；实质风险变化可说明新理由再建议。已有安全、权限、数据完整性、必要审查独立保留。

验证边界：结构检查不是模型行为；固定合成样例不是实际项目评估；隔离目录分发不是宿主原生加载。所有临时导出、fixture 和原始回执放 `E:/github/ForgeFlowSKill/_verification/architecture-review-096-20261023`，不写 C 盘，不建立付费调用或新增权限。保护初始快照 baseline.json。完成入口、必要分发与有界验证后停止；用户接受待反馈。

## 实际交付与证据（2026-10-23）

AR-T1 已实现。AR-1/2 对应新技能及其唯一场景参考，Design/Spec 只加推荐段；AR-3 对应 source/state 的确切名录、包校验和隔离分发测试。现有名录原先固定17项，因此必须同步登记第18项；保留旧17项记录读取与回滚，没有新增运行时命令、状态schema或评估引擎。

首次冻结导出 `candidate/` 的 MANIFEST SHA256 为 `b1383555f3df723cdc39d50d09a7ebc19bf84b061c861e7811c0926bb89e3af6`。`checks-initial.json` 保存真实命令、退出码和时间：静态校验18技能/132引用/1281清单文件/38场景；新分发测试4项、既有定向安装测试5项、载荷测试4项、意图分发契约3项，共16项通过。隔离技能安装分别写入 Codex/Claude 目录并重入；skills-only 的运行门禁保持 BLOCKED，这不是 full 或原生宿主通过。

`legacy-upgrade.json` 记录旧 handoff.1 真载荷在一次性项目中从17项升级为双宿主各18项，再回滚恢复17项、原schema及全部受管文件字节。原探针漏传 rollback 的 current 参数，guard 在回滚前拒绝；先检查签名/状态再修正调用。`legacy-upgrade-failure.json` 和原脚本保留，不能把测试工具误用算成产品失败，也不能把 transaction 元数据按设计更新误报为整个 state 字节不变。

一次独立上下文先保存 E33–E38 各一次合成回答，再看评分字段及实现。`review/synthetic-responses.md` 与 `review/initial-review.md` 原样保留：E34–E38 的合成输出符合，E33 输出为跳过，但同批共享上下文已为其他样例读取模板，故 E33 的独立动态“不读取模板”未证；不能宣称六项全部条件通过。未运行真实项目架构评估，也未反复生成答案刷通过。

独立检查为 goal-mainflow/plan 限域通过、code 因维护文档缺陷 F1 失败。仅补充显式目录设置并做局部核对，原 FAIL 不改签；没有第二轮模型评审。最终 `final-candidate/` 导出包含此修复及本段结果记录；与首次导出的非文档实现、技能、场景、测试按字节绑定，最终校验另存 `checks-final.json`，不把旧安装回执改称新归档安装记录。

| 问题 | 预期/实际、归因与处理 |
| --- | --- |
| AR-I1 / F1（P2） | 版本 architecture.1，目的为维护者能复现验证。新测试要求 FF_TEST_ROOT，但文档命令未设置，无变量时 import 阶段 exit 1；归因项目文档/执行遗漏，不是 FF 规则缺陷。补充创建源码外目录及设置变量；按该设置定向运行1项状态测试通过。原失败见 review/probe-results.json，修复核对见 doc-setup-check.json。 |
| AR-I2 | 旧载荷回滚探针漏传 current；归因测试工具。保留初始失败，在确认未回滚后按实际签名修复一次并验证受管文件，未删 guard 或扩大权限。 |
| AR-I3 | 六场景共用一次上下文不能证明 E33 独立按需加载；归因测试设计边界。本轮接受未证，不加批次刷覆盖；真实原生发现/加载同样 unknown。 |

实际使用：作者显式读取 checkout 的 ff-implement 小任务路径和设计/技术方案相关入口，使用 skill-creator 及 openai.yaml 参考制作独立技能；这不是宿主自动加载。ff-review 独立检查显式读取固定 `8b9858aa8795d83ea33881b3d8c2e1ef40cce6b8` 的 SKILL、review-handoff、reviews；读取顺序和范围见原报告。方法含义查证 SEI 原始资料，来源放在场景参考。没有新框架或额外付费模型调用。

| 五维 | 有限结论与依据 |
| --- | --- |
| 需求理解 | 符合（AI判断）：可选、独立入口、直接进入0.9.6都有实现；不推定用户接受。 |
| 设计 | 符合（AI判断）：一个入口、一份按需参考，复用现有分发；目录名录兼容是必要改动。 |
| 交付 | 有问题后局部修复（客观观察）：16项测试、真实隔离升级回滚；保留F1负例与未证边界。 |
| 变化适应 | 符合（客观观察）：真实要求从设计推荐补充为独立入口和0.9.6归属，没有伪造中途转向。 |
| 成本 | 部分可测：首批5组命令共153.515秒，其中定向安装133.094秒；1次独立检查、6个一次性合成回答、1处文档返工。全程耗时、完整读取字符/工具调用数、token及货币成本 unknown；不换算节省率。 |

候选包含 intent.2 → small-task.1 → handoff.1 → intent-view 的祖先链以及本轮入口；`inheritance.json` 保留完整 SHA 和祖先探针。self-use-status、small-task-trial、handoff-validation、review-contamination 旁支不因此自动集成。源码 source、旧工作树和真实安装的保护比对见 `protection-final.json`。最终提交与归档绑定见 `commit-verification.json`；这些外部回执是本机证据，不声称随发行载荷可用。

停止边界：可提交用户验收此可选入口；不据此宣布0.9.6正式发布可用。原生宿主发现/加载、E33独立读取行为、full运行时、真实架构效益和用户接受仍未证；没有全量回归、重建运行时、真实安装升级、主线合并或推送。
