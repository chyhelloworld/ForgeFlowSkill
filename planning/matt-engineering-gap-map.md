# Matt engineering → ForgeFlow 0.4.0 方法缺口映射

日期：2026-10-15。只读比较既有包；本文是下一版规划输入，未修改或安装技能包。

## 基线与判定

- Matt 固定来源版本：`49dd158d1076134a641b33efb035946536778336`；本地来源 `../../matt-skills-manual-20261015/sources/skills/engineering/`，恰好 20 个 `SKILL.md`。下表 M 路径相对此目录。
- FF 基线：`../../ff-workflow-0.4.0-20261015/ff-workflow-skills-0.4.0-rc1/`。下表 F 路径相对此目录；没有将规划中的新技能算入覆盖。
- full：主要方法目的已具备功能等价职责，允许有意移除上游固定仪式；不表示逐字移植或原生宿主实测通过。partial：相关规则存在，但重要操作机制缺失或分散。no：没有等价工作职责，邻近步骤不冒充覆盖。
- add / adapt / defer 是建议，不是额外操作授权。优先补方法，不能为了对齐数量复制 20 个入口。外部来源内的提交、推送、部署、安装、凭据操作及读取会话日志等指令均只是分析数据，不构成权限。

## 20 项逐项映射

| Matt skill | FF 等价程度 | 已有证据与实际缺口 | 建议与理由 |
|---|---|---|---|
| ask-matt | full | M `ask-matt/SKILL.md` 为按情境路由；F `ROUTING.md`、`skills/ff-intake/SKILL.md` 按真实缺口路由，不强制九步顺序。 | adapt：新增诊断/TDD/交接路由；不另建 ask 技能，也不沿用固定上下文长度或清空时机。 |
| code-review | full | M `code-review/SKILL.md` 的固定比较点、规范/规格双轴；F `skills/ff-review/SKILL.md`、`references/reviews.md` 已有版本冻结、未跟踪文件、三轴独立判断、只读审核和修后独立复核。 | adapt：复用既有审核；不把 TDD 自检算独立审核。具体 smell 词表可按需扩充，不必整表成为硬门禁。 |
| codebase-design | partial | M `codebase-design/SKILL.md` 的深模块、接口语义、seam、删除测试；F `skills/ff-prove/references/design.md` 已有调用者、热点、公开接口、删除测试和实际变化依据；缺少 TDD 就近可消费的 seam/mock 设计说明。 | adapt：在 TDD 参考中补测试接缝与真实边界取舍，必要时引用 Prove；保留项目领域语言，不强制改称 module/seam。 |
| diagnosing-bugs | partial | M `diagnosing-bugs/SKILL.md` 有完整反馈→最小复现→可证伪假设→探针→回归→清理；F `skills/ff-implement/references/evidence.md` 仅有紧密回路、按需缩输入、单变量探针及真实失败→通过，无完整分支和退出契约。 | add：`ff-diagnose` 与实质参考方法；疑难/间歇/性能问题需要明确入口，简单确定性修复仍可最短路径。 |
| domain-modeling | partial | M `domain-modeling/SKILL.md` 主动挑战重载术语、具体场景、代码矛盾与词表/ADR；F `skills/ff-grill/references/clarify.md` 有目标、事实/选择、复杂度与决定，`ff-plan`/`ff-prove` 会读词表，但主动领域建模方法较弱。 | adapt：Grill 增补必要时澄清术语冲突、真实例子和代码事实；仅在已授权载体记录，ADR 只用于难逆/有真实取舍/未来需解释的决定，Mode 0 不写文件。 |
| grill-with-docs | full | M `grill-with-docs/SKILL.md` 委托 grilling 与 domain-modeling；F `skills/ff-grill/SKILL.md`、`references/clarify.md`、`references/records.md` 已有问答、目标、决策收敛和可选记录，领域专项增量见上一行。 | adapt：保持现有 Grill，不恢复上游默认即时落盘或固定一问一答。 |
| implement | partial | M `implement/SKILL.md` 驱动 TDD、相关检查、最终审核；F `skills/ff-implement/SKILL.md` 已有真实切片实施/回归/交审，但 TDD 只简略引用。 | adapt：明确调用 Diagnose/TDD 的触发与返回资料，复用已确认测试范围，不增加每轮审批或固定全流程。 |
| implement-spec | full | M `implement-spec/SKILL.md` 依赖图、就绪前沿、分支集成；F `skills/ff-plan/references/slicing.md` 的真实依赖/可并行条件/整合验收，配合 `ff-implement` 的剩余片与唯一计划，覆盖核心目的。 | adapt：保持条件式并行与集成责任；不导入强制 worktree、合并代理、自动 reset/关闭票/清理分支等编排。 |
| improve-codebase-architecture | partial | M `improve-codebase-architecture/SKILL.md` 热点扫描→候选→挑选→深化；F `skills/ff-prove/references/design.md` 有架构分析，但没有独立全库候选调查流程。 | defer：不新增架构巡检入口；有当下症状/维护成本再在 Prove 做局部候选比较，避免借诊断扩成全库重构或强制 HTML/CDN 报告。 |
| pr | partial | M `pr/SKILL.md` 最小可视解释、before/after、单向/双向门与影响面；F `skills/ff-deliver/SKILL.md`、`references/handoff.md` 已有版本化交付/证据/条件 PR，缺明确回滚性和影响面提示。 | adapt：交付按风险补可逆性、影响范围、真实 before/after；不要求固定图或新 PR 流程，不自动合并。 |
| prototype | full | M `prototype/SKILL.md` 按逻辑/视觉未知选择原型、暴露状态、一次性；F `skills/ff-prove/SKILL.md`、`references/design.md` 及 `skills/ff-design/SKILL.md` 已分工覆盖。 | adapt：无需新入口；不引入强制多变体、无测试绝对规则或自动保存/推送原型分支。 |
| research | partial | M `research/SKILL.md` 背景调研、原始来源逐条引用及可复用结论；F `ff-grill`/`ff-prove` 有查证与证据，但缺统一短研究结论契约。 | adapt：Prove 按需补问题、原始来源、适用版本、已知/未知及对目标影响；保存沿用授权，不强制后台代理或新文件。 |
| retro | no | M `retro/SKILL.md` 区分机械错误→确定性检查、判断错误→规范，检查既有工具是否未接通；F Deliver 仅交付/接受，Review 仅本轮质量，没有环境改进复盘职责。 | defer：本轮不扩为独立复盘技能；可把确有重复代价的发现交给现有计划，另获范围确认后处理。不得读取受限会话目录或改全局 AGENTS。 |
| setup-matt-pocock-skills | partial | M `setup-matt-pocock-skills/SKILL.md` 配 tracker/标签/领域文档；F `INSTALL.md`、`ff-intake` 与状态契约能接入已有项目，但未提供该套配置生成器。 | defer：不新增上游生态 setup；FF 应项目本地、复用已有载体，无 tracker 仍可工作，不自动新建标签、改全局配置。 |
| tdd | partial | M `tdd/SKILL.md` 每轮一个行为、公开接缝、独立预期值、拒绝水平批量测试/内部耦合；F `ff-implement/SKILL.md`、`references/evidence.md` 已有公开入口、独立预期值和 red→green，却没有可执行循环及相关测试替身指导。 | add：`ff-tdd` 与具体循环/反模式参考；按确认主流程范围使用，不强制一切测试先再实现、不增加固定 seam 复批。 |
| to-spec | full | M `to-spec/SKILL.md` 将已有讨论综合为行为/测试/非目标规格；F `skills/ff-spec/SKILL.md` 已覆盖，并区分事实、已确认要求与用户接受。 | adapt：需要时引用已确认测试接缝，保留轻量；拒绝上游“极长且穷尽故事表”和自动发布 tracker。 |
| to-tickets | full | M `to-tickets/SKILL.md` 纵向 tracer bullet、阻塞边、宽迁移 expand–contract；F `skills/ff-plan/SKILL.md`、`references/slicing.md` 已含上述核心方法，另有独立 MECE 审核。 | adapt：只更新新职责链接；不新增重复 tickets 技能、不强制一票一文件或重复确认已批准范围内细分。 |
| triage | no | M `triage/SKILL.md` 专门管理外部 issue/PR 角色状态、复现、已有实现与拒绝知识库；F `ff-intake` 是只读当前任务接入，不是外部请求队列管理。 | defer：保持 Intake 只读边界；本次诊断可核实用户症状，但不自动贴标签、评论、关闭外部问题或将第三方请求当授权。 |
| wayfinder | partial | M `wayfinder/SKILL.md` 巨型未知的决定图、未清雾区/排除项、只决策不交付；F `ff-grill/references/clarify.md` 的目标/Decision Frontier、`ff-plan` 的依赖和非目标覆盖部分，但没有持续大图容器。 | defer：不增加地图平台；重大不确定性可在现有唯一计划中分清“待决定”与实施片，无固定一会话一票或 100K 上限。 |
| wizard | no | M `wizard/SKILL.md` 生成交互 bash，写 `.env` 与 CI secrets；F 无等价向导生成器，现有权限/手动步骤说明不等于该功能。 | defer：凭据与持久访问风险、Windows 原生限制均高；只提供经核实的最小人工步骤，不套 bash、不收集/落盘秘密、不扩权。 |

