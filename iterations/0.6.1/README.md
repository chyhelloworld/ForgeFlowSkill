# 0.6.1 候选验证记录

基线见 planning/ROADMAP-061-09.md。17技能能力保留；本轮将包版本/清单静态验证改为读取 package.json 的同一版本，避免后续每版硬编码漂移；旧版本证据不重写。

安装测试：node --test tools/installer/tests/*.test.mjs，32/32通过。包含冷安装、中文空格路径、重复安装、用户文件冲突、升级回滚及故障恢复。Claude条目仅验证安装布局，未运行Claude模型；Windows项为Linux上mock，不等于原生Windows验证。skills-only的运行时BLOCKED是预期防误报行为，不能宣称完整OpenSpec运行时已通过。

业务模型实验与独立审核：等待本轮实测证据，尚未收口。
