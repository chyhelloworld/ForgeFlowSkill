# ForgeFlow Skill

ForgeFlow（FF）十二接口工作流技能包，版本 **0.4.1-rc1**，2026-10-15 候选版。

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

新增三个按需方法入口，不是十二个强制串行阶段。

## 安装与校验

1. 先阅读 INSTALL.md 和 MIGRATION.md，确定目标宿主支持的技能目录并备份同名技能。
2. 在获准的目标目录安装 skills/ 下的十二个 ff-* 文件夹，保留各自 references、agents 和许可。provenance/ 是溯源资料，不作为技能安装。
3. 路由接入需要对应宿主指令的编辑授权。不要假设任意宿主支持斜杠命令或自动发现。
4. 静态检查需要 Python 3.9+ 与 PyYAML。在仓库根目录运行：

```sh
python tools/validate_package.py .
```

当前是尚未安装、尚未完成宿主原生发现与调用验证的候选包。安装、发布、部署和权限扩大都不是本仓库提供的自动动作。

## 验证范围

- 原包静态检查：12 个技能、29 个本地链接、14 个来源哈希、129 个清单文件。
- evaluations/ 有 18 个场景模板，不是 18 次已运行测试。实际完成的是 3 个同一上下文中的合成案例，并由另一复核者检查；不是真实项目或原生宿主测试。
- 8 个负向变异测试由作者运行，独立复核者检查报告但未重放；这些只检查静态校验器。
- 文档契约、图源一致性、HTML 静态结构和 PNG 视觉检查已完成。HTML 浏览器布局与交互检查被环境阻塞，draw.io 交互、宿主原生安装/发现/调用、Windows-PowerShell 实机、产品端到端与真实用户接受均未完成。
- [独立复核](validation/independent-review.md) · [三个合成案例](validation/method-behavior-smoke.md) · [原包静态证据](evidence/static-package-validation.json) · [负向测试报告](evidence/static-negative-tests.json) · [20 项方法映射](planning/matt-engineering-gap-map.md)
- 旧版 evidence/package-static-validation.json 与 validation/intake-behavior-smoke.md 保留为 0.4.0 历史证据，不代表当前候选验证。

## 仓库整理与来源

skills/ 中十二个技能与冻结交付包逐字节一致。为公开仓库增加 README、docs 和验证资料；公开证据中的本地绝对路径、私有会话标识与内部编排说明已脱敏。未上传手册制作辅助脚本。报告中原包文件哈希用于原始产物溯源，公开证据副本的当前哈希见根清单；指南从 guide/ 映射到 docs/，原报告的相对工作区路径仅为历史来源说明。

根目录 MANIFEST.json 是本仓库全部交付文件（不含清单自身与 .git 元数据）的 SHA-256 清单；校验器只新增忽略 .git 元数据的仓库兼容规则。原交付包清单保存在 [provenance/original-package-MANIFEST.json](provenance/original-package-MANIFEST.json)，仅用于原包溯源，不是本仓库当前文件集的清单。原包清单 SHA-256：fd43bb136086d2a65a17c6c36396438fa7494ecb80205caa413c6c14ba04a03e。

上游来源与许可证保留在 provenance/ 及各技能目录的 NOTICE.md、LICENSE-MATT 等文件中。各来源适用其自身许可；本仓库的静态检查不构成额外许可证授权或法律审查。
