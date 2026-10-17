# 版本与历史证据

当前包为0.9.1工作分支候选；本页区分功能迭代、旧实验说明和原始证据，不把历史完成/勾选当当前包通过或用户授权。安装从[当前入口](../user/install.md)开始，当前能力见[场景与技能](../user/capabilities.md)。

## 按版本阅读

| 版本 | 主要变化与证据入口 |
| --- | --- |
| 0.9.1 | [Health/复盘/资产候选](../../iterations/0.9.1/README.md) · [用户批准纳入工作分支](../../iterations/0.9.1/PROMOTION.md) |
| 0.9 | [设计与完整旅程](../../iterations/0.9/README.md) · [冻结 UI 原始记录](../../iterations/0.9/ui-evidence-frozen/) |
| 0.8 | [变更与真实中断恢复](../../iterations/0.8/README.md) |
| 0.7 | [阶段审核与最终独立重放](../../iterations/0.7/README.md) |
| 0.6.1 | [当时结果及遗留缺口](../../iterations/0.6.1/README.md) |
| 0.6实验 | [实验变更记录](changes/) · [旧交接](../../iterations/HANDOFF-20261016.md) |

0.8/0.9/71d0464原候选有绑定源码和包的Windows full成功记录。后续46022d7文档包full两次遇npm TLS失败，只有新包skills-only范围通过；本次整理再生成的新包另记核对结果，不继承旧包full/CI/人类验收。Codex完整宿主setup refresh、Claude/全平台、文件symlink权限分支、cp936 stdout和旧UI stale等原限制按各版本记录保留。

## 历史报告

| 报告 | 历史用途 |
| --- | --- |
| [测试过程与结果](reports/测试过程与结果.md) | 0.5/0.6实验的测试摘要，保留失败与未测项 |
| [OpenSpec接入](../OpenSpec-FF接入报告.md) | 固定CLI接入、原始集成验证与限制 |
| [可选方法](reports/可选方法测试报告.md) | 研究/复盘/写作的当时评估 |
| [决策索引](reports/决策索引测试报告.md) | 历史行为模拟与边界 |
| [CodeGraph试验](reports/CodeGraph试验报告.md) | 静态图谱的限域实验，不是业务正确性证明 |

## 历史安装资料

[原INSTALL全文](installation/INSTALL.md)、[实验7项目安装](installation/项目内安装指南.md)、[旧npx说明](installation/npx安装指南.md)及[旧README固定SHA重放](installation/readme-installation-reference.md)保留当时版本状态和示例，不是当前包安装指令。旧main/npx/路径不自动适用本工作分支。

## 未搬动的原始证据

[iterations](../../iterations/) 保持版本内相对结构；[validation](../../validation/)、[evidence](../../evidence/) 与 [provenance](../../provenance/) 保持原始字节和路径，避免破坏哈希、运行脚本与来源链。[planning](../../planning/) 保存计划原件，不冒充当前状态或批准。来源映射仍在根 [CHANGE-MAP](../../CHANGE-MAP.md)，技能NOTICE已有引用不变。

此轮整理前基线为 `46022d7f9cd7e1ef3a6bb22200540049cc988d75`。旧说明只调整位置和必要相对链接，不改写历史结论；原始内容可按 [Git基线](https://github.com/chyhelloworld/ForgeFlowSkill/tree/46022d7f9cd7e1ef3a6bb22200540049cc988d75) 或 [原路径与哈希映射](relocations.json) 追溯。手册、HTML、docs脚本与图源因既有工具依赖保留原路径；不把目录整洁当运行验证。
