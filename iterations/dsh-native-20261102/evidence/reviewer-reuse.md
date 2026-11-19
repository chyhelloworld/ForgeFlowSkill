# 审查者复用：减少重复子智能体与 token（0.9.12-dsh.1）

日期：2026-11-03
用户原话（m05227）：“可以,修改为能服用就服用,减少token费用”（“服用”即“复用”）。

## 问题

此前每次修复复核都新起一个只读审查子代理。对同一候选、同一授权任务，这重复装载规则与证据，token 成本高；同时“独立首审”和“修复复核”在记录上不可区分，复用一旦发生就无法审计。

## 规则（已落进技能与工具）

- 仍用新上下文（L1）或异模型（L2）：首次审查、关键变更前置方案、候选实质变化、出现新关键风险、原审查者已接触作者通过结论。
- 可复用原审查者：同一候选、同一授权任务的修复复核。只复核原发现、受影响依赖和必要回归，保持发现编号与未验证项；重新读取当前 candidate/compare 哈希，不接受作者转述。
- 记录：`review.json` 写 `reviewMode: "re-review"`、`reviewRound`（>=2）、`priorReviewHash`（上一份 `review.json` 的 sha256）；首次审查写 `initial` 可省略轮次。复用的复核明确不是独立首审。
- `ff-rsi.mjs promote` 把记录变成拒绝条件：未知 `reviewMode`、`reviewRound` 非 >=1 整数、re-review 缺 >=2 轮次或 64 位小写 `priorReviewHash`、`reviewRound>1` 却缺 `priorReviewHash`，都退出 2。

## 改动文件

- `skills/ff-review/references/reviews.md`：新增“审查者复用与复核”一节，定义何时复用、复核范围、记录字段与“不是独立首审”。
- `skills/ff-review/SKILL.md:25`：把复用与记录条件放进审查入口规则。
- `docs/user/rsi.md`：新增“审查者复用”说明，`review.json` 字段与 `promote` 拒绝行为；示例版本更新为 0.9.12-dsh.1。
- `skills/ff-retro/references/ff-improvement.md`：自改进闭环中的审核行补复用条件。
- `tools/rsi/ff-rsi.mjs`：`promote` 新增 reviewMode/reviewRound/priorReviewHash 校验，promotion 记录写入 `reviewMode` 与 `reviewRound`。
- `tools/rsi/ff-rsi.test.mjs`：新增 1 例，覆盖轮次不足、缺 priorReviewHash、齐全后成功且记录字段正确。

## 验证

- `node --test tools/rsi/ff-rsi.test.mjs`：16 tests / 16 pass / 0 fail；新增用例先以 `reviewRound: 1` 被拒（报 reviewRound），再以缺 `priorReviewHash` 被拒（报 priorReviewHash），最后齐全通过并断言 `promotion.json` 的 `reviewMode=re-review`、`reviewRound=2`。
- `python tools/workflow/test_intent_contract.py`：4 tests OK（技能文本分发契约未破）。
- `python docs/check_guide.py`（`PYTHONUTF8=1`）：exit 0，`docs/guide-qa.json` 重写为 0.9.12-dsh.1、21 技能目录。
- 插件、安装器、workflow 与静态包结果见 `regression-20261102.md` 的 0.9.12 节；全量日志在 `_verification/reviewer-reuse-20261103/`（工作区外）。

## 边界

- 本轮没有做“复用 vs 新起”对照行为评测，也没有真实 token 计量；“减少 token”是流程上少起一个子代理的设计目标，实际节省未测量，按规则记 unknown。
- `review.json` 的 `reviewMode`/轮次是声明，不是密码学证明；工具只能拒绝字段缺失或自相矛盾的记录，不能证明审查者真的复用了上一轮上下文。
- 复用复核只关闭原发现与影响链，不覆盖候选实质变化；范围变化仍须新上下文首审。