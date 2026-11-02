# FF RSI 证据工具（ff-rsi.mjs）

RSI（递归自我改进）在本仓库不是自动循环，也不是会自己改技能、自动晋级或合并发布的引擎。它是一个**证据工具**：把一次 FF 改进的失败样本、正常对照、旧/新版本观测、独立审核与用户确认按哈希绑定成一条可复核记录。是否晋级仍由用户决定。

工具随安装写到项目根：`node .forgeflow/ff-rsi.mjs <动词>`。它不依赖 OpenSpec 运行时，也不读写 `openspec/`；所有状态从证据文件推导，不另存 `status` 字段。

## 什么时候用

- `ff-retro` 复盘后有一个**用真实失败样本可验证**的最小候选，需要冻结旧版对照、防止留出集被改；
- 需要把执行者原始回答、评分结论与候选版本绑定，而不是靠人工复制粘贴；
- 需要一条可撤销、但不自动生效的晋级记录。

只有讨论、没有失败样本时不要用本工具；那是 Grill/Prove 的范围。

## 五个动词

| 动词 | 作用 | 关键约束 |
| --- | --- | --- |
| `freeze` | 冻结一次实验：目标、版本、基线与候选留出集、失败/正常对照、用户原话、L2 三字段 | 缺任一必填项退出 2；`run.json` 已存在则拒绝重写 |
| `compare` | 用同一批用例比较旧/新版本观测 | 证据哈希漂移、缺一侧观测、命令不一致、候选与基线逐字节相同都退出 2 |
| `promote` | 记录用户确认的晋级 | 无 `review.json`、审核 `L0`、审核结论非 pass、候选或对照哈希不符都退出 2；只写记录，不激活 |
| `withdraw` | 撤销本次候选，保留原件与结论 | 写一次 `withdraw.md`，不删除证据 |
| `status` | 从证据推导当前状态 | 只读；`--list <dir>` 只扫给定目录 |

`freeze` 强制填写 INTENT-LOOP 的 L2 三字段：已有机制（`--existing`）、为何不够（`--why-insufficient`）、失败样本（`--counterexample`）。这是把“先查等价机制”从文本约定变成可执行前置条件的唯一新增检查。

## 最小流程

```powershell
# 1. 冻结：失败样本必须是真实可复现的，正常对照用来发现误伤
node .forgeflow/ff-rsi.mjs freeze --dir .forgeflow/rsi/demo --target ff-retro --version 0.9.11-dsh.1 \
  --base path/to/old-skill --fail evidence/fail.json --normal evidence/normal.json \
  --request-quote "让 Retro 能记录一次有界改进" --request-ref m04592 \
  --existing "ff-receipt snapshot" --why-insufficient "不绑定执行者原始回答" \
  --counterexample "E40 重放 3/3 仍 5/6"

# 2. 实现候选后，在 run/candidate/ 放新版本，写 observations.json（每案 old/new 两侧）
node .forgeflow/ff-rsi.mjs compare --dir .forgeflow/rsi/demo --runs evidence/observations.json

# 3. 独立审核写 review.json（含 candidateHash/compareHash/independence/verdict）
node .forgeflow/ff-rsi.mjs promote --dir .forgeflow/rsi/demo \
  --user-quote "按这个方案改" --user-ref m04700

# 4. 查看状态；确认安装位置与候选一致才显示 PROMOTED
node .forgeflow/ff-rsi.mjs status --dir .forgeflow/rsi/demo --installed path/to/installed
```

裁决规则固定：失败用例旧版不失败 → `NO_EFFECT`；失败用例新版未通过 → `REJECTED`；正常对照旧版不通过 → `NO_EFFECT`；正常对照新版被误伤 → `REJECTED`；`SKIP`/`NOT_RUN` 不能当 PASS。`REJECTED`/`NO_EFFECT` 退出码为 3。

## 状态含义

`EMPTY` → `FROZEN` → `ISOLATED`（出现候选）→ `COMPARED` / `REJECTED` / `NO_EFFECT` → `REVIEWED` → `PROMOTION_RECORDED` → `PROMOTED`（安装位置与候选哈希一致）。出现 `STALE` 表示冻结证据或审核绑定的哈希已漂移，必须重新对照/审核，不能继续晋级。

`PROMOTION_RECORDED` 只表示“用户确认已记录”，**不表示已生效**；激活/回滚命令由工具打印，是否执行仍由用户决定。

## 边界

- 不创建分支、不合并、不发布、不修改正在使用的技能或全局规则；
- 不自动跑评测；执行者与评分者仍按 [评估协议](../../evaluations/README.md) 由独立上下文完成；
- 不替代用户验收；审核通过不等于用户批准；
- 不隐藏未验证项：`review.json` 必须保留 `unverified` 数组。

相关：[FF 自改进候选](../../skills/ff-retro/references/ff-improvement.md)、[复盘技能](../../skills/ff-retro/SKILL.md)、[安装说明](install.md)。
