# ForgeFlow DSH 插件（可选）

把 ForgeFlow 的项目状态与门禁接到 DeepSeek Harness（DSH）里：一条常驻的四层失效自检 systemPrompt 段、
两个只读工具、一个 `/ff-status` 命令，以及 `ff-spec.mjs archive` 的本地守卫。插件零外部依赖，只用 Node
内置模块；它不替代 FF CLI，也不改变 openspec 目录或 FF 安装产物。

## 文件

| 文件 | 作用 |
| --- | --- |
| `index.js` | Cordis 插件入口：注册 `ff_status`/`ff_gate` 工具、`tools/pre-execute` 守卫、`/ff-status` 命令与四层锚点 |
| `cordis.patch.yml` | 插件自带的 loader patch：`- insert: [{ id: forgeflow-dsh, ... }]` |
| `register.mjs` | 把本插件注册进指定 DSH profile（`package.json` 的 link 依赖与 `dsh.profile.bundles`、`cordis.patch.yml` 注册块、`node_modules/@local/forgeflow-dsh` 目录链接） |
| `package.json` | `dsh.bundle.patch` 指向本目录的 `cordis.patch.yml` |

## 注册与撤销

安装器（`--host dsh`）会把本目录复制到项目的 `.forgeflow/dsh-plugin/`；也可以直接用源码目录。

```powershell
# 注册到默认 profile（%USERPROFILE%/.dsh/profiles/desktop）；可加 --dry-run 预览
node .forgeflow/dsh-plugin/register.mjs --profile "$env:USERPROFILE/.dsh/profiles/desktop"

# 撤销注册
node .forgeflow/dsh-plugin/register.mjs --profile "$env:USERPROFILE/.dsh/profiles/desktop" --remove
```

- 改 `--profile` 指定目录下的 `package.json` 与 `cordis.patch.yml`（写前分别备份为
  `<文件名>.bak-<ISO 时间戳>`），并建立 `node_modules/@local/forgeflow-dsh` 目录链接
  （Windows 用 junction）。只有 `--dry-run` 会跳过链接创建。
- 链接已存在且指向本插件目录时视为已注册；指向其他目录时拒绝覆盖（退出码 2），需先手动处理。
  `--remove` 只删除指向本插件的链接，不动外来目录。
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
L2 过度防御复杂度失控、L3 过早接受平庸方案、L4 过早收敛原始问题被替换的触发信号写进每次会话，
不依赖技能文件被读取。它只是一条短自检提示，完整规则仍在 FF 的 INTENT-LOOP 契约与技能文本里；
宿主没有 `systemPrompt.section` 时静默跳过。用 `anchor: false` 可关闭。

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
node --test source/dsh-plugin/tests/plugin.test.mjs
node --test source/dsh-plugin/tests/register.test.mjs
```

测试用 fake ctx 与临时目录，不写真实用户 profile，也不需要 Electron/asar。