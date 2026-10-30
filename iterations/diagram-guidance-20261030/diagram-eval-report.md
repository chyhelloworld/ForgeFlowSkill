# FF 图法独立语义评审

**结果：基准 6/6、候选 6/6；各 30/30 项 PASS。无确定语义阻断，无已观察回归，也没有红→绿改善。** 图数、字数、PNG 数量不参与语义评分。此结论仅适用于本组输出，不证明候选优于基准。

冻结 rubric 未修改。逐项依据为图源与回答交付内容，不把候选复述的原始请求当作已交付证据；未读取实现技能或候选 CHECKS 自评。PARTIAL 对应证据不足/未观察到，不计通过。

## 逐案、逐项证据

### ARCH-01 — 基准 PASS / 候选 PASS

| 标准 | 基准证据与判断 | 候选证据与判断 |
|---|---|---|
| A1 | **PASS** — `diagram-baseline-results/ARCH-01.md:13-47,49-104`：静态实现→接口与独立运行时序分开；明确 Publisher 非同步依赖。 | **PASS** — `diagram-candidate-results/ARCH-01.md:10-14; ARCH-01-static.dot:5-10; ARCH-01-runtime.svg`：静态依赖/实现与创建生命线分别表达，未把实现箭头当调用。 |
| A2 | **PASS** — `diagram-baseline-results/ARCH-01.md:5-11,20-24,107-113`：三个服务方法、入口/业务/基础设施职责齐全；方法未拆独立部署服务。 | **PASS** — `diagram-candidate-results/ARCH-01.md:14-16; ARCH-01-static.dot:5-10; ARCH-01-runtime.svg`：同一服务保留三个核心方法，接口、仓储实现、数据库与后台职责可定位；未拆成方法服务。 |
| A3 | **PASS** — `diagram-baseline-results/ARCH-01.md:75-103,108-112`：事务内冲突检查、预订/outbox 原子提交及通知失败不回滚明确。 | **PASS** — `diagram-candidate-results/ARCH-01.md:16; ARCH-01-runtime.svg`：前置校验、事务冲突检查与原子写入、提交后成功及通知失败不回滚明确。 |
| A4 | **PASS** — `diagram-baseline-results/ARCH-01.md:13-50,107-113`：概览、创建交互及跨调用文字约束分层，图例未混淆源码依赖与时序。 | **PASS** — `diagram-candidate-results/ARCH-01.md:10-16; ARCH-01-static.dot:10`：两视图加文字约束，未提供的源码依赖保留未知；没有从调用推断 import。 |
| ARCH-CN | **PASS** — `diagram-baseline-results/ARCH-01.md:120`：两标准目录现行状态经本次独立官方查询支持；输出明确未读正文、不宣称合规，无虚构图法条款。 | **PASS** — `diagram-candidate-results/ARCH-01.md:19`：国际 UML 约定仅作补充，未核正文不称合规；无具体编号/条款主张需强制审计。 |

### DFD-02 — 基准 PASS / 候选 PASS

