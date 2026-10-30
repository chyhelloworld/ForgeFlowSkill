# 具体且精炼的汇报：2026-10-30 候选

## 结果与边界

本轮把用户要求落实为明确的表达契约：实质任务每次交还控制权，都说清做了/未做什么、涉及哪里、具体做法、实际结果与限制；有后续才给具体下一步。**不是已经证明旧版行为失效的性能修复，也没有证明候选稳定优于旧版。** 不新增命令、门禁、审批或固定长模板，不改版本号。

只修改 FF 指引、分发检查和评估记录；案例中的摘要截断、CodeGraph 修复及“77项通过”都是合成事实，**本轮没有修改这些业务实现**。源码与仓库内嵌安装包同步；未同步用户电脑、未原生加载候选、未发布 npm、未合并或部署。

## 实际落点与改法

- `docs/maintainers/INTENT-LOOP.md`：新增“具体汇报”，区分短正文、实施计划、真实测试/实验、审查发现及暂停说明；规格不强迫承诺实现文件，证据不足不能补造。
- 同步到 `skills/ff-{grill,intake,spec,plan,design,prove,implement,review,deliver,handoff}/references/intent-loop.md` 共10份。
- 19个独立入口 `skills/ff-{architecture-derive,architecture-review,deliver,design,diagnose,grill,handoff,implement,intake,plan,prove,research,retro,review,spec,tdd,writing-beats,writing-fragments,writing-shape}/SKILL.md`：同一段短规则直接可见，不依赖条件读取共享引用。源码安装器只分发这些入口，没有自动加载的全局 AGENTS；只改 ROUTING 不够。
- `ff-plan/SKILL.md` 与 `references/{slicing,full-workflow}.md`：计划明确实际文件/模块、每处改法与验证，未知路径先定位。`ff-implement/SKILL.md` 的内联计划与独立收尾也适用，不强制调用 Deliver。
- `ff-deliver`、`ff-tdd`、`ff-review`、`ff-prove` 的 `SKILL.md`：替换泛称结果，要求真实场景/预期与观察、审查对象/发现/复查及限制。`ff-spec/SKILL.md` 区分行为规格与实施路径；`ff-handoff/references/checkpoint.md` 明确已做/未做、默认关闭、遗留问题与接手动作。
- `tools/workflow/test_intent_contract.py`：检查共享副本及19入口短规则一致。`tools/installer/tests/dual-host.test.mjs`：实际临时安装后核对 Codex/Claude 共38份入口。`tools/installer/tests/payload.test.mjs`：内嵌包 manifest 必须等于当前源码 manifest，并核对压缩包 SHA256。
- `evaluations/README.md` 链接本轮记录；按现有 `tools/installer/pack-release.py` 更新 `MANIFEST.json`、`forgeflow-payload.tgz` 和 `.sha256`，不另建打包流程。

## 实际模型对照

材料和读者问题在首次输出前冻结：[cases.json](evidence/cases.json)、[reader-questions.json](evidence/reader-questions.json)、[freeze.json](evidence/freeze.json)。基线为 `ab2ca09305e0a0f5f33a25511a08823d85afef72`。两版各用一个新生成上下文，顺序均为 C6→C1–C5；C6 先只读 `ff-research/SKILL.md`，不读 INTENT-LOOP。其余5案在同一上下文连续生成，不冒称逐案隔离。生成者看不到问题表、旧回答或作者预期。

独立读者先保存读者能复述出的 what/where/how、结果限制与下一步，再对照冻结材料；不是关键词计分。读者先见基线，因此候选评审非盲评。

| 实际采样 | 语义结果 | 保留的发现 |
| --- | --- | --- |
| 基线6案首次输出 | 6案 PASS | 具体文件、场景与限制已能表达；错字案五维尾段略冗余，不制造失败。 |
| 候选首轮6案 | C1–C5 PASS；C6 FAIL | C5更相称，但C6把“未获准发布/删除”换成“未执行”，漏掉权限边界。不是实际越权事件，四类停顿共有问题只计一次。 |
| 最小修订后仅重采C6 | 定向C6 PASS | 共同短句补“及权限边界”，新生成上下文恢复四段授权限制；不覆盖首轮FAIL，不算新的全组六案通过。 |

