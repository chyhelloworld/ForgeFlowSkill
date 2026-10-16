# ForgeFlow 0.6.0-experimental.7：Windows 中文路径修复候选

项目内安装，无需 npm 账号、不发布 npm registry 包。唯一安装器命令为 `ff-install`；安装后从目标项目根运行 `node .forgeflow/ff-spec.mjs`，不替换全局 OpenSpec。实验7仍是待复验候选，不能把前序 Windows 试验结果当作本版本已通过。

## 一条命令（本版本合入 main 后可用）

```sh
npx --yes --ignore-scripts --cache ./.forgeflow/npm-cache --package=github:chyhelloworld/ForgeFlowSkill#main ff-install install --project . --host codex --mode full --build
```

以上示例从目标项目根执行。`#main` 是浮动源，远端 main 目前可能仍是旧版；只有本版本合入并核验后，这条命令才可获取实验7。可重现安装须使用发布回执中实际验证的完整 Git commit SHA，本文不预填尚未发布的 SHA。发布前使用已核对的候选包，参见 [项目内安装指南](docs/项目内安装指南.md)。

Claude 使用 `--host claude`。仅技能使用 `--mode skills-only` 并去掉 `--build`，此时 CLI 门禁为 BLOCKED，不得称为完整可用。宿主和模式必须显式选择；CodeGraph 默认关闭，不修改宿主权限、MCP、登录或全局配置。

## 工具源、目标项目与缓存

- Node.js >=20.19.0、npm；GitHub 获取入口需要网络及 npm Git transport 所需的 Git。full 另需 Git、tar 和下载锁定构建依赖的网络。
- `--project` 可指定另一处已存在的项目目录；工具源可单独放在工具目录，不必复制进每个项目。相对 `--project` 和 `--cache` 都相对当前终端目录解析，跨项目安装时建议使用带引号的绝对路径。
- 外层 npx/npm 缓存可用 `--cache` 显式指定，外层 TEMP/TMP 可由用户在调用前指定。full 内层的 local-home、构建缓存及 staging 仍在目标项目 `.forgeflow/install/` 下，不支持完全缓存分离。详见 [npx 安装指南](docs/npx安装指南.md)。
- 默认示例将外层 npm cache 也放在目标项目；这不保证 npm、Git、系统或用户既有配置绝不写外部文件。严格隔离应在沙箱中核验。
- `--ignore-scripts` 禁止 npm 自动 prepare/install/postinstall 等生命周期脚本；只有显式 `--build` 才构建运行时。安装内容位于 `.forgeflow/` 和宿主技能目录 `.agents/skills/` 或 `.claude/skills/`，缓存和本地安装状态不要提交到项目版本库。

## Windows 修复与验证边界

- 原实验5在 Windows 暴露两个问题：pnpm junction 指向 staging 的绝对路径，stage 晋升 release 后失效；Node 24 的 `fs.cpSync` 在本次中文目录场景遗漏内容。
- 修复候选在 Windows 使用 pnpm hoisted 布局，目录复制通过 `cpSync` 的 filter 逐项复制；原有链接、路径与完整性检查不放松。实验7仅清理安装器新建 stage 中的构建 bootstrap，不删除独立源码构建已有的 bootstrap。
- 前序本机 `windows-test.2` 已通过 full 安装和 doctor；真实 Codex app-server 的 `skills/list` 在主目标项目发现17项 FF 技能。见 [Windows 前序试验摘要](validation/windows/windows-test-2-summary.json)。这是该试验版的安装、CLI 与宿主发现证据，不是模型业务调用。Claude 未登录，未验证真实调用。
- 实验7还调整了 bootstrap 清理归属，最终候选需要重新完成 Windows 安装、promotion 后 doctor、路径与宿主发现复验；目前不得称为已验收或生产就绪。历史 Linux npm 入口证据也只对应其原版本。

## 检查、重入与回滚

