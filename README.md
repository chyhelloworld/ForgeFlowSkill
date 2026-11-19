# ForgeFlow Skill

`0.10.0` 在现有目标模式中增加[只读进度与停滞复盘](docs/user/goal-progress.md)，并将选定的pstack工程方法融入原职责。不新增隔夜模式、后台调度或自动合并。实施范围及实测边界见[0.10记录](iterations/0.10.0/README.md)。

此前 `0.9.6-derivation.4` 基线在 `0.9.6-derivation.3 / 4f64f0e8` 上给[架构评估](docs/user/architecture-review.md)增加按当前决策检查颗粒度的简短判据，指出过粗/过细的具体位置及最小调整。完整保留上一候选的[推导修复](docs/user/architecture-derivation.md)、19项技能和既有能力；不自动更新真实安装。范围见[计划T2](planning/ARCHITECTURE-DERIVE-QUALITY-096.md)。

`0.9.7-dsh.1` 把同一套门禁接到 DeepSeek Harness：新增 `dsh` 宿主（`.dsh/skills`），安装时写入宿主协作块（子代理独立审查、`tasks.md` 权威、`present` 交付、plan mode 先 `exit_plan_mode`），`doctor` 报告技能发现根与技能版本↔CLI 版本握手；`status` 无参给出项目门禁总览，没有 `openspec/ff-policy.json` 时 archive 打印告警而不是静默放行（`FF_ALLOW_UNGATED=1` 可静默）。

`0.9.12-dsh.1` 在 0.9.7 的 DSH 宿主之上补齐 DSH 原生接入面：新增 `dsh-plugin/` 原生插件，把 `ff_status`、`ff_gate` 暴露为 DSH 工具，`/ff-status` 为斜杠命令，向 `systemPrompt` 注册四层失效常驻锚点，并在 `tools/pre-execute` 对 `pwsh`/`bash` 命令位置上的 `ff-spec.mjs archive` 做门禁守卫（blocked/invalid 拒绝，只读 `--help`/`--ff-disposition canceled|rejected` 放行，可 `FF_ALLOW_UNGATED=1` 显式跳过）；插件随安装产物复制到 `.forgeflow/dsh-plugin`，用 `register.mjs` 显式注册到某个 DSH profile（备份、幂等、可 `--remove` 撤销，并建立 profile 内 `node_modules/@local/forgeflow-dsh` 链接），需重启 DSH 生效；同一插件还提供只读看板：`generate-board.mjs` 把需求/模块映射与 OpenSpec 勾选状态写成 `.forgeflow/board.json` 快照，左侧栏 `ForgeFlow 看板` 展示需求、架构参考、模块与任务进度。同一版本把四层 AI 失效自检写入 `INTENT-LOOP` 常驻契约与 `ff-review` 审核规则，并新增 E39–E44 评测场景（E43/E44 为 L2 过度防御的泛化场景：无失败样本即引入缓存/队列/读写分离，以及为一次性脚本搭框架）。

`0.9.13-dsh.1` 增加**可配置的外部独立审查**：full 安装会写入 `.forgeflow/ff-reviewer.mjs`，项目在 `openspec/ff-review.json` 中选择 `backend`（codex 或 claude）、`model`、`reasoning`（思考强度）、`enabled` 与超时；`ff-reviewer check` 先核对配置/CLI/认证提示，`run --brief <材料> --out <记录基名>` 只读调用后端并写出 `<out>.json`（含 L2 声明、brief/config 哈希、命令、退出码、verdict/findings、usage 与未验证项）和原始回答。没有配置或 disabled 时仍走原独立子代理流程；后端失败保留记录并非零退出，不自动降级为自审。详见[可配置的外部独立审查](docs/user/review-backends.md)。

面向 AI 编程的轻量工作流技能集：澄清需求、拆分任务、按需设计与实现、独立审核和中断接手，帮助人核对 AI 是否仍沿着当前目标工作。

`0.9.14-dsh.1` 为资源生命周期与轻量接入候选：测试目录显式受控、成功清理可预览、失败现场保留；已激活 FF 技能携带四层审查短规则，DSH 双候选仅适用于重大取舍。安装文本和模拟事件测试不等于真实模型会话加载通过。详见[本轮范围与证据](iterations/resource-lifecycle-20261111/README.md)。

