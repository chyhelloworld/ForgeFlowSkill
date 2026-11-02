# DSH 原生嵌入与四层失效防护（0.9.10-dsh.1）

日期：2026-11-02
前置：`iterations/dsh-embed-20261102/`（0.9.7-dsh.1 的安装、门禁与四层验证）

## 目标

在 0.9.7-dsh.1 已能“装进 DSH 并跑通”的基础上，补齐两件事：

1. **原生接入面（结构性嵌入）**：技能发现只是第一层；把 FF 的门禁与状态检查变成 DSH 原生工具、命令和工具执行前的守卫，而不是让模型自己记得去跑 CLI；再给侧边栏一个只读看板，直接查看需求、架构参考、模块与任务进度。
2. **四层失效防护**：把 L1 局部正确整体偏航、L2 过度防御复杂度失控、L3 过早接受平庸方案、L4 过早收敛原始问题被替换，落进既有 `INTENT-LOOP` 常驻契约与 `ff-review` 审核规则，并用可复现的评测场景验证。

## 变更

### 四层契约（技能文本，无新技能/新门禁）

- `docs/maintainers/INTENT-LOOP.md`：新增“四层失效自检（failure-modes-v1）”一节（信号 → 动作 → 边界，含三条总则），并从该文件同步到 10 个 `skills/ff-*/references/intent-loop.md` 副本（逐字一致）。
- `skills/ff-review/references/reviews.md`：目标/主流程类补“总需求验收账本”（:19）、方案类补“更简单替代”（:29）与“等价机制核查”（:30）、缺账本判待验证（:33）。
- `skills/ff-review/SKILL.md:31`：把 reviews.md 的读取条件扩到“阶段末综合审查、方案取舍判断”，让审核规则在常规审查中真正被读取。
- `skills/ff-intake/SKILL.md:23`：L4 触发从自指改为可观察信号（用户原话未复述、命名先于事实等）。
- `evaluations/scenarios.json`：新增 E39–E44 六个四层场景（38 → 44；E43/E44 为 L2 泛化场景）；再加入 E45/E46 两个 L2 双向校准场景（44 → 46）。

### DSH 原生插件（`dsh-plugin/`）

- `index.js`：`ff_status`、`ff_gate` 两个只读工具；`/ff-status` 命令；向 `systemPrompt` 注册四层失效常驻锚点（`anchor: false` 可关）；`tools/pre-execute` 守卫按 shell 引号切词，只检查命令位置上由 `node`/`npx` 执行的 `.forgeflow/ff-spec.mjs archive`，`blocked`/`invalid` 时 `{kind:'deny', reason}`，`--help`/`-h` 与 `--ff-disposition canceled|rejected` 放行，其余放行。
- `register.mjs`：把插件以 `link:` 依赖加入指定 DSH profile 的 `dsh.profile.bundles` 与 `cordis.patch.yml`（带 managed 标记），并建立 `node_modules/@local/forgeflow-dsh` 目录链接（Windows 为 junction）；支持 `--remove`、`--dry-run`、`--json`，写前备份，幂等，已有外来同名目录时拒绝覆盖（退出码 2）。
- `generate-board.mjs` + `client.js`：只读看板。生成器把 `planning/intent-view-links.json`（或 `source/planning/...`）与 `openspec/changes/*/tasks.md` 的勾选状态汇成 `<workspace>/.forgeflow/board.json`；Client 半注册左侧栏 `ff-board` 入口与 `main` 面板，通过 `remote.workspaceFiles` 读快照，显示需求、架构参考、模块、任务进度。面板不写项目文件，快照需手动生成，更新后点“刷新”。
- 安装器集成：`tools/installer/state.mjs` 增加 `pluginDir='.forgeflow/dsh-plugin'` 与 7 个受管文件；`install.mjs` 从 payload 复制插件（旧 payload 缺目录时静默跳过）；`runtime.mjs` 的 `diagnose()` 在选中 dsh 时输出 `plugin{available,path,client,generator,note}`；`docs/user/install.md` 增加“DSH 原生插件（可选，需重启）”一节。

### 版本与产物

- 0.9.8-dsh.1（插件与看板落地）→ 0.9.9-dsh.1（客户端加固：重复 apply 幂等、缺快照空态；插件自身 0.1.0 → 0.1.1）→ **0.9.10-dsh.1**（L2 双向校准场景 E45/E46 与证据；插件版本不变）。版本覆盖 package.json、19 个技能 SKILL.md、README、docs/user 两处与 `docs/guide-qa.json`（由 `docs/check_guide.py` 生成）。
- `ff-diagram`、`ff-writing-document` 保持自身 0.1.0 技能版本，不随包版本。

## 四层重放结果（详细见 `evidence/replay-E39-E42.md`）

方法：每个场景用全新上下文执行者（只给 case prompt 与技能清单，禁止读 criteria），再由独立评分者只读 rubric 打分（每案 3 criteria 各 0–2，全 2 且无 critical_failures 才 PASS）。

