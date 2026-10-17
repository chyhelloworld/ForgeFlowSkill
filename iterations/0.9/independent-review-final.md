# 0.9 独立审查最终报告

本报告审查 `47eedff1a7c1885ea002a99b97fb1cd0ed157ccd`（0.8）到 `work/061-through-09` 工作区的有界 0.9 增量，包括未跟踪文件。独立先读设计与接口，再自建实际 CLI 反例；没有以生产者测试结论充当预期答案，没有修改生产代码、既有测试或提交。真实夹具位于源码外 `_handoff/20261017/independent09-fixtures/`，源码内没有创建 junction。

最终结论只适用于本轮旅程约定、只读检查器、手册增量和对应证据；不构成整个 FF 发布、业务正确性、真人接受或全部历史脚本的通过声明。

| 类别 | 结论 | 依据与边界 |
| --- | --- | --- |
| 核心需求/主要流程 | PASS（本轮范围） | 预期与观察分开，原失败被修复；69 项独立公开 CLI 探针与 2 项真实 junction 复验符合预期，最终手册八步有实际截图/轨迹并直接核对；价值、审美与真人接受仍未验证 |
| MECE 计划 | PASS（当前有界计划） | 设计/约定、结构核对、真实手册任务、指标与交付各有明确责任和证据；不新建业务应用或状态平台、不扩四个未批准创意；不倒签实现前独立审核 |
| 代码规范 | PASS（受审增量） | 复用既有路径规则，结构/格式反例保守拒绝，实际只读；新检查器 12 函数同版独立计量，CRAP 全部 ≤50、最大 11；其余脚本未测指标单列 |

## 绑定版本与实际执行

- 冻结设计 SHA256：`ec7f55b4b28accd14b75076818ccdcf106feed4453d25a0e2a86dfff590f3249`，与 `design-before-implementation.json` 和当前字节一致。记录说明设计先于实现，但不是第三方时间戳认证或真人接受。
- 修复前检查器：`cff33ad0e972b825ce93c822651448203b391cb0b10181a083056dd4d5484e63`，原字节及相关协议/测试保存在 `independent-before-snapshot.json`。
- 最终检查器：`949b2896b007857c32c660d5aebdeeb4b8b31d93c4f2c187dce62642ca3cc0ab`。
- 最终实际手册 HTML：`ba0dcd8863c6cefa7872aaea9af94e1f6ce18e5f89eeb7b8bfc79837b0be7a8c`；采集器：`50946d58e8bfef86af19cee0204c68bc08dcc63cde50e54ef280e250ed187c35`。二者与 `ui-evidence-frozen/before.json`、逐步轨迹及当前文件一致。

执行记录按每轮分别保留，不把重复运行相加成更多独立场景：

| 实际轮次 | 结果与原始证据 |
| --- | --- |
| 修复前 56 项自建 CLI 探针 | 53 项满足初始预期；3 个首次偏差原样在 `independent-results-20261017T082021Z.json`，详见 `independent-review-initial.md` |
| 修复前 3 项额外格式/绑定反例 | 重复主 target、重复轨迹 ok、单独替换截图索引均错误返回 OBSERVED，见 `independent-format-before-results.json` |
| 修复后 69 项新版协议探针 | 首次新格式复验和随后收紧主 JSON 必须 INVALID 的复验均符合预期；最终原始结果 `independent-results-final-20261017T082754Z.json`，无夹具字节改写 |
| 修复后 2 项真实 junction 复验 | 根外目标、根内 reparse 路径均 GAPS；`independent-junction-final-results.json`，均未改写输入文件 |
| 最终真实手册八步审计 | `independent-ui-evidence-frozen-audit.json`，直接读取实际字节/轨迹/PNG 元数据，不导入生产检查器；另逐张查看全部 8 张最终实际截图 |
| 独立同版计量与生产测试复跑 | 19 项实际通过；`independent-unit-final.log`、`independent-coverage-final.json`、`independent-source-snapshot-final.json`、`independent-function-metrics-final.json` |

## 首次失败如何收口

截图原先仅按任意非空文件核对，Markdown 可冒充截图；修复后独立探针在轨迹与索引都正确绑定 Markdown 时仍被 PNG 元数据检查拒绝，排除了仅靠绑定错配碰巧失败的情况。签名截断、错误 IHDR 长度、零宽/零高也实际拒绝。

原先只绑定设计/源码而未绑定截图索引；修复后 trace 必须包含与 observation 完全一致的截图 path/sha256 列表。独立把索引替换为另一条有效 PNG 引用、保留原始 trace，实际 GAPS；缺少绑定和错误绑定也被拒绝。

