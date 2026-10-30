# ff-diagram 版本记录

## 0.1.0（2026-10-30，未发布候选）

- 独立元能力：架构、DFD、E-R、常用UML及普通流程；国内软件工程/架构师语境，来源与规范版本边界明确。
- 按需图种参考，模型语义、可编辑源、渲染/视觉检查分开；不自动生成全图集或增加门禁。
- 版本在本技能metadata及仓库skill-versions.json登记，独立测试位于tools/installer/tests/diagrams.test.mjs，行为评测与本轮证据另存iterations/diagram-guidance-20261030。
- 本候选安装器支持已有ff-diagram的受管单技能更新，保留其他技能和运行时；不支持冷安装/旧库存直接新增。图法本身不依赖安装器执行，不让安装后的技能依赖仓库路径。
