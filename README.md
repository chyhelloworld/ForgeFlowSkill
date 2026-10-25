# ForgeFlow Skill

本地候选 `0.9.6-derivation.1` 在 `0.9.6-architecture.1 / 00c099f6` 上增加[可选架构推导](docs/user/architecture-derivation.md)：AI按当前需求推荐，用户选择后由 ff-spec 从业务流程推导职责和依赖。继承需求闭环、小任务路径、审查交接、intent-view及独立架构评估；[本轮范围](planning/ARCHITECTURE-DERIVATION-096.md)不包含真实安装升级。

面向 AI 编程的轻量工作流技能集：澄清需求、拆分任务、按需设计与实现、独立审核和中断接手，帮助人核对 AI 是否仍沿着当前目标工作。

当前为 **0.9.6-derivation.1 源码候选、18 项技能**，工作分支 `work/architecture-derivation-096`。推导参考只在用户选择后加载，架构评估独立可选；原v1/v2回执与既有前置审核不变。显式读技能的执行试用不等于原生自动加载。

## 从这里开始

| 想做什么 | 直接入口 |
| --- | --- |
| 安装、选择 full / skills-only、首次使用与恢复 | [安装与首次使用](docs/user/install.md) |
| 看具体能力、使用场景、18 项技能与真实命令 | [能力与使用场景](docs/user/capabilities.md) |
| 在 Codex 原生目标中使用 FF | [Codex Goal 使用与边界](docs/user/codex-goal.md) |
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
