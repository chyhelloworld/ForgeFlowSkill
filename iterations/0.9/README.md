# 0.9.0 候选：设计、完整旅程与实际观察

基于已上传的 0.8 提交 47eedff1a7c1885ea002a99b97fb1cd0ed157ccd 继续；不重做 0.7、不把旧 experimental.7 当当前状态。0.9 维持 17 项技能，不增加业务应用、3D 图谱平台或第二套状态系统。用户最近的四个创意方案不在本次批准实现范围内。

## 设计与实现边界

[实现前冻结设计](DESIGN.md)及[时间/摘要记录](design-before-implementation.json)先于 journey.py 创建，明确现有离线手册的八步主要用户旅程、视觉方向、状态连续性、反例和价值假说。独立 MECE 审查发生在实现之后，不倒签成实现前审核。新增可选只读检查器位于 ff-design，复用 ff-handoff 的项目内路径与依赖证据核对；协议见 [journey.md](../../skills/ff-design/references/journey.md)。ff-review 明确区分预期、实际结果和人类接受。

检查器核对所声明的设计/实现哈希、步骤 ID/顺序/状态、实际轨迹和 UI PNG 元数据，UI 截图列表还与轨迹绑定。CLI 旅程不要求伪造截图。OBSERVED 仅表示选定记录结构和当前绑定齐全，不是业务正确、视觉质量、完整覆盖、用户批准或接受的证明；它不执行步骤。来源列表遗漏、主动伪造轨迹/旧像素、PNG 完整解码、检查后的并发替换不在保证范围内。

## 实际操作与失败修复

所选主要流程是现有离线手册的打开→筛选旅程→跳转阅读→空筛选→恢复→窄屏打开→筛选→跳转。此处验证文档使用旅程，不把它扩称任意业务系统验收。预期流程图 [PNG](journey.png) / [SVG](journey.svg) / [drawio](journey.drawio) 与实际结果分开。

- 首轮实际 Chrome 操作在 ui-evidence；独立反例发现截图索引未绑定、文本可冒充截图、非标准/重复 JSON 字段被接受。原始失败、修复前源快照与旧函数指标仍保留，不补签为新协议证据。
- 修复为 UI 轨迹截图列表精确绑定、PNG 头/正尺寸核对及严格 JSON。19 项单元测试通过；截图仅验元数据，不宣称解码或真实性。原始探针与三类审查见 independent-review-initial.md，最终复验见 independent-review-final.md。
- 全部工作流回归实际执行 43 项，42 通过、1 项旧 health 测试在创建符号链接时因 WinError 1314 出错，原始 workflow-regression.log 保留。未改权限、删除测试或把此项算通过；新的 19 项均通过。
- 第二轮 ui-evidence-final 实际八步通过后，发现手册前言残留 rc3/十二技能的旧说明；修正为当前 0.9/17 技能（12 工作流 + 研究/复盘/写作），重新生成 HTML，并在 [ui-evidence-frozen](ui-evidence-frozen/journey.json) 第三轮重新执行全部八步。前两轮记录原样保留，不能代表最终 HTML。
- 最终是本机 Windows Chrome 的真实页面操作和 PNG 截图，桌面 1440×1000、窄视口 390×844；验证筛选、目录恢复、锚点/正文保留、目标标题可见、无横向溢出及 pageerror。窄视口是仿真，不是真实手机、触控或辅助技术验收。人工偏好和产品价值尚未验证。

## 同版指标、安装与冻结

[函数实测](function-metrics.json)绑定 [采集前源摘要](source-snapshot.json) 与 [native coverage](coverage.json)。coverage.py 7.6.1 / Radon 6.0.1 实测 12 个新增生产函数，最大 CRAP=11，全部≤50；trace_gaps、sequence_gaps 仍略高于约 10 的优化目标。覆盖口径为函数可执行行与分支合计，不代表所有路径。测试、采集、独立探针、文档/指标脚本的 CRAP 为 NOT_MEASURED；沿用 0.8 resume 的源与指标，未重写其回执。

版本、17 项 SKILL、手册与安装 manifest/payload 一起冻结。最终源码冻结后的完整 Windows 构建/安装、33 项安装回归、静态包校验、11 项校验器变异、实际 CLI 与安装后的 journey 执行回执保存在项目旁 _handoff/20261017/windows09-final，最终命令结果及 manifest/payload 哈希以工作分支提交说明和本机交接回执为准。冻结后报告不回写 payload，避免自哈希循环；未运行不算通过。

0.8 的 Codex 实际上下文发现 17 技能，但 setup refresh / helper_unknown_error 阻止完整宿主执行；未更换身份/模型、修改安全设置或读取私有 sessions 来绕过。Claude、真实移动设备、辅助技术、真人接受、全平台矩阵仍未验。旧 health 的 Windows rooted/junction/ADS 边界和 symlink WinError 1314 环境限制继续见 0.8 记录，不宣称全部已修复。没有 CI 成功证据，不把本地结果说成 CI 通过。没有 main 合并、发布或部署。

参考方法仅采用已授权的一般思路；未复制或改写 Product Manager Skills 的 CC BY-NC-SA 正文，未导入其库。交付完成不等于价值已证实。
