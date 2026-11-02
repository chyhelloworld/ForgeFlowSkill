# 0.9.8-dsh.1 回归与静态包证据（2026-11-02）

环境：Windows，Node v24.12.0，Python 3.11.5，工作区 E:\github\ForgeFlowSKill，分支 source/ feat/dsh-adapter。

## 全量回归

命令（source/ 为 cwd；`FF_TEST_ROOT=E:\github\ForgeFlowSKill\_verify_tmp\ff-test-root-board`）：

1. `node --test dsh-plugin/tests/{plugin,register,board,client}.test.mjs`
2. `node --test <tools/installer/tests/*.test.mjs 展开后的文件列表>`
3. `python -X utf8 -m unittest discover -s tools/workflow -p 'test_*.py' -v`
4. `python -X utf8 docs/check_guide.py`
5. `python -X utf8 tools/workflow/test_intent_contract.py`
6. `python -X utf8 tools/installer/pack-release.py`
7. `python -X utf8 tools/validate_package.py .`
8. `python -X utf8 tools/test_validate_package.py .`

结果（日志目录 `_verification/board-20261102/`；看板改动后的最终一次：`installer-tests-board.log`、`board-pack-final.log`、`board-sealed-final.log`）：

| 步骤 | 退出码 | 计数 |
| --- | --- | --- |
| plugin-tests | 0 | 46 tests / 46 pass / 0 fail（含 node_modules 链接、空模板 `[]` 哨兵、看板生成器/Client） |
| installer-tests | 0 | 95 tests / 94 pass / 1 skip / 0 fail（新增看板文件安装与旧插件清单重装修复测试；skip 为无 Developer Mode 的相对 symlink 用例） |
| python-workflow-unittest | 0 | 73 tests OK，skipped=2 |
| check_guide | 0 | 重写 docs/guide-qa.json（version=0.9.8-dsh.1，21 技能目录） |
| intent-contract | 0 | 4 tests OK |
| pack-release | 0 | 重写 MANIFEST.json 与 payload |
| validate_package | 0 | passed=true，errors=[]；skills=21、local_links=160、scenarios=44；具体 manifest 条目数与 payload 数字以最终日志为准 |
| test_validate_package | 0 | passed=true（valid_package + 13 个变异全部检出） |

合计本轮 **218 个用例 / 0 失败 / 3 skip**（46+95+73+4）；3 个 skip 全部是无 Developer Mode 的 symlink 权限用例（installer 1、workflow 2）。

## 运行时冒烟（独立 DSH 实例，非当前 GUI）

用独立 `DSH_HOME`、从默认 headless 模板新建 profile、本地 mock Anthropic 端点实际启动 DSH 进程，验证了：插件被加载、`ff_status`/`ff_gate` 出现在模型请求的 `tools`、四层锚点进入 `system`、`ff_status` 实际返回状态摘要、守卫实际拒绝 invalid 门禁下的 `archive`。方法与原始 NDJSON 见 `evidence/runtime-smoke.md` 与 `_verification/dsh-native-20261102/runtime-*.log`。

## 静态包

- `MANIFEST.json`：version=0.9.8-dsh.1，status=candidate-not-published；条目数随证据文件增加，最终值由收尾时最后一次 `pack-release.py` 决定。
- 说明：本证据文件也计入 MANIFEST，因此最终 payload 哈希、tgz 字节数与条目数只记录在最终日志中，不在文档里写死。
- `test_validate_package.py`：valid_package 通过；13 个变异（独立技能版本、未知技能、缺场景、坏链接等）全部检出，无漏报。

## L2 泛化场景追加后的重新封包

2026-11-02 15:58 在追加 E43/E44 与相关证据文件后重新执行 `pack-release.py`、`validate_package.py`、`test_validate_package.py` 与 payload 测试：validate passed（scenarios=44），sealed 负向测试通过，payload 测试通过；命令与输出在 `_verification/dsh-native-20261102/l2-generalization-pack.log`、`l2-generalization-validate.log`、`l2-generalization-sealed.log`。本段也计入 MANIFEST，所以条目数与哈希只记日志、不写死。

## 只读看板（本轮新增）

