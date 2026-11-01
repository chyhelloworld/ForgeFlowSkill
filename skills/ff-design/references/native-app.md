# 原生 App：按目标平台与框架选参考

Modified for ForgeFlow on 2026-11-01. 选择性改编 Impeccable 的 iOS、Android 和 native audit；来源、Apache-2.0 许可见 [NOTICE](../NOTICE.md)。本文件的跨端选择、业务恢复与证据分层是 FF 补充，不是上游运行能力。

## 先定位本轮，不重做需求问卷

复用已确认的用户目标、品牌、页面/组件、操作旅程、目标 OS、设备类别与实现框架。只问会改变设计且仍未知的项。区分两条轴：**目标 OS**（iOS/iPadOS、Android）与**实现框架**（Flutter、React Native、SwiftUI/UIKit、Compose/Views）。Flutter 不等于 Android，也不等于两端已验证。

- iOS/iPadOS 目标：读取 [iOS](ios.md)。Android 目标：读取 [Android](android.md)。双平台都读，逐端记录差异。
- Flutter/RN 跨端项目：共享品牌、设计 token 与业务规则，不强制整套 Cupertino 或 Material 同外观；系统返回、输入、无障碍等平台保证分别验证。
- App 审查：按 [原生审查](native-audit.md)；不是新增门禁或上游命令安装。审查请求不自动授权修复。
- Web 管理后台沿原通用流程；产品营销网页才使用 landing-page。混合仓库只处理当前所选界面，不能因 App 存在就对网页小改执行原生审查，不能因有官网就把 CTA/社会证明套进设置页。
- 已有方向或局部修正只检查受影响路径，不强制候选重选、全部清单或整站重做。尚未确认的重大视觉/交互方向仍遵守 ff-design 用户选择流程。

## 把通用要求落到实际框架

先核项目 SDK、组件库、导航和权限方案，沿既有实现查找对应能力，不为一张页面引入新框架。

| 设计问题 | Flutter 定位入口（不是可直接粘贴的实现） | 其他框架边界 |
| --- | --- | --- |
| 系统遮挡/安全区 | SafeArea、MediaQuery 的 padding/viewInsets；键盘需要独立处理，SafeArea 不保证输入与主按钮不被键盘遮住 | SwiftUI/UIKit 用对应 safe-area 和键盘布局；Compose/Views 用 window/IME insets，不能搬 Dart API |
| 返回/草稿 | 核现有 Router/Navigator 与 PopScope 策略；区别取消、保存、系统返回与边缘手势 | iOS 手势与 Android 系统/预测返回并不等价；不同框架的守卫/恢复语义分别查证 |
| 字体/主题/语义 | 沿 TextTheme、ColorScheme/项目 token，保留系统文字缩放与语义标签；不靠固定高度压回大字体 | SwiftUI 的文字样式、Compose 的角色并非 Flutter 的 API；不要混写示例 |
| 长列表/输入/恢复 | 查现有列表构建、焦点、草稿状态和生命周期实现；代码检查仅定位风险 | 不以使用某组件就宣布性能或恢复正确 |

Flutter 官方定位（2026-11-01 读取，实施时以项目 SDK 为准）：[SafeArea](https://api.flutter.dev/flutter/widgets/SafeArea-class.html)、[MediaQuery](https://api.flutter.dev/flutter/widgets/MediaQuery-class.html)、[PopScope](https://api.flutter.dev/flutter/widgets/PopScope-class.html)。例如 PopScope 的 canPop=false 会阻止返回；iOS Cupertino 路由手势可能连回调也不触发，不能笼统声称“拦截后弹确认框”在两端都成立。未知的 API 或行为查官方资料/现有测试，不猜。

## 业务恢复检查（FF 补充，按本轮风险选用）

每个检查说明前置状态、用户动作、预期结果、恢复入口和观察证据，复用已有旅程而不另建状态库：

- 键盘输入：输入/切换焦点/收起键盘后，字段、错误提示、主要操作仍可见；返回、取消或旋转不能无意丢草稿。
- 语音等权限：首次请求、拒绝、永久拒绝/系统设置返回分开；拒绝后提供可用替代（如文字输入），不循环强求授权，不假定已同意。
- 前后台/中断：录音中失焦或切后台后的停止/暂停/恢复策略需确认；不能默许后台录音。回来时说明真实状态，避免双录、重复提交与未保存内容丢失。
- 离线/失败/重试：区分未保存、保存中、成功和失败；保留合理草稿、反馈重试结果，重复点击/网络恢复不制造重复记录。产品未定义自动同步时标待确认，不擅自增加功能。
- 大字/读屏/减少动态效果：检查焦点顺序、名称/角色/状态播报、截断与缩放，以及不依赖动效才能理解的替代。

## 证据不是同一层

源码可支持“存在/缺少某处理”的定位；设计图支持设计意图；模拟器/仿真器截图支持该配置的画面；实际操作支持所操作路径；物理设备测量才支持对应手势/性能/姿态结论。每条结论标目标版本、OS/设备或模拟器、设置、操作与结果。没有这些工具就交待检查路径和未验证项，不伪造通过。

浏览器390px预览、Flutter Web运行、截图文件存在、静态脚本通过，均不能替代 iOS/Android 原生验收。视觉原型可以使用 Web，但清楚标为原型。不要启动上游 engine/detect、安装 hooks/live 或修改用户设备设置来“自动补证据”；需要的工具/权限仍按当前授权处理。
