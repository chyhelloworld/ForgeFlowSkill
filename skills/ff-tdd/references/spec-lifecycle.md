# OpenSpec 原生 FF 生命周期契约（0.5.0-rc3）

## 一个现行规格入口

启用 FF 的项目以 `openspec/specs/` 为唯一现行规格源；`openspec/changes/<change>/` 保存本轮提案、规格差异、设计、任务及 FF 回执；`openspec/changes/archive/` 为历史。Git 提交历史保留全部原始来源、被替代内容和迁移决议。不得继续维护 `.forgeflow/spec-state.json` 的 current/active/archived 为第二套权威状态。

目标、设计、任务、实现与测试可以继续使用项目既有位置；在 `openspec/ff-policy.json` 中用稳定 artifact ID 与明确路径映射，不能按文件名猜职责。旧代码的实际行为、未确认提案和历史通过记录不自动成为现行承诺。小修只登记实际需要的产物和依赖，不要求十二技能串行或十二份文件。Mode 0 不保存完整讨论，工程产物另按已有授权保存。

## 项目本地入口与官方 CLI 并存

所有 FF 命令从目标项目根目录运行 `node tools/openspec/ff-spec.mjs <子命令>`。示例假定本包工具位于目标项目的 `tools/openspec/`；若本包在嵌套目录或独立 checkout，须改用 launcher 的真实相对路径或绝对路径，工作目录仍是目标项目。不要为寻找 launcher 切换到另一个项目，也不要回退到 PATH 中的官方 CLI。未找到 launcher 或未完成本地构建时报告 BLOCKED，按 `tools/openspec/README.md` 处理。

rc3 包名为 `@forgeflow/ff-spec`、可执行名为 `ff-spec`；用户级配置与数据使用 `ff-spec` 命名空间，项目规格树仍为 `openspec/`。不做全局安装、不替换官方包或全局命令。FF 初始化仅允许显式 `node tools/openspec/ff-spec.mjs init --tools none`，不会刷新项目已有的官方工具集成；FF `update` 命令拒绝执行。十二个 FF 技能按自身安装说明管理，不通过上游工具生成器安装或更新。

并存隔离避免无意的命令、配置和工具文件冲突，不是安全边界。官方 CLI 只要有文件系统写权限，仍可操作兼容的 `openspec/` 树，且不执行本分支 FF gate。启用 FF 的项目应统一使用此 launcher 并复核 Git diff；不能把命令名隔离当成权限控制。

## opt-in 与统一有效性判断

本分支适配固定版本 OpenSpec 1.14.2 源码，构建与补丁细节见仓库 `tools/openspec/README.md`。不存在 `openspec/ff-policy.json` 且没有孤立 FF manifest 时不启用 FF gate；遗留 manifest 而 policy 缺失须失败关闭；存在但格式损坏在正常门禁中必须拒绝，不能当成未启用。FF 不是外置 Python 状态机。

策略形状：`{version:1, artifacts:[{id,paths:[...],requires:[...],reviewRequired:true}]}`。paths 为项目根相对的明确文件/模式，requires 引用稳定 ID。每个 change 的 `ff-artifacts.json` 为 `{version:1,policyHash,schemaHash,artifacts:{...}}`。它记录证据适用性而非另一份规格正文。schema、路径限制和错误码以实际 evaluator 实现及测试为准。

每项回执包含 `version`、当前 `fingerprint`、`inputs` 依赖摘要及适用的 `review`。产物 fingerprint 是按路径排序的 `{path,sha256}` 文件列表经 JSON 序列化后的 SHA-256，路径使用统一项目相对形式。policyHash 绑定策略原始字节；schemaHash 绑定实际解析后的 OpenSpec schema（SHA-256 of JSON.stringify），schema 变化使回执失效；已启用 FF 的变更禁止使用不同的 --schema override。每个路径 scope 至少匹配一个非空文件；拒绝符号链接。glob 仅支持 */**/?/[]，不接受花括号/括号扩展。依赖指纹变化使消费者过期，即使消费者自身字节未变。新增/删除/重命名匹配文件都应影响指纹；不能用重写回执代替实际更新和复核。

