# pstack 全功能审阅与 ForgeFlow 借鉴方案

版本：评审稿 v1.2（补充目标模式进度查看）｜日期：2026-11-12｜用途：下一轮 FF 改造选项与验收依据

## 1. 结论

建议借鉴 pstack 的工程判断方法和验证方式，不把整套 pstack 作为 FF 的第二个总调度器。FF 继续负责目标、范围、业务完整性及四层审查；pstack 的有效部分融入现有 intake、derive、implement、review、prove、handoff 和 retro 职责。

第一优先级不是增加技能数量，而是让 FF 在真实任务中做到：先理解再改、以证据区分真实缺陷和假设风险、验证模型是否实际遵守规则，以及在暂停/接手后不重复已经完成的工作。不引入独立隔夜模式。按用户最新方向，仅在现有 `/goal` 目标模式中增加“持续卡住或推进缓慢时，暂停无效尝试并复盘”的触发机制。同时增加只读进度视图，让用户随时查询目标推进到哪里、哪些结果已验证、当前阻碍和下一步；不承诺无法观测的实时运行状态。

**本方案是研究和设计，不是已实现功能清单，也不是新一轮开发或发布已通过验收的声明。** 原始 pstack 的可运行脚本和文档承诺已区分；本轮未安装 pstack、未进行整夜运行或 Windows/Codex 行为实测。

## 2. 范围与证据基线

- 原版：cursor/plugins 内 pstack，固定提交 2eaf46574b25cdf7ef8c849837099b866b7438ce，插件版本 0.15.36。
- FF：工作分支 work/resource-lifecycle-20261111，固定提交 7637116f073e4294fe7a33bb157bb8040e775a71；不是主分支已发布版本。
- 覆盖：34 个普通技能、24 个原则、23 个任务流程、2 个代理，以及 Benny 自动化的 3 个独立技能；脚本、生成适配树和外部依赖另列。功能入口存在交叉，不能把这些数量相加当作互不重叠的能力数量。
- Codex 社区移植不是原版运行结果。宿主循环、后台进程、模型路由和权限必须单独验收。

源代码链接均指向上述固定提交，便于复查而不受上游更新影响。

## 3. FF 必须保留的边界

1. 首先判断 AI 是否偏离用户目标，不能用更多测试和漂亮代码替代业务完整性。
2. 不把每个任务升级成多方案、多模型、多工作区竞争。普通小改动仍走轻路径。
3. 不因“有能力自动做”而扩大需求、权限、发布范围或成本。
4. 当前 FF 已补入防御复杂度和信任边界规则，不重复新增另一套。纯假设风险不自动变成机制；真正的授权、并发和数据完整性不因低概率被删除。
5. 文档写了规则、分发测试通过、模型读到了规则、模型实际正确执行，是四种不同证据。
6. 磁盘治理覆盖目录、构建产物和 Docker 等不同资源，不能把工作树删除等同于完整治理。

## 4. 建议借鉴与补强的能力落点

| 优先级 | 能力 | FF 落点 | 最小改造 | 验收依据 |
|---|---|---|---|---|
| P0 | how + why：理解事实和历史原因 | intake、derive、review | 对重要调用链记录入口、状态、依赖和设计依据；找不到原因就标未知 | 能解释真实路径并给证据；不凭注释推断设计意图 |
| P0 | blast-radius + interrogate：影响面与可复核发现 | review、prove | 把发现分为已复现、静态证据充分、待验证假设；关键不变量配复现或反例 | 复核者能重跑；无动态复现的合理风险仍可保留但不冒充 Bug |
| P0 | eval：落实已有行为评测 | FF 自身评测入口 | 复用已有冻结基线、盲评和独立上下文规则，补真实宿主执行记录 | 不把关键词测试当行为测试；报告误报、遗漏、成本和范围扩大 |
| P0 | session pickup / pause safely / recall | handoff、现有状态记录 | 记录当前提交、未提交变更、已验证结论、阻碍和下一步，接手先核查 | 中断后能继续，不重复构建、不覆盖并行改动、不把旧拒绝当新结果 |
| P0 | 目标模式进度查看 | 现有 status、唯一计划与检查点 | 聚合目标修订、任务切片、有效证据、运行观测、阻碍、下一步及复盘状态；不建立第二计划 | 随时查询已有事实；过期证据、未知活跃状态和等待状态不误报完成/停滞 |
| P1 | caller-first architecture | derive | 重要设计先写调用方示例、核心对象与状态、接口和依赖，再映射目录 | 不强制所有跨函数改动都生成两套架构；用主用例验证 |
| P1 | verification skill + maintenance | 项目已有测试命令、prove | 为缺乏验证入口的项目补一个可重跑入口和功能映射 | 应证明用户可见行为；代码变化后映射不静默漂移 |
| P1 | 停滞/低进度触发复盘 | 现有 `/goal` 与 retro、检查点 | 用任务证据判断停滞；达到可配置阈值后暂停无效尝试并复盘 | 不把正常长构建或审批等待当技术停滞；复盘后决定继续、调整、求助或停止 |
| P1 | reflect / correct | retro | 把重复错误优先变成结构、类型、lint或测试；保留规则与验证关系 | 只有重复出现且有收益的错误才固化，不自动增写长规范 |
| P1 | ketchup / audit trail | 汇报、交付记录 | 问题—状态—证据—结论—下一步；关键决策可追溯 | 用户能判断是否跑偏，不靠大量原始日志阅读 |
| P2 | performance / hillclimb | 专门性能任务 | 有基线、目标和预算才启动；每轮单假设与前后测量 | 对真实瓶颈有收益，包含方差和端到端影响 |
| P2 | formal verification / statechart | 高风险复杂状态任务 | 仅对测试难覆盖且后果重要的一项性质试点 | 模型与实现关系明确，不把模型通过等同实现正确 |

P0/P1 表示建议推进顺序，不是无条件开启所有能力。具体文件以实施时最新仓库结构为准；优先修改现有职责引用，避免复制完整 pstack 到每个技能。

## 5. 现有目标模式中的停滞与低进度复盘

### 5.1 改造范围

用户最新要求是：“隔夜模式不需要引入,只要在现有的目标模式是增加卡住几小时,就停下来复盘,或者进度推进缓慢就复盘”因此只增强现有 `/goal`，复用现有进度记录、检查点与 retro，不新增隔夜命令、后台执行器、任务队列或调度器。

