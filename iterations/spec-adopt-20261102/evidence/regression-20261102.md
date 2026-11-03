# spec-adopt-20261102 复确认证：全套回归（2026-11-02）

- 基线提交：`c1f53b6`（分支 `feat/dsh-adapter`；运行前工作区干净）
- 环境：Windows / Node.js v24.12.0 / Python 3.11.5；`FF_TEST_ROOT` 与 `TEMP`/`TMP` 均指向源码外的 `E:\github\ForgeFlowSKill\_verify_tmp`
- 原始日志：`E:\github\ForgeFlowSKill\_verification\spec-adopt-20261102\regression-20261102-124130.log`（23,898B；源码外，未入包）
- 总耗时：470.2s；六项退出码全部为 0

## 实际执行的命令与结果

| 步骤 | 命令（cwd=`source/`） | 结果 |
| --- | --- | --- |
| 安装器测试 | `node --test (Get-ChildItem tools/installer/tests/*.test.mjs).FullName` | **92 tests / 91 pass / 1 skip / 0 fail**（328,196ms） |
| 工作流测试 | `python -X utf8 -m unittest discover -s tools/workflow -p "test_*.py" -v` | **73 tests OK（skipped=2）**（2.75s） |
| 包校验 | `python -X utf8 tools/validate_package.py .` | exit 0 |
| 包校验自测 | `python -X utf8 tools/test_validate_package.py .` | exit 0 |
| 手册检查 | `python -X utf8 docs/check_guide.py` | exit 0（并重写 `docs/guide-qa.json`，见下） |
| 意图契约 | `python -X utf8 tools/workflow/test_intent_contract.py` | **4 tests OK**（0.03s） |

合计 169 个用例、0 失败、3 个 skip。

## skip 明细（均为环境限制，不是失败）

1. `tools/installer/tests` 内 1 条相对 symlink 用例：Windows 无 Developer Mode，无法创建 symlink。
2. `test_health.HealthTests.test_symlink_when_os_allows_creation`：`[WinError 1314] 客户端没有所需的特权`。
3. `test_intent_view.IntentViewTests.test_reader_rejects_real_symlink_when_available`：`host cannot create symlink without extra privilege; no escalation`。

## 本次运行产生的源码状态变化

`docs/check_guide.py` 重写了 `docs/guide-qa.json`：`version` 由 `0.9.6-intent.2` 变为 `0.9.7-dsh.1`，`package_skill_directories` 由 17 变为 21。该文件此前未随 0.9.7-dsh.1 同步，属于过期产物；本次一并提交并重新打包，使 MANIFEST 与其字节一致。

## 边界

本记录只证明这些命令在本机以所述退出码结束，不证明真实宿主模型行为、业务验收或发布。`_verify_tmp` 已在运行后按约定删除。
