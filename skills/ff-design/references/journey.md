# 完整旅程与实际观察

实现前先引用当前需求，写出主要用户从入口到可观察成功结果的完整路径：稳定步骤 ID、进入状态、动作、离开状态、关键返回/取消/失败路径，以及视觉方向、目标视口、反馈和影响判断的动效约束。沿用有效设计；缺少批准的取舍保持候选，只做设计的请求不改实现。

将预期和实测分栏。实际操作的输出、数据和截图分别支持相应结论；截图不证明点击、持久化或完整旅程，CodeGraph 不证明业务正确，交付不等于价值已证实。只验证主要路径和重要反例，不要求穷举，也不因模板增加业务范围。

## 可选只读检查

完整 17 技能安装后可从目标项目运行 Python 3.9+：

```text
python .agents/skills/ff-design/scripts/journey.py journey.json --root . --current-target T1
```

源码路径为 skills/ff-design/scripts/journey.py。复用同包 ff-handoff/scripts/resume.py 的本地证据检查；缺少它时 INVALID，不联网安装。输入文件 UTF-8。目标 T1 来自当前确认和实际版本，不从旧记录自动复制。输出 OBSERVED 仅表示声明的选定记录齐全，GAPS 表示缺失/过期/不匹配，INVALID 表示无法读取或格式错误；退出码分别为 0/1/2。它不执行步骤、不修改项目、不改变既有门禁、不批准操作，也不认证记录真实性、视觉质量、业务成功或人类接受。

最小完整结构（尖括号必须换成实测值，不能当作已执行记录）：

```json
{
  "version": 1,
  "target": "T1",
  "surface": "ui",
  "design": [{"path": "design.md", "sha256": "<设计文件SHA256>"}],
  "sources": [{"path": "app.html", "sha256": "<实际实现SHA256>"}],
  "expected": [{"id": "open", "from": "start", "to": "ready", "action": "open"}],
  "observations": [{
    "id": "open", "from": "start", "to": "ready", "action": "open",
    "trace": {"path": "proof/open.json", "sha256": "<真实轨迹SHA256>"},
    "screenshots": [{"path": "proof/open.png", "sha256": "<真实截图SHA256>"}]
  }]
}
```

对应 proof/open.json：

```json
{
  "target": "T1", "stepId": "open", "from": "start", "to": "ready", "action": "open",
  "inputFingerprint": "<采集前设计与实现记录的指纹>",
  "screenshots": [{"path": "proof/open.png", "sha256": "<真实截图SHA256>"}],
  "ok": true,
  "observed": {"visibleHeading": "实际可见标题", "url": "实际URL"}
}
```

inputFingerprint = SHA256(json.dumps([design, sources], sort_keys=True, separators=(',', ':'), ensure_ascii=True).encode('utf-8'))。列表顺序保留。必须在真实操作时绑定当前输入，不得重采 sources 后把旧轨迹补签成新证据。ok 必须为布尔 true；observed 是非空的实际观察字段。未知/失败不得填 true，静态图谱不能改名冒充轨迹。

UI 的每个选定主要步骤需要真实截图和操作轨迹；CLI surface 不要求伪造 UI 截图，仍要实际命令/结果轨迹。所有引用必须是项目内相对路径和非空文件，拒绝越界、符号链接/junction/reparse、ADS 等路径。设计和 sources 只覆盖所列范围，工具不能判断是否漏列关键依赖，也不能抵御检查后的并发替换。没有实际操作证据时说明未验证，不把文件存在或 OBSERVED 当产品验收。

UI 轨迹还须绑定与观察索引完全一致的 screenshots 路径和哈希列表。检查器仅核对 PNG 文件头和正尺寸元数据，不解码像素，也不证明图片真实、完整或美观；它能发现仅替换索引而未同步原轨迹的错配，不能识别作者主动把旧像素声明为新截图。JSON 拒绝重复字段、NaN 和 Infinity，避免不同解析器对同一记录得出不同含义。

本仓库的受控实例见 iterations/0.9/DESIGN.md 和 ui_capture.py。Windows Chrome 的窄视口仿真不代表真实手机、触控、辅助技术或真人视觉偏好验收。评审仍按核心目标/主要流程、MECE 计划、代码规范分别进行。
