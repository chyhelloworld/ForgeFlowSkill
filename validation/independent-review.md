# ForgeFlow 0.4.0-rc1 独立复核

日期：2026-10-15 UTC。审查者独立于包作者与手册作者；未修改其文件，只编写本报告。

## 结论

当前候选的职责划分、输入/输出与退出条件、规格/任务有效性分支、实施前独立计划审核、条件性 PR、轻量小修、权限边界、变更/恢复证据有效性，以及真实 CRAP 口径的文本契约复核通过。初审发现的 4 项已修复并复核。当前没有未关闭的阻断性发现。

这是静态契约与文档/图片审查结论，不是宿主安装、自动路由、真实工程执行、完整模型回归或用户接受通过。

## 基线与范围

真实读取 0.3.2 的全部五个 SKILL，以及 Plan slicing、Deliver evidence/continuity/review-handoff/CRAP、Design visual-direction/design-craft。读取当前九个 SKILL、ROUTING、MIGRATION、INSTALL、Intake 状态契约、Review 规则、Deliver handoff；比较保留技能的基线差异及迁移的证据指引。阅读完整中文手册，实际查看两幅初版与修正版 PNG，并检查 SVG/draw.io 文本和连接结构。

保留原则核对：
- Grill 继续保留用户原话、单一锚点、推荐前自审、按风险澄清、Mode 0/1/2 与记录权限。
- Design/Prove 的真实可见方向、真人选择、动态连续性、真实输入与独立 critique 原则保留；仅改为新的实现/审核责任入口。
- Plan 仍负责纵向切片与依赖，Review 独立给 plan 结论；不是把计划审核延迟到实现后。
- Intake 只读对账，Spec 写行为与验收，Plan 写切片，Implement 实现和采证，Review 只读审核，Deliver 消费结论并交接。工程状态仍复用唯一载体。
- 已有规格/票据 valid、stale、missing、unknown 分开；未知先核实。已实现部分可复用，已有有效计划审核不强制重跑。
- 小修允许内联规格/单条任务与短审核，不强制九技能全程；只有影响方向的未知才进入 Design/Prove。
- 仅规格或原型授权不能实施；ready 不等于授权。PR 取决于真实仓库流程与创建/更新授权，非开工前置，也不授权自动合并或部署。
- 变化/恢复核对真实版本、未跟踪内容和旧命令状态；只使受影响证据与接受失效，不猜进程状态、不重复未知副作用、不丢弃他人修改。
- CRAP 保留 CC²×(1−c)³+CC，同版本逐方法真实复杂度和覆盖率、覆盖口径、>50 阻断、约10优化目标；缺数据 NOT_MEASURED，不拿全仓平均或估计冒充测量。

## 发现与修复复核

1. R1：Design 仍引用旧 Deliver 的实现/三类审核责任。已改为 Implement/Review；直接重读并与基线 diff 确认。
2. R2：旧项目图最初强制经过 Implement，与已完工作复用原则不符。已增加实现有效→补审核、证据及审核有效→直接交接分支；实际查看修正版 PNG。
3. R3：图中 PR 条件最初只写仓库授权，未明确无 PR 流程的路径。两图现明确采用 PR 流程且获准才提交，及 PR 可选/文件交接；手册正文同步。
4. R4：初版 draw.io 连接线没有 source/target，节点移动不会关联连接线。现全部边绑定现有节点，保留 entry/exit 与 waypoints。结构检查通过；未在实际 draw.io 编辑器中拖动操作，不能称原生编辑交互验证。

## 直接执行的静态验证

- 候选命令：python tools/validate_package.py <候选包根目录>。退出 0：9 skills、26 local_links、11 source_hashes、108 manifest_files、11 scenarios，无错误。
- 基线同命令：退出 0：5 skills、28 local_links、11 source_hashes、68 manifest_files，无错误；基线清单保持一致。
- 本审核首次无根路径参数的调用返回 list index out of range；这是审核命令用法错误，按 INSTALL 的显式路径重跑后通过，不把错误运行当成功。
- 中文手册两条 PNG 链接均存在。两图 SVG 文本多重集与 draw.io 全部节点/标题/分支标签/页脚文本一致；new 图 13 条边、existing 图 15 条边均关联存在的节点。HTML 内嵌 SVG 与独立 SVG 内容完全一致。
- 直接查看最终两幅 PNG：中文字可读，无明显截断或遮挡，分支条件、计划审核先于实施、条件性 PR 与不自动发布均可见。HTML 浏览器布局/筛选交互未由本审核执行；作者报告浏览器启动受阻，不能由嵌入一致性推出浏览器通过。

## 两条模拟响应的独立复核

读取 intake-behavior-smoke.md 的完整输入、实际 next response 和 action plan 后判断：
- A（新确认首页目标，旧规格/票过期）：响应先修受影响 Spec，再 Plan、独立 plan 审核、获准实现；保护无关结果，未把旧列表实现当新目标已满足。未访问仓库或伪造执行。针对本例通过。
- B（声称规格/任务/审核有效，搜索空结果小修）：先只读核对用户陈述与版本，核实且授权覆盖后直接 Implement，复用有效计划审核；保留正常搜索回归和后续独立审核。未要求重跑九阶段，未声称真实测试已跑。针对本例通过。
- 两例共享同一执行上下文和指令集；不是两个独立重复实验，也不是包内11案全部重放。仅支持这两次模拟回答的判断，不证明真实宿主可靠性、原生加载、真实目标工程状态或产品接受。
- 记录的 8 个加载文件 SHA-256 已逐一重新计算并与当前候选对照，全部一致。

## 版本绑定

候选 MANIFEST.json SHA-256：4f0bf383172a924b91482970300c366f43b5a00d4c9b77e46543ef2927f77598

- validation/intake-behavior-smoke.md：c2d948919db316d419b4c242bd20cbca4830119a99d94882da2ed3ab68c51401
- guide/diagrams/existing-project-workflow.drawio：1b0b232e9edf9c358d4c59be7243507cd55a7f0e09c415d76259b5f5171a7ba9
- guide/diagrams/existing-project-workflow.png：1c974b38ef19add856af913142a31ebd05e9843cbc59514a95baa4bafbc916b3
- guide/diagrams/existing-project-workflow.svg：80928edd9da0ba7d7fd5ff519e6a4f76f04d41f012ba62ca98863046228f2429
- guide/diagrams/new-project-workflow.drawio：578f1bb98b8e8382977774390f174ac96799a650b52949f08c8b5a42e92f240a
- guide/diagrams/new-project-workflow.png：c42319396e69022b2dbfcb099a33472dbd44ad8d61587cf7163dfe13602d128a
- guide/diagrams/new-project-workflow.svg：8d520275407c50235c981a4442888bfb792ec5ffca14a55a44d3cf80b98205a4
- guide/FF-中文使用手册.md：802a7e22f1185db43ebce58b46ffa158f3188f6b2f7b50ce9e7266e4cef5a66f
- guide/FF-离线图文手册.html：250af0d727fbaa2de38876a99fda3863673c47ef2aa8e94768dbebfcf3aa0cd6
