# 独立语义评价：run-a / Case 01

## 证据与范围冻结

- 评价对象：`runs/base-video/architecture.md`；SHA-256：`b8f7f2d56ac4c89a3a9df6e5b47277bff8b54371fd1e1f0dbbd45a2d2e013dc6`，实际校验一致。
- 判据：`freeze-v1/cases/01-video-task.md`、`freeze-v1/cases/COMMON-HANDOFF.md`、`freeze-v1/evaluation/RUBRIC.md`、`freeze-v1/evaluation/video-reference.md`。
- 只读上述需求、交付说明、冻结判据/视频参考和指定候选。未读技能、diff、其他候选、父线程历史或预期结论。视频判断基于冻结参考的帧记述，未直接重新查看图像或新增网络证据。
- 此次仅评价 derive。以下先记录各项裁决及证据，再汇总结论。路径名称不作为版本优劣依据。

## 1. 语义保真与概念边界：PASS

**需求定位：**任务“必须考虑的变化与语义”要求对话可标识/追加/存取/列出，区分用户输入、模型回复、工具调用及对应结果；正常回答和工具审查具有不同的指令、输入及预期输出；供应商与存储格式变化不应污染业务。

**产物定位：**§2 追溯表 R1–R7 从每项用例与变化推出职责。§3“会话核心”定义 `Conversation { id, records[] }`、UserRecord、AssistantRecord、ToolCall 和 ToolResultRecord；明确 `callId` 会话内唯一、结果按 callId 关联。§3“交互过程”分别定义 ReplyComposer.generate、ToolReviewer.review，ModelInput 表示本次调用的目的、指令、消息、工具说明和预期输出；审查结论 `ReviewDecision` 不是服务或 assistant 记录。

**后果：**可表达长期会话与单次模型输入、正常回复与审查结论、调用与结果等必要区别；Conversation 维护记录约束、过程决定追加时机、存储负责表示转换，未混淆生命周期。用带标签记录而非消息子类、把内容策略放 application 而非视频 domain，均不丢必需语义。边界理由是可指出的变化而非层数口号。

## 2. 行为归属和主路径：PASS

**需求定位：**任务工作流程 1–8，尤其工具调用前模型参与审查、允许/拒绝回填、继续循环、有限出口及持久化；入口变化不重写核心过程。

**产物定位：**§3 `TurnProcess.submit(conversationId?, userText)` 与 listConversations；§5 步骤 1–7 逐一落地创建/读取、追加用户输入、正常生成、追加 assistant 调用、逐一审查、执行或 denied、追加结果及再次生成。步骤 7 明确正常生成计轮、审查不计轮，最后一轮完成已有调用并保存，以 limit_reached 返回。§3 Executor 只在过程获允许后调用；§5 最小失败假设明确审查格式错误不执行、而非伪装为明确拒绝。

**后果：**从 CLI 输入可追踪到回答或上限结果及可继续的保存快照；决策者与执行者可区分，工具不自行重入循环。新/继续/列出均有行为承载。未承诺中途崩溃恢复不影响本题既定流程；终止时持久化和串行处理属于已声明的最小选择，不是需求遗漏。

## 3. 消费者契约与实现：PASS

**需求定位：**交付 2、5、6 要求关键输入输出、代表字段/方法、对应目录及启动连接，能够替换模型、存储和入口；不要求完整实现或真实 SDK 签名。

**产物定位：**§3 给出 submit 的 Result/TurnOutcome，load/save/list，generate(snapshot, toolSpecs)，review(snapshot, proposedCall)，complete(ModelInput, ModelConfig)，Catalog.specs/resolve、ToolExecutor.execute、Tool.invoke 及结果状态。模型审查结构化结果由 Reviewer 从返回内容解析校验；ProviderAdapter 只转换外部格式并拒绝不支持配置。JSONL 布局与 save 快照、load 校验、list 元数据有明确拟议实现。§6 目录逐一对应职责，并给出适配器、存储、Catalog、Executor、两个角色、TurnProcess、CLI 的装配次序；§7 变化表限定替换影响。

**后果：**消费者有足够信息完成主用例并处理拒绝/失败，不必自行发明审查结果所属责任或让存储决定业务。供应商/语言/进程库尚未选定有明确标注，不是伪造可用 SDK，也不是架构契约缺失。

