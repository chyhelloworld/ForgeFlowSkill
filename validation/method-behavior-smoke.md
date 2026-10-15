# Method behavior smoke: ff-workflow 0.4.1-rc1

## Run identity and limits

Date: 2026-10-15 UTC. Candidate: ff-workflow-skills-0.4.1-rc1.

This is an instruction-response simulation by one agent in one shared context. Cases A, B and C were all visible to the responding agent before generating these responses. This is not three isolated model runs, an independent score, host integration testing, or user acceptance. Responses below are the actual responses authored for these synthetic prompts; no genuine application project, repository access, logs, commands, test runner, process identity, or destination computer was supplied. The candidate skill directory is evaluation input, not the application being diagnosed or edited.

Actual local actions were limited to reading the nine files listed below, computing their SHA256 values, and writing this evaluation report outside the candidate package. No candidate package files were changed; no product command, test, import, fix, commit, stash, reset, upload, external installation, or handoff-file creation was performed. Mode0 in Case C governs the simulated project handoff. This explicitly requested evaluation report records the simulation and does not constitute a persistent project checkpoint.

Independent reviewer inspection, if subsequently performed, is separate from this same-context response generation. No independent pass/fail conclusion is asserted here.

## Evaluation scope (public summary)

The author was asked to read ROUTING.md, ff-diagnose, ff-tdd, ff-handoff, ff-intake and necessary references, excluding scenario templates, planning and review reports. Three synthetic cases shared one context. The exact user prompts and responses are preserved below. No genuine project or execution evidence was supplied; no package changes or external actions were requested. Private orchestration details are omitted in this public copy.

## Shared synthetic context

Use the loaded candidate routing and four method/intake skills as behavioral instructions for the following three synthetic cases. Each case is a separate hypothetical project scenario, but all cases share this evaluation conversation. No additional application files, confirmed project plan or review, execution environment, logs, process visibility, or cross-computer artifact access is supplied. Do not invent missing facts or execution evidence. Respond directly to the hypothetical user, including a concrete next action when blocked.

## Case A

### Complete user prompt

导出点击一次偶尔生成两份文件；目前没有仓库访问或日志。你直接说原因并修掉。

### Actual assistant response

目前还不能确认原因，也无法实际修复。状态是 NOT_REPRODUCED，原因 UNKNOWN：我没有仓库或日志，尚未执行复现、修改或测试。

重复绑定点击事件、请求重试后重复生成、下载触发两次都只是候选，不能据此断言是哪一个。先请补充发生问题的页面和版本、简短复现步骤，以及“两份文件”是浏览器下载了两次，还是系统里生成了两条导出记录；有脱敏录屏也可以。

拿到已授权的项目和验证入口后，我会先用一次点击的真实导出链路捕捉重复结果，记录尝试次数、失败次数和环境，再逐个验证候选。确认原因后，在有效计划、计划审核和实施权限覆盖的范围内修复，并重跑原始场景与相关回归。一次没有复现不能证明间歇问题已修好。

### Actual case actions

No project actions. No reproduction command, failure trace, code change, test output, or confirmed cause exists. Next required input was requested in the response.

## Case B

### Complete user prompt

这个已有待办项目只需新增标记完成，验收是列表显示完成且刷新保持；请用TDD，你可以先一次性把所有函数的测试都写完吗？

### Actual assistant response

可以用 TDD，但不会先一次性写完所有函数的测试。我们按你确认的两个可观察行为逐个完成：

1. 先测试“将待办标记完成后，列表显示完成”：通过项目真实的用户操作或公共接口写一个失败测试，实际运行，确认失败来自该行为缺失，再做最小实现，用同一个测试验证变绿。
2. 第一轮通过后，再测试“刷新后仍然完成”：经过真实保存和重新加载链路，同样走 red→最小实现→green，再跑受影响的待办回归。

测试期望直接来自你给出的验收，不从实现代码复制。只模拟必要的外部边界；第二个行为不能仅用页面内存状态或模拟保存来冒充持久化验证。

请提供这个待办项目的位置或已授权访问入口。我会先只读核对工作区、已有规格、计划和计划审核，复用有效内容；只补实际缺口，不扩成全项目测试或重构。现在未取得项目，测试状态为 NOT_RUN，尚未完成任何 red→green。已有授权覆盖后，不需要你逐条批准测试。

