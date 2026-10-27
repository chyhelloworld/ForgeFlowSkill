# 本轮结果：有效基线，无需修正

## 已测事实

已用权威旧版技能完成视频同题同范围的首次实际 LLM 推导，并由 fresh 独立评价者依据预先冻结材料评价。语义保真、行为归属、消费者契约/实现、总览颗粒度四项均 PASS；与视频总体 **SEMANTICALLY COMPARABLE（语义可比）**，未发现 MATERIAL FAIL。评价者依据冻结的视频帧记述，未重新直接查图；原视频证据仍受约 5 秒预览帧、无完整音轨/源码限制。

因此止于有效基线：未进入“红后最小修正→同题 green”，不宣称严格 TDD 修复完成。这里是实际 LLM 调用＋独立语义判定，不是确定性程序单测；哈希检查只证明文件一致。一次样本也不证明技能在所有输入下稳定达标。

| 项目 | 状态 | 原因 |
|---|---|---|
| 视频主例旧版首次推导及独立评价 | 已完成，无有效红灯 | 维度 1–4 PASS，整体语义可比 |
| 候选修正 / 修复后 green | NOT_RUN | 没有真实缺口，不为修改而制造红灯 |
| simple / library 回归 | NOT_RUN | 未发生修改，无受影响回归；不是通过 |
| 技能 review / prove 阶段 | NOT_APPLICABLE / NOT_RUN | 本轮只测 derive；独立评价不冒充技能 review |
| 产品实现、真实模型/存储/工具契约测试 | NOT_RUN | 本轮交付架构推导，不是运行产品 |

## 视频概念与旧版等价表达

| 视频参考概念 | 旧版首次产物 | 对照结论 |
|---|---|---|
| Session 与消息、ToolCall/ToolResult | Conversation、带标签 Record、callId 关联 | 长期记录与调用结果语义保留；不要求消息子类 |
| Context：一次调用的输入/输出预期 | ModelInput，由正常/审查职责分别组织 | 不与长期会话混同；不要求同名泛型类 |
| Assistant / ToolCallReviewer / Decision | ReplyComposer / ToolReviewer / ReviewDecision | 组织策略与结论分开；角色直接调用模型而非仅返回 Context，无实证退化 |
| AgentService 编排 | TurnProcess | 审查、执行/拒绝、回填、循环及保存有明确所有者 |
| ModelClient / SessionStore 与具体实现 | ModelPort / ConversationStore 与 Provider/JSONL/Memory 适配 | 消费方契约与外部格式隔离，变化影响可追踪 |
| Tool / BashTool | ToolSpec、Catalog、Executor、Tool.invoke / ShellTool | 拆分登记与执行，仍兼有可描述和可执行能力 |
| WebApi、main.py、视频目录 | 首选 CLI、composition、职责对应目录 | 入口与目录不同但符合相同范围；不按路径或层数评分 |

末轮工具处理、limit_reached、拒绝与审查失败的区分写得更明确，属于**局部假设/契约表达收益**，不等于整体优于视频，更不证明实现、性能或安全更好。独立评价还记录一处非实质性图文差异：图中 Composer 取 tool specs，而签名/主路径由过程传参；可按契约理解，不构成关键责任歧义或本轮红灯。保留原稿，不以事后润色覆盖首次输出。

## 原因推断，不是已测结论

“此前合成需求偏离视频范围”和“之前 handoff 丢失中等颗粒度图式交付”可能解释先前结果差异；本轮没有分别控制这两个因素做消融，**不能据此认定因果，也不能断言问题全在输入而非技能**。已证实的仅是：在本次冻结输入及交付说明下，旧版这一首次输出满足所选行为。

## 展示与权限边界

最终交付计划另附两张渲染加工图；它们是首次文本产物之后的展示加工，**不是执行者原生首次图片输出**，不可拿加工后的清晰度替代原稿评价。两图是否已生成以交付清单为准；用户可读性仍待反馈。

本轮未修改 FF 源码/桌面/安装，未写候选、未回写源端、未提交或发布；仅准备云端材料与验证证据。冻结文件保持不变。下一步只在用户指出或实际使用暴露新的真实缺口后，明确同范围可观察行为，再重新开启验证先行的最小修正；不追加样本或改判据寻找红灯。

## 证据索引（SHA-256）

- `FREEZE.sha256`
  `eb6eaf85d196b58f7f314b20ec8a37bd14894bd0918a67a1ec853ab5be656f0d`
- `baseline/MANIFEST.sha256`
  `252a71bddeef520150f9f28ee1eecd9a01d567491eee906e95bbf3994a9e76e0`
- `runs/base-video/architecture.md`
  `b8f7f2d56ac4c89a3a9df6e5b47277bff8b54371fd1e1f0dbbd45a2d2e013dc6`
- `runs/base-video/execution.md`
  `47e084cdcfacec9f41d6a0fbfcfdecb3284ad6067cc33710ff22013ae3ee961b`
- `evaluation/run-a.md`
  `768329a0354174291566cb09f11c9651b6eb3147f07ebb7366559e3918f75a85`

冻结细项见 `FREEZE.sha256`，原版 12 文件细项见 `baseline/MANIFEST.sha256`；首次执行记录见 `runs/base-video/execution.md`，完整独立证据见 `evaluation/run-a.md`。
