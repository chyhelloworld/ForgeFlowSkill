# 0.9.1 工作分支候选：Health 与用户发起的 FF 改进

状态：**用户已批准将候选 `71d04646088d0c1a206dffb2095ea814f976c765` 纳入并上传 `work/061-through-09`**。原候选提交完整保留，基线仍为 `b829773f9a99f0039940c561e0c559aeb37ea1a4`；批准范围与证据适用性见 [纳入回执](PROMOTION.md)。没有 main 合并、发布或其他项目现用安装升级。冻结 PLAN、RETRO、ASSET 及独立报告中的“待确认”是批准前历史状态，保留原件，不追改为事前已授权。

先读 [冻结计划](PLAN.md)、[真实复盘](RETRO.md) 和唯一的 [资产候选](ASSET.md)。源码修复限于 Health 的证据路径、UTF-8 输入和缺依赖失败；行为指引沿用现有 ff-retro/ff-intake，区分项目复盘与 FF 自身改进，只读检索项目声明的相关资产，不建立第二套状态库。

```mermaid
flowchart LR
  A[用户指定真实事件] --> B[核对已有机制与根因]
  B --> C[零候选或一个最小候选]
  C --> D[隔离并冻结旧版与控制]
  D --> E[真实失败与正常样本复验]
  E --> F[独立三类审核]
  F --> G[候选交付 等待用户确认晋级]
```

## 已取得的证据

- Health 原生测试 15 项：14 PASS、1 因 WinError 1314 的文件 symlink 夹具 SKIP；真实 NTFS junction 执行并被拒绝。全工作流 48 项：47 PASS、同一项 SKIP。
- 实施前固定公开 8 用例：旧 4 符合/4 不符合，候选 8/8。独立留出保持封存：旧 3 PASS/5 FAIL/1 SKIP，候选 8 PASS/0 FAIL/1 SKIP。输入、预期与权限不因候选结果改变。
- 10 个 Health 生产函数按同一源码的 Radon 6.0.1 与 coverage.py 7.6.1 原生函数行/分支计量，CRAP 最大 16.942，全部 ≤50；目标约 10 尚未全部达到。`load_helpers` 为 1、`evidence_problem` 为 9.493。测试/评估脚本、文档提示词及未变化的全仓库代码不据此声称全部计量。
- 新上下文的 ff-retro/ff-intake 实际行为、包验证和全新 Windows 项目安装回执由本机交接目录 `_handoff/20261017/09x/` 单独记录；需核对各回执对应源码/包哈希，不能把本页的流程要求当实际通过。

首轮 Health 接线类型错误、外层沙箱拒绝 junction 夹具、Windows 覆盖率路径键不匹配均保留原始失败日志；后两项分别通过工具批准的原生重跑和修正外部计量调用的 Windows 路径键解决，没有修改产品成功标准。原公开固定材料和独立留出未改。完整同版函数数据见 [health-function-metrics.json](health-function-metrics.json)。

## 使用与边界

完整 17 技能安装包含 Health 的共享 Resume helper；单独复制 health.py 不再是完整安装，缺依赖明确 INVALID。用 `python -X utf8 .agents/skills/ff-review/scripts/health.py review.json --root .`。UTF-8 输入读取已修复；默认 cp936 stdout 的任意 Unicode 输出仍有限制，不能宣称全编码覆盖。工具只核对记录，不认证作者、来源真实性、竞态安全或业务正确性。

用户可请求“用 ff-retro 复盘 FF 本次实际执行，隔离一个候选并保留旧版对照；不要晋级”。改进指引不授予实现或合并权限，具体步骤仍由执行者完成。资产有条件和淘汰规则，缺源或证据过期必须标 unknown/stale，candidate 不变为现行规范。

Codex setup refresh 在合法 Git 工作树中的唯一 Get-Location 仍失败；内部 command_execution failed/-1，即使 CLI 本身 exit 0 也不算通过。底层根因未证实，未更改模型、身份、安全设置或信任配置。FF 完整宿主调用、Claude Code、全平台、CI 和人类验收均未因此取得成功证据。

0.9 的手册截图与轨迹保留为原冻结版本的历史证据；本候选更新了手册 HTML，因此旧旅程记录对本候选应判 stale，不能沿用为当前 UI 验收。此版没有界面实现改动或新的视觉验收声明。
