# DHAgent 真实项目安装验证（0.9.11）

日期：2026-11-02 23:19–23:21（Asia/Shanghai）
项目：E:\github\DHAgent（真实项目；安装前无 .forgeflow/.dsh/openspec，且不是 git 仓库）
安装源：E:\github\ForgeFlowSKill\source\bin\ff-install.mjs（bundled 0.9.11 payload）
日志：_verification/rsi-20261102/dha-agent-install-0.9.11.log、dha-agent-doctor.txt

## 命令与结果

`node bin\ff-install.mjs install --project E:\github\DHAgent --host dsh --mode full --build`

- exit 0；status INSTALLED，version 0.9.11-dsh.1，mode full
- .forgeflow/install/state.json：version=0.9.11-dsh.1、files=196、含 .forgeflow/ff-rsi.mjs
- .dsh/skills：21 个 ff-* 技能目录
- .forgeflow/dsh-plugin：7 个文件（与 0.9.9/0.9.10 安装相同布局）
- `node .forgeflow\ff-spec.mjs --version` → 0.9.11-dsh.1（exit 0）
- `node .forgeflow\ff-rsi.mjs --version` → 0.9.11-dsh.1（exit 0）
- `node .forgeflow\install\doctor.mjs --host dsh` → exit 0；status=RUNTIME_READY、
  version=0.9.11-dsh.1、mode=full、discovery root=.dsh/skills skills=21、
  handshake skills/state/cli=0.9.11-dsh.1 verdict=MATCH。

## 边界

- Host 半（ff_status/ff_gate、四层锚点、archive 守卫、看板入口）由全局插件
  C:\Users\admin\.dsh\plugins\forgeflow-dsh 提供，对所有 profile/工作区生效；
  本次只验证了项目侧安装（技能/CLI/门禁文件），没有在 DHAgent 工作区新开 DSH 会话做
  工具调用的端到端冒烟。
- DHAgent 无 openspec/，因此 ff_gate 预期为 disabled；看板预期显示
  “未找到 .forgeflow/board.json”的空态提示（演示目录 run 不参与）。
- DHAgent 不是 git 仓库，安装器只给出 git 建议，未初始化仓库或改 .gitignore。
