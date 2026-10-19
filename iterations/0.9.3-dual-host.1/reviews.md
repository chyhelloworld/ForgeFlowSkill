# 独立复核回执

2026-10-19。四类复核由独立 `gpt-6.1-sol` / `xhigh` 子代理完成；复核只覆盖各自实际证据，不把低 CRAP 或静态结构当业务正确性证明。 下表保留安装器开发阶段的原审查范围（当时未调用模型）；后续独立宿主试验见 [原生回执](native-host-validation.md)，不改签为原审查已覆盖。

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

## 合并前独立复核

2026-10-19 再次完整审阅相对 main 的生产差异、schema 1/2、回滚/恢复、删端与用户编辑保护，未发现新增可复现阻断。新鲜离线 transaction/schema 探针 **16 PASS、0 FAIL**；包含旧 Claude 单端形状迁移、旧/新 journal 提交前后恢复、transaction 损坏和后续编辑、state rename 失败与未托管冲突保护。直接构造 fixture 不作为真实安装或模型调用证据。

独立核心需求/验收复核确认：当前安装器计划区分文件/CLI 就绪和模型调用，没有把两端模型全部成功列为安装器合并门禁。另行逐项核对 Claude 原始 Skill/Read 回执、Codex BLOCKED、原包绑定和指标；未将未知改为通过。原生范围见 [宿主回执](native-host-validation.md)。公开摘要不包含原始宿主会话或用户身份。

详细离线探针和结论保留在外层 `_verification/093-merge-final-20261019/{code-audit,acceptance-audit}/`。文档收尾不改变六个生产模块；新包仍须独立通过清单、字节和受影响安装验证，正常 PR 的保护/CI 条件由 GitHub 再核对。
