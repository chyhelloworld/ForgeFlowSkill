# 0.8 独立三类审查与反例复验

审查时间：2026-10-17。审查者：独立 review08 子代理。只修改本目录 `independent-*` 审查文件与探针；没有修改生产代码、现有测试或仓库规则，没有提交、安装软件或读取 Codex 私有会话。生产修复由主代理完成。

本报告结论限定于恢复检查器代码、输入协议和已运行反例。**不能据此将整个 0.8 验收标为 PASS。** 真实中断后的全新 receiver08 接手、最终冻结安装版本及同版 CRAP 证据仍待独立核对；没有 CI 或真人接受结论。

## 基线与证据身份

- Git 基线 HEAD：`99693288764e2cf56ad6892d3a180f1b82e5d543`。Git 根为 `source`；核查范围内未发现 AGENTS.md。
- 原始 WIP 来自 SHA256 `aaca287cf2c76ea268839d921b107bba774a0661a6f55ce85928aa31235a106f` 的 ZIP，保持原件位于 `_handoff/20261017/wip-original/ForgeFlowSkill`。此 ZIP 身份由委派上下文提供，本代理未用它代替内容或行为验收。
- 原始 `resume.py` SHA256：`aeb13c29d04eea9206f25318dc67fb3d91a6f7247f04333e8474b0402423fbd4`。
- 本报告复验 `resume.py` SHA256：`76644c50f79c4d7a4f6f26a4789724a755070ce24c245afbae723c74b87fe8eb`。若代码继续变化，本报告不能自动覆盖新版本。
- 平台：Windows，Python 3.11.5，默认 locale `cp936`，UTF-8 mode 关闭。探针仅用项目内生成的非敏感夹具和假的动作描述。

## 1. 核心需求与主要流程

**PASS：上述修复版本的检查器、协议和本报告列明的本机反例范围。NOT_RUN：真实跨会话业务中断接手的独立核验。**

原始 WIP 的 29 项完整原生探针有 22 PASS、7 FAIL。修复后的最终 44 项探针全部 PASS；现有恢复测试由原始 10 项 PASS 增为修复后 14 项 PASS。实际运行证据：

- [修复前完整原生失败证据](independent-before-fix-native.json)
- [修复后最终 44 项原生探针](independent-after-fix-final-native.json)
- [原始恢复单测日志](independent-resume-unit-before.log) 与 [修复后恢复单测日志](independent-resume-unit-after.log)
- [保留的可重跑探针](independent-probe.py)

| 原始缺陷 | 实际反例与影响 | 修复后复验 |
| --- | --- | --- |
| P1：Windows 根相对路径逃逸 | `\github\...\outside\spec.txt` 的 `is_absolute()` 为 false；dependency 和 receipt 两路实际读取 projectRoot 外夹具，仍 CURRENT / SKIP_COMPLETED | 根/绝对/驱动器路径拒绝，解析后包含关系检查；两路拒绝 |
| P1：Windows junction 逃逸 | 原生 `mklink /J` 成功，Python 3.11 `is_symlink()` 为 false；链接目标在 projectRoot 外，仍 CURRENT / SKIP_COMPLETED | 真实 junction 被拒绝；额外以当前有效依赖绑定隔离复验，仍拒绝 |
| P1：旧回执未绑定执行依赖 | 同一 R2 下源文件 A 改成 B，只重新采集 checkpoint.dependencies；旧测试完全未重跑，旧 receipt 仍使动作 SKIP_COMPLETED | 回执绑定执行时 dependencyFingerprint；原样旧回执和缺绑定旧格式均 INSPECT |
| P2：NTFS ADS 可作为隐藏证据 | `visible.txt:hidden` 是隐藏流，宿主普通文件内容不同，原工具仍 CURRENT | `:` / ADS 被拒绝；当前有效依赖绑定情况下仍拒绝 |
| P2：UTF-8 中文正常输入失败 | cp936 环境下 UTF-8 中文 checkpoint 返回 INVALID / exit 2；中文动作回执返回 INSPECT | checkpoint/receipt 显式 UTF-8；两条正常输入恢复 CURRENT |
| P2：使用说明缺必需协议 | 原说明未列必需 projectRoot，也没有结构化回执内部字段，普通命令日志不能满足实现 | 文档补完整 checkpoint/receipt 字段、精确指纹算法与列表顺序、旧格式保守拒绝规则；已只读核对 |

