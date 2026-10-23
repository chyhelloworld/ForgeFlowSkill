# IVR-001 / IVR-002 局部复核

2026-10-23 UTC。本次只复核首次报告的两个发现及受影响行为，不重新作综合审查。**IVR-001、IVR-002 均可在本次绑定版本关闭；未发现需要继续阻断这两项修复的问题。** 初始报告与原始失败记录保留。此结论不把 A-local、用户接受或整个项目验收升级为通过。

| 发现 | 局部结论 | 独立观察 |
| --- | --- | --- |
| IVR-001 孤立对象/缺边被隐藏 | 已修复 | 原 `orphaned_rows` 夹具的 M-orphan/T-orphan/A-orphan 在全局 gaps 显示 ID、原文定位、缺文件/缺引用；T-orphan 原进度 unknown、A-orphan 原结果 FAIL 及 validity=unknown 保留。加 `--requirement R1` 后仍保留相同全局缺口。原 `task_without_module` 夹具显示 `T1: no module mapping -> plan.md#T1`。 |
| IVR-002 已知 PASS 遮蔽未知状态 | 已修复 | 原 `mixed_unknown` 夹具的 `A1=PASS` 与 `A1=NOT_RUN` 现在得到 `recorded_result=unknown`，并有 `A1: recorded result unknown` 缺口。control 的单独 PASS 仍为 PASS、无缺口；两者 requirement_acceptance/user_acceptance 均为 unknown。 |

实现核对：`tools/workflow/intent_view.py:172-190,198-209` 在按需求投影前检查无有效需求归属的条目并保留原记录/缺引用，任务与验收缺模块关系单独报缺口，没有推导或写回关系。`150-165` 先收集同 ID 显式赋值/任务框，再检查全部值是否可识别且一致。`docs/intent-view.md:17` 已说明该语义和过滤下仍可见的全局缺口。文本继续从同一 report 渲染，原 FAIL/unknown 在渲染结果中可见。

新增测试 `test_intent_view.py:77-102` 对混合未知、坏 token、空值、未知任务框、全量/过滤孤立条目及缺模块做行为断言；没有把当前实现细节本身当作预期结果。已有同版正常多对多、旧示例、已知冲突、路径、CLI/只读测试也保留在作者执行记录中。

## 版本与原始证据

本次产品 SHA256：`696459a9809c5f3bf2f97b87291a682c604823192694170dbdd76bc8339bc2e9`。

本次测试 SHA256：`fb7dcb0901552b3ecdd3805c117f7e0f94bae0385f55528433caae9b203fe5ca`。

全部实际输入、初审报告/输出/夹具的前后哈希以及源码绑定，见 `focused-probe-output.json` 的 `before_sha256` / `unchanged_after`；检查结果全部不变。当前索引已快照：前三项 evidence 引用 `tests-after-review.json`，A-demo 引用新 `demo-after-review.json`。按委托只记录此次导航变化，没有因此扩展演示审查。

原始回归失败 `evidence/review-regression-before.json` 绑定初审产品 `f24fd907...` 和本次测试 `fb7dcb09...`，退出 1，两个测试共 8 个失败（包括 subtests），确实击中初审问题。未覆盖或改写该失败。

`evidence/tests-after-review.json` 的产品、test_intent_view、test_intent_contract 三个 source hash 均与当前字节一致。原始执行为 view suite 16 项 `OK (skipped=1)`、contract 3 项 OK，退出码均为 0。真实 symlink 仍明确 skip。此处复用同版运行证据，没有将其描述成本审核者重跑或取消 skip。

本审核者实际执行：

```powershell
python -X utf8 -B iterations/intent-view/review/focused-probes.py
```

该保存脚本仅对初审现有夹具执行 5 次 CLI：control、mixed_unknown、orphaned_rows、同一 orphaned_rows 的 R1 过滤、task_without_module。全部退出 0；成功生成报告本身不代表报告无缺口。每次完整 argv、cwd、UTC 起始时间、stdout、stderr、退出码与同 report 渲染文本均另存 `focused-probe-output.json`，不覆盖 `probe-commands.json` 或初始 `rendered.txt`。没有增加夹具或重跑全套测试。

## 读取范围与保留限制

复用本上下文已显式读取的固定 `review-handoff-096` / `0.9.6-handoff.1` ff-review、review-handoff 与 intent-loop 规则；不声称原生自动加载。本次读取当前产品 1-317 行、文档全文、results 全文、新增前后回归证据全文；测试组合输出被截断后，只针对变更及周边 65-112 行重新读取，未将被截断输出当作完整语义阅读。当前索引只提取验收引用并保存 hash。初审其余检查、限制及接触作者判断的披露继续适用。

A-local=UNKNOWN；真实 symlink/reparse、非 Windows、并发原子快照仍未证。没有重试真实链接创建或失败 strict realpath，没有权限升级。CRAP=NOT_MEASURED，用户接受=unknown，等待本人反馈。当前 results 中 A-links/A-truth 的 PENDING 是作者等待复核的状态，本次结论由代码和原夹具结果形成；可据此结束这两项修复的局部待复核，但不改写初审历史。

仅新增 `review/focused-probes.py`、`review/focused-probe-output.json` 和本报告；未改产品、初审输出或夹具，未提交、安装、访问外部服务或再委托。无工具审批拒绝及 pending/uncertain 操作。
