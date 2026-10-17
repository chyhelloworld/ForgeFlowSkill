# ForgeFlow 0.6.0-experimental.7：npx 项目内安装

实验7是 Windows 中文路径修复候选，尚待最终 Windows 复验。无需 npm 账号，不发布 npm registry 包。唯一安装器命令为 `ff-install`；安装后的项目 CLI 为 `node .forgeflow/ff-spec.mjs`，不替换全局 OpenSpec。

## 安装来源与一条命令

以下命令从目标项目根执行，仅在本版本合入 main 并核验后用于获取实验7：

```sh
npx --yes --ignore-scripts --cache ./.forgeflow/npm-cache --package=github:chyhelloworld/ForgeFlowSkill#main ff-install install --project . --host codex --mode full --build
```

`#main` 是浮动源，目前可能仍是旧版，不是实验7的固定引用。可重现安装应将 main 换成发布回执中实际验证的完整 Git commit SHA；本文不填尚未发布的 SHA，也不把本地测试等同于远端固定 commit 端到端验证。发布前请使用已核对的候选源码或完整包，参见 [项目内安装指南](项目内安装指南.md)。

Claude Code 使用 `--host claude`。仅技能使用 `--mode skills-only` 并去掉 `--build`，此时 CLI 门禁为 BLOCKED，不得称为完整可用。必须显式选择宿主和模式；CodeGraph 默认关闭，不修改宿主权限、MCP、登录或全局配置。

## 跨项目安装与目录位置

`--project` 接受另一处已存在的项目目录，不要求安装器源与目标项目位于同一目录。相对 `--project` 和 `--cache` 都相对当前终端目录解析，跨项目时建议用带引号的绝对路径。

例如 Windows PowerShell，在本版本合入 main 后，可从任意工作目录执行：

```powershell
npx --yes --ignore-scripts --cache 'D:\ForgeFlowCache\npm' --package=github:chyhelloworld/ForgeFlowSkill#main ff-install install --project 'E:\projects\中文 项目' --host codex --mode full --build
Set-Location 'E:\projects\中文 项目'
node .\.forgeflow\install\doctor.mjs
node .\.forgeflow\ff-spec.mjs --help
```

这里仍使用浮动 main 演示参数位置；正式复现要换成同一发布回执中的固定 SHA。如果使用下载的工具源，它也可以单独放在 `D:\tools\ForgeFlowSkill`，再以 `node ...\installer.mjs --project ...` 安装，无需把源码放进目标项目。

目录分为三层：

1. 工具源：npx 获取的包位于其缓存；手动下载的完整源码或包可放独立目录。
2. 外层缓存/临时目录：`--cache` 可显式指定 npm/npx 缓存；用户也可在调用前显式设置当前进程的 TEMP/TMP（POSIX 环境可用 TMPDIR），并确保目录存在、可写。相对缓存路径不会自动跟随 `--project`。
3. 目标项目内运行数据：full 安装的 `.forgeflow/install/local-home`、内层依赖缓存、payload 解包目录与 staging/release 仍在目标项目下。内层构建会设置项目本地 HOME、缓存和临时目录，不沿用外层 TEMP 指定的位置；当前没有将这些全部迁出项目的选项。

因此支持工具源和外层 npx cache/TEMP 分离，不支持完全缓存分离。不要把 `.forgeflow/` 内的缓存、构建与本地安装状态提交到项目版本库。不承诺 npm、Git、系统或用户既有配置绝不写外部文件；严格隔离须在沙箱中验证这些工具。

## 依赖与安全边界

- Node.js >=20.19.0、npm；GitHub 获取入口需要网络和 npm Git transport 所需的 Git。full 另需 Git、tar 与下载锁定构建依赖的网络，不是离线一键包。
- `--ignore-scripts` 禁止 npm 自动 prepare/install/postinstall 等生命周期脚本。只有安装器显式 `--build` 才构建运行时，不自动改锁文件以绕过失败。
- 安装目录为 `.forgeflow/` 与宿主技能目录 `.agents/skills/` 或 `.claude/skills/`。安装器不执行 init、不更改项目 specs、policy 或批准回执。
- Windows 依赖构建使用 pnpm hoisted 布局，避免原默认布局留下指向 staging 绝对路径的 junction；目录复制通过 `cpSync` filter 逐项复制，规避本次 Node 24 中文目录遗漏。原有链接、路径与完整性检查不放松。
- 实验7把构建 bootstrap 清理限定在安装器本轮新建 stage 内；独立源码构建已有的 bootstrap 不被此清理删除。最终实验7仍须复验，不能只凭修复设计声称可用。

