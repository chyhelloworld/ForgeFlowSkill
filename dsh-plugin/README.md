# ForgeFlow DSH 插件（可选）

把 ForgeFlow 的项目状态与门禁接到 DeepSeek Harness（DSH）里：一条常驻的四层失效自检 systemPrompt 段、
两个只读工具、一个 `/ff-status` 命令、`ff-spec.mjs archive` 的本地守卫，以及左侧栏的只读看板。插件零外部依赖，
只用 Node 内置模块；它不替代 FF CLI，也不改变 openspec 目录或 FF 安装产物。

## 文件

| 文件 | 作用 |
| --- | --- |
| `index.js` | Cordis 插件入口：注册 `ff_status`/`ff_gate` 工具、`tools/pre-execute` 守卫、`/ff-status` 命令与四层锚点 |
| `client.js` | Web 客户端半：左侧栏 "ForgeFlow 看板" 入口与只读主面板（需求/架构/模块/任务进度） |
| `generate-board.mjs` | 生成 `.forgeflow/board.json` 快照的唯一写入方；只用 Node 内置模块，可手动重复运行 |
| `cordis.patch.yml` | 插件自带的 loader patch：`- insert: [{ id: forgeflow-dsh, ... }]` |
| `register.mjs` | 把本插件注册进指定 DSH profile：`--global` 先物化到 `<DSH_HOME>/plugins/forgeflow-dsh`，再写 `package.json` 的 link 依赖与 `dsh.profile.bundles`、`cordis.patch.yml` 注册块、`node_modules/@local/forgeflow-dsh` 目录链接 |
| `package.json` | `dsh.bundle.patch` 指向本目录的 `cordis.patch.yml`，`dsh.client` 声明 Web 客户端半 |

## 注册与撤销

安装器（`--host dsh`）会把本目录复制到项目的 `.forgeflow/dsh-plugin/`；也可以直接用源码目录。

```powershell
# 推荐：全局安装（幂等；DSH_HOME 默认 %USERPROFILE%\.dsh，可用 --home 覆盖）
node .forgeflow/dsh-plugin/register.mjs --global

# 仅本项目使用：link 直接指向本目录
node .forgeflow/dsh-plugin/register.mjs --profile "$env:USERPROFILE/.dsh/profiles/desktop"

# 撤销注册（保留全局副本）；加 --purge 连副本一起删除
node .forgeflow/dsh-plugin/register.mjs --remove --global
node .forgeflow/dsh-plugin/register.mjs --remove --global --purge
```

- `--global` 先把本目录的运行文件逐字节物化到 `<DSH_HOME>/plugins/forgeflow-dsh`，
  profile 的 link 指向该稳定副本，因此项目移动/删除不会让所有工作区插件加载失败。
  物化是幂等的：只在文件缺失或内容不同时写入（被改写的全局副本会自动修复），
  `changed` 为空表示已是最新。
- 不带 `--global` 时 link 指向 `--plugin` 目录（默认本目录），适合单项目使用。
- 改 `--profile` 指定目录下的 `package.json` 与 `cordis.patch.yml`（写前分别备份为
  `<文件名>.bak-<ISO 时间戳>`），并建立 `node_modules/@local/forgeflow-dsh` 目录链接
  （Windows 用 junction）。只有 `--dry-run` 会跳过链接创建与物化。
- 链接已存在且指向本插件目录时视为已注册；指向其他目录时拒绝覆盖（退出码 2）。
  `--global` 会替换旧版本指向某个项目目录的 FF 插件链接（仅当目标的 `package.json`
  确为 FF 插件），外来目录仍需手动处理。
- profile 默认 `<DSH_HOME>/profiles/desktop`（`--global` 时也遵守 `DSH_HOME`/`--home`）。
- `--remove` 精确删除注册块、依赖/bundles 条目与目录链接；删除后文件为空则一并删除 `cordis.patch.yml`。
- 不启动、不重启 DSH；**注册后需要重启 DSH 才生效**。
- 缺少 profile 或 `package.json` 时退出码 2。
- `doctor.mjs` 只检查项目内插件副本是否存在，不读取任何全局 profile。

## 工具与命令

- `ff_status`：只读汇总安装版本、模式、门禁、discovery、handshake；优先运行
  `.forgeflow/install/doctor.mjs`，失败时回退 `.forgeflow/ff-spec.mjs status --json`。可传 `project` 参数。
