# 实验5变更

- 新增唯一 npm bin ff-install，GitHub commit/分支源可用，不要求 npm registry 发布。
- 无 lifecycle scripts；复用实验4事务安装器，只有显式 --build 构建运行时。
- npm 包嵌入完整源 payload，先全成员/hash核验后项目内解包，绕开 npm pack 的源码过滤。
- 更新 README、INSTALL 和中文 npx 指南；显式项目内 npm cache 与实验边界。
- 实验4的13安装回归/42函数证据保持历史身份，实验5新增真实npm入口和解码安全测试。
