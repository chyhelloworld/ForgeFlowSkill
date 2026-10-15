# OpenSpec CLI 接入 ForgeFlow：0.5.0-rc3 并存说明与 rc2 验证基线

日期：2026-10-15。工作分支：`feat/ff-skills-0.5.0-rc1`，基线提交 `86f95a61522b2e91924eb44710d0e4ce8adb8d4c`。这是云端实现与验证，不是主分支合并、正式发布或用户电脑安装。

## rc3 并存入口与待验证范围

rc3 将构建包标识隔离为 `@forgeflow/ff-spec`、可执行名 `ff-spec`，用户配置/数据命名空间为 `ff-spec`；规格仍保持 `openspec/` 兼容目录，不创建第二套 current。当前 FF 命令统一为 `node tools/openspec/ff-spec.mjs <子命令>`，从目标项目根运行；若 FF checkout 位于其他目录，须改用 launcher 的真实相对/绝对路径，工作目录不变。

初始化仅接受显式 `node tools/openspec/ff-spec.mjs init --tools none`，不刷新已有官方工具集成；FF `update` 拒绝执行。十二个 FF 技能单独管理，不全局安装、不覆盖官方包、命令或用户配置。官方 CLI 只要有文件系统权限，仍可操作兼容 `openspec/` 树且不执行 FF gate；这里的并存隔离不是安全边界。

本节记录 rc3 契约和文档更新，不断言 rc3 重建、CLI 共存、完整回归或宿主安装已通过。下方测试数字和代码哈希属于 rc2 接入基线；rc3 的实际证据、失败与未测范围须另行核对 [rc3 计划与验收](../planning/openspec-ff-0.5.0-rc3.md)，不能复用旧 PASS 作为新版本结论。

## rc2 已完成的接入（历史基线）

- 官方 OpenSpec `v1.14.2` 源码固定至 `f80d860fc510ba4f51180c8ddde35b91b32de657`，交付源码归档、可审查 TypeScript 补丁、许可证、完整性摘要与项目本地构建脚本。实际重建 CLI 版本为 `1.14.2-ff.0.5.0-rc2`。没有把临时修改 node_modules 当作交付。
- 项目显式启用 `openspec/ff-policy.json`，变更包保存 `ff-artifacts.json` 版本引用。稳定产物 ID、显式当前路径、排序文件集哈希、上游输入指纹、有效 schema 哈希与结构化审核证据共用一个 evaluator。
- 原生 `status`、`instructions apply`、`validate`、`archive` 接入同一有效性检查。普通归档不能用 `--yes`、`--no-validate` 或 `--skip-specs` 绕过 FF 门禁。状态区分 missing、stale、needs-review、valid；上游修改会传递到下游，即使中间产物字节没变。
- 已补齐 canceled/rejected 的原生非提升归档：必须显式传 `--ff-disposition canceled|rejected`、`--ff-reason`、`--ff-decision-ref`；保留缺失审核、拒绝证据、过期或格式错误的原始产物，添加 create-only 的 `ff-disposition.json` 后归档，绝不合并 specs 或生成 accepted/pass。与普通归档共用锁；冲突、符号链接和跨文件系统移动失败关闭。
- 当前 spec 唯一权威为 `openspec/specs/`。其他产物留在显式 current 路径，没有自动 promotion。Git 保留历史和恢复能力。旧 Python spec-state 写入路径已退休，保留只读审计及原始代码/证据；迁移必须显式对照，不自动导入或制造验收。
- 12 个现有 skill、安装/迁移文档、使用手册与流程图完成更新，没有增加强制工作阶段。

完整字段、命令、构建和限制见 [CLI 接入说明](../tools/openspec/README.md)、[迁移说明](../MIGRATION.md)。

## rc2 实际验证结果（历史基线）

### 独立真实 CLI

最终打包重建的 CLI 实跑 **94 条命令，125/125 断言通过**。覆盖 12 类逻辑产物、多格式附件、两轮修改、传递失效、显式复核、缺失/拒绝/过期/错误版本审核、schema 改动、文件集合新增/删除/改名、中文与空格路径、Git 恢复、原生 archive 参数绕过负例以及 canceled/rejected 关闭。

最终测试前后 evaluator、archive、close 的 TypeScript 与编译 JavaScript 共 **6/6 文件哈希一致**。证据为 `validation/openspec-integration/checks.json`、`commands.json` 和 `package-terminal-integrity-check.json`。

