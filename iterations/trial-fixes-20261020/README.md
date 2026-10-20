# 真实试点缺陷修复：本地候选验收记录

2026-10-20，Windows / Node 24.12.0。基线为重新核实的本地及远端 main `3d664f963d62bf05a0587265a6f6b92116370c7b`（0.9.3-dual-host.1）；原源码 clean。在 E 盘独立克隆的 `work/trial-fixes-20261020` 工作分支实现 `0.9.4-trial.1`。只修 FF；原 main、知宇书业务、全局和真实项目安装均未修改。未合并、推送、部署、付费或调用模型宿主。

范围与设计见 [修复计划](../../planning/TRIAL-FIXES-20261020.md)。此记录区分代码测试、环境观察与文档约定；不把 0.9.1 试点现象直接当作当前版本根因。

## 逐项处理

| ID | 当前结论、实现与证据 |
| --- | --- |
| FF-001 | **修复并实测**。GNU tar 将归档 `-f` 的盘符按远端主机解析；`-C` 的 Windows 绝对目录另有路径解析失败。两者均改为相对于工具 cwd 的路径。PowerShell、Git Bash 均完成真实锁定构建；GNU tar 中文路径正反例通过。 |
| FF-002 | **修复并实测**。launcher 由调用 cwd 选择项目，遇 `.git` 文件/目录边界禁止落到主工作区。真实 Git worktree 未安装时阻止，独立安装后经主目录 launcher 只写 worktree；主目录状态字节不变。`--reuse-build` 显式离线复用同 pin、平台、架构及依赖字节验证后的构建；仍逐项目复制运行时，没有实现共享缓存或宣称磁盘节省。 |
| FF-003 | **修复并测试**。输出精确运行时、launcher、逐技能 ignore 建议及应提交配置/证据；不自动改 `.gitignore`，不忽略整个 `.forgeflow`。 |
| FF-004 | **修复并测试**。安装项目的 new change、status、validate 帮助/错误与模板提示统一为 `node .forgeflow/ff-spec.mjs`。 |
| FF-005 | **修复并测试**。新增 `receipt snapshot/template/check/record/diagnose`；自动计算规则、输入、指纹、证据哈希。报告草稿为 not-reviewed，必须显式填审核结论和未验证范围，工具不自动生成 pass。 |
| FF-006 | **复现后修复并测试**。v2 取当前 change 适用规则及真实 requires 闭包，`{change}` 展开本 change 路径；A/B 增改归档互不影响，共享依赖改变失效，跨 change 同名 ID 回执拒绝串用。v1 原始全局 policyHash 语义保留；旧活动 change 通配规则需显式迁移，不能取消 policy 校验。原试点 C6pre 两边均 valid，未误判为“只能一个变更”。 |
| FF-007 | **复现后修复并测试**。移除产物/损坏旧回执仍提供当前指纹和诊断，不静默判有效；`--migrate` 才允许迁移，原回执按原字节写 history。 |
| FF-008 | **格式契约澄清并测试**。严格正文继续要求 SHALL/MUST；中文正文可使用这些关键词。仅“必须”或只在标题中出现关键词均不满足约定；没有关闭 strict，也没有新增中文别名。 |
| FF-009 | **修复诊断并实测**。保留原字节哈希，doctor 为登记文本给精确 LF 属性建议（含 `[id]` 字面路径转义）。真实 checkout、worktree、autocrlf 对照表明：受保护文件稳定，未保护文本换行会失效，真实修改仍失效。未改全局 Git 配置，未重写旧证据哈希。 |
| FF-010 | **环境观察复现，FF 影响证据不足**。Node 24.12 Windows 小型中文自有目录 `rmSync` 后 `remaining:true`。这不证明 FF 生产路径受影响，未据此新增生产绕过；现有私有清理逻辑保留。 |
| FF-011 | **复现后修复并测试**。doctor 分别报告 runtime、configuration、evidence、checked；只有运行时可用时为 RUNTIME_READY。无配置、零检查不算门禁通过；validate 的空 all/archived 非零退出。 |
| FF-012 | **文档完成；宿主行为 NOT_RUN**。技术取舍走 ff-grill，未知假设按需 ff-prove，技术设计由 ff-spec 产出；ff-design 保持 UI 范围，未新增技能。 |
| FF-013 | **复现后修复并测试**。v2 用需审核的稳定计划、任务 ID/验收与独立勾选进度；勾选不改变计划指纹，任务/验收变更需重审，未批准任务文字/ID 被拒绝。正常归档要求有效审核计划、映射进度全完成与适用证据有效，`--yes` 不绕过。勾选不代表测试通过。 |
| FF-014 | **复现后修复并测试**。审核 fail 与目标/输入过期分别诊断；保留失败回执及非有效状态。 |
| FF-015 | **修复并测试**。固定快照绑定实际 dirty 内容、规则、输入、schema 和指纹；报告记录该快照及未验证范围。审核期间内容变化、外部证据替换被检查；录入只能使用原绑定，不能套最新指纹。此为内容绑定，不是身份认证或签名系统。 |
| FF-016 | **文档完成；宿主行为 NOT_RUN**。复用 intake/handoff，在接手、核心替换或影响不明时可选盘点受影响功能，记录现状证据、现行要求及保留/修改/删除/未知；小改不强制全库盘点。未替用户重定业务需求。 |
| FF-017 | **文档完成；宿主行为 NOT_RUN**。按需求冲突、技术未知、计划漏项、审查冲突分别回澄清/prove/改计划/裁决。未按失败次数机械切换，未默认全量测试；失败测试仅为已暴露依赖下界。 |

