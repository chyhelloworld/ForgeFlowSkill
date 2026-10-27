from pathlib import Path
from html import escape
import subprocess
D=Path(__file__).parent
class SVG:
 def __init__(self,title,sub,h=1160):
  self.h=h;self.a=[f'<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="{h}" viewBox="0 0 1600 {h}" role="img"><title>{escape(title)}</title><defs><marker id="a" markerWidth="9" markerHeight="9" refX="8" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8" fill="none" stroke="#4c6578" stroke-width="1.5"/></marker></defs><rect width="1600" height="{h}" fill="#fafbf9"/><style>text{{font-family:"Noto Sans CJK SC",sans-serif;fill:#243947}}</style>'];self.text(40,53,title,32,True);self.text(40,91,sub,18)
 def text(self,x,y,t,size=20,bold=False):self.a.append(f'<text x="{x}" y="{y}" font-size="{size}" font-weight="{700 if bold else 400}">{escape(t)}</text>')
 def rect(self,x,y,w,h,fill='#fff',stroke='none'):self.a.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="13" fill="{fill}" stroke="{stroke}"/>')
 def box(self,x,y,w,h,name,lines,fill='#fff',size=23):
  self.rect(x,y,w,h,fill);self.text(x+18,y+32,name,size,True)
  for i,l in enumerate(lines):self.text(x+18,y+62+i*25,l,18)
 def line(self,pts,dash=False):self.a.append('<polyline points="'+' '.join(f'{x},{y}' for x,y in pts)+'" fill="none" stroke="#4c6578" stroke-width="2.2"'+(' stroke-dasharray="7 5"' if dash else '')+' marker-end="url(#a)"/>')
 def save(self,n):
  self.text(40,self.h-22,'旧版首次候选的后续可视化整理；不是模型一次直接生成的图片。拟议、未实现，细节见原架构文档。',16)
  p=D/(n+'.svg');p.write_text('\n'.join(self.a)+'</svg>');subprocess.run(['inkscape',str(p),'--export-type=png','--export-filename='+str(D/(n+'.png'))],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
s=SVG('01  多轮工具 Agent：对象与关键关系','保留旧版独立候选的三职责区与对象名；职责区不是三个服务。只展开关键契约关系，其余由流程说明。',1220)
s.rect(40,120,1520,185,'#fbf0d3');s.text(62,156,'会话核心  /  保存完整历史及调用关联',24,True)
s.box(65,175,345,109,'Conversation',['有序历史，维护记录约束','append(record)'])
for x,name,desc in [(440,'UserRecord','用户消息'),(710,'AssistantRecord','模型文本与 calls'),(980,'ToolCall','调用 ID、名称与参数'),(1250,'ToolResultRecord','按 callId 关联结果')]:s.box(x,184,245,86,name,[desc],size=21)
s.text(444,291,'Conversation 拥有这些记录；ToolCall 是 AssistantRecord 内的数据，不另造一条对话消息。',16)
s.rect(40,325,1520,470,'#e8eef4');s.text(62,362,'交互过程  /  组织输入，审查、执行、继续与保存',24,True)
s.box(65,385,345,115,'TurnProcess',['控制整个回合与追加时机','submit(id?, userText)'])
s.box(455,385,300,115,'ReplyComposer',['组织正常回答的输入','generate(snapshot, specs)'])
s.box(815,385,300,115,'ToolReviewer',['组织审查输入并校验结论','review(snapshot, call)'])
s.box(1175,385,360,115,'ToolExecutor',['获允许后查工具、校验并执行','execute(call)'])
s.box(65,615,345,130,'ConversationStore',['会话保存 / 读取 / 列表','save(snapshot)'],'#fff8e7')
s.box(455,615,660,130,'ModelPort  ·  complete(ModelInput, ModelConfig)',['回复与审查共用此接口；可注入不同实例 / 配置','ModelInput = 本轮输入视图：目的、指令、消息、工具说明'],'#fff8e7',22)
s.box(1175,615,360,130,'ToolCatalog',['说明与执行对象共用登记','specs() / resolve(name)'],'#fff8e7')
s.line([(230,500),(230,615)]);s.text(245,560,'消费',17)
s.line([(600,500),(600,615)]);s.text(615,560,'消费',17)
s.line([(965,500),(965,615)]);s.text(980,560,'消费',17)
s.line([(1350,500),(1350,615)]);s.text(1365,560,'查找',17)
s.text(65,1127,'过程协作：TurnProcess 编排 ReplyComposer / ToolReviewer / ToolExecutor；ReplyComposer 从 ToolCatalog 取工具说明。',18)
s.rect(40,815,1520,205,'#edf2ef');s.text(62,851,'外部适配',24,True)
s.box(65,890,345,100,'JsonlConversationStore',['保存为 JSONL','MemoryConversationStore：测试替代'],size=20)
s.box(455,890,660,100,'ProviderAdapter',['实现模型接口，转换供应商格式','供应商 / SDK 尚未选定，不声称真实接入已验证'])
s.box(1175,890,360,100,'ShellTool',['提供 spec / invoke；具体命令工具','进程能力待选；模型审查不是沙箱'])
s.line([(230,890),(230,745)],True);s.text(435,812,'实现',17)
s.line([(785,890),(785,745)],True);s.text(1155,812,'实现',17)
# Port implementation edges are drawn in reserved gaps; mask the band headings they would otherwise cross.
# Route edges using side gutter segments to avoid the descriptive line at y777.
s.a=[v for v in s.a if not ('points="230,890 230,745"' in v or 'points="785,890 785,745"' in v)]
s.line([(395,890),(425,890),(425,680),(410,680)],True)
s.line([(1095,890),(1145,890),(1145,680),(1115,680)],True)
s.text(65,1055,'工具链：生成请求 → 审查 → ReviewDecision（允许 / 理由）→ 允许才执行 → ToolResultRecord 写入历史 → 再次生成',20)
s.text(65,1091,'入口：CliEntry → TurnProcess；HttpEntry 为替换位置。无工具时跳过审查与执行；拒绝则记录结果、不执行。',19)
s.text(65,1170,'图例：实线 → 消费 / 查找契约；虚线 → 实现契约。底部箭头另表示运行顺序；未绘出所有源码依赖。',17)
s.save('01-objects-and-roles')
s=SVG('02  拟议概念目录 → 对象与启动连接','语言尚未选定：路径不加 .py 等扩展名。这里呈现原候选的目录分工，不代表已有产品源码。',1190)
s.text(45,140,'src/',27,True)
s.rect(40,162,745,206,'#fbf0d3');s.text(62,198,'core/  会话核心',24,True)
s.text(68,242,'conversation',21,True)
s.box(270,220,490,125,'Conversation',['UserRecord · AssistantRecord · ToolCall','ToolResultRecord；有序历史与调用关联'],size=22)
s.rect(40,390,745,570,'#e8eef4');s.text(62,429,'application/  交互过程',24,True)
for y,path,obj,desc in [(452,'turn','TurnProcess','回合推进 / 结果与列表用例'),(532,'reply','ReplyComposer','正常指令与模型输入组织'),(612,'review','ToolReviewer · ReviewDecision','审查指令 / 结论解析'),(692,'tools','ToolCatalog · ToolExecutor · Tool','登记 / 执行 / 工具契约'),(772,'ports/model','ModelPort · ModelInput','内部输入输出及 ModelConfig'),(852,'ports/storage','ConversationStore','会话保存、读取、列表契约')]:
 s.text(68,y+31,path,20,True);s.box(270,y,490,69,obj,[desc],size=20)
s.rect(815,162,745,798,'#edf2ef');s.text(838,198,'adapters/  外部适配',24,True)
for y,path,obj,desc in [(220,'models/provider_*','ProviderAdapter','待选供应商格式映射'),(355,'storage/jsonl','JsonlConversationStore','JSONL 会话存储'),(490,'storage/memory','MemoryConversationStore','相同存储契约的测试替代'),(625,'tools/shell','ShellTool','本地命令工具；执行机制待选'),(760,'entry/cli','CliEntry','首选入口；提交用例、显示结果')]:
 s.text(841,y+26,path,21,True);s.box(841,y+40,690,75,obj,[desc],size=22)
s.text(841,922,'HttpEntry：文中保留替换位置，未列入本次目录。',18)
s.rect(40,986,1520,123,'#f0edf6');s.text(62,1021,'composition  /  启动连接，不另算职责层',24,True)
s.text(62,1055,'读取配置 → 构造回复 / 审查的 ProviderAdapter 与 JSONL Store → ShellTool 登记到 Catalog',20)
s.text(62,1088,'构造 Executor、ReplyComposer、ToolReviewer → 注入 TurnProcess → 交给 CLI。普通构造参数，不加容器。',20)
s.text(40,1146,'映射约定：每行左侧是拟议路径，右侧是对象 / 类型；只表示落点，不表示调用方向。',18)
s.save('02-conceptual-paths')
