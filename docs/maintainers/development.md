# 开发与维护

先读 [当前能力](../user/capabilities.md)、[路由约定](../../ROUTING.md)，核对 Git 分支、dirty/untracked、当前需求与授权。文档整理不授予业务改动、发布、部署或升级其他项目安装的权限。

## 目录与约定

| 位置 | 用途 |
| --- | --- |
| `skills/` | 20 项技能，保留 SKILL.md、agents/openai.yaml、references、NOTICE 与 LICENSE 的发现/依赖布局 |
| `tools/installer/`、`installer.mjs`、`bin/` | 安装、打包与项目内运行入口 |
| `tools/openspec/` | 固定 CLI 来源、构建和补丁；[来源与构建说明](../../tools/openspec/README.md) |
| `docs/user/` | 安装、能力/场景与可选方法；中文主手册/离线 HTML/图源为兼容现有脚本保留在 docs 根 |
| `planning/`、`iterations/` | 既有计划和按版本迭代记录；不是当前授权的替代品 |
| `validation/`、`evidence/`、`provenance/` | 历史原始运行、指标与来源快照，保持路径和字节；[证据目录](../archive/README.md) |

[生命周期契约](SPEC-LIFECYCLE.md)与[旧状态迁移](../../MIGRATION.md)保留原基线版本标识，描述 FF 原生门禁和兼容边界；已安装项目业务入口用 `.forgeflow/ff-spec.mjs`，源码构建入口用 `tools/openspec/ff-spec.mjs`。不要把迁移文档的旧版本号当当前包版本。

ROUTING、根 CHANGE-MAP 和 tools/openspec/README 同样保留来源/实验基线标识；ROUTING 的历史十二个工作流职责加七项可选方法为19技能；独立ff-diagram加入后当前为20技能。当前安装入口和验证边界以[安装页](../user/install.md)为准，不能用这些旧版本标识覆盖当前包事实。

Codex Goal 隔离候选的唯一契约是 [CODEX-GOAL-BRIDGE.md](CODEX-GOAL-BRIDGE.md)。五个接入技能中的 `references/goal-bridge.md` 必须与它逐字节相同且由各自 SKILL 条件路由；安装后不依赖仓库文档路径。旧工作流技能 metadata 沿用包版本；独立元能力版本按 skill-versions.json 显式登记并与该技能 metadata 核对，原 CLI 固定版本不变；原生实验和模拟行为不能互相替代。候选冻结后若再改源文件，须重新打包、核对哈希并重做受影响验证，不能改签既有安装证据。

## 验证入口

在已核对源码根目录运行。Python 使用 UTF-8；临时目录、覆盖率、缓存与测试回执放源码外的项目内交接目录，避免写进 payload。

```powershell
# 先指定已授权、位于源码外的测试目录；以下为本项目 E 盘示例。
$ffChecks = 'E:\github\ForgeFlowSKill\_verification\local-package-checks'
New-Item -ItemType Directory -Path $ffChecks -Force | Out-Null
$env:FF_TEST_ROOT = $ffChecks
python -X utf8 tools/validate_package.py .
python -X utf8 tools/test_validate_package.py .
python -X utf8 -m unittest discover -s tools/workflow -p "test_*.py" -v
node --test tools/installer/tests/*.test.mjs
python -X utf8 docs/build_manual_html.py
python -X utf8 docs/check_guide.py
```

Windows PowerShell 不一定展开原生程序的 `*.test.mjs`；该 Node 命令需要传入实际文件列表，可用 `node --test (Get-ChildItem tools/installer/tests/*.test.mjs).FullName`。按改动选择检查，别为文档调整重跑无关业务。Windows symlink 权限不足要记 SKIP/NOT_RUN，不能变为 PASS；失败现场保留。缺少同版函数复杂度/覆盖率时标 NOT_MEASURED，CRAP 硬上限50、目标约10。

架构入口分发测试要求 `FF_TEST_ROOT` 是预先创建的绝对目录；未设置时应明确失败，不能静默回落系统临时目录。其他机器应把上述示例替换为自己的已授权目录。本轮只改规则/分发时按需运行 `architecture-review.test.mjs` 与受影响检查，不据此要求全套测试或 full 构建。

## 文档与打包

修改中文主手册后重新生成 HTML 并运行 guide 检查。不移动手册、docs脚本或图源以打断已有 `iterations/0.9/ui_capture.py` 路径；旧截图仍属于原冻结源码，本次 HTML 改动不能继承旧视觉验收。

维护者显式执行 `python -X utf8 tools/installer/pack-release.py` 重新生成 MANIFEST/payload/校验文件，不能只改文档而留下旧包。脚本不由 npm 生命周期自动运行。现有 packer 不过滤 Git worktree 的 `.git` 指针文件；从不含 Git 元数据/缓存的干净源码导出打包，并核对文件清单，不修改源或绕过验证。