独立 review 必须绑定 `targetId`、`targetVersion`、`targetFingerprint`、依赖 `inputs`，并保留 `verdict`、`reviewer`、`toolVersion` 和带路径/哈希的 `evidence`。缺失或失效回执不能通过。保留旧回执和证据的 Git 历史，不删除失败来制造通过。哈希仅说明内容绑定，不认证评审者身份、不验证证据真实、不代表用户接受。

`status`、`instructions apply`、`validate`、`archive` 使用同一个 FF evaluator。status/apply 显示 FF 有效性和阻塞；validate 与正常 archive 必须遵守 gate；显式 canceled/rejected 关闭路径见下节。OpenSpec 文件存在或任务勾选本身不足以代表 FF ready。--yes、--no-validate、--skip-specs 不绕过 FF gate。实际 CLI 参数见随包帮助，不使用旧 Python apply 的含义解释新 CLI。

## 明确 apply 与 archive 的语义

- OpenSpec `instructions apply` 产生实施指导和 readiness 信息，不修改现行规格，不表示接受或批准。
- OpenSpec `archive` 的正常路径会同步 delta specs 至 `openspec/specs/` 并移动 change 到历史；只有已获准、接受依据已核实且所有适用审核/验证满足时才执行。FF gate 是必要条件，不是授权。
- `--skip-specs` 是上游不更新规格的选项，不能作为绕过 gate 或伪造已合入的手段。交付必须记录是否真正同步现行规格。
- 显式取消/拒绝使用独立原生关闭路径：`node tools/openspec/ff-spec.mjs archive NAME --ff-disposition canceled|rejected --ff-reason TEXT --ff-decision-ref REF --json`（将 canceled|rejected 替换为其中一个值）。调用者先核实真实决议及权限；reason/ref 非空不认证批准。此路径保留未完成、失败、过期甚至损坏的产物/原回执，不同步任何规格、不制造 pass，也不表示通过正常接受门禁。
- 关闭路径要求项目有 FF policy 或该 change 有 FF manifest；其格式损坏不妨碍保留失败历史。归档 change 内新增 `ff-disposition.json`，含 version=1、disposition、reason、decisionRef、closedAt 与不认证批准的 claim，原文件保持原字节。已有该决议回执或目标目录拒绝覆盖；拒绝符号链接，仅使用同文件系统 rename，跨文件系统失败关闭，不退回复制。只支持单层 change 名（允许 Unicode），不支持嵌套 ID、多根路径或符号链接；沿用上游本地日期前缀，已有 YYYY-MM-DD 前缀保留。使用 archive/.openspec-archive.lock 与正常 archive 串行化。进程被杀、磁盘故障与回滚错误不作跨平台事务保证；先核对现场，不盲目重试。
- 只有显式 --ff-disposition 才选择关闭路径；遗漏 reason/ref、非法 disposition，或只给 reason/ref 都拒绝。--yes、--no-validate、--skip-specs 不能触发它。关闭与 --skip-specs/--no-validate 同用直接拒绝；--yes 在无确认提示的关闭路径中仅为冗余。关闭跳过正常 FF 有效性与规格同步检查，仅为真实 canceled/rejected 决议保全历史；正常 archive 的接受/有效性门禁不变。
- 规格同步、用户接受、Git 主分支合并、发布部署是不同事件；工具不会替用户完成后几项授权。

并发变更先核对当前规范、工作区和基线依赖指纹。过期先回 Spec/Plan 修订及复验，不强制刷新哈希伪装有效。结果不明先核对文件/Git，不能盲目重复 archive。任何操作的失败原子性只能按实际测试范围说明，不能凭 gate 宣称跨文件事务保证。

## 十二技能与证据

