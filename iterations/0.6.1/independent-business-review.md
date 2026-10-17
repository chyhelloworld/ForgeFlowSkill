# ForgeFlow 0.6.1 业务实验证据独立审核

审核时间：2026-10-17 UTC。审核者：独立只读 AI 上下文，未编写被审业务代码。本报告不是真人接受，也不是 Claude 或 Windows 运行证明。

## 当前裁决

- 新项目模块业务旅程：PASS（仅模块范围，独立复跑 11/11）。
- 新项目浏览器证据：PARTIAL。已有真实浏览器返回形态的 AX 树、下载路径和一致的下载内容，足以支持局部操作观察；不足以宣布完整 goal-mainflow PASS。
- 复杂度：PASS（测量可复现；36 函数，最大 CC 14）。可靠 CRAP：NOT_MEASURED；完整 code-quality gate 未通过。
- 0.6.1 业务实验证据：可限定范围收口（见末节旧项目补审）。本裁决仅覆盖业务实验，不代替安装审核，不代表应用完整验收、可靠 CRAP 或正式发布。
- 安装器由其他审核负责；本报告没有独立复跑安装矩阵。Claude 模型、原生 Windows、真人产品价值验证全部 NOT_RUN。

路线图允许把 GUI 限制单列，因此 GUI/CRAP 缺口并不自动证明 ForgeFlow 实验失败；它们严格阻止把本应用称为完整产品验收或完整质量门禁 PASS。最终是否以缩小范围收口，应明确列明接受范围，而非把待验项改名为通过。

## 被审版本与证据绑定

冻结 FF 候选：`130e79e62b45c93bf817505b0907ea6eb91e3a7d`。
新项目仓库：`ff-decision-journal-lab`，HEAD `effe1e0`，业务实现 `ba9cb3d`，`evidence/gui-followup/` 当前未提交。
项目实际采用上游 `e2ec880501d046b2624d57162e51854bcb483ef2`，规划审核记为 `0.6.0-experimental.7`。独立对比确认全部 17 个 SKILL.md 从该基线到候选仅替换版本号、正文无变。因此这可作为未改变技能正文的基线业务证据沿用，不能描述成“已安装 130e79e 后重新完整执行业务实验”。候选安装/打包改动须由本轮专门测试覆盖。

独立执行 `sha256sum -c evidence/resume-source-sha256.txt`：应用 HTML、model、CSS、UI、server、两份测试及旧测量脚本共 8 项全部匹配。补充 CC 脚本同时验证当前业务源与历史指标文件摘要相同。未改动 lab 或 FF 源码/证据。

独立输出保存在 `ff-061-review-evidence/new-project-tests.txt` 与 `new-project-eslint.json`。

## 真实业务流程与模拟边界

阅读 PROTOCOL、dialogue、REPORT、skill-loads、HANDOFF、规划快照/审核和实际源码。对话包含原话澄清、只讨论 AI 而不实施、明确新增 Markdown、排除登录/协作、空库恢复替代合并、切片中断后恢复、按创建时间排序的新要求。实现及测试与最终范围一致。

实验明确所有产品用户、开发者、审核者、作者均为 AI，单案例、无无-FF 对照、共享文件系统，仅新上下文与流程隔离；不能宣称真实客户调研、真人独立审核或 FF 的因果收益。skill-loads 是已记录的加载活动，不是不可伪造执行证明；本审核没有原始平台模型调用回执，无法独立认证具体模型名称或全部时序。应以可追踪执行记录/组织者来源限定措辞。

模块测试调用生产 model.mjs，内存 Storage 替身明确标注；断言包括保存/重载、搜索、两次复盘、原字段不变、创建时间排序、JSON 空库恢复相等、非空拒绝、非法备份原子性、写入失败以及完整 Markdown。11/11 独立复跑通过。~600KB 大量反引号的真实 RangeError 红灯记录与 reduce 修复保留，回归非简单凑覆盖率。

## 浏览器补证的准确可用范围

`browser-return-log.json` 有 4 组工具返回：保存后详情；搜索 SQLite 后列表仍有记录；包含复盘并以复盘关键词搜索的详情；Markdown 请求下载提示及 JSON/Markdown 下载路径。下载 JSON 中原始理由、多行/反引号、放弃方案和一条复盘完整。独立调用生产 validateDocument/exportMarkdown，JSON 校验通过，Markdown 与生产序列化逐字相等。

这比单独 HTTP 200 或内存模块测试更强，可记为浏览器局部旅程与导出内容补证。但日志是整理后的工具返回，未包含完整操作请求、重载动作、网络捕获和截图，且未绑定浏览器服务器实际提供文件的摘要；原下载位置未由本审核重新访问。内容一致性不等同于重新实测下载链路。

仍未证明：
1. 明确浏览器重载后的 localStorage 持久化（保存后与搜索后状态不能唯一证明曾刷新）。
2. 通过文件输入实际空库恢复及非空拒绝，随后验证原数据未改。
3. 多记录浏览器排序、回填复盘后稳定排序、所有异常 UI 状态。
4. 键盘可用性、视觉截图、无外部网络请求断言。
5. 真人接受及长期记录价值。

历史 REPORT/HANDOFF 仍称浏览器全部 BLOCKED，反映补证前快照，不能删掉历史记录。收口摘要需另加明确日期和版本的补证状态，写成 PARTIAL 并逐项列缺口。不要把旧 BLOCKED 或新局部证据混同完整 PASS。