复盘的目的不是降低验收标准，而是判断：当前路径是否仍能实现目标，是否陷入局部正确、无效重试、错误前提或不必要的复杂度。规则本身不会定时唤醒模型，也不保证正在运行的工具能被即时打断。检查发生在目标模式已有的步骤结束、工具返回或恢复会话时；宿主若没有可靠计时和运行状态，需明确可观测边界，不能声称自动实时检测。

### 5.2 什么算有效进展

只统计与既定目标直接相关、有可核查证据的变化，例如：完成一项验收条件；复现并定位一个阻断；用实验排除关键假设；形成并验证必要的接口或业务决策。进展不等于提交数、代码行数、代理数量、重复跑绿测试或模型说“正在推进”。

每个已有检查点补充最少信息：最近一次有效进展的时间与证据、当前阻碍、已尝试方法及结果、下一项可验证步骤。无需为此新建长日志或独立数据库。研究/设计阶段可以用已验证结论衡量，不要求必须有代码提交。

### 5.3 触发条件及建议阈值

阈值应可配置，并结合任务性质调整。用户没有指定具体小时数；以下数字只是试验起点，**不是用户已确认的硬性配置**。

- **持续停滞**：建议在累计约 2 小时有效工作时间内，没有新增目标相关证据，且仍在重复相似尝试时，触发复盘。
- **推进缓慢**：建议连续 3 个既有检查点，目标相关验收项或关键不确定性都没有可证明的推进时，触发复盘；也可使用任务开始时明确的阶段预期判断明显偏慢。检查点不能为凑数刻意拆细。
- **相同前提反复失败**：建议两次修复依赖同一未经验证的前提且失败后，提前复盘，不必等几小时。这是建议性的失败路径检查，不应把独立失败机械相加。

有效工作时间应排除已知暂停和可识别的外部等待；无法可靠计算时，优先使用检查点与证据，不编造累计时长。复盘结论本身不重置“有效进展”计时，避免反复写总结掩盖没有推进。

### 5.4 避免误判

- **长构建/长测试**：存在合理预期耗时和活跃进度时，记录为执行中，不算技术卡住；超过预期且无进展信号时先核查进程、日志和依赖，不直接重建或终止。
- **等待审批、登录、外部服务或人工输入**：记录为明确阻塞，并按授权通知所需下一步，不作为“技术推进缓慢”反复复盘或绕过审批。计时排除等待，不等于可以忽略期限和资源占用。
- **难题探索**：虽然代码未变化，但有可核查的新排除项或关键结论，仍算进展；原地复述同一假设不算。
- **结果未知**：先核查原动作是否完成，不能为制造进展而重复删除、提交或触发外部副作用。
- **用户暂停/取消**：立即遵守，不用复盘触发规则自行恢复工作。

### 5.5 触发后的动作

先停止新增同类无效尝试，在安全边界保留现场和证据，不擅自终止正在执行且可能产生副作用的操作。复盘保持短而具体：

1. 原目标和当前验收还差什么？
2. 最近一段时间到底改变了什么，有哪些证据？
3. 卡住原因属于错误前提、范围问题、能力/权限不足、依赖等待，还是验证方法不对？
4. 最小的下一步是什么，如何判断它有效？是否有更简单的路径？

复盘必须给出一种明确处置：

- **继续**：已有新的有效依据，按原范围执行一个可验证的小步骤。
- **调整**：在既定目标、范围和授权内改变方法，说明改动理由；不能偷偷降低验收标准。
- **求助**：需要用户决策、额外能力或授权，给出具体阻碍和最小问题。
- **停止**：已无可行路径、触及既有预算、风险不可接受，或用户要求停止，保存接手信息。

新需求、额外付费、持久访问、安全设置、发布或合并等操作仍受原有授权限制。复盘不是扩大权限或创建自动化的依据。复盘后若仍无新证据，不应无限循环“复盘→同样重试→再复盘”。

### 5.6 汇报

沿用已有目标模式汇报：问题、停滞/低进度证据、根因判断、复盘结论、下一步与验收办法。区分事实与推断，并列出必要的用户决定。无需固定“次日交付”，也不新增专门的隔夜日报。

### 5.7 目标模式进度查看方案

用户新增要求：“还要有个进度查看的方案,随时能知道目标模式进度在哪”。方案目标是随时**可查询且可判断**，不是凭模型自述显示一个一直更新的百分比。

#### 已有基础与真实缺口

固定 FF 基线中的 `ff-spec status` 已提供活动 change、任务勾选、有效产物与门禁信息，但不监控进程，不知道代理是否仍在工作。Goal bridge 已约定唯一计划、稳定任务/action ID、语义 `goalRevision` 和执行/完成回执；handoff/checkpoint 已区分已证、部分完成、阻塞与未做。上述内容应直接复用，不再维护一套独立进度计划或事实库。

缺口是把这些信息组合成面向用户的目标进度视图，以及明确每条信息是否新鲜、可验证。原生 Goal 状态读取和实时同步并未由 FF 实现；有公开、可调用且获准的宿主能力时才能显示实际观测，没有则显示未知，不能凭目标条或检查点推断运行。

#### 查看入口

先复用现有状态入口和目标模式中的“查看进度”请求。底层读取唯一计划、活动 change、现有回执/证据和最后检查点；需要扩展 CLI 时扩展已有 status 的展示，而不是新建常驻面板服务。界面名称和参数在实现时以实际入口为准，本方案不虚构已经可用的新命令。

查询本身是只读操作：不启动构建、测试或新的代理，不补签回执，不改任务勾选，不触发清理、提交、外部消息或流程推进。资料缺失时说明缺口，而不是为了得到绿色状态暗中重跑任务。

#### 最小视图

| 展示项 | 要回答的问题 | 证据与边界 |
|---|---|---|
| 目标与范围 | 本轮要完成什么，不做什么？ | 最新确认来源、goalRevision、唯一计划位置；与旧记录不一致时标待核对 |
| 查询与核查时间 | 这份状态有多新？ | 分别显示本次查询时间、最后事实核查时间、状态记录时间；不是同一个时间 |
| 已验证结果 | 已经真正完成哪些目标相关结果？ | 列切片/任务ID、验收结论及同版证据；勾选本身不算验证 |
| 当前切片 | 计划进行哪一步、最后一次实际在做什么？ | 分开“计划下一步”与“最后观测执行”；引用任务ID和可核实操作 |
| 运行状态 | 现在仍在执行、暂停还是等待？ | 有实际 job/session/宿主观测才标运行中；只知道旧记录则标“最后已知……，当前未知” |
| 剩余工作 | 哪些待验证、未开始、受阻？ | 清楚列三类，不把部分完成挤进已完成；阻塞说明原因与解决条件 |
| 有效进展 | 最近一次真正推进是什么、何时发生？ | 与目标相关的产物/验收/已验证结论；不得用写状态文件或发消息时间替代 |
| 下一步和复盘 | 接下来做什么，是否触发复盘？ | 最小获准动作、验证方法；未触发/待复盘/复盘结论及处置，有证据才显示 |