独立审核另有 **11/11 关闭探针通过**，包含注入 rename 的 EXDEV、EIO，以及审核关闭记录写入 ENOSPC：原始文件字节与 canonical specs 保留，只清理由该操作新建的记录/锁/空目录。独立源代码审核报告随验证证据保留。

### 上游回归：如实保留失败

初始修改版全量上游测试为 **6,448 通过、19 失败**。这 19 项逐个在未修改的固定上游源码、相同环境中复现，名字完全匹配，涉及 Git/store 测试。不能将其写成全量通过，也不将复现结果扩大解释为已确定所有底层环境原因。

之后在源码归档构建目录的全量运行得到 **6,444 通过、23 失败**：除上述 19 项外，3 项 version-info 测试要求源码目录自身带 `.git`，而分发归档故意不携带 `.git`；另 1 项 generatedBy 测试的正则只允许正式 semver，不允许此改版的 prerelease 后缀。该正则已做窄范围修改以接受合法 prerelease，没有更改运行时行为或隐藏失败。

最终关闭功能加入后的受影响回归是 **522/522 通过**：archive/update/validate 457 项，status/apply/workflow 65 项。没有把这一组定向回归伪称为最终全量测试通过。之前全量日志、未修改上游对照与最终定向日志均保留。

### 复杂度与 CRAP

实际 V8 执行覆盖与安装的 ESLint classic complexity 规则计算了 **71 个新增/指定 JavaScript 函数**，无未测函数，最大 CRAP **14.9467**，全部低于硬上限 50。五个函数高于目标 10，已逐项列出，不称全部达到 10。snapshot 脚本实际执行，但没有声明函数，单独标为模块执行，不虚构函数 CRAP。

方法使用精确函数偏移匹配与保守 V8 范围段/字节覆盖，公式为 `CC² × (1 − coverage)³ + CC`；它不是 Istanbul 的语句/分支覆盖。原始执行记录只抽取相关脚本对象进行仓库内归档，公开前将宿主路径规范化为仓库相对逻辑路径；函数名、范围和计数未修改。保留原文件、规范化前子集与公开子集的 SHA256 对照，公开文件不声称与原始记录逐字节相同；完整原始记录留在非公开工作区。

Python 旧写入口的四个修改函数也重新实际测量，最大 CRAP **8.008**；没有复用 rc1 的旧覆盖率。详见 `validation/legacy-retirement-crap.json` 和 `validation/openspec-integration/final-terminal-crap.json`。

## 边界与剩余限制（rc2 证据范围；rc3 须另验）

- Windows 仅采用兼容路径/调用设计，未在 Windows 实跑。
- 哈希和 pass 声明不是视觉/语义正确性，也不是审核者身份认证或用户真实授权；decision-ref 同样只是引用。
- 正常 archive 在首个业务写入前复核 FF，随后保留上游 spec 指纹/回滚逻辑；不声称对恶意并发写入者具备完整事务隔离。
- canceled/rejected 关闭只用同文件系统 rename；EXDEV 不降级为复制删除。若 rename 已成功但锁清理失败，会明确报告已归档路径，不能当成未发生移动。进程强杀、系统崩溃持久性及所有磁盘故障组合未建立保证。
- 文件集合检测依赖声明范围：要检测新增文件，应使用 glob；仅列出精确文件不会自动管理同目录所有内容。
- 未实现任意非 spec 自动提升、任意文件格式语义合并、全功能新版本控制系统，也没有扩大访问权限或额外付费。
- 旧 rc1 案例与质量报告明确作为历史证据保存；rc2 接入结果以这里的 125/125、当时哈希和独立审核为准，不代表 rc3 已通过。

## rc3 最终构建实测

本轮独立入口源码补丁 SHA256：`44099ae1ea94b3a521ab3383616e6b0e8ac0a7be20c697323357a46bd21bb1c9`。固定官方档案加补丁干净重建成功；最终 launcher 黑盒 125/125、归档/工作流回归 318/318、核心探针 13/13、终态/故障注入 11/11。完整范围与共存边界见 [rc3 新证据](../validation/ff-spec-rc3/README.md)，不以历史 rc2 覆盖替代本轮测试。

最终同pin独立共存复测23项命令+4项注册隔离均符合预期；新增26项helper/command探针通过。真实V8覆盖与复杂度去重计量80个函数，0未测、0硬门禁失败，最高CRAP=14.9467；6个函数高于约10的优化目标，明确保留限制。新增共存范围13个函数最高11.0905，不能称全仓覆盖或所有函数达到10。