- `dsh-plugin/tests/board.test.mjs` 与 `client.test.mjs` 并入插件测试，合计 46 tests / 46 pass / 0 fail；安装器新增“安装看板文件”与“旧插件清单重装修复”覆盖，安装器总数 95。
- 在本仓库生成 `.forgeflow/board.json`：需求 10、模块 14、任务 5、验收 4、架构参考 2；无 `openspec/` 时 `tasks.progress` 的 done/total 为 null，并给出原因。
- 面板 Client 半仅在 Node 测试（fake `__ModuleLoader__` / fake ctx）与结构校验中验证；真实 DSH 重启后的视觉、工作区切换与卡片内容尚未验证。

## 未运行 / 未证明

- 插件 Host 半已在用户重启后的当前 GUI 验证（`ff_status`/`ff_gate` 可用，守卫实测拒绝 invalid 门禁并放行只读参数）；隔离 DSH 实例另有完整加载证据（`evidence/runtime-smoke.md`）。**看板 Client 半尚未重启验证**，因此侧边栏入口与四块内容仍是待人工验收项。
- 四层评测覆盖 E39–E44 六个合成场景，不替代用户验收或真实项目流程；L1/L3/L4 各 n=1，L2 在锚点生效后对 E40/E43/E44 各重放 3 次、均 3/3 PASS，但样本小、同模型同日，不能称已解决（见 `evidence/replay-L2-generalization.md`）。
- 未做浏览器 UI 冒烟、未做 DSH 自动加载/跨会话恢复的行为测试。
- 静态包校验不覆盖安装器行为、许可与 T3 集成，validate_package 输出已自述此边界。

## 边界

以上是“当前工作树 + 重新打出的 payload”的机器结果；`candidate-not-published` 表示尚未发布，不等于用户接受或可合并部署。

## 0.9.9-dsh.1 客户端加固后的重新回归（2026-11-02 20:35 起）

本轮改动：`dsh-plugin/client.js`（重复 apply 幂等、`no entry at` 缺快照空态）、`dsh-plugin/tests/client.test.mjs`（+2 项）、插件版本 0.1.0 → 0.1.1、发布版本 0.9.8-dsh.1 → 0.9.9-dsh.1（package.json、19 个 SKILL.md、README、docs/user 两处、`docs/guide-qa.json`）。日志目录 `_verification/client-hardening-20261102/`（`installer-tests.log`、`validate.log`、`test-validate-sealed.log`、`install.log`）。

| 步骤 | 退出码 | 计数 |
| --- | --- | --- |
| plugin-tests（board/client/plugin/register） | 0 | 48 tests / 48 pass / 0 fail（新增幂等注册 2 项） |
| installer-tests（`FF_TEST_ROOT=_verify_tmp/ff-test-root-hardening`） | 0 | 95 tests / 94 pass / 1 skip / 0 fail |
| python-workflow-unittest | 0 | 73 tests OK，skipped=2 |
| intent-contract | 0 | 4 tests OK |
| check_guide | 0 | 重写 `docs/guide-qa.json`（version=0.9.9-dsh.1，21 技能目录） |
| pack-release | 0 | 重写 MANIFEST.json 与 payload |
| validate_package | 0 | passed=true，errors=[]；skills=21、local_links=160、manifest_files=1532、scenarios=44 |
| test_validate_package | 0 | passed=true（valid_package + 13 个变异全部检出） |

合计本轮 **220 个用例 / 0 失败 / 3 skip**（48+95+73+4）；3 个 skip 仍是无 Developer Mode 的 symlink 权限用例。

静态包（本轮最终）：MANIFEST version=0.9.9-dsh.1、status=candidate-not-published、条目 1532；payload `forgeflow-payload.tgz` 9,897,230 字节，sha256=`2dd8907cf52377c2122152cec1ad87750767361813916c778812d4e79c84b2b3`。本节计入 MANIFEST，因此上面这行哈希只对本次封包有效。

**对前文“未运行/未证明”的更正**：看板 Client 半已于 18:16 在重启后的 desktop GUI 用真实鼠标点击（UIA clickable point）打开，显示需求 10 条与快照路径，截图存 `_verification/dsh-native-20261102/board-real-click-20261102.png`；此前的“点不开”是 175% DPI 下自动化坐标换算错误，不是功能缺陷。0.9.9 的幂等注册与空态修复仍需重启后复验（见 `evidence/client-hardening.md`）。
