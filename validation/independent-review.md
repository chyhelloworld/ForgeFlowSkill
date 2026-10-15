# ForgeFlow 0.5.0-rc1 独立复核

2026-10-15 UTC。当前结论：下述范围内的生命周期守卫和真实云端主流程复核通过；最终包静态验证与修复后全新接手证据均已核实，当前检查范围无未解决阻塞。本报告不代表用户接受、安装或发布批准。

## 独立性、版本与范围

本审核代理独立于实现者及云端测试作者，只读审查技能包，独立测试仅写临时夹具及 validation 交付物。一名真正独立审核者分别覆盖 plan、goal-mainflow、code 三轴，未冒充三位审核者。基线是 0.4.1-rc1，阅读旧 Spec、Review、Routing、前轮复核及候选差异。

实测生命周期工具 SHA256：`e69f6ac8190be04ad0a127bb0d0b72ff9ead7fa66101c4e1d385c3a0b3e4e2a5`。测量及动态结论仅适用于此版本。

## Plan：通过（本轮增量）

保留原十二技能按需路由、目标/预算/权限边界与独立审核。新增 current / active delta / archived 三类视图，稳定需求 ID、旧新值、变更版本及任务/证据链接没有变成十二阶段串行仪式。指出过“JSON 唯一权威”与旧内联小修相冲突，作者已明确仅在项目获准采用持久化生命周期后使用该唯一快照；小修可用等价内联记录，无需强制新 JSON。

Mode 0 不保存完整讨论或 Grill 轨迹；工程规格等另有自身授权时可保存，不能借普通授权扩大讨论记录。文档明确不保存秘密，不自动证明真实接受，不扩大安装、主分支合并、部署、付费或安全权限。历史失败/过期证据保留于 history 或快照，不能重标旧证据；历史内容是说明，不作为现行证明。

## Code：限定范围通过

实际运行 `python validation/review_guards.py`，最终 22/22 断言测试通过，日志 `review-guards-fixed.log`。

覆盖：接受后归档；过期/冲突基线；证据过期或失败；未验证禁止提升；未决禁止归档；取消/拒绝归档不改 current；重复 apply/archive；JSON 重复键；严格版本类型；项目祖先及状态文件软链接；缺失/过期/错误变更 ID/布尔版本接受凭据；CLI JSON、退出码、只读 validate；已有锁拒绝写入；注入 fsync 和 os.replace 失败时原始文件逐字节不变，临时文件与本次锁清理。

初测 15 个测试中 2 项失败：schema_version=true、evidence.change_version=true 被当作整数 1。已即时通知作者，作者修复后独立重跑通过，初始失败日志保留。软链接祖先路径策略亦已收紧并实测。测试不声称覆盖恶意并发文件系统替换或断电恢复；工具有合作式独占锁，文档禁止并发手改，并明确非分布式事务。仅一次原子替换将 current/active/archive 一并落盘，避免跨文件半更新。

测试发现旧的非空接受引用可配新证据提升，作者新增结构化 acceptance 凭据，绑定 change_id、change_version、baseline_version、evidence_version 和 ref。独立测试与云端复跑确认旧凭据拒绝、新凭据通过。该记录仍不认证人、不读取真实审批、不防止恶意重标字段；真实用户针对明确版本的接受必须由调用者另行核实。schema/CLI 成功不是语义正确、主流程通过或用户接受证明。

### 实际 CRAP 测量

执行 `python validation/measure_review_crap.py`，原始逐函数行集合、执行行、覆盖率、CC、CRAP 与源码哈希保存在 `review-crap.json`。无安装。coverage/radon/mccabe 均未预装，使用 Python stdlib trace 真实行事件、CPython dis 可执行行映射和明确 AST 决策计数法，绝非目测估算，也不冒称 radon 或 basis-path coverage。

CC = 1 + if/for/while/条件表达式/except/assert + 布尔表达式额外操作数 + comprehension 生成器/过滤条件 + try else。覆盖率为同一函数字节码可执行行中真实执行比例，包含内部 comprehension 行，排除函数定义行；该口径不等同分支覆盖，短路布尔分支全部充分覆盖不能由行覆盖推断。

