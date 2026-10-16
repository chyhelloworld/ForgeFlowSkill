# 实验6变更：Windows 修复候选

## 修复范围

- 原实验5在 Windows 暴露 pnpm junction 指向 staging 绝对路径、stage 晋升 release 后失效的问题。Windows 构建改用 pnpm hoisted 布局，保留锁定依赖与忽略生命周期脚本策略。
- 原实验5还发现 Node 24 `fs.cpSync` 在本次中文目录场景遗漏内容；目录复制通过 filter 逐项执行，原有源校验、链接检查、路径边界与完整性门禁不放松。
- bootstrap 清理归属安装器本轮新建的 stage，仅清理该 stage 中的构建 bootstrap；不在独立 build 中删除既有 bootstrap，不清理独立源码目录中的用户已有构建状态。
- 沿用实验5的唯一 npm bin `ff-install` 与实验4事务安装器。full 显式 `--build`，项目业务入口保持 `node .forgeflow/ff-spec.mjs`；CodeGraph 默认关闭，不改宿主权限、MCP、登录或全局配置。

## 文档与使用边界

- 更新 README、INSTALL、npx 安装指南与项目内安装指南，统一实验6候选身份，并保留历史证据的版本边界。
- `--project` 可指定独立项目路径；工具源可单独存放。外层 npx cache/TEMP 可由用户显式指定，full 内层 local-home、缓存、payload 解包和 staging 仍在目标项目，不支持完全缓存分离。
- 安装后从目标项目 cwd 运行 `node .forgeflow/ff-spec.mjs`。Codex 打开正确项目后核对技能发现，不承诺聊天斜杠命令自动注册。
- main 是浮动源，目前可能仍为旧版；固定 Git commit SHA 仅在发布并验证后提供，不预填假 SHA，不用本地测试替代远端固定 commit 验证。

## 已有证据与实验6待验

[Windows 前序试验摘要](validation/windows/windows-test-2-summary.json) 对应本机 `windows-test.2`：hoisted 与逐项复制修复后 full 安装和 doctor 通过；真实 Codex app-server `skills/list` 在主目标项目发现17项 FF 技能。这不是模型业务调用。Claude 未登录，未验证真实调用。

实验6额外改变了 bootstrap 清理归属，以上历史证据不能直接作为最终实验6的 PASS。最终候选仍需 Windows 安装与构建、中文/空格路径、promotion 后 CLI/doctor、项目搬迁、重入与真实宿主发现复验，并绑定实际候选/发布产物。模型业务调用及 Claude 宿主验证尚无通过结论。

实验4/5的 Linux 安装、npm 入口、安全测试与独立审查保留为原版本历史证据；本文件不宣称实验6已通过最终 Windows 验收、发布、main 合并或部署。
