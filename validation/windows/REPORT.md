# 实验6 Windows安装修复候选验证

本轮在Linux Node 24.19.0/npm 11.9.0验证，原生Windows最终候选待复验。

- 29/29安装器与payload/Windows分支专项测试通过，0跳过；其中12项专项包含真实文件系统边界与模拟Windows平台/子进程。
- 独立8项stage安全检查通过，含替换inode、祖先链接、用户文件保护。
- 真实npm pack/npm exec full冷构建成功（239锁定依赖），中文空格目标目录，doctor READY和本地CLI help成功。
- 62个生产函数（包括本次build.mjs）均有实际ESLint CC和同字节V8范围观察，CRAP最大18.0109，0项超过50，6项超过目标10。V8范围并非Istanbul语句/分支覆盖。
- Windows修复不扩大删除范围：standalone build保留已有bootstrap；cleanup只作用于本次独占创建stage，并在Windows full构建及CLI探测成功后执行；来源已含bootstrap、祖先链接或stage身份改变均拒绝。
- 发布文档/报告冻结会改变manifest，冷构建证据的manifest与最终包不同，生产文件逐字节对应；不声称最终归档同manifest全冷构建。

windows-test.2历史原生证据见windows-test-2-summary.json：full/doctor及Codex app-server发现17技能；不是模型业务调用，Claude未登录。本实验6更改了清理边界，仍需原生Windows最终候选复验。CodeGraph默认关闭。
