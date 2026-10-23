# intent-view 首次独立综合审查

审查日期：2026-10-23 UTC。对象：`work/intent-view-096`，HEAD `8b9858aa8795d83ea33881b3d8c2e1ef40cce6b8` 上的未提交切片。**当前不建议把切片关键验收整体标成通过：发现两个 P2 缺陷，分别影响关联缺口和未知结果保留。** 这不是发布、合并或用户接受判断。

## 独立结论与范围

| 维度 | 结论 | 依据与边界 |
| --- | --- | --- |
| goal-mainflow | FAIL（局部路径可用） | 真正的 FF 规划、模块、任务及原记录可以从 CLI 看见，旧任务缺口及 A-local UNKNOWN 保留；但未关联需求的对象可静默消失，同一验收的未知记录可被已知 PASS 遮蔽，不能可靠完成“发现关联与缺口”这一完整目标。见 IVR-001/002。 |
| plan | PASS（设计范围与覆盖；不代表执行验收完成） | 当前方案沿 R096-2 → R-view → R-links/R-truth/R-local，M-read/M-map/M-view 明确职责、边界、协作及验收；一条纵向任务贯通真实资料，未扩展第二状态库、网页、安装或发布。A-links/A-truth 尚需修复后的局部复核；A-local 保持待验证。 |
| code | FAIL | 只读 Reader、关联组装、窄格式解析、渲染职责分开，标准库实现与范围相称；但 IVR-001/002 为可复现行为缺陷，现有测试未覆盖。CRAP=NOT_MEASURED，无同版真实 CC/方法覆盖，不能声称计量达标。 |

用户接受=unknown，待用户真实反馈。审查读过 `results.md` 中作者的 A-* PASS 标签及“未发现需改固定 FF 规则的缺陷”判断；它们是必须核对的产品输入，**本次不是未接触作者判断的盲审**。交接明确把这些内容列为受审对象；本结论来自原目标、代码、哈希复核与独立探针，未采用作者标签作为预期答案，也未另换审核者重审。

实际委托保存在 `handoff.txt`；作者交接哈希在 `input-snapshot.json`；本次独立绑定在 `reviewed-snapshot.json`。核心文件 SHA256：

- `tools/workflow/intent_view.py`: `f24fd907347d75c7b9ed2bb36ae8dad40d4dd1c5dec166830268687a2109d776`
- `tools/workflow/test_intent_view.py`: `46e2dae918d3deefc77b4b82afb896b66a6396e3deecf378e4267a519c9c73f0`
- `planning/intent-view-links.json`: `a2f225eba895288f807ee2a2c70784a18a93034146030c965aa552249e9e47b0`
- `planning/INTENT-VIEW-096.md`: `00e2d4ed49a9dd96e3bdec750e72a152e915066e667e637d66522a63505eabf6`

## IVR-001 — P2：孤立关联条目被静默丢弃

位置：`tools/workflow/intent_view.py:171-178,193-196`（全局只检查非空关系中的悬空 ID，随后只组装 requirement_ids 命中的对象）；相关缺口收集在 `217-239`。约定：`planning/INTENT-VIEW-096.md:12-13` 要求孤立/错误 ID 可见；固定 intent-loop 契约允许空关系表示未知，但要求注明缺口。

复现：在完整有效 R1/M1/T1/A1 索引中，追加 `M-orphan`、`T-orphan`、`A-orphan`，它们的 `requirement_ids=[]`，原文指向不存在的 `missing.md`，原结果还包含 `A-orphan=FAIL`。运行：

```powershell
python -X utf8 -B tools/workflow/intent_view.py --root iterations/intent-view/review/fixtures/orphaned_rows --index index.json --json
```

实际：退出 0，全局 `gaps=[]`，R1 的 `gaps=[]`；模块/任务/验收实体只有 M1/T1/A1，文本视图没有任何 orphan 对象或缺口。JSON 的 A1 结果 excerpt 偶然含有 `A-orphan=FAIL` 字符串，但没有 A-orphan 实体或缺口，不能视为关系可见。原始输出在 `probe-commands.json` 的 `orphaned_rows`；实体级复核在 `orphan-analysis.json`；文本在对应 fixture 的 `rendered.txt`。

影响：用户恰好在维护不完整索引时看不到丢失的职责/任务/失败验收，甚至无法区分“没有该对象”和“对象存在但尚未关联”。该问题无需过滤参数即可发生，是缺口视图的主要用途缺陷。另一个探针 `task_without_module` 中 T1 的 `module_ids=[]` 同样未形成 gap，说明目前缺边检测只覆盖部分关系。

建议：在按需求投影前，对索引实体及缺失关联做最小检查，至少把无需求归属的对象作为全局可定位缺口保留；任务缺模块关联也应有明确提示。不必推导关系或新增状态库。补一个保留孤立对象/缺边的行为回归，并复核全量与过滤输出。现有 `test_missing_broken_and_dangling_are_visible` 仅覆盖已映射对象中的错误 ID，未覆盖空关系导致不可达。