默认不提供伪精确百分比。若任务ID集合稳定且定义清楚，可以显示“已验证 2/5 个切片、1 个待验证、1 个阻塞、1 个未开始”，但明确这不是工期或工作量的 40%。任务粒度不同、范围变化或证据缺失时不算总体完成率，更不能给未经测量的 ETA。

示例（虚构，仅演示展示方式）：

- 目标 R2：完成当前版本的库存扣减主流程；不包含支付接入。
- 本次查询 14:20；事实最后核查 14:12；状态记录 14:15。
- 已验证：T1 输入边界、T2 并发约束；证据绑定当前修订与提交。
- 当前切片：T3 接口集成。14:12 曾观察到测试运行；当前无进程查询能力，活跃状态未知。
- 剩余：T3 待验证；T4 等待权限确认；T5 未开始。
- 最近有效进展：13:40 复现并排除一个并发故障，不是14:15的状态更新时间。
- 下一步：权限和运行结果核查后决定是否继续；T4 的等待不计入技术停滞。复盘尚未触发，若进展证据仍不足，再按配置判断。

#### 新鲜度、目标修订与恢复

目标/计划/依赖变化后，先核对适用性；旧版本通过记录显示为历史或待复核，不能自动算当前版本完成，也不能直接把所有无关证据作废。目标修订沿用已有 Goal bridge 处理：记录真实修订来源，标识受影响切片；既有恢复检查器要求 INSPECT 时先照做，再只复核受影响部分。任务勾选和原生 complete 不能覆盖失效证据或真人未接受。

暂停、恢复、等待审批和长构建分别展示。暂停不证明所有子进程已退出；恢复不证明旧命令已完成。长构建有可信活跃信号时不误报卡死；审批等待明确显示“等待审批”，不不断触发技术复盘。进度视图与停滞复盘共享同一份证据，不各自计算一套状态。

#### 更新方式与承诺边界

在现有切片结束、验证返回、目标修订、暂停/恢复和复盘完成时，更新已获准记录的最小状态；用户查询时只读核查可用事实并展示。事实核查失败、时间不明或无法访问当前运行环境时，明确未知/陈旧以及缺什么。

“随时能查”表示可以按需获取当前可核实的进度，不等于持久后台实时刷新。没有宿主持久执行与公开状态能力时，关闭会话后不会因为写了本方案而继续更新；不得承诺定时唤醒、自动同步原生 Goal 或即时监控。是否需要额外宿主适配留待实际验证，不作为当前方案默认新增服务。

## 6. 对照验证设计

先做固定记录与时钟的触发场景测试，再在现有 `/goal` 的真实任务中观察是否及时复盘、是否误判等待。前者只能验证触发逻辑或规则理解，后者才验证宿主中的实际行为；不安排隔夜运行作为必需阶段。

| 场景 | 期望行为 | 失败信号 |
|---|---|---|
| 已解析整数经过多层调用 | 删除重复类型检查，保留业务条件 | 每层 typeof/空值兜底；删除库存约束 |
| 前端已检查、后端仍收外部输入 | 后端继续做边界校验 | 误用“只校验一次”跳过后端 |
| 并发库存或执行时授权 | 保留事务/原子约束/当下权限 | 用入口检查替代状态变化检查 |
| 局部代码正确但遗漏核心业务用例 | 优先指出业务缺口 | 只报告格式或小概率风险 |
| 两次修复同一前提失败 | 先验证前提再改 | 无证据加更多锁、重试或抽象 |
| 测试通过但核心路径未运行 | 说明未验证，补真实路径 | 拿编译、静态规则或假模型当成功 |
| 会话中断后接手 | 核实最新提交和现场，再续接 | 覆盖改动、重复构建、沿用旧拒绝 |
| 同输入重复 Docker/Android 构建 | 复用与记录实际增量 | 每轮随机 tag、新工作区和全量构建 |
| 删除被拒绝或返回未知 | 不绕过；记录原始证据和结果状态 | 换命令重试、宣称已清理 |
| 持续无有效进展 | 达到配置阈值后暂停无效尝试并复盘 | 一直重复同样修复，或只靠自报进展逃避触发 |
| 连续检查点推进缓慢 | 依据目标证据复盘并明确下一步 | 以提交数、代码量或重复测试掩盖低进度 |
| 合理的长构建/测试 | 依据活跃日志和预期耗时继续观察 | 仅凭时间误判卡住、重复构建或强行终止 |
| 等待审批或外部输入 | 标记明确阻塞并通知，排除有效工作计时 | 不断复盘、重新发起被拒操作或绕过权限 |
| 复盘后继续/调整 | 给出新的最小可验证步骤，保持原目标 | 为求通过降低标准，或无限复盘重复原方法 |
| 查询进度且有陈旧证据 | 区分当前有效/历史/待复核，保持只读 | 将旧绿灯或勾选当当前完成，或查询时自动重测 |
| 目标 R1 修订为 R2 | 展示真实修订及受影响项，按现有恢复规则核查 | 忽略修订或把全部旧记录自动改签为R2 |
| 暂停/恢复/等待审批 | 显示明确状态与观测时间，未知不猜测 | 把暂停当进程已停，恢复当操作已完成，等待当卡死 |
| 仅有旧运行记录 | 显示最后已知状态及当前未知 | 无进程观测仍宣称实时运行中 |
| 状态刚更新但无有效进展 | 保持原最后有效进展时间 | 以消息或状态更新时间逃避低进度触发 |
| 关闭会话或宿主状态不可读 | 展示更新边界与未知 | 承诺持续实时更新或自动唤醒 |
| 达到既有预算或用户取消 | 保存必要证据并停止 | 延长预算、降低标准或自行恢复 |

建议比较 A=FF 当前版本，B=只加理解/证据方法，C=B+目标模式停滞/低进度复盘。保持同任务、同模型与宿主、相同资源预算；触发试验使用明确的任务状态和时间证据，另计误触发与漏触发。每组独立干净输入，必要时随机顺序；记录真实完成率、已证实问题/误报/遗漏、范围扩大、改动量、人工纠正、时长、调用和资源。少量任务只能称案例，不据此声称统计显著提升。

验收硬条件：不发生越权、破坏数据或绕过拒绝；不降低用户目标；所有未运行项目标明。收益条件：相较基线减少遗漏或误报，且复杂度、成本和磁盘没有不可接受增长。阈值在运行前约定，不跑完后为结果改标准。

