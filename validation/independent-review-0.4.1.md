# ForgeFlow 0.4.1-rc1 独立复核

日期：2026-10-15 UTC。复核者独立于技能包、指南和模拟响应作者；只读检查作者产物，未修改技能包或指南。本文件是复核交付物。

## 当前结论

技能包静态内容与指南复核通过；发现项均已由作者修正并复核，当前检查范围内无未解决阻塞。此结论只覆盖下列检查，不代表原生安装、真实项目运行、全部场景执行或用户接受。

## 范围、来源和版本

- 基线：`../../ff-workflow-0.4.0-20261015/ff-workflow-skills-0.4.0-rc1/`。实际阅读九个 SKILL.md、Implement/Intake/Deliver 相关参考、路由，比较全部旧文件差异。
- 候选：`../ff-workflow-skills-0.4.1-rc1/`。独立阅读三个新技能全部方法正文及参考、元数据、许可说明、旧技能增量、路由、来源映射、场景模板和验证器。
- Matt 实际源：`../../matt-skills-manual-20261015/sources/skills/engineering/diagnosing-bugs/SKILL.md`、`engineering/tdd/{SKILL.md,tests.md,mocking.md}`、`productivity/handoff/SKILL.md`。五份源与候选 provenance 快照逐字节一致。
- 冻结 MANIFEST SHA256：`fd43bb136086d2a65a17c6c36396438fa7494ecb80205caa413c6c14ba04a03e`。

## 实际执行的检查

1. 独立运行包内 `tools/validate_package.py`，真实退出码 0：12 skills、29 local links、14 source hashes、129 manifest files、18 scenario templates；errors 为空。只证明静态结构与哈希。
2. 基线全部 12 份技能 references 文件仍字节一致；旧九技能的实质变动为补充方法衔接，独立 Review、CRAP ≤50/目标约10、NOT_MEASURED、真实用户接受、平台证据与权限边界未被删去。
3. Diagnose 明确真实用户症状与真实调用链，区别无关失败；最小实用复现、可证伪单变量、预算与间歇次数、可比性能基线、无复现 UNKNOWN、缺正确 seam 不冒充覆盖、探针清理与修后原场景回归均有实质步骤。未强制固定假设数或无限压力，不扩生产仪表权限。
4. TDD 以已确认范围和公开行为为单位，独立预期、真实 red/green、无测试发现/依赖失败不算 red，拒绝全部测试先行与内部 mock 假证明。Matt 原文将重构留到 review；候选保留 Review 只读建议与范围门控，再由已获准 Implement 实施，不强制每轮重构，也不让审核者改代码。
5. Handoff 为项目本地已授权短检查点，区别 Deliver，引用同一权威计划；包含 dirty/untracked、部分产物、任务最后可观察状态及权限。Mode 0 当前对话，无秘密/完整会话复制，无自动代理/任务；接收方 Intake 必须核实真实状态，跨环境可读性不能假定。
6. 独立查看新项目/已有项目两张 PNG 的实际像素及 draw.io/SVG 生成边与文字。新方法为分支，不是十二阶段串行链；Spec/Plan/独立审核/readiness/授权门槛保留。TDD 图示重构表述修正后再次实际查看。HTML 浏览器布局/交互未由本复核执行；作者报告 Chromium socket 权限阻塞，不能将 PNG 观察当作 HTML 桌面/手机浏览器通过。
7. 检查作者静态变异报告：有效基线与8个错误包检测均有明确结果。未由本复核重新执行这8次变异，不能称其为本复核独立重放，更不能用它证明模型行为。

## 发现及修复追踪

- 指南原有 red→green→refactor 和泛化“按需重构”易成为必经循环或扩大范围。已由作者修复：red→green→受影响回归；重构先 Review 只读建议/范围门控，较大变化回 Plan/必要时 Spec。正文、示例及两图已复核。
- 指南暂停/Handoff 原先默认保存，缺少就近 Mode 0 边界。作者最终明确 Mode 0 仅当前回复，模式1/2且对应记录授权才可落盘，通用工程写入授权不能覆盖 Mode 0；四处正文/示例与 HTML 已独立复核。
- 路由“无需全部所需技能”歧义、三份新 YAML 简介截断已修复；独立确认最终包对应内容。
- Diagnose 无关配置/导入/fixture 失败不算目标 red 的明确列举已补充，避免 standalone 使用时依赖隐含推论。

## 三个模拟响应的独立检查

检查 `method-behavior-smoke.md` 的完整输入与实际响应，报告 SHA256 `870cfd8f57a02f14b8a1bd788ef0068e01f6ec774da0b1075236fb81e8e1f8e2`；报告记录的全部9份加载文件哈希均与冻结包相同。

- A：无访问的间歇导出重复。响应明确 NOT_REPRODUCED/UNKNOWN，无伪根因/修复/执行；候选仅作假说，索取最小症状和脱敏材料，并要求真实调用链及间歇频率。边界检查通过。
- B：新增待办完成与刷新保持。响应拒绝先写全部函数测试，以两个可观察行为顺序 red/green；持久化不能由内存状态或 mock 保存代替；尚无项目则 NOT_RUN，先补真实前置。边界检查通过。
- C：Mode 0、脏工作区、未知运行中导入、另一电脑接手。响应仅对话检查点，不假称传输/保存/进程结束，不重启导入或自动开代理；Intake 先核对真实文件/状态/权限，未提交改动不等于远程仓库已同步。边界检查通过。

以上为一个响应作者在同一上下文生成的三个合成案例，本复核是另一代理对这些响应的独立检查。不是三次隔离盲测，不是18项场景全量运行，不是统计可靠性证明，也没有真实产品命令、测试、上传或宿主集成。没有以关键词命中替代上面的语义检查；没有把新增入口误称为首次拥有全部这些能力，0.4.0 已有相关原则与部分机制。

## 未证范围

native-host-integration / Windows-PowerShell 实机 / 产品端到端 / 真实用户接受：NOT_RUN。HTML 浏览器桌面与手机交互：BLOCKED（作者报告，非本复核复现）。不授权安装、合并、部署、付费或扩大访问。

## 最终交付哈希与指南静态复验

独立只读断言确认两份 SVG 精确嵌入 HTML、SVG 文字在 draw.io 中完整保存、HTML 内部锚点有效；这仍不是浏览器布局或交互测试。最终文件哈希：

- `guide/FF-中文使用手册.md`: `4bd98c2fde4c41d944f079df621cd8f8fa8277f0a857e89092f454be5858d4b1`
- `guide/FF-离线图文手册.html`: `0684b6bab633d58b80cac5d626fac16e06faa911b88554dfb525e6fb63337bec`
- `guide/guide-qa.json`: `4178254d2e3ff7bd49de4beb9d819767239e70355ddb7156003b670a637d6b12`
- `guide/diagrams/new-project-workflow.png`: `385e4c8c35937a1f473d6e70713c0cdcea5fbfb330421d3093bdb7950d5c59f0`
- `guide/diagrams/existing-project-workflow.png`: `ab1f57d0219852a0bd4f72dfb7d4fa3ed6c1381e8e798ed8b6be92fdba4f8879`
- `ff-workflow-skills-0.4.1-rc1/MANIFEST.json`: `fd43bb136086d2a65a17c6c36396438fa7494ecb80205caa413c6c14ba04a03e`
