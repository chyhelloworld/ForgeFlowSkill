# ForgeFlow Skill

ForgeFlow（FF）技能包，版本 **0.6.0-experimental.3**，十二技能基线加五个可选方法，2026-10-15 隔离实验版。

先读 [可选方法中文说明](docs/FF-可选方法中文使用说明.md) 与 [本轮变更](CHANGE-MAP-0.6.0-experimental.md)。本轮未发布；以下0.5 CLI与历史验证说明保留为基线。

将目标澄清、规格、任务计划、实现、独立审核和交付分开，支持新项目及已有项目接手。按缺口选择最短路径，不要求每次运行全部十二个技能。

## 先看这里

- [中文使用手册](docs/FF-中文使用手册.md)
- [离线图文手册 HTML](docs/FF-离线图文手册.html)（下载后用浏览器打开）
- [安装说明](INSTALL.md) · [迁移说明](MIGRATION.md) · [入口路由](ROUTING.md) · [版本变更](CHANGE-MAP.md)
- [新项目流程图](docs/diagrams/new-project-workflow.png) · [已有项目流程图](docs/diagrams/existing-project-workflow.png)
- [可编辑 draw.io 与 SVG 图源](docs/diagrams/)

## 十二个基线技能

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

## OpenSpec 原生接入与官方 CLI 并存

本候选版在固定 OpenSpec 1.14.2 源码上维护 FF 补丁，包名 `@forgeflow/ff-spec`、可执行名 `ff-spec`，用户配置与数据使用独立 `ff-spec` 命名空间。启用项目使用 openspec/specs 作为唯一现行规格；changes 保存本轮差异、任务及回执，Git 保留完整历史。稳定 artifact ID、显式路径、排序内容哈希、依赖指纹与版本绑定的独立审核，参与 status / instructions apply / validate / archive 的统一判定。

- [规格与门禁契约](SPEC-LIFECYCLE.md)：apply 是实施指导；archive 正常路径同步规格再归档，不能套用旧 Python 命令语义。
- [构建、固定来源与实现说明](tools/openspec/README.md)：项目本地构建，不依赖全局 CLI 替换。
- [显式迁移](MIGRATION.md)：复核旧 current/active/取消/历史，不自动导入接受或补签 pass。
- 原生取消/拒绝关闭：显式 --ff-disposition 与原因/决议引用，保留失败和未完成历史，不同步 specs、不制造通过；正常 archive 门禁不变。
- [旧 Python 只读审计](tools/spec_lifecycle.py)：validate 保留；apply/archive 及库级写入口已退役。旧 JSON 不再作为第二套权威源。

FF 项目统一从目标项目根运行 `node tools/openspec/ff-spec.mjs <子命令>`，不使用全局安装。此示例假定工具在目标项目的 `tools/openspec/` 下；若 FF checkout 放在其他位置，使用 launcher 的真实相对路径或绝对路径，工作目录仍保持目标项目。初始化只允许显式 `node tools/openspec/ff-spec.mjs init --tools none`，不会刷新已有官方工具集成；FF `update` 拒绝执行。十二个技能单独按 INSTALL.md 管理。

官方 CLI 与 FF 入口可以并存，但官方 CLI 有文件系统权限时仍可修改兼容的 `openspec/` 树且不执行 FF gate。入口和命名空间隔离防止无意冲突，不是安全边界。

FF gate 检查绑定与一致性，不认证评审者、证据真实性或人工接受。三类独立审核、主流程测试、CRAP ≤50/目标约10、TDD/Diagnose/Handoff 与授权边界保持不变。十二个技能按需选择，不增加强制流水线。

## 安装与校验

先读 INSTALL.md，按指定宿主和目录的授权安装十二个技能，保留 references、agents 和许可证。项目本地 CLI 需要 Node.js，完整构建步骤见 tools/openspec/README.md。未启用 FF policy 的项目保留上游规格读写语义，仍受 rc3 入口的初始化/工具更新隔离约束；损坏 policy 不得降级成未启用。

包静态检查：`python tools/validate_package.py .`（Python 3.9+、PyYAML）。该命令核对结构/清单，不证明产品行为或宿主安装。

## 验证范围

[测试过程与结果](测试过程与结果.md) 区分本次适配与旧版历史。旧版 22 项生命周期测试、旧真实博客试验和旧 CRAP 结果只证明当时的 Python 实现，不代表当前 OpenSpec fork。rc2 接入结果是历史基线，不能自动证明 rc3 并存通过。当前 OpenSpec 构建、回归、独立复核与实际 CLI 流程必须看对应版本证据；未运行不能写 PASS。Windows 原生和用户宿主安装/发现/调用尚未验证，不作生产就绪或发布结论。

## 来源与可恢复性

原 0.5.0-rc1 工具、测试及契约保存在 provenance/legacy-0.5.0-rc1；原 Matt 与 Impeccable 来源、许可证和哈希保持不变。OpenSpec 固定源码、补丁、MIT 许可及来源记录在 tools/openspec。工作分支保留全部原有 Git 历史，不 squash 或覆盖历史接受记录。

MANIFEST.json 覆盖交付源文件，排除 .git、可重建的 OpenSpec .build/.bootstrap 及运行缓存。原冻结清单在 provenance 中仅供溯源。公开测试使用合成数据；测试回执不是用户真实批准。当前只在获准工作分支维护候选，未推送、合并主分支或部署。

## OpenSpec 接入验证与 rc3 计划

[实现与验证报告](docs/OpenSpec-FF接入报告.md) · [rc3 并存计划与验收](planning/openspec-ff-0.5.0-rc3.md) · [可复现 CLI 源码构建](tools/openspec/README.md) · [rc2 独立审查（历史）](validation/openspec-integration/independent-review.md)

## 五个新增可选方法

- [ff-research](skills/ff-research/SKILL.md)
- [ff-retro](skills/ff-retro/SKILL.md)
- [ff-writing-fragments](skills/ff-writing-fragments/SKILL.md)
- [ff-writing-shape](skills/ff-writing-shape/SKILL.md)
- [ff-writing-beats](skills/ff-writing-beats/SKILL.md)

这些入口不构成必经步骤。shape和beats二选一；retro允许零候选。可单独安装选中方法，完整候选共17项。

## 实验2：可选决策索引

保留17个技能。Grill、Research、Handoff、Intake 可按需引用单一决策权威记录，恢复原始目标和未决依赖；简单任务跳过。索引不授予执行、不增加状态数据库；[中文说明](docs/FF-决策索引中文说明.md)。CLI 不变。

## 实验3：可关闭的 CodeGraph 适配器

仅显式启用时辅助静态代码定位，不新增技能或必经门禁。详见 [使用说明](docs/FF-CodeGraph可选适配器.md) 与 [真实试验报告](docs/CodeGraph试验报告.md)。沿用实验2决策索引；旧报告仅代表对应历史版本。