44 项还实际覆盖：目标变化、依赖或输出过期、回执 actionId/goalRevision 不符、布尔 exitCode、重复 ID、空或畸形 actions/dependencies、布尔版本、缺 projectRoot、空依赖/输出/回执文件、receipt 为数组或无输出、NUL、drive-relative 和 UNC 路径、顶层 array/null/string 的 CLI 格式错误。保留了子进程 stdout/stderr 与原始字节 hex。

对于 running/unknown，检查器只对该动作 INSPECT；同一输入里另一个证据有效的 done 仍 SKIP_COMPLETED，pending 仍 VERIFY_CURRENT_AUTHORITY。带历史 approved/authorization 字段的 pending 不获得执行许可。所有适用夹具的已知文件哈希在调用前后不变，包括被引用的项目外兄弟夹具和 ADS。程序没有执行或重启动作。本探针没有真实上传、付款、终止进程或检查账号权限，也不能用这些只读结果证明 exactly-once。

四个 SKILL 本版文字 diff 已审阅：讨论和明确加入分离，最新指令优先，影响分析连接规格/唯一计划/测试/依赖，历史与现行范围分离，没有新增技能或第二计划。静态文字方向与现有权限约定相符。该静态结论不证明真实模型在所有会话中都遵守，也不代替真人接受。

## 2. MECE 计划

**PASS：本轮变更范围与责任映射的静态审查。NOT_RUN：整版全部完成条件。**

现有权威范围为 `planning/ROADMAP-061-09.md` 的 0.8 条目；没有另造计划库。本版边界可对应为：ff-spec 维护已确认变化与现行规格，ff-plan 更新受影响任务/验收/依赖，ff-intake 恢复时核实最新目标与权限，ff-handoff 保存轻索引与只读检查结果，恢复单测及独立探针验证代码。各职责没有把工具建议变成授权，也没有要求已证动作重复执行。

同一全局 dependencies 列表的变更会保守使绑定旧列表的回执失效；文档明确观察后缩小受影响范围。此行为没有声称自动求解任意动作依赖图。新增运行不明动作不会抹掉有效独立完成项。尚欠的整体切片是 receiver08 的真实中断续做独立核对、最终冻结安装和有效同版质量度量；本报告不把它们计作已完成。

## 3. 代码规范与证据质量

**PASS：已审阅检查器代码与上述恢复回归。NOT_MEASURED：本代理尚未核对最终冻结源码的新 CRAP 度量。**

生产修复保持标准库、只读职责；路径合法性、文件摘要、结构化回执、动作建议和全局检查职责有明确分工。拒绝根相对/驱动器/ADS/NUL、解析后项目外路径和 reparse；回执验证动作、目标、执行依赖指纹、整数成功退出码及非空实际输出。全局错误使全部 INSPECT，局部错误保留独立已证进度；CLI 对非 object 输入返回解释性 INVALID。没有发现已运行范围内的新阻断缺陷。

原始度量证据无效，不能继承：原始 resume 有 7 个顶层函数，交付 metrics 只列 6 个且缺 completion_gaps；度量快照 hash 为 `4d35cda9...`，与原始 WIP 的 `aeb13c29...` 不符。详见 [原始指标审计](independent-metric-audit-before.json)。这表明旧度量不覆盖该源码，不表示 completion_gaps 在后来运行的测试里完全未被调用。最终源码必须重新采集同次 coverage、CC、全部函数清单与源码快照；本报告不制造 CRAP PASS。

## 保留缺口与适用限制

