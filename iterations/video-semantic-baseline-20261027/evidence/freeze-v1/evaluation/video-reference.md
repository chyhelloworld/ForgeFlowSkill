# 视频同题评价参考（仅给独立评价者）

## 使用限制与证据等级

这是与 `video-task.md` 配套的独立参考，不可提供给推导者。评价者不应根据候选来自哪个技能版本改变标准，不得把本参考中的视频具体实现全部升级为隐藏强制需求。

原视频：https://www.bilibili.com/video/BV1winH6DEgt/ ，标题《10分钟学会设计 Agent 架构》，作者 Hucci写代码，公开元数据时长 673 秒。

证据：实际查看覆盖全片的约 5 秒间隔 B 站官方预览帧及可读烧录字幕；未连续播放，未听音轨，没有完整字幕。以下时间是约定位范围，允许约 5 秒偏差，不能当精确逐字引文。预览索引含重复零及末尾空白。源码未取得，画面伪签名不等于已运行代码。

本地证据目录：`/workspace/scratch/637cd3902e7a/agent-video-analysis-20261027/`。`videoshot.json` 是索引；`storyboard1.jpg`、`storyboard2.jpg` 是原始预览拼图；`contact0.jpg` 至 `contact7.jpg` 是采样排版；`frames/ordinal-*.png` 是部分关键帧放大。放大不增加原始 480×270 单帧的细节。

证据分级：
- **画面可证**：下列对象、字段、行为、分层/目录示意和推导顺序。
- **分析归纳**：将它们概括为独立变化边界、用于评价语义等价性的解释。
- **未知**：完整源码、未采到的口头补充、详细安全/异常/并发等实现。未知不能用作扣分的隐藏标准。

## 画面可证：过程与结构

| 约时间 | 直接可见内容 |
|---|---|
| 00:20–01:10 | 八步流程：开始/继续对话、收到用户消息、组织上下文、调用模型、审核工具调用、执行工具/拒绝、循环、持久化。随后伪代码；有无工具调用和迭代上限的出口。 |
| 01:10–01:30 | 一组函数内混入模型协议；切换 OpenAI/Anthropic 协议导致多处内容改变。 |
| 01:30–02:45 | 领域层定义系统语言，应用层编排，适配层翻译外部系统；会话与 JSONL/数据库表示分开。 |
| 02:50–04:05 | Session、UserMessage、AssistantMessage、ToolCall、ToolResult、Message 逐步出现。 |
| 04:05–05:00 | 应用层 SessionStore 接口；JSONL/SQLite/假存储替换；适配层 JsonlSessionStore；依赖倒置字样。 |
| 05:00–05:45 | 领域 Tool 带描述信息及 execute 方法；适配层 BashTool。 |
| 05:45–06:35 | Context[O] 带 instruction/tools/messages/output_type；泛型区分输出类型；提及更多上下文材料但本期只保留基础字段。 |
| 06:35–07:30 | ModelClient、ModelSettings、Effort；OpenAI/Anthropic/Google Client；内部推理力度映射供应商参数。 |
| 07:30–08:30 | Assistant、ToolCallReviewer 各构造 Context；Decision 作为审核输出。 |
| 08:30–09:15 | AgentService 持有接口、两种角色、各自模型配置和迭代上限，并暴露会话/聊天用例。 |
| 09:10–09:25 | WebApi 将 HTTP 调用转给 AgentService；核心用例不绑定网页或命令行。 |
| 09:25–09:55 | main.py 创建具体 Client、JsonlSessionStore、AgentService、WebApi，标为组装根；演示替换具体模型实现。 |
| 09:55–10:10 | 目录落位；存储契约相关测试/TDD示意。 |
| 10:10–10:30 | 总结：梳理流程→定义系统语言→编排流程→应用定义接口、适配实现。 |
| 10:30–11:10 | 分叉对话、对话压缩作为扩展练习，不是已完成的必交付模块。 |

## 画面可证：对象职责和代表契约

以下为可读内容的规格化记述；标注方法意图比逐字符拼写重要。

### 对话与工具调用数据

- `Session`：`id`、`messages`，并有 `append(message)`；保存一段可继续的对话。
- `UserMessage`：文本。
- `AssistantMessage`：文本及 `tool_calls`。
- `ToolCall`：标识、工具名、参数。
- `ToolResult`：`tool_call_id`、`content`，能关联对应调用。
- `Message` 汇集用户、助手及工具结果等会话消息。不能由图认定其运行时必须是某一种继承/union实现。

### 工具与本次模型输入

- `Tool`：`name`、`description`、`parameters`；有 `execute(arguments) -> str`。结果文本进入 `ToolResult.content`。它不仅是描述数据，也带执行行为契约；具体 BashTool 在适配层。
- `Context[O]`：`instruction`、`tools`、`messages`、`output_type`。画面展示为此次模型输入与预期输出类型的契约，未展示自身执行模型调用的方法。
- 必须理解 Session 与 Context 的差别，但不必强制候选采用两个同名类：前者是对话记录，后者是某一次调用选择/组织的输入。

### 两种角色与审核结果

