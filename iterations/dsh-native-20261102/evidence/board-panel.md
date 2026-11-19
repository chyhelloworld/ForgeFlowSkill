# 只读看板：快照生成器与 DSH Client 面板

日期：2026-11-02
范围：`dsh-plugin/generate-board.mjs`、`dsh-plugin/client.js`、安装器插件清单与 doctor 字段；不含新的 Host 工具、HTTP 服务、数据库或第二状态库。

## 用户需求与方案选择

用户要求“看板界面入口放在侧边栏，可以查看需求、架构、模块、任务进度”。调查确认：

- DSH Client 插件可以通过 `window.__ModuleLoader__.load` 注册 `sidebar.panellist` 与同 id 的 `main` 面板；
- 浏览器半可通过 `remote.workspaceFiles.read(sessionId, path)` 读项目文件，不需要自建 RPC；
- 项目现有数据只有 `planning/intent-view-links.json` 的关系映射（需求 10、模块 14、任务 5、验收 4），没有任务状态，也没有结构化架构模型；`openspec/` 未启用。

选择方案 A：生成器把映射与 OpenSpec 勾选状态汇成 `<workspace>/.forgeflow/board.json` 快照，Client 只读快照。快照是展示层，任务事实仍由原始资料决定；不引入第二套状态、文件监听或自动生成。

方案讨论由 gpt-6-astra（xhigh）在只读条件下给出计划（`_verification/board-20261102/astra-plan.md`），实施遵循其中的契约：`format=ff-board-v1`、未知进度不补零、架构只列参考文档、手动生成、快照与面板更新分离。

## 实现

### `generate-board.mjs`

- 只用 Node 内置模块；CLI：`--workspace`、`--intent`、`--source-root`、可重复 `--architecture-doc`、`--write`、`--help`。
- 默认查找 `planning/intent-view-links.json` 或 `source/planning/intent-view-links.json`，默认输出 `<workspace>/.forgeflow/board.json`。
- 读取映射后先校验：集合必须是数组、条目必须有非空 `id` 与 `ref`、关系字段必须是数组、`baseline_ref`/`source_revision` 必须是字符串或 null；失败只报错并 exit 1，不覆盖旧快照。
- 标题提取顺序：`## ID 标题` heading → 表格第 1 列 → 表格第 3 列 `ID：标题` → 粗体列表；模块找不到 ID 时回退到被引用文件的一级标题，去掉尾部版本号并截短。
- `readProgress` 只读 `openspec/changes/<change>/tasks.md`（排除 `archive`），用围栏感知扫描统计 `[x]/[X]/[ ]`；存在但不可读的 `tasks.md` 抛错，不静默跳过。
- `--write` 内容相同则不重写（幂等，不带时间戳）。

### `client.js`

- 以包名 `@local/forgeflow-dsh` 注册；左侧栏条目 id `ff-board`、order 21、label“ForgeFlow 看板”；主面板是同一 key 的 `main` slot。
- `inject: ['slots','sessions','workspaces','remote','remote.workspaceFiles']`；所有服务通过 `ctx.get` 可选获取，缺少时显示原因而不是抛错。
- 工作区选择：显式选择 → 当前会话 cwd/sessionIds 匹配 → 第一个工作区 → 当前会话 cwd 兜底；会话必须属于所选工作区，不跨工作区借用。
- 读取 `workspaceFiles.read` 后先做结构校验（format、sources、四个集合、architecture.items、tasks.items、progress.done/total/changes），坏快照显示“格式不受支持”而不是渲染崩溃。
- 刷新使用递增序号丢弃过期响应；卸载时使在途请求失效；连续切换工作区不会让旧结果覆盖新选择。
- 四块只读展示：需求、架构参考文档、模块、任务进度；未知进度显示“无可用进度”，不显示 0/total；主题只用实际存在的 `--dsw-alias-*` token。
- `apply` 与两个延迟 `slots.inject` 回调都有 try/catch；注册失败只记控制台，不让异常逃逸阻断 web boot。

