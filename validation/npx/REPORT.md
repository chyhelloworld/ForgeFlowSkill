# 实验5 npx 验证

Linux Node 24.19.0 / npm 11.9.0。

- 真实 npm pack 后通过 npm exec 和 npx 缓存内 .bin 符号链接调用，不是 node 直跑冒充。
- 中文/空格项目路径、Codex skills-only、新装及同包重入、doctor正确BLOCKED。
- 13项既有安装回归+4项新增严格payload解码测试共17项，无skip。
- 独立升级、失败保留、回滚、recover等7条检查见 independent-flows.json。
- 52个当前生产函数全部实测CRAP，最大18.0109，0项超过50，5项旧安装器函数超过目标10；全部新增bin函数均<=10。方法是ESLint真实AST CC与精确字节匹配V8范围覆盖，不能冒充Istanbul分支覆盖；详见crap.json。
- npm源码payload排除封装文件自身与manifest自身索引，所有源码成员保持原始hash。
- full冷构建一度因执行环境审批review取消在依赖下载阶段中断，该次不计通过。独立授权重试已通过真实full冷构建、npm exec doctor READY及本地launcher，见independent-full.json和full-build.log；较早代码候选payload用于冷构建，修正后decoder用于doctor，未冒充最终归档同字节全构建。
- Windows、真实宿主技能发现/调用和最终GitHub固定commit入口尚未在此记录验收；发布流程负责远端固定commit端到端。

覆盖率样本包含同字节安装器对实验4已构建项目的doctor探测；不代表实验5full构建成功。报告生成与文档最后冻结导致manifest hash可能变化，生产文件hash以crap.json为准；最终包另做全manifest核验与烟测。
