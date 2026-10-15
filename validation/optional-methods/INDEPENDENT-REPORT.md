# ForgeFlow 可选方法：独立测试报告

## 先说结论与限制
现有项目本地 ff-spec 1.14.2-ff.0.5.0-rc3 已能承载五类可选文档，无需新增 CLI 源码：自定义 schema 定义文档及依赖，FF policy/receipt 绑定内容与审核版本。shape 与 beats 能走不同路线，不要求串行。

但 CLI 不是事实审核器，也不是作者或批准者。实测把 draft 改成故意错误的“instructions 会自动发布成稿”，再写入匹配的合成回执后，strict validate 仍然退出 0。这是明确的能力边界，不是语义测试通过。技能文字中的事实、隐私、引用、作者选择与发布边界，需要模型/人实际遵守与审核。

## 证据分层
1. 现有 CLI 兼容性基线：独立复制冻结 0.5 CLI，不写原树；测试自构 schema。运行 `python test_optional_cli.py run-complete`，退出 0。45 条真实 CLI 命令，64 项机器断言符合预期。包括预期拒绝，非全部命令退出 0。
2. 实际 0.6 交付 schema：`test_delivered_schemas.py` 对交付的 7 份 schema 实跑 41 条命令、64 项断言符合预期，退出 0；`test_delivered_lifecycle.py` 使用交付的两套 4 节点 blog schema 和对应 policy，另跑 45 条命令、64 项断言符合预期，退出 0。交付示例不强制 retro。schema 源文件哈希保留在 run-delivered/source-hashes.json；技能及schema/policy全部输入另见 delivered-input-hashes.json。
3. 技能静态检查：已读五个新增 SKILL，确认独立/可选、替代路线、保留作者编辑、禁止编造、review 不自签、研究/文章不冒充 specs；仅为文本检查。
4. 单次模型模拟：另有真实生成的短博客与多轮测试 transcript，全部作者输入明确标记 SYNTHETIC。不是用户经历、实际批准、盲测、基准或规模可靠性证据。已完成：95 条逐轮事件，shape 两轮成稿、beats 独立单节拍分支，保留素材/文章作者编辑；冲突事实和无来源数字未进入成稿；retro 证伪重复规则候选，零新增规则/补丁。14/14 仅为记录完整性机械核对，不是14个行为实验。仍观察到首次维护者可能不理解 ffValidity/done 字段的可读性不足，未声称写作质量全通过。详见 model-simulation/REPORT.md。

## 基线覆盖与真实退出码
- 五方法分别 `new change --schema single` / `instructions METHOD --json` / `status`：全部退出 0；每个方法无前置 artifact。
- 两条路线：research → fragments → shape 或 beats → draft → retro。此处 retro 是测试依赖传播节点，不代表实际写作必经；实际交付示例不强制 retro。
- `new` 只创建 change 骨架；`instructions` 返回模板/指导，不写目标 Markdown。实际文档由测试脚本写入后才被 status 识别。
- 合成当前回执：status 与 strict validate 退出 0。
- research 中途改变：五节点全部 stale；status 退出 0 且只读；archive 加 `--no-validate --skip-specs` 仍退出 1，活动 change 保留。
- 审核 targetVersion 过期：strict validate 退出 1。
- 缺失 review 或 verdict=reject：正常 archive 退出 1，项目字节不变。
- schema 描述变更：strict validate 退出 1，说明 schema 契约绑定有效。
- skip_specs 与实际 delta 并存：archive 退出 1。
- 正常 docs-only archive：退出 0，change 移到历史，canonical specs 字节不变；没有把研究或文章复制为现行规范。
- canceled / rejected：各路线均退出 0；保留原文及 stale 回执字节，canonical specs 不变，未制造 pass。
- 故意错误的文章配匹配合成回执：strict validate 退出 0；记录为“不执行事实验真”的已知边界。

原始命令、stdout、stderr、实际 cwd、退出码见 `run-complete/commands.json`；断言及诊断见 `run-complete/checks.json`。复现需一个不存在的新输出目录；脚本拒绝覆盖已有结果。

## 不声称已测
没有生产项目验收、真正作者审阅批准、外部发布、merge/deploy、Windows/宿主原生运行、多轮盲测或复杂度/覆盖率测量。没有把 fixture:// 决议引用或 SYNTHETIC HARNESS 的 review 当认证。未测所有上游命令，不追求空泛“全绿”。

## 实际交付版本与测试修正
`cli-identity.json` 比较交付与实测的 launcher、build verifier、snapshot、patch、upstream pin 和上游源码压缩包，共 6 项 SHA256 一致。方法包为 0.6.0-experimental.1；运行引擎仍为 1.14.2-ff.0.5.0-rc3，不虚称重写或新版本 CLI。

实际交付生命周期初跑有 2 项断言失败（62/64）：测试从基线改用交付 schema 后仍替换基线的 description 字符串，实际没有改变文件，故不能期待失效。检查源码确认测试缺陷，将替换目标改为交付中的描述文本后，重新完整运行得到 64/64。保留原始 `run-delivered-lifecycle/` 与修正后的 `run-delivered-lifecycle-final/` 记录，不删除失败制造通过；未为此改产品代码。

实际 schema 验证覆盖 5 个单方法独立入口和 2 个 blog 组合；单方法不强制 research/fragments，组合是显式选择的示例依赖，不是技能全局必经步骤。声明路径中的 CHANGE_NAME 由 fixture 明确替换为 blog；不按文件名猜职责。

## 便携复现
从任意项目/目录使用完整 launcher 路径；环境变量 FF_CLI 可指定已构建的项目本地 launcher。运行 test_optional_cli.py 时传新的输出目录。运行 test_delivered_schemas.py 时依次传交付 schemas 目录和新输出目录。运行 test_delivered_lifecycle.py 时另设置 FF_SCHEMAS 为交付 schemas 目录，传新输出目录。后两者使用相邻 policies 目录。schema 烟测依赖 PyYAML；其它脚本仅 Python 标准库和已构建的 Node CLI。

导出的日志只规范化实验目录绝对路径，命令参数、stdout、stderr、退出码和断言未改。原始绝对路径证据与完整 fixture 保留在测试工作区；导出不含依赖缓存或构建目录。测试脚本会真实新建本地夹具与执行正常/取消/拒绝归档，仅用于合成测试项目。
