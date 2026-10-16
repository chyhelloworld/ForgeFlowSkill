# 实验7变更：Windows 中文路径清理

实验6在 Node 24.12.0 原生 Windows 中文空格路径 full 安装失败，不得发布；失败日志与原包保留。此前版本的 Windows、Linux、CRAP 和宿主发现结果仅代表对应版本。

## 本轮行为

- 新建 staging 的 bootstrap 清理改为 lstat 后逐项 unlink/rmdir，不跟随 junction，删除后检查实际消失。保留 staging dev/ino 所有权、祖先路径与严格 runtime inventory 检查。
- 独立 build --clean 仅清理固定 .build，不跟随 junction，不删除既有 .bootstrap；保留失败诊断。
- 实机 npx 探针发现成功后 source-* 残留；临时解包目录同样使用逐项删除，先核对本轮目录身份及祖先，清理后核对消失；覆盖成功、重入及安装失败路径。
- 打包脚本显式按 UTF-8 读取 manifest；Windows 静态校验统一使用 POSIX 清单路径。中文 Python 静态检查使用 python -X utf8。
- Windows hoisted 依赖布局、cpSync filter 逐项复制和事务安装行为沿用前序设计。博客已安装版本保持不动。
- 更新当前 README、INSTALL 和两份中文安装说明，17项技能及包版本统一为 0.6.0-experimental.7。历史文档与报告不改写为本轮通过。

## 发布门槛

在原生 Windows 重跑回归，以同版新覆盖数据和真实 AST 复杂度测新增/修改函数 CRAP，逐函数不得超过50，目标约10。按 pack-release.py 更新 manifest/payload，再 npm pack --ignore-scripts。核对源码、manifest、payload 和实际 npm 包字节并冻结 SHA256；后续报告放包外。

用精确冻结 tgz 在全新中文空格目录运行 npx full --build、doctor、CLI、同版重入、整体搬迁、Codex 17项技能发现，检查 junction 不越界和临时目录实际清理。失败即保留证据并修复、重新打包复验。

全部通过且隐私扫描通过后，按用户授权上传现有 feat/ff-skills-0.6.0-experimental.3 分支并合入 main，不发布 npm、不新增认证、不强推。提交前后重新核对远端并验证 GitHub 完整提交 SHA 的 npx 安装入口；最终 SHA 与实测结果保存包外回执，不预填未来 SHA。宿主发现不等于模型业务调用，Claude 实际调用未验证。
