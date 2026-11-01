# 原生 App 设计参考

当前 ff-design 可按需加载 iOS、Android 与原生审查资料；仍是21技能，不是新增执行工具或宣称App自动验收。入口在 [ff-design](../../skills/ff-design/SKILL.md)，分流见 [native-app](../../skills/ff-design/references/native-app.md)。

例：“沿现有品牌，为 Flutter 的 iOS+Android 记录页核对键盘、返回、语音权限与草稿恢复，只做设计和检查方案，没有设备时明确未验证。”

复用既有需求和方向，不重问平台；双端目标分别考虑系统保证。iOS、Android为目标，Flutter/RN/SwiftUI/Compose为实现框架，不能相互替代。营销网页与Web后台保持自己的流程，局部改字不重做全套审查。品牌字体/共享组件不会仅因非系统默认就被否决。

参考包括安全区、键盘/IME、返回与草稿、触控/字号/读屏、主题/减少动画以及已支持设备适配。权限拒绝、前后台录音中断、离线重试等是FF补充的按需业务场景；没有定义的新功能标待确认，不自动加同步或后台录音。

源码只支持静态风险，浏览器小屏不是原生验收；模拟器截图不等手势、读屏和性能实测。交付应分清已经观察、源码风险、待验证和不适用，并关联目标版本/平台/设备。当前包本身不包含设备、SDK、运行时或Impeccable engine/hooks/live，安装不等于项目实机通过。

来源选择性改编自 Impeccable 固定版本2f98774f的三份资料，沿Apache-2.0归属；详见[NOTICE](../../skills/ff-design/NOTICE.md)。ff-design 未登记独立更新版本，采用现有整包更新方式，以提交和manifest识别本轮；不要用仅支持已登记独立技能的update-skill误称它能单独升级。仅云端源码修改不等用户安装已生效。
