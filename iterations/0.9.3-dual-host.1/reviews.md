# 独立复核回执

2026-10-19。四类复核由独立 `gpt-6.1-sol` / `xhigh` 子代理完成；复核只覆盖各自实际证据，不把低 CRAP 或静态结构当业务正确性证明。

| 类别 | 发现与处置 | 结论边界 |
| --- | --- | --- |
| 计划 / MECE | 增补宿主与状态交叉校验、当前共享 release 保护、提交前后恢复分界、doctor 两入口及精确分发包验收矩阵 | 修订计划可实施；不代替实现验收 |
| 核心需求 / 主要流程 | 复现构建期间用户修改被覆盖（R2），修复后独立复验 BLOCKED，编辑保留且 stateBytesUnchanged=true；核对真实 native-4 的 18 条矩阵，要求最终包重跑 | 固定生产实现无未关闭核心缺陷；最终包实跑单独绑定；未调用模型 |
| 代码规范 / 完整性 | 复现 transaction 损坏误恢复（R1），修复后独立执行为 FIX_VERIFIED，pending 保留、0 缺失/改动；源/已安装 doctor 的 14 项确定性 fixture 通过；保留 schema 1 JSON host 兼容 | 最终六文件哈希与 dev-source-5 相同，无剩余代码阻塞；假 CLI 不算 native full；外部无锁写入/断电仍有限制 |
| 指标 / 数据完整性 | 独立核对实际 AST/官方 complexity、两份同版 capture 前后哈希、41 份 raw、63 函数含 25 嵌套的 offset/覆盖率/CRAP 算术 | 硬门槛通过，12 项未达约 10 目标；V8 proxy 不等于完整分支覆盖或模型验收 |

## 审核绑定的生产源码

| 文件 | SHA256 |
| --- | --- |
| `installer.mjs` | `4cdaf8cd56057ac6d70c995a6c3a3367a7f428538561dc76d8f326929675669f` |
| `tools/installer/state.mjs` | `8ac2617ff7927ed148cc0de630275ee393b8b789a9ea8af8907df04f420c9e90` |
| `tools/installer/source.mjs` | `7180813b70d6237eaec156e544bc508f43e758e5a2da85abb9081e131d4ee1f2` |
| `tools/installer/runtime.mjs` | `f14f9290c63423fd2d8278c7b46597324bb92d8cd6e809619917f50f583a8fdb` |
| `tools/installer/transaction.mjs` | `b07e7efbe8dfb1ff1b126c72c4ef2ce97fa05083f3352f2130f1b0d055e1248a` |
| `tools/installer/install.mjs` | `352bb0543ab115f7afcd3d87b75653385a04103134b1f7ba6eeb481263b07f88` |

原始审查、反例驱动、失败与修复结果保存在外层工作空间 `_verification/093-dual-host-20261019/{code-review,mainflow-review,metric-tools}/`；完整指标报告的哈希和两份 capture/raw 哈希在 [公开逐函数投影](function-metrics.json)。源代码哈希若变化，不能复用本表结论；文档和冻结包的精确绑定由最终交付回执单独记录。
