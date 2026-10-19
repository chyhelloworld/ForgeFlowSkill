# 本轮逐函数测量的最小复现工具

三个 `.mjs` 从独立测量目录逐字节保存，未重写本次 capture 的原路径或哈希。完整报告和原始 V8 数据在外层工作空间 `_verification/093-dual-host-20261019/`；公开精简版 [function-metrics.json](../function-metrics.json) 保留完整报告哈希、capture/raw 哈希清单、各函数精确范围、覆盖率和 CRAP，省略重复的逐样本引用。

本次使用 Node 24.22.0 / V8 13.6.233.17-node.57、现成 ESLint 10.12.0 / Espree 11.2.0。脚本不自动安装依赖。`$Dependencies` 指含有该 ESLint/Espree 的 `node_modules` 的父目录；全部输出、临时数据和测试项目必须在获准项目目录内。只测 `installer.mjs` 与 `tools/installer/{install,runtime,transaction,source,state}.mjs` 六个生产模块，包含嵌套函数/回调；未改的 bin/payload/files/build 不在该指标范围。

```powershell
$Repo = 'E:\github\ForgeFlowSKill\worktrees\dual-host-coexistence'
$Evidence = 'E:\github\ForgeFlowSKill\_verification\093-dual-host-20261019'
$Node = 'E:\github\ForgeFlowSKill\_cache\runtimes\node-v24.22.0-win-x64\node.exe'
$Dependencies = 'E:\github\ForgeFlowSKill\_d\store-cwd-185' # 本机已有依赖
$Tools = "$Repo\iterations\0.9.3-dual-host.1\measurement"
$env:FF_TEST_ROOT = "$Evidence\tmp"
& $Node "$Tools\run-with-coverage.mjs" $Repo "$Evidence\new-coverage-run" -- $Node --test "$Repo\tools\installer\tests\dual-host.test.mjs"
& $Node "$Tools\measure-crap.mjs" $Repo $Dependencies "$Evidence\new-metrics.json" "$Evidence\new-coverage-run\coverage-provenance.json"
```

示例仅复现所选用例的测量，不保证达到本次完整回归及独立 probe 的覆盖率。可传多份成功 capture，但必须同一源码、同一受控 Node。迁移机器/路径后重新采集；不能改写旧 capture URL 冒充新结果。采集器前后记录源码 SHA256，并记录原始 V8 哈希；V8 本身不嵌入源码哈希，受控测试必须不临时修改再恢复测量源码。

CC 来自实际 ESLint classic AST；覆盖率是按精确 URL/函数 offset 匹配的 V8 UTF-16 code-unit 与 range-segment 覆盖率较小值，嵌套函数分别计量并从外层分母剔除。它不是 basis-path/Istanbul statement/branch coverage。未观察到映射为 NOT_MEASURED；观察到未调用根范围计数 0 才是真 0。公式为 `CC² × (1-c)³ + CC`，硬上限 50、约 10 为优化目标。低 CRAP 不证明主要流程、宿主模型调用或人类验收。
