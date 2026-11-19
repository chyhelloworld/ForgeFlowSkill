# ff-rsi 真实项目五动词闭环（0.9.11）

日期：2026-11-02 23:19–23:27（Asia/Shanghai）
宿主项目：E:\github\DHAgent（真实项目，安装 0.9.11-dsh.1）
工具：E:\github\DHAgent\.forgeflow\ff-rsi.mjs（与 source/tools/rsi/ff-rsi.mjs 哈希一致）
演示目录（临时，未提交）：E:\github\DHAgent\_verify_tmp\rsi-demo-0.9.11
归档证据：_verification/rsi-20261102/five-verb/

## 目的

验证 0.9.11 新增的 ff-rsi 不只在单测里可用，而是在一个**真实安装的项目**里能完成
freeze → compare → promote/withdraw → status 的完整链路，并验证“审核不过不得晋级”
与“记录不等于激活”两条边界。演示用例是一个 4 行的 fixture（重复发货抑制），
不是真实 FF 技能改进；它只检验工具链与证据绑定，不证明候选业务正确性。

## run1：假修复被独立审核拦下

命令：
- freeze：--fail cases/fail.json --normal cases/normal.json（旧版重复发货 exit 1；正常单次 exit 0）
- compare：旧版 fail=FAIL、新版 fail=PASS、normal 两侧 PASS → 结论 PASS
- 独立审核（新上下文 subagent，只读并写 review.json）→ verdict=fail

审核者实际发现：候选把 `process.exit(fail ? 1 : 0)` 改成无条件 `process.exit(0)`，
并没有任何幂等逻辑；失败样本被改成永不失败，正常对照的 PASS 也随之恒真。
这是“关闭负向检测”的假修复，机械门禁（compare=PASS）会放行，但 review 拦住了。

- promote：exit 2，原文 `Error: review.json 的 verdict 必须是 pass`
- withdraw：exit 0，state=WITHDRAWN，reason 记录审核结论
- status：`{"state":"WITHDRAWN"}`

结论：review 与 promote 的拒绝路径真实生效，撤销保留全部原件。

## run2：真实去重候选通过并晋级

候选实现：用 `Set` 包装 `deliver(id)`，重复 id 返回 false；fail 分支保留
`first === true && second === false` 断言，否则 exit 2。

- freeze：run2，2 个用例（fail/normal），命令同为 `node check.mjs`，仅 env CASE 不同
- 观测（实际执行）：
  - fail old: exit=1 reproduced: duplicate delivery → FAIL
  - fail new: exit=0 first=true second=false → PASS
  - normal old/new: exit=0 normal: single delivery → PASS/PASS
- compare：exit 0，conclusion=PASS，candidateHash=63ad6efb71921ff231eab6aab3748180fd0f29aa9e6a523a4242e2d879025798
- 独立审核（另一个新上下文 subagent）→ verdict=pass，independence=L1-separate-context
  - candidateHash 实测与 compare 一致；compareHash=7b48dd3097bdd6060d4e4ea3652a126d0aab893a593c04890877831ef6b999cd
  - 审核者做了 broken-guard 对照：故意让 guard 失效得到 exit 2，证明断言仍真实生效
- promote：exit 0，state=PROMOTION_RECORDED；写入 userQuote/userRef、candidateHash、reviewHash、
  activationHint（记录不是激活）、rollbackHint
- status --dir：PROMOTION_RECORDED
- status --installed run2/candidate：PROMOTED（同哈希才显示已生效；演示用 candidate 目录模拟安装目标）
- status --list 演示根：run1=WITHDRAWN、run2=PROMOTION_RECORDED

## 独立审核保留的风险（未修，记录在案）

1. `compare.rows[].rawSha256` 全为 null：原始 stdout/exit code 没有哈希绑定，离
   “原始回答与评分绑定”还差一环，建议下一版把 stdout/exit 纳入哈希。
2. run2 的 normal 分支直接 exit 0、从未调用 deliver，PASS→PASS 属恒真证据；
   演示只证明工具链，不证明业务覆盖。
3. 候选去重是进程内 Set、键写死 'evt-1'、无持久化/多进程防护；CASE 大小写敏感。
4. 演示 fixture 位于临时目录，归档只保留 run/cases/compare/review/promotion 与观测文件，
   不进入发布包。

## 结论

五动词在真实安装项目上均可执行；错误候选会被独立审核拦下且 promote 拒绝；
正确候选可记录晋级，status 能区分记录/生效，withdraw 可追溯撤销。
这是工具链证据，不是“RSI 已自动改进 FF”的证据。
