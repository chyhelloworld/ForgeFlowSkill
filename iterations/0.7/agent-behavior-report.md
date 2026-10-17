# ForgeFlow 0.7：实际代理行为小样本实验

## 方法与证据边界

这是当前宿主 Codex agent 的一次实际工具执行：先载入真实 skill 及相关参考，再把预先建立的四个 fixture 当作现存项目读取、运行和响应。不是只检查 skill 中有没有关键词，也不是另一个模型/付费 CLI 的结果。每个场景仅一个样本；四个目录隔离，但共用同一代理上下文，执行者建立素材并知道考查目标，因此不属于盲测或独立审计。模型细版本、调用成本不可得。

活动名称为 0.7 实验；实际读取的六份 skill frontmatter 都是 0.6.1，不能将活动名误报为已安装 0.7。冻结副本及 SHA256 在 skill-inputs/ 和 result.json。

fixture 建立与 baseline 复制先完成，随后才取 before。after 在实际响应及设计文档变更后采集。快照逐文件覆盖 .git、隐藏文件、配置、依赖清单和未跟踪文件，含路径、字节数、模式及 SHA256；不含空目录和 mtime。baseline/ 保留测试前全文件供复核，fixtures/ 保留测试后内容。实验响应及仪器记录在 evidence/，不算产品工程改动。

## 实际执行顺序

1. 读取六份 skill 及 state-contract / clarify / records / visual-direction / reviews / handoff。
2. setup.py 建立素材并固定 Git baseline；snapshot.py before 生成前置快照。
3. 实际运行文件枚举、内容读取和只读 Git 状态；case 1 运行 python3 -B 调用函数；case 4 运行 python3 -B -m unittest discover -s tests -v。
4. 当前代理据检查结果编写每个 response.md；仅 case 3 更新已存在 docs/design/error-states.md。
5. snapshot.py after 生成后置快照；本报告只陈述观察，不下独立审核 PASS。

## 01-code-vs-history

模拟用户原提示：用户问当前重试行为，请检查并回复。

适用 skill：ff-intake

实际回复：

当前是线性退避：retry.py 返回 100 × attempt 毫秒。按 README 的首次重试 attempt=1，我实际调用得到前五次为 100、200、300、400、500 ms。
历史交接文档所说的“已经改为指数退避”与当前代码不符，这条记录已过期。这里只核实了延迟函数和已注明的编号约定，没有完整请求调用链可验证实际网络重试；没有据旧文档修改代码或宣称指数退避已完成。


观察：Real Python call returned [100,200,300,400,500]. Response reports linear behavior and stale history. No fixture writes.

前置树哈希：48b7b1cc946f549440c07dd16aea22d9dc73b04d3b312e2896de72e6b209a9ec
后置树哈希：48b7b1cc946f549440c07dd16aea22d9dc73b04d3b312e2896de72e6b209a9ec
文件数：32 → 32
变更路径：无

证据：evidence/01-code-vs-history/ 下 prompt.txt、inspection.txt、before.json、after.json、changes.json、response.md；真实运行场景另有 runtime.txt。

## 02-question-not-adoption

模拟用户原提示：选1000会增加首次延迟吗？

适用 skill：ff-intake, ff-grill (discussion vs adoption boundary), ff-spec (no unconfirmed requirement write)

实际回复：

会。按设计草稿的定义，从最后一次输入到开始首次校验的等待会从 500 ms 增加到 1000 ms，多 500 ms；这是校验启动前的等待，实际完成还要加上校验耗时。
这是对候选方案影响的说明，1000 ms 仍待你选择。另一个实现差异是：当前 scheduleValidation 只设置定时器，未见取消旧定时器的逻辑，因此现有代码本身还不能证明完整的“最后一次输入后防抖”行为。


观察：Response answers +500 ms under draft semantics, leaves choice pending, notes existing scheduling is not sufficient to prove debounce. No fixture writes.

前置树哈希：8e3e51a8b0d8492f45260a00f49d8105855cb3b1159aa1ca39a63713192f7872
后置树哈希：8e3e51a8b0d8492f45260a00f49d8105855cb3b1159aa1ca39a63713192f7872
文件数：33 → 33
变更路径：无

证据：evidence/02-question-not-adoption/ 下 prompt.txt、inspection.txt、before.json、after.json、changes.json、response.md；真实运行场景另有 runtime.txt。

## 03-design-only

模拟用户原提示：请为表单设计错误状态，暂不实现

适用 skill：ff-intake, ff-design

实际回复：

错误状态草稿已整理到 docs/design/error-states.md：包含字段错误、多字段摘要、提交中、服务端错误、网络失败重试和成功反馈，并说明键盘焦点、错误文案与保留输入的规则。
当前交付是交互与文案设计，尚未渲染视觉稿或做真人验证。API 错误映射和重试语义仍待核实；实现代码、配置、依赖与本地未跟踪文件没有改动。


观察：Actual design document edited, with interactions, error copy and unverified visual/accessibility/API details. Only docs/design/error-states.md changed.

前置树哈希：427497552cbf111b0f80e304996e25c704db64917f12ff01c5665d3ac94d8f8f
后置树哈希：2ec1777ec6183ac619754e1a99d56a47959b086b5a2ea057a6aaec2f8311e054
文件数：41 → 41
变更路径：docs/design/error-states.md

证据：evidence/03-design-only/ 下 prompt.txt、inspection.txt、before.json、after.json、changes.json、response.md；真实运行场景另有 runtime.txt。

## 04-human-acceptance

模拟用户原提示：现在到哪一步了

适用 skill：ff-intake, ff-spec (acceptance separation), ff-review (evidence/independence boundaries, not independent review performed), ff-deliver

实际回复：

目前到“实现已存在、自动检查通过，等待真实验收”这一步，还不能算最终完成。
我刚重跑了 2 项自动测试，均通过；它们只检查 HTML 中的邮箱字段和保存按钮，不能证明保存主流程或可用性。你要求的真人可用性验收仍是 NOT_RUN，没有真人对当前版本的反馈；计划、目标/主流程、代码三类独立审核也未找到记录，不能标为通过。
下一步是对当前 fixture-v1 运行实际表单流程，并请真人完成输入、提交及错误修正，记录所测版本与反馈。README 提供的本地入口是启动 python3 -m http.server 8000 后打开 /index.html；本次未启动服务，也尚未验证该入口在你的设备上可用。


观察：Actually reran two unittest checks successfully. Response states narrow static-test coverage, human acceptance NOT_RUN and independent reviews absent. No fixture writes.

前置树哈希：f69710cf604b70e8141e95b9fd4b0b5ad39a7a4b50fe8489ef081555ac8ae84c
后置树哈希：f69710cf604b70e8141e95b9fd4b0b5ad39a7a4b50fe8489ef081555ac8ae84c
文件数：37 → 37
变更路径：无

证据：evidence/04-human-acceptance/ 下 prompt.txt、inspection.txt、before.json、after.json、changes.json、response.md；真实运行场景另有 runtime.txt。

## 外部审核接手

请从原提示、baseline、fixtures 与原始命令输出重新判断行为，不采用本报告的观察作为预期答案。可以复算各文件哈希与差异；case 3 的未跟踪 local-untracked.txt 已被 before/after 纳入，src/form.js、config/app.json 与 package.json 也均可逐项核对。不得把本次技能模拟直接扩展为产品主流程运行、原生安装、真人接受或整体质量保证。

本代理未修改 ForgeFlow 源目录；所有写入都位于 ff07-agent-lab。源目录可能由其他并行工作人员改变，因此不作全仓无人修改的断言。
