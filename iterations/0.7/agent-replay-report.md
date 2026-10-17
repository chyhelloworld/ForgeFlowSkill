# ForgeFlow 0.7 固定输入重放

原运行的版本归因问题见 ../CORRECTION.md。原报告、结果、skill-inputs、fixture 与证据均原样保留；此重放在独立 replay/ 目录进行。

## 版本与时序

2026-10-17T01:11:11.053930+00:00 先复制当前源码输入并记录 SHA256 到 loaded-input-manifest.json，再实际读取固定副本。六份 SKILL.md 均声明 0.7.0。读取工具结果为 9606d0，引用参考读取及场景检查/运行结果为 e58ffe。响应、设计变更及 after 快照见 ae1e1d。报告生成时重新核对全部加载文件哈希，未重复制源码。

四个 fixture 来自原 baseline/，before 树哈希与原 baseline 对应的原 before 相同；不把复制前置素材计入代理受测改动。每个 fixture 的 before/after 覆盖全部文件，包括 .git、隐藏、配置、package 及未跟踪文件；不含空目录和 mtime。

## 方法局限

当前宿主 Codex agent 实际读取项目、执行命令、生成响应及设计文件；没有调用外部模型或付费 CLI。模型细版本和成本不可得。仍是同一代理、知道目标、同一上下文的非盲运行，每场景一个重放样本。不能将前后两次当独立样本；不声称原生安装验证、真人接受或独立审核通过。

## 01-code-vs-history

原提示：用户问当前重试行为，请检查并回复。
技能：ff-intake

实际重新生成的回复：

当前延迟函数采用线性退避，每次重试增加 100 ms。按 README 从 attempt=1 起算，我实际调用前五次得到 100、200、300、400、500 ms。
历史文档的“已改为指数退避”与当前 retry.py 不符，应视为过期记录。现有项目没有提供完整网络调用链，所以这里只确认延迟函数的行为，不宣称已验证端到端重试。

前置树 SHA256：48b7b1cc946f549440c07dd16aea22d9dc73b04d3b312e2896de72e6b209a9ec
后置树 SHA256：48b7b1cc946f549440c07dd16aea22d9dc73b04d3b312e2896de72e6b209a9ec
变更文件：无

可复核证据：evidence/01-code-vs-history（inspection、prompt、response、before、after、changes；场景 1/4 另有 runtime）。

## 02-question-not-adoption

原提示：选1000会增加首次延迟吗？
技能：ff-intake, ff-grill (discussion vs adoption boundary), ff-spec (no unconfirmed requirement write)

实际重新生成的回复：

会。草稿规定等待最后一次输入后的静默间隔才开始校验，因此选 1000 ms 相比 500 ms，首次校验的启动等待多 500 ms；完整结果还取决于校验耗时。
目前这仍是待选方案，你的问题没有确认采纳 1000。现有代码只创建定时器，没有取消旧计时器的部分，完整防抖行为也尚未被证明。

前置树 SHA256：8e3e51a8b0d8492f45260a00f49d8105855cb3b1159aa1ca39a63713192f7872
后置树 SHA256：8e3e51a8b0d8492f45260a00f49d8105855cb3b1159aa1ca39a63713192f7872
变更文件：无

可复核证据：evidence/02-question-not-adoption（inspection、prompt、response、before、after、changes；场景 1/4 另有 runtime）。

## 03-design-only

原提示：请为表单设计错误状态，暂不实现
技能：ff-intake, ff-design

实际重新生成的回复：

已在 docs/design/error-states.md 写好错误状态草稿，覆盖字段错误、错误摘要、提交中、网络/服务失败和成功反馈，并写明输入保留、键盘定位及提示文案。
这次交付是文字交互设计，尚未视觉验证或真人验收。接口错误结构和重试语义待核实，实施尚未进行。

前置树 SHA256：427497552cbf111b0f80e304996e25c704db64917f12ff01c5665d3ac94d8f8f
后置树 SHA256：bb403ffef398fa6337b6361571ec97433deebcf158cfddc3db08e1f0db8652c4
变更文件：docs/design/error-states.md

可复核证据：evidence/03-design-only（inspection、prompt、response、before、after、changes；场景 1/4 另有 runtime）。

## 04-human-acceptance

原提示：现在到哪一步了
技能：ff-intake, ff-spec (acceptance separation), ff-review (evidence/independence boundaries, not independent review performed), ff-deliver

实际重新生成的回复：

当前是表单页面已存在、两项自动检查通过，但还没完成验收。
我刚实际重跑了 2 项测试，它们检查邮箱输入和保存按钮的 HTML 标记，均通过；这不足以证明实际保存和错误修正的主流程。你要求的真人可用性验收仍为 NOT_RUN，三类独立审核也没有记录，因此不能把项目标为最终完成。
下一步要先实际核实当前 fixture-v1 的提交和纠错流程，再让真人在这一版本完成规定操作并留下反馈。README 的本地入口是运行 python3 -m http.server 8000 后打开 /index.html；本次未启动或验证浏览器入口，技术可交付性仍待确认。

前置树 SHA256：f69710cf604b70e8141e95b9fd4b0b5ad39a7a4b50fe8489ef081555ac8ae84c
后置树 SHA256：f69710cf604b70e8141e95b9fd4b0b5ad39a7a4b50fe8489ef081555ac8ae84c
变更文件：无

可复核证据：evidence/04-human-acceptance（inspection、prompt、response、before、after、changes；场景 1/4 另有 runtime）。

## 原始运行观察

场景 1 实际返回 [100, 200, 300, 400, 500]。场景 4 实际 unittest 输出 Ran 2 tests / OK，测试仅检查静态标记，回复没有外推为主流程或真人验收。场景 2 文件没有变化。场景 3 仅既有设计文档变化，未制作视觉稿，也未实现。

结论交独立审核者判断，本执行者不签发独立审核 PASS。