- **NOT_RUN：** receiver08 真实中断实验结果的独立只读核对；父代理说明该全新接手实验正在运行。不能把本报告的假动作描述当成真实中断或真实副作用实验。
- **NOT_RUN：** 最终冻结版本完整 Windows/Codex 安装后的 checker 文件身份及实际运行核验。父代理早期安装不自动覆盖本次修复版本。
- **NOT_MEASURED：** 本代理未运行或审阅最终同版 CRAP 采集；旧度量已确认过期。
- **旧 0.7 缺口，不在本版修复范围：** `test_health.test_escape_and_symlink` 的真实 symlink 创建受 WinError 1314 影响；该失败由主代理运行报告，本代理未把它改成通过。本代理另用保留夹具独立调用未改动的 health.evidence_problem，根相对路径、junction 和 ADS 三项均被旧 helper 接受，详见 [旧 health 边界证据](independent-health-legacy-boundary.json)。resume 修复不覆盖该旧工具；不能宣称整个包的 Windows 路径边界均已修复。
- 没有运行 CI、其他操作系统、真实外部副作用、敌对并发文件替换或完整人类验收。协议明确哈希/回执不能证明身份、权限来源、记录未伪造或检查后的原子性。
- 原生夹具中保留真实 junction。原执行时全部夹具位于 `iterations/0.8/independent-fixtures-*`；后按下方迁移附录完整移到项目根 `_handoff/20261017/independent08-fixtures`。原始 JSON 保持当时执行路径；定位保留数据需使用迁移映射，不能把搬迁后的检查点当成现行检查点。归档时不要跟随 reparse 递归展开。

## 复验命令

在 `E:\github\ForgeFlowSKill\source` 运行；每次使用新 label，探针拒绝覆盖已有原始证据：

```powershell
$env:PYTHONIOENCODING='utf-8'
python -B iterations/0.8/independent-probe.py --label retest-unique --receipt-format bound
python -B -m unittest discover -s tools/workflow -p test_resume.py -v
```

真实 junction 创建在普通沙箱曾被拒绝访问，完整复验使用获准的沙箱外执行，未改变系统权限；不能创建时应保留 BLOCKED。需要重现原始缺陷时，用独立探针 `--resume` 指向不可变原始 WIP 的 resume.py，省略 `--receipt-format bound`，并使用新的 label。原始失败不能因修复后通过而删除。

## 附录：夹具迁移与打包边界

5 个完整夹具根目录已使用同 E 盘原生 PowerShell `Move-Item` 逐个移动到 `E:\github\ForgeFlowSKill\_handoff\20261017\independent08-fixtures`。移动前逐项核对绝对源/目标路径位于工作区内、根目录不是 reparse、目标不存在且不跨卷；移动的是完整根目录，没有递归跟随 junction，也没有删除证据。

[迁移映射与完整性](independent-fixture-relocation.json) 逐项保留旧执行路径、新保留路径、前后不跟随 reparse 的清单。596 个普通文件的字节摘要、ADS 名称/长度/字节摘要以及 4 个 reparse 点的属性、tag、原始目标文本均相符；所有原有独立 JSON 和日志文件字节摘要保持不变。另保留 [移动前计划](independent-fixture-move-plan.json)、[原生移动记录](independent-fixture-move-journal.json) 与 [无跟随完整性脚本](independent-fixture-integrity.py)。

junction 的原始绝对目标文本和 checkpoint.projectRoot 被原样保留，因而移动后仍写着旧执行位置；被引用的目标文件随完整根目录一起保存在映射后的目录。这是证据保留语义，不是可直接继承的新检查点，未事后改写原始回执或重绑定旧证据。

探针新增 `--fixture-root`，默认在上述 source 外的项目内 `_handoff` 目录生成新夹具，拒绝 source 内或工作区外位置。调整后的真实原生重跑 [independent-relocated-output.json](independent-relocated-output.json) 仍为同一 44 项 PASS，checker 源码摘要仍为 `76644c50...`；source 下不再有本代理的夹具根目录或 junction。
