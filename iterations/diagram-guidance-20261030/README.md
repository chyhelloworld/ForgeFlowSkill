# 独立图示元能力 0.1.0：实现与验证记录

基线6468847234f1e30c3ff8b186c38790de93c45293，工作分支work/prove-ablation-096；仅云容器。用户方向从共享图法调整为“国内软件工程/架构师要求、独立skill、元能力单独版本迭代”，以最终方向实施。

## 已完成的内容

- skills/ff-diagram：独立0.1.0入口，core/architecture/data/uml按需参考、元数据、来源与变更记录。国内教材/课程实际可读片段优先；国标题录与正文访问限制明确；OMG仅作明确版本的语义补充。
- 原4入口仅名称推荐，不复制图法、不依赖新skill才能工作；其他旧技能内容不扩展。国内标准不是全图通用盖章，不强制图集/层数/绘图平台/新门禁。
- skill-versions.json+静态validator：独立技能版本不跟全包强制锁步，旧技能沿原契约。当前清单20，保留17/18/19完整状态可读。

## 已执行验证（仅图示集成快照，非后续update-skill终验）

- 新引用/独立目录/双宿主skills-only安装与重入3项，以及全部安装器测试合计55/55，通过日志all-install-final.log。实际安装未构建full runtime；Windows相关为模拟，非真实Windows验证。
- 静态包20技能、144本地链接、25来源hash、1346manifest文件、38既有场景；静态mutation14项（含独立pin不匹配/未知skill/非法version）。这些不证明模型语义行为或宿主原生发现。
- 新skill quick_validate通过，git diff --check通过。源图语义/实际渲染与视觉验证由独立执行者另行记录；本作者的分发测试不冒充独审。

## 失败与修复历史

初始复制草案的static-before.log仅证明未增加参考文件；用户转独立技能后该方案废止。standalone-before.log证明独立skill尚不存在，不作为模型行为TDD红证据。首次受影响安装33/35：混库存测试删derive后产生无效混合清单而非预期19清单，修为删diagram；新skill缺原有统一“具体汇报”段，补齐已有契约。随后一轮all-install.log与源文案修改并行，命中source-integrity保护，结果无效且原日志保留。稳定源重跑all-install-final.log为55/55。

## 明确限制与进行中

未发布、未推送、未同步用户电脑；独立版本登记/孤立目录复制不等于受管单skill升级。父任务另授权最小已有skill更新切片，由独立工程执行者实施并测试；最终包需等其完成后重新构建验证，本段55/55不代签后续源码。独立行为、实际图渲染和视觉结果亦需另据版本记录；6场景不代表所有图种全覆盖。

## 独立语义审查与对照有效性边界

父任务转交独立审查者 `/root/review_diagram_skill_semantics` 的结论：未发现阻断性语义/权威主张问题；指出只读审查不应被限制为仅消费已有渲染证据。已修core允许在获准临时目录用现有工具渲染副本且不改原件，该修订待审查者复核，不能自动改签旧结论。GB正文未取得、不常用图种未展开、具体渲染器方言按需核对仍为限制。

行为比较的基线/候选入口和上下文不完全一致，候选另含渲染指令，因此仅能作为有限语义对照及候选视觉smoke；不能据此作“新技能因果提升所有图质量”的结论。6例也不代表全部UML/所有DFD方言覆盖。静态检查、独立文本审查、实际产物与用户接受分别记录。

父任务随后转交该独立语义审查者的只读复核：core允许本地临时渲染且保留原件、SKILL逐图核标准范围两项均已修，无遗留；这是对两处修订复核，不扩大为模型行为/全图质量通过。作者另跑新skill quick_validate通过；一次局部引用测试遗漏FF_TEST_ROOT被显式拒绝，补传已授权外部fixture根后重跑，未静默回落系统目录。

## 首轮行为产物（原样保留，不覆盖失败）

