# 0.6.1 候选验证记录

基线见 planning/ROADMAP-061-09.md。17技能能力保留；本轮将包版本/清单静态验证改为读取 package.json 的同一版本，避免后续每版硬编码漂移；旧版本证据不重写。

安装测试：node --test tools/installer/tests/*.test.mjs，32/32通过。包含冷安装、中文空格路径、重复安装、用户文件冲突、升级回滚及故障恢复。Claude条目仅验证安装布局，未运行Claude模型；Windows项为Linux上mock，不等于原生Windows验证。skills-only的运行时BLOCKED是预期防误报行为，不能宣称完整OpenSpec运行时已通过。

业务模型实验与独立审核：等待本轮实测证据，尚未收口。

## 2026-10-17补充，历史记录不改写
独立业务审核见 independent-business-review.md。新项目11/11独立复跑，GUI PARTIAL、CRAP NOT_MEASURED；旧项目真实8项red→green和4条公共API旅程完成，独立快照/归档核验通过，但无正式中断前handoff、journey执行回执缺脚本摘要。业务实验可在此限定范围收口，不能宣布应用全部验收。两实验为基线技能正文有限沿用（17技能仅版本变化），不是候选安装后重跑。Claude/原生Windows/真人验收未跑。旧项目完整证据另包交付，未将原目录绝对路径当用户可访问链接。
