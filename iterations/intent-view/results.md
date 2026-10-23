# 当前开发切片的实际记录

本文件是本轮运行/审查记录，不是用户接受或发行批准。源文件 hash 和命令在原始证据中，索引不复制状态。原始失败保留。

## A-links
A-links=PASS
初次作者记录为 PASS；独立审查 IVR-001 发现孤立条目被隐藏，该旧结论未覆盖此缺陷。修改后 tests-after-review.json 和 review/focused-recheck.md 支持当前关系/缺口范围，IVR-001 可关闭；不是业务效果或全量项目验收证明。

## A-truth
A-truth=PASS
初次作者记录为 PASS；独立审查 IVR-002 发现已知 PASS 掩盖未知赋值。修改后先收集全部显式状态再判断，tests-after-review.json 与 review/focused-recheck.md 支持当前范围，IVR-002 可关闭。原始失败在 review-regression-before.json，未覆写。

## A-local
A-local=UNKNOWN
tests-after-review.json：显式路径拒绝、真实 CLI JSON/文本、只读 hash 检查已执行。实际 symlink 创建受环境限制跳过；Windows reparse guard 的真实链接场景未证，跨平台及并发替换未测。因此该验收整体保留 UNKNOWN，不以局部执行替代。

## A-demo
A-demo=PASS
demo-after-review.json 记录修复后同版源码对真实规划 R096-2 的 CLI JSON/文本、命令、源码 hash；读取的输入在运行后 hash 一致。该演示时两项待复核仍为 PENDING；最终交付状态另见 demo-delivery.json。demo-initial.json 是旧版历史记录，保留但不当作当前源码证据。没有用合成订单代替真实项目演示。

## 接受与问题
用户接受=unknown；初次综合审查 goal-mainflow/code=FAIL，plan=PASS（范围判断），见 review/initial-review.md。原审查者局部复核已关闭两项缺陷，见 review/focused-recheck.md；没有第二次全量重审或覆写初审。可进入有上述限制的本地用户验收，不代表正式发行就绪。CRAP=NOT_MEASURED（未取得同版 CC/方法覆盖，未为计量安装工具）。

IV-001（环境/项目兼容）：初次严格 realpath 在合法工作树返回 WinError 5，普通元数据/文件读取正常。保留 tests-initial/path-diagnostic；改用绝对路径与逐层 reparse 检查，不改变权限。
IV-002（项目代码）：Windows 的 /private.txt 是带根但无盘符路径，is_absolute 未拦截，导致一次对不存在 E:/private.txt 的元数据探查；没有读取外部文件内容。改为检查 anchor，tests-path-fix 的失败保留，受影响路径回归通过。

IVR-001（项目代码，已局部修复并复核）：需求关联视图期望孤立对象/缺边可见，实际按需求投影把它们隐藏；独立审查阶段发现，影响用户识别缺口。复现见 review/fixtures/orphaned_rows 与初审。固定 FF 0.9.6-handoff.1 / 当前 Codex 显式读取宿主；开发对象源码 hash 见初审快照与 focused-recheck，修改后在全局缺口保留对象定位、原记录及缺引用。
IVR-002（项目代码，已局部修复并复核）：期望显式状态有未知/冲突即 unknown，实际白名单匹配忽略 NOT_RUN 而显示 PASS；独立审查阶段发现，影响原记录摘要真实性。复现见 review/fixtures/mixed_unknown、review-regression-before.json；相同版本/宿主绑定见初审与局部复核。修改后未知赋值不能被已知 PASS 掩盖。

未发现需改固定 FF 规则的缺陷；未发生用户中途需求变化，不编造用户满意度。