当前为 **0.10.0 源码候选、21 项技能**，工作分支 `work/resource-lifecycle-20261111`。新增独立 **0.1.0** [ff-writing-document 工作文档](docs/user/writing-document.md)，先澄清、先确认目录再写正文；以及独立 **0.1.0** [ff-diagram 软件图示](docs/user/diagrams.md)，参考国内软件工程/系统架构设计常用要求，按图种加载。推导参考只在用户选择后加载，架构评估独立可选；原v1/v2回执与既有前置审核不变。显式读技能的执行试用不等于原生自动加载。

ff-design 新增可选[落地页专项参考](docs/user/landing-page-design.md)：目标与受众、疑虑与真实证据、先确认纲要再逐节实现；不改变后台/App业务界面和各项目品牌，不增加技能或运行时。

## 从这里开始

| 想做什么 | 直接入口 |
| --- | --- |
| 安装、选择 full / skills-only、首次使用与恢复 | [安装与首次使用](docs/user/install.md) |
| 看具体能力、使用场景、21 项技能与真实命令 | [能力与使用场景](docs/user/capabilities.md) |
| 在 Codex 原生目标中使用 FF | [Codex Goal 使用与边界](docs/user/codex-goal.md) |
| 配置 Codex/Claude 做独立审查，选模型与思考强度 | [可配置的外部独立审查](docs/user/review-backends.md) |
| 从零启动新项目 | [新项目流程](docs/FF-中文使用手册.md#新项目如何从想法走到交付) |
| 接手旧项目、半成品或中断任务 | [旧项目流程](docs/FF-中文使用手册.md#旧项目或半成品项目怎么接手) |
| 开发、测试、打包和维护 FF | [开发维护](docs/maintainers/development.md) |
| 查版本变化、历史报告和原始证据 | [版本与历史证据](docs/archive/README.md) |

完整[中文手册](docs/FF-中文使用手册.md)、[离线图文手册](docs/FF-离线图文手册.html)和[可编辑图源](docs/diagrams/)保留原路径，便于已有工具和历史实验定位。任务末轻量评价复用已有事实；深入复盘由用户要求或重要问题触发，不是自动递归 RSI 引擎。

双宿主历史范围及证据见[双宿主安装迭代](iterations/0.9.3-dual-host.1/README.md)，操作见[安装与首次使用](docs/user/install.md)。Goal 的历史有界验证保留在[0.9.2 收尾](iterations/0.9.2-goal.2/README.md)。[后续路线图](planning/ROADMAP-061-09.md)把经验管理等方向留作独立切片。

## 当前边界

full 构建依赖网络，历史新包验证曾受 npm TLS 阻塞；skills-only 不提供 FF CLI 门禁。历史 PATH CLI 调用受 setup refresh 阻塞，同期桌面后端的只读技能调用成功；不能混称同一路径或代替本候选 Goal 验证。Claude 原生 ff-intake 限定流程已成功，Codex 原读取受策略阻塞；[原生回执](iterations/0.9.3-dual-host.1/native-host-validation.md)保留失败与包绑定。两端完整模型工作流、全平台和产品人类验收未证明。测试、截图和审核按对应提交/源码/包哈希解释，不能把旧包成功改签本包通过。

根目录保留本页、[安装入口](INSTALL.md)、[宿主路由约定](ROUTING.md)、[来源变更映射](CHANGE-MAP.md)和[兼容迁移约定](MIGRATION.md)。旧接入报告依赖迁移约定，保留两者原路径和原始内容。技能发现文件与原始证据保持既有位置；原路径追溯见[历史目录](docs/archive/README.md)。

本轮本地候选与兼容边界见 [试点修复计划](planning/TRIAL-FIXES-20261020.md)及[验证记录](iterations/trial-fixes-20261020/README.md)。旧实验结论不外推为本候选通过；不自动迁移回执或升级安装。

## 源码工具：需求关联简明视图

[只读需求视图](docs/intent-view.md) 复用 intent-links-v1，展示需求、模块、任务与验收原记录/缺口。入口：`python -X utf8 -B tools/workflow/intent_view.py --root . --index planning/intent-view-links.json --requirement R096-2`。这是源码工具，不注册为安装后的宿主命令；不把任务完成或记录 PASS 当作需求/用户验收。

本候选保留 0.9.6-architecture.1 的[独立架构评估技能](docs/user/architecture-review.md)，Design/Spec 仅推荐，用户选择后才分析。新增的[业务到架构推导](docs/user/architecture-derivation.md)与它独立，均不自动触发另一个。旧旁支试验和原生加载结论不自动继承。
