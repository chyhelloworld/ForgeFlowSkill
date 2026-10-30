# 单独更新已安装的元能力技能

本版本提供 `update-skill`，支持 **已安装的 `ff-diagram` 和 `ff-writing-document`**。
技能以 `skill-versions.json` 的独立版本与技能文件内容摘要识别，不要求整个 FF 包同步升版。
这是现有项目安装器的一条事务命令，不是第二套安装器或文件所有权清单。

## 使用条件与命令

1. 使用本版本或之后明确支持 `update-skill` 的完整 FF 源包/安装器；保持整个源包完整，命令会先验证全部 manifest 文件，并非仅校验目标技能。
2. 项目必须已经安装 FF，且所有已安装宿主都已拥有要更新的目标技能。
3. 先保留并处理受管文件的本地修改。任何受管文件被改动都会阻断更新，包括其他技能；不会自动覆盖、stash 或删除用户修改。

从要采用的完整 FF 源包根目录运行：

```bash
node installer.mjs update-skill --project /absolute/path/to/project --skill ff-diagram
```

对应打包命令入口也接受同样的参数：

```bash
node bin/ff-install.mjs update-skill --project /absolute/path/to/project --skill ff-diagram
```

更新文档技能时，将命令中的 `--skill ff-diagram` 改为 `--skill ff-writing-document`；一次只更新一个技能。

成功返回 `SKILL_UPDATED`。同一独立版本和内容摘要再次执行返回 `UNCHANGED`，不改写项目 state；首次安装后未变化也不写入 override。

内容变化必须增加技能版本；同版本不同内容明确拒绝。v1 仅支持稳定 `X.Y.Z` 版本并按数字比较，拒绝降版，恢复旧版本请使用已有 rollback。预发布/构建后缀的独立版本暂不支持更新。
双宿主项目会同时更新 Codex 和 Claude 的目标技能；不能用 `--host` 只更新其中一个。
`--mode`、`--build`、`--reuse-build` 和 `--hosts` 不适用于此命令。

## 哪些保持不变

- 其他技能及共享运行时文件保持原始字节；目标技能新增加的受管文件写入，来源已删除的旧受管文件移除。
- 目标技能目录下无碰撞的用户自有文件保留；新 payload 与未受管文件重名时明确拒绝。
- 原项目运行时版本、source hash、release inventory、安装模式不变；skills-only 项目仍然不能宣称门禁可用。
- 项目 `state.json` 记录 `skillOverrides` 中的独立版本、技能内容 SHA256 和来源 manifest SHA256。文件所有权仍只有 `state.files` 一处。
- 目标 SKILL.md 的安装绑定分别注明技能来源与保留的运行时来源，不把技能更新冒充运行时升级。

## 旧项目首次添加独立技能

尚无目标技能的旧安装不能使用此命令新增它。例如 17/18/19 技能安装没有 ff-diagram，20 技能绘图版也没有 ff-writing-document。旧项目内部的状态校验器不认识新库存，直接增加技能而保持该运行时不变会破坏校验。
请先按[完整安装说明](install.md)显式完成完整安装迁移，再进行后续独立更新。
**完整安装迁移会更新其他受管技能和运行时，不具备单技能更新的 byte 不变保证。**

## 后续完整安装与 pins

使用本版本完整安装器时，若项目存在独立更新 pin，而传入源包的相应技能版本或内容摘要不同，完整安装会在构建和 `UNCHANGED` 判断之前拒绝，提示 `Independent skill pin conflict`。
即使包版本或项目 source hash 看似相同，也不会静默覆盖独立技能。
版本和内容摘要均相同的完整源包可正常安装，并将独立技能重新纳入该完整包管理，清除 override。
来源 manifest hash 可以不同，因为其他文件的改动不改变该技能的独立身份。

**旧版安装器不识别此保护，仍可能覆盖或降级独立技能。不要再使用旧安装器修改有独立 pin 的项目。** 本功能不能保证任意历史工具遵守新字段。

## 失败恢复与回滚

沿用完整安装相同的项目锁、pending journal、备份和恢复机制：

```bash
node installer.mjs recover --project /absolute/path/to/project
node installer.mjs rollback --project /absolute/path/to/project
```

普通事务失败会尝试自动恢复。若恢复发现用户中途改动文件，它会保留文件与 pending，明确报冲突，而不是覆盖用户内容。
先保存并人工解决提示的冲突，再执行 recover；如果残留锁，先确认没有安装器运行，遵照错误提示仅处理空锁目录。
rollback 恢复上一个受管安装状态，包括独立技能元数据；它不是任意历史版本选择器，用户改动仍会阻断回滚。

## 当前不支持

- 冷安装、给旧项目直接新增技能、删除技能、单宿主独立更新。
- 任意核心技能独立更新；独立注册不自动证明其与旧运行时、其他技能兼容。
- 独立技能下载器、在线版本解析、依赖求解或自动全包升级。
- 证明模型绘图质量或门禁业务验收；安装测试只验证文件、状态与失败语义。