新包核对版本、20技能、全部 manifest 文件、tar 条目/校验和、相对链接和实际安装入口。full需要固定依赖网络，失败保留原始结果；可分别报告 skills-only 的限域验证，不将其说成 full READY。主分支合并、版本发布和生产操作各需相应授权。

0.9.2-goal.1 暴露了实际的提交前打包缺陷：工作区 CRLF 字节进入 manifest，但 Git 按 `.gitattributes` 提交为 LF，检出后完整性失效。0.9.2-goal.2 在保留原候选与回执后用 `write_bytes` 修正预期文本字节并重新冻结。打包前对清单文件比较 `git hash-object --path=<相对路径> <文件>` 与 `git hash-object --no-filters <文件>`，必须一致；再生成并复核 manifest/payload，不能把换行警告当无害。已有 `-text` 原始证据保持原字节，不批量归一化历史记录，也不通过改属性隐藏差异。

## 维护文档时

用户说明放 docs/user，开发约定放 docs/maintainers，旧实验/说明/非冻结报告放 docs/archive。版本迭代与哈希绑定原始证据保留既有位置，别批量按扩展名搬迁。只保留一个历史目录页和根导航；搬迁修链接并记录来源，不新增重复状态库。原路径映射见 [relocations.json](../archive/relocations.json)，原始字节也可按基线 Git 提交追溯。


## 双宿主安装器维护

0.9.3 的显式共存参数、schema 1/2 迁移、删端/回滚边界见 [双宿主计划](../../planning/DUAL-HOST-PLAN.md) 和 [安装说明](../user/install.md)。状态解释收敛到 `tools/installer/state.mjs`，共享运行时安装 `runtime.mjs`、`state.mjs`、`files.mjs` 与生成的 doctor/launcher；不要把两端各写一份独立状态。单端 JSON 输出继续保留 `host`，双端只用 `hosts`。

构建前的预检不能替代提交前预检。独立反例已证明构建期间的用户改动会形成覆盖窗口；提交前重核状态、全体托管文件与当前共享 release，备份/写入阶段再核字节，失败保留诊断。恢复先核对备份旧状态或已提交的 after 状态，不仅凭 transaction 是否相等判断。

默认 installer 回归包括 `tools/installer/tests/*test.mjs`。真实 Windows 分发包验证单独运行 `tools/installer/tests/native-windows.mjs <已核对旧源码> <新的自有_verification目录>`；它明确执行 full 构建并下载锁定依赖，不作为普通单元测试隐式触发。所有目录、缓存和临时文件应位于获准的项目内。并发 doctor 的假 CLI 反例只证明检查逻辑，不算真实 full 或模型调用。

## 0.9.4 试点候选回归
本轮计划与17项对照见 planning/TRIAL-FIXES-20261020.md；从目标项目调用源码 launcher 时，测试 fixture 的工作目录必须显式设为该项目。trial.test.mjs 验证 v2 与保留的 v1 边界；原生测试目录通过 FF_TEST_ROOT 指定 E 盘，避免产生 C 盘构建/测试产物。只在干净导出中打包和运行安装器回归，不能将 .build/.bootstrap 或 Git 元数据装入 payload。

## 0.9.6 需求闭环维护

[INTENT-LOOP.md](INTENT-LOOP.md)是需求闭环的维护源，十个接线技能内的 references/intent-loop.md 为独立安装同源副本；[USE-FEEDBACK.md](USE-FEEDBACK.md)同步到 Deliver/Handoff/Retro 及可独立收尾的 Diagnose/TDD/Research/三个Writing技能；十个闭环技能同时在契约内获得最短规则。修改只在维护源定义后同步，安装包内不依赖跨技能路径。`python -X utf8 tools/workflow/test_intent_contract.py` 检查副本、引用和合成关系结构，仅属静态格式检查，不是模型行为测试。新增合成场景与真实宿主验证边界见[本轮记录](../../iterations/0.9.6-intent.1/README.md)。

## 元能力的独立演进原则

用户2026-10-30明确：元能力抽象为独立skill，允许单个版本迭代。流程skill只按需引用，不复制元能力正文。ff-diagram先实行独立0.1.0版本、变更记录、测试与本地参考；本轮不重构其他19技能。

版本登记是内容版本契约，不冒充升级能力。全包安装器要求完整清单，事务把缺失受管文件视为删除，且各SKILL追加全包绑定；不得仅过滤payload模拟单项升级。新增update-skill v1复用原事务，保留未选受管文件，只允许已安装ff-diagram独立更新并记录pin；不改原runtime/version/sourceHash，不新增第二所有权表。旧库存首次新增仍需完整迁移。参见[命令与边界](../user/update-skill.md)，独立目录复制验证只能证明自包含，不代替更新/回滚测试。