| 标准 | 基准证据与判断 | 候选证据与判断 |
|---|---|---|
| D1 | **PASS** — `diagram-baseline-results/DFD-02.md:3,8-13,62`：箭头均为申请资料、审核意见等数据；驳回/补充为数据内容而非控制分支。 | **PASS** — `diagram-candidate-results/DFD-02.md:12,20; DFD-02-level1.dot:8`：边为具名数据，明确不以处理编号/驳回动作表达控制次序。 |
| D2 | **PASS** — `diagram-baseline-results/DFD-02.md:8-13,19-28`：上下文六条外部流在一级均保持方向和语义。 | **PASS** — `diagram-candidate-results/DFD-02-context.dot:6; DFD-02-level1.dot:8`：六条外部流逐条守恒，无新外部实体。 |
| D3 | **PASS** — `diagram-baseline-results/DFD-02.md:38-48,51-60`：父过程七类边界流逐项映射，写库复合流拆分有等价说明。 | **PASS** — `diagram-candidate-results/DFD-02.md:14; DFD-02-decompose.dot:8`：申请记录读取、更新与受理反馈拆分有复合数据等价定义，父过程边界全部保留。 |
| D4 | **PASS** — `diagram-baseline-results/DFD-02.md:19-28,38-48`：实际边均经过处理，无实体直存储或存储直连；子处理未添加业务参与者。 | **PASS** — `diagram-candidate-results/DFD-02-level1.dot:8; DFD-02-decompose.dot:5-8; DFD-02.md:20`：所有存储/外部边经过加工；父层相邻加工未被当新参与方，分解为待确认分析模型。 |
| DFD-CN | **PASS** — `diagram-baseline-results/DFD-02.md:69`：两标准目录现行状态经本次独立官方查询支持；输出明确未读正文、不宣称合规，无虚构图法条款。 | **PASS** — `diagram-candidate-results/DFD-02.md:23`：国际 UML 约定仅作补充，未核正文不称合规；无具体编号/条款主张需强制审计。 |

### ER-03 — 基准 PASS / 候选 PASS

| 标准 | 基准证据与判断 | 候选证据与判断 |
|---|---|---|
| E1 | **PASS** — `diagram-baseline-results/ER-03.md:3,7-12,15`：实体/联系/属性构成概念模型，不强制 PK/FK 或关联表。 | **PASS** — `diagram-candidate-results/ER-03.md:10; ER-03-concept.dot:5-9`：Chen 风格业务概念，无物理键与表约束。 |
| E2 | **PASS** — `diagram-baseline-results/ER-03.md:7-8,15`：每记录恰属一会员，可多次借用；0..多明确为暂按理解并允许业务纠正，未要求必须已有记录。 | **PASS** — `diagram-candidate-results/ER-03.md:12; ER-03-concept.dot:7`：每记录恰属一会员、会员可多条；会员最小参与数留待确认。 |
| E3 | **PASS** — `diagram-baseline-results/ER-03.md:11-12,18-19`：工具基数与重复借用条件明确待确认，历史多次与并发分开。 | **PASS** — `diagram-candidate-results/ER-03.md:14-16; ER-03-concept.dot:8`：工具双向基数与重复条件均待确认，无默认关系强填。 |
| E4 | **PASS** — `diagram-baseline-results/ER-03.md:18-21`：讨论借用明细只作为业务答案决定的新概念，未直接进入建库。 | **PASS** — `diagram-candidate-results/ER-03.md:16`：先业务确认再决定逻辑模型，不提前引入明细表。 |
| ER-CN | **PASS** — `diagram-baseline-results/ER-03.md:26`：两标准目录现行状态经本次独立官方查询支持；输出明确未读正文、不宣称合规，无虚构图法条款。 | **PASS** — `diagram-candidate-results/ER-03.md:19`：国际 UML 约定仅作补充，未核正文不称合规；无具体编号/条款主张需强制审计。 |

### SEQ-04 — 基准 PASS / 候选 PASS

