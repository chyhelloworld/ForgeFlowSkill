# Intake behavior smoke: candidate 0.4.0-rc1

Date: 2026-10-15 UTC

## Scope and boundaries

This is a simulated instruction exercise, not host integration, native skill installation, product execution, independent review, or user acceptance. The only candidate instruction contents loaded were ROUTING.md and the skill/reference files listed below. No evaluation, rubric, package review report, or ff-review skill contents were read. A directory listing exposed filenames only; it was not used as behavioral evidence. No install or deploy was performed.

Both exercises share one agent context and the loaded instruction corpus. They are separately labeled inputs and responses, not isolated-context trials. Exercise B is not an independent replicate of A. Their project facts are separate; no project facts, authority, or output from A is treated as evidence for B.

No target repository, spec, tickets, review result, browser session, or test logs was supplied. Statements in user prompts are reported claims, not verified repository facts. No commands were run against either hypothetical project, no engineering artifacts or ticket states were modified, and no commit/review/task IDs were invented. Filesystem operations in this run only read the candidate instructions and write this exercise record. The implementation action plans below are conditional future actions, not claims of execution. Relevant project runtime checks are NOT_RUN; actual project state is unknown until access is supplied.

## Exercise A

### Full user prompt

接手博客继续开发。仓库有可运行首页，旧规格只讲文章列表，但我现在确认要把产品介绍作为首页重点；旧tickets仍然只讲文章列表。你直接做吧。

### Next response

我会按你刚确认的“产品介绍作为首页重点”推进，先把首页相关规格和旧任务对齐，再改首页。旧规格和旧 tickets 只覆盖文章列表，已不能作为这次首页改动的有效依据；无关功能和仍有效的结果会保留。

请给我仓库位置或接入已有工作区。目前没有源码和工程资料，实际首页状态、测试和旧审核都还无法核实。

### Action plan

1. ff-intake 只读接入：以本条用户确认作为新目标来源，查项目约定、授权范围、唯一规格和计划、实际代码、未提交及未跟踪文件、用户启动入口、已有运行证据和旧命令状态。只给接入对账，不在 Intake 阶段改工程文件或票据。
2. 当前对账：据用户描述，首页目标相关 Spec = stale、Plan = stale，原因是仍只讲文章列表；具体位置和版本 = unknown。Design = unknown；Evidence = unknown，相关旧首页证据不能直接覆盖新目标。实际完成情况 = unknown；仓库接入前实施受阻，不宣称首页已跑通。
3. ff-spec 在唯一已授权规格载体中，仅修订受影响的首页行为、范围与可观察验收，记录旧“文章列表重点”到新“产品介绍重点”的确认来源。先查已有产品介绍、布局约定和文章入口；不能从代码或“重点”二字擅自推导删除文章列表、编造产品卖点或新增付费能力。确有无法查明的重要取舍时再问最小问题，不重新询问已明确的首页重点。
4. ff-plan 基于修订规格重排受影响的现有票与已完切片，补齐目标映射、业务闭环、验收和真实依赖，沿用唯一计划。将首页主次关系、相关入口及受影响测试和旧审核纳入变化影响；保留不受影响的任务与证据。不预设票数或新建竞争计划。
5. 修改后的计划进入真正独立上下文的 plan 审核；旧审核若仅覆盖原首页目标则不直接继承。若无法取得独立上下文，明确披露独立性未满足，不以本人自评代替。视觉方向确有缺口才调用 ff-design，会改变方案的真实未知才调用 ff-prove。
6. 有效规格、计划与独立计划审核具备后，ff-implement 只执行受影响的获准切片。核对真实入口和证据可取得性；实现后检查最终首页真实渲染、产品介绍层级、相关主操作及文章入口的约定行为，跑受影响回归，绑定实际版本与日志。实际查看、操作或测试不可用时标 NOT_RUN/BLOCKED。
7. 变更交独立 goal-mainflow / code 审核及必要修复复核，交接有效证据与未证项。新版本不继承旧用户接受；不主分支合并、不发布部署、不额外付费，不扩大持久访问或改安全敏感设置。

## Exercise B

### Full user prompt