Intake 只读读取现行规格、活动 change、策略及回执，先运行 status/validate 后指出 valid/stale/missing/unknown。Grill 澄清范围；Spec 维护确认需求及 delta；Design/Prove 只处理真实未知；Plan 追踪依赖和切片；Implement 按授权实施，按需 Diagnose/TDD；Review 保持 plan、goal-mainflow、code 三类独立审核；Deliver 核对接受和归档结果；Handoff 记录指纹、Git 版本、旧操作状态、下一步，接收方先 Intake。

真实主流程测试优先；CRAP 使用实际函数复杂度与覆盖测量，阈值 ≤50、目标约10；未测标 NOT_MEASURED。验证状态为 PASS / FAIL / NOT_RUN / BLOCKED / 有理由的 N/A。技能模拟、静态包检查、云端集成和 Windows/宿主原生测试分别报告。哈希 gate 不能替代这些工作。

## 旧 Python 工具退出

`python tools/spec_lifecycle.py validate PROJECT` 仅审计旧 `.forgeflow/spec-state.json`，不判断当前 OpenSpec 项目 ready。旧 apply/archive、库级 mutation/write 接口全局拒绝写入。旧 schema/example 及历史试验仅供迁移取证，不允许新建双权威状态。迁移必须逐项人工复核；没有自动导入、自动接受或批量补签回执。历史实现与测试在 provenance 中保留，不能计为本适配测试。

## v2 试点修复契约（0.9.4-trial.1 本地候选）

上文 version 1 的字节哈希和全局作用域继续兼容；以下行为仅在用户显式采用 policy version 2 后启用。旧回执不会自动重算或被视为新审核。

```json
{"version":2,"artifacts":[
  {"id":"plan","changes":["*"],"paths":["openspec/changes/{change}/design.md"],"requires":[],"reviewRequired":true,
   "progress":{"plan":"openspec/changes/{change}/design.md","tasks":"openspec/changes/{change}/tasks.md"}}
]}
```

changes 默认 `["*"]`（每个活动 change），也可显式列平面 change 名。仅当前 change 适用规则及 requires 依赖闭包参与求值；依赖即使不在 changes 中也必须纳入。`{change}` 展开为当前名，使用 `openspec/changes/*/...` 的旧跨 change 通配路径须显式迁移，不猜测真实共享依赖。共享文件用明确路径及依赖关系登记，变化仍使所有真实消费者过期。v2 policyHash 绑定协议、change、排序后的适用有效规则，schemaHash 与原字节文件哈希继续保留。无适用规则不能通过。同名 ID 在不同 change 的回执不能串用，v2 manifest 必须绑定 change；v1 原始 policyHash 不变。

稳定计划的 `## Task plan` 下以 `- T1: 任务内容；验收：条件` 定义唯一 ID；计划必须在产物路径中。tasks 只含每个已批准 ID 的 `- [ ] T1` 或 `- [x] T1`（可有空行和标题），禁止在这里改范围，不能纳入产物哈希。勾选不影响计划指纹；计划或验收变化必须复核。普通归档还要求所有登记任务完成和适用回执有效，`--yes` 不绕过；apply 允许尚未完成的执行进度。该语法是显式 opt-in，不重写旧 tasks。

从安装项目根运行：

```sh
node .forgeflow/ff-spec.mjs receipt snapshot my-change reviews/plan-snapshot.json
node .forgeflow/ff-spec.mjs receipt template reviews/plan-snapshot.json reviews/plan-report.json
# 审核者独立核对 snapshot 中的实际文件、规则与 inputs，填写报告版本、reviewer、toolVersion、pass/fail、unverified
node .forgeflow/ff-spec.mjs receipt check my-change reviews/plan-snapshot.json
node .forgeflow/ff-spec.mjs receipt record my-change reviews/plan-snapshot.json reviews/plan-report.json
```

snapshot 和 report 放产物 scope 外。快照 create-only；模板默认 not-reviewed，录入拒绝草稿，明确 fail 可录入但 gate 不通过。录入仅使用所审快照的绑定，先重新核对实际内容/规则/schema/输入和证据，再写回执；报告原始字节自动 SHA256。报告中的未验证范围是报告事实，不由工具改成“全验”。审核者只读时在报告记录固定 snapshotHash；可由生产者根据审核者已完成报告录入，不能代填结论。内容绑定不认证身份、不取代授权或语义质量判断，也不声称对恶意并发写者的事务锁。