本次新增生产守卫的 17 个顶层函数全部实测，最大 CRAP = 12（check_links，CC12，行覆盖100%），其余均 ≤8；transition 行覆盖约91.30%，CRAP约6.02367。全部 ≤50 硬上限，12 略高于约10优化目标，未为凑数字强行拆分。初期 main 因接口未执行而得72，后补实际缺失的 CLI JSON/退出码/只读/重复操作断言，使接口业务验证完整；未添加无断言刷覆盖测试。

范围排除：旧 validate_package.py 仅版本字符串更新，未改变其逻辑；旧工具全库、测试/计量支撑脚本和云端示范博客不是本生产守卫 CRAP 声明对象，其指标 NOT_MEASURED。不得推广为全仓所有 Python 指标通过或示范博客生产质量通过。

## Goal-mainflow：通过（一个窄云端案例）

阅读真实博客源码、两项 subprocess 测试、命令日志、状态快照、接受边界探针和接手报告。独立在 `cloud-test/final-run/blog-project` 执行 `python -m unittest -v`，2/2通过；执行最终工具 `validate .`，退出0。博客测试跨进程创建/发布/读取真实 JSON，覆盖技术文章及产品介绍、默认隐藏草稿、显式包含草稿、标题/正文大小写搜索与未命中。

`cloud-test/final-run/execution.jsonl` 为修复后权威记录；独立检查17条命令的实际退出码均等于预期，6份已记录快照的 SHA256 全部匹配，见 `cloud-log-check.json`。其中真实需求中断夹具使 v1 证据失效，重新实现/测试 v2，再用旧接受凭据尝试提升被拒且整份状态字节不变，新凭据提升成功；陈旧并行变化拒绝，accepted/rejected/canceled 归档均保留 current。

旧根目录 execution.jsonl 混有早期失败尝试，不能整体称为通过。历史首轮错误工具路径、次轮将旧证据留在现行集合、旧接受引用绕过的探针都保留，不能伪装成正确业务失败。最终日志与旧尝试明确分离。所有确认和接受都是 SIMULATED 夹具，真实用户仅授权开发测试，不是接受虚构博客产品。

第一位确实 fresh-context 接手者从项目路径与检查点恢复目标，实际运行2项单测及独立持久化搜索旅程；报告明确不证明历史提升过程，发现取消记录标签复用的小问题并未掩盖。修复后另一个 fresh-context 接手者也已提交最终项目报告，按下节单独核实，不借用前版本报告代替。

## 未证范围及边界

原生宿主安装、Windows 实机、生产部署、长期跨模型可靠性、真实人类产品接受：NOT_RUN。一个窄真实项目不等于所有生命周期风险已解决。审核不执行安装、部署、发布或远程仓库修改。

## 冻结包静态复验

独立执行 `PYTHONDONTWRITEBYTECODE=1 python tools/validate_package.py .`，退出0，12 skills / 36 local links / 14 source hashes / 143 manifest files / 20 scenario templates，无错误。报告为 `independent-static-check.json`。先前误省略项目参数的调用返回 list index out of range，纠正调用后通过，不把参数错误称为功能缺陷。另独立执行作者22项 test_spec_lifecycle 单测全部通过。MANIFEST SHA256：`8585e00fe8c1f074599a77b18cbe5d6dc91df1c15da018f51ca77edca04a66f3`。静态结果不证明20场景已执行或宿主安装。

## 修复后全新接手复核

已完整阅读 `cloud-test/final-run/blog-project/HANDOFF_RECEIVER_REPORT.md`（SHA256：`944ac64524e180e234512a68453a7a034e4316295c1e3181db6c0ccae5f03451`）。新接手者只读本项目，恢复正确 v2 目标、当前接受凭据及保留的 v1 失效历史，执行2项单测与独立跨进程持久化旅程，另验证不存在 ID 的 publish 返回2且数据库字节不变。接手者明确不证明历史提升命令或人类接受。

最初检查点未说明代码摘要是 blog.py + test_blog.py 原始字节拼接，接手者先按单文件哈希断言失败，随后从真实字节定位正确配方；测试作者补充检查点配方，接手者重读确认。此失败与修正完整披露，不假称首次零摩擦。独立核对报告中的源码、测试和状态 SHA256 与实际最终文件全部一致。取消夹具 TASK-DELETE 和原因在最终项目已修正。结论限于一次修复后全新上下文的恢复与复验，不等于长期跨模型稳定性。