接手已有项目，spec与当前确认需求一致，tickets完成了分解且计划独立审查通过，剩余任务是修复已明确的搜索空结果提示，现有测试能跑，工作区干净。

### Next response

我会先只读核对现有规格、剩余任务、独立计划审查和工作区；确认它们仍有效后，直接修复搜索空结果提示，复用已有计划，不重新做需求澄清、原型或拆票。

请给我仓库位置或接入已有工作区。拿到后先复现空结果提示的问题，修复并检查空结果及正常搜索路径；实际测试结果会随改动一起交付。

### Action plan

1. ff-intake 只读核对项目约定、最新目标及授权、规格与唯一任务、独立计划审查结论对应版本、实际工作区（含未跟踪文件）、测试入口和旧命令状态。用户提供的“有效、审查通过、可运行、干净”是待核实信息，不据此声称实际检查已通过。
2. 当前对账：Spec、Plan、Review 按用户描述已有且有效，但实际材料、版本和有效性 = unknown；Design 是否需要及是否有效 = unknown。Evidence = unknown，测试 NOT_RUN；真实完成和剩余任务状态待核对。唯一当前阻塞是没有目标仓库及材料。核实若支持用户描述且现有授权覆盖该修复，则直接 ff-implement；不要求新规格文件、重规划、重做 plan 审查或跑齐九技能。
3. 从现有明确规格/票据读取空结果提示应呈现的行为和文字，不自行发明要求。复用剩余任务与已获准的实现范围；只做低风险小改所需的相关入口预检。
4. 在真实搜索入口复现已明确的缺陷，以能触达症状的最短测试/操作反馈定位修复。只有实际获得失败证据才记录 red；尚不能复现则如实说明假设和覆盖，不编造失败输出。
5. 修复搜索空结果提示，重跑原症状和相关正常有结果搜索路径以及项目要求的适用检查。若属于 UI，实际查看最终空结果状态并操作相关路径；未获浏览器或目标平台证据时保留对应未验证状态，不拿文件存在或其他平台通过代替。
6. 更新同一任务的真实进度，保留实际 diff/快照、命令、环境、退出码、原始输出和覆盖范围；无需为这项小修另建任务系统。修改若发现规格或依赖已变，才退回修受影响的规格/计划并复核，不扩大无关范围。
7. 对最终变更进行适用的独立 goal-mainflow / code 审核，修复发现后复核，再交接。既有有效 plan 审查可以复用，但不冒充新代码审核。测试通过不等于用户接受，不自动合并主分支或部署。

## Loaded file paths and SHA-256

The following is the complete instruction-content read set shared by both exercises. Hashes were computed from the same local candidate files after reading. No target-project evidence is represented by these hashes.

- Path: ROUTING.md
  SHA-256: a1ea9d9504103c5242af8c9b26d683b3038661edc56b191b19061f593373d812
- Path: skills/ff-intake/SKILL.md
  SHA-256: 71bf9e2d9ec5d9180f9d1c1cae553bde0c0a1f3a54fff3de59960d0a4e50ef73
- Path: skills/ff-intake/references/state-contract.md
  SHA-256: 5f33c3f7c0e53d6c375a8d3350e7f832e210976b83acfa9e5739516f77ed80b6
- Path: skills/ff-spec/SKILL.md
  SHA-256: 7b32e421ceec79d7a094940d245e5729c0871f4797062ddffb70851f9035f8a3
- Path: skills/ff-implement/SKILL.md
  SHA-256: 6457ce14ba552f79b417dcf5e342dd9614a8b1e7ee04d42c12d7d2d119020623
- Path: skills/ff-implement/references/continuity.md
  SHA-256: 3b937fbe528266c2c38e756f6c8cc2de103e59c30dfb84d89c1dc9108283e889
- Path: skills/ff-implement/references/evidence.md
  SHA-256: e7fd5b5163d0c1e00289bc2b3b4cd9903671b221dd7ae6f37194955fe6b0e64f
- Path: skills/ff-plan/SKILL.md
  SHA-256: d17c01216c900f038137f813f83aee313f8f12b8d594e2b8fed5d4ac52a7a680