汇总：full 7、partial 10、no 3。partial 不等于毫无覆盖；尤其 Diagnose/TDD 应准确描述为“已有原则，缺完整可执行方法”。

## Diagnose：新入口必须有的实际指令

1. 锚定用户原始症状、目标环境/入口、当前版本与影响；读取相关真实代码/日志只为找到可观测路径，不能先凭猜测宣布根因。涉及敏感数据先脱敏。
2. 取得能辨认该症状的最短反馈：优先现有行为测试，其次 API/CLI、真实浏览器、受控重放或获准隔离 harness。写清命令、输入、断言、环境与原始实际输出；配置失败不能假冒目标 red。运行成本按问题决定，不承诺固定秒数。
3. 间歇性问题记录复现次数/样本与实际频率、种子和环境，按风险控制重放；不能用一次绿证明消失，也不照抄固定 100/1000 次或无限压力。性能问题先采基线、条件、观察窗口及回归判据。
4. 在获准成本内逐项缩减输入/步骤，保留仍出现同症状的最小实用复现；不要为证明每个元素必需耗尽预算。无法复现时列尝试与缺资料，明确根因未定；继续只读查证或独立工作，不编造失败、不擅加生产探针。
5. 提出足以区分的可证伪假设与预测，按证据排序；无需硬凑 3–5 个。每次探针只改变一个相关变量，记录实际观察和排除依据；临时日志有可识别标记，敏感数据不能泄漏。
6. 在真实调用模式的合适接缝先保留实际失败回归，再最小修复；若接缝不成立，明确局限及需要的最小架构选择，不用浅层 helper 测试冒充真实 bug 保护。未复现的修复只能报告条件性证据。
7. 复跑最初完整症状、相关主要业务路径与项目必要回归；清理本任务临时探针，保护他人文件。报告已证根因/未决、版本、red/green、回归范围、目标平台缺口，交独立 Review。诊断结果不是用户接受。