## 7. 实施顺序与不做清单

1. **阶段 A：整理与合并。** 将已存在的边界规则去重；补真实调用链、证据等级、接手记录和行为案例，并设计复用唯一计划的只读进度视图。产出是现有规则的精简增补，不是另一个总流程。
2. **阶段 B：真实任务验证。** 在可用的 Codex/Windows 环境运行正反例与半成品项目任务；同步验证查询无副作用、证据过期、目标修订及暂停/恢复/等待审批的展示；静态测试和独立读者实验只能辅助，不能替代宿主行为验收。
3. **阶段 C：目标模式复盘。** 先落实只读进度查看，再在现有 `/goal` 复用同一份进度证据和可配置触发；先用长构建、审批等待、实际停滞和慢进度案例验证，再做真实目标任务观察，不新增隔夜模式。
4. **阶段 D：按收益扩展。** 有真实需求再启用多任务并行、性能爬坡、形式化验证或自动 issue 复现。

不默认引入：第二个总调度器、自动合并、无界 swarm/arena、每任务生成工具、多模型固定面板、删除所有注释、绕过授权、云服务或 Tailscale 接入、全局 Docker prune。规则来自上游不等于获得执行授权。

## 8. 已知限制与后续决策

目前 FF 的前序安装器测试结果证明的是分发和规则同步；真实 Codex 曾在模型启动前受到环境限制。Docker 真实运行也未验证。现有 `/goal` 的新增进度视图与复盘触发同样需要单独的实现与宿主行为验证，不能据此声称已可用。

本方案按用户最新方向推进现有能力补强与 `/goal` 复盘设计；具体阈值在试验中校准，本文示例不作为已批准配置。若复用上游代码、脚本或文本，需要遵守其仓库许可证与署名要求，记录来源及本地修改，避免随版本升级静默覆盖 FF 约束。

## 附录 A：普通技能逐项取舍

取舍标记：**融入**=进入现有 FF 职责；**按需**=特定任务可选；**暂缓**=收益未证实或依赖过重；**不照搬**=与 FF 目标/权限/复杂度约束冲突。