- `ff_gate`：只读检查 `openspec/ff-policy.json` 与各 change 的门禁；`blocked` 列出未通过项，
  没有 openspec 时返回 `disabled`。
- `/ff-status`：与 `ff_status` 同源的命令，宿主没有 commands 服务时自动不注册。

## 四层失效常驻锚点

插件通过 `ctx.systemPrompt.section({ name: 'forgeflow:four-layer', order: 240 })` 把 L1 局部正确整体偏航、
L2 过度防御复杂度失控、L3 过早接受平庸方案、L4 过早收敛原始问题被替换的触发信号注册为提示段，
不依赖技能文件被读取。它只是一条短自检提示，完整规则仍在 FF 的 INTENT-LOOP 契约与技能文本里；
宿主没有 `systemPrompt.section` 时静默跳过。用 `anchor: false` 可关闭。注册成功不等于真实会话已消费，模拟宿主测试只验证注册调用；真实 DSH 加载仍需会话证据。L3 仅适用重大取舍，普通小任务不强造方案比较；目标已确认且无实质变化不重复确认。

## 看板面板（只读）

侧边栏的 "ForgeFlow 看板" 读取项目根的 `.forgeflow/board.json`，显示需求、架构参考、模块与任务进度。
快照不是自动生成的：在项目根运行一次（加 `--write` 才会落盘，重复运行内容不变时不会重写）：

```powershell
node .forgeflow/dsh-plugin/generate-board.mjs --write
# 指定来源（默认自动找 planning/ 或 source/planning/ 下的 intent-view-links.json）
node .forgeflow/dsh-plugin/generate-board.mjs --intent source/planning/intent-view-links.json --source-root source --architecture-doc source/docs/user/architecture-derivation.md --write
```

- 数据来自 `intent-view-links.json`；任务进度只在存在 `openspec/changes/*/tasks.md` 时统计代码围栏外的 `[x]`/`[ ]`，没有 OpenSpec 时显示"权威进度未知"，不会用完成率猜测。
- 默认架构区只列 `--architecture-doc` 提供的参考文档。不从正文推测架构；结构化主干图需显式选择。
- 浏览器半通过宿主的 workspace-files API 读取，需要该工作区至少有一个会话；读取失败、快照缺失（含宿主的 `no entry at` 错误）、格式不符都会在面板里给出中文原因。
- 注册是幂等的：宿主重复 apply 同一客户端插件时，已有的 `ff-board` 侧栏项与主面板会被跳过，不再向控制台报“already has an entry”。
- **客户端插件需要重启 DSH 才生效**；更新快照后点面板的"刷新"即可，无需重启。
- 面板只读：改需求/任务仍走 FF 技能与 `openspec`，插件不写项目文件。

## 可选架构主干图

