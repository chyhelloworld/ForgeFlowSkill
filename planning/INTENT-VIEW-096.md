# 需求关联简明视图：一个真实可用切片

目的：让用户判断 FF 当前需求有哪些模块/任务支撑、验收证据在哪、哪些仍有缺口。用户已要求总需求→子需求→模块职责/边界/协作/验收，授权设计后推进；2026-10-23 02:23 UTC 的“继续”明确转向真实开发验收。下面的拆解与 CLI 选择是执行者设计，不冒充用户逐项确认。

基线/工作方式：固定 FF 0.9.6-handoff.1 / 8b9858aa8795d83ea33881b3d8c2e1ef40cce6b8 显式读技能；开发在 work/intent-view-096。检查 checkout/.agents/skills 不存在，复用固定 skills 下的 Implement/Review 和按需 Plan/intent-loop；全局 AGENTS 已读。既有工作区与安装只读保护；无生命周期操作、验收门禁修改、真实安装或发布。

复用发现：planning/INTENT-LOOP-096.md 已规划需求交付进度，examples/intent-loop-minimal.md 已有 intent-links-v1；现有 health/resume 处理证据健康/恢复，test_intent_contract 仅静态检查示例。缺少面向用户的关系/缺口读取入口。选择 tools/workflow 下的标准库 Python CLI，复用此索引与现行任务/结果文档，不造数据库或网页服务；不会自动理解任意 Markdown 或从代码推导用户确认。

## R-view 看到关联与差距
父需求为现有 R096-2。原确认来源见本文件开头与既有 INTENT-LOOP-096 目的段。技术完成、需求验收、用户接受分开。

## R-links 关系可定位
显示需求→模块→任务→验收多对多关联及其原文定位，孤立/错误 ID、缺失文件/锚点可见。索引仅存引用，不复制正文或状态。

## R-truth 状态不夸大
从明确进度引用的 `- [x] T-ID` 读任务完成；从结果引用中的明确 `A-ID=PASS/FAIL/...` 显示“原记录”，冲突/不识别为 unknown。不根据任务完成推算需求通过，不认证证据新鲜度或用户确认。显示声明版本、读取时间与文件 hash；当前性和接受保持 unknown。

## R-local 本地可用
显式 --root/--index，可选 --requirement、--json；只读 root 内普通文件，不递归扫描、不跟链接/越界、不写输入。缺失/损坏/未知结构能给出明确提示。用本 FF 规划和真实开发记录演示，不只演示合成订单。

## M-read
职责：受限读取索引/引用、定位支持的锚点。边界：不解析任意 Markdown、不执行文件或网络。输入 root/ref，输出文本片段、来源 hash 或缺口，交 M-map。验收 A-links/A-local；未知：并发文件替换不提供原子快照。

## M-map
职责：按既有 intent-links-v1 组装关联，读取窄格式的原记录并保留 unknown。边界：不推导需求验收、用户确认或 freshness，不写第二状态库。依赖 M-read，输出结构化报告给 M-view；原文文件拥有状态。验收 A-links/A-truth。

## M-view
职责：把同一报告显示为简短文本或 JSON，给用户原文定位和缺口。边界：不提供编辑/更新/审批/安装入口。与 M-map 共用数据，不另做状态计算。验收 A-demo/A-truth。

## Task plan
- T-view: 贯通读取→关系/缺口→文本/JSON→真实 FF 演示；覆盖 R-links/R-truth/R-local、三个模块及全部 A-ID。切片末一次独立综合审查，缺陷只局部修复。

## progress
- [x] T-view

本切片实现/关键测试/一次综合审查及局部修复已完成；不代表 A-local 已全验证、需求验收或用户接受。当前结果见 iterations/intent-view/results.md。

## A-links
既有 Markdown JSON 示例可读；多对多、断链、缺锚点、重复ID/坏格式、过滤行为有关键测试。

## A-truth
任务 done 与原验收 FAIL 同时显示；记录 PASS 也不推出当前有效/需求验收/用户接受；冲突、缺证据或无法读取保持 gap/unknown。

## A-local
显式根路径内只读；越界/链接拒绝，输入前后 hash 不变；JSON/文本来自同一报告，CLI 错误明确。

## A-demo
读取 planning/intent-view-links.json，展示已有 R096-1～6 的实际计划定位与本切片映射；未建设索引/进度/验收的旧范围显式缺口。当前真实测试日志/演示通过引用连接，用户接受仍待本人反馈。

停止条件：上述关键逻辑测试与真实资料 CLI 演示完成，独立综合审查及必要局部修复完成，文档给使用步骤、覆盖/未知并本地提交。仅交付源码切片；不更新已冻结发行包或真实安装、不自动扩展平台。CRAP 缺真实计量时 NOT_MEASURED，不为指标安装工具。