| 标准 | 基准证据与判断 | 候选证据与判断 |
|---|---|---|
| S1 | **PASS** — `diagram-baseline-results/SEQ-04.md:3,14-15,42-46`：同步调用/返回与异步投递分开；后台不等待客户端接收响应。 | **PASS** — `diagram-candidate-results/SEQ-04.md:10; SEQ-04-order.svg（同步实心/异步空心/虚线回复及独立后台片段）`：同步授权与返回、独立异步消息均可辨，消费者不阻塞请求。 |
| S2 | **PASS** — `diagram-baseline-results/SEQ-04.md:16-38,63-66`：授权拒绝、授权未知、本地失败分开；失败无确认事件，未知不等于未扣款。 | **PASS** — `diagram-candidate-results/SEQ-04.md:13-16; SEQ-04-order.svg（授权结果与提交结果 alt）`：拒绝、超时未知、本地失败不同分支；超时无伪造支付失败回复，提交失败不发确认。 |
| S3 | **PASS** — `diagram-baseline-results/SEQ-04.md:26,33,65-66`：本地事务与支付分界清晰；补偿可失败且需核对/升级。 | **PASS** — `diagram-candidate-results/SEQ-04.md:15,18; SEQ-04-order.svg（核对/补偿注释）`：支付不属于本地原子事务；核对线索持久性待确认，补偿非必然成功。 |
| S4 | **PASS** — `diagram-baseline-results/SEQ-04.md:47-56,68`：幂等、重试、不撤单齐全，且不无依据承诺严格一次发送。 | **PASS** — `diagram-candidate-results/SEQ-04.md:16; SEQ-04-order.svg（邮件消费者注释）`：重复幂等、失败重试及不撤单有明确说明。 |
| SEQ-CN | **PASS** — `diagram-baseline-results/SEQ-04.md:75`：两标准目录现行状态经本次独立官方查询支持；输出明确未读正文、不宣称合规，无虚构图法条款。 | **PASS** — `diagram-candidate-results/SEQ-04.md:21`：国际 UML 约定仅作补充，未核正文不称合规；无具体编号/条款主张需强制审计。 |

### FLOW-05 — 基准 PASS / 候选 PASS

| 标准 | 基准证据与判断 | 候选证据与判断 |
|---|---|---|
| F1 | **PASS** — `diagram-baseline-results/FLOW-05.md:13-18,55-63`：五状态合法迁移与事件/角色/guard 一一对应。 | **PASS** — `diagram-candidate-results/FLOW-05.md:12-18; FLOW-05-state.dot:5-12`：状态、事件、角色及 guard 完整对应，没有动作伪装成状态。 |
| F2 | **PASS** — `diagram-baseline-results/FLOW-05.md:29,35-49,52,61-63`：拒绝不改状态、重复无新任务及成功出口可判定；重放返回作为建议并要求鉴权。 | **PASS** — `diagram-candidate-results/FLOW-05.md:20; FLOW-05-process.dot:5-6`：合法成功、不合法/重复拒绝及失败出口齐全；并发最多一任务且保持一致性。 |
| F3 | **PASS** — `diagram-baseline-results/FLOW-05.md:35-49`：条件真假、并发冲突及存储失败均有出口；冲突重读非必然循环。 | **PASS** — `diagram-candidate-results/FLOW-05-process.dot:5-6`：guard、提交类型、提交成功与冲突条件都有去向；拒绝/成功/失败均到本请求结束。 |
| F4 | **PASS** — `diagram-baseline-results/FLOW-05.md:23-29,65`：未增加撤回恢复、初始创建或超时批准规则。 | **PASS** — `diagram-candidate-results/FLOW-05.md:20; FLOW-05-state.dot:12`：无超时批准/撤回恢复；实现保护建议没有改变业务状态集合。 |
| FLOW-CN | **PASS** — `diagram-baseline-results/FLOW-05.md:70`：两标准目录现行状态经本次独立官方查询支持；输出明确未读正文、不宣称合规，无虚构图法条款。 | **PASS** — `diagram-candidate-results/FLOW-05.md:23`：国际 UML 约定仅作补充，未核正文不称合规；无具体编号/条款主张需强制审计。 |

### SIMPLE-06 — 基准 PASS / 候选 PASS

