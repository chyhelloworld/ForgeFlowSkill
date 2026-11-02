# FF RSI 证据工具（ff-rsi.mjs，0.9.11 新增）

日期：2026-11-02
对象：`source/tools/rsi/ff-rsi.mjs`（安装后为 `node .forgeflow/ff-rsi.mjs`）与安装器接线。
设计调查：`_verification/rsi-design/report.md`（工作区外，260 行，只读）。

## 结论

RSI 五项要求在 FF 已有机制中并非全缺：冻结证据（`ff-receipt.mjs` snapshot/template）、独立审核（record + `.history`）、同案对照判分（`evaluations/README.md`）、版本级撤销（installer rollback）都已有等价物。唯一有实证记录的真实缺口是：**失败样本、正常对照、执行者原始回答、评分结论之间没有哈希绑定**——`evidence/replay-L2-calibration.md` 的六份回答由 Lead 人工复制成匿名 R1–R6，无法证明评分对象没有被替换或重排。

因此本迭代只加一个单文件工具，不新增服务、技能或状态库；它把已有做法变成可执行检查，而不是再建一套流程。

## 冻结的五个动词

| 动词 | 作用 | 关键拒绝条件（退出 2） |
| --- | --- | --- |
| `freeze` | 冻结目标/版本/基线/候选留出集/失败样本/正常对照/用户原话/L2 三字段 | 缺任一必填；基线不存在或在 run 内；`run.json` 已存在 |
| `compare` | 比较旧/新版本对同一批用例的观测 | cases/base 哈希漂移；缺 `candidate/`；候选与基线逐字节相同；缺 old/new 任一观测；两侧 command 不一致；verdict 非法 |
| `promote` | 记录用户确认的晋级 | 无 `review.json`；`independence === 'L0'`；verdict 非 pass；候选或 compare 哈希不符；缺用户原话/引用 |
| `withdraw` | 撤销候选并保留证据 | 写一次 `withdraw.md`，不删除 cases/base/compare |
| `status` | 只读推导状态 | 哈希漂移报 `STALE`；`--list` 只扫给定目录 |

裁决固定为：失败用例旧版不失败 → `NO_EFFECT`；新版未通过 → `REJECTED`；正常对照旧版不通过 → `NO_EFFECT`；新版被误伤 → `REJECTED`；`SKIP`/`NOT_RUN` 不能当 PASS。`REJECTED`/`NO_EFFECT` 退出码 3。

状态链：`EMPTY → FROZEN → ISOLATED → COMPARED/REJECTED/NO_EFFECT → REVIEWED → PROMOTION_RECORDED → PROMOTED`；`STALE` 与 `WITHDRAWN` 会压过后续状态。`PROMOTION_RECORDED` 只表示“用户确认已记录”，即使写入了 `promotion.json` 也不等于已生效；`status --installed <dir>` 且 treeHash 与 candidate 相同才显示 `PROMOTED`。

## L2 三字段为什么是强制的

`freeze` 要求 `--existing`、`--why-insufficient`、`--counterexample` 三者齐全。这是把 INTENT-LOOP 的“新增机制前先查等价机制、失败样本与延后代价”从文本约定变成前置条件：E40 在只加文本时同 prompt 重放 3/3 次仍为 5/6（c2=1），说明文本触发不足以保证逐条对照；而缺少三字段时工具直接拒绝冻结，不依赖执行者记得。

## 边界（明确不做什么）

- 不创建分支、不合并、不发布、不修改正在使用的技能、安装目录、policy 或全局指令；
- 不执行评测；执行者与评分者仍由独立上下文按 `evaluations/README.md` 完成；
- 不代替用户验收；审核通过不等于用户批准；
- 本仓库不是 git 仓库（`git rev-parse` 实测 fatal），所以“隔离候选”只能靠副本目录，不能靠分支/worktree；
- `ff-receipt diagnose` 在本仓库为 `UNCONFIGURED`，没有零成本复用其存储层，故未依赖它。

## 安装器接线

- `tools/installer/state.mjs`：新增 `export const rsiFile = '.forgeflow/ff-rsi.mjs'`，并让 `owned()` 接受该受管文件；**不加入 sharedFiles**，避免破坏 schema 1/2 的旧状态校验。
- `tools/installer/install.mjs`：`bindings()` 从 payload 的 `tools/rsi/ff-rsi.mjs` 复制到项目 `.forgeflow/ff-rsi.mjs`；对 codex/claude/dsh 三种宿主与 full/skills-only 都安装（与 ff-spec 同级的宿主无关工具）。
- 旧安装升级：`sourceHash` 变化触发正常 commit，新增该文件；rollback 到旧状态时 transaction 的 journal 会把该文件作为“after 为 null”删除，不残留。
- 卸载/移除宿主：`.forgeflow/ff-rsi.mjs` 与宿主无关，`removeHost` 不会删除它（与 sharedFiles 行为一致）。

## 验证

- `node --test tools/rsi/ff-rsi.test.mjs` → **15 tests / 15 pass / 0 fail**（EMPTY；缺 existing/缺 normal 拒绝；成功冻结 + 重复冻结拒绝；篡改 cases → STALE；缺 candidate / 无 delta；缺侧观测 / command 不一致；PASS → COMPARED；旧版不失败 → NO_EFFECT；正常对照误伤 → REJECTED；SKIP 不算 PASS；promote 拒绝无 review/L0/verdict fail/stale candidateHash；promote 成功 + PROMOTED；withdraw 保留证据；`--list` 只扫给定目录）。
- `node --test tools/installer/tests/dsh-host.test.mjs`：新增“install ships the host-independent ff-rsi tool and keeps it when a host is removed”一例，验证安装文件逐字节一致、state 记录、安装后 CLI 可运行、移除 codex 后仍保留。
- 文档：`docs/user/rsi.md`（使用与边界）、`docs/user/capabilities.md`（RSI 边界段落）、`skills/ff-retro/references/ff-improvement.md`（原“不是 rsi CLI”改为“可用独立 ff-rsi.mjs 留证”）、`skills/ff-retro/SKILL.md`（需要留证时的入口）。`capabilities.md` 关于“没有 `ff-spec rsi` 子命令”的陈述保持为真：本工具是独立 `ff-rsi.mjs`，未并入 `ff-spec`。

## 未做的事

- 没有自动运行评测或自动打分；
- 没有把 `promotion.json` 接入安装/发布流程；
- 没有实现“递归”循环；用户不确认时永远不会激活；
- 尚未用一次真实的 FF 改进跑完整 five-verb 链（当前证据是命令行契约测试与安装测试，不是一次真实晋级记录）。
