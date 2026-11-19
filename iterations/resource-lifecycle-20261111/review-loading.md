# 四层规则加载与 DSH 锚点验证

本轮目标：让已激活的 FF 技能直接包含四层失效自检，并限制 DSH 锚点的适用范围。当前候选为 `0.9.14-dsh.1`；以下诊断发生在维护者统一版本与最终打包之前，不作为最终候选包验收。

## 发现与最小修复

原 Codex 安装只分发技能正文及按需引用；例如 `ff-review` 短路径可不读取含完整四层规则的 `references/intent-loop.md`。`tools/installer/source.mjs` 现在在每个安装后的 `SKILL.md` 绑定段附自包含 L1–L4 短规则，独立技能更新复用同一绑定。路径为 `.agents/skills/<技能>/SKILL.md`。这是已激活技能内的指导，不是全局 AGENTS 注入，也不保证未激活技能的会话加载。

DSH 原 L3 无条件要求比较两个候选，超出维护契约“重大取舍”的范围。`dsh-plugin/index.js` 已限定重大取舍，允许有理由的 N/A，普通小任务不强造比较；目标已确认且无实质变化不重复确认。必要安全、授权与数据完整性不因缺少失败样本而省略。注册注释与 README 不再把注册成功表述为真实会话已加载。

## 分层证据

| 证据层 | 实际操作与结果 | 能证明/不能证明 |
| --- | --- | --- |
| 静态分发合同 | `node --test tools/installer/tests/four-layer-loading.test.mjs dsh-plugin/tests/plugin.test.mjs`，共 18 PASS、0 FAIL | 各宿主各技能载荷含四层正文及范围限定；不能证明模型读取或遵守 |
| 模拟 DSH 宿主 | 上述插件测试调用假的 `systemPrompt.section`，校验正文、禁用与缺服务分支 | 只证明注册调用，不是实际 DSH 会话 |
| 安装路径诊断 | 当前修改后的安装器针对基线 `15dfe8e` 干净归档源码执行 Codex skills-only 安装，返回 `INSTALLED_SKILLS_ONLY_GATES_BLOCKED`；实际 `.agents/skills/ff-review/SKILL.md` 含短规则标题和 L1–L4 | 证明安装路径和落盘字节。此为当前安装器与旧冻结源码的诊断组合，不是新候选包验收，也不是 full 运行时验证 |
| 原生 Codex 会话 | CLI `0.167.0-alpha.4`；隔离的测试 `CODEX_HOME`；使用 `exec --skip-git-repo-check --sandbox read-only --ephemeral --color never`，要求只读使用已安装 ff-review 并报告四层及来源路径 | **BLOCKED**，退出码 1，线程创建前失败，没有模型输出或加载证明 |
| 原生 DSH 会话 | 未运行实际 DSH 会话 | **NOT_RUN**，不能声称真实 DSH 已加载 |

Codex 原始错误摘要：

> Failed to create session: failed to load AGENTS.md instructions for environment `local`: fs sandbox helper failed with status exit status: 1: error building bubblewrap command: app-server socket directory must be a user-owned directory with mode 0700

没有尝试修改安全配置、登录或添加付费配置。该错误发生于会话创建阶段，不能据此判断技能正文是否能被真实会话读取。

## 原始证据与后续验收

原始日志保留在源码外本轮验证目录，文件名为 `four-layer-tests.log` 与 `codex-loading-probe.log`；诊断明细为 `FOUR-LAYER-RESULT.md`。这些诊断不继承为 `0.9.14-dsh.1` 最终冻结包证据。

维护者最终统一版本并打包后，应使用最终候选重新执行安装回归及四层分发检查；实际 Codex/DSH 加载仍须独立保存宿主版本、激活入口、实际读取路径与原始响应。静态合同、落盘安装、模拟宿主和真实会话结论分别报告，不以测试数量替代行为证明。
