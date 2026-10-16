# 导出与原始证据边界

本目录是公开可读副本，实验工作区绝对路径替换为 <fixture>、<package> 等。没有改变退出码、断言结果或结论。原始完整记录仍保留在测试工作区。

model-simulation 中的 verification.json（14/14）来自原始完整输入及原始 transcript 的真实执行。为避免重复，本导出未附 inputs/commands.json 与 inputs/checks.json 大日志；相关命令原记录可在 evidence-extract.json 阅读。为移除内部绝对路径，部分导出文字字节与原始记录不同，因此 input-manifest.json 和 transcript 的哈希字段表示原始审计值，不保证规范化导出字节相同。verify_simulation.py 保留的是原始核对代码，不能在这份精简规范化导出上直接复现其全部哈希检查；这不是一份自包含的可执行重放包。

本目录 EXPORT-MANIFEST.json 则绑定实际导出字节，供检查传输完整性。三份 CLI 测试脚本独立可执行，按 INDEPENDENT-REPORT.md 参数新建本地合成项目复现，不依赖被省略的模型输入大日志。