## IVR-002 — P2：已知 PASS 遮蔽同一验收的未知状态

位置：`tools/workflow/intent_view.py:157-159`；约定：`planning/INTENT-VIEW-096.md:15-16,39-40` 与 `docs/intent-view.md:17` 规定不识别/冲突保持 unknown。

复现：同一 `result_ref` 指向的片段内同时放置：

```text
A1=PASS
A1=NOT_RUN
```

运行：

```powershell
python -X utf8 -B tools/workflow/intent_view.py --root iterations/intent-view/review/fixtures/mixed_unknown --index index.json --json
```

实际：退出 0，`recorded_result="PASS"`，全局及需求 `gaps=[]`。文本显示“原记录=PASS”。正则只提取白名单 token，NOT_RUN 在冲突判定前已被丢弃。原始输出在 `probe-commands.json` 的 `mixed_unknown`；`fixtures/mixed_unknown/plan.md` 与 `rendered.txt` 保留输入及呈现。control 同版探针是单独 PASS，结果符合预期。

影响：历史 PASS 和本次未运行/不识别记录共存时，原记录摘要会单方面展示 PASS，损失本来应保留的未知。有效性与用户接受仍为 unknown，故没有自动批准行为；但原记录与缺口本身已不可信。建议先识别该 A-ID 的所有显式赋值，再判断全部是否可识别且一致；出现未知赋值要保持 unknown。只需补混合已知/未知赋值的回归，保留原有 PASS/FAIL 冲突和纯 malformed 测试。现有测试 71-75 行覆盖已知冲突及单独坏格式，缺少此混合情况。

## 实际主流程、证据与验收判断

本次真实 CLI 入口运行 `--root <当前工作树> --index planning/intent-view-links.json --json`，退出 0，输出 R096-1～6、R-view/R-links/R-truth/R-local。R096-2 显示原规划条目、M-spec/M-plan、本切片模块、旧任务 unknown、本切片 pending、作者 A-* 原记录及 A-local UNKNOWN。其他旧需求缺少进度/验收引用时有缺口；没有把旧工作推定为没完成，也没有把 T-view 或作者 PASS 转为需求/用户接受。代码没有输入写入、执行引用或网络入口；JSON 与文本从同一 report 生成。观察到的全部输入哈希在执行后相同。

| 验收 | 本次判断 | 支持范围 |
| --- | --- | --- |
| A-links | FAIL / 待修复 | 既有示例、正常多对多、坏 ID/锚点及过滤有同版既有测试；IVR-001 是孤立关联遗漏。 |
| A-truth | FAIL / 待修复 | done 与 FAIL 分离、原 PASS 不授予有效性/接受有同版既有测试；IVR-002 证明混合未知记录丢失。 |
| A-local | UNKNOWN / 待验证 | 源码路径守卫与同版路径/只读测试可核查，本次真实 CLI 哈希也保持不变；真实 symlink/reparse 分支仍未实证。 |
| A-demo | PASS（技术演示范围） | 当前真实规划 CLI 已独立运行；不是最终用户效果验证。 |

证据复用而非重复全套测试：

- `tests-final.json` 绑定的产品/测试 SHA256 均等于本次字节；原记录为 14 项 `OK (skipped=1)`，另有 contract 3 项 OK。保留 symlink skip；contract 源文件未在该记录的 sources 中单独绑定，因此它仅作辅助历史记录，不作本轮独立全仓验证结论。
- `tests-initial.json` 的退出 1 / 13 errors（strict realpath 的 WinError 5）及 `tests-path-fix.json` 的退出 1（`/private.txt` 越界元数据路径）都完整保留。它们绑定旧源码，是修复历程证据，不是当前通过证据。
- `tests-local.json`、`demo-initial.json` 的源码 hash 已非当前；后者的索引与 results 也已变化。`A-demo` 当前仍引用历史 `demo-initial.json`，不能把那一份单独当成当前版验证。`demo-reviewed-input.json` 的当前产品 hash、两份 JSON 运行的输入 hash 均与当前匹配，足以补足当前演示核查；本次又对真实 CLI 做一次有针对性的独立观察。建议收尾记录明确链接该当前证据，保留初始记录。
- `demo-readable.txt` 是历史输出，其测试引用是 tests-local；没有重新包装成当前文本。`protection-checkpoint.json` 明确是与前轮保留基线比较的 checkpoint；本次只核对记录内容，没有重新验证其列出的所有安装/其他工作树状态，不宣称获得本轮最初快照。
- `probe-summary.json` 的 `json_contains_orphan_id` 是字符串检查；其 true 来自未分类 excerpt，不意味着对象映射存在。已在 `orphan-analysis.json` 明确保留此限制，无静默改写原始探针输出。

