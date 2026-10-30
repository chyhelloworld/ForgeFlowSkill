# ARCH-01

## 原始用户请求（原样保留）

请参考国内软件工程或系统架构设计常用的规范与实践处理本任务，有相关适用的国内标准时优先参考；不必为每份回答强行罗列标准编号，未核实适用性、有效版本或正文时不要宣称符合国标。

我们在做小型会议室预订服务，请给开发交接用的架构说明及必要的图，避免一张图塞满实现细节。前端只调 Booking API；API 依赖 BookingService 和 RoomRepository 的接口，PostgresRoomRepository 实现后者。核心能力是 BookingService.checkAvailability(roomId, slot)、createBooking(userId, roomId, slot, requestId)、cancelBooking(userId, bookingId)。创建时先校验权限和时段，再由数据库事务检查冲突并写入预订及 outbox，成功后返回；后台 Publisher 投递通知事件，通知失败不能回滚预订。模块静态依赖与一次创建请求的运行时调用都要看得清。请明确哪些约束适合文字说明，不要把所有函数都画成模块。

## 交付
开发交接使用两视图，不新增部署方案：
- [静态模块依赖](ARCH-01-static.svg)，可编辑源 [DOT](ARCH-01-static.dot)。箭头从使用者指向被依赖接口；实现箭头由 PostgresRoomRepository 指向 RoomRepository。
- [创建请求运行视图](ARCH-01-runtime.svg)，SVG 本身可编辑；按生命线表达同步请求/回复及独立后台路径。

**契约保持原名**：`BookingService.checkAvailability(roomId, slot)`、`createBooking(userId, roomId, slot, requestId)`、`cancelBooking(userId, bookingId)`。它们是同一服务的操作，不是三个模块。前端只调用 Booking API；API 的两项接口依赖均保留。接口实现类名称及 Service 到仓储的调用分配没有给定，因此运行图标为交接候选，而非已核实源码事实。

**适合文字的约束**：权限与时段必须先校验；checkAvailability 仅为查询，不能代替创建事务中的冲突检查；预订与 outbox 原子提交；提交成功才返回成功，通知失败不能回滚。冲突/事务失败返回失败，不生成可投递的已提交事件。数据库并发冲突保护应在实现中明确锁/约束/隔离策略，当前不替用户选定。requestId 已在契约中，但幂等键范围、保留期和同键异参行为待确认。取消的权限和状态规则、通知重试/去重策略、RoomRepository 实际方法签名也待确认；不虚构已实现接口。

## 依据及交付边界
采用国内软件工程常见的分视图、结构化分析和概念建模表达；UML符号使用国际UML通用约定作为补充。未取得并逐条核对适用国标正文，不声明国标合规。图中需求给定项与待确认/建议项分开，不代表业务新增规则获准。

## 实际检查
已实际渲染并用 view_image 查看本案全部图；中文、箭头端点与裁切检查及自然尺寸见 [检查记录](CHECKS.md)。语义未知见上文，未确认项不作为已批准设计。
