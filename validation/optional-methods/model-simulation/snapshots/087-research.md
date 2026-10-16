# Research: CLI 能检查什么，不能替你批准什么

这是一次受指示的 SYNTHETIC 作者模拟，非真实作者经历、盲测或独立评审。查证日期：2026-10-15。方法版本：0.6.0-experimental.1。CLI 元信息快照标记 adapter 0.5.0-rc3，upstream v1.14.2；本笔记限定到所附运行日志，不泛化到所有 CLI 或未来版本。

问题与边界：核对 instructions 是否成文、依赖变化怎样显示、哈希有效能否证明真实批准。仅读本地已给资料，不扩展到 PRD、实现或发布。预算为一次限定资料检查；三项能被分类即停止。

## 事实及来源

1. instructions 返回 instruction、template、outputPath，5 个方法对应记录的 existingOutputPaths 均为空。单靠这一字段不足以证明调用后没有写入；补充 checks.json 的 “CLI does not author content” 5 条均为 true，test_optional_cli.py 明确在命令后先断言目标文件不存在，再由测试作者写文件。因此“instructions 自动写出完成稿”与本次执行证据冲突。来源：evidence-extract.json 的 command_records 中 json_pointer 为 /1、/4、/7、/10、/13 的原命令记录，以及 checks 中 json_pointer 为 /2、/6、/10、/14、/18 的原检查记录；inputs/test_optional_cli.py 中 “check(method+' CLI does not author content'...)” 及紧接的 write。该脚本快照还含日志未执行的新用例，不能把整份脚本视为均已执行。
2. 上游 research 修改后，两个路线各 5 个 artifact 的 ffValidity.artifacts[].state 均为 stale；外层 artifacts[].status 仍可为 done，所以检查有效性需看 ffValidity 及 reasons。来源：evidence-extract.json 的 command_records 中 json_pointer=/19 “writing-shape source change status” 和 /31 “writing-beats source change status”。这支持本次配置下的传递失效，不能声称任何未配置依赖都自动受保护。
3. 基线 ffValidity 为 true，strict validate exit=0；测试收据由程序构造，reviewer 字段是 SYNTHETIC HARNESS ONLY。真实用户审批或独立内容评审没有发生。来源：evidence-extract.json 的 command_records 中 json_pointer=/17、/18、/29、/30；inputs/test_optional_cli.py 的 receipt()。有效记录在本例说明内容与依赖指纹/审核版本记录的匹配，不建立真人身份与授权来源。
4. ff-research 第 2、4 步本来已要求一手来源和事实/推论/待实测分开，禁止编造指标；writing-shape 第 5 步、writing-beats 第 5 步也禁止制造缺失依据。来源：所附 5 个 SKILL.md 快照。

## 推论及不确定性

- 哈希有效不能充当真实批准；指纹匹配与批准者身份真实性是不同问题。这是结合基线记录、合成收据构造与方法边界得到的结论，不是假称本模型完成身份攻击测试。
- “省了 70%”无来源，不能保留为效果指标；本次没有可以替代它的真实节省数字。
- stale 提示意味着当前材料或依赖与此前审核绑定不再一致，应回到当前版本核对；它不自动说明文字内容错误。

## 待实测 / 未解项

- 本快照 commands.json 共 39 条，不含脚本后来新增的 semantic non-enforcement 执行记录。故不声称已跑过“故意错误文章仍 validate 通过”的用例。
- 未测试真实账号身份认证、外部签名或发布系统；需要针对那些系统另行设计测试，超出本次范围。
- 未获得耗时实验，所以没有节省时间结论。

停止：三项边界已有足够局部证据；不新增研究分支，不替作者决定发布。

导出说明：evidence-extract.json 保存上述原记录全文及原 JSON 数组索引；command_records 原快照名为 commands.json，checks 原快照名为 checks.json。导出可不重复打包两个大原始日志。小型 SKILL.md 与 test_optional_cli.py 快照仍按本文相对路径保留。本次仅更新证据导航，没有改变写作时使用的事实、原始来源或作者素材。