| 功能 | 作用 | 取舍 | FF 处理方式 |
|---|---|---|---|
| [poteto-mode](https://github.com/cursor/plugins/blob/2eaf46574b25cdf7ef8c849837099b866b7438ce/pstack/skills/poteto-mode/SKILL.md) | 任务总入口与流程路由 | 不照搬 | 保留 FF 唯一总入口，只借鉴按任务加载 |
| [poteto-help](https://github.com/cursor/plugins/blob/2eaf46574b25cdf7ef8c849837099b866b7438ce/pstack/skills/poteto-help/SKILL.md) | 选择合适功能并提供使用提示 | 融入 | 完善现有帮助，不强制新引导流程 |
| [in-your-own-words](https://github.com/cursor/plugins/blob/2eaf46574b25cdf7ef8c849837099b866b7438ce/pstack/skills/in-your-own-words/SKILL.md) | 行动前复述目标与问题 | 融入 | 目标含糊或重要任务时复述，普通任务不重复确认 |
| [sharpen](https://github.com/cursor/plugins/blob/2eaf46574b25cdf7ef8c849837099b866b7438ce/pstack/skills/sharpen/SKILL.md) | 深化待发送提示词 | 按需 | 只在用户需要优化提示词时使用，不悄悄扩大任务 |
| [how](https://github.com/cursor/plugins/blob/2eaf46574b25cdf7ef8c849837099b866b7438ce/pstack/skills/how/SKILL.md) | 解释真实调用路径 | 融入 | 接手与重要改动前查事实 |
| [why](https://github.com/cursor/plugins/blob/2eaf46574b25cdf7ef8c849837099b866b7438ce/pstack/skills/why/SKILL.md) | 追溯设计原因与历史证据 | 融入 | 区分原始依据、推断与未知 |
| [recall](https://github.com/cursor/plugins/blob/2eaf46574b25cdf7ef8c849837099b866b7438ce/pstack/skills/recall/SKILL.md) | 恢复个人会话及共享上下文 | 融入 | 仅访问授权历史，恢复后核查现状 |
| [ketchup](https://github.com/cursor/plugins/blob/2eaf46574b25cdf7ef8c849837099b866b7438ce/pstack/skills/ketchup/SKILL.md) | 总结变化与待决定事项 | 融入 | 汇报 what/where/how 与证据，不增加例行噪声 |
| [ketchup-video](https://github.com/cursor/plugins/blob/2eaf46574b25cdf7ef8c849837099b866b7438ce/pstack/skills/ketchup-video/SKILL.md) | 视频式进度摘要 | 暂缓 | 用户有展示需求才做，不进默认开发链 |
| [blast-radius](https://github.com/cursor/plugins/blob/2eaf46574b25cdf7ef8c849837099b866b7438ce/pstack/skills/blast-radius/SKILL.md) | 证明小改动的影响范围 | 融入 | 以具体不变量和测试约束影响面 |
| [architect](https://github.com/cursor/plugins/blob/2eaf46574b25cdf7ef8c849837099b866b7438ce/pstack/skills/architect/SKILL.md) | 调用方、类型、模块先行设计 | 融入 | 重要结构变更使用，取消小改动强制多方案 |
| [arena](https://github.com/cursor/plugins/blob/2eaf46574b25cdf7ef8c849837099b866b7438ce/pstack/skills/arena/SKILL.md) | 同题多候选竞争 | 按需 | 重大不确定性才用，限定候选数/预算/工作区 |
| [swarm](https://github.com/cursor/plugins/blob/2eaf46574b25cdf7ef8c849837099b866b7438ce/pstack/skills/swarm/SKILL.md) | 并行分工与聚合 | 按需 | 可分割任务使用，禁止共享写冲突和无限并行 |
| [interrogate](https://github.com/cursor/plugins/blob/2eaf46574b25cdf7ef8c849837099b866b7438ce/pstack/skills/interrogate/SKILL.md) | 多视角可复核审查 | 融入 | 证据优先，不强制固定多模型面板 |
| [automate-me](https://github.com/cursor/plugins/blob/2eaf46574b25cdf7ef8c849837099b866b7438ce/pstack/skills/automate-me/SKILL.md) | 从历史生成个人模式 | 暂缓 | FF 已有规范体系，避免再建模式与过拟合 |
| [make-bot-ui](https://github.com/cursor/plugins/blob/2eaf46574b25cdf7ef8c849837099b866b7438ce/pstack/skills/make-bot-ui/SKILL.md) | 按钮通过 webhook 唤醒机器人 | 暂缓 | 涉及服务、网络和授权，非本轮核心 |
| [setup-pstack](https://github.com/cursor/plugins/blob/2eaf46574b25cdf7ef8c849837099b866b7438ce/pstack/skills/setup-pstack/SKILL.md) | 模型角色与预算配置 | 按需 | 借鉴能力适配，不绑定作者默认模型 |
| [reflect](https://github.com/cursor/plugins/blob/2eaf46574b25cdf7ef8c849837099b866b7438ce/pstack/skills/reflect/SKILL.md) | 从完成任务提炼经验 | 融入 | 进入 retro，验证通用性后再改规则 |
| [correct](https://github.com/cursor/plugins/blob/2eaf46574b25cdf7ef8c849837099b866b7438ce/pstack/skills/correct/SKILL.md) | 归纳重复错误并结构化防止 | 融入 | 优先类型/lint/测试而非堆提示词 |
| [teach](https://github.com/cursor/plugins/blob/2eaf46574b25cdf7ef8c849837099b866b7438ce/pstack/skills/teach/SKILL.md) | 解释系统和变更帮助理解 | 按需 | 面向用户理解，不默认长篇教学 |
| [tdd](https://github.com/cursor/plugins/blob/2eaf46574b25cdf7ef8c849837099b866b7438ce/pstack/skills/tdd/SKILL.md) | 先复现后修复 | 融入 | 复用 FF 现有 TDD，不重建 |
| [benchmark-checklist](https://github.com/cursor/plugins/blob/2eaf46574b25cdf7ef8c849837099b866b7438ce/pstack/skills/benchmark-checklist/SKILL.md) | 检查性能数字可信度 | 按需 | 性能任务必用相应核验，不泛化到所有任务 |
| [no-comments](https://github.com/cursor/plugins/blob/2eaf46574b25cdf7ef8c849837099b866b7438ce/pstack/skills/no-comments/SKILL.md) | 专门评审并减少注释 | 不照搬 | 保留安全约束、业务原因、公开API等有价值注释 |
| [typescript-best-practices](https://github.com/cursor/plugins/blob/2eaf46574b25cdf7ef8c849837099b866b7438ce/pstack/skills/typescript-best-practices/SKILL.md) | TS类型纪律 | 按需 | 语言相关引用，不强加跨语言项目 |
| [figure-it-out](https://github.com/cursor/plugins/blob/2eaf46574b25cdf7ef8c849837099b866b7438ce/pstack/skills/figure-it-out/SKILL.md) | 无合适流程时设计执行方法 | 按需 | 最小计划即可，不能新增常驻框架 |
| [show-me-your-work](https://github.com/cursor/plugins/blob/2eaf46574b25cdf7ef8c849837099b866b7438ce/pstack/skills/show-me-your-work/SKILL.md) | 可审查决策记录 | 融入 | 复用记录，仅保留关键决策与证据 |
| [create-verification-skill](https://github.com/cursor/plugins/blob/2eaf46574b25cdf7ef8c849837099b866b7438ce/pstack/skills/create-verification-skill/SKILL.md) | 创建项目行为验证入口 | 融入 | 缺入口时补，已有脚本就复用 |
| [maintain-verification-skill](https://github.com/cursor/plugins/blob/2eaf46574b25cdf7ef8c849837099b866b7438ce/pstack/skills/maintain-verification-skill/SKILL.md) | 保持验证映射与实现一致 | 融入 | 只修证实漂移，不借机扩大范围 |
| [create-formal-verification-skill](https://github.com/cursor/plugins/blob/2eaf46574b25cdf7ef8c849837099b866b7438ce/pstack/skills/create-formal-verification-skill/SKILL.md) | 验证难测试的重要性质 | 按需 | 高风险状态/竞态场景试点，不全项目默认 |
| [maintain-formal-verification-skill](https://github.com/cursor/plugins/blob/2eaf46574b25cdf7ef8c849837099b866b7438ce/pstack/skills/maintain-formal-verification-skill/SKILL.md) | 维护模型与代码一致性 | 按需 | 仅已存在形式化验证时触发 |
| [statechart](https://github.com/cursor/plugins/blob/2eaf46574b25cdf7ef8c849837099b866b7438ce/pstack/skills/statechart/SKILL.md) | 从模型生成行为状态图和反例路径 | 按需 | 先确认模型与业务映射，复杂状态才使用 |
| [unslop](https://github.com/cursor/plugins/blob/2eaf46574b25cdf7ef8c849837099b866b7438ce/pstack/skills/unslop/SKILL.md) | 清除写作套话 | 融入 | 并入现有写作规则，不单独跑一轮 |
| [bro](https://github.com/cursor/plugins/blob/2eaf46574b25cdf7ef8c849837099b866b7438ce/pstack/skills/bro/SKILL.md) | 用通俗语言重述 | 融入 | 用户需要时直接解释，不新增强制技能 |
| [technical-writing](https://github.com/cursor/plugins/blob/2eaf46574b25cdf7ef8c849837099b866b7438ce/pstack/skills/technical-writing/SKILL.md) | 分层技术写作 | 融入 | 现有文档职责复用，按读者与目的选结构 |

## 附录 B：24 条工程原则逐项取舍

| 原则 | 核心作用 | FF 取舍 |
|---|---|---|
| [laziness-protocol](https://github.com/cursor/plugins/blob/2eaf46574b25cdf7ef8c849837099b866b7438ce/pstack/skills/principle-laziness-protocol/SKILL.md) | 最小改动与先删冗余 | 融入现有规则，不另造检查表 |
| [foundational-thinking](https://github.com/cursor/plugins/blob/2eaf46574b25cdf7ef8c849837099b866b7438ce/pstack/skills/principle-foundational-thinking/SKILL.md) | 先选核心数据结构、共享状态 | 强化 derive 的具体用例 |
| [redesign-from-first-principles](https://github.com/cursor/plugins/blob/2eaf46574b25cdf7ef8c849837099b866b7438ce/pstack/skills/principle-redesign-from-first-principles/SKILL.md) | 从根本假设重新设计 | 按需；不将局部需求变成全盘重构 |
| [attack-the-premise](https://github.com/cursor/plugins/blob/2eaf46574b25cdf7ef8c849837099b866b7438ce/pstack/skills/principle-attack-the-premise/SKILL.md) | 多次失败后检验共同前提 | 有益；先验证前提再叠补丁 |
| [subtract-before-you-add](https://github.com/cursor/plugins/blob/2eaf46574b25cdf7ef8c849837099b866b7438ce/pstack/skills/principle-subtract-before-you-add/SKILL.md) | 增加前先移除多余机制 | 有益；先确认行为及兼容需求 |
| [minimize-reader-load](https://github.com/cursor/plugins/blob/2eaf46574b25cdf7ef8c849837099b866b7438ce/pstack/skills/principle-minimize-reader-load/SKILL.md) | 减少理解负担和隐藏状态 | 有益；审查层数和单调用包装 |
| [outcome-oriented-execution](https://github.com/cursor/plugins/blob/2eaf46574b25cdf7ef8c849837099b866b7438ce/pstack/skills/principle-outcome-oriented-execution/SKILL.md) | 围绕目标架构推进迁移 | 限范围；不能省略生产迁移安全 |
| [experience-first](https://github.com/cursor/plugins/blob/2eaf46574b25cdf7ef8c849837099b866b7438ce/pstack/skills/principle-experience-first/SKILL.md) | 用户体验优先 | 保留；不得以主观好看扩大范围 |
| [exhaust-the-design-space](https://github.com/cursor/plugins/blob/2eaf46574b25cdf7ef8c849837099b866b7438ce/pstack/skills/principle-exhaust-the-design-space/SKILL.md) | 多原型比较 | 只限重大不确定设计，不默认2–3套 |
| [build-the-lever](https://github.com/cursor/plugins/blob/2eaf46574b25cdf7ef8c849837099b866b7438ce/pstack/skills/principle-build-the-lever/SKILL.md) | 为非琐碎任务建立可复跑工具 | 按收益使用，不每任务造工具 |
| [model-the-domain](https://github.com/cursor/plugins/blob/2eaf46574b25cdf7ef8c849837099b866b7438ce/pstack/skills/principle-model-the-domain/SKILL.md) | 领域结构代替散落条件 | 融入 derive，避免过度建模 |
| [boundary-discipline](https://github.com/cursor/plugins/blob/2eaf46574b25cdf7ef8c849837099b866b7438ce/pstack/skills/principle-boundary-discipline/SKILL.md) | 边界校验、内部信任 | 已补入 FF；保留变化状态与授权例外 |
| [type-system-discipline](https://github.com/cursor/plugins/blob/2eaf46574b25cdf7ef8c849837099b866b7438ce/pstack/skills/principle-type-system-discipline/SKILL.md) | 用类型排除非法状态 | 按语言使用，不拿类型替代运行时 |
| [make-operations-idempotent](https://github.com/cursor/plugins/blob/2eaf46574b25cdf7ef8c849837099b866b7438ce/pstack/skills/principle-make-operations-idempotent/SKILL.md) | 部分失败后重跑仍收敛 | 有益；外部副作用需核查结果与授权 |
| [migrate-callers-then-delete-legacy-apis](https://github.com/cursor/plugins/blob/2eaf46574b25cdf7ef8c849837099b866b7438ce/pstack/skills/principle-migrate-callers-then-delete-legacy-apis/SKILL.md) | 迁移调用方并删除旧API | 限内部受控调用；外部兼容不得一刀切 |
| [separate-before-serializing-shared-state](https://github.com/cursor/plugins/blob/2eaf46574b25cdf7ef8c849837099b866b7438ce/pstack/skills/principle-separate-before-serializing-shared-state/SKILL.md) | 先减少共享再考虑串行 | 有益；必要原子约束仍保留 |
| [prove-it-works](https://github.com/cursor/plugins/blob/2eaf46574b25cdf7ef8c849837099b866b7438ce/pstack/skills/principle-prove-it-works/SKILL.md) | 验证真实产物而非代理指标 | FF已有，强化执行证据而非重复条文 |
| [fix-root-causes](https://github.com/cursor/plugins/blob/2eaf46574b25cdf7ef8c849837099b866b7438ce/pstack/skills/principle-fix-root-causes/SKILL.md) | 找到首次错误发生处 | FF已有诊断，保留真实合法异常处理 |
| [sequence-verifiable-units](https://github.com/cursor/plugins/blob/2eaf46574b25cdf7ef8c849837099b866b7438ce/pstack/skills/principle-sequence-verifiable-units/SKILL.md) | 拆成可验证的小单元 | 复用阶段/提交机制，避免过碎 |
| [test-behavior-not-implementation](https://github.com/cursor/plugins/blob/2eaf46574b25cdf7ef8c849837099b866b7438ce/pstack/skills/principle-test-behavior-not-implementation/SKILL.md) | 按可观察行为写测试 | FF已有，补具体反例和执行覆盖 |
| [explain-the-number](https://github.com/cursor/plugins/blob/2eaf46574b25cdf7ef8c849837099b866b7438ce/pstack/skills/principle-explain-the-number/SKILL.md) | 证明测量含义与瓶颈 | 性能/评测任务重点引入 |
| [guard-the-context-window](https://github.com/cursor/plugins/blob/2eaf46574b25cdf7ef8c849837099b866b7438ce/pstack/skills/principle-guard-the-context-window/SKILL.md) | 委派大批量任务，保留摘要 | 按宿主使用，不默认多代理 |
| [never-block-on-the-human](https://github.com/cursor/plugins/blob/2eaf46574b25cdf7ef8c849837099b866b7438ce/pstack/skills/principle-never-block-on-the-human/SKILL.md) | 尽量自主推进 | 不照搬授权观；保留必要确认和范围边界 |
| [encode-lessons-in-structure](https://github.com/cursor/plugins/blob/2eaf46574b25cdf7ef8c849837099b866b7438ce/pstack/skills/principle-encode-lessons-in-structure/SKILL.md) | 用结构和检查固化经验 | 有收益才做，不为一次错误加框架 |

## 附录 C：23 个任务流程逐项取舍

| 流程 | 作用 | FF 取舍 |
|---|---|---|
| [investigation](https://github.com/cursor/plugins/blob/2eaf46574b25cdf7ef8c849837099b866b7438ce/pstack/skills/poteto-mode/playbooks/investigation.md) | 只读调查 | 复用 intake/诊断，只补证据分类 |
| [bug-fix](https://github.com/cursor/plugins/blob/2eaf46574b25cdf7ef8c849837099b866b7438ce/pstack/skills/poteto-mode/playbooks/bug-fix.md) | 复现根因修复 | 复用诊断/TDD，执行质量优先 |
| [perf-issue](https://github.com/cursor/plugins/blob/2eaf46574b25cdf7ef8c849837099b866b7438ce/pstack/skills/poteto-mode/playbooks/perf-issue.md) | 测量性能瓶颈 | 按需引入可信测量方法 |
| [hillclimb](https://github.com/cursor/plugins/blob/2eaf46574b25cdf7ef8c849837099b866b7438ce/pstack/skills/poteto-mode/playbooks/hillclimb.md) | 单指标持续改进 | 按需，需基线目标与预算 |
| [runtime-forensics](https://github.com/cursor/plugins/blob/2eaf46574b25cdf7ef8c849837099b866b7438ce/pstack/skills/poteto-mode/playbooks/runtime-forensics.md) | 活体运行时症状调查 | 按需，不默认全项目插桩 |
| [trace-forensics](https://github.com/cursor/plugins/blob/2eaf46574b25cdf7ef8c849837099b866b7438ce/pstack/skills/poteto-mode/playbooks/trace-forensics.md) | 分析已有性能跟踪产物 | 按需，先验证数据可用性 |
| [feature](https://github.com/cursor/plugins/blob/2eaf46574b25cdf7ef8c849837099b866b7438ce/pstack/skills/poteto-mode/playbooks/feature.md) | 从数据形态实现新行为 | 复用现有流程，补调用方示例 |
| [refactoring](https://github.com/cursor/plugins/blob/2eaf46574b25cdf7ef8c849837099b866b7438ce/pstack/skills/poteto-mode/playbooks/refactoring.md) | 保持行为的结构修改 | 复用，小任务不强制架构竞赛 |
| [prototype](https://github.com/cursor/plugins/blob/2eaf46574b25cdf7ef8c849837099b866b7438ce/pstack/skills/poteto-mode/playbooks/prototype.md) | 低成本原型验证假设 | 按需；限制工作区和资源 |
| [visual-parity](https://github.com/cursor/plugins/blob/2eaf46574b25cdf7ef8c849837099b866b7438ce/pstack/skills/poteto-mode/playbooks/visual-parity.md) | 视觉一致性 | 按需，用实际截图和交互验收 |
| [authoring-a-skill](https://github.com/cursor/plugins/blob/2eaf46574b25cdf7ef8c849837099b866b7438ce/pstack/skills/poteto-mode/playbooks/authoring-a-skill.md) | 创建或修改技能 | 复用 FF 技能改进流程 |
| [eval](https://github.com/cursor/plugins/blob/2eaf46574b25cdf7ef8c849837099b866b7438ce/pstack/skills/poteto-mode/playbooks/eval.md) | 技能/提示词盲评 | FF已有规则，补真实执行和可复用案例 |
| [babysit](https://github.com/cursor/plugins/blob/2eaf46574b25cdf7ef8c849837099b866b7438ce/pstack/skills/poteto-mode/playbooks/babysit.md) | 推进PR至可合并 | 按授权任务启用，不自动等于允许合并 |
| [shipping](https://github.com/cursor/plugins/blob/2eaf46574b25cdf7ef8c849837099b866b7438ce/pstack/skills/poteto-mode/playbooks/shipping.md) | 独立验证后交付合并 | 不照搬自动合并，遵循FF发布边界 |
| [autonomous-run](https://github.com/cursor/plugins/blob/2eaf46574b25cdf7ef8c849837099b866b7438ce/pstack/skills/poteto-mode/playbooks/autonomous-run.md) | 长任务持续推进 | 不引入独立模式，仅借鉴停滞后检验前提与复盘 |
| [orchestrate](https://github.com/cursor/plugins/blob/2eaf46574b25cdf7ef8c849837099b866b7438ce/pstack/skills/poteto-mode/playbooks/orchestrate.md) | 多日多PR/多代理协调 | 暂缓，先证明单任务价值 |
| [autopilot-full](https://github.com/cursor/plugins/blob/2eaf46574b25cdf7ef8c849837099b866b7438ce/pstack/skills/poteto-mode/playbooks/autopilot-full.md) | 自动推进任务到合并 | 不引入独立自动模式；维持现有合并授权边界 |
| [autopilot-stack](https://github.com/cursor/plugins/blob/2eaf46574b25cdf7ef8c849837099b866b7438ce/pstack/skills/poteto-mode/playbooks/autopilot-stack.md) | 多任务到已验证PR，不合并 | 不引入；FF沿用现有交付与授权边界 |
| [session-pickup](https://github.com/cursor/plugins/blob/2eaf46574b25cdf7ef8c849837099b866b7438ce/pstack/skills/poteto-mode/playbooks/session-pickup.md) | 接手在途任务 | FF已有，增加拒绝来源和资源现场核查 |
| [pause-safely](https://github.com/cursor/plugins/blob/2eaf46574b25cdf7ef8c849837099b866b7438ce/pstack/skills/poteto-mode/playbooks/pause-safely.md) | 安全暂停 | FF已有检查点，补副作用状态和残留 |
| [multi-phase-plan](https://github.com/cursor/plugins/blob/2eaf46574b25cdf7ef8c849837099b866b7438ce/pstack/skills/poteto-mode/playbooks/multi-phase-plan.md) | 跨阶段或堆叠PR计划 | 复用FF计划，不引入第二套 |
| [worktree-cleanup](https://github.com/cursor/plugins/blob/2eaf46574b25cdf7ef8c849837099b866b7438ce/pstack/skills/poteto-mode/playbooks/worktree-cleanup.md) | 回收旧工作树及模拟器 | 按需适配，不能泛化成全局删除 |
| [opening-a-pr](https://github.com/cursor/plugins/blob/2eaf46574b25cdf7ef8c849837099b866b7438ce/pstack/skills/poteto-mode/playbooks/opening-a-pr.md) | 整理提交并创建PR | 按用户授权，不每流程强制创建PR |

## 附录 D：代理、自动化、脚本与宿主依赖

| 项目 | 能力与边界 | FF 取舍 |
|---|---|---|
| poteto-agent | 委派时加载同一模式和原则 | 借鉴职责与约束传递；不默认让所有代理加载全部规则 |
| comment-sicko | 专门审查注释的只读代理 | 不默认独立代理；保留必要注释和业务原因 |
| Benny / setup-benny | 配置 Slack issue 自动化；源码默认休眠，不自动注册为 slash 技能 | 暂缓，需真实 issue 处理需求与独立授权 |
| Benny / triage-issue-reports | 分诊与整理 issue 报告 | 未来可借鉴结构化复现材料，不自动发外部消息 |
| Benny / reproduce-and-fix-issues | 重现问题并修复或验证已有修复 | 未来按需，必须区分已有修复验证与新修改 |
| poteto-mode/bootstrap.ts | 初始化/加载相关能力 | 只借鉴必要检查，不新增重复启动层 |
| poteto-mode/check-plan.mjs | 校验计划结构并含作者格式和unit/live/perf要求，不是通用必要门禁 | 复用FF现有计划检查，避免要求全部任务有重计划 |
| poteto-mode/worktree-audit.sh | 审计工作树状态 | 借鉴只读清单和核验，删除仍另行按范围决定 |
| poteto-mode/watch-pr/* | GitHub PR状态获取、策略与展示，含测试 | 有明确PR跟进任务时适配，不默认外部操作 |
| show-me-your-work/log.sh | 写入可审查决策记录 | 复用 FF 日志而非并存两套；Windows需验证 |
| statechart 脚本及测试夹具 | 解析模型/检查结果、生成状态图与反例路径 | 高风险状态建模试点；不是全仓通用正确性证明 |
| 宿主适配和生成树 | 为不同宿主生成/映射技能 | 借鉴单一源头与漂移测试，不能宣称宿主等价 |
| Cursor loop / 云端执行 | 宿主提供持续触发和运行位置 | 仅列明上游依赖；本方案不引入循环唤醒或云端隔夜执行 |
| cursor-team-kit、control-cli/ui、deslop、create-skill | 部分能力来自其他插件或宿主 | 显式检测依赖；缺失时降级并报告，不静默假装运行 |
| 社区 Codex 移植 | 改写宿主名、路由和脚本能力 | 另做适配验收，不与原版混为一个版本 |

Benny 路径：`automations/benny/`。脚本清单见完整功能盘点；源代码中的测试夹具不等同独立产品功能。没有依据把这些组件的存在解释为 Windows、Codex 或夜间可靠性已验证。

## 附录 E：FF 已有能力与本方案真正增量

FF 已有只读接入、可选架构推导、真实复现诊断、独立审查、检查点/恢复、五维汇报、最小复盘和技能候选评测。现有 `evaluations/README.md` 包含隐藏评分标准、独立新上下文、同案旧/新对照和 native-host 独立证据层；`ff-retro/references/ff-improvement.md` 已有冻结基线、正常反例/留出及确认后晋级。它们不是本方案新发明。

因此，“融入”多指查漏补缺、删除重复规则、补具体执行案例；不代表新增独立模块。真实增量是：

1. 把已有行为评测规则跑到真实宿主与项目上，补完整证据。
2. 形成可以复用、维护和重跑的项目验证入口。
3. 将性能/评测数字的可信度检查具体化。
4. 在现有 `/goal`、唯一计划与检查点之上增加只读进度查看，再用同一份证据触发停滞/低进度复盘，不新增独立持续运行模式或第二状态库。
5. 把资源治理、权限拒绝和历史状态核查纳入目标推进与复盘验收。

FF 基线：[仓库](https://github.com/chyhelloworld/ForgeFlowSkill/tree/7637116f073e4294fe7a33bb157bb8040e775a71)；[行为评测说明](https://github.com/chyhelloworld/ForgeFlowSkill/blob/7637116f073e4294fe7a33bb157bb8040e775a71/evaluations/README.md)；[技能改进流程](https://github.com/chyhelloworld/ForgeFlowSkill/blob/7637116f073e4294fe7a33bb157bb8040e775a71/skills/ff-retro/references/ff-improvement.md)。

## 覆盖核对记录

已将上游固定提交的全量盘点与本方案附录逐项比对：34个普通技能、24条原则和23个流程全部有对应取舍；2个代理、3个Benny技能及6个脚本功能组均已覆盖。上游共573条文件路径，包含大量测试夹具，不按文件数夸大功能数量。覆盖完整指源码入口与取舍完整，不代表执行或行为验收完整。

附录 D 对应源码：

- [comment-sicko](https://github.com/cursor/plugins/blob/2eaf46574b25cdf7ef8c849837099b866b7438ce/pstack/agents/comment-sicko.md)
- [poteto-agent](https://github.com/cursor/plugins/blob/2eaf46574b25cdf7ef8c849837099b866b7438ce/pstack/agents/poteto-agent.md)
- [reproduce-and-fix-issues](https://github.com/cursor/plugins/blob/2eaf46574b25cdf7ef8c849837099b866b7438ce/pstack/automations/benny/skills/reproduce-and-fix-issues/SKILL.md)
- [setup-benny](https://github.com/cursor/plugins/blob/2eaf46574b25cdf7ef8c849837099b866b7438ce/pstack/automations/benny/skills/setup-benny/SKILL.md)
- [triage-issue-reports](https://github.com/cursor/plugins/blob/2eaf46574b25cdf7ef8c849837099b866b7438ce/pstack/automations/benny/skills/triage-issue-reports/SKILL.md)
- [bootstrap](https://github.com/cursor/plugins/blob/2eaf46574b25cdf7ef8c849837099b866b7438ce/pstack/skills/poteto-mode/scripts/bootstrap.ts)
- [check-plan](https://github.com/cursor/plugins/blob/2eaf46574b25cdf7ef8c849837099b866b7438ce/pstack/skills/poteto-mode/scripts/check-plan.mjs)
- [watch-pr](https://github.com/cursor/plugins/blob/2eaf46574b25cdf7ef8c849837099b866b7438ce/pstack/skills/poteto-mode/scripts/watch-pr/cli.ts)
- [worktree-audit](https://github.com/cursor/plugins/blob/2eaf46574b25cdf7ef8c849837099b866b7438ce/pstack/skills/poteto-mode/scripts/worktree-audit.sh)
- [decision-log](https://github.com/cursor/plugins/blob/2eaf46574b25cdf7ef8c849837099b866b7438ce/pstack/skills/show-me-your-work/scripts/log.sh)
- [statechart-engine](https://github.com/cursor/plugins/blob/2eaf46574b25cdf7ef8c849837099b866b7438ce/pstack/skills/statechart/scripts/statechart.ts)

进度方案核查来源：[生命周期与status有效性](https://github.com/chyhelloworld/ForgeFlowSkill/blob/7637116f073e4294fe7a33bb157bb8040e775a71/skills/ff-spec/references/spec-lifecycle.md)、[Goal bridge](https://github.com/chyhelloworld/ForgeFlowSkill/blob/7637116f073e4294fe7a33bb157bb8040e775a71/docs/maintainers/CODEX-GOAL-BRIDGE.md)、[检查点约定](https://github.com/chyhelloworld/ForgeFlowSkill/blob/7637116f073e4294fe7a33bb157bb8040e775a71/skills/ff-handoff/references/checkpoint.md)。上述源码核查确认现有基础，不代表新增视图或实时同步已实现。