从安装后的目标项目根运行：

```sh
node .forgeflow/install/doctor.mjs
node .forgeflow/ff-spec.mjs --help
```

完整所有权检查、回滚和恢复使用与安装一致、已核验来源的 `ff-install doctor|rollback|recover --project PATH`，或源包的 `node /path/to/ForgeFlowSkill/installer.mjs ...`。重跑相同来源、宿主与模式应返回 UNCHANGED；用户修改或未管理同名文件会阻塞。rollback 必须有前一安装状态，首装不能用它卸载。中断恢复前确认没有安装进程，不能随意删锁。

Codex 必须打开正确的目标项目，再核对技能发现与最小加载；不承诺聊天斜杠命令自动注册。doctor READY 只表示本地 CLI 可运行，不代表业务门禁、模型业务调用或用户验收通过。

## 完整指南与本轮变更

[npx 安装指南](docs/npx安装指南.md) · [项目内安装指南](docs/项目内安装指南.md) · [安装说明](INSTALL.md) · [实验7变更](CHANGE-MAP-0.6.0-experimental.7.md)


### 实验6失败与本轮复验

Node 24.12.0 原生 Windows 在中文路径下递归删除可能静默保留目录；实验6本机 full 安装失败，禁止发布。实验7对安装器拥有的新建 staging bootstrap 和独立构建固定 .build 使用不跟随 junction 的逐项删除，删除后检查实际消失；保留 staging 身份、祖先路径及运行时 inventory 校验，独立源码既有 .bootstrap 保持不动。

实验7的回归、逐函数 CRAP、精确 tgz 安装/doctor/CLI、重入、搬迁、临时目录清理与 Codex 17项发现结果保存于包外发布回执。历史 validation/windows 中实验6及更早的报告保留原版本身份，不作为实验7通过证据。冻结包后报告不写回包内；固定 Git SHA 验证完成后另在 GitHub 安装回执提供可复制命令。

以下为实验3及更早的历史基线，版本号、命令路径和验收状态均属于当时记录；新项目内安装请以上述入口及指南为准。

# 历史基线：ForgeFlow Skill

ForgeFlow（FF）技能包，版本 **0.6.0-experimental.3**，十二技能基线加五个可选方法，2026-10-15 隔离实验版。

先读 [可选方法中文说明](docs/FF-可选方法中文使用说明.md) 与 [本轮变更](CHANGE-MAP-0.6.0-experimental.md)。该历史轮次未发布；以下0.5 CLI与历史验证说明保留为基线。

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

[测试过程与结果](测试过程与结果.md) 区分本次适配与旧版历史。旧版 22 项生命周期测试、旧真实博客试验和旧 CRAP 结果只证明当时的 Python 实现，不代表当前 OpenSpec fork。rc2 接入结果是历史基线，不能自动证明 rc3 并存通过。当前 OpenSpec 构建、回归、独立复核与实际 CLI 流程必须看对应版本证据；未运行不能写 PASS。该历史基线未验证 Windows 原生和用户宿主安装/发现/调用，不作生产就绪或发布结论；后续 Windows 试验与实验6待验边界见本文顶部。

## 来源与可恢复性

原 0.5.0-rc1 工具、测试及契约保存在 provenance/legacy-0.5.0-rc1；原 Matt 与 Impeccable 来源、许可证和哈希保持不变。OpenSpec 固定源码、补丁、MIT 许可及来源记录在 tools/openspec。工作分支保留全部原有 Git 历史，不 squash 或覆盖历史接受记录。

MANIFEST.json 覆盖交付源文件，排除 .git、可重建的 OpenSpec .build/.bootstrap 及运行缓存。原冻结清单在 provenance 中仅供溯源。公开测试使用合成数据；测试回执不是用户真实批准。该历史基线记录为只在获准工作分支维护候选，未推送、合并主分支或部署；当前发布状态以实际发布回执为准。

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