复用 [Arch-Grower](https://github.com/Tobi1chi/arch-grower)（固定源提交 `e2ebc241`）的泳道、连线和聚焦界面；保留 [MIT 许可](ARCH-GROWER-LICENSE.txt)。不引入它的执行命令、`.arch`、影子 Git 或完成判定。

1. 选择现有项目推演文档。意图索引添加 `architecture_ref: "docs/architecture.md"`，保留非空的 `source_revision`。图只能绑定同一工作区内的这份文档；换目标后更新原记录和绑定，不重用旧图。
2. 在该架构文档中放 **一个** 标注语言名为 `ff-architecture-v1` 的 JSON 围栏。文档正文用于人读，围栏只为绘图；它不能提供新的验收结论。
3. 在项目根生成并打开本地文件（不需要服务、账号或网络）：

   ```bash
   node .forgeflow/dsh-plugin/generate-board.mjs --architecture-graph docs/architecture.md --html --write
   ```

   输出 `.forgeflow/architecture-board.html`。不用 `--write` 时只写标准输出。要更新 DSH 侧栏的图摘要和引用，使用同一命令去掉 `--html`，只写 `.forgeflow/board.json`。侧栏不执行项目 HTML；在本地浏览器打开交互图。独立 HTML 是生成时的快照，不会自动刷新。

字段及样例见 [合成稽查架构文档](../iterations/0.11.0/pilot/architecture.md)：

- `format`、`goal`（当前图标题）、`goal_id`（原目标需求 ID）、`source_revision`（与意图索引一致）、`design`。拟议填 `proposed`；`confirmed` 仍只是来源声明，另需同文档内 `confirmation_ref` 指向确认记录。
- `nodes`：`id`、`label`、`stage`、`ref`、`requirement_ids`、`required`。必需节点必须映射已登记的需求。所有图内引用都是同文档显式锚点，例如 `<a id="R1"></a>` 对应 `"#R1"`。
- `edges`：`from`、`to`、`kind`、可选 `label`。运行关系用 `flow`，允许分支和回路；架构依赖用 `dependency`，不允许循环。`path` 给出顺序，相邻节点必须有 `flow` 边。
- `gaps`：仍未解决的条件与出处（`label`、`required`、`ref`）。标为必需的缺口不会因聚焦或折叠而隐去。没有图、版本不符、引用失配或内容不合法时，退回文档和问题提示，不编造节点。

图只呈现原始目标、拟议关系、缺口、任务勾选及证据引用。完成率不等于验收，零缺口也不构成通过；正式检查与归档仍走 FF CLI 和既有规则。实际业务验收状态不由这个 view 判定。

## 接手没有 FF 索引的旧项目

先做原有 Intake/Diagnose 接手，辨别跑通了什么、哪些只是计划。需要看板时显式选择 `--takeover`，不因缺 FF 索引阻断接手：

```bash
node .forgeflow/dsh-plugin/generate-board.mjs --takeover --architecture-doc docs/current.md --target-doc docs/target.md --html --write
```

- `--architecture-doc` 是现状资料（源码/运行/已有记录的摘要），`--target-doc` 是目标资料。都可省略，缺失显示未知；文档存在不代表当前代码符合它。不要把同一文件同时填两栏。没有索引时只显示现有任务勾选和资料引用，需求及验收保持未知。
- 以后有可追溯意图索引，可在接手模式中加 `--architecture-graph docs/target.md` 查看**目标**主干；不把它当现状图。现状图、当前与目标的结构差，只在有可靠对应证据时才做，0.11 不从源码自动建图或猜差异。
- 去掉 `--html` 可写侧栏快照，分开显示两类资料。不改变原项目、验收和接手流程。

## 守卫的边界（best-effort）

守卫监听 DSH 的 `tools/pre-execute`，只检查 **pwsh/bash 工具的 `command` 参数**：

- 命令按 shell 引号规则切词后，只有命令位置的 `node`/`npx` 调用 `.forgeflow/ff-spec.mjs archive` 才算命中；
  引号里的文本（如 `echo "..."`）不会当成命令。真实 CLI 没有 `build` 子命令，因此不再匹配 `build`。
- 命中且该 FF 确实存在时，先运行 `status --json`；若门禁 `blocked` 或 policy `invalid`，返回 `deny` 并给出中文原因。
- 放行：插件未启用（`enabled: false`）、`FF_ALLOW_UNGATED=1`、非 pwsh/bash 工具、命令不匹配、
  `archive --help`/`-h`、`--ff-disposition canceled|rejected`（文档化的取消/拒绝路径，`=` 形式同样放行）、
  FF 不存在、门禁 disabled/valid、FF CLI 不可用。
- **不能拦截**：`run_code` 等不透明调用（看不到真实命令行）、其他宿主/其他输入路径、直接调用
  `openspec`、或者用变量拼出命令的绕过写法。它是本地提示与防呆，不是安全边界；最终门禁仍由 FF CLI 自己执行。
- 守卫自身异常一律放行，避免误伤正常操作。

## 配置

`cordis.patch.yml` 的 `config` 会整份覆盖，默认值如下；改其中一项时其余项要一起写回：

```yaml
config:
  enabled: true          # false = 关闭守卫（工具仍然可用）
  anchor: true           # false = 不注册四层失效常驻 systemPrompt 段
  guardTools: [pwsh, bash]
  timeoutMs: 15000
  project: null          # 兜底项目目录；通常由会话工作目录向上发现
```

## 测试

```powershell
node --test source/dsh-plugin/tests/plugin.test.mjs source/dsh-plugin/tests/register.test.mjs source/dsh-plugin/tests/board.test.mjs source/dsh-plugin/tests/client.test.mjs
```

测试用 fake ctx 与临时目录，不写真实用户 profile，也不需要 Electron/asar。