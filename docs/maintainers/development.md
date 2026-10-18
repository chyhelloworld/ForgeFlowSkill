# 开发与维护

先读 [当前能力](../user/capabilities.md)、[路由约定](../../ROUTING.md)，核对 Git 分支、dirty/untracked、当前需求与授权。文档整理不授予业务改动、发布、部署或升级其他项目安装的权限。

## 目录与约定

| 位置 | 用途 |
| --- | --- |
| `skills/` | 17 项技能，保留 SKILL.md、agents/openai.yaml、references、NOTICE 与 LICENSE 的发现/依赖布局 |
| `tools/installer/`、`installer.mjs`、`bin/` | 安装、打包与项目内运行入口 |
| `tools/openspec/` | 固定 CLI 来源、构建和补丁；[来源与构建说明](../../tools/openspec/README.md) |
| `docs/user/` | 安装、能力/场景与可选方法；中文主手册/离线 HTML/图源为兼容现有脚本保留在 docs 根 |
| `planning/`、`iterations/` | 既有计划和按版本迭代记录；不是当前授权的替代品 |
| `validation/`、`evidence/`、`provenance/` | 历史原始运行、指标与来源快照，保持路径和字节；[证据目录](../archive/README.md) |

[生命周期契约](SPEC-LIFECYCLE.md)与[旧状态迁移](../../MIGRATION.md)保留原基线版本标识，描述 FF 原生门禁和兼容边界；已安装项目业务入口用 `.forgeflow/ff-spec.mjs`，源码构建入口用 `tools/openspec/ff-spec.mjs`。不要把迁移文档的旧版本号当当前包版本。

ROUTING、根 CHANGE-MAP 和 tools/openspec/README 同样保留来源/实验基线标识；ROUTING 的十二个工作流职责加五项可选方法合计17技能。当前安装入口和验证边界以[安装页](../user/install.md)为准，不能用这些旧版本标识覆盖当前包事实。

Codex Goal 隔离候选的唯一契约是 [CODEX-GOAL-BRIDGE.md](CODEX-GOAL-BRIDGE.md)。五个接入技能中的 `references/goal-bridge.md` 必须与它逐字节相同且由各自 SKILL 条件路由；安装后不依赖仓库文档路径。包版本与全部技能 metadata 同步，原 CLI 固定版本不变；原生实验和模拟行为不能互相替代。候选冻结后若再改源文件，须重新打包、核对哈希并重做受影响验证，不能改签既有安装证据。

## 验证入口

在已核对源码根目录运行。Python 使用 UTF-8；临时目录、覆盖率、缓存与测试回执放源码外的项目内交接目录，避免写进 payload。

```powershell
python -X utf8 tools/validate_package.py .
python -X utf8 tools/test_validate_package.py .
python -X utf8 -m unittest discover -s tools/workflow -p "test_*.py" -v
node --test tools/installer/tests/*.test.mjs
python -X utf8 docs/build_manual_html.py
python -X utf8 docs/check_guide.py
```

Windows PowerShell 不一定展开原生程序的 `*.test.mjs`；该 Node 命令需要传入实际文件列表，可用 `node --test (Get-ChildItem tools/installer/tests/*.test.mjs).FullName`。按改动选择检查，别为文档调整重跑无关业务。Windows symlink 权限不足要记 SKIP/NOT_RUN，不能变为 PASS；失败现场保留。缺少同版函数复杂度/覆盖率时标 NOT_MEASURED，CRAP 硬上限50、目标约10。

## 文档与打包

修改中文主手册后重新生成 HTML 并运行 guide 检查。不移动手册、docs脚本或图源以打断已有 `iterations/0.9/ui_capture.py` 路径；旧截图仍属于原冻结源码，本次 HTML 改动不能继承旧视觉验收。

维护者显式执行 `python -X utf8 tools/installer/pack-release.py` 重新生成 MANIFEST/payload/校验文件，不能只改文档而留下旧包。脚本不由 npm 生命周期自动运行。现有 packer 不过滤 Git worktree 的 `.git` 指针文件；从不含 Git 元数据/缓存的干净源码导出打包，并核对文件清单，不修改源或绕过验证。

新包核对版本、17技能、全部 manifest 文件、tar 条目/校验和、相对链接和实际安装入口。full需要固定依赖网络，失败保留原始结果；可分别报告 skills-only 的限域验证，不将其说成 full READY。主分支合并、版本发布和生产操作各需相应授权。

0.9.2-goal.1 暴露了实际的提交前打包缺陷：工作区 CRLF 字节进入 manifest，但 Git 按 `.gitattributes` 提交为 LF，检出后完整性失效。0.9.2-goal.2 在保留原候选与回执后用 `write_bytes` 修正预期文本字节并重新冻结。打包前对清单文件比较 `git hash-object --path=<相对路径> <文件>` 与 `git hash-object --no-filters <文件>`，必须一致；再生成并复核 manifest/payload，不能把换行警告当无害。已有 `-text` 原始证据保持原字节，不批量归一化历史记录，也不通过改属性隐藏差异。

## 维护文档时

用户说明放 docs/user，开发约定放 docs/maintainers，旧实验/说明/非冻结报告放 docs/archive。版本迭代与哈希绑定原始证据保留既有位置，别批量按扩展名搬迁。只保留一个历史目录页和根导航；搬迁修链接并记录来源，不新增重复状态库。原路径映射见 [relocations.json](../archive/relocations.json)，原始字节也可按基线 Git 提交追溯。
