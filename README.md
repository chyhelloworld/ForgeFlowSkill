# ForgeFlow Skill

ForgeFlow（FF）十二接口工作流技能包，版本 **0.5.0-rc1**，2026-10-15 候选版。

将目标澄清、规格、任务计划、实现、独立审核和交付分开，支持新项目及已有项目接手。按缺口选择最短路径，不要求每次运行全部十二个技能。

## 先看这里

- [中文使用手册](docs/FF-中文使用手册.md)
- [离线图文手册 HTML](docs/FF-离线图文手册.html)（下载后用浏览器打开）
- [安装说明](INSTALL.md) · [迁移说明](MIGRATION.md) · [入口路由](ROUTING.md) · [版本变更](CHANGE-MAP.md)
- [新项目流程图](docs/diagrams/new-project-workflow.png) · [已有项目流程图](docs/diagrams/existing-project-workflow.png)
- [可编辑 draw.io 与 SVG 图源](docs/diagrams/)

## 十二个技能

| 技能 | 职责 |
| --- | --- |
| [ff-intake](skills/ff-intake/SKILL.md) | 只读接手、恢复与状态核对 |
| [ff-grill](skills/ff-grill/SKILL.md) | 澄清目标、范围与关键取舍 |
| [ff-spec](skills/ff-spec/SKILL.md) | 行为、主流程、边界与验收规格 |
| [ff-design](skills/ff-design/SKILL.md) | 设计方向与视觉探索 |
| [ff-prove](skills/ff-prove/SKILL.md) | 以原型验证关键未知 |
| [ff-plan](skills/ff-plan/SKILL.md) | 纵向切片、实施票据与依赖 |
| [ff-implement](skills/ff-implement/SKILL.md) | 按有效规格和计划实现、测试及采证 |
| [ff-review](skills/ff-review/SKILL.md) | 独立计划、主流程和代码审核 |
| [ff-deliver](skills/ff-deliver/SKILL.md) | 验收证据、交付与交接 |

| [ff-diagnose](skills/ff-diagnose/SKILL.md) | 疑难、间歇与性能问题的复现、假说与回归 |
| [ff-tdd](skills/ff-tdd/SKILL.md) | 按公开行为逐个 red/green 与受影响回归 |
| [ff-handoff](skills/ff-handoff/SKILL.md) | 已授权项目本地短检查点与接手状态 |

十二个按需接口，新增机器可校验的规格生命周期，不是十二个强制串行阶段。

## 安装与校验

1. 先阅读 INSTALL.md 和 MIGRATION.md，确定目标宿主支持的技能目录并备份同名技能。
2. 在获准的目标目录安装 skills/ 下的十二个 ff-* 文件夹，保留各自 references、agents 和许可。provenance/ 是溯源资料，不作为技能安装。
3. 路由接入需要对应宿主指令的编辑授权。不要假设任意宿主支持斜杠命令或自动发现。
4. 静态检查需要 Python 3.9+ 与 PyYAML。在仓库根目录运行：

```sh
python tools/validate_package.py .
```

当前是尚未安装、尚未完成宿主原生发现与调用验证的候选包。安装、发布、部署和权限扩大都不是本仓库提供的自动动作。

## 0.5.0 的主要变化

- [规格生命周期契约](SPEC-LIFECYCLE.md)：current baseline、独立 change、版本绑定的验收回执及证据、显式 promote、archive 保留历史而不合并基线。
- [JSON Schema](templates/spec-state.schema.json) 与 [生命周期 CLI](tools/spec_lifecycle.py)：版本类型、过期证据、过期接受记录及基线冲突防护；失败写入保证原文件不变。
- [生命周期流程图](docs/diagrams/spec-lifecycle.png) 与两个完整场景流程图；十二个技能、中文指南和迁移说明同步更新。

[中文测试过程与结果](测试过程与结果.md)

## 验证范围与证据

- 冻结技能包：12 个技能、36 个本地链接、14 个来源哈希、143 个清单文件；20 个场景模板不是 20 次已运行行为测试。
- 作者 22 项单元测试和独立复核者 22 项守卫测试分别通过；两套有覆盖重叠，不计为 44 个独立覆盖场景。
- [真实云端博客 CLI 试验](examples/lifecycle-blog-trial/REPORT.md)：最终日志 17 次命令执行全部符合预期（11 次成功、6 次预期拒绝，其中 11 次调用生命周期工具）。产品单元测试从基线 1 项到搜索阶段 2 项；新上下文接手者实际完成持久化 CLI 主流程。
- 首轮试验暴露旧验收回执可复用的问题，现已改为绑定 change 版本及基线版本。原失败日志与边界探针保留为历史；以 final-run/ 为最终通过证据。
- 新工具 17 个函数的自定义 stdlib AST 圈复杂度与 trace 行覆盖 CRAP 最高 12，阈值 50。不是 radon、基路径覆盖或全仓质量结论。
- [独立复核](validation/independent-review.md) · [最终新上下文接手记录](examples/lifecycle-blog-trial/final-run/blog-project/HANDOFF_RECEIVER_REPORT.md)
- 验收记录为模拟测试输入，没有真实人类验收。工具不验证证据内容真实性或批准者身份。未完成 Windows 原生、宿主安装/发现/调用、浏览器布局 QA；没有部署或生产就绪结论。
- 旧 evidence/、历史 method/intake 报告和 independent-review-0.4.1.md 为旧版证据，不代表当前版本验证。

## 仓库整理与来源

skills/ 与冻结 0.5.0 包保持逐字节一致。保留旧版来源、许可与无关资料。指南映射至 docs/；真实试验在 examples/lifecycle-blog-trial/。复现实验与复核脚本的工具路径已适配仓库布局。公开证据只脱敏本地工作区、临时目录和私有执行标识，保留失败、模拟批准与测试局限。原始报告内的工件哈希描述脱敏前执行工件；当前公开文件哈希以根清单为准。未收录 .git、Python 缓存；测试数据均为合成。

根 MANIFEST.json 覆盖所有仓库交付文件（清单自身与 .git 除外）。校验器仅额外忽略 .git。冻结包原清单保存在 provenance/original-package-MANIFEST.json，旧版清单为 provenance/original-package-MANIFEST-0.4.1.json；它们仅用于来源追踪。来源与许可证见 provenance/ 及技能内 NOTICE/LICENSE；静态检查不构成法律审查。
