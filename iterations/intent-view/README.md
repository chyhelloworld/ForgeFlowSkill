# 需求关联简明视图：源码切片交付记录

用一条本地命令查看需求、模块、任务、验收原记录与证据缺口。源码入口是 [intent_view.py](../../tools/workflow/intent_view.py)，使用说明见 [docs/intent-view.md](../../docs/intent-view.md)。这是当前分支的源码能力；基础 package 版本仍为 0.9.6-handoff.1，冻结安装包尚不含它。

```powershell
cd E:\github\ForgeFlowSKill\worktrees\intent-view-096
python -X utf8 -B tools/workflow/intent_view.py --root . --index planning/intent-view-links.json --requirement R096-2
```

去掉 requirement 参数看所有已索引需求；加 `--json` 看结构化关联、原文定位和实际读取文件 hash。退出 0 只代表视图生成成功。用户可以据此核对关联是否正确、缺口是否需要补齐；任务 done、验收原记录 PASS、需求接受是三个不同事实。

## 范围和真实资料

- 固定流程工具：`E:/github/ForgeFlowSKill/worktrees/review-handoff-096`，FF 0.9.6-handoff.1，`8b9858aa8795d83ea33881b3d8c2e1ef40cce6b8`。本任务显式读取/复用固定技能；未声称原生自动加载。
- 开发分支：`work/intent-view-096`，独立工作树为上面命令中的目录。开发对象仅 CLI、测试、关联索引与源码说明，未修改 FF 规则或冻结安装载荷。
- 追溯：既有 [R096-2](../../planning/INTENT-LOOP-096.md) → [R-view/R-links/R-truth/R-local、M-read/M-map/M-view、T-view、A-*](../../planning/INTENT-VIEW-096.md) → 实现/测试 → [实际记录](results.md)。索引不复制状态。
- 真实演示读取当前项目的 6 个既有需求及 4 个本切片需求；旧任务缺少明确进度引用、稳定验收 ID 时保留 unknown/索引缺口，不由代码反推它们未完成或用户未确认。
- 既有订单示例及异常边界是合成测试；当前 FF 规划、当前测试/开发记录与真实 CLI 输出是实际运行。没有伪造用户中途转向或满意度。

## 验证与限制

当前关键测试：新工具 16 项中 15 通过、1 项实际 symlink 跳过；既有 intent contract 3 项通过。命令/退出码/源码与测试 hash 见 [tests-after-review.json](evidence/tests-after-review.json)。

一次[独立综合审查](review/initial-review.md)发现两个 P2：孤立关系被隐藏、PASS 掩盖同 ID 未知赋值。先新增回归复现失败，再做局部修改；同一审查者复用原夹具的 [5 次局部 CLI 观察](review/focused-recheck.md)确认可关闭。初审 FAIL、旧失败及旧演示完整保留，没有重审刷通过。最终 CLI 记录在 [demo-delivery.json](evidence/demo-delivery.json)，便读输出在 [demo-delivery.txt](evidence/demo-delivery.txt)。

当前可进入有边界的本地用户验收：真实 R096-2 中 T-view=done，但需求验收/用户接受仍 unknown；旧 T096-2 进度与验收映射缺口仍显式显示，A-local 的原记录仍 UNKNOWN。并未把修复记录包装成整个 FF 产品已验收。

实际 symlink/reparse 链接场景未实测，A-local 保留 UNKNOWN。跨平台与并发文件替换/原子快照未测；源版本/证据新鲜度、需求验收与用户接受由工具明确保持 unknown。不提供任意 Markdown 语义推断、自动批准或发布功能。

## 使用评价与可测成本

| 维度 | 判断与依据 | 证据性质 |
|---|---|---|
| 需求理解 | 以需求关联和缺口服务判断进度，避免数量百分比；是否满足用户实际习惯待反馈 | 真实输入/产物可核查；适配度为执行者判断 |
| 设计 | 复用 intent-links-v1 与现有文档，标准库 CLI，无第二状态库或服务 | 代码事实；简洁程度为 AI 判断 |
| 交付 | 实际项目入口可运行；初审发现两个缺陷，局部修复并复核，A-local 仍未证 | 原始运行证据；用户接受仍待本人 |
| 变化适应 | 本轮没有用户转向，不人为制造该场景 | 不适用 |
| 成本 | 一次独立综合审查加同一审查者局部复核；开发中环境兼容、路径校验及两个代码缺陷有返工 | 实测记录；完整 token/工具调用/费用未知 |

evidence/workflow-use.json 记录实际技能来源、复用与本轮读取区别；文件字符数只表示静态文件大小，部分早期合并工具输出截断，不能当完整模型阅读量或 token。demo-reviewed-input.json 的三次 CLI 命令分别约 0.234、0.282、0.265 秒，只是当次宿主用时；不构成性能基准或与其他任务相比的节省。未为测量增加付费调用/依赖。CRAP=NOT_MEASURED。

原始文件可数出作者 8 次测试命令执行（包含失败、局部回归及两次契约检查）；不等同全部工具调用，嵌套 CLI 与审查者探针另有原始记录。流程带来一个短计划、使用说明、结果/交付记录及一轮审查；本次真实试用要求保存命令、初始失败和对照，证据文件比普通小任务多，不能把它们全部计成 FF 规则浪费。本轮未改 FF 规则，不据不同任务的数字宣称成本节省。

保护检查见 evidence/protection-checkpoint.json：它是实施中的检查点、与既存保存基线比较，不冒充本轮开工前快照。此前工作树、安装状态与旧问题记录都保持独立。

收尾 evidence/protection-final.json 再核对 7 个既有工作树、5 个保护文件、固定技能/载荷及同版测试源码，均未变化。git-checks.json 保留完整 diff 检查的两个行尾空格提示，均来自原始 CLI 文本；仅排除这两份原样证据后其他全部暂存文件检查无提示，未改写原始输出或关闭空白规则。

用户验收仍待用户；本轮不合并、不推送、不发布、不升级安装，完成这个切片后停止。