冻结输入/判据分别保存在diagram-eval-prompts.json与diagram-eval-cases.json（hash和说明同目录）。baseline-first保留基线6案Markdown及9份Mermaid源，未实际渲染；candidate-first保留候选6案、9图及可编辑DOT/SVG源、PNG预览、CHECKS/SHA256SUMS/SKILL-HASHES。两侧工具与执行指令存在差异，不比较渲染成功率为技能因果提升。

候选执行者记录实际查看全部9张PNG，并明确Graphviz成功、Chromium与rsvg-convert不可用等事实；父任务另外实际查看ARCH静态/DFD一级/ER概念三张，中文正常、无裁切。此为限定尺寸下视觉smoke，其他尺寸、业务正确性仍不可由截图代证。候选主要图稿在规则小修通知前生成，末尾重读最终SKILL/core；故为迭代试用，不是严格冻结随机实验。独立语义评分尚待回传。


## 单技能更新与集成回归快照

父任务另授权的v1已合入：update-skill仅更新已安装且全部宿主已有的ff-diagram，复用单一state/事务；非目标技能与原runtime bytes保留，skillOverrides记录独立版本/内容hash/来源，旧库存首次加入需完整迁移。没有把整个FF改成任意技能自由组合，也不让独立版本标签假装完成安装解耦。详细命令及限制见docs/user/update-skill.md；专项原始14项结果在update-skill-evidence。

2026-10-30稳定快照统一回归69/69安装器测试通过（包括14专项）；20技能静态包与14mutation通过，payload每条manifest内容hash已核。该快照日志combined-install-final.log/combined-static.json/combined-mutations.json保留；追加报告/独审结果后还需重新打包并作最终复验，不能沿旧payload hash发货。

未执行full构建、真实Windows、宿主原生加载与用户业务验收；新增安装代码未取得同版CC+方法coverage，CRAP为NOT_MEASURED，不能宣称其阈值通过。故障注入/临时fixture验证不是线上真实用户升级回执。

## 独立安装实现审查

父任务转交 `/root/review_independent_skill_packaging` 的只读审查结果：无阻断发现。审查者自行重跑14个专项通过，并追加5类探针：连续两版升级后回滚；不碰撞的未受管文件保留；remove-host后再升级；预发布/build/leading-zero版本拒绝且state不动；state已发布后清理pending失败仍能识别已提交并恢复。

实际探针脚本由审查者在临时位置执行；本记录保留出处/场景而不把随机临时绝对路径日志装入技能或声称线上回执。验证范围是skills-only fixture，不包含真实full构建、Windows原生或用户项目升级。最终合包仍以其后重建的manifest/payload和复验为准。

独立探针原脚本SHA256：9f67830f51452dc9a943839fa00446a6f2015ad071eeef3e6fa8078792157779（运行会话临时文件，未当成分发依赖）。

## 独立行为评分完成

diagram-eval-results.json与diagram-eval-report.md给出双方均6/6案例、30/30判据通过；无观察到的回归，也没有红→绿或改善证据。冻结rubric未改，候选6个prompt逐字一致。入口/上下文/渲染交接不等、非盲、非重复等偏差已披露，不能作因果提升断言。基线未渲染；候选9图实际渲染、作者全看，评分者另看2张、父任务另看3张。有限样本通过不等于全部图种覆盖或用户接受。

## 发布副本与隐私检查

新增日志的执行器绝对根路径已替换为占位符；PATH-NORMALIZATION.json记录变更文件原始/发布副本SHA256，失败原因/退出结果不删除。原始日志保存在源码外，既有历史证据不重写。全量递归privacy扫描与基线相比同为62条历史命中，新增0；差额记录privacy-delta.json。扫描仅为模式检查，非绝对无隐私/秘密的证明，不做图片OCR。没有复制整本教材或用户私有对话ID。

## 最终复验方式

在干净导出中重建manifest/payload；运行全部安装器测试（FF_TEST_ROOT/TMPDIR显式指向源码外）、静态包和14 mutation、skill quick_validate、diff与Git过滤前后字节一致性；逐条核tar内容hash。最终运行日志留在任务外部交接目录，避免日志写入包后制造自引用hash。实际最终commit/tree/payload hash由交付消息给出，不在自引用包里预写commit。
