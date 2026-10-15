# ForgeFlow Skill

ForgeFlow（FF）九接口工作流技能包，版本 **0.4.0-rc1**，2026-10-15 候选版。

将目标澄清、规格、任务计划、实现、独立审核和交付分开，支持新项目及已有项目接手。按缺口选择最短路径，不要求每次运行全部九个技能。

## 先看这里

- [中文使用手册](docs/FF-中文使用手册.md)
- [离线图文手册 HTML](docs/FF-离线图文手册.html)（下载后用浏览器打开）
- [安装说明](INSTALL.md) · [迁移说明](MIGRATION.md) · [入口路由](ROUTING.md) · [版本变更](CHANGE-MAP.md)
- [新项目流程图](docs/diagrams/new-project-workflow.png) · [已有项目流程图](docs/diagrams/existing-project-workflow.png)
- [可编辑 draw.io 与 SVG 图源](docs/diagrams/)

## 九个技能

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

## 安装与校验

1. 先阅读 INSTALL.md 和 MIGRATION.md，确定目标宿主支持的技能目录并备份同名技能。
2. 在获准的目标目录安装 skills/ 下的九个 ff-* 文件夹，保留各自 references、agents 和许可。provenance/ 是溯源资料，不作为技能安装。
3. 路由接入需要对应宿主指令的编辑授权。不要假设任意宿主支持斜杠命令或自动发现。
4. 静态检查需要 Python 3.9+ 与 PyYAML。在仓库根目录运行：

```sh
python tools/validate_package.py .
```

当前是尚未安装、尚未完成宿主原生发现与调用验证的候选包。安装、发布、部署和权限扩大都不是本仓库提供的自动动作。

## 验证范围

- 原包静态检查：9 个技能、26 个本地链接、11 个来源哈希、108 个清单文件；4 个负向夹具用于检查校验器能否发现错误。
- evaluations/ 中有 11 个场景模板，不能视为 11 次已执行测试。实际完成的是 2 个共享上下文模拟，其独立性有限。
- 已完成文档契约复核与 PNG 视觉检查。HTML 浏览器检查、draw.io 交互检查、宿主原生安装/发现/调用和 T3 真实端到端集成均未完成。
- [独立复核](validation/independent-review.md) · [接手场景模拟](validation/intake-behavior-smoke.md) · [原包静态证据](evidence/package-static-validation.json)

## 仓库整理与来源

skills/ 中九个技能与原交付包保持一致。为公开仓库增加 README、docs 和验证资料；证据中的本地绝对路径改成相对路径或占位符，溯源说明中的私有会话标识已移除。未上传手册制作辅助脚本。

根目录 MANIFEST.json 是本仓库全部交付文件（不含清单自身与 .git 元数据）的 SHA-256 清单；校验器只新增忽略 .git 元数据的仓库兼容规则。原交付包清单保存在 [provenance/original-package-MANIFEST.json](provenance/original-package-MANIFEST.json)，仅用于原包溯源，不是本仓库当前文件集的清单。原包清单 SHA-256：4f0bf383172a924b91482970300c366f43b5a00d4c9b77e46543ef2927f77598。

上游来源与许可证保留在 provenance/ 及各技能目录的 NOTICE.md、LICENSE-MATT 等文件中。各来源适用其自身许可；本仓库的静态检查不构成额外许可证授权或法律审查。
