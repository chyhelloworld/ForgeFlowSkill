# 安装说明：0.6.0-experimental.7 Windows 中文路径修复候选

优先阅读 [npx 安装指南](npx安装指南.md) 或 [项目内安装指南](项目内安装指南.md)。实验7尚待最终 Windows 复验；main 可能仍为旧版，固定 Git SHA 只在发布并验证后提供，不能用浮动 main 证明取到了本候选。

## 当前入口

已核对的候选源码或完整解压包可放在独立工具目录；目标项目必须已存在，路径替换为真实值：

```sh
node /path/to/ForgeFlowSkill/installer.mjs install --project /path/to/YourProject --host codex --mode full --build
node /path/to/ForgeFlowSkill/installer.mjs doctor --project /path/to/YourProject
cd /path/to/YourProject
node .forgeflow/ff-spec.mjs --help
```

路径含空格时加引号。`--project` 可以跨目录；安装后的业务命令始终从目标项目 cwd 运行 `node .forgeflow/ff-spec.mjs`。不要把旧版的外置 `tools/openspec/ff-spec.mjs` 示例当作新安装的项目入口。

- full 要求 Node.js >=20.19.0、npm、Git、tar 和获取锁定依赖的网络。`--build` 是显式构建许可，不跳过冻结锁文件或完整性检查。
- Claude Code 改用 `--host claude`；仅技能改为 `--mode skills-only` 并去掉 `--build`。skills-only 的 doctor/CLI 门禁为 BLOCKED。
- 工具源可以与项目分开；外层 npx cache/TEMP 可由用户显式配置，但 full 内层 local-home、缓存和 staging 仍在目标项目。没有完全外置缓存模式。
- 不修改宿主权限、登录、MCP 或全局配置；CodeGraph 默认关闭。不运行 init、不改规格、policy 或批准回执。
- Codex 打开正确目标项目后核对17项技能发现与最小加载，不承诺聊天斜杠命令自动注册。

## Windows 证据与待验项

原实验5发现 pnpm junction 的绝对 staging 目标在 promotion 后失效，以及 Node 24 `fs.cpSync` 在本次中文目录场景遗漏内容。修复使用 Windows hoisted 依赖布局及带 filter 的逐项复制，保留原有链接与完整性检查。

前序本机 `windows-test.2` 的 full 安装和 doctor 已通过；真实 Codex app-server `skills/list` 在主目标项目发现17项技能。见 [Windows 前序试验摘要](../../../validation/windows/windows-test-2-summary.json)。此证据不等于模型业务调用；Claude 未登录，未验证真实调用。实验7进一步将 bootstrap 清理限定到安装器新建 stage，不删除独立源码构建已有的 bootstrap，因此仍需对最终实验7候选重新执行 Windows 安装、promotion 后运行与宿主发现检查。详见 [本轮变更](../changes/CHANGE-MAP-0.6.0-experimental.7.md)。


### 实验6失败与本轮复验

Node 24.12.0 原生 Windows 在中文路径下递归删除可能静默保留目录；实验6本机 full 安装失败，禁止发布。实验7对安装器拥有的新建 staging bootstrap 和独立构建固定 .build 使用不跟随 junction 的逐项删除，删除后检查实际消失；保留 staging 身份、祖先路径及运行时 inventory 校验，独立源码既有 .bootstrap 保持不动。

实验7的回归、逐函数 CRAP、精确 tgz 安装/doctor/CLI、重入、搬迁、临时目录清理与 Codex 17项发现结果保存于包外发布回执。历史 validation/windows 中实验6及更早的报告保留原版本身份，不作为实验7通过证据。冻结包后报告不写回包内；固定 Git SHA 验证完成后另在 GitHub 安装回执提供可复制命令。

## 历史说明

下文保存实验3及更早的来源、并存与手动安装说明；版本号、路径和验证结论属于对应历史版本。新安装使用上面的项目绑定入口。

> 0.6.0-experimental.3：本包在下述12项基线上增加5个独立可选方法，总计17项。可只安装所需入口，保留各自references/agents/NOTICE/LICENSE；未获准时不要全局安装。CLI运行时未改变；新增schema示例须显式选取，见docs/FF-可选方法中文使用说明.md。以下0.5安装与验证记录作为基线保留。

# 历史安装说明：0.5.0-rc3 云端候选

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

以下历史步骤当时未在 Windows 原生执行验证；不承诺终端、Git、tar、路径编码或宿主适配已通过。实际构建要求与错误处理以 build.mjs/README 为准。不要在用户电脑执行，除非另有该环境授权。

使用 FF `init` / `new` 等写项目的命令前，确认目标和既有授权。初始化必须显式使用 `node tools/openspec/ff-spec.mjs init --tools none`（或上述 `node $FFSpec init --tools none`），其他 tools 选择被拒绝；即便目标项目已有官方工具集成，也不会刷新它们。FF `update` 拒绝执行；不要用它安装或更新十二个 FF 技能。需要 FF 时显式创建 openspec/ff-policy.json 并复核 artifact 映射，按 MIGRATION.md 处理旧状态。status/validate 不替代迁移审批，snapshot 只输出指纹，不自动批准。正常 archive 会同步规格，不能拿演示命令直接对真实项目执行。真实取消/拒绝决议可使用显式 --ff-disposition canceled（或 rejected）、--ff-reason 与 --ff-decision-ref 关闭，保留失败历史而不合入规格；完整契约见 SPEC-LIFECYCLE.md。

官方 CLI 只要有文件系统访问权限，仍能操作同一兼容 `openspec/` 树且不会执行 FF gate。这里的命令/配置隔离不构成安全边界；FF 项目应统一使用 launcher 并检查实际 Git diff。不安装全局 FF 包、不覆盖官方命令。

## 十二技能安装

获得指定宿主和技能目录授权后，备份同名技能与用户修改；安装 skills 下十二个 ff-* 文件夹并保留 references、agents、NOTICE/LICENSE。provenance 与工具源码不是宿主技能目录。ROUTING.md 仅在获准的宿主指令中引用；不新增常驻协调器。不能假设斜杠命令自动注册。

先运行 `python tools/validate_package.py .`（Python 3.9+ 与 PyYAML），再核对宿主发现列表、逐个最小加载、相对引用与隔离场景。静态检查、模拟评分和原生安装/调用分别记录。没有自动安装、发布、主分支合并或权限扩大。

回滚保留用户修改并恢复准确安装清单及旧路由。规格状态回滚须按 MIGRATION.md 明确权威源，不能自动重启已退役 Python 写路径或制造两套 current。

## 实验3：可关闭的 CodeGraph 适配器

仅显式启用时辅助静态代码定位，不新增技能或必经门禁。详见 [使用说明](../../user/codegraph.md) 与 [真实试验报告](../reports/CodeGraph试验报告.md)。沿用实验2决策索引；旧报告仅代表对应历史版本。
