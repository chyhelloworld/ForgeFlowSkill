# 可配置的外部独立审查

ff-review 的独立审查默认由独立子代理或真正新上下文执行。若项目安装了完整版 FF（full 模式），还可以把这一步交给本机已登录的 **Codex CLI** 或 **Claude Code**，并显式选择模型与思考强度。

这是**可选的审查后端**，不是新的门禁：它只负责按配置调用外部审查者、保存原始回答和调用元数据；是否接受审查结论、是否合并或发布仍由用户和 ff-review 流程决定。

## 前提

1. 已用 full 模式安装 FF，项目根存在 `.forgeflow/ff-reviewer.mjs`。
2. 已安装并登录至少一个受支持 CLI：
   - Codex：`codex` 可执行且在 `~/.codex` 有有效登录；
   - Claude Code：`claude` 可执行并已 `/login`，或设置 `ANTHROPIC_API_KEY`。
3. 项目根有 `openspec/` 目录（配置放在 `openspec/ff-review.json`）。

## 配置

首次创建配置（默认 backend=codex、reasoning=high）：

```powershell
node .forgeflow/ff-reviewer.mjs init --backend codex --model gpt-6.1-sol --reasoning high
```

生成的 `openspec/ff-review.json`：

```json
{
  "version": 1,
  "enabled": true,
  "backend": "codex",
  "model": "gpt-6.1-sol",
  "reasoning": "high",
  "timeoutSeconds": 900
}
```

字段：

| 字段 | 含义 |
| --- | --- |
| `backend` | `codex` 或 `claude` |
| `model` | 该 CLI 接受的模型名；省略时用 CLI 自身默认 |
| `reasoning` | codex：minimal/low/medium/high/xhigh；claude：low/medium/high/xhigh/max |
| `enabled` | false 时不调用后端（ff-review 回到原独立子代理流程） |
| `timeoutSeconds` | 1..3600，默认 900 |
| `command` | 可选，覆盖 CLI 可执行文件路径 |

也可用环境变量或命令行临时覆盖：`FF_REVIEW_BACKEND`、`FF_REVIEW_MODEL`、`FF_REVIEW_REASONING`、`FF_REVIEW_TIMEOUT_SECONDS`、`FF_REVIEW_COMMAND`；`run` 还接受同名 `--backend/--model/--reasoning/--timeout-seconds/--command` 参数，命令行优先于环境变量，环境变量优先于配置。

临时切换 `backend` 时，如果没有同时显式给出 `command`、`model` 或 `reasoning`，runner 会丢弃配置里属于另一后端的命令、模型名和强度档位，改用新后端的默认值；避免把 codex 的命令或 gpt 模型名带到 claude 调用上。需要跨后端固定值时必须显式覆盖。

## 检查

```powershell
node .forgeflow/ff-reviewer.mjs check --json
```

输出会说明配置是否可读、后端可执行文件能否找到、版本，以及认证提示。`check` 成功只表示调用链前提成立，不代表审查已经发生，也不代表后端一定已登录。

## 执行一次审查

先把原始目标、范围、实际差异、真实运行证据和未验证项写成审查材料（建议放在 `openspec/reviews/<name>-brief.md`），再运行：

```powershell
node .forgeflow/ff-reviewer.mjs run --brief openspec/reviews/<name>-brief.md --out openspec/reviews/<name>
```

输出：

- `<name>.json`：审查记录（backend/model/reasoning、`independence: "L2"`、brief 与配置的 sha256、命令、退出码、时长、verdict/findings、原始回答 hash、stdout/stderr 日志、usage/cost（后端提供时）、错误与未验证项）；
- `<name>.md`：审查者原始回答；
- 有输出时还有 `<name>.stdout.txt` 与 `<name>.stderr.txt`。

后端失败、超时或回答不是合法审查 JSON 时返回非零，但仍保留原始记录，便于判断原因。runner **不会**自动 fallback 到同模型自审，也不会自动把结论签成通过。

## 只读与独立性边界

- Codex 使用 `--sandbox read-only`；Claude Code 使用 `--permission-mode plan --permission-prompts none --bare --strict-mcp-config`。这依赖后端自身参数，ff-reviewer 不验证后端是否真的没有写文件。
- `independence: "L2"` 是“配置声明的异模型后端”，不是密码学证明；模型名、账号和实际后端由 CLI 决定。
- 审查者只看到 brief 和它自己按只读权限读取的项目文件；brief 必须包含做出结论所需的原文或精确指针。
- 外部审查者可能因本机 MCP/沙箱环境无法读取文件；这种情况下 brief 内嵌的原文仍可用于审查，但“文件读取成功”必须标为未证明。
- 审查结论不等于用户接受、合并或发布授权；ff-review 仍要单独判断目标、计划和实现三类结论。
- 同一份审查材料可交给同一后端做修复后复核；应重新生成 brief、附上上一份记录与未关闭的发现编号，不把“后端相同”当作可以省略复核。

## 与 ff-review 的接线

项目存在 `openspec/ff-review.json` 且该文件 `enabled` 不为 false 时，ff-review 的独立审查应优先使用本 runner；没有配置、配置为 disabled 或后端不可用时，才回到原“独立子代理/新上下文”流程。后端失败时报告 `NOT_RUN` 或待验证，不得改写成自审通过。
