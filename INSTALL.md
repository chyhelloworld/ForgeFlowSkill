> 0.6.0-experimental.3：本包在下述12项基线上增加5个独立可选方法，总计17项。可只安装所需入口，保留各自references/agents/NOTICE/LICENSE；未获准时不要全局安装。CLI运行时未改变；新增schema示例须显式选取，见docs/FF-可选方法中文使用说明.md。以下0.5安装与验证记录作为基线保留。

# 安装说明：0.5.0-rc3 云端候选

## 项目本地 FF CLI 与官方 OpenSpec 并存

本包固定 OpenSpec 1.14.2 源码与 FF 补丁，构建包名为 `@forgeflow/ff-spec`、可执行名为 `ff-spec`，用户配置/数据命名空间为 `ff-spec`，项目规格目录仍为 `openspec/`。不建议安装任意 latest 替代。先核对 tools/openspec/README.md 的源码 hash、补丁、锁文件、来源和 MIT 许可证。Node.js 上游最低要求 >=20.19.0；依赖实际引擎约束更高时以构建检查为准。使用官方 Node.js 发行版与 npm 官方注册源；不修改全局 PATH，不替换其他项目 CLI，不启用额外持久访问。

构建还需命令行 Git 与 tar 可用（Windows 的实际可用性需现场核对）。从本仓库根运行 `node tools/openspec/build.mjs`。它在项目工具目录内准备固定 pnpm 与锁定依赖、应用补丁并构建，输出 tools/openspec/.build；详见该目录 README。已有 .build 时脚本拒绝覆盖；核对它仅为可重建输出且无需保留的修改后，可显式加 --clean 重建。构建需要网络获取官方依赖；源码固定不等于依赖可离线安装。拒绝自动更新 lockfile 或改为浮动版本以绕过失败。代理/网络限制应报告实际 blocker。

FF 命令统一使用 launcher：从目标项目根运行 `node tools/openspec/ff-spec.mjs --help`。相对路径示例假定工具就在目标项目的 `tools/openspec/` 下；若 FF checkout 在项目嵌套目录或另一个位置，须使用 launcher 的真实相对路径或绝对路径，工作目录仍是目标项目。不要调用内部构建入口或回退到全局官方 CLI；未构建时先完成上面的本地构建。

Windows PowerShell 示例（路径替换为真实本地路径）：

- `node --version`
- `Set-Location 'C:\path\ForgeFlow'`
- `node .\tools\openspec\build.mjs`
- `$FFSpec = 'C:\path\ForgeFlow\tools\openspec\ff-spec.mjs'`
- `Set-Location 'C:\path\YourProject'`
- `node $FFSpec --help`
- `node $FFSpec status --change YOUR-CHANGE --json`
- `node $FFSpec instructions apply --change YOUR-CHANGE --json`
- `node $FFSpec validate YOUR-CHANGE --type change --strict --no-interactive`

这些是使用说明，未在 Windows 原生执行验证；不承诺终端、Git、tar、路径编码或宿主适配已通过。实际构建要求与错误处理以 build.mjs/README 为准。不要在用户电脑执行，除非另有该环境授权。

使用 FF `init` / `new` 等写项目的命令前，确认目标和既有授权。初始化必须显式使用 `node tools/openspec/ff-spec.mjs init --tools none`（或上述 `node $FFSpec init --tools none`），其他 tools 选择被拒绝；即便目标项目已有官方工具集成，也不会刷新它们。FF `update` 拒绝执行；不要用它安装或更新十二个 FF 技能。需要 FF 时显式创建 openspec/ff-policy.json 并复核 artifact 映射，按 MIGRATION.md 处理旧状态。status/validate 不替代迁移审批，snapshot 只输出指纹，不自动批准。正常 archive 会同步规格，不能拿演示命令直接对真实项目执行。真实取消/拒绝决议可使用显式 --ff-disposition canceled（或 rejected）、--ff-reason 与 --ff-decision-ref 关闭，保留失败历史而不合入规格；完整契约见 SPEC-LIFECYCLE.md。

官方 CLI 只要有文件系统访问权限，仍能操作同一兼容 `openspec/` 树且不会执行 FF gate。这里的命令/配置隔离不构成安全边界；FF 项目应统一使用 launcher 并检查实际 Git diff。不安装全局 FF 包、不覆盖官方命令。

## 十二技能安装

获得指定宿主和技能目录授权后，备份同名技能与用户修改；安装 skills 下十二个 ff-* 文件夹并保留 references、agents、NOTICE/LICENSE。provenance 与工具源码不是宿主技能目录。ROUTING.md 仅在获准的宿主指令中引用；不新增常驻协调器。不能假设斜杠命令自动注册。

先运行 `python tools/validate_package.py .`（Python 3.9+ 与 PyYAML），再核对宿主发现列表、逐个最小加载、相对引用与隔离场景。静态检查、模拟评分和原生安装/调用分别记录。没有自动安装、发布、主分支合并或权限扩大。

回滚保留用户修改并恢复准确安装清单及旧路由。规格状态回滚须按 MIGRATION.md 明确权威源，不能自动重启已退役 Python 写路径或制造两套 current。

## 实验3：可关闭的 CodeGraph 适配器

仅显式启用时辅助静态代码定位，不新增技能或必经门禁。详见 [使用说明](docs/FF-CodeGraph可选适配器.md) 与 [真实试验报告](docs/CodeGraph试验报告.md)。沿用实验2决策索引；旧报告仅代表对应历史版本。
