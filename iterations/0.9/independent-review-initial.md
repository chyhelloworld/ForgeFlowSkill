# 0.9 独立审查：修复前记录

审查范围：基线 `47eedff1a7c1885ea002a99b97fb1cd0ed157ccd` 到工作分支 `work/061-through-09` 的 0.9 增量（包括未跟踪文件）。先读冻结设计与源码，独立编写并实际调用公开 CLI，未以生产者的单测结果作为预期答案。未修改生产代码或既有测试、未提交。真实夹具全部位于 `_handoff/20261017/independent09-fixtures/`；源码中未创建 junction。

修复前 `journey.py` SHA256：`cff33ad0e972b825ce93c822651448203b391cb0b10181a083056dd4d5484e63`。冻结设计当前字节与 `design-before-implementation.json` 的 `ec7f55b4b28accd14b75076818ccdcf106feed4453d25a0e2a86dfff590f3249` 一致；该记录不是独立时间戳认证或真人接受。

## 核心需求/主要流程：FAIL（可修复的记录完整性缺口）

1. P2，`skills/ff-design/scripts/journey.py:60`：截图仅被当作任意非空文件检查。将 `screenshots` 指向当前 `design.md` 并给出正确哈希，公开 CLI 返回 `OBSERVED`/0。此处连“有一张可读的图像记录”都不能支持；与协议中 UI 每步应有截图的声明不符。首次反例见 `independent-results-20261017T082021Z.json` 的 `text-file-as-screenshot`。
2. P2，`journey.py:43` 与 `:60`：轨迹绑定了设计/源，却没有绑定采集时的截图引用。实际给轨迹增加原始截图引用后，只替换 observation 的截图索引，工具仍返回 `OBSERVED`/0。此项是可机器检测的记录不一致，证据见 `independent-format-before-results.json` 的 `before-replaced-screenshot-index-only`。
3. P3，`journey.py:37` 与 `:125`：默认 Python JSON 解析接受 `NaN` 及重复字段。实际探针中 `observed.visibleCount=NaN`、主记录先 `target=STALE` 后当前 target、轨迹先 `ok=false` 后 `ok=true` 都被记为 `OBSERVED`/0。严格 JSON 与明确身份字段应拒绝这种含糊记录。首次输出分别在两个 before 结果文件中。

范围澄清：`old-screenshot-current-trace` 首次探针将源和轨迹重新采集、仍主动声明旧像素，返回 OBSERVED。它揭示真实性边界，不能要求只读检查器仅凭像素和声明证明拍摄时间。后续修复应检出“索引替换未同步轨迹”；主动声明旧图仍须人工核对，并明确保留真实性限制。首次探针预期与输出未回写。

真实手册样本的局部结果：PASS。独立查看了原 `ui-evidence/` 的全部 8 张实际 PNG、各步 JSON、`before.json`、`events.json`、`browser.json` 及采集脚本。桌面筛选“旅程”后只剩目标目录；点击后 0.9 标题与正文可见；无匹配筛选保持正文和 URL，清空恢复目录；390×844 下目录位于正文前，筛选后可点同一目标，稳定截图内标题和规则可见。直接哈希/PNG 尺寸/时间顺序审计见 `independent-ui-evidence-audit.json`，未调用生产 checker 作为证明。此为一次手册任务的可见结果，不能推成 FF 所有业务、真人接受、手机触控或辅助技术验收。

## MECE 计划：PASS（当前有界设计范围）

设计将目标拆为旅程约定、只读证据核对、既有手册的八步桌面/窄屏演示和发布准备；状态转换、返回/恢复及异常筛选各有可执行结果。协议由 ff-design 持有，ff-review 保留三类职责，路径校验复用 ff-handoff；没有另建规范/计划库、守护服务或新发布门禁。未见把四个未批准创意变成产品任务。当前独立审查发生在实现后，不能据此倒签成“实现前已独立审核”。

## 代码规范：FAIL（上列可机器校验缺口待修复）

职责与规模总体合适，无新增第三方运行依赖。首轮独立 CLI 56 项中 53 项满足预期，3 项首次偏差原样保留；补充 3 项格式/绑定反例全部暴露当前漏报。所有 56 项夹具字节前后相同。漏步骤/多步骤/乱序、重复 ID、状态断裂、旧目标、旧源/设计、刷新依赖后旧轨迹、各绑定字段错配、失败/未知、缺截图/轨迹、CodeGraph 冒充、非法路径及 UTF-8/JSON 结构问题均实际保守拒绝。正常 UI、CLI 和中文空格路径记录均被接受，未见相关误报。

实际 junction：第一次创建被沙箱拒绝，精确外部路径审批成功后完成复验；根外目标返回 `unsafe resolved path`，根内目标返回 `symlink or reparse path`，均正确 GAPS。`independent-junction-result.json` 的首次 FAIL 是独立 harness 错误地只允许后一种拒绝措辞，已保留，不能算产品缺陷；根内分支的新实际复验见 `independent-junction-inside-result.json`。没有放松真实产品断言。

本独立审查未自行运行同版复杂度/覆盖率计量，CRAP 暂标 `NOT_MEASURED`，不能由通过的探针数量推成 CRAP 通过。生产者后续提交同版原始指标时可独立复核，其他未测脚本保持 NOT_MEASURED。

下一步：修复截图结构/绑定和严格 JSON；保留原 8 步证据字节不补签，用新采集器实际重跑独立目录。按新接口重新执行正常、负例和原失败回归，再给最终三类结论。
