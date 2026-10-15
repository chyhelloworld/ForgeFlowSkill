# 迁移至 0.5.0-rc3：唯一规格源与 CLI 并存

这是显式、有复核的迁移，不是自动 JSON 转换。保留完整 Git 历史，不 squash 旧规范，不删除旧失败与未接受记录。已有安装应先备份同名技能与用户修改，按 INSTALL.md 更新十二个技能；不同时安装两套同名技能。旧版来源与许可保留。

## rc2 至 rc3：只隔离入口，不另建规格库

1. 保留现有 `openspec/specs/`、活动 changes、FF policy/回执和 Git 历史；不因包名变化重新导入、重签审核或批量归档。已有哈希必须按实际内容与 schema 重新核对，旧 rc2 测试结果不自动证明 rc3 通过。
2. 在获准 checkout 按 `tools/openspec/README.md` 重建固定版本。包名改为 `@forgeflow/ff-spec`、可执行名为 `ff-spec`，用户配置和数据命名空间为 `ff-spec`。不全局安装、不覆盖或迁移官方用户配置；需要的 FF 设置逐项核对后在自己的命名空间配置。
3. FF 命令改走 `node tools/openspec/ff-spec.mjs <子命令>`。命令在目标项目根运行；若 FF checkout 不在此相对位置，改用 launcher 的真实相对/绝对路径，不改变目标工作目录、不回退到全局官方 CLI。
4. FF 初始化只允许显式 `node tools/openspec/ff-spec.mjs init --tools none`，不会刷新已有官方工具集成；FF `update` 拒绝执行。十二个 FF 技能按 INSTALL.md 的授权安装过程单独更新，不借上游生成器覆盖官方技能或命令文件。
5. 对目标变更用 launcher 执行 status / instructions apply / validate，复核用户配置、官方工具文件和目标项目 Git diff，再开展授权内写操作。

官方 CLI 有文件系统权限时仍可操作兼容的 `openspec/` 项目树，且不执行 FF 门禁。并存隔离仅减少无意碰撞，不能抵御主动绕过或其他文件系统写入者，也不能替代授权与独立审核。

## 0.5.0-rc1 项目逐项迁移

1. Intake 只读定位真实仓库、Git 提交/分支、脏状态、旧 spec-state.json、现行文档、活动/归档记录、测试和批准依据。先备份或在获准工作分支保留快照；不知道旧操作结果就先核实。
2. 用旧 `validate` 只读审计结构，将旧状态分为 current、active、accepted history、canceled/rejected history、unknown/conflicting。旧 schema_version=1 的 accepted 不自动证明真实接受；旧 integer version 不直接变为新内容指纹。
3. 由 Spec 对照用户真实确认与当前规范，显式决定哪些条目进入 `openspec/specs/`。实现事实与未确认想法单列；冲突/不确定项暂停迁移，不自动取最后修改时间或更高版本作为权威。
4. 活动变更逐项整理为 `openspec/changes/<change>/` 的 proposal/spec delta/design/tasks；保持稳定需求 ID、原始来源引用、未完成事项及取消/拒绝状态。未接受 delta 不得写入现行 specs。已完成历史留作历史，不批量重新 archive 以免重复同步。
5. 创建明确 opt-in 策略 `openspec/ff-policy.json`：artifact ID、现有规范路径/非规格路径、requires、reviewRequired。检查依赖完整、无环、路径映射唯一且不依赖易变的文件名猜测。无须迁移既有测试/设计正文到第二份文件。
6. 获取当前内容/依赖哈希，逐项检查迁移后的产物和证据；独立复核后才记录新 ff-artifacts.json 及 review。不将旧 pass/accepted 自动映射到新回执，不借 snapshot 自动批准，不为满足门禁虚构 reviewer/evidence。工具的哈希不认证授权或评审者身份。
7. status、instructions apply、validate 检查同一变更；实际验证主流程与受影响回归。真实接受另行核实，才按授权 archive，同步后的 openspec/specs 与 Git diff 必须核对。记录成功、拒绝、未测及未决范围。
8. 旧 `.forgeflow/spec-state.json` 标明仅历史审计并停止写入；可以保留原路径供审计，但不能继续作为 current。rc2 Python apply/archive 与库写入口全局拒绝。冻结旧工具/测试仅作来源，不再在当前项目调用其写路径。

## 取消、拒绝与回滚

取消/拒绝不应补造 pass。对已显式迁入 OpenSpec 的活动 change，可在已有授权和真实决议下运行 `node tools/openspec/ff-spec.mjs archive NAME --ff-disposition canceled --ff-reason TEXT --ff-decision-ref REF --json`；拒绝则使用 rejected。它直接保留活动变更全部历史与原始回执，新增 ff-disposition.json 决议记录，不要求把失败/过期/未完成材料改成有效，不同步 delta 到 specs，不称为已接受归档。

关闭必须有 FF policy 或原 FF manifest，允许其损坏以保留失败现场；这不是把损坏材料判为通过。reason 和 decision-ref 必须同时明确提供，引用仍由调用者核实，工具不认证授权。原始记录逐字节保留；已有决议回执/目标、符号链接及跨文件系统移动拒绝。正常 archive 仍按完整有效性门禁执行，不能用 --yes/--no-validate/--skip-specs 自动进入关闭路径。旧 JSON 历史不会自动搬迁或重标；复核分类与来源保留仍为前提。

迁移回滚须明确决定恢复哪套权威源并保留迁移 Git 历史及用户修改；不能同时重启旧 JSON 写入和新 OpenSpec 写入。退回旧工具是另一次显式版本/风险决策，不是遇到 gate 拒绝就自动降级。

## 更早版本

0.4.x 的 Diagnose/TDD/Handoff 仍为三个按需方法；九个主职责保持选择性。旧迁移说明与原 0.5.0 契约保存在 provenance/legacy-0.5.0-rc1/，只解释历史语义，不是当前命令指导。
