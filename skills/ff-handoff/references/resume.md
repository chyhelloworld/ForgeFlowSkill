# 可选恢复检查器

在目标项目根目录运行 Python 3.9+：

```text
python /实际安装路径/ff-handoff/scripts/resume.py checkpoint.json --root . --current-goal R2
```

R2 来自用户最新确认和同一目标锚点，不能从旧检查点照抄。文件使用 UTF-8。工具只读，不执行或阻止其他命令，不授予权限。退出码 0 表示所声明检查点与当前文件相符，1 表示需要核查，2 表示格式或读取错误；均不代表人类接受、真实业务完成或进程存活。

## 最小格式

下面是完整字段示意；尖括号内容必须替换为实际值，不能将示例当成已执行回执。projectRoot 必须等于本机 `Path(root).resolve()` 的字符串；搬迁后先观察和确认项目身份，不能只修改路径来继承旧结论。

```json
{
  "version": 1,
  "projectRoot": "E:\\projects\\demo",
  "goalRevision": "R2",
  "dependencies": [{"path": "openspec/specs/export/spec.md", "sha256": "<实际文件SHA256>"}],
  "actions": [
    {"id": "test-01", "state": "done", "receipt": [{"path": "proof/test-01.json", "sha256": "<实际回执SHA256>"}]},
    {"id": "review-01", "state": "pending"}
  ]
}
```

对应 `proof/test-01.json`：

```json
{
  "actionId": "test-01",
  "goalRevision": "R2",
  "dependencyFingerprint": "<动作实际运行时依赖记录的指纹>",
  "operation": "python -m unittest（实际执行的命令或操作）",
  "exitCode": 0,
  "outputs": [{"path": "proof/test-01.log", "sha256": "<实际输出文件SHA256>"}]
}
```

只能在实际操作成功并核实输出后生成 done 回执。exitCode 必须为整数 0；普通写着 done 的文本、失败操作、空文件、身份或版本不匹配、输出哈希不符均不能证明完成。

依赖指纹的精确定义（标准库）：

```python
hashlib.sha256(json.dumps(dependencies, sort_keys=True,
    separators=(',', ':'), ensure_ascii=True).encode('utf-8')).hexdigest()
```

dependencies 使用动作执行前核实的完整选定记录列表，保留列表顺序；对象键序不影响结果。回执绑定该列表，不另建计划或规格库。重排、增减或重新采集依赖后，旧回执不会自动重新有效。没有 dependencyFingerprint 的早期 WIP 回执保守 INSPECT；不得事后补签来伪造当时的执行绑定。

## 范围与建议

dependencies 引用本次恢复判断涉及的现行目标、规格、计划、源码/测试及必要授权决议。只覆盖实际切片；省略未知依赖不能伪装成全项目证明。相对文件路径必须留在项目内，不能使用绝对/根相对/驱动器路径、`..`、NTFS 附加数据流或符号链接/junction/reparse 路径。

- done 且目标、依赖绑定、回执和输出仍有效：SKIP_COMPLETED。
- pending：VERIFY_CURRENT_AUTHORITY；按当前明确授权继续，不把讨论/澄清当批准。
- running、unknown 或动作自身证据有问题：该动作 INSPECT。独立且证据有效的已完成动作仍可 SKIP_COMPLETED。
- 全局版本、目标、项目身份、依赖或重复 ID 有问题：全部 INSPECT。观察后只重开受影响工作，保留其他进度，不批量重做。

真实中断恢复应先确认原进程已退出、操作是否已发生以及结果是否完整，再决定继续或重做。副作用超时或上传结果未知时先查询目标状态。检查器不检测进程存活、不验证权限来源/人类身份，不证明哈希记录没有伪造，不抵御检查后的并发文件替换，也不提供 exactly-once 保证。真实账号、凭证和私有会话日志不能写入检查点。
