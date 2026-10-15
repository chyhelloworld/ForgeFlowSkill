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