### 安装器与文档

- `tools/installer/state.mjs` 的 `pluginFiles` 从 5 个增加到 7 个（新增 `client.js`、`generate-board.mjs`）；`runtime.mjs` 的 `plugin` 增加 `client` 与 `generator` 存在标志。
- `tools/installer/tests/dsh-host.test.mjs` 增加“重装修复旧插件清单”测试：从 state 与磁盘删掉两个新文件后重装，必须恢复并重新记入 state。
- `dsh-plugin/README.md`、`docs/user/install.md` 记录看板生成命令、数据来源与“需重启 DSH”。

## 独立细节审查（gpt-6.1-sol，xhigh）

审查只读 9 个文件，结论“需修复后才能交付”。逐条处置：

| 级别 | 问题 | 处置 |
| --- | --- | --- |
| P0 | factory 的 catch 不覆盖随后执行的 `apply()`，`slots.inject/register` 抛错可能阻断 web boot | `apply` 外层 try/catch + 两个延迟回调 `guarded()` |
| P1 | 连续切换 workspace 时旧读取可能覆盖新选择 | `sequence` ref 丢弃过期响应；卸载失效 |
| P1 | 选中无会话的 workspace 仍借用别处会话，绕过 no-session | `scopeFor` 删除跨工作区借用；无匹配会话即 no-session |
| P1 | 客户端只校验 `format`，坏结构渲染抛错 | 新增 `validateBoard` 与分区错误面板 |
| P1 | 生成器对错误集合静默变空数组、空 ID 仍写快照 | 新增 `validateMapping`；失败 exit 1 不写 |
| P1 | 不可读 `tasks.md` 被跳过，可能累计错误进度 | `readTextStrict`：存在但读取失败即抛错 |
| P1 | 围栏只用布尔翻转，四反引号内三反引号会误结束 | `linesOutsideFences` 记录字符与长度，成对关闭 |
| P1 | 测试缺注册抛错、无会话、竞态、坏快照、RemoteResult、混合围栏 | 全部补进 `board.test.mjs` / `client.test.mjs` |
| P2 | 标题正则 `\s` 可跨行；绝对引用反斜杠；进度未知文案；旧插件清单升级无测试 | 改水平空白、路径统一、文案改“无可用进度”、新增升级测试 |

审查者同时确认：生成器只用内置模块、没有新增第二状态库/HTTP/监听，符合最小改动约束。

## 测试与样例

- 插件测试：`node --test dsh-plugin/tests/{plugin,register,board,client}.test.mjs` → 46 tests / 46 pass / 0 fail。
- 生成器在本仓库生成 `.forgeflow/board.json`：需求 10、模块 14、任务 5、验收 4、架构参考 2 份；`tasks.progress={source:null,done:null,total:null,changes:[],reason:'未启用 OpenSpec（openspec/changes 不存在）'}`。
- 安装器 / 全量回归数字见 `evidence/regression-20261102.md`（本轮新增测试后需重新封包再跑）。

## 边界与未验证项

- **面板视觉与真实加载尚未在用户当前 GUI 验证**：Client 改动需要重启 DSH；本轮只做了 Node 测试（fake ModuleLoader / fake ctx）、`node --check` 与生成器实跑。重启后需实际检查左侧栏入口、四块内容、刷新与多工作区切换。
- 浏览器半依赖 DSH 0.2.1-rc.5 的 `sidebar.panellist`/`main` slot 与 `remote.workspaceFiles` 契约；升级 DSH 可能破坏，已作为已知版本耦合记录。
- 本仓库无 `openspec/`，任务进度只能显示“未知”；接入 OpenSpec 的项目才会显示权威勾选统计。面板不把规划任务与 OpenSpec 任务强行对应。
- 快照是手动生成的，可能落后于源资料；面板显示快照来源，刷新只重读快照，不触发生成。
- 架构区只有参考文档索引，不是结构化架构模型；这是数据现状，不是面板遗漏。
- 评分/验收边界：面板是只读展示，不证明需求被满足或用户已验收。
