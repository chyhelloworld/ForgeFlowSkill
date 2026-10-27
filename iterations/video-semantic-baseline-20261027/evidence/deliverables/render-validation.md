# 两张架构图：渲染与来源核对

- 唯一架构事实来源：`runs/base-video/architecture.md`，SHA-256 `b8f7f2d56ac4c89a3a9df6e5b47277bff8b54371fd1e1f0dbbd45a2d2e013dc6`。
- 这是旧版首次候选的后续可视化加工，不是模型原生一次直接画图，也不增加实现/测试通过声明。
- 视频两张参考图实际 view_image 查看，仅用于图形呈现参照，没有替换为视频类名。
- 未改架构文档、技能或产品源码；未选定语言、SDK，也未新增源码扩展名。

## 检查结果
- 两张 PNG 均实际 view_image 检查：中文正常、标签未截断、关键线无文字遮挡。
- 第一张保留三个逻辑职责区；Conversation 是历史，ModelInput 是本轮模型输入视图；回复/审查共同消费 ModelPort。
- ReviewDecision、允许执行、结果记录与再次生成单列工具链；不加预算、取消或故障治理。
- 第二张逐项核对原文 §6 概念路径；HttpEntry 仅标为文中替换位置，不虚构目录。
- 字体为本地 Noto Sans CJK SC；SVG 保留文本与矢量图形可编辑，PNG 由本地 Inkscape 导出。
- 未获用户主观验收；渲染检查不等于用户确认可读性。

## 文件
- `01-objects-and-roles.svg` / `01-objects-and-roles.png`：(1600, 1220)
- `02-conceptual-paths.svg` / `02-conceptual-paths.png`：(1600, 1190)
- `generate_views.py`：可重跑生成源；只需 Python 标准库与本地 Inkscape。