默认 JSON 解析原先接受 NaN/Infinity 和重复字段；新版在主记录与轨迹均使用严格解析。实际 NaN、正/负 Infinity、重复主 target 和先 false 后 true 的重复 ok 都保守拒绝。生产测试从 16 增至 19，原行为断言未被删除或放松；正常 UI、CLI、中文空格路径的新格式正例仍返回 OBSERVED。

首次 `old-screenshot-current-trace` 反例的期望曾要求工具自动识别主动声明的旧像素。审查后明确这是凭字节和声明无法证明的拍摄来源问题，不把真实性伪装成可机器自动判断的范围。原始期望和 OBSERVED 输出未回写。最终用两个不同案例分别验证：未同步轨迹的索引替换必须拒绝；操作者主动在新轨迹里声明旧像素仍可能 OBSERVED，作为明确的真实性限制保留，不能称作真实同版操作已获认证。

第一次真实 junction 创建被沙箱拒绝，精确外部路径审批后才实际创建与测试。根外目标首先被 `unsafe resolved path` 正确拒绝；首个 harness 过窄地只允许 `symlink or reparse path`，留下 `independent-junction-result.json` 的 harness FAIL。没有把它算成产品缺陷，也没有覆盖原记录。随后根内 junction 实际命中 reparse 拒绝，最终新协议下两类各复验 PASS；没有修改权限或在源码内建链接。

## 真实 UI 的实际范围

最终 `ui-evidence-frozen/` 的 8 张截图均已实际查看。1440×1000 桌面中目录和正文可见；筛选“旅程”仅剩目标链接；真实点击和滚动稳定后 0.9 标题/规则可见；无匹配查询保持正文和锚点，清空恢复 32 项目录。390×844 下目录在正文前，筛选后同一目标可点击，稳定后规则标题与正文在截图中可见，无横向溢出。轨迹字段、来源指纹、PNG 实际尺寸、截图绑定、步骤顺序和事件时间顺序直接对应，无 pageerror。

手册前言、页面 title 和侧栏已更新到 0.9/17 技能，正文明确十二项工作流加 research、retro 和三项 writing 的完整数量；十二项详述表不是包总数。独立读取包目录，17 份 SKILL 均为 0.9.0，package.json 也是 0.9.0。构建器仅同步这些说明，筛选 JS 和响应 CSS 未改变。`check_guide.py` 将静态校验与实际浏览器证据分列，将工作流表数量与包目录数量分开，未宣称静态检查等于 UI 测试。

原 `ui-evidence/` 和中间 `ui-evidence-final/` 保留原版身份，没有改签。当前检查器实际拒绝继承原版旧 UI 记录（exit 1，`independent-old-ui-current-checker.json`）；本次结论使用第三轮真实重跑的 frozen 目录。PNG 检查只验文件头和正尺寸；故意仅留下合法元数据、没有像素数据的探针仍可 OBSERVED，这符合明确的元数据范围，不能称为图像完整解码或真实性认证。

## 计划、质量与剩余边界

冻结设计和当前 PLAN 沿用既有规格、技能及证据索引，覆盖入口到规则阅读、异常筛选恢复与窄屏同任务；不要求穷举所有页面或固定业务阶段数。ff-design 持有旅程协议，ff-review 保留三类独立结论，文件路径规则复用 ff-handoff。未见新增发布门禁、执行器、后台服务、竞合规范库或未批准的创意产品。当前独立 MECE 审查发生在实现之后，设计和 PLAN 已明确披露，不能倒签为实现前独立审核。

独立使用已有 `coverage.py 7.6.1` / `Radon 6.0.1`，在最终源码字节前后相同的条件下实际复跑 19 项生产测试并采集 branch coverage。12 个顶层函数与 AST、CC、native function coverage 的映射完整；逐函数 CRAP 与生产者报告完全一致，最大为 trace_gaps、sequence_gaps 的 11，全部 ≤50，两个函数略高于约 10 的优化目标，未因此机械拆分或刷覆盖。口径是项目明确声明的函数内可执行行与分支合计，不冒称原始 basis-path coverage。

采集器、静态文档/计量脚本、测试及独立脚本的 CRAP 为 NOT_MEASURED；未借用旧 0.8 helper 的历史覆盖率，也未宣称整个包 CRAP 全通过。手册构建器文案/输出字段更正已做源码复核，未声称其另有同版函数指标。

以下保留为未完成或审查外事项：PNG 完整解码与来源认证、漏列依赖/并发替换、FF 全业务价值与审美、真人接受、物理手机/触控/辅助技术、全宿主实际调用。已有全工作流日志的 43 项中 1 项旧 health symlink 测试报 WinError 1314；本报告不把该次错误改成全套 PASS。最终安装产物冻结、33 安装回归和安装后真实 CLI/journey 由主任务在源码外继续执行，尚不能用本报告提前背书。没有授权 main 合并或发布。

本次独立审查到此完成；后续若上述最终源码/HTML/采集器字节改变，本结论的相应同版证据需重新核对。