| 标准 | 基准证据与判断 | 候选证据与判断 |
|---|---|---|
| P1 | **PASS** — `diagram-baseline-results/SIMPLE-06.md:3,12`：仅替换文案，现图无需补画或扩张全套图。 | **PASS** — `diagram-candidate-results/SIMPLE-06.md:10,19`：只改标签，明确无需新图，不扩成系统重构。 |
| P2 | **PASS** — `diagram-baseline-results/SIMPLE-06.md:12`：明确文字已包含权限、鉴权、失败及重复点击，不因总览线少判缺失。 | **PASS** — `diagram-candidate-results/SIMPLE-06.md:19`：承认权限、重试和禁用已经由文字表达，没有机制缺失误报。 |
| P3 | **PASS** — `diagram-baseline-results/SIMPLE-06.md:6-10`：验收文案及既有交互不回归，不引入接口/权限变化。 | **PASS** — `diagram-candidate-results/SIMPLE-06.md:13-17`：新文案及原有鉴权、接口、重复点击/失败回归覆盖，不改范围。 |
| P4 | **PASS** — `diagram-baseline-results/SIMPLE-06.md:14`：明确未访问页面、未改代码、未跑验收。 | **PASS** — `diagram-candidate-results/SIMPLE-06.md:19,25`：只给变更说明与计划，未取得源码/页面、不声称实际验收通过。 |
| SIMPLE-CN | **PASS** — `diagram-baseline-results/SIMPLE-06.md:19`：两标准目录现行状态经本次独立官方查询支持；输出明确未读正文、不宣称合规，无虚构图法条款。 | **PASS** — `diagram-candidate-results/SIMPLE-06.md:22`：国际 UML 约定仅作补充，未核正文不称合规；无具体编号/条款主张需强制审计。 |

## 正常对照及差异解释

SIMPLE-06 双方均识别文字已包含权限、失败及禁用约束，未因三块总览图缺少分支而误报缺失。ARCH-01 候选把部分约束保留在文字中，仍通过：不以增边数量代替语义充分性。基准 ER 将会员零次借用标成可纠正的暂定理解，候选直接保留最小基数未知；冻结 E2 允许前者，不追溯加严标准制造改进。

## 规范事实核查

基准实际引用的 [GB/T 8567-2006 官方目录](https://openstd.samr.gov.cn/bzgk/gb/newGbInfo?hcno=84C42B6277D2714B7176B10C6E6B1A44)与 [GB/T 9385-2008 官方目录](https://openstd.samr.gov.cn/bzgk/std/newGbInfo?hcno=2790825C43AD0B69E3C38C140BFFCFE6)均列现行。这里只支持目录状态；双方均未声称逐条符合国标。没有正文审计或国家标准认证结论。

## 候选单独视觉 smoke

独立查看 `ARCH-01-runtime.png` 与 `SEQ-04-order.png`：本次预览中文可读、箭头与分支可辨，未发现裁切。其余候选图读取图源进行语义核对，未逐一视觉复检；基准未做同条件渲染。因此不能报告视觉质量的相对改善。

## 实验偏差、未测范围与结论限制

- 新增能力对照：基准原适用技能入口，候选独立 ff-diagram，路由与上下文不同，非单变量实验。
- 候选交接额外强调尽可能实际渲染查看，基准只说可用渲染工具；视觉产物差异不可归因 skill，仅可作候选独立 smoke。
- 冻结 README 要求逐案新上下文，但基准明确六案共用一个上下文；未把该偏差当单个输出的语义失败，实验隔离条件未满足。候选上下文隔离亦未独立核实。
- 仅一次六案合成输出；无盲化、无多采样、无多模型稳定性结论；评审独立于实现 agent，但知道 baseline/candidate 身份。
- 候选正文中的六份原始请求与冻结 model_prompt 可逐字核验；基准输出未附完整请求，基准实际输入及额外上下文仅据父代理交接，不独立证明全部输入字节相同。
- 仅检查实际标准主张：两项基准标准目录现行状态核验通过，未读正文、未做条款符合性审计，不能解释为国标认证。
- 未测业务代码、真实系统权限/事务/幂等实现、真实用户验收、全量 UML/大规模图布局、draw.io 可编辑性或同条件渲染质量。

## 后续最小动作

无确定语义错误需要返工。若要证明 skill 改善，另行预注册更有区分度的题目，并统一入口包装、渲染指令、采样配置和逐案独立上下文，进行匿名成对复测；不得回改本轮题目或挑选输出制造红绿。本轮可报告“候选在小范围语义烟测中通过”，不可报告“已证明优于基准”。
