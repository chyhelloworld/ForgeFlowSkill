# 需求、模块、任务与验收记录：只读简明视图

在源码 checkout 用 Python 3.10+ 运行，无额外依赖。它读取现有 `intent-links-v1`，不创建状态库、不自动批准需求或改任务。

```powershell
python -X utf8 -B tools/workflow/intent_view.py --root . --index planning/intent-view-links.json --requirement R096-2
```

去掉 `--requirement` 查看所有已索引需求；加 `--json` 获取同一报告及实际读取文件的 SHA256。`--root` 是明确项目根目录，`--index` 为根内相对路径。标准输出可由调用者自行重定向保存；工具自身不写回输入、安装、扫描目录或联网。

本项目索引连接既有 R096-1～6 的规划与本轮真实切片。旧任务没有明确进度引用/稳定验收 ID 时，显示 unknown/索引缺口；这不等于功能不存在或旧工作未完成。R096-2 可看到旧任务与本轮 T-view 并列，判断当前新增范围。

输出中任务 done 只来自原任务复选框；验收的“原记录”不代表证据当前有效。即使记录 PASS，需求验收、用户接受与记录有效性仍为 unknown，须由适用证据和人作判断。原文已陈旧也不会因读取而被重新批准。文件 hash 只证明本次读取的字节，不自动验证依赖/版本或历史执行。退出 0 表示成功生成报告，报告仍可能存在缺口/FAIL；退出 2 表示索引/参数不可用。

输入复用 [intent-loop 示例](../examples/intent-loop-minimal.md) 的字段：requirements/modules/tasks/acceptance、baseline_ref/source_revision。支持单个 JSON 文件或恰好一个 intent-links-v1 的 Markdown `json` 围栏。ref 相对 root，可使用显式 `<a id="ID"></a>`、以 ID 开头的标题、表格第一列 ID、`- ID:` 计划项定位；不是任意 Markdown/GitHub 标题 slug 解析器。

窄格式状态读取：progress_ref 片段内 `- [x] T-ID` / `- [ ] T-ID`；result_ref 片段内 `A-ID=PASS`、`FAIL`、`UNKNOWN`、`PENDING`、`STALE`、`N/A`。同一 ID 的显式记录中只要有不识别、空值或冲突就保持 unknown，不根据自然语言猜测；单独已知 PASS 不能掩盖另一条 NOT_RUN。索引内 status 被忽略并提示。缺文件、空文件、锚点/关系断链、未引用证据都会显示缺口。无有效需求归属的条目以带 ID/原文定位的全局缺口保留，其任务/验收原记录仍显示；需求过滤不会隐藏这些索引缺口。任务/验收缺模块关联也明确提示。

只接受根目录内普通 UTF-8 文件，每文件至多 1 MiB；拒绝越界、绝对引用与可检测的 symlink/reparse 路径。不是原子多文件快照；并发替换、非 Windows 尚未实测。真实 symlink 测试若宿主不能创建会明确跳过，不提升权限。

此切片是源码工具，尚未加入冻结的安装载荷；package 仍标记基础 0.9.6-handoff.1。使用以当前工作分支源码/提交为准，不把旧 payload 视为包含本工具。开发依据及验收见 [规划](../planning/INTENT-VIEW-096.md)，实际结果见 [记录](../iterations/intent-view/results.md)。
