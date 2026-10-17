# 旧 README 的固定安装重放参考

来源为整理前 46022d7 的 README，保留 0.6 固定 SHA 示例；不能用于取得或验收当前 0.9.1。

## 历史安装参考（0.6，不能获取 0.9）

以下固定 SHA 和 [PR #1](https://github.com/chyhelloworld/ForgeFlowSkill/pull/1) 留作历史重放。`--ignore-scripts` 禁止 npm 自动执行生命周期脚本；只有显式 `--build` 才允许 FF 安装器构建本地 CLI。不要用此命令安装或验证当前 0.9。

```powershell
$Project = 'E:\projects\my-project'
$Cache = 'E:\forgeflow-cache'
New-Item -ItemType Directory -Force -Path $Project, "$Cache\tmp" | Out-Null
$env:TEMP = "$Cache\tmp"
$env:TMP = $env:TEMP
Set-Location $Project

npx --yes --ignore-scripts --cache "$Cache\npm" --package=github:chyhelloworld/ForgeFlowSkill#46d76a2374543fdb01018d3f5287a4df183d2e83 ff-install install --project . --host codex --mode full --build
node .forgeflow/install/doctor.mjs
node .forgeflow/ff-spec.mjs --help
```
