# 实际行为试用交付与检查记录

六案逐一交付，原始 prompt 原样保存在各案 md。生成 9 个视图；SIMPLE-06 不生成图。仅写入本结果目录及临时工具文件，未改仓库、未发布或外传。

## 实际渲染与视觉检查

- 7 个 DOT 视图使用 Graphviz 2.42.4 渲染 SVG 与 PNG；均返回成功。中文字体 Noto Sans CJK SC，Fontconfig 报不可写缓存，但实际图中文字显示完整。
- 2 个手工工程 SVG 时序视图使用系统 librsvg 2.60.0 + Cairo 经 ctypes 渲染 PNG。SVG 即可编辑图源，不需要 Mermaid 或 AI 栅格图。
- Chromium 首次因默认用户数据目录失败，指定 /tmp 后仍因 socket 权限失败；ImageMagick 的 rsvg-convert 可执行文件缺失。未宣称这两条渲染途径成功，也未升级权限；使用已有动态库完成导出。
- 实际以 view_image 查看全部 9 张 PNG；时序图的嵌套 alt 边框做了缩进修正后再次渲染查看。文字完整、中文非方框，箭头端点与虚实线可辨，没有发现画布裁切；DFD 双横线存储与 ER 菱形联系可辨。自然尺寸如下。
- 目标是桌面开发交接/业务讨论，不承诺手机或 A4 缩印可读。DFD 子图、状态图较宽，需原尺寸横向查看或使用 SVG 放大；没有把缩小缩略图当最终字号验收。

| 视图 | PNG 自然像素尺寸 | 已查看预览 |
|---|---|---|
| ARCH-01-runtime | 1250 × 805 | [ARCH-01-runtime.png](ARCH-01-runtime.png) |
| ARCH-01-static | 1175 × 431 | [ARCH-01-static.png](ARCH-01-static.png) |
| DFD-02-context | 726 × 208 | [DFD-02-context.png](DFD-02-context.png) |
| DFD-02-decompose | 1917 × 289 | [DFD-02-decompose.png](DFD-02-decompose.png) |
| DFD-02-level1 | 1055 × 311 | [DFD-02-level1.png](DFD-02-level1.png) |
| ER-03-concept | 1476 × 321 | [ER-03-concept.png](ER-03-concept.png) |
| FLOW-05-process | 1196 × 1365 | [FLOW-05-process.png](FLOW-05-process.png) |
| FLOW-05-state | 1772 × 353 | [FLOW-05-state.png](FLOW-05-state.png) |
| SEQ-04-order | 1320 × 1260 | [SEQ-04-order.png](SEQ-04-order.png) |

## 语义走读及未确认项

ARCH：静态依赖与运行时分离；API 两个接口依赖保留，实现方向指向接口；运行时仓储方法/调用分配为候选。事务与通知边界文字明确。
DFD：六条系统外部流平衡，加工1子图按文档列出的复合流组成平衡；没有新增参与方或控制判断；字段细化为讨论候选。
ER：概念联系/属性而非表结构；工具基数及重复借用条件保留未知。
SEQ：授权拒绝、超时未知、本地提交失败、邮件失败分开；成功提交后事件独立投递，重复/幂等与补偿未必成功明确。
FLOW：仅五种内容状态；条件与拒绝出口覆盖；并发原子保护为实现建议，不新增超时规则。
SIMPLE：只给小范围变更与验收，不补图，不声称修改了实际页面。

以上是执行者走读和视觉检查记录，不是自评分、独立评审或业务批准。业务未知均保留在各案文档。

## 实验局限

六案在一个连续上下文中执行，不是六个独立干净会话；按本批实际覆盖的图种加载了 core、architecture、data、uml，无法声称单案只见对应参考的隔离测试。没有读取评审 rubric、baseline 结果或旧版输出。执行中收到技能文字更新通知并重读 SKILL/core，主要图稿在通知前已生成；因此这是迭代中的实际试用，不是严格冻结版本随机对照实验。未外部独立查证标准正文，没有国标合规声明。SHA256SUMS 绑定图源、渲染及文档实际文件；SKILL-HASHES 保存最终重读技能的 hash。
