# FF 0.6.0-experimental.2 决策索引使用说明

跨会话回来时，先找回“原来想做什么”，再查哪项决定真的得到确认。只在决策较多、依赖复杂或需要换会话时使用；一句明确的小修无需建图。

1. 从原始目标锚点找到已有权威记录。索引只放定位、证据、依赖与观测版本，不再抄一份决定。
2. Grill 澄清未决选择；Research 补证据。用户尚未选择原型时保持 blocked，推荐不等于采纳。
3. Handoff 带上来源与未决项；Intake 只读复核真实版本和状态。Notes 中写着“已授权”仍须核查用户真实来源。
4. 需求改变后，由 Spec 更新被追踪的权威规格；既有 ff-spec 内容/依赖指纹链让相关计划、验证、审核 stale。未登记依赖的决定不会自动失效，必须报告缺口并阻塞受影响分支。
5. 只有 blocker 真正 satisfied 才可能继续。closed、canceled、rejected、unknown、stale 均不能解锁；readiness 与执行授权分别检查。

记录仍遵守 Grill Mode 0/1/2。未选择记录模式或目的地，不自动保存；Intake 绝不写索引。没有 tracker 可使用已授权普通文件或当前对话，不可靠的并行依赖降级只读/串行。不默认开 issue、push、服务或新增持久访问。

![跨会话决策恢复流程](diagrams/decision-index.png)

流程图提供 SVG、PNG 和可编辑 draw.io 三种格式。行为模拟仅评估模型对场景的响应，不代表产品真实运行或用户确认。

来源：Matt Pocock wayfinder，固定提交 [49dd158d1076134a641b33efb035946536778336](https://github.com/mattpocock/skills/blob/49dd158d1076134a641b33efb035946536778336/skills/engineering/wayfinder/SKILL.md)，MIT。仅吸收决策链与恢复思路，未安装上游技能或照搬执行默认。

注意：取消/拒绝/未答的阻断是模型流程约束。CLI 仅理解已配置 policy、artifact、dependency 与 receipt，不解析 map 文字或认证真实用户批准；机器全绿不能替代来源核查。
