# 按需嵌入既有规格/设计的短例

这是合成格式例，不是本项目需求或通过证据；用真实来源替换。小任务只用内联段落。规格正文继续遵守 Requirement / Scenario 和 MUST / SHALL，现行 specs 与活动 change 边界不变。

```markdown
### Requirement: R-1 可恢复地提交订单
系统 MUST 让用户提交后确认结果，避免失败后误下重复订单。
目的/来源：用户已确认，消息或既有决议定位；未提供则未知。
约束/取舍：以真实确认填写；未知：离线重试体验未决定。

### Requirement: R-1a 查询提交结果
父需求：R-1。系统 MUST 在失败恢复后可查询同一订单结果。

#### Scenario: A-1 提交响应丢失后恢复
- WHEN 请求已保存但响应丢失，用户重新进入
- THEN 展示同一订单结果，不重复创建
- 范围：R-1、R-1a；跨 M-submit/M-result
- 证据/结果：指向同版报告；未运行时 NOT_RUN

### M-submit
职责：提交与去重；边界：不负责结果展示。
协作：输入订单/请求ID，输出订单ID给 M-result；订单状态由持久层唯一持有。
验收：A-1；未知：当前去重范围，先核查实际行为。

### M-result
职责：查询并展示结果；边界：不重新创建订单。
协作：消费 M-submit 的订单ID和持久层结果；失败返回可恢复状态。
验收：A-1；未知：无已知阻塞项（不代表全系统无未知）。

## Task plan
- T1: 贯通提交与恢复；需求 R-1/R-1a；模块 M-submit/M-result；验收 A-1；真实依赖按当前项目填写。
```

tasks.md 沿现有 v2 progress 仅写 `- [ ] T1` / `- [x] T1`。如下 JSON 可嵌入同一 design；ref 示例中的文件必须在实际项目存在，result_ref 定位原验收记录，不能把任务勾选用作结果。父需求无父项时 parent_ids 为空；未提供证据时 evidence_refs 为空，不代表通过。

```json
{
  "format": "intent-links-v1",
  "baseline_ref": "spec.md#R-1",
  "source_revision": "replace-with-observed-revision",
  "requirements": [
    {"id": "R-1", "ref": "spec.md#R-1", "parent_ids": []},
    {"id": "R-1a", "ref": "spec.md#R-1a", "parent_ids": ["R-1"]}
  ],
  "modules": [
    {"id": "M-submit", "ref": "design.md#M-submit", "requirement_ids": ["R-1", "R-1a"]},
    {"id": "M-result", "ref": "design.md#M-result", "requirement_ids": ["R-1a"]}
  ],
  "tasks": [
    {"id": "T1", "ref": "design.md#T1", "requirement_ids": ["R-1", "R-1a"], "module_ids": ["M-submit", "M-result"], "acceptance_ids": ["A-1"], "progress_ref": "tasks.md#T1"}
  ],
  "acceptance": [
    {"id": "A-1", "ref": "spec.md#A-1", "requirement_ids": ["R-1", "R-1a"], "module_ids": ["M-submit", "M-result"], "evidence_refs": [], "result_ref": null}
  ]
}
```

不新增统一状态库。确认来源与需求正文在 spec，模块约定和稳定任务在 design，执行进度在 tasks，验收结果在原报告。UI未来可读取引用并显示未知/过期；0.9.6不提供看板、比例推断或自动语义验收。
