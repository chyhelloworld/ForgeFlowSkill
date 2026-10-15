# CodeGraph v1.6.2 实验3报告

日期：2026-10-15 UTC。结论：保留为默认关闭的辅助适配器，不成为必经门禁。源码工具输出不能替代独立阅读与运行时验证。

## 真实公开业务链

公开仓库 https://github.com/yangzongzhuan/RuoYi-Vue ，提交 13db1fcef36bee9ce45d2d636a1d4e8f5ed5bbc3。Linux x64，官方 CLI v1.6.2，npm局部前缀安装，独立HOME，DO_NOT_TRACK=1；没有用户项目上传、全局MCP配置、agent instructions修改或部署。具体官方源码与npm完整性见 validation/codegraph/official-source.json、install-lock.json。未抓包审计网络，遥测关闭依据官方配置契约与实际环境，不声称独立网络证明。

问题：用户列表查询 selectUserList 改动会影响哪些入口、服务、Mapper及SQL？先用 CodeGraph explore/impact，后 rg 定向读核对，非盲法也非回答质量A/B。301文件、6524节点、12195边。计时含单进程启动：全量index 1.967176秒，explore 0.385706秒，impact depth5 0.247717秒；rg修正后 0.005867秒。初次rg路径拼成aspect而非aspectj，退出2，保留失败记录，修正重跑退出0。图谱与rg输出任务量不同、没有随机化/重复统计；不能据此宣称整体加速。没有测量模型token、费用或答案耗时。

观察：
- 命名查询定位4个selectUserList定义：服务interface、impl、Mapper interface、MyBatis XML。XML namespace/statement被识别，不能声称“XML不支持”。
- impact(depth5)八个受影响节点中包括上述4定义、controller list/export及两条路由。人工核对 controller调用64/73，Mapper声明21，XML select60。impl图谱startLine75覆盖注解/方法块，方法声明实际77，调用79；不能把图谱行号直接视为方法声明行。
- explore含73符号/5文件，却混入 SysLogininforController.list 无关目标；目标 SysUserController 未作为源码块输出（但blast-radius提到它）。图谱优先级/同名匹配需人工判别。
- rg查到 SysUserServiceImpl 行246 的 SpringUtils.getAopProxy(this).selectUserList 动态代理调用，impact结果没有 importUser 这一受影响调用者。存在漏边。
- @DataScope行76，DataScopeAspect.java @Before35、dataScopeFilter调用53、params写入143与XML ${params.dataScope}行86参与数据权限。impact结果没有这一AOP机制。静态DI/接口链接不证明实际Bean选择、权限语义或SQL安全；未启动Spring、数据库、前端或业务回归。
- 保守解读：四层命名定位有用，完整影响分析不够；保留rg对照和配置/AOP/SQL人工检查。未形成全仓precision/recall指标。

原始命令、stdout、stderr、exit与耗时见 validation/codegraph/raw-trial.json；最终适配器真实运行见 ruoyi-evidence.json，绑定commit、逐文件hash、索引字节hash、版本/环境/查询。它是静态观察，approval始终not-granted。

## 受控更新与过期实验

仅CLI模式，未启动MCP daemon/watch。Python fixture baseline为service.py中target与caller。四项真实观察：

1. 修改target为replacement，未sync时query target仍返回旧符号；sync后replacement正确。
2. service.py重命名renamed.py，未sync时仍返回旧路径；sync后路径正确。
3. 删除renamed.py，未sync仍返回已删除符号；sync后为空。
4. 提交删除为removed分支，再切回baseline，未sync查询target为空；sync后恢复。

每次query约0.230–0.259秒，sync约0.448–0.523秒，详见原始数据。本实验只证实无watch的CLI快照会过期，不推断活跃watch功能失效。特别是分支切换的空结果不能证明无影响。适配器选择每次全量重建并比较前后快照，刷新也不复活审核回执。并发写入与瞬时改回仍可能逃过普通快照，必须冻结写入者；不作为恶意对抗安全系统。

## 适配器验证

16个单元测试覆盖关闭、正确捕获、已有index、版本错误、index/query失败、索引期间改动、查询期间改动、索引变化、删除/重命名hash变化、非法输出/query、缺CLI及源码/索引符号链接。真实CLI公开项目复跑成功。测试中的fake仅测试封装分支，不充作上游兼容性实测。

coverage.py 与 radon 真实报告见 validation/codegraph/coverage.json、complexity.json、crap.json。生产适配器7函数：函数级行覆盖均100%；CRAP以行覆盖而非basis path计算，main=21、snapshot=10、validate_index_path=5、index_state=3，其余1。最大21低于已设硬上限50，但高于优化目标10，不宣称最佳结构。整文件语句89/90（入口行未在单测覆盖），分支33/34。范围仅新适配器，非上游、测试脚本或全仓代码。

Windows未实测。独立审核与最终包校验结果以交付时附带记录为准；本报告不制造用户验收、审核pass或发布授权。

## ff-spec 模板真实接入验证

复用已验证的本地ff-spec launcher（同固定源码/补丁），独立spec-fixture创建change。首次错误重复追加skip_specs导致YAML拒绝，保留失败；修正元数据后文件status为done但ffValidity=false，strict验证退出1，不能把存在当批准。随后仅写无review的待审记录，codegraph-evidence为needs-review；改变证据字节后它变stale，impact-review明确报告依赖指纹不匹配。全程没有生成pass回执。原始记录见validation/codegraph/ff-spec-example.json。
