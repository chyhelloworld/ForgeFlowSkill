# 项目内安装实验计划

## 实验7发布续做（2026-10-16 用户明确授权）

原实验4计划保留为设计基线；本节覆盖当前发布目标和剩余顺序。现有博客保持 experimental.5.windows-test.2，实验6原包/失败现场保留且禁止发布。

1. 对账实验7源码、原生进程、补丁哈希与远端；补齐当前安装文档。修复实测阻塞，不扩大安装器职责。
2. 在 E 盘包外采集本版回归、真实 AST 复杂度及新覆盖数据；新增/修改函数 CRAP ≤50，目标约10。旧报告不得充当本轮结果。
3. pack-release.py 更新 manifest/payload，npm pack --ignore-scripts；逐文件核对源码、manifest、payload、npm 包，冻结 SHA256。冻结后报告放包外。
4. 精确 tgz 在全新中文空格路径进行 npx full --build、doctor、CLI、重入、整体搬迁和 Codex 17项发现；核对 junction 不越界、source/staging/lock 清空、博客前后相同。失败则保留原证据，修复、重打包、复验。
5. 独立 code、plan、goal-mainflow 审核和隐私扫描满足后，重新核对远端，使用已有认证推送现有 0.6 分支并合入 main；不得 npm 发布、ChatGPT 文件库上传、新增认证或强推。
6. 验证 GitHub 完整提交 SHA 的 npx full 安装入口，发布包外安装回执与可复制命令。冻结文档不回填未来 SHA，避免改变已验字节。

本机发现的新增阻塞：npx 解包临时 source 仍使用递归 rm，在中文目录实测退出0但残留；改为本轮独占目录的逐项删除并校验 dev/ino/祖先，补成功、重入及失败清理回归。Windows Python 打包读取 manifest 明确 UTF-8，静态校验的文件名统一 POSIX 形式；这些工具变更另行复验。

版本：0.6.0-experimental.4。冻结 experimental.3 包不改动。

## 最小闭环
- Node 标准库入口 installer.mjs；明确 project、Codex/Claude 项目宿主、full/skills-only 模式。
- 项目内 .forgeflow/ff-spec.mjs 固定入口，绑定完整版本和源 manifest SHA256；17 个技能的命令替换为此路径。不可使用 PATH 中官方 OpenSpec 代替。
- full 要求显式 --build，复用固定源码/补丁/锁文件构建和 ff-build 身份验证，依赖下载需要网络；不宣称离线一键。skills-only 无运行时，CLI 及 doctor 返回 BLOCKED。
- build/doctor/runtime 子进程环境隔离 HOME、缓存、配置与数据到项目 .forgeflow/install/local-home，禁 telemetry；不全局安装或更新安全配置。
- 安装前校验源 manifest 完整内容，拒绝危险路径和源码符号链接；对管理文件校验当前 hash，有用户更改或未管理冲突时停止。
- 版本 release 保留在项目内；安装清单仅管理准确目标文件。备份存每次事务前状态与被改文件，回滚不得删除用户新增文件。
- 事务先写恢复记录，再逐文件原子替换，最后提交 state；异常恢复。硬终止后显式 recover，若发现未归属修改则停机保留证据，无法承诺掉电/fsync 级原子性。
- 升级和 rollback 都先验证当前所有权；同版本校验后无操作。只恢复上个已提交安装，保留历史版本及备份；不扩大到卸载。

## 验收
临时项目、空格中文路径、两个宿主、冲突、失败恢复、重入、升级回滚、官方CLI共存、搬动项目、真实CLI命令；真实逐函数 CC＋同版覆盖率计算 CRAP <=50、目标约10，真实同版覆盖率。Windows 原生及真实宿主发现不具备环境则标记未验收。公开包全量扫描路径/session标识，包含嵌套 JSON。独立计划、代码和测试审核后交父任务发布，不自行 push/merge/deploy。