- `Assistant`：`instruction`、`tools`；`context(session: Session) -> Context[AssistantMessage]`。
- `ToolCallReviewer`：`instruction`；`context(session: Session, call: ToolCall) -> Context[Decision]`。
- `Decision`：`should_allow: bool`、`reason: str | None`。
- 图中两种角色负责形成不同指令/材料/输出预期，不能将它们误述为都包办持久化、厂商通信、循环的独立总服务。
- Decision 是结果，不是执行审核的服务。图示允许模型参与生成该结果，但不能推出它等于确定性授权或安全隔离。

### 外部能力契约与用例编排

- `SessionStore` 在应用层定义 `list`、`save`、`load` 所需能力，具体 JsonlSessionStore 在适配层。
- `ModelClient` 在应用层定义 `generate`，接受 Context 和模型设置，返回预期结果；不要求逐字符复现泛型签名。
- `ModelSettings` 包括模型选择及 `Effort`；各供应商具体 Client 转译外部协议。截图能显示参数映射思想，但不足以作为当前真实 SDK API 文档。
- `AgentService` 持有 `model_client`、`session_store`、`assistant`、`reviewer`、`assistant_model_settings`、`reviewer_model_settings`、`max_iterations`；对外展示新建会话、列出会话和聊天方法。列出会话的方法精确单复数拼写不作为评价项。
- AgentService 组织调用、审核、执行/拒绝、记录及循环；角色准备调用内容，Client 处理模型调用契约；这些职责可组合但不应互相混淆。
- `WebApi` 是外部输入适配；模型、存储和工具实现是外部能力适配。不能误认适配层只能是被业务向下调用的基础设施。
- `main.py` 选择具体实现并连接对象；业务用例不需要在内部到处选择厂商/存储。

## 画面可证：目录示例（约09:55–10:00）

```text
agent/
  domain/
    session.py   # Session, UserMessage, AssistantMessage, ToolCall, ToolResult, Message
    context.py   # Context
    tool.py      # Tool
    roles.py     # Assistant, ToolCallReviewer, Decision
  app/
    ports.py     # ModelClient, ModelSettings, Effort, SessionStore
    service.py   # AgentService
  adapters/
    models/      # anthropic_client.py, openai_client.py, google_client.py
    stores/      # jsonl.py
    api/         # web.py
    tools/       # bash.py
  main.py        # 组装根
```

该目录是视频的一种具体组织，不是强制答案。领域层含 append/context/execute 等行为，不是纯数据袋。应用层使用自己所需的能力契约，具体实现满足契约；启动处负责绑定。运行时调用方向不能直接当成源码依赖方向。

## 公平评价：什么算一致或更好

### 应比较的语义，不比较命名命中率

1. **流程覆盖**：能解释八步、工具分支/拒绝反馈及有限退出；各关键步骤有明确承载者。
2. **数据与行为契约**：对话、不同消息/调用/结果关联、本次调用输入、工具描述与执行、审查结果都有足以实现的表达。不能只列泛词而不讲谁做什么。
3. **内容策略与流程区分**：正常回答和审查的输入/输出差异有表达，完整循环有归属；不要求两个角色必须是类。
4. **可替换边界**：模型协议、存储表示和入口变化不大面积污染业务；接口由业务所需能力驱动；具体实现连接位置明确。
5. **可追溯交付**：流程能推出对象/模块，代表方法与关系图一致，目录能对应职责；不是凭空画漂亮结构。
6. **诚实处理未知**：不虚构视频提供了源码或生产安全保证，不把未要求能力悄悄变成达标条件。

### 可以接受的等价方案

- 不同命名、不同语言、不同文件/目录、不同层数；可采用函数、模块、协议、接口、数据类型、组合而非继承。
- 一个带判别字段的消息类型代替多个类，只要保持语义与调用结果关联。
- 纯函数生成正常/审查输入，或配置化角色，代替 Assistant/Reviewer 类。
- 用结构化返回值或其他类型表达审核结论与预期输出，代替名为 Decision 的类或显式 Context 泛型。
- 基于能力的依赖注入、显式参数或其他连接方式代替 main.py 类实例装配；前提是业务不绑定供应商具体格式。
- 不为每个供应商写完整实现；清楚展示统一契约与替换点即可。
- 合并或拆分模块只要能说明独立变化边界，不以类多/少自动计优劣。

### “更好”的判定边界

在覆盖同一任务、不偷偷扩题的前提下，若推导更清楚、关系更少但不丢语义、契约更明确、运行路径更易验证、假设更透明，可认定优于视频的教学表达或可实现性。额外功能更多、架构更复杂、术语更先进、恰好复刻全部名字均不能单独证明更好。可选安全建议若明确不构成任务承诺，可以加以肯定，但不能反过来扣罚没有加入该建议的候选。

## 未知、不能作为隐藏验收项

- 完整源码、精确方法单复数/所有类型拼写、框架及 SDK 版本。
- 存储事务时机、是否每步落盘、失败恢复、重试、幂等性和一致性。
- 并发、多用户隔离、流式响应、工具并行、取消、预算和部署。
- 人工审批、同步权限系统、确定性策略、沙箱、真实命令隔离边界。
- 审查模型是否可靠、是否充分阻止危险操作；不得把模型结论当安全证明。
- 分叉和压缩的具体设计，仅为末尾练习，不是本题强制项。

任何基于这些未知提出的改进必须标为候选的显式假设/可选建议；不得为了让某个既有方法失败而追加隐含要求。本参考在看到候选输出之前固定，后续若发现证据错误，应由父线程记录版本变化并统一适用于所有候选，而非单方移动标准。