每次覆盖都会保留原字节 `ff-artifacts.history-<随机ID>.json`。从 v1 或移除旧 ID 后迁移须在新审核完成后显式 `receipt record ... --migrate`；旧记录留存且 gate 保持无效，status 仍给当前指纹和迁移诊断。不能只改 hash 将旧审核洗成有效。保留失败与过期证据。

`receipt diagnose` 分别报告 configuration/evidence/checked；项目 doctor 分别报告 runtime 和 gates，只有配置存在、非零检查且证据有效才给总体 READY。RUNTIME_READY、UNCONFIGURED、NO_CHECKS、NOT_CHECKED 均不表示门禁通过。`validate --all --json` 零项 exit 1；非 FF 项目的普通规格校验仍不代表 FF 门禁启用。

正文仍遵守 OpenSpec 英文大写 MUST/SHALL 关键词格式；中文正文如“系统 MUST 保留旧证据”可用，仅“必须”或仅标题关键词不满足 strict。结构标题保持英文，未新增中文别名。

原字节 hash 不规范化文本或二进制。doctor 按登记的含换行文本检查 git eol 属性，给每个未受保护路径的精确 `.gitattributes` 建议，如 `/src/example.ts text eol=lf`。在登记/新审核前建立 LF 契约并复核 diff；不要修改全局 core.autocrlf、整库重写，或只刷新旧回执。既有 CRLF 内容改变为 LF 是真实字节变化，旧审核应过期。未实测平台必须另记。

v2 普通归档必须登记至少一份稳定计划/进度映射，并完成 schema 解析到的全部任务；不能省略 progress 后用 --yes 越过任务完成。外部测试日志等证据可在生成报告草稿时自动冻结：`receipt template SNAPSHOT REPORT --evidence tests.log review-notes.txt`。工具把文件路径和当时 sha256 放入每项报告，审核者核对后再填写结论；录入前复核这些原始字节并把报告与外部证据一起绑定，之后替换任一文件都会失效。无需手拼证据哈希。未知报告字段直接拒绝，不静默忽略证据声明。未声明的外部文件不在绑定范围，报告必须列明未验证部分。`validate --archived` 空集合也 exit 1。

progress 所属规则必须 reviewRequired:true；不能关闭计划审核后仍归档。LF 建议先转义 Git glob 元字符再引用，含 [id] 的路径也只保护该文件。

## 审查时机与最小上下文（0.9.5-review.1 候选）

普通任务自检和相关确定性检查，阶段末默认一次综合独立审查，由一名独立读者分别给目标/主流程、计划覆盖、实现质量适用结论。阶段是可独立验收的功能切片，不是每个任务，也不能延至全项目结束；必要专业视角才拆分。核心替换、主要用户路径、数据迁移、安全边界、验收口径变化须在实施前独立审方案；风险不按行数/文件数判断。用户额外要求和项目既有门禁优先：已有 policy/progress 要求前置有效计划回执时仍须满足，不关闭 reviewRequired、不自签独立 pass；本次不改变 CLI gate 或迁移旧回执。

最小包含原始目标来源、不可破坏约束、验收、范围/差异、关键测试、已有结论/未验证项。摘要只导航，按需读原文并查跨模块影响，不默认带完整聊天/全库/全部规格。复用须目标、适用规则、相关依赖/配置/输入及证据仍有效；将会影响判断的原文登记到既有 v2 paths/requires/证据中，不仅比较源码、不另建缓存。修复只复核问题及影响链；无关非阻断建议进待办，新关键缺陷或关键未知不能通过，不能用轮次/token上限放行。审查冲突先裁决，需求矛盾回澄清，技术未知转有判断标准的最小实验，漏项改计划；无关获准工作可继续。