原始输出：[基线C1–C5](evidence/baseline-responses.md)、[基线C6](evidence/baseline-C6.md)、[候选C1–C5](evidence/candidate-responses.md)、[候选C6首轮](evidence/candidate-C6.md)、[C6定向后续](evidence/candidate-C6-followup.md)。独立核对：[基线](evidence/baseline-reader-check.md)、[候选首轮](evidence/candidate-reader-check.md)、[定向后续](evidence/candidate-C6-followup-reader.md)；各自先读复述也保存在同目录。

绑定：[候选首轮规则/输出SHA256](evidence/candidate-freeze.json)、[最终规则/测试/定向输出SHA256](evidence/final-freeze.json)。最终句子变更后没有重跑C1–C5。共3个生成上下文，13案次（两组6案及一次C6），不是跨模型或统计稳定性研究。

**未覆盖及剩余问题：** C6题面允许“同一任务”但要求状态互不继承，B路径/C数值是否可共享存在歧义；两版用同一口径，不改冻结材料洗通过，也不声称单例隔离已证。候选C1/C5未给五维评价，材料又未提供既有评价；本轮只按用户可读性与事实核对评价，不能宣称所有原有规则已合规。没有真人阅读效果、用户接受、真实宿主发现/加载/调用或跨模型验证。原有五维要求没有删除，保留此执行缺口，不扩大模板或重抽刷通过。

## 可重放检查

[verification.log](evidence/verification.log)保留实际命令、输出和退出码；环境 Linux / Python 3.12.14 / Node v24.22.1。仅将工作区绝对根替换为 `<repo>`，不改测试内容。所有下列命令退出码为0：

- `python tools/workflow/test_intent_contract.py`：4项；10份共享副本、19个入口及原有关系/反馈分发检查。
- `python tools/workflow/test_intent_view.py`：16项既有回归；包括 done不代表接受、失效/缺失引用、真实CLI只读路径等。不是合成的77项。
- `python tools/validate_package.py .`：19技能、135本地引用及来源/manifest静态校验。
- `python tools/test_validate_package.py .`：1个正常包+10个结构破坏案例均按预期；不评价模型行为。
- `node --test --test-concurrency=1 --test-reporter=spec tools/installer/tests/{install,dual-host,architecture-review,payload,npx-cleanup}.test.mjs`：37项；包含双宿主入口保留、用户改动冲突保护、回滚/恢复、内嵌包解码和本地引导清理。临时 `FF_TEST_ROOT` 中真实写文件，不接触用户项目；skills-only运行时门禁仍为BLOCKED，这是预期，不代表完整CLI或宿主原生可用。
- `git diff --check`：无输出。

[replay-static.py](evidence/replay-static.py)与[原始结果](evidence/static-replay.log)：新结构测试事后回放旧版，因缺少共同短规则而失败；当前候选通过。明确是**结构负向回放**，不是旧版模型行为失败或开发前先红后绿。完整构建、Windows原生、真实宿主加载未运行。

测试与证据文件不含版本升级。记录入包后按原脚本重打包，静态/payload一致性以最终工作树复核为准。

隐私检查另列而不混入通过项：`python validation/scan_privacy.py .` 退出1，62个模式命中（含源码/包内及JSON重复计数），均来自基线既存源码中的路径、文件ID或UUID；本轮新增证据0命中，密钥型模式0命中，不是绝对无秘密保证。部分历史文件原来未进旧payload，现有全manifest打包脚本此次会收录；未新增到仓库源码，也未向外发布包。未修改历史证据，详情仅列类型和旧文件位置：[privacy-summary.json](evidence/privacy-summary.json)。