| 场景 | 层 | 结果 |
| --- | --- | --- |
| E39 切片全绿但总需求未验收 | L1 | PASS 6/6 |
| E40 为修设置项引入状态库与路由 | L2 | **FAIL 5/6**（c2=1） |
| E41 能跑通即定稿的复制实现 | L3 | PASS 6/6 |
| E42 未复述原话即重定义为架构缺陷 | L4 | PASS 6/6 |

L2 缺口：执行者都拒绝了“以后扩展需要”，但没有逐条给出“已有等价机制 → 为何不够 → 延后代价”。同 prompt 重放 3 次，c2 稳定为 1；把 `ff-review/SKILL.md:31` 的读取条件扩到方案取舍后第 3 次仍为 1。结论是**文本触发条件不足以保证逐条对照**，本迭代不再加长技能文本（继续加正是 L2 自身的表现），把 L2 记为已知限制，候选结构锚点写入 evidence。

### 锚点生效后复测（L2）

2026-11-02 15:30，在用户重启 DSH、插件的四层锚点已进入 system prompt 后，按同一协议重放 E40 三次：**3/3 次 6/6 PASS**（c2 由稳定 1 变为 2），而锚点生效前的同协议重放为 3/3 次 5/6 FAIL。详细方法与边界见 `evidence/replay-E40-after-anchor.md`。结论：常驻锚点覆盖了这条检查；但两种条件各 n=3、同模型同日，属可复现行为提示，不是统计显著结论。

### L2 泛化重放（E43/E44）

2026-11-02 15:50–15:57，新增两个不同领域的 L2 场景并各重放三次：**E43 3/3 次 6/6 PASS、E44 3/3 次 6/6 PASS**（合计 6/6，无 critical failures）。E43 是“症状未诊断即以以后数据量会涨为由引入 Redis/MQ/读写分离”，E44 是“一次性脚本被上升为插件框架/配置中心/审计回滚模块”；两案都要求先可复现定位、先查等价机制并说明为何不够、给出延后代价。与 E40 合计，锚点生效后三个 L2 场景各 3/3 PASS。详细评分、原文与边界见 `evidence/replay-L2-generalization.md`。

### L2 双向校准（E45/E46）

2026-11-02 21:15–21:23，补测反方向：**有失败样本时是否仍敢采纳必要机制**，防止锚点把执行者推向“一概拒绝”的另一种 L2/L3 失效。新增 E45（支付回调重复发货，有证据的数据库唯一约束应实施）与 E46（导出 OOM，采纳流式、延后无证据的平台化），各用 3 个全新上下文执行者、再由独立评分者盲评：**E45 3/3 PASS、E46 3/3 PASS，18/18 criteria 满分、0 次 critical failures**。六份回答都带出常驻锚点首行；三份 E45 都采纳唯一约束并收窄幂等表范围（而非否决修复），三份 E46 都采纳流式并延后平台/配置中心。详细评分、原文与边界见 `evidence/replay-L2-calibration.md`。

## 验证状态

- 插件自测：`node --test dsh-plugin/tests/{plugin,register,board,client}.test.mjs` → 48 pass / 0 fail（含链接创建/撤销/外来目录拒绝、常驻锚点、守卫放行/误伤、空模板 `[]` 哨兵、看板快照/坏结构/多工作区/注册抛错、重复 apply 幂等、缺快照空态）。
- 安装与握手：`.forgeflow/install/state.json` version=0.9.10-dsh.1、files=195（含插件 7 文件）；`ff-spec.mjs --version`=0.9.10-dsh.1；doctor `handshake.verdict=MATCH`（skills/state/cli 均为 0.9.10-dsh.1）、`plugin.available=true`、`discovery.skills=21`。安装的 `.forgeflow/dsh-plugin` 7 个文件与 `source/dsh-plugin` 逐字节一致（sha256 见 `_verification/l2-calibration-20261102/` 日志）。
- 注册：profile `~/.dsh/profiles/desktop` 增加 `@local/forgeflow-dsh` 依赖、bundle 与 `node_modules/@local/forgeflow-dsh` Junction，其他条目未动；写前备份 `.bak-<ts>`；从 profile 目录 `import("@local/forgeflow-dsh")` 实测解析成功（name/inject/apply 均正确）；`--remove` 可完全撤销（有测试，未对真实 profile 执行）。
- 全量回归与静态包：见 `evidence/regression-20261102.md`（插件 48、安装器 95/94 pass/1 skip、workflow 73、intent 4，合计 220 用例 0 失败 3 skip；0.9.9 的最终数字以 `_verification/client-hardening-20261102/` 日志为准）。0.9.10 只新增评测场景与证据，测试数不变（插件 48、workflow 73、intent 4），静态包在**所有** `source/` 编辑完成后重新生成：MANIFEST files=1535、validate passed（skills 21 / links 160 / source_hashes 25 / scenarios 46）、sealed mutation 14 例通过；payload 哈希与条目数只记日志，不写文档（避免“写文档→包过期”的循环）。
- L2 复测：锚点生效后 E40 3/3 PASS（6/6），见 `evidence/replay-E40-after-anchor.md`；泛化场景 E43、E44 各 3/3 PASS（6/6），见 `evidence/replay-L2-generalization.md`；反向校准场景 E45、E46 各 3/3 PASS（6/6，18/18 criteria），见 `evidence/replay-L2-calibration.md`；边界同上（n=3、同模型同日、simulated-context）。
- 独立审核：首轮独立审核 FAIL 的 P1 项已逐条修复（`evidence/review-fixes.md`）；独立复审（全新上下文、只读）结论 **PASS（可作为候选交付）**、无阻断项，报告在 `_verification/independent-review-dsh-native-2/report.md`（工作区外，未随包）。看板在复审后新增，已由 gpt-6.1-sol（xhigh）做单独细节审查，P0/P1/P2 逐条修复对照见 `evidence/board-panel.md`。

