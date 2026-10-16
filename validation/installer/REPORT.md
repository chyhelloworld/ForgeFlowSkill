# 项目内安装真实验证报告

版本：0.6.0-experimental.4，Linux/Node v24.19.0。生产代码测量文件及sha256见 crap.json。

## 证据
- unit-tests.log：13项真实Node测试全部通过，无skip；两宿主目录、中文空格、重入、用户修改、未管理冲突、受控升级/回滚、提交失败恢复、历史release篡改阻止rollback、项目移动、源码/目标symlink/清单篡改、参数和依赖探测。
- full-build.log：真实网络获取锁定依赖、构建并校验CLI成功。只将具体测试目录和随机stage标识替换为逻辑标记，保留工具输出语义。
- independent-flows.json：独立8组CLI/文件系统验证。
- independent-upgrade-recovery.json：真正SIGKILL后的恢复与受控版本fixture升级/回滚；不是模拟实际新发行版。
- independent-full.json、independent-review.md：独立full实际入口、整体搬动、官方CLI碰撞、运行时篡改及边界检查。
- crap.json：ESLint真实逐函数CC＋同字节代码的V8范围覆盖；42函数无NOT_MEASURED，最大CRAP18.01，5项超过目标10但无超过50。

## 可复现命令

在已核对来源的包根目录：

```sh
node --test tools/installer/tests/install.test.mjs
python tools/validate_package.py .
python validation/scan_privacy.py .
```

覆盖率：把NODE_V8_COVERAGE设置为项目内单独证据目录，运行上述Node测试以及full项目的installer doctor。measure-crap.mjs参数为包目录、原始V8目录、已构建固定FF的.build目录、输出JSON。生产文件hash必须与报告相同；只接受精确函数offset和字节一致的样本。原始V8含测试路径，未放入公开包，仅发布对应sha256和归一化结果。

## 明确未覆盖
Windows原生与真实宿主技能发现/调用；掉电持久事务；卸载/清理；在用户真实项目创建规格或批准业务门禁。full构建依赖网络，依赖缺失会阻塞。源码与manifest校验不是签名，发布zip必须通过可信渠道核对hash。

安装代码覆盖用版本固定的实现sha256对应；完整MANIFEST在纳入本报告与独立证据后重新冻结，因此报告生成前测试安装时的完整清单hash与最终包清单hash可能不同，生产实现字节不变。最终冻结包另做完整静态验证及新项目skills-only烟测。
