# 0.9.8-dsh.1 回归与静态包证据（2026-11-02）

环境：Windows，Node v24.12.0，Python 3.11.5，工作区 E:\github\ForgeFlowSKill，分支 source/ feat/dsh-adapter。

## 全量回归

命令（source/ 为 cwd；`FF_TEST_ROOT=E:\github\ForgeFlowSKill\_verify_tmp\ff-test-root-dsh-native`）：

1. `node --test dsh-plugin/tests/plugin.test.mjs dsh-plugin/tests/register.test.mjs`
2. `node --test <tools/installer/tests/*.test.mjs 展开后的文件列表>`
3. `python -X utf8 -m unittest discover -s tools/workflow -p 'test_*.py' -v`
4. `python -X utf8 docs/check_guide.py`
5. `python -X utf8 tools/workflow/test_intent_contract.py`
6. `python -X utf8 tools/installer/pack-release.py`
7. `python -X utf8 tools/validate_package.py .`
8. `python -X utf8 tools/test_validate_package.py .`

结果（日志目录 `_verification/dsh-native-20261102/`，以时间戳最新的同名文件为准：`installer-tests*.log`、`finalize*.log`、`final-pack-validate.log`、`test-validate-sealed*.log`）：

| 步骤 | 退出码 | 计数 |
| --- | --- | --- |
| plugin-tests | 0 | 29 tests / 29 pass / 0 fail（含 node_modules 链接、空模板 `[]` 哨兵） |
| installer-tests | 0 | 94 tests / 93 pass / 1 skip / 0 fail（新增 2 条 dsh-host 插件集成测试；skip 为无 Developer Mode 的相对 symlink 用例） |
| python-workflow-unittest | 0 | 73 tests OK，skipped=2 |
| check_guide | 0 | 重写 docs/guide-qa.json（version=0.9.8-dsh.1，21 技能目录） |
| intent-contract | 0 | 4 tests OK |
| pack-release | 0 | 重写 MANIFEST.json 与 payload |
| validate_package | 0 | passed=true，errors=[]；skills=21、local_links=160、scenarios=44（追加 E43/E44 后的复验）；具体 source_hashes/payload 数字以最终日志为准 |
| test_validate_package | 0 | passed=true（valid_package + 13 个变异全部检出） |

合计本轮 **200 个用例 / 0 失败 / 3 skip**（29+94+73+4）；3 个 skip 全部是无 Developer Mode 的 symlink 权限用例（installer 1、workflow 2）。

## 运行时冒烟（独立 DSH 实例，非当前 GUI）

用独立 `DSH_HOME`、从默认 headless 模板新建 profile、本地 mock Anthropic 端点实际启动 DSH 进程，验证了：插件被加载、`ff_status`/`ff_gate` 出现在模型请求的 `tools`、四层锚点进入 `system`、`ff_status` 实际返回状态摘要、守卫实际拒绝 invalid 门禁下的 `archive`。方法与原始 NDJSON 见 `evidence/runtime-smoke.md` 与 `_verification/dsh-native-20261102/runtime-*.log`。

## 静态包

- `MANIFEST.json`：version=0.9.8-dsh.1，status=candidate-not-published；条目数随证据文件增加，最终值由收尾时最后一次 `pack-release.py` 决定。
- 说明：本证据文件也计入 MANIFEST，因此最终 payload 哈希、tgz 字节数与条目数只记录在最终日志中，不在文档里写死。
- `test_validate_package.py`：valid_package 通过；13 个变异（独立技能版本、未知技能、缺场景、坏链接等）全部检出，无漏报。

## L2 泛化场景追加后的重新封包

2026-11-02 15:58 在追加 E43/E44 与相关证据文件后重新执行 `pack-release.py`、`validate_package.py`、`test_validate_package.py` 与 payload 测试：validate passed（scenarios=44），sealed 负向测试通过，payload 测试通过；命令与输出在 `_verification/dsh-native-20261102/l2-generalization-pack.log`、`l2-generalization-validate.log`、`l2-generalization-sealed.log`。本段也计入 MANIFEST，所以条目数与哈希只记日志、不写死。

## 未运行 / 未证明

- 当前 GUI 未重启；已用隔离 DSH 实例验证真实加载（`evidence/runtime-smoke.md`），但未验证用户当前 GUI 重启后的效果。
- 四层评测覆盖 E39–E44 六个合成场景，不替代用户验收或真实项目流程；L1/L3/L4 各 n=1，L2 在锚点生效后对 E40/E43/E44 各重放 3 次、均 3/3 PASS，但样本小、同模型同日，不能称已解决（见 `evidence/replay-L2-generalization.md`）。
- 未做浏览器 UI 冒烟、未做 DSH 自动加载/跨会话恢复的行为测试。
- 静态包校验不覆盖安装器行为、许可与 T3 集成，validate_package 输出已自述此边界。

## 边界

以上是“当前工作树 + 重新打出的 payload”的机器结果；`candidate-not-published` 表示尚未发布，不等于用户接受或可合并部署。