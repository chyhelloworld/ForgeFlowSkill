# 插件全局化（0.2.0 / --global）验证记录

日期：2026-11-02 23:00（Asia/Shanghai）

## 动机

0.9.10 的 register.mjs 只把 profile 的 `node_modules/@local/forgeflow-dsh` 链接指向**项目目录**
（`E:/github/ForgeFlowSKill/.forgeflow/dsh-plugin`）。该链接对 desktop profile 的所有工作区生效，
因此本项目被移动/删除时，所有工作区的插件都会加载失败；其他项目也隐式依赖本项目存在。

## 实现（source/dsh-plugin/register.mjs）

- 新增 `--global`：先按 `PLUGIN_FILES`（package.json、index.js、register.mjs、client.js、
  generate-board.mjs、cordis.patch.yml、README.md）逐字节物化到 `<DSH_HOME>/plugins/forgeflow-dsh`，
  再让 profile 链接到该稳定副本。`DSH_HOME` 默认 `%USERPROFILE%\.dsh`，可用 `--home` 覆盖。
- 物化幂等：只在文件缺失或字节不同时写入；被改写的全局副本在下次 `--global` 时自动修复。
- `--remove --global` 只撤销 profile 注册；`--purge` 才删除全局副本。
- 旧版本指向项目目录的链接在 `--global` 时自动替换（仅当目标 package.json 的 name 为 FF 插件，
  即 `@local/forgeflow-dsh`）；外来目录仍拒绝覆盖（退出码 2）。
- 不带 `--global` 时行为不变（仍 link 到 `--plugin` 目录），兼容旧用法与测试。

## 测试

`node --test dsh-plugin/tests/register.test.mjs` → 18 tests / 18 pass / 0 fail（新增 5 例：
物化与链接、幂等与自愈、旧本地链接迁移、remove 保留/--purge 删除、--dry-run 不落盘）。

## 真实 desktop profile 迁移

迁移前：`node_modules/@local/forgeflow-dsh` junction → `E:\github\ForgeFlowSKill\.forgeflow\dsh-plugin`。

```
> node dsh-plugin\register.mjs --global --dry-run --json   # 预览：将替换旧目标 + 物化 7 文件
> node dsh-plugin\register.mjs --global --json             # code 0
```

迁移后：

- junction：`C:\Users\admin\.dsh\profiles\desktop\node_modules\@local\forgeflow-dsh` →
  `C:\Users\admin\.dsh\plugins\forgeflow-dsh`（`Get-Item ... | % LinkType/Target` 实测）。
- profile `package.json` 依赖：`"@local/forgeflow-dsh": "link:C:/Users/admin/.dsh/plugins/forgeflow-dsh"`。
- 全局副本 7 个文件存在；从 profile 目录 `import("@local/forgeflow-dsh")` 解析为
  `forgeflow-dsh`、`inject=["tools"]`、`apply=function`（exit 0）。
- 再次执行 `--global --json`：`changed=[]`（幂等）。

## 边界

- 全局副本是**文件拷贝**而非链接：`source/dsh-plugin` 后续改动需要重新执行 `--global`（或由安装器
  重装后再次 register）才进入全局副本；README 已写明。
- 本次只迁移 desktop profile；其他 profile 需各自执行一次。
- 当前 GUI 进程仍在用旧加载结果，重启 DSH 后才会从全局副本加载（加载路径本身已验证可解析）。
