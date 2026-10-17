# 可选只读健康摘要

在项目根运行 Python 3.9+：

    python /实际安装路径/ff-review/scripts/health.py health-record.json --root .

它读取一个临时导出的证据索引，不建立第二个规格/计划事实库，不修改计划或自动接受。当前规格、用户最新确认和实际实现仍须独立阅读。退出码0仅表示记录齐全且摘要没有检测到缺口；1代表缺口；2代表格式/读取错误。工具无法证明审核人身份、证据真实性或覆盖范围充分，也不会证明最终完成。

最小输入含goal、phase、target、next、reviews。reviews分别为goal-mainflow、plan、code，各含verdict(PASS/FAIL/PENDING/N/A)、target、author、reviewer、independent和evidence数组，每条证据为项目相对path与sha256。N/A需reason，也必须绑定相同target、独立审核身份和证据，不能跳过过期核对。文件不能越界或经符号链接，实际内容变化即过期。reviewer需来自真正独立上下文，不能只填不同名字伪造。

code.metrics含target、ccTool、coverageTool、coverageDefinition、sources（原始报告/源文件path与sha256）和functions（name、cc、coverage）。coverage为0到1同版本真实覆盖率；CRAP=CC²×(1-coverage)³+CC，硬上限50、优化目标约10。缺可信采集/映射就不填写，输出NOT_MEASURED，不能估算。纯文案可声明metrics.notApplicable与reason。工具只检查已列范围，审核者仍须检查遗漏、CC定义、函数边界与覆盖映射，拒绝挑选低复杂度函数掩盖风险。

humanAcceptanceRequired默认按需要接受处理；仅确实没有人工验收要求的自动检查阶段才显式设false。否则humanAcceptance需confirmed:true、target和evidence；这些字段只代表已核实的外部记录，不能由工具或实现者生成许可。模拟用户不能填真人接受。

每次目标、代码或依赖变化后重新导出索引。不要手工刷新哈希来“消除过期”，先完成受影响审核，再更新对应记录。摘要输出RECORDED/GAPS，不给总分，也不授予实施、合并或部署权限。

来源检查只核对声明文件的存在与摘要，不解析CC/覆盖报告的角色，也不自动证明内联数字与报告一致。审核者必须对照原始报告与目标源码核验数值；提供任意可哈希文件不能当可信计量。Python运行时3.9+是可选helper要求，不改变其余skill的纯文本可用性。
