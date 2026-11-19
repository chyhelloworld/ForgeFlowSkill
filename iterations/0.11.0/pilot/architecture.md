# 合成案例：稽查线索由人工确认后再交付

这是用于云端验证看板的虚构案例，不读取高速数据库，不含真实车辆、账号或人员信息；不是用户已确认的业务设计，也不是实际项目的完成记录。

<a id="R1"></a>
## R1 原始目标与边界

目标：稽查员从既有 SQL 生成的嫌疑线索进入，查看关联材料，形成判断，经有权人员确认后输出可追溯的处理记录。自动生成线索不等于认定逃费；AI 不能代替最终业务确认。

本例的输入来源版本为 `synthetic-inspection-v1`，只是合成材料版本标签，不是代码提交或已验证证据。需求来源就是本段演示设定；用户接受、真实权限规则、数据库接入和端到端运行均未验证。先贯通人工确认这一业务主干，车辆画像和视觉模型作为未确认扩展，不提前实现。

<a id="M-input"></a>
## 线索入口

拟议职责：复用已有 SQL 线索，将线索编号和材料引用交给审查工作区。无数据连接或运行证据；不会重新实现 SQL 规则引擎。输入无材料时应展示缺口，而非假装已有判断。

<a id="M-review"></a>
## 材料与人工判断

拟议职责：呈现材料、保留判断依据，将“建议处理”交给有权确认者。材料缺失或意见冲突应保持待处理。判断记录的业务状态归审查模块，不以工具执行成功代替。

<a id="M-auth"></a>
## 必需的确认权限尚未落实

本例刻意缺少权限来源、授权校验契约和拒绝路径的实现证据。确认主体未核实前不能声称这一条件已满足。它属于业务主干的必要条件，不可通过折叠或移到后续范围来消除。

<a id="M-output"></a>
## 处理记录交付

拟议职责：只接收经有权人员确认的决定，输出带来源和确认记录的结果；失败返回审查工作区，不把异步受理写成已交付。当前只有拟议设计，无真实 API 和落库证据。

<a id="G-e2e"></a>
## 缺少端到端证据

尚未走通“线索进入→材料展示→有权人员确认→记录交付”的真实路径。任务勾选只是下面的反例输入，不能据此认定业务可用，也不能视为用户验收。

<a id="G-extension"></a>
## 未确认扩展

车辆画像、多模态自动比对仅列作候选，不属于本例获准主干。后续如果选择，先明确需求与验收，再调整原设计和计划；不能为展示丰富先行加入。

## 主干投影

此围栏是同一文档的只读投影，绑定相邻 intent index。阶段标签描述设计位置，不表示实现完成。`design: proposed` 表示本例设计仍是候选。

```ff-architecture-v1
{
  "format": "ff-architecture-v1",
  "goal": "稽查线索由人工确认后再交付",
  "goal_id": "R1",
  "source_revision": "synthetic-inspection-v1",
  "design": "proposed",
  "nodes": [
    {"id":"input","label":"读取既有 SQL 线索","stage":"入口","ref":"#M-input","requirement_ids":["R1"],"required":true},
    {"id":"review","label":"材料与人工判断","stage":"判断","ref":"#M-review","requirement_ids":["R1"],"required":true},
    {"id":"auth","label":"确认权限待核实","stage":"确认","ref":"#M-auth","requirement_ids":["R1"],"required":true},
    {"id":"output","label":"交付可追溯记录","stage":"结果","ref":"#M-output","requirement_ids":["R1"],"required":true}
  ],
  "edges": [
    {"from":"input","to":"review","kind":"flow","label":"线索及材料引用"},
    {"from":"review","to":"auth","kind":"flow","label":"建议与依据"},
    {"from":"auth","to":"output","kind":"flow","label":"仅经有权人员确认"},
    {"from":"output","to":"review","kind":"flow","label":"交付失败返回处理"},
    {"from":"output","to":"auth","kind":"dependency","label":"交付依赖确认权限落实"}
  ],
  "path":["input","review","auth","output"],
  "gaps":[
    {"label":"确认权限契约与拒绝路径未验证","ref":"#M-auth","required":true},
    {"label":"真实端到端运行证据缺失","ref":"#G-e2e","required":true},
    {"label":"车辆画像与视觉比对未确认，不进入本轮范围","ref":"#G-extension","required":false}
  ]
}
```
