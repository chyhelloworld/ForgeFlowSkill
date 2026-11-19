# 外部审查结果归属修复（2026-11-15）

范围：基线 `8621d92`，用户要求修复残留最终消息串用和失败/超时误读为通过。保持 0.10.0 候选，不合并主分支、不发布、不更新用户机器。

## 实际修改

- `tools/review/ff-reviewer.mjs`：Codex 每次调用在记录目录下创建独有临时目录，结果提取放在 try/finally 内，只清理本次目录。旧 `<out>.last.txt` 不读取也不删除；runner 被强制终止留下的目录不会被下次复用。
- 后端失败/超时但返回合法结论时，有效 `verdict` 为 `needs-evidence`，原结论保存为 `reportedVerdict`；解析失败仍为 `unparsed`，原始文字和错误均保留。
- `docs/user/review-backends.md`、`skills/ff-review/references/reviews.md`：明确同时检查工具返回码、error、后端退出码、超时状态后再解释 verdict。正常调用返回码 0 仍可能审查 fail；不能只检查 pass 字样。
- 不引入调度器或并发锁；不同并发运行仍需不同正式 `--out` 基名。

## 验证

1. 新增首批六项回归在旧实现上全部失败（旧 12 项仍通过），修复后通过；另补两项失败处理测试。
2. `node --test tools/review/ff-reviewer.test.mjs`：20/20。包含旧 pass + 空输出、旧 pass + 新 stdout fail、强制重试独有路径、非零退出合法 pass、超时合法 pass、提取抛错清理、超时部分文字、后端无法启动。
3. 重新生成 MANIFEST、payload 和 sha256；`tools/validate_package.py`：通过；`tools/test_validate_package.py`：14/14。
4. installer wrapper：130/130，包括安装后 reviewer 字节匹配与版本入口。
5. workflow Python：73 项，71 通过、2 跳过；未将跳过计为通过。

以上为 Linux、实际 runner 与模拟 CLI 的证据，非真实 Codex/Claude 模型调用或 Windows 原生验证；也不证明历史审查已经受影响。未进行同版函数 CRAP/覆盖率计量（NOT_MEASURED）。旧安装需按既有更新流程升级，源码提交不会自动更新全局技能或其他项目。
