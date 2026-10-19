# 原生宿主限定验证与未测边界

2026-10-19。本报告补记安装器开发后的宿主试验；原失败仍保留。它不代表全部技能、真实业务或人类验收通过。

## 冻结对象与结果

模型试验使用提交 `18e82a53c0f4e40fb23344a5c4440bf298f8a99a` 的精确包 `0.9.3-dual-host.1`，manifest `0af43034864435c261ac85b06072246bc15507eaeb466dfb41c9c1b8116dae33`、payload `a4e6db41fbdf29270f44bb7780ad789b54e7fe33775bd029fc10668316fa4d90`。项目为自有人工空白样本，两端各 17 项技能，无业务数据或历史聊天输入。

| 观察 | 结论 | 不能推出 |
| --- | --- | --- |
| Codex 原生目录启用项目内 17 个 FF 技能，旧全局技能禁用 | 该配置下发现成功 | 不能代替模型读取或实际工作流成功 |
| Codex 读取 ff-intake 的原命令被宿主策略拒绝 | 原生使用 BLOCKED，未重试该路线 | 不是已证明的安装器故障、额度耗尽或测试通过 |
| Claude restricted 初轮 Skill(ff-intake) 返回 Unknown skill | 保留加载失败；手动 Read 不算 Skill 通过 | 不能据此认定安装目录错误 |
| Claude project-only 对照实际 Skill 返回 Launching skill: ff-intake | 限定原生 ff-intake 流程 PASS | 不推广为其他技能、全平台或完整开发旅程验收 |

## Claude 实际成功证据

宿主 Claude Code `2.1.303`，现有 Claude Pro / firstParty，默认模型 `claude-opus-5-5`；无新登录、账户/模型切换或额外付费启用。一次用户任务中实际调用一次 `Skill`，参数 `{"skill":"ff-intake"}`，对应原生工具结果为 `Launching skill: ff-intake`，无错误。随后四次原生 Read 完整读取 SKILL、state-contract、spec-lifecycle 及人工 README，完整行内容与冻结文件一致；脱敏哈希与观察见 [机器摘要](native-host-evidence.json)。

零模型回合预检确认唯一非平台内置命令为项目级 ff-intake。正式调用只启用 project 来源和 Read/Skill；关闭用户来源、记忆、钩子、MCP、Chrome 和其他项目技能，不改全局设置。移除 restricted 后，用原生 ask 规则和 host 权限回调逐次检查 Read/Skill，只一次性允许四个精确文件和 ff-intake，不返回 updatedPermissions。五次实际权限请求全部符合范围，无持久规则更新。

原生任务 `subtype=success`、`is_error=false`、`permission_denials=[]`。模型将尚未批准的笔记工具假说交给 ff-grill，未把 intake 当作实施授权或项目完成；doctor/spec gates 均 NOT_RUN。配额 allowed、isUsingOverage=false。控制器收到 success 后主动终止仍等输入的 stdio 宿主，清理退出码为 1；清理退出码和原生任务结果分别记录，没有重试来取得退出码 0。

267 个项目文件清单/大小/mtime 未变，四个读取文件另核 SHA256。原 Unknown skill 记录未改；相同 FF 内容无需修改即可原生成功，支持原失败是测试发现配置造成假阴性的判断。同时调整了发现来源与权限处理，不能声称严格单变量因果实验。

## Codex 原拒绝与驱动缺口

宿主 `codex-cli 0.163.0-alpha.10.2`，现有 ChatGPT 登录。原命令 `Get-Content -LiteralPath '.agents/skills/ff-intake/SKILL.md' -Raw -Encoding UTF8` 在 CreateProcess 阶段被拒，唯一明确理由 `blocked by policy`。未成功读取，具体命中规则未知，不能断言由文件范围或安装器造成。

驱动设 approval_policy=never，无法提出后续审批；混用了 default_permissions/sandbox_mode，且关闭插件不等于禁用独立 Apps。子模型在拒绝后曾尝试远程 Desktop Commander，返回设备不可用，未读到文件；这违反当次拒绝即停要求，保留为测试驱动问题。路线随后停止；最终检查不重试、不改权限、不走替代工具。

## 证据与最终文档包

公开摘要只含 FF 路径、包哈希、宿主版本、实际工具结果及边界；不提交原始会话、隐藏推理、用户/组织标识、凭证或私有日志。原始自有回执留在维护工作区 `_verification/093-native-use-20261019`，不随包分发。

本报告等文档进入 manifest/payload 后重新打包。上述模型证据继续绑定原 18e82a53 包，不改签新的文档包。六个生产模块、17 个技能及其依赖不因记录而修改；最终包需独立核对清单/字节、安装入口和受影响回归，精确绑定由最终 PR/工作区回执记录。已有 CRAP 仅在生产模块哈希保持一致时适用。

安装器和独立反例验收见 [迭代回执](README.md)、[独立复核](reviews.md)、[实施计划](../../planning/DUAL-HOST-PLAN.md)。无 CI check runs 不称 CI 通过；Codex 原生使用、其他技能调用、全平台及产品人类验收仍未证明。引用契约自身的旧标题版本不自动等于内容过期。
