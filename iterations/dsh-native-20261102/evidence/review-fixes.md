# 对独立审核 P1/阻断项的修复记录

日期：2026-11-02
审核报告：`_verification/independent-review-dsh-native/report.md`（task-10，结论 FAIL，允许作为候选继续推进）

## 修复对照

| 审核问题 | 位置 | 处理 | 证据 |
| --- | --- | --- | --- |
| 守卫误伤只读 `archive --help`、`--ff-disposition canceled/rejected`，并把引号里的文本当命令 | 报告 5.1 | 重写守卫：按 shell 引号切词 `tokenize()`；只认命令位置（`node`/`npx`/带路径 node、`;&|(` 结尾、单独 `&`）；`echo` 后的同名文本不算；`-h`/`--help` 与 `--ff-disposition canceled|rejected`（含 `=` 形式）放行 | `source/dsh-plugin/index.js` 的 `tokenize`/`isCommandPrefix`/`allowsReadOnlyArchive`/`gateTarget`；`tests/plugin.test.mjs` 三条守卫用例；`evidence/runtime-smoke.md` 真实拒绝证据 |
| `archive|build` 的 `build` 是死分支（真实 CLI 无 build 子命令） | 报告 2.4/5.2 | 删除 `GATED` 正则与 build 分支，守卫只匹配 `archive`；README/install.md 同步去掉 `archive|build` 与 `完整嵌入` 夸大措辞 | `index.js` 常量区；`source/README.md:7`；`docs/user/install.md:50/:61`；`dsh-plugin/README.md:4` |
| “重启后实际挂载、工具可见、守卫生效”未验证 | 报告 2.1 | 用隔离 `DSH_HOME` + 默认 headless 模板 + 本地 mock 模型端点，实际启动 DSH 进程：插件被加载，`ff_status`/`ff_gate` 出现在模型请求 `tools`，四层锚点进入 `system`，`ff_status` 返回状态摘要，守卫实际拒绝 invalid 门禁下的 `archive` | `evidence/runtime-smoke.md`；`_verification/dsh-native-20261102/runtime-*.log`、`mock-request-boot2.jsonl` |
| 四层契约“常驻”只在技能文本里、DSH 无注入 | 报告 2.2 | 插件新增 `FOUR_LAYER_ANCHOR`（L1–L4 信号/动作），`apply()` 向宿主 `systemPrompt` 注册 section（order 240，`anchor:false` 可关；宿主无 systemPrompt 时静默跳过）；运行时冒烟已在请求 `system` 中看到该文本 | `index.js` 的 `FOUR_LAYER_ANCHOR`/`registerAnchor`；`tests/plugin.test.mjs` 锚点用例；`mock-request-boot2.jsonl` |
| 安装器插件集成零专门测试 | 报告 3.4 | 新增 `tools/installer/tests/dsh-host.test.mjs` 两条：选 dsh 时复制 5 个插件文件且逐字节一致、其他宿主不产生；`remove-host dsh` 删除插件、`remove codex` 保留。测试前需先 `update-manifest.mjs` | `dsh-host.test.mjs`；运行结果 8 tests / 8 pass；`_verification/dsh-native-20261102/installer-tests.log` |
| 证据链错误：README:52 指向不存在的日志；regression:17 把 test-validate 首跑 EXIT=1 混入“最终运行” | 报告 2.4/5.3 | README 改指 `final-pack-validate.log` 并说明 test-validate 首跑漏参、单独 sealed 复跑；regression 补同样说明 | `source/iterations/dsh-native-20261102/README.md:52`；`evidence/regression-20261102.md` |
| `register.mjs:2` 头部注释未提链接；插件测试数过期（24/27） | 报告 4.2 | 注释改为“改 package.json 与 cordis.patch.yml，并建立 node_modules/@local/forgeflow-dsh 目录链接”；README 测试数改 29 | `register.mjs:2`；`iterations/.../README.md:49`；`evidence/regression-20261102.md:21` |
| 模板 patch 的 `[]` 哨兵导致 register 后 YAML 解析失败（本轮冒烟新发现，非原审核项） | — | `appendBlock` 在最后有效行为 `[]`/`{}`/`null`/`~`/`---` 时替换该行；`removeBlock` 只剩注释时补回 `[]`；新增两条 register 测试 | `register.mjs` 的 `lastMeaningfulLine`/`appendBlock`/`removeBlock`；`tests/register.test.mjs` |

## 仍未关闭（如实保留）

- **L2 过度防御**：E40 三次重放 c2 仍为 1；不改成长技能文本（继续加机制本身就是 L2 的表现），作为已知限制与后续结构锚点候选保留。
- **四层行为强度**：L1/L3/L4 各 n=1，无基线对照；常驻锚点保证“在场”，不保证模型每次逐条执行；不宣称统计显著或已解决。
- **守卫强度**：仍是 `pwsh`/`bash` 的 `command` 字面量 best-effort，`run_code`、变量拼接等不可拦；且以 `tools/pre-execute` 前置 waterfall 实现，审核建议未来改为同步 `ctx.tools.guard()`（非阻断，未在本次改动以确保行为可复核）。
- **当前 GUI**：真实 `~/.dsh/profiles/desktop` 已注册，但用户当前 GUI 需重启后才加载插件；运行时证据来自隔离实例，不是该 GUI 的重启效果。

## 复核入口

- 插件：`node --test source/dsh-plugin/tests/plugin.test.mjs source/dsh-plugin/tests/register.test.mjs` → 29 pass。
- 安装器：带 `FF_TEST_ROOT` 运行 `node --test source/tools/installer/tests/dsh-host.test.mjs` → 8 pass。
- 运行时：`evidence/runtime-smoke.md` 的命令与 NDJSON 输出可直接复跑（需 mock 端点与临时 `DSH_HOME`）。