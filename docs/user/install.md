# 安装与首次使用

当前工作分支为 **0.9.1 未发布候选**。已获准纳入工作分支不等于 main 合并、生产发布或升级其他项目安装。

## 快速开始：Windows + Codex

工作分支 `work/061-through-09` 已获准纳入 0.9.1，批准范围见[纳入回执](../../iterations/0.9.1/PROMOTION.md)。这不授权升级其他项目的现用安装。先取得并核对选定版本的源码，把下面 `$Source` 改为源码根目录（其中有 `package.json` 和 `bin/ff-install.mjs`）。`$Project` 是你要使用 FF 的目标项目，两者可以不同。已有安装先盘点；[历史布局参考](../archive/installation/项目内安装指南.md)保留当时结构，当前重入/恢复操作以本页为准，不把同版本号的不同包哈希当作相同安装。

先准备 **Node.js >=20.19.0、npm、Git、tar**；三个可选只读检查器还需 **Python 3.9+**。full 构建需要访问 GitHub 和下载构建依赖。以下 PowerShell 示例把项目、外层 npm 缓存和临时目录放在 E 盘；旧项目请将 `$Project` 改为现有项目根目录。

```powershell
$Source = 'E:\tools\ForgeFlowSkill' # 已检出并核对的本仓库源码根目录
$Project = 'E:\projects\my-project'
$Cache = 'E:\forgeflow-cache'
New-Item -ItemType Directory -Force -Path $Project, "$Cache\tmp" | Out-Null
$env:TEMP = "$Cache\tmp"
$env:TMP = $env:TEMP
$env:npm_config_cache = "$Cache\npm"
node "$Source\bin\ff-install.mjs" install --project "$Project" --host codex --mode full --build
Set-Location $Project
node .forgeflow/install/doctor.mjs
node .forgeflow/ff-spec.mjs --help
```

`--build` 明确允许安装器构建本地 CLI。**未发布到 npm registry**；不要假定存在可直接安装的公开 FF npm 版本。原生 Windows full 构建/安装已在 0.8/0.9 冻结提交执行，具体版本与哈希见对应[版本与证据](../archive/README.md)。

安装内容位于项目的 `.forgeflow/` 与 `.agents/skills/`。full 构建的内层缓存和临时数据仍在项目 `.forgeflow/install/` 下；上述外层设置不保证所有系统工具都不写项目外文件。工具源无需复制进每个项目，也不替换全局 OpenSpec。

只要技能、暂不需要 CLI 门禁：将 `--mode full --build` 改为 `--mode skills-only`。此模式的 doctor 和 CLI 会返回 **BLOCKED**。Claude Code 将宿主参数改为 `--host claude`，技能安装至 `.claude/skills/`，其实际宿主调用未验证。CodeGraph 默认关闭。


## 当前验证边界

技能/安装包版本为 **0.9.1**；固定 FF CLI 的 `--version` 为 **1.14.2-ff.0.5.0-rc3**，两者标识不同层次。skills-only 没有可用的 full CLI，不能据此要求版本输出成功。

安装与证据按完整提交、manifest 和 payload 哈希区分，不能只看版本号。71d0464 原候选有 full 构建/CLI 的原生记录；46022d7 文档包的两次 full 构建因 npm TLS 下载失败，仅 skills-only 新包安装/Health 入口通过。此前成功不自动覆盖本次整理后的新包。Codex setup refresh 与 Claude/全平台/人类验收的缺口仍保留。

仅需技能时用 `--mode skills-only`，不要同时加 `--build`。成功状态是 `INSTALLED_SKILLS_ONLY_GATES_BLOCKED`，不是 full READY；17 项技能可分发，FF CLI 门禁不可用。full 依赖网络下载固定构建依赖，不修改锁文件、TLS 或权限来绕过失败。

安装路径是目标项目的 `.agents/skills/`（Codex）或 `.claude/skills/`（Claude），控制与运行目录在 `.forgeflow/`。外层 npm cache/TEMP 可放 E 盘，full 内层缓存仍在目标项目；不承诺所有系统工具完全不写其他位置。

## 重入、回滚与恢复

同一 host/mode/manifest 可返回 `UNCHANGED`；同版本号不同包哈希不代表相同安装。已有安装先盘点并保存用户修改，不手工覆盖技能目录。维护命令从已核对源码运行，`$Project` 为实际目标项目：

```powershell
node "$Source\installer.mjs" doctor --project "$Project"
node "$Source\installer.mjs" rollback --project "$Project"
node "$Source\installer.mjs" recover --project "$Project"
```

后两项会改变安装状态，只在已有相应授权、无运行中的安装且核对诊断后使用；有 lock/pending 或部分输出先检查，不盲重试或删除现场。旧说明的实现细节保留在[历史安装资料](../archive/README.md#历史安装资料)，不作为本版已验收承诺。

安装后的使用请求、实际 CLI/Python 入口见[能力与使用场景](capabilities.md)。源码构建、打包与验证见[开发维护](../maintainers/development.md)。本仓库没有已发布 npm 包，不把历史 npx 指令或浮动 main 当当前工作分支安装来源。