**非实质性表达注意：**§4 图绘制 `ReplyComposer → ToolCatalog.specs`，§5 步骤 2 则由过程取 specs 后传入 Composer，与 §3 的显式参数一致。按该伪签名即可实现；这是获取参数位置的小型图文不齐，并不造成工具来源、执行登记或调用责任的关键歧义，不构成 MATERIAL FAIL。实现时可统一图示。

## 4. 总览可理解颗粒度：PASS

**需求定位：**COMMON-HANDOFF 要求中等颗粒度、主要对象一句职责、少量代表契约及可辨认的调用/拥有/依赖关系；交付 3–4 不以全量细节图或静态图替代运行协作。

**产物定位：**§1 三职责区及一条运行主链；§2 七行需求—职责—边界理由；§3 分区列代表契约；§4 单张主要关系图及线型说明、运行实例与源码依赖解释；§5 独立正常/工具路径，失败假设另列；§6 紧凑目录。

**后果：**读者无需先读故障/并发细节即可定位入口、编排、两种模型用途、工具及保存；图保留必要拥有和依赖信息。正文较详尽，但细节按职责、路径和假设分区，不遮蔽总览。没有以更多类、三层或一类一文件作为通过理由。

## 5. Review quality：NOT_APPLICABLE（NOT_RUN）

产物末尾明确“未运行 review/prove 或测试”，本次只执行 derive。不能把未执行独立 review 当作失败；本评价也不冒充候选执行过 review。

## 6. Prove discipline：NOT_APPLICABLE（NOT_RUN）

§7 的假 ModelPort、存储往返及供应商样例均明确是待验证建议，不是完成证据。不要求为了通过此次 derive 追加实验；不从未测试推断设计缺失或实现已成功。

## 单列视频比较

**总体：SEMANTICALLY COMPARABLE（语义可比）。没有证据判 WORSE；不据文字更长宣称整体优于视频。**

| 比较项 | 视频参考证据 | 候选证据 | 裁决与后果 |
|---|---|---|---|
| 会话/本次输入/调用结果 | 02:50–04:05 Session/消息/调用结果；05:45–06:35 Context；参考“对话与工具调用数据”“工具与本次模型输入” | §3 Conversation/类型记录/callId；ModelInput 与两种组织职责 | 语义可比；独立事实与输入用途保留，不要求相同类名或 Context 泛型 |
| 正常/审查/循环 | 07:30–08:30 两角色与 Decision；08:30–09:15 AgentService；00:20–01:10 八步与上限 | §3 Composer/Reviewer/Decision/TurnProcess；§5 七步主路径 | 语义可比；内容组织和过程控制仍区分，角色自己调用模型而非仅返回 Context 不损害所需边界 |
| 替换与启动 | 04:05–05:00 Store 替换；06:35–07:30 模型映射；09:10–09:55 WebApi/组装根 | §3 业务端口与适配；§6 启动；§7 变化表 | 语义可比；CLI 代 WebApi 合乎任务；无须复刻目录 |
| 工具可描述且可执行 | 05:00–05:45 Tool/BashTool；参考 Tool 的 name/description/parameters/execute | §3 Catalog/ToolSpec/Executor/Tool.invoke/ShellTool | 语义可比；拆开登记/执行而保留共同登记名称，未把工具退化成描述数据 |
| 局部契约显式度 | 参考 00:20–01:10 有有限退出，但没有冻结记录的最后一轮调用处理细则；参考 ToolResult 以 call ID/content 表达 | §5 步骤 7 说明末轮处理、limit_reached 和不保证自然语言回答；§3/§5 区分 denied 与审查失败 not_executed | 具体更好仅限已提供教学材料的可实现性表达：实现者不用自行决定这两处边缘语义；这是明确最小假设的益处，非原视频不满足需求的证明 |
| 真实实现与生产性质 | 参考明确无完整源码、SDK、恢复/并发/安全等未知 | 候选明确拟议、未实现实测；§7 未知清单 | 未知；不宣称运行质量、性能、安全或异常恢复比视频更好 |

## 结论（在以上逐项判断后冻结）

维度 1–4 全部 PASS，维度 5–6 NOT_APPLICABLE / NOT_RUN，未发现 MATERIAL FAIL。该既有首次输出足以满足本次同范围的架构推导行为，无需为达标修补技能或人为寻找红项。结论不等于实现就绪、用户确认或上线验收。

这是有限的独立 LLM 语义/行为证据，不是架构质量的确定性单元测试证明。除核验文件 SHA 外，未运行机械测试；未使用关键词命中率作为质量证据。视频比较受冻结参考的约五秒预览帧及无完整音轨/源码限制，不能把未知当作落后。