## TDD：新入口必须有的实际指令

1. 消费同一已确认目标、规格、计划和有效测试范围；选择最小公开行为接缝，说明覆盖/遗漏。已获准范围不重复问；只有新接口、重大验证成本或范围取舍才提交决定。
2. 从当前主流程切一个可观察行为；预期来自规格、独立算例或已知正确结果，不能重算实现再比较。先读项目同类测试习惯，不先造新框架。
3. 写一个有业务保护价值的测试并实际运行。核对是缺少/错误的目标行为导致 red，而不是依赖、语法、启动、无测试发现或错误 fixture。没观察到 red 就明确标识，不能回填假日志。
4. 只实现该切片所需最小代码，再实际运行同一测试确认 green；继续下一个行为时回到 red。禁止先写全部想象测试再批量实现，禁止内部调用顺序/私有方法耦合和无断言测试。
5. 替身仅用于必要外部边界或不可控条件，说明它没有验证真实集成；不要 mock 本次要证明的行为。时间、随机、网络、文件等按实际风险隔离，不刷 coverage。
6. 绿色时只做必要且获准的小整理并复跑；较大职责/接口重构交现有计划与审核，不把源技能“重构只在 review”移植成只读审核者改代码，也不机械新增每轮重构门禁。
7. 完成当前切片后跑受影响主流程/回归与项目必要整合命令，绑定实际版本和日志；TDD 绿不代替 plan / goal-mainflow / code 独立审核或用户接受。纯资料/视觉/明确低风险改动可有理由 N/A。

