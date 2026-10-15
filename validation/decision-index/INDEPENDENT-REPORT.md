# Experimental.2 决策索引独立审查

日期：2026-10-15。只读实施树；测试只写独立夹具。没有修改 0.5、实施树、上传、push、merge、deploy 或外部 tracker。所有 fixture 回执和关闭决议为 SYNTHETIC，不是用户确认。

## 结论

可作为可选 reference/template 交付；不构成自动决策引擎。无阻断级问题。保持 17 个技能、四份自包含同源 reference/template；实际项目只有一个权威记录和至多一个索引。简单任务不强制 map。真实 CLI 支持显式登记 artifact 与依赖的指纹失效；不解析 map 的决定状态、不认证批准身份，也不会因一个未登记的 Markdown 指针自动发现所有依赖。

设计改进已纳入：最初建议显式澄清 canceled/rejected/未答只是模型流程约束，实施者随后补上 CLI 不解析这些语义、也不认证真实批准的文字。最终未发现 P0/P1/P2 阻断缺陷。P3 使用限制：只合成小场景，无宿主原生安装/真实项目长期恢复/多代理争抢或实际权限工具拒绝测试；不可宣传全面可靠性。

## 实际机器测试

1. `optional-regression/commands.json`：原五可选方法及 shape/beats 两路线，45 条 CLI 命令、64/64 断言通过。直接使用 experimental.1 交付 schema，`input-comparison.json` 证实其 optional-methods 全部文件与 experimental.2 字节相同。覆盖独立 instructions、文档状态、依赖 stale、版本绑定、负面/缺 review、schema 变化、跳过规格冲突、正常/取消/拒绝归档及不提升文章为现行规格。
2. `index-cli-corrected/commands.json`：14 条真实 CLI 命令、14/14 断言通过（包含预期拒绝）；`checks.json` 含具体输出。
   - 自建 schema/policy 为 decision-a → delivery-a、decision-b → delivery-b 两独立分支。改变 A 后只有 A 与其 delivery stale，B 两节点仍 valid。
   - 未登记 decision-index.md 的新增、改为 canceled/假称 resolved，不影响有效性：确认索引语义不被解析。
   - 删除 decision-a review、使用 rejected 或 canceled 作为 review verdict，strict validate 均拒绝。这是 receipt 格式/有效性检查，不是用户选择认证。
   - 未答 prose 配匹配合成 pass，strict validate 仍退出 0。明确为能力边界，绝不称“未答可执行”。恢复者必须核实真实来源并保持 blocked。
   - stale 不可通过 --no-validate/--skip-specs 绕过正常归档。
   - 显式 canceled/rejected 关闭退出 0，不生成 canonical spec 内容。关闭动作并不提供跨 change 依赖满足证明；CLI 未提供读取 map blocker 的自动解锁。
3. `legacy-readonly.log`：旧 Python 已退役写入口回归 4/4，只读验证和拒绝写入。不等同原生 CLI 覆盖。
4. `tested-cli-identity.json`：实际运行既有已构建 CLI 与 experimental.2 的 launcher、build verifier、snapshot、patch、upstream pin/archive 共 6 项 SHA256 一致。运行引擎未变；本轮没有重新联网构建。`input-comparison.json` 证明 experimental.1 → .2 同样 6 项一致、技能数 17、4 份 reference 哈希一致。

### 保留测试修正历史
初跑 `index-cli/` 12/14：两个失败来自测试误把“归档不生成规范内容”写成“specs 目录不存在”。new change 已创建空 specs 目录。核实目录为空后，只修测试为空检查并完整重跑，得到 14/14；产品未修改。原始日志和失败断言保留。命令退出 0/1 的原始结果均保留，不把预期拒绝改写成执行成功。

## 独立模型情景

另一个 fresh 上下文执行者只读 reference/template，对 8 个明确标注 SYNTHETIC 的小情景真实生成一次响应。详见 `model-simulation.md`。该报告是单轮模型模拟，不是运行 CLI、实际安装、盲测、多轮模型成功率、工具层授权防护或真实用户批准。没有因模型声称“不会联网”就宣称已验证所有执行路径不存在网络行为。

## 可交付边界

可交付可选索引方法与模板，以及上述测试证据。最终发布包完整性、中文文档排版和产物导出由实施者/主审查流程另行核对。测试产物保留在本独立目录；如封包应只导出脚本、报告、命令/断言/输入哈希，避免夹带运行缓存、合成完整项目或绝对宿主敏感信息。无真实项目接受、发布、合并或部署结论。