## CC 与 CRAP 的可信度

独立运行 `node evidence/gui-followup/metrics-eslint.mjs` 成功，JSON 与保存的 metrics-eslint.json 完全相同。它加载已存在 ESLint 10.12.0 官方 complexity 规则，classic/max=0，包装 report 记录 node range；独立 AST census 保证全部函数恰好映射一次，7 个计量样例通过。model 19、UI 15、server 2，共 36 函数，最大 CC 14。

该方法修正原自制 Acorn 计数对默认参数、optional chaining 的漏计，例如 validateRecord 12→14。旧 experimental CRAP 不能作为正式质量数值。

Native coverage 记录仅覆盖 model；文件行覆盖 100%、分支 90.91%、函数入口 100% 不能等同逐函数体/路径覆盖。mapping fixture 的所有物理行覆盖，同时存在未调用 nested callback 和未执行分支，确实说明开始行或 FNDA 粗拼接会误报。UI/server 缺覆盖是 NOT_MEASURED，不是 0%，更不是 PASS。报告将全部 36 函数 CRAP 标为 NOT_MEASURED，未把实验值升级，可信且应保留。

要解除此门禁，需定义逐函数覆盖分母和语义、采用经过验证的 instrumenter/converter、处理嵌套/同行函数、绑定确切源码并收集 UI/server 所宣称范围。没有这些证据就不得声明 CRAP ≤50 或目标约10已达成。

## 收口前最小动作

1. 旧项目独立补审已完成，结论见末节；把限定范围及保留缺口一并纳入收口摘要。
2. 把本报告和未提交 gui-followup 证据纳入可追踪交付快照/摘要；历史记录保持原样。
3. 摘要明确：基线技能正文业务证据有限沿用；模型类别按实际平台来源归属；GUI PARTIAL、CRAP NOT_MEASURED、Claude/Windows/真人 NOT_RUN。
4. 若要宣布应用完整验收，则补齐上述真实浏览器旅程与可靠 CRAP，并对新证据独立复审。

当前未发现已复跑新项目模块范围内的阻断业务错误；本裁决不外推至未执行路径。旧项目审查依据与限制如下。


## 旧项目补审与最终收口判断（2026-10-17 01:03 UTC）

已读 `ff-existing-change-lab/REPORT.md`、requirement、plan、checkpoint、生产代码、测试、执行器、基线、red/green/journey 原始回执与日志、两份独立审核。该项目没有可供绑定的 Git HEAD；以最终快照和交付 MANIFEST 绑定，不虚构提交。

独立校验结果：
- MANIFEST 的 28 项文件摘要全匹配；final-snapshot 的 9 项全匹配。
- ZIP 共 29 文件（含 MANIFEST），每个成员与目录实际文件逐字节相同。
- 14 项已读技能/引用摘要与 e2ec880 基线全匹配。报告明确六个 SKILL 的版本是 0.6.0-experimental.7，未冒称候选已执行。
- red 回执的 order.py 摘要确为 baseline/order.py；red 与 green 的测试摘要相同，故并非通过弱化测试制造 green。red 有 8 测试/2 个预期失败，green 有 8 通过；四项公开 API journey 值符合 R1。
- 本审核没有再跑旧项目已完成测试，也没有把日志审阅描述成独立执行。新项目 11/11 的独立复跑与旧项目日志审查是不同证据级别。

静态源码在原有校验和签名基础上增加折后正数且小于10000时800运费；9999、10000、10001、折扣跨界、全折扣归零和原校验都有直接证据，未见该明确范围内阻断业务缺陷。它是新建的微型存量模块模拟 fixture，不是成熟遗留仓库、真实商家订单或生产迁移。不能从此推广复杂旧项目能力。

恢复证据合理但有限：此前确有审核工具故障后跨回合恢复，恢复时核对原始4项摘要及 baseline exit，不重复已完成命令；没有中断前正式 handoff。后来 checkpoint 向独立 reviewer 移交是新上下文审阅，不是第二次新模型实施或崩溃恢复。执行器仅对同名 receipt 防重复，不是原子 exactly-once 或并发重入保障。

保留证据缺口：journey 执行时 inputs 没有 journey.py 自身摘要，最终快照绑定不能回填执行时绑定；可靠 CC/逐函数覆盖及 CRAP 未量得；无 FF CLI/evaluator/archive 实跑；Claude、Windows、原生安装、真人接受 NOT_RUN。这些限制均在现有报告明确披露，不应重新贴 PASS。

**最终业务实验裁决：允许以限定范围证据收口 0.6.1 的业务实验部分。** 两个基线技能正文实验具有实际执行与真实失败/修复记录，未发现所审范围内需要阻断本轮实验记录收口的业务缺陷。收口名称应是“基线技能正文的新项目与微型旧模块变更实验已完成、证据独立审查完成”；不能写“全部端到端/产品质量/跨模型跨平台通过”。安装候选仍必须取得另一独立安装审核，才可宣布整个限定里程碑完成。正式合并、部署或发布不在本报告授权/裁决内。

必须随收口保留：新项目 GUI PARTIAL，两项目可靠 CRAP NOT_MEASURED，旧项目 journey 执行脚本绑定缺口，模型归属凭实际组织者/平台记录而非本报告独立认证，Claude/Windows/真人 NOT_RUN。新项目完整应用接受仍未满足，不能因实验阶段推进而自动完成其待验任务。
