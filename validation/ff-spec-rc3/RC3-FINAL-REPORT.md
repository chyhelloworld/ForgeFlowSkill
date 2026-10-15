# rc3 最终独立共存复测

固定 patch SHA256：`44099ae1ea94b3a521ab3383616e6b0e8ac0a7be20c697323357a46bd21bb1c9`。
隔离 fixture：`temporary:ff-rc3-independent-b_hza45w`。
覆盖输出：`temporary:ff-rc3-pinned-coverage`。

结论：23项命令测试 + 4项注册隔离测试符合预期，另做版本、JSON门禁、文件哈希保留及拒绝后无副作用断言。修复后的 store 提示已指向固定 launcher。

## 命令与结果

- official PATH：exit 0；符合预期。
  - `openspec --version`
- FF explicit under official PATH：exit 0；符合预期。
  - `node repo:/tools/openspec/ff-spec.mjs --version`
- npm exec picks official：exit 0；符合预期。
  - `npm exec --offline -- openspec --version`
- FF explicit under local official bin：exit 0；符合预期。
  - `node repo:/tools/openspec/ff-spec.mjs --version`
- official init creates skills：exit 0；符合预期。
  - `node official:/bin/openspec.js init --tools agents --no-animation`
- FF init none preserves official assets：exit 0；符合预期。
  - `node repo:/tools/openspec/ff-spec.mjs init --tools none`
- rejected init：exit 1；符合预期。
  - `node repo:/tools/openspec/ff-spec.mjs init`
- rejected init --tools agents：exit 1；符合预期。
  - `node repo:/tools/openspec/ff-spec.mjs init --tools agents`
- rejected init --tools none --force：exit 1；符合预期。
  - `node repo:/tools/openspec/ff-spec.mjs init --tools none --force`
- rejected init --tools none --profile core：exit 1；符合预期。
  - `node repo:/tools/openspec/ff-spec.mjs init --tools none --profile core`
- rejected update --force：exit 1；符合预期。
  - `node repo:/tools/openspec/ff-spec.mjs update --force`
- rejected experimental --tool agents：exit 1；符合预期。
  - `node repo:/tools/openspec/ff-spec.mjs experimental --tool agents`
- rejected completion bash：exit 1；符合预期。
  - `node repo:/tools/openspec/ff-spec.mjs completion bash`
- rejected version --check：exit 1；符合预期。
  - `node repo:/tools/openspec/ff-spec.mjs version --check`
- invalid FF status：exit 0；符合预期。
  - `node repo:/tools/openspec/ff-spec.mjs status --change demo --json`
- invalid FF apply：exit 0；符合预期。
  - `node repo:/tools/openspec/ff-spec.mjs instructions apply --change demo --json`
- invalid FF validate：exit 1；符合预期。
  - `node repo:/tools/openspec/ff-spec.mjs validate demo --type change --strict --json`
- invalid FF archive：exit 1；符合预期。
  - `node repo:/tools/openspec/ff-spec.mjs archive demo --yes --no-validate --skip-specs --json`
- known boundary official ignores FF gate：exit 0；符合预期。
  - `node official:/bin/openspec.js archive demo --yes --no-validate --skip-specs --json`
- config and data paths isolated：exit 0；符合预期。
  - `node --input-type=module -e import * as f from 'repo:/tools/openspec/.build/dist/core/global-config.js';import * as o from 'official:/dist/core/global-config.js';console.log(JSON.stringify({ff:[f.getGlobalConfigDir(),f.getGlobalDataDir()],official:[o.getGlobalConfigDir(),o.getGlobalDataDir()]}))`
- missing build refusal：exit 1；符合预期。
  - `node temporary:ff-rc3-independent-b_hza45w/launcher/ff-spec.mjs --version`
- official package identity refusal：exit 1；符合预期。
  - `node temporary:ff-rc3-independent-b_hza45w/launcher/ff-spec.mjs --version`
- modified runtime refusal：exit 1；符合预期。
  - `node temporary:ff-rc3-independent-b_hza45w/launcher/ff-spec.mjs --version`
- official create registered store：exit 0；符合预期。
  - `见 rc3-store-results.json / retest-rc3-store.py`
- official sees its store：exit 0；符合预期。
  - `见 rc3-store-results.json / retest-rc3-store.py`
- FF does not inherit official store：exit 0；符合预期。
  - `见 rc3-store-results.json / retest-rc3-store.py`
- FF explicit unknown official store fails：exit 1；符合预期。
  - `见 rc3-store-results.json / retest-rc3-store.py`

## 验证内容

- PATH/本地 npm exec 保留官方版本，FF明确入口使用rc3。
- FF init --tools none 保留全部已有官方技能/config字节；未指定none、tools agents、force、profile、update、experimental agents、completion、registry update均拒绝且项目字节不变。
- FF无效policy导致status有效性false、apply blocked、validate/archive退出1，活动change保留。
- 缺失build、官方包identity、运行时代码变更均在执行前拒绝，未运行篡改payload。
- config/data 命名空间和实际store注册隔离：FF看不到仅官方注册的store，指定它也失败。
- 十二技能与安装/契约不含可执行裸 openspec status/apply/validate/archive 示例（静态检查）。

## 明确边界

- 官方CLI有文件写权限仍可归档兼容openspec目录且不遵守FF gate，此负例本轮再次确认。rename与入口校验不提供文件系统安全边界。
- 未在Windows执行，未做全局npm安装或npm发布。模拟PATH和本地.bin验证的是选择路径；不代表真实用户宿主安装已完成。
- 本报告是独立共存和负例复测，未声称自己重跑完整上游测试；完整业务E2E和上游回归由实现工人的证据另列。
- 未修改发布树。原始完整命令/输出为rc3-results.json、rc3-store-results.json，重跑脚本每次创建新临时目录。

## 最终 pin 再验证

2026-10-15 07:25 UTC：对正式纳入8项诊断期望的最终源码补丁重新执行全部23+4项测试，不是沿用旧hash结果。全部符合预期，JSON语义/字节保留断言再次通过。最终结果JSON自带patchSha256、repo、officialRoot与coverage路径。