## 边界

- 守卫只覆盖 `pwsh`/`bash` 的 `command` 字面量；`run_code`、变量拼接或其他入口看不到真实命令行，这是 best-effort，不是安全边界。
- 插件注册后需**重启 DSH** 才生效；doctor 只检查项目内副本，不读全局 profile。
- 本迭代在**隔离的 DSH 实例**（独立 `DSH_HOME` + 从默认模板新建的 profile + 本地 mock 模型端点）中验证了真实加载：`ff_status`/`ff_gate` 出现在模型请求的工具列表、四层锚点进入 system 提示、`ff_status` 实际返回状态、守卫实际拒绝被门禁阻塞的 `archive`（见 `evidence/runtime-smoke.md`）。用户重启后的当前 GUI 也验证了 Host 半（工具可用、守卫拒绝/放行实测）；看板 Client 半也已在同一 GUI 验收（见下一条与 `evidence/client-hardening.md` 的“重启后验收”）。
- 四层重放证明的是“同模型、同技能文本下的可复现行为”，不替代用户验收；L2 在锚点生效后 E40/E43/E44（拒绝无证据机制）与 E45/E46（采纳有证据机制）各 3/3 PASS，但样本小、同模型同日、均为合成场景，且不能证明锚点是唯一原因，证据强度有限（见上）。
- 看板的 Client 半在 0.9.8 已由真实鼠标点击验收（UIA clickable point，见 `_verification/dsh-native-20261102/board-real-click-20261102.png`）；0.9.9 的幂等注册与缺快照空态已在 2026-11-02 21:09–21:11 重启后的真实 GUI 验收：看板正常打开、控制台无 duplicate 注册报错、DHAgent 显示友好空态（截图 `_verification/client-hardening-20261102/post-restart-*.png`）；Node 测试只覆盖 fake ModuleLoader 与 fake ctx，不能替代该次验收。数据只有 `intent-view-links.json` 时任务进度显示未知，架构区只有参考文档索引。
- 本迭代不改 `openspec/` 门禁语义，也不新增常驻进程或后台服务。

## 证据索引

- `evidence/replay-E39-E42.md`：四层重放方法、评分、E40 缺口与原始响应节选。
- `evidence/replay-E40-after-anchor.md`：锚点生效后 E40 复测（3/3 PASS）、与锚点前的对比、评分依据与统计边界。
- `evidence/replay-L2-generalization.md`、`evidence/replay-L2-generalization-responses.md`：新增 E43/E44 两个 L2 泛化场景的 3×2 重放、独立评分、与锚点前对比、边界与六份响应原文。
- `evidence/replay-L2-calibration.md`、`evidence/replay-L2-calibration-responses.md`、`evidence/replay-L2-calibration-scoring.md`：E45/E46 两个 L2 双向校准场景的 3×2 重放、独立盲评（18/18 criteria）、与 E40/E43/E44 的对照、边界与六份评分原文。
- `evidence/profile-registration.txt`、`evidence/register-dry-run.json`：profile 依赖/bundle 差异与幂等 dry-run。
- `evidence/doctor-0.9.8.txt`：安装后 doctor 全量输出。
- `evidence/install-state-summary.txt`、`evidence/ff-spec-version.txt`：安装状态与版本。
- `evidence/regression-20261102.md`：全量回归、静态包校验与未运行范围。
- `evidence/dsh-plugin-load.md`：插件安装一致性、profile 注册、junction 与解析验证、未重启边界。
- `evidence/runtime-smoke.md`：隔离 DSH 实例中的真实加载、工具可见/执行、守卫拒绝与锚点证据。
- `evidence/review-fixes.md`：对独立审核 P1 项的逐条修复对照与仍未关闭项。
- `evidence/board-panel.md`：看板方案、生成器/Client 实现、sol 细节审查 P0/P1/P2 修复对照、测试与未验证边界。
- `evidence/client-hardening.md`：重复 apply 的幂等注册、`no entry at` 缺快照空态、新增测试与重启后 GUI 验收。