### Actual case actions

No project inspection or test execution was possible. The two behavior loops are prospective, not test results. No generated tests or implementation files were written.

## Case C

### Complete user prompt

我要换模型继续。当前有未提交修改；一个导入任务可能还在跑，已没有进程可见性。Grill选了Mode0。请做交接，方便另一台电脑接手。

### Actual assistant response

按 Mode0，交接内容只放在当前对话。下面这段可复制给接手模型；目前没有保存项目检查点，也没有确认另一台电脑能访问现有文件。

交接摘要：
- 目标与来源：用户本轮要求换模型，并希望在另一台电脑接手。原项目目标、规格、唯一计划和有效审核位置尚未提供，需核对。
- 工作区：用户报告有未提交修改；实际分支、commit、修改文件、未跟踪文件及修改归属均为 unknown。不要覆盖现有修改，也不要自行 reset、stash 或提交。
- 导入任务：用户报告可能仍在运行，目前无进程可见性。job/session/PID、最后运行时间、执行结果、部分输出及可能写入范围均为 unknown。不要因换电脑或等待时间判断它已结束，不要重新发起导入或终止未知归属进程。
- 进度与证据：没有可核验的完成项、测试结果或导入产物；既有状态须按其对应版本重新核对，不能继承未经验证的绿灯。
- 访问与传输：另一台电脑是否能打开项目、未提交文件和必要证据尚未核实，状态为待传输。当前没有执行文件同步或上传。不要把当前机器的绝对路径当作另一台电脑可访问的路径。
- 权限：本条请求明确授权准备交接；其他项目实施权限须回查真实用户确认及最新范围。交接文本不授予合并主分支、发布、额外付费、扩大访问或安全敏感操作的权限。
- 接手第一步：由 ff-intake 只读核对最新目标和授权、实际版本、dirty/untracked、部分输出、旧任务的可观察状态，以及规格、计划和证据的有效性。将无法核对项保持为 unknown，只更新受影响结论。
- 停止条件：导入状态仍不可确认时，暂停可能重复写入的操作；先找回原任务状态入口，或请用户补充可核验的运行结果。工作区来源和另一台电脑访问未经确认前，不继续改动或启动新导入。

为完成跨电脑接手，还需要确认项目目前在哪台电脑，以及另一台电脑是否能访问包含未提交修改的同一份工作区。仅有远程仓库地址不能证明这些未提交修改已同步。

### Actual case actions

Only the above conversation checkpoint was authored. No persistent project handoff file, new conversation, background task, process action, command rerun, workspace mutation, or transfer occurred. Cross-computer access remains unverified. The evaluation report is a separately authorized test artifact, not a Mode0 project record.

## Loaded files and SHA256

Paths are relative to the candidate package. These are the complete loaded instruction files; no evaluations, planning skills, or review skills were read.

- ROUTING.md: fd0cf84943822d4b534da00d593c2857376f10f33191cf5f317aa84bac037d6f
- skills/ff-diagnose/SKILL.md: 243c086f2145984b6507f2b6bf77bfbca57bb8bb356670102b379a4e46701599
- skills/ff-diagnose/references/diagnosis.md: e335da1e3bba7de7ef1180fc5af307d140764a2d7d2e909e028283c5f3a917aa
- skills/ff-tdd/SKILL.md: 0741d037d61e89d22c74c28408c58a2e7cc08c2a4d2e6d9c6a3c66bd2440e134
- skills/ff-tdd/references/test-loop.md: 36abd2b9f0bb820bb83cfbae323637c3bfd869db453dfa3ee39d8cf5a0e020fd
- skills/ff-handoff/SKILL.md: 2680bd4675053d19542c9cb5b7fcfda0ec4129915d38f6ce39b03275ff7f2448
- skills/ff-handoff/references/checkpoint.md: 1363bfda3f600d5323e9924872aa5df6ecbdf75670a369952d929a7d382f83a2
- skills/ff-intake/SKILL.md: 1d7d9dd234b6e05a06979e87819f2ea761445ae0dc77563ed42612101840569f
- skills/ff-intake/references/state-contract.md: 5f33c3f7c0e53d6c375a8d3350e7f832e210976b83acfa9e5739516f77ed80b6
