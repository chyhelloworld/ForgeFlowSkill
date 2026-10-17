# 0.8 独立附录：已封存真实中断接手证据

2026-10-17，review08 独立只读核验。未修改既有报告、实验原件或生产代码，没有重跑任何业务动作、检查器、SKU 查询或进程操作；只解析已封存材料、重新计算文件摘要并比较实际业务文件。

**PASS：本次三行本地库存任务的中断、接手、防重复和实际续做证据一致性。** 当前 checker 与相关实验材料没有本审查新增的冻结阻断项。此结论补充 [既有三类报告](independent-review-final.md) 中当时尚待核对的 receiver08 项，不把整版、最终安装、CRAP、CI 或真人接受提前标为 PASS。

## 独立核验结果

实际运行的只读 [审计脚本](independent-receiver-audit.py) 生成 [封存核验结果](independent-receiver-audit-sealed.json)，**45 项全部 PASS**。没有以接手者的 `result.json: PASS` 直接作为结论。

- receiver 封存清单 SHA256 实测为 `93365362587166063bfff5c0d09013bbea63ae97c3839ea7a98c4c8bc791d152`，与通知身份一致。清单列明的 141 个文件全部长度和摘要相符；除声明的四个自引用记录外，文件集合完整。外部报告副本也与封存记录一致。
- 原中断完整快照、receiver 操作前 37 文件快照及清单逐项相符。操作后 47 文件完整快照、清单与当前实际项目相符；仅新增 10 个预期文件，原文件仅 checkpoint 和事件追加日志发生预期变化，没有原文件删除，旧事件仍是逐字节前缀。
- 原 `project/` 的文件集合与全部字节仍符合它自己的原中断快照清单；早期失败实验没有被修复版实验覆盖。
- 冻结 checker 与当前生产 checker 均为 `76644c50f79c4d7a4f6f26a4789724a755070ce24c245afbae723c74b87fe8eb`。本次核验实际比较的 **8 个冻结输入与当前 source 均逐字节相同**；这是本次实际观察，不能自动覆盖未来修改或未验安装目录。先前关于换行变化的担忧不代替这次字节结果。
- 15 个声明依赖与操作前记录相同且仍匹配真实文件；三项回执均绑定同一当前目标和实际执行时依赖指纹，逐级核验 actionId、整数 exit 0、真实命令证据、stdout/stderr 和输出摘要。

## 导出未重跑与实际业务完成

原导出 CSV、export 回执、执行记录、原命令及 stdout/stderr 在原中断快照、receiver before/after 和当前项目中全部字节相同。CSV 的四份文件 `st_mtime_ns` 均为 **1792223629223683400**。实际事件只有一次 export dispatch、一次 export worker start、一次 export output written，执行记录仍为 1；不能只靠执行计数声称不重复，本次同时核对了内容、mtime、事件前缀及原命令证据。

实际中断监督记录保留子进程 PID 18960：先观测 running/ready 与 poll 未退出，再 terminate，wait 后观测 exit 1。部分准备文件、ready 标记和原失败记录保持原字节。receiver 在索引完成前实际记录原子进程和监督进程均不存在，没有终止既有进程，随后仅完成原准备文件对应的 index-01 和已获准的本地 review-01；两个真实子进程 exit 均为 0。

初次冻结 checker 的原始结果是 exit 1：export-01 SKIP_COMPLETED、index-01 INSPECT、review-01 VERIFY_CURRENT_AUTHORITY。完成后原始 checker 为 exit 0、CHECKPOINT_CURRENT、三项均 SKIP_COMPLETED。审计核对了实际命令记录及其输出摘要，没有重新运行 checker 来替换接手者记录。

实际 CSV、索引完整记录和已记录查询结果一致：SKU-100 Notebook 12、SKU-200 Pencil 30、SKU-300 Folder 8。索引引用原 CSV 和原 preparation 摘要；本地校验六项为真且引用当前输出。实际输出集合只有现行规范要求的 CSV、index 和 review，没有上传产物；历史 R1 没有被执行成新授权。

## 首次审计失败的原因与保留

[首次审计结果](independent-receiver-audit.json) 原字节保留，其中一项 FAIL 来自**审计程序选错了观察记录**，不是接手者缺少执行前观察。原断言要求观察时间早于索引命令开始，但我错误读取 `process-after`，其时间自然晚于业务完成。

| 原始记录 | 真实时间 UTC | 含义 |
| --- | --- | --- |
| commands/process-before.stdout.txt | 07:56:53.373733 | PID 18960、32220 均不存在，无匹配业务进程，拒绝读取命令行数为 0 |
| commands/index-completion.json | 07:57:54.588105 开始；07:57:54.881253 结束 | 真正续做索引的命令窗口 |
| commands/process-after.stdout.txt | 07:58:19.143009 | 完成后的重复缺席观察，不能拿来证明“完成前”时序 |

修正仅把“执行前”检查的输入改为真实 `process-before`，原有严格时间和 PID 条件未放宽；另加 `process-after` 必须晚于完成的条件。随后 [44 项复验](independent-receiver-audit-final.json) 全通过，再增加“8 个冻结输入与当前源码均逐字节相同”的明确检查，形成最终 45 项封存结果。没有改写失败 JSON 或实验原件。中间 44 项结果附带的换行限制文字来自当时担忧，最终 45 项结果和本附录已以实际字节比较明确更正。

## 冻结范围与剩余门禁

可将本次已核对的 checker 版本与三行本地中断接手材料冻结为后续安装/质量核验输入。最终完整安装及同版 CRAP 仍需主流程单独核对；旧 0.7 health 的 Windows 路径风险和符号链接权限测试缺口仍保留在既有三类报告中。本附录没有运行 CI，也没有获得真人接受或证明 exactly-once、身份真实性或敌对并发安全。

复核脚本可使用新的 label 再做只读审计，避免覆盖原证据：

```powershell
python -B iterations/0.8/independent-receiver-audit.py --label unique-readonly-audit
```

输入主目录：`E:\github\ForgeFlowSKill\_handoff\20261017\resume-lab\receiver\receiver08`。所有 watched 实验文件在本审计读取前后字节集合相同。
