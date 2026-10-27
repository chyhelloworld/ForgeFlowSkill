# 视频同题架构推导：云端基线记录

本次仅保存已经完成的测试与设计证据。被测技能为 `0.9.6-derivation.4`，固定源码提交 `50cfd100b72aa1920f9184ca448df7bf8366419f`（`work/prove-ablation-096`），不是本次证据提交的新技能版本。

云端根据视频 `BV1winH6DEgt` 的预览帧重构同范围需求，先冻结输入，再执行旧版首次 derive 并进行独立语义评价。维度 1–4 为 PASS，与视频为 **SEMANTICALLY COMPARABLE**；没有有效行为红灯，因此没有候选技能修改或 red→green 修复。simple/library 控制样本、技能 review/prove 和产品运行测试均未执行，不记为通过。这是一次 LLM 输出与语义评价，不证明跨输入稳定性、原生自动加载、真实业务验收或整体优于视频。

## 复查顺序

1. [原始结论及限制](evidence/RUN-RESULT.md)。
2. [冻结计划](evidence/freeze-v1/TEST-PLAN.md)、[题面](evidence/freeze-v1/cases/01-video-task.md)、[交付说明](evidence/freeze-v1/cases/COMMON-HANDOFF.md)。
3. [首次架构输出](evidence/runs/base-video/architecture.md)与[执行记录](evidence/runs/base-video/execution.md)。首次输出 SHA256 为 `b8f7f2d56ac4c89a3a9df6e5b47277bff8b54371fd1e1f0dbbd45a2d2e013dc6`。
4. [冻结判据](evidence/freeze-v1/evaluation/RUBRIC.md)、[视频参考记述](evidence/freeze-v1/evaluation/video-reference.md)及[独立评价](evidence/evaluation/run-a.md)。评价者依据帧记述，未重新直接看图；视频证据不含完整音轨和源码。
5. 两张可编辑图：[对象与关系](evidence/deliverables/01-objects-and-roles.svg)、[目录与装配](evidence/deliverables/02-conceptual-paths.svg)，以及[云端渲染记录](evidence/deliverables/render-validation.md)。图是首次文本产物之后的展示加工，不是原生命令截图或首次推导直接生成的图片。PNG 已由父线程交付用户附件；本次只存 SVG 及生成源，未在桌面重跑生成器或渲染。

## 来源与完整性

`evidence/` 中 19 个文件保持云端原字节及相对层次。[IMPORT.json](IMPORT.json)记录来源、逐文件哈希、原路径到仓库路径的映射及原清单覆盖情况；[MANIFEST.sha256](MANIFEST.sha256)仅覆盖本目录实际保存的文件（不含清单自身）。

原 Library ZIP 下载失败且未落地，未验证其宣告哈希。随后通过任务消息接收 13 个编号块，程序化提取并拼接；gzip SHA256 `ddaf80fabffd6e4d767ba17aa01d49e26eab4129948006200c2ecac6f109327d` 及 19 个文件哈希均匹配，路径无绝对路径、穿越或重复。ZIP、压缩传输块、Base64、辅助程序和临时凭据均不入库。

原 `FREEZE.sha256`、`RESULT-EVIDENCE.sha256` 和 `baseline/MANIFEST.sha256` 保持不变，属于来源清单，并不表示所有云端文件都存于本目录：12 个 `baseline/skills/...` 未重复复制，已逐项与上述 Git 基线对象核对；`source-transfer/VERIFICATION.json` 未移交、未核对。原记录中的云端绝对路径仅为历史来源。需恢复技能时，用 `git show <上述基线提交>:skills/...`，不要以当前工作区替代冻结基线。

原报告的“未提交”“未回写”描述当时云端阶段，未事后改写。此次用户另行授权保存证据；本次仅本地工作分支提交，不改技能或安装载荷，不重跑模型测试或构建，不合并、不推送、不同步项目/全局安装。
