# 独立共存复测脚本

在已构建 FF repo 与已构建官方 OpenSpec 1.14.2 baseline 的 Linux 环境运行。需要 Node、npm、Python 3；不从网络安装依赖，不做全局安装。测试仅写新建临时合成项目和指定输出/coverage目录。

环境变量：
- FF_REPO：FF仓库绝对路径，包含 tools/openspec/ff-spec.mjs 与已完成 .build。
- FF_OFFICIAL_ROOT：官方源码已构建根目录，包含 package.json、bin/openspec.js 与 dist。
- FF_AUDIT_OUTPUT：JSON结果目录；默认脚本目录。
- FF_AUDIT_COVERAGE：V8覆盖目录；默认使用本轮新建临时 fixture 中的 coverage 子目录。每个新构建必须使用干净的新目录，不混入旧构建覆盖。

执行顺序：
1. 设置上面四个环境变量（FF_REPO 默认从脚本位置解析仓库，FF_OFFICIAL_ROOT 必须显式提供）。
2. python retest-rc3.py
3. python retest-rc3-store.py

第二个脚本读取第一步生成的 rc3-results.json，复用其临时HOME/XDG隔离环境。再次完整复跑应先执行第一个脚本产生新fixture；不要仅重跑store脚本向已注册目录重复setup。记录每个完整命令、stdout/stderr、退出码。第一脚本检查退出码，第二脚本还检查store隔离与修复提示。报告中的额外语义和字节不变断言已在最终实际结果上执行。

本测试模拟已有官方PATH与项目本地node_modules/.bin，不执行真实全局安装。Windows应另做宿主原生验证，不能把Linux模拟当成通过。