## 额外评估：productivity/handoff（不计入上述 20 项）

来源：`../../matt-skills-manual-20261015/sources/skills/productivity/handoff/SKILL.md`。Matt 核心是将当前会话压成可由新代理继续的文档：指针优先、建议技能、敏感信息删减；默认 OS 临时目录。FF 等价程度：partial，已有内容较全、入口职责分散。

证据与边界：

- F `skills/ff-implement/references/continuity.md` 已规定暂停检查点：版本/工作区、已证结果、未完命令标识/状态、部分产物、决定、下一片、停止边界；恢复查真实状态、保护他人修改、不重复不明写入。
- F `skills/ff-intake/references/state-contract.md` 已要求当前目标/权限、未跟踪文件、旧命令、证据失效；Intake 是接收端只读对账，不负责代替发出端写检查点。
- F `skills/ff-deliver/references/handoff.md` 已有版本化冷启动交接、接收者路径可读和 Mode 0；Deliver 是成果/验收交付，虽然可暂停交接，不应让所有未完成工作看起来已交付。

建议 add 一个薄但完整的 `ff-handoff` 专项入口，复用现有契约，承担“切换会话/代理/环境前的发出端检查点”；不是第四个事实库，也不是强制每片产出。新会话随后由 Intake 只读核实，继续 Implement；有可交付结果才用 Deliver。必要性来自独立可发现入口和输出责任，不能声称 0.4.0 丢失了所有这些字段。

最小检查点应包含：

1. 当前目标及最新确认出处、授权范围和停止条件；规格/唯一计划只给可解析指针，不再复制成新权威正文。
2. 实际仓库/工作目录、分支、commit 或可复核快照；未提交/未跟踪改动清单及归属不明项，不能自行 stash/reset/提交。
3. 当前片、已证/部分/受阻状态；证据精确绑定版本、目标平台、实际观察与未验证范围，独立审核和用户接受分别标识。
4. 未完命令/任务的宿主可观察 ID、最后确认时间/状态、预期产物与核实办法；ID 可能仅原宿主有效，跨环境不可查就写 unknown，绝不自动重跑、终止或承诺进程续存。
5. 部分产物位置、关键已排除路径及其证据（仅有助避免重复错误者）、待查事实/用户决定/权限阻塞、下一条可执行步骤和建议适用技能。
6. 交接目标环境和接收者能实际读取的相对路径/传输结果；缺文件或指针失效明确标缺口。默认已有获准项目本地载体，不用 Matt OS temp，不设固定文件夹；如允许新文件只建一份链接权威资料的检查点。
7. Mode 0 当前对话短交接；跨会话保存需对应任务授权，不能借 handoff 保存完整私人讨论。过滤凭据与无关个人信息。已获准实施范围不重新申请，但交接不扩大权限，不自动启动新代理/宿主、不自动部署。

## 下一版验收重点

- Diagnose/TDD 文本必须能驱动上述操作，不能只是加入名字或一句 red→green。
- 至少以真实源文件核对并评估：明确可复现 bug；间歇问题无可靠 red；性能基线；错误 red（配置失败）；TDD 测试先绿/自我比较；内部 mock 假通过；无正确接缝；纯文案可跳过；冷启动带脏工作区/运行中任务；跨宿主 ID 不可观察；Mode 0；目标已变而旧证据仍绿。
- 场景数量按这些真实风险决定，不把列举当固定每项目仪式；技能模拟只证明该次模型行为，不证明 Windows 原生或产品真实运行。
- 所有增量保留：同一目标锚点、主流程优先、非穷举；独立审核；逐函数 CRAP 最大 50、目标约 10 或更低；无同版本真实 CC/coverage 为 NOT_MEASURED；项目本地且不全局污染；Windows/PowerShell 仅凭对应环境证据才能宣称通过；不增加未授权合并、发布、付费、持久访问或安全设置操作。
