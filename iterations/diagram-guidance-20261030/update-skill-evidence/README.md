# 单技能更新 v1 验证

- 原始9项测试先于实现运行，9项失败（缺少updateSkill/CLI命令）；冻结SHA256为 `e6dc286eba0d9f2a73c67b662a6ba6c1da1287745cdad7f28c32c37c5986e583`，见 red.log。
- 实现后原9项通过；追加旧来源、恢复用户冲突、metadata、版本单调性及同pin跨包等边界。
- 父评审明确同版本同内容首次调用也必须no-op，因此原“same source建立override后全包接纳”用例被改为“初装同版本字节完全no-op”；另有两项覆盖有override后全包同pin接纳/清除。没有放宽冲突、恢复、rollback或字节保持断言。
- 最终专项14/14通过，见green.log；当前测试文件摘要见current-tests.sha256。
- 这是本地Node安装事务测试，不代表Windows/macOS原生、模型绘图质量、运行时full build或用户产品验收通过。
- 不支持新增技能；仅已安装ff-diagram。未变更transaction.mjs，不新增文件所有权通道。