## 实际读取与调用

固定 FF 来源：`E:/github/ForgeFlowSKill/worktrees/review-handoff-096`，HEAD `8b9858aa8795d83ea33881b3d8c2e1ef40cce6b8`，status 干净。**显式文件读取，不声称原生自动加载。** 完整读取 `skills/ff-review/SKILL.md`（0.9.6-handoff.1）、`references/review-handoff.md`、`references/intent-loop.md`。前两者用于真实交接、独立范围和证据复用；后者用于核对关系/未知/验收语义。本次是窄范围源码切片的只读综合审核，无生命周期、门禁或主要运行时替换；未扩大全套流程，未为计量读无关参考或安装平台。

完整语义读取：`review/handoff.txt`、`C:/Users/admin/.codex/AGENTS.md`（原文末尾确实截于“维持 Intent → Spec → Impl 的”）、两个规划文件、完整旁置索引、既有合成例、当前产品 1-286 行、测试 1-160 行、完整使用文档、results、workflow-use；README 只读实际 diff 新增 4 行及上下文。初次 PowerShell 默认编码的 handoff 输出乱码，随后以 `python -X utf8 -B` 完整重读。一次组合阅读输出出现截断，INTENT-LOOP 后续完整按行重读；不把截断输出计为完整可见读取。

原始证据范围：tests-initial/path-fix/local/final、path-diagnostic、protection-checkpoint 的完整 JSON（含实际 stderr/退出码）；demo-readable 全文；demo-initial 与 demo-reviewed-input 的元数据、命令、退出码、结构化全部需求关系/任务状态/验收结果/gaps 和 observed hashes（由脚本提取），以及后者文本运行全文。未逐字展开所有重复 excerpt。`input-snapshot.json` 完整读取；`workflow-use.json` 在探针前已由作者补入，已完整读并标作作者来源，未因它推定原生加载或模型成本。其余实际输入中 skill 正文仅由 CLI 读取/摘要和哈希检查，未冒称人工完整语义阅读全部技能。

环境/定位只读调用：祖先及当前工作树 AGENTS 存在性检查；`rg --files`/隐藏文件搜索 AGENTS、policy/receipt 名称；当前工作树 `git status --short`、`git rev-parse HEAD`、`git branch --show-current`、`git diff --stat`、`git diff -- README.md`；固定来源 `git -C ... status --short`/`rev-parse HEAD`。没有找到仓库 AGENTS，`.forgeflow/.ff/openspec` 定位没有可用本轮项目文件，最后一次搜索命令退出 1 是无匹配，不是测试通过或权限拒绝。

可复现探针入口（本次实际执行一次）：

```powershell
python -X utf8 -B iterations/intent-view/review/reviewer-probes.py
```

脚本源码完整保存，实际子进程 argv、cwd、UTC 起始时间、stdout、stderr、退出码全在 `probe-commands.json`。它调用 4 次 Git 只读定位、1 次真实全量 CLI 和 4 次本地夹具 CLI；保存前后产品/证据/固定技能哈希、证据复用核对、4 个 fixture 的输入和渲染。原始产品测试 suite 未重跑：其 `TemporaryDirectory(dir=ROOT)` 会写审查许可目录之外；同版记录可复用，独立缺口探针全部位于 `review/fixtures/`。没有修改该测试以迁就本次权限。

## 未证点、限制与收尾

- 真实 symlink/reparse 创建及拒绝分支：原 suite 因宿主权限跳过，本次没有重试、提升权限或模拟后声称实测。A-local 保留 UNKNOWN。
- 并发替换/原子多文件快照、非 Windows 执行、Python 3.10 最低版本实际运行：未验证。本次 Python 为 Anaconda 3.11.5 Windows；产品文档已明确前两项限制。
- 当前性/依赖失效、需求验收及用户接受：本工具按设计不认证；用户接受仍待本人。CRAP、真实 token/时间成本及真实用户满意度保持 unknown/NOT_MEASURED。
- 本次无工具审批拒绝、无 pending/uncertain 写入，无安装/外部服务/权限升级/提交/再委托。早期日志中的 WinError 5 是作者历史运行失败，并未作为本次绕过权限的理由。
- 唯一写入范围是 `iterations/intent-view/review/`。探针前后所绑定产品、规划、证据及固定技能哈希不变。初始报告保存后，应只修复 IVR-001/002 及关联回归，再作问题影响链复核；不需要重开全套审查。

轻量评价：需求理解=符合（AI判断，交接原话与 R-view 对齐）；设计=符合（AI判断，单一引用源/窄 CLI）；交付=问题（客观探针，IVR-001/002）；变化适应=不适用（本次无目标转向）；成本=未知（未测真实 token/总成本，只复用同版记录并执行必要探针）。这不是用户满意度。
