# 可配置外部独立审查（0.9.13）

## 目标与范围

用户要求：在 DSH 内的 ForgeFlow 中，独立审查可以配置使用 Codex 或 Claude，并可指定具体模型与思考强度。

实现边界：把“调用哪个外部审查者、用哪个模型、什么强度”做成项目级配置 + 宿主无关 runner；不改变 ff-review 的三类判断与用户授权，不把外部审查结论自动当成通过。没有新增 DSH 插件协议或门禁，避免为未证实需求增加机制。

## 交付物

| 文件 | 作用 |
| --- | --- |
| `source/tools/review/ff-reviewer.mjs` | 新 runner：`init/check/run/version`；读配置、调用后端、保存记录与原始回答 |
| `source/tools/review/ff-reviewer.test.mjs` | runner 单测 12 例 |
| `source/docs/user/review-backends.md` | 配置字段、覆盖优先级、执行与边界 |
| `source/skills/ff-review/SKILL.md:25` | 有配置时优先用 runner；失败标 NOT_RUN/待验证，不降级自审 |
| `source/skills/ff-review/references/reviews.md` | 新增“外部审查后端（可选）”节 |
| `source/tools/installer/state.mjs` | 新增 `reviewFile='.forgeflow/ff-reviewer.mjs'`，`owned()` 放行 |
| `source/tools/installer/install.mjs` | `bindings()` 安装 runner；gitGuidance 加该生成文件 |
| `source/tools/installer/tests/dsh-host.test.mjs` | 新增“安装 ff-reviewer 且移除宿主后保留”用例 |
| `source/tools/installer/tests/windows.test.mjs` | smallSource fixture 补 `tools/review/ff-reviewer.mjs` |

## 配置与调用

项目配置 `openspec/ff-review.json`：

```json
{
  "version": 1,
  "enabled": true,
  "backend": "codex",
  "model": "gpt-6.1-sol",
  "reasoning": "low",
  "timeoutSeconds": 900
}
```

- backend：`codex` 或 `claude`；model 省略时用 CLI 默认；reasoning 档位按后端校验（codex：minimal/low/medium/high/xhigh；claude：low/medium/high/xhigh/max）。
- 覆盖优先级：CLI 参数 > `FF_REVIEW_*` 环境变量 > 配置文件。
- 切换 backend 时，若没有显式覆盖 command/model/reasoning，runner 丢弃另一后端的值并使用新后端默认；避免把 codex 命令或 gpt 模型名带到 claude 调用。
- 调用形态：Codex 用 `codex exec --sandbox read-only --ephemeral -m <model> -c model_reasoning_effort=<level> -o <last> -`；Claude 用 `claude -p --output-format json --permission-mode plan --permission-prompts none --no-session-persistence --bare --strict-mcp-config [--model] [--effort]`。

## 验证

### 自动化测试

- `node --test tools/review/ff-reviewer.test.mjs`：**12 tests / 12 pass / 0 fail**。覆盖配置校验、覆盖优先级、backend 覆盖时丢弃旧后端的 command/model/reasoning、init/check、参数构造、prompt、JSON 解析、进程执行、fake codex 端到端记录与拒绝覆盖。
- 定向安装器 `dsh-host.test.mjs + windows.test.mjs`（`FF_TEST_ROOT=_verify_tmp/ff-test-root-reviewer`）：**26 tests / 25 pass / 1 skip / 0 fail**；skip 为无 Developer Mode 的相对 symlink 用例。新增用例确认安装后的 runner 与源码字节一致、`version` 可执行、移除宿主后仍保留。
- `python -X utf8 tools/workflow/test_intent_contract.py`：4 tests OK。
- `python -X utf8 tools/validate_package.py .`：passed=true，errors=[]；skills=21、local_links=161、source_hashes=25、scenarios=46；最终封包 manifest_files=1547（`validate-final2.log`）。

### 后端检查

- Codex：`check --json` => `available:true`、`commandVersion:"codex-cli 0.162.1"`、`authHint:"~/.codex/auth.json 存在；token 有效性未验证"`。
- Claude Code：修复覆盖 bug 后 `FF_REVIEW_BACKEND=claude check --json` => `backend:"claude"`、`command:"claude"`、`commandVersion:"2.1.316 (Claude Code)"`、model/reasoning 为 default；authHint 仅说明 credentials 文件存在，不保证登录有效。

### 真实 Codex 冒烟

fixture `_verify_tmp/ff-reviewer-smoke-20261103`，配置 backend=codex、model=gpt-6.1-sol、reasoning=low、timeout=180：

```
node source/tools/review/ff-reviewer.mjs run --project <fixture> --brief openspec/brief.md --out openspec/reviews/codex-smoke-0913 --force
```

结果：exit 0；duration 29,286ms；verdict=needs-evidence；findings=1（blocker：审查材料原文件读取失败，无法核对完整内容）。记录 `openspec/reviews/codex-smoke-0913.json`，原始回答 `.md`，stderr 日志显示 Codex 的 `exec_command` 失败（`helper_unknown_error: setup refresh had errors`）与 MCP transport 连接失败。prompt 内已内嵌 brief 原文，所以审查仍完成；但“Codex 能读取项目文件”在本机**未证明**，不是 runner 的结论。

### Claude 未登录路径

`FF_REVIEW_BACKEND=claude run ... --timeout-seconds 60` => exit 3，duration 1,790ms；原始输出 `Not logged in · Please run /login`；记录 `claude-smoke.json` 保留 raw、exitCode=1、error=“审查后端退出码 1”、unverified 列表。runner 没有自动 fallback 到同模型自审，符合设计。

### 发现并修复的覆盖 bug

修复前：`FF_REVIEW_BACKEND=claude check` 报 backend=claude 但 command=codex、commandVersion=codex-cli，且沿用 codex 的 model/reasoning。原因：`applyOverrides()` 只覆盖 backend，command/model/reasoning 仍取 config。修复：backend 变化时，未被显式覆盖的 command/model/reasoning 回落到新后端默认；新增测试“backend override drops stale backend-specific command, model and reasoning”。修复后 claude check 命令为 `claude`、model/reasoning 为 default。

## 边界与未证明

- 外部审查者是否真的只读，依赖后端参数；runner 不检查文件是否被修改。
- `independence:"L2"` 是配置声明的异模型后端，不验证模型身份、账号或厂商；也不证明审查质量高于同模型。
- Claude 本机未登录，因此只验证了“可发现、可调用、失败被记录”，没有成功审查样本；如果要用 Claude，需要先 `/login` 或配置 `ANTHROPIC_API_KEY`。
- Codex 冒烟受本机 Codex 执行环境限制，未能读取文件；brief 内嵌原文可用，但文件读取能力未证明。
- 没有真实 token/费用计量（记录中的 usage/cost 由后端提供，可能为 0 或缺失）。
- 全量安装器、最终封包、安装与 doctor 见 `regression-20261102.md` 的 0.9.13 节。

## 证据位置

- runner 记录：临时 fixture `_verify_tmp/ff-reviewer-smoke-20261103`（验证后按约定清理；关键字段与原始输出摘要已写入本文件“真实 Codex 冒烟”和“Claude 未登录路径”节）
- 测试命令与输出：`_verification/review-backends-20261103/`（最终回归日志目录）