## 检查、重入与回滚

安装后先切换到目标项目根：

```sh
node .forgeflow/install/doctor.mjs
node .forgeflow/ff-spec.mjs --help
```

要检查安装所有权，使用与安装相同、已核验来源的包。例如下列浮动 main 示例也必须在本版本合入后使用，复现时全部替换为相同的已发布固定 SHA：

```sh
npx --yes --ignore-scripts --cache ./.forgeflow/npm-cache --package=github:chyhelloworld/ForgeFlowSkill#main ff-install doctor --project .
npx --yes --ignore-scripts --cache ./.forgeflow/npm-cache --package=github:chyhelloworld/ForgeFlowSkill#main ff-install rollback --project .
```

- 相同来源、宿主和模式重入，完整校验后应返回 UNCHANGED；用户修改或未管理同名文件会阻塞。
- rollback 需要前一安装状态；初次安装不能回滚到不存在的旧版本，也不能把它当卸载。它不回滚 specs、代码、policy 或批准。
- 中断恢复使用同一来源的 `ff-install recover --project PATH`。有锁时先确认没有安装器运行，再按错误提示仅处理空锁目录，不要删除仍被占用的锁。
- 包内 `ff-install doctor` 额外校验管理文件所有权；项目本地 `doctor.mjs` 校验固定运行时并调用 help，不判断技能是否被编辑。READY 只表示本地 CLI 可运行，不代表业务门禁、模型调用或用户验收。

## Windows 与宿主验证状态

原实验5在 Windows 发现 pnpm junction 的绝对 staging 目标在 promotion 后失效，以及 Node 24 `fs.cpSync` 在本次中文目录场景遗漏内容。

前序本机 `windows-test.2` 已完成 hoisted 与逐项复制修复，并通过 full 安装、doctor；真实 Codex app-server `skills/list` 在主目标项目发现17项 FF 技能。见 [Windows 前序试验摘要](../../../validation/windows/windows-test-2-summary.json)。这只证明该试验版的安装、CLI 与宿主发现，不是模型业务调用。Claude 未登录，未验证真实调用。

实验7另外调整了 bootstrap 清理归属，最终候选仍需 Windows 复验，包括中文/空格路径安装、promotion 后 CLI/doctor 与真实宿主发现。历史 [实验5 npx 报告](../../../validation/npx/REPORT.md) 的 Linux、Node 24/npm 11 测试只能证明对应历史版本，不能替代本候选验收。

Codex 使用时打开正确的目标项目，再核对技能发现和最小加载；不承诺聊天斜杠命令自动注册，也不为完成测试而修改登录、权限或 MCP。

## 打包与完整性

Git 仓库保留完整源码与源码 MANIFEST；npm pack 只携带最小 bootstrap 和固定 SHA256 的完整 `forgeflow-payload.tgz`。payload 保留 npm 通常过滤的 .gitignore 和 package-lock 等原字节。解码只允许常规文件，拒绝路径穿越、链接/特殊文件、重复条目、截断与尾随数据；写入和执行前严格核对 payload manifest 全成员全 hash。摘要用于完整性而非身份签名，信任仍来自已核对的仓库和 commit。

发布准备脚本 `python tools/installer/pack-release.py` 只供维护者显式执行，绝不由安装调用。MANIFEST 不索引自身和生成的 payload/hash 两个封装文件，从而无自引用；payload 自带完整源 manifest。源码或文档修改后需重新准备、npm pack，并核验实际产物。详见 [实验7变更](../changes/CHANGE-MAP-0.6.0-experimental.7.md)。

### 实验6失败与本轮复验

Node 24.12.0 原生 Windows 在中文路径下递归删除可能静默保留目录；实验6本机 full 安装失败，禁止发布。实验7对安装器拥有的新建 staging bootstrap 和独立构建固定 .build 使用不跟随 junction 的逐项删除，删除后检查实际消失；保留 staging 身份、祖先路径及运行时 inventory 校验，独立源码既有 .bootstrap 保持不动。

实验7的回归、逐函数 CRAP、精确 tgz 安装/doctor/CLI、重入、搬迁、临时目录清理与 Codex 17项发现结果保存于包外发布回执。历史 validation/windows 中实验6及更早的报告保留原版本身份，不作为实验7通过证据。冻结包后报告不写回包内；固定 Git SHA 验证完成后另在 GitHub 安装回执提供可复制命令。

