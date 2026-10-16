# 0.6.0-experimental.4 项目内安装实验

基线：已冻结 0.6.0-experimental.3；未改变 main 0.4.1 或 0.5，不部署，不启用 CodeGraph。

## 变更
- 新增 installer.mjs 与 tools/installer：项目级 Codex/Claude 17技能安装、固定 CLI 绑定、doctor、同版本重入、所有权冲突检查、事务备份、升级/rollback/recover。
- full 显式 --build 从原固定 OpenSpec 源码/补丁/锁文件联网构建；skills-only 明确 BLOCKED，无官方 CLI 回退。
- 新增中文项目内安装指南、计划、真实单测、独立流程/硬终止恢复/full验证、同代码V8覆盖率与CRAP报告。
- 技能元数据版本更新为 experimental.4；原技能业务语义与 FF 上游补丁不变。
- 隐私扫描加强引号键名及递归 JSON/JSONL 字符串解码；发布包保留历史记录及去标识语义。

## 已测与限制
Linux 真实临时项目通过两种项目宿主目录、中文空格路径、文件冲突/篡改、软失败与真实SIGKILL恢复、受控版本fixture升级/回滚、项目搬动、官方命令PATH碰撞fixture隔离（未安装真实官方包）、联网full构建与实际CLI help/init/list。两次独立full冷构建成功，239个锁定依赖；并非离线包。

42个生产实现函数均有真实V8观察；CC由ESLint测得。加入真实full doctor覆盖后最大CRAP 18.01，全部<=50，5项高于目标10，保留为改进债务，不称最优。V8范围覆盖不等价于Istanbul语句/分支覆盖。详情 validation/installer/crap.json。

Windows原生、真实Codex/Claude宿主发现/调用、掉电fsync一致性未验收。不提供卸载/自动清理，不修改spec/policy或审批回执。local doctor只验证runtime；包内doctor额外检查管理文件所有权。
