# spec-adopt-20261102 阶段记录：adopt 向导、receipt 独立性与版本派生

基线 `cbf3128`（分支 `feat/dsh-adapter`），审查对象为 `1e165bb..cbf3128` 的三个提交及其后续未提交修复。本记录只覆盖本轮独立审查闭环，不代表发布、合并或用户接受。

| 阶段 | 状态 | 证据 |
| --- | --- | --- |
| 综合独立审查（fresh context，只读） | 初审 FAIL（2 个阻断） | evidence/independent-review.md「第一轮」 |
| 阻断项修复与复核 | B1、B2 PASS | 同一文件「第二轮」；b1probe 实跑 INSTALLED / 0.9.7-dsh.1 |
| 非阻断项 R3/R4/R5/R6/R8 修复 | PASS（定向 37 tests / 36 pass / 1 skip） | 「第三轮」；变异测试逐项回红 |
| 全套回归 | 130 tests / 129 pass / 1 skip / 0 fail（239s） | 本机 TEMP=E:\github\ForgeFlowSKill\_verify_tmp |
| 静态包 | update-manifest=0、pack=0、validate passed（skills 21、links 160、manifest 1489、scenarios 38） | 待记录文件写入后重算 |

## 审查范围

- `tools/openspec/ff-adopt.mjs`：从既有文件推断 policy（design/plan），仅当所有活动 change 都具备非空普通文件才登记；`--write` 预览经真实 evaluateFF。
- `tools/openspec/ff-receipt.mjs`：review 回执必须带 independence（L0–L3），缺省/非法值拒绝；旧回执迁移保留字节。
- 版本派生：`install.mjs` 把 pin.version 作为 `--source-version` 传给 staged build；`build.mjs` 在昂贵构建与 `--clean` 之前校验参数；`ff-build.mjs` 的 `--reuse-build` 要求 marker.sourceVersion 与 pin 一致。
- 文档：capabilities/install/中文手册/openspec README 增加 adopt；SPEC-LIFECYCLE 与 12 份技能引用同步“只承认非空普通文件”。

## 审查方法与独立性

三轮均由 fresh context subagent 只读执行，绑定实际字节与退出码，未采信作者说明；修复后只复核发现与影响链。作者（实施者）未参与审查判定。审查临时目录 `E:\github\ForgeFlowSKill\_verify_tmp` 在 source 外，结束即删。

## 关键证据（文件:行）

- `tools/installer/install.mjs:71-75` buildArguments 生成 `--source-version=<pin.version>`；`:103` 传入 staged build。
- `tools/openspec/build.mjs:34-41` sourceVersionArg；`:45` 之前解析；`:99` 之前（try 首行）解析，保证 `--clean` 不会先删 `.build`。
- `tools/openspec/ff-build.mjs:26-36` version 不匹配即抛；`:99,101` install 两处传 pin.version。
- `tools/openspec/ff-adopt.mjs:29-33` has()=lstat+isFile+size>0；`:108` 空 policy 守卫先于写盘。
- `tools/openspec/ff-status.mjs:121` strict 同时因 blocked 或 policy invalid 失败。
- `tools/installer/tests/windows.test.mjs:189` 直接断言 `--source-version=0.0.0-test`（源 MANIFEST 版本）。

## 未验证 / 残留风险

- 真实宿主（Codex/Claude）的完整 full build 需网络，未在审查中重跑；mocked 安装只证明参数连线。
- `ff-adopt` 用 lstat 不解析 symlink，指向非空文件的 design.md symlink 会被保守拒绝；与 evaluator 的 safePath 禁 symlink 一致，但无专门测试。
- status 的浅层形状校验（R2）仍与 evaluator 完整校验不同：空 id/未知字段在 status 里可能显示 CONFIGURED；未在本轮修改。
- 旧回执缺省 independence 的兼容（R7）保留；新回执强制 L0–L3。
- 130 用例中 1 skip 为相对 symlink 用例（环境缺 Developer Mode）。
