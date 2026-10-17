# 本次真实事件：Health 的 Windows 证据边界

对象是 FF 自身。用户要求在 README 完成后推进最小 0.9.x 可用性修复，并允许隔离候选、固定旧版对照、独立复核和一个可复用资产；晋级仍待用户确认。本记录不是批准本身。

基线是 `b829773f9a99f0039940c561e0c559aeb37ea1a4`；先冻结的计划见 [PLAN.md](PLAN.md)，未因结果改写。Health 源码基线 SHA-256 为 `1e6f54831a55c79617ea36d97c21e182b2924fc169af373c1a4e1c794b1cb52d`，候选为 `90b4cb0b08f58f2a9815189ccf6f2a131bf4563f94a3a504044121b124ce3239`。

真实偏差有两类：文件 symlink 夹具在调用产品前因 WinError 1314 失败；旧 Health 另会接受 Windows rooted、ADS 和真实 junction 证据路径，并在旧默认编码下读 UTF-8 记录失败。前者是环境能力，后者是 FF 实现缺口。不能把跳过夹具说成修好产品。既有 Resume 已有所需路径检查，因此候选 H1 复用同包 helper，不增加第二套检查器。

只选择 H1：Health 显式读取 UTF-8，证据路径沿用 Resume 的项目相对路径契约，缺 helper 明确 INVALID；测试拆开始终可测的越界和依赖 OS 能力的 symlink，并实测真实 junction。未改变业务验收目标、权限或独立留出。回退方式是弃用本隔离候选，原工作分支和原安装保留。

实施前固定公开控制脚本、输入、预期、源码和环境摘要：旧版 4/8 符合预期，新版 8/8；独立留出由审查者封存，旧版 3 PASS / 5 FAIL / 1 SKIP，新版 8 PASS / 0 FAIL / 1 SKIP。正常有效记录仍通过，过期/越界/非法 JSON 仍被拒绝。完整原始回执保存在用户电脑 `_handoff/20261017/09x/`，包括 `public-controls.json`、`old-public-results.json`、`candidate-public-results.json`、`independent-h1.md`，不把机器路径当云端资源。

首轮接线错误把字符串传给需要 Path 的 helper，导致测试失败；原始 `health-integration-first.stderr` 保留，修正适配后在相同控制上复跑，未更改输入或预期。symlink 权限跳过不计 PASS。独立复核另发现旧版已有 cp936 stdout 不能编码任意 Unicode 的限制；这里只声称 UTF-8 输入读取修复，使用说明采用 `python -X utf8`。

Codex 的最小原生命令在合法 Git 工作树仍失败，报 `helper_unknown_error: setup refresh had errors`。CLI 自身 exit 0 不能覆盖内部 command_execution failed/-1。该问题不由读取 17 技能脚本才触发，底层根因仍未知，未修改身份、模型、宿主配置、信任或安全检查。完整宿主验收保持受阻。

本次只形成一个 [资产候选](ASSET.md)。结论为**保留隔离候选，等待用户确认晋级**；不是自动递归 RSI 引擎、上线、发布或人类验收。最终同版指标、实际安装和三类独立审核另在 [README.md](README.md) 收口。
