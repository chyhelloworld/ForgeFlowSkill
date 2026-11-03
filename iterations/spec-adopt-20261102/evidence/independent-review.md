# 独立审查回执（整理版）

说明：以下为三轮 fresh-context 只读审查的回执要点，按轮次整理；判定与证据均绑定当时工作区字节。作者修复说明未作为审查依据。

## 第一轮：初审（基线 cbf3128，工作区 31 M + 1 ??）

| 项 | 结论 | 证据 |
| --- | --- | --- |
| B1 staged build 未传版本 | FAIL | install.mjs 调用 build.mjs 时无 `--source-version`，构建后可安装版本与 pin 脱节 |
| B2 adopt --write 可写出空 policy | FAIL | 0 字节 design.md 先写后报错；部分 change 缺文件仍可能落盘 |
| R2 status 形状校验浅 | 非阻断 | ff-status.mjs:38-46 只查 version+非空 artifacts |
| R3 adopt 先写后验 | 非阻断 | 同 B2 的写序问题 |
| R4 strict + INVALID 无 change | 非阻断 | ff-status.mjs:120 只看 blocked.length |
| R5 裸 --source-version 静默 | 非阻断 | build.mjs 旧解析漏 '=' |
| R6 reuse 不校验版本 | 非阻断 | ff-build.mjs 只看 pin 字段 |
| R7 缺省 independence 兼容 | 非阻断 | ff-validity.ts:213 |
| R8 B1 连线无回归断言 | 非阻断 | windows harness 不透传 args |

初审无 P0；B1/B2 阻断交付。

## 第二轮：B1/B2 复核 + R3/R4/R5/R6/R8 修复复核

- B1 PASS：`install.mjs:71-75` 生成参数、`:103` 传给 staged build；b1probe 实跑 `install(...,{mode:'full',build:true})` → INSTALLED / 0.9.7-dsh.1 / exit 0，记录调用 `[staging-...\tools\openspec\build.mjs, --source-version=0.9.7-dsh.1]`。真实 full build（需网络）NOT_RUN。
- B2 PASS：空项目/部分 change `adopt --write` 均 exit 1 且无 policy；空 policy 再 adopt 被拒；`--write --force` 可替换。
- N3 PARTIAL：install.test 曾同义反复、windows harness 不透传 flag；R8 已补齐。
- R3 PASS（第三轮）：ff-adopt.mjs:29-33；0 字节 design → exit 1、无 ff-policy.json、输出 `no artifact file is present in every active change; nothing written`；变异回 existsSync 用例红。
- R4 PASS：ff-status.mjs:121；INVALID+--strict → 1，不带 strict → 0；变异删 invalid 分支用例红。
- R5 PASS（行为）：三种坏形式均 exit 1、不建 .build；正路径 9.9.9 构建成功且 marker/package.json 一致。后续补了自动化测试并修正 `--clean` 顺序。
- R6 PASS：同版本 reuse → INSTALLED/188 files；9.9.9 → `Reusable build FF version 9.9.9 does not match 0.9.7-dsh.1`；旧 unstamped → 拒绝。
- R8 PASS：windows.test.mjs 透传 args 并断言；变异 buildArguments→[] 用例红。

## 第三轮：定向复核与变异

- 定向 `node --test ff-adopt ff-status ff-build windows`：37 tests / 36 pass / 1 skip / 0 fail。
- 变异：has()→existsSync（红）、删空 policy 守卫（3 红）、删 force 守卫（1 红）、strict 去掉 invalid（1 红）、关版本比较（1 红）、buildArguments→[]（1 红）。
- MANIFEST 1489 条全匹配（实际 1494 文件，差 5 个 __pycache__/*.pyc 被忽略）；payload sha256 f1285be3… 与 tgz 一致；payload.test 4/4。

## 结论

阻断项 B1/B2 关闭；R3/R4/R5/R6/R8 关闭；R2/R7 作为已知限制保留。通过范围为“所列行为与静态包”，不含真实宿主 full build、模型行为或用户接受。
