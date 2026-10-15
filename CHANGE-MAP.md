# 0.5.0-rc3 change map

## rc3：项目入口与官方 CLI 并存

- 包名 `@forgeflow/ff-spec`、可执行名 `ff-spec`，用户配置/数据命名空间 `ff-spec`；继续使用兼容 `openspec/` 项目树，不新增规格权威源。
- FF 命令统一为目标项目根目录下的 `node tools/openspec/ff-spec.mjs <子命令>`；checkout 嵌套或外置时改用 launcher 真实路径，保留目标项目 cwd。不全局安装，不覆盖官方包或命令。
- 初始化只允许显式 `init --tools none`，不会刷新项目已有官方工具集成；FF `update` 拒绝。十二技能独立安装和维护。
- 当前技能与使用文档统一入口；rc2 验证作为历史基线保留，不能算作 rc3 测试通过。rc3 待验内容见 planning/openspec-ff-0.5.0-rc3.md。
- 官方 CLI 拥有文件系统权限时仍可操作兼容规格树而不执行 FF gate；并存隔离不是安全边界。

## rc2 已有接入（历史基线）

- 在 OpenSpec 1.14.2 固定源码上增加原生 opt-in FF evaluator；status/apply/validate/archive 共享判定。实现、源码来源、补丁、锁与许可证见 tools/openspec/。
- 稳定 artifact ID、明确路径、排序内容摘要、依赖指纹与目标版本绑定的独立 review，替代“文件存在即 ready”的不足。
- openspec/specs 为唯一现行规格；changes 保留差异与回执，Git 保留完整历史。新 apply 是实施指导，archive 正常路径同步 specs，不沿用旧 Python apply/archive 语义。
- 原生 canceled/rejected 显式关闭，要求原因与决议引用，保留失败/未完成记录且不合入规格；正常接受归档门禁不变。
- 旧 Python 写入口全局退役，保留只读 audit。原实现、测试与契约在 provenance/legacy-0.5.0-rc1/，迁移不自动接受或导入通过。
- 十二技能、中文手册、离线 HTML、新旧项目及生命周期 SVG/PNG/draw.io 图同步；三类审核、主流程测试、CRAP 和授权边界不变。

云端候选；本文件不是测试结果。既有历史 PASS 不代表本适配通过，当前结论以新测试报告为准。未自动安装到宿主、未验证 Windows 原生、未 push、合并主分支或部署。
