# 资源生命周期与轻量接入候选

## 目标、基线与边界

2026-11-11 云端 Linux 工作。已确认范围：受控测试资源、四层审查加载及 DSH 锚点、轻量任务和已有项目 intake/review 验证。main 为 `8c930ae5c6f2985a7915f547adaebe81b5ca9bc2`；未合并 PR #7 头为 `15dfe8ec681d7772069295eb03257d45050baa6a`。本候选以 PR #7 为基础，不将未合并功能当主线已有能力。复用既有 Git 对象，建立一个工作树；原工作区暂存改动保持原样。无主分支合并、部署、额外付费、用户旧文件清理或持久权限扩展。

## 全局影响与最小选择

- 产品/流程：保持轻量短路径，不追加完整 PRD/多阶段清单；仅验证原约定可达性。
- 职责/依赖：测试 fixture 生命周期由小型本地 helper 负责，生产安装事务不新建第二套状态机。
- 数据/状态：保留已有 state、journal、backup 权威；不按年龄自动删备份，不清理历史证据。
- 权限/可靠性：清理只接受本次独占目录凭证，默认预览，身份变化与失败保留，禁止任意路径删除。
- 工程/排障：明确测试根与成功/失败收尾；安装载荷、模拟宿主、真实模型会话分开计证。
- 版本/运营：候选包与文档一致；Linux 检查不能替代原生 Windows 中文空格路径与真实 DSH 会话验证。

候选比较：沿用原事务和备份保护；局部调整重复 fixture 创建与删除；合并分散测试清理语义；仅新增缺失的受控 fixture 帮助函数及回归。不引入资源管理服务、自动磁盘扫描、后台清理、全局审查注入或新 Runtime。

## 验证记录

候选 `0.9.14-dsh.1`，Node 24.22.1、Python 3.12.14、Linux。原始运行日志存于源码外本轮验证目录，不将临时测试树打进 payload。

- PASS：installer 全套 107/107（含资源生命周期 9 项、四层分发合同），0 skip。显式成功收尾返回 REMOVED，随后确认只剩日志，未清理旧验证根或用户文件。
- PASS：DSH 插件、review runner、RSI、adopt/status 共 102 项，100 pass、2 skip（缺少完整 build 的用例）；不是全运行时通过。
- PASS：workflow Python 73 项，71 pass、2 skip；轻量/接入 Node 3/3。既有规则足够，本轮没有增加 intake/review 必需阶段或项目文档。
- PASS：静态包验证、14 项 sealed mutation 检查、guide 静态检查及 git diff --check。Git 工作树指针文件不进入清单；打包文本与 Git 过滤后字节一致。
- PASS（限安装）：使用候选源码与冻结 manifest 实际安装 Codex skills-only，返回 INSTALLED_SKILLS_ONLY_GATES_BLOCKED，版本 0.9.14-dsh.1，`.agents/skills/ff-review/SKILL.md` 实含 L1-L4；不证明原生模型读取。
- BLOCKED：真实 Codex CLI 在模型会话前因 sandbox socket 目录检查失败；未修改安全设置。NOT_RUN：真实 DSH 会话、原生 Windows、full build 与真实 gate/回执。不能从合成/模拟检查继承这些结论。
- NOT_MEASURED：同版函数 CRAP/完整覆盖率与真实 token/费用；不以用例数冒充质量指标。

详细边界见 [加载证据](review-loading.md)、[轻量接入](intake-review.md)、[独立复核](independent-review.md)及[资源规则](../../docs/maintainers/TEST-RESOURCES.md)。

## 自动审批拒绝补充

用户补充：“codex经常出现删除被自动审批以 `blocked by policy` 拒绝”。本轮模拟 EPERM、EACCES、策略拒绝、部分删除后拒绝与操作完成但响应丢失，分别输出 CLEANUP_BLOCKED / CLEANUP_INCOMPLETE / CLEANUP_UNKNOWN，保留残留位置/原因/安全下一步；首次异常锁定本句柄，不换命令或隐式重试。REMOVED 仅在确认本次目录消失后返回。

模拟 fs 异常不是实际审批器集成测试。若审批器在 exec 启动前拒绝，helper 没有执行、更没有回执；调用方须报告工具拒绝，结果不明确先只读核查，不能声称已删除或用替代路径绕过。

## 收口与剩余事项

保留原 installer state/journal/rollback 所有权，不新增备份清理器或后台服务。测试目录边界只覆盖本轮统一的 installer suites 与新增 intake 测试；其他入口单独核对，不宣称全仓测试资源已治理。删除接口仅适用于停止写入的可信独占夹具，不能防御恶意并发 TOCTOU。未删除历史 Windows 残留或用户文件，历史问题不能推定当前机器受影响。

后续真实宿主/Windows 验证须在具备能力的环境内完成；此候选不以这些未测项签发完整宿主验收，不自动合并或发布。