## 验证与独立审查

以下证据位于本记录的 [evidence](evidence/)；完整原始运行输出保留在 `E:/CodexTasks/2026-10-20/task/` 对应目录。所有测试安装、缓存与构建在 E 盘自有目录。

| 检查 | 结果及限制 |
| --- | --- |
| 原 main 最小复现 | `baseline-red.log` 的 5 项期望失败，覆盖跨 change、未知旧 ID、勾选失效、fail 误诊及零项成功。 |
| 核心试点回归 | 15/15 组通过，包含上述 v1/v2、共享依赖、迁移、快照/证据变化、正常归档、计划/进度、autocrlf/worktree、零门禁及格式契约。 |
| 安装器现有回归 | 48 项：47 通过、1 跳过（当前权限不允许相对 symlink，未改变开发者模式/安全配置）；junction 检查实际运行。 |
| 工作流/续接回归 | 53 项：52 通过、1 跳过；不是模型行为测试。 |
| 锁定构建 | Git Bash、PowerShell 各完整构建通过；复用锁定下载缓存，没有真实模型调用。 |
| Windows 双宿主 | 18 次操作通过预期，包括旧单宿主到双宿主、doctor、重入、修改阻止、移除/回滚及 full/skills-only 往返。预期拒绝退出码保留。 |
| Windows 额外原生 | 6 组通过：离线双宿主、边界、零门禁、依赖篡改拒绝、GNU tar 中文路径与 rm 观察。另有真实 Git worktree 集成通过。 |
| 旧 optional CLI 套件 | 原脚本在候选版 54/64；同 Windows/Node、原 main 构建、字节相同脚本也恰好同 10 项失败。旧脚本把 Windows 反斜杠放入已有 POSIX 路径契约；仅两处输入改 `.as_posix()`，断言未变，复跑 **64/64，45 命令**。原失败没有删改。见 `original-main-comparison.json`。 |
| 分发静态/负例 | 静态验证通过；11 个 mutation 场景通过。最终包另做冻结与实际包内离线安装冒烟，原始结果在 task 下 `delivery-final/`；文件/命令就绪不等于宿主行为验收。 |
| 文档 | guide 检查通过；所有共享 spec-lifecycle 副本字节一致。012/016/017 只声明约定完成，宿主执行 NOT_RUN。 |
| 独立审查 | 独立 reviewer 检出并复核关闭：损坏回执迁移不可达、无进度归档绕过、证据漏绑定、进度所有者不需审核、LF glob 转义及旧/新覆盖混用。最终限定复核无新增阻断问题。保留独立探针与复核输出。 |

第一次本地 sandbox 的 EPERM、文档 QA 写入与安装完整性验证并发碰撞、一次终端中断的 native 运行均未计为成功。最终运行使用分离的不可变导出；旧原始日志仍保留。不要从中断或测试夹具错误推断生产通过。

## 质量实测与剩余范围

`quality-measurement.json` 来自最终固定模块 URL 和运行前后 SHA256 一致的窗口，共 **294** 个原始 V8 文件。McCabe 按 AST 决策计数，嵌套函数分别计算；实际 V8 最内层 block 计数投影到可执行语句行。公式 `CC² × (1 − coverage)³ + CC`。这不是分支覆盖或语义正确性证明；旧混合版本测量已废弃。

所选 FF 自有模块 **145 个函数，144 个有同版实测，最大 CRAP 33、中位数 3、130 个不超过 10，无已测项超过 50**。`build.mjs:removeGenerated` 缺同 URL 运行范围，保留 **NOT_MEASURED**，不把其他拷贝的测试算给它。

继承的 archive/validate 另列，仍有超 50 项：例如 archive.run 为 CC 172、语句行覆盖 26.88%、CRAP 11738.19。**全库 CRAP≤50 未达成**；本次不把既有大型上游逻辑扩成无限重构。详见质量数据的独立 inheritedUpstream 部分。

只实测 Windows / Node 24.12.0。Linux/macOS 原生执行、真实 Codex/Claude 宿主与模型行为、真实业务项目升级均 **NOT_RUN**，不是通过。v2 需用户明确采用并产生新的实际审核，旧 v1 回执和失败证据不能批量洗成有效。当前结果供本地候选评审，没有发布或安装切换。

复跑入口：`node --test tools/openspec/trial.test.mjs`、`node --test tools/installer/tests/*.test.mjs`、`python -m unittest discover -s tools/workflow -v`、`python validation/optional-methods/test_optional_cli.py <新证据目录>`、`python tools/validate_package.py .`、`python tools/test_validate_package.py .`。原生测试脚本要求显式全路径与全新自有输出目录；不对真实项目运行测试安装。
