# 可选记录与真实保存

## 1. 可选决策记录

需要新增持久讨论记录，且本主题既无记录选择、也无可沿用授权时，简短问一次；已授权更新的工程规格/任务可维护精炼需求，不再索取同一许可：

> 这次讨论需要哪种记录？0 不记录；1 关键决策摘要；2 完整讨论轨迹。若选 1 或 2，请确认保存位置和文件名，或沿用你已授权的位置。

- 同一主题沿用用户已选模式，不逐轮重复询问；用户可随时调整。
- 未选择时不自动保存，可继续澄清和只读查证；不要把记录设为讨论的门槛。
- 选择只适用于当前主题。用户说“更新这个文件”只授权该文件的更新，不授予全局日志或后续自动保存权限。
- 调整从明确选择时生效。补记早期讨论只依据可见内容，说明覆盖范围和缺口，不编造记录。

### Mode 0：NoRecord

不生成或保存持久化决策记录。可在当前对话给出简短结论、风险与下一步。

### Mode 1：DecisionSummary

保存背景、目标、决策及确认状态、理由、风险、证据、未决项和下一步；标明是摘要。

### Mode 2：FullTrace

完整保留本主题可见的外部讨论：背景和目标变化、关键问答、假设、对用户展示的审查摘要、方案演变、替代方案、取舍依据、证据、明确同意、最终决策与未决项。

- 按轮次保留关键问答、方案变化及其关联，不能只留最终结论却称为“完整记录”。
- 结构化轨迹不等于逐字全文。标明引文、摘要或重建内容；要求逐字全文时只收录可访问的文本，说明缺失部分。
- 不记录或输出模型私有思维链；只记录可分享的结论、证据、关键理由和审查摘要。

### 保存规则

仅写入已确认或授权的目的地和文件。追加新轮次；更正时注明旧结论、新结论与原因，或建立可追溯版本，不默默覆盖历史。敏感信息只保留必要最少内容。

写入成功才说“已记录”并给出位置；仅展示或保存失败时标为“待保存”，仍可提供当前结论。

## 7. 记录模板（仅在启用时使用）

YAML 用于人读和交接，不是自动执行协议。只填写真实信息；null 表示未填或未知，空列表不代表已检查或确认。按需扩充轮次，长文无需强塞 YAML。

### DecisionSummary

```yaml
Decision:
  context: null
  goal: null
  decision: null
  status: pending_confirmation
  confirmation: null
  reason: null
  tradeoffs: []
  risks: []
  evidence: []
  open_items: []
  next_step: null
  review_trigger: []
```

### FullTrace

```yaml
DecisionTrace:
  context: null
  intent: null
  goal: null
  problem: null
  assumptions: []
  coverage: null
  record_kind: structured_summary
  rounds:
    - round: 1
      questions: []
      user_answers: []
      self_review_summary: null
      alternatives: []
      proposal_changes: []
      tradeoffs: []
      evidence: []
      explicit_confirmations: []
  decision: null
  status: pending_confirmation
  reason: null
  rejected: []
  risks: []
  open_items: []
  next_step: null
  review_trigger: []
  corrections: []
```

在 confirmation、explicit_confirmations 中保留确认内容及可用的轮次或消息引用；证据注明来源和局限。questions 与 user_answers 须可对应。模式为 FullTrace 不意味着用户已确认 Goal 或 Decision。
