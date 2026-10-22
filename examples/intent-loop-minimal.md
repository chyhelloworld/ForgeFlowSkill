# 合成示例：任务已完成，需求仍有缺口

本文件只演示引用与状态分离。不是运行过的订单产品，不是用户确认或真实测试结果。所有对象共用一份示例，实际项目放回已有 specs/design/tasks/报告。

<a id="R-1"></a>
## R-1 可恢复地提交订单

提炼目的：提交结果不明时，用户仍能确认结果且不重复下单。确认来源：合成用户设定。约束：已有订单不得丢失。取舍：先支持在线恢复；离线行为未知，不阻塞在线切片。

<a id="R-1a"></a>
### R-1a 提交只创建一次
父需求 R-1；行为与验收引用 A-submit、A-recover。

<a id="R-1b"></a>
### R-1b 恢复后查询结果
父需求 R-1；行为与验收引用 A-result、A-recover。

<a id="M-submit"></a>
## M-submit
职责：提交与去重。边界：不负责展示。协作：接收请求ID，输出订单ID；订单存储拥有唯一状态。需求 R-1a；验收 A-submit、A-recover；未知：历史请求ID保存期限。

<a id="M-result"></a>
## M-result
职责：恢复与结果展示。边界：不创建订单。协作：接收 M-submit 的订单ID，查询订单状态，暴露失败/重试；支持 R-1a、R-1b；验收 A-result、A-recover；未知：响应丢失后的定位方式。

<a id="T1"></a>
## Task plan
- T1: 贯通在线提交与恢复；R-1a/R-1b；M-submit/M-result；A-submit/A-result/A-recover。

<a id="progress-T1"></a>
## 原任务进度（合成）
- [x] T1
勾选表示任务执行结束；未声称需求满足。

<a id="A-submit"></a>
## A-submit
输入相同请求ID两次；预期同一订单。范围 R-1a / M-submit。

<a id="A-result"></a>
## A-result
已知订单ID查询；预期展示正确结果。范围 R-1b / M-result。

<a id="A-recover"></a>
## A-recover（跨模块）
保存成功但响应丢失，用户返回后查询；预期找回同一订单而不再次创建。范围 R-1/R-1a/R-1b、M-submit/M-result；UX需提供可恢复入口，架构需保持请求与订单关联。

<a id="results"></a>
## 原验收记录（合成）
观察版本 demo-v1；2026-10-22。A-submit=PASS，A-result=PASS，A-recover=FAIL：恢复页没有原请求ID。R-1未验收。若实现或目标改变，旧结果待复验，不重新绑定为新版本通过。用户接受=未知。

<a id="feedback"></a>
## 轻量使用评价（合成填写例）
FF 0.9.6-intent.1 / synthetic-context；目的 R-1；执行完成但整体未满足。需求理解：未知，AI推断，缺真实用户反馈。设计：问题，AI推断（合成题设），恢复状态缺上下游联系。交付：问题，AI推断（合成题设），A-recover失败。变化适应：不适用，尚无决定转向。成本：未知，token/耗时缺失。

I-1：期望失败恢复找到同一订单，实际丢请求定位；阶段为整合验收，影响用户确认结果；复现/证据见 A-recover/results（仅合成）；归因假设为协作契约遗漏，尚待真实复现。下一步把该问题归并到恢复路径，最小改进保留请求关联，加入响应丢失回归，并在真实任务复验；不能据本例自动加永久门禁。

## 可读取引用（不是第二状态库）

```json
{
  "format": "intent-links-v1",
  "baseline_ref": "examples/intent-loop-minimal.md#R-1",
  "source_revision": "synthetic-demo-v1",
  "requirements": [
    {"id": "R-1", "ref": "examples/intent-loop-minimal.md#R-1", "parent_ids": []},
    {"id": "R-1a", "ref": "examples/intent-loop-minimal.md#R-1a", "parent_ids": ["R-1"]},
    {"id": "R-1b", "ref": "examples/intent-loop-minimal.md#R-1b", "parent_ids": ["R-1"]}
  ],
  "modules": [
    {"id": "M-submit", "ref": "examples/intent-loop-minimal.md#M-submit", "requirement_ids": ["R-1a"]},
    {"id": "M-result", "ref": "examples/intent-loop-minimal.md#M-result", "requirement_ids": ["R-1a", "R-1b"]}
  ],
  "tasks": [
    {"id": "T1", "ref": "examples/intent-loop-minimal.md#T1", "requirement_ids": ["R-1a", "R-1b"], "module_ids": ["M-submit", "M-result"], "acceptance_ids": ["A-submit", "A-result", "A-recover"], "progress_ref": "examples/intent-loop-minimal.md#progress-T1"}
  ],
  "acceptance": [
    {"id": "A-submit", "ref": "examples/intent-loop-minimal.md#A-submit", "requirement_ids": ["R-1a"], "module_ids": ["M-submit"], "evidence_refs": [], "result_ref": "examples/intent-loop-minimal.md#results"},
    {"id": "A-result", "ref": "examples/intent-loop-minimal.md#A-result", "requirement_ids": ["R-1b"], "module_ids": ["M-result"], "evidence_refs": [], "result_ref": "examples/intent-loop-minimal.md#results"},
    {"id": "A-recover", "ref": "examples/intent-loop-minimal.md#A-recover", "requirement_ids": ["R-1", "R-1a", "R-1b"], "module_ids": ["M-submit", "M-result"], "evidence_refs": [], "result_ref": "examples/intent-loop-minimal.md#results"}
  ]
}
```
