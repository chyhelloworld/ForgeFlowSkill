# 0.8.0 候选：变更边界与恢复防重复

本版沿用 17 个技能及既有 OpenSpec 规范/计划；不新增状态库。明确批准才更新受影响规格、任务、测试和依赖。当前规范、活动变更、历史/失效记录分别引用。可选恢复检查器只读，不执行动作、不授予权限、不保证 exactly-once。

## 实际来源与失败修复

本机从工作分支 99693288764e2cf56ad6892d3a180f1b82e5d543 接手。原始 WIP ZIP 大小 11185524 字节，SHA256 aaca287cf2c76ea268839d921b107bba774a0661a6f55ce85928aa31235a106f；原件和独立解包副本保留在项目根目录。0.7 已上传，不重新开发。

原 WIP 的 resume 源码 SHA256=aeb13c29d04eea9206f25318dc67fb3d91a6f7247f04333e8474b0402423fbd4，但 manifest/metric snapshot 指向更早的 4d35cda9...，且七个函数只计量了六个。原始 unit-tests.log、installer-tests.log、coverage.json、function-metrics.json、metric-source-snapshot.json 保留为**云端早期历史证据**，不能代表当前源码通过。

独立原生反例 29 项发现 7 项失败，已保留 [原始失败](independent-before-fix-native.json)。修复根相对路径逃逸、junction/reparse、NTFS ADS、中文 UTF-8 读取和完成回执依赖绑定；缺少绑定的旧回执保守 INSPECT，不补签。局部 running/unknown 不再抹去独立有效 done 的 SKIP。完整格式、指纹规范和限制见 [恢复检查约定](../../skills/ff-handoff/references/resume.md)。

## 当前验证与范围

- [独立三类审查](independent-review-final.md)：按核心需求/主要流程、MECE 计划、代码规范复核；修复后 44 项反例通过，14 项恢复单测通过。真实夹具移到项目根 _handoff 下，原始执行路径及迁移后保留路径见 independent-fixture-relocation.json，原失败记录未改写。
- [本机同版计量](windows-function-metrics.json)：coverage.py 7.6.1 与 Radon 6.0.1，采集前源摘要及 native coverage 分别为 windows-source-snapshot.json / windows-coverage.json。11 个生产恢复函数全部实测，最大 CRAP 约 12.33，小于硬上限 50；path_problem 高于约 10 的优化目标。覆盖口径为函数可执行行与分支的合计比例，不称基路径全覆盖。
- 修复前工作流 20 项中 19 通过，旧 health 的 symlink 用例因 WinError 1314 出错，获准沙箱外执行仍失败；日志 windows-workflow-before.log / windows-workflow-native.log 保留。没有放松断言、删测试或改系统权限。
- 原始 WIP manifest 过期导致本机安装回归失败，日志 windows-installer-before.log 保留。最终 manifest/payload 在源码和文档冻结后重建；冻结后的回归、完整安装、实际 CLI、同版重入及宿主发现回执保存在项目根 _handoff/20261017/windows08-final，不回写已冻结 payload。实际最终结果和 manifest/payload 摘要以工作分支提交说明与本机接手回执为准，未运行不能算通过。
- [真实中断阶段一索引](experiment-real-interruption-stage1.json)：真实启动并 terminate/wait 子进程，保留失败和完整目录快照。另一个无父历史的新上下文接手者实际观察进程和文件、运行冻结 checker、继续未完成业务并保存前后快照，结果见 experiment-receiver-*。这是一轮已知任务的受控实验，不是盲测、统计可靠性或真人接受。
- Windows 原生项目内 full 构建/安装已在初轮候选真实成功；最终冻结版本仍单独校验。实际入口为 Codex 项目 .agents/skills/ff-handoff/scripts/resume.py 和 .forgeflow/ff-spec.mjs，不回退到全局工具。换行规则保存安装哈希和原始证据字节。
- 使用手册、离线 HTML 与相关新/旧项目流程图已同步恢复边界；生成器支持本机中文字体和稳定 UTF-8/LF 输出。未受影响的历史两张 PNG 保留。

## 明确保留

新增实验/独立探针、测试、文档生成和计量脚本本身仍有 CRAP NOT_MEASURED，不宣称全部函数达标。旧 0.7 health 对 Windows 根相对/junction/ADS 的风险单列 independent-health-legacy-boundary.json；本版只修复新 resume 检查器，不把该旧工具宣称安全。相关旧 health 输入应由可信来源人工核对，不将不可信记录用作权限证明。

0.6.1 遗留 GUI、Claude、真人接受及其他未测范围继续保留。没有 CI 运行证据，没有最终人类验收，没有 main 合并、发布或部署授权。哈希仅绑定声明的字节；不能证明记录未伪造、审查者身份或权限，也不抵御检查后并发替换。

0.9 仅在本版限定范围复核与工作分支提交后继续：设计方向和完整旅程先于实现，截图与操作证据分开，不把 CodeGraph 当业务证明，不开发用户未批准的四个创意方案。


独立接手证据封存复核：见 [真实恢复独立附录](independent-receiver-review.md)，45/45 只读核对通过，原始首次审计失败及修正另存，不改写实验原件。当前 checker 与八份冻结输入逐字节一致，导出内容、mtime 与一次执行事件保持。

提交前 Git index 字节核对额外发现 Windows 打包器以 CRLF 写校验和文件、暂存按 LF 转换；已改为明确 ASCII/LF 字节输出。首次失配回执与前轮冻结验证保存在项目根 windows08-final，修复后另在 windows08-final-lf 重冻并验证；不覆盖前轮结果。
