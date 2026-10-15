from pathlib import Path
from html import escape
import xml.etree.ElementTree as E
p=Path(__file__).parent/'diagrams';p.mkdir(exist_ok=True)
def build(name,title,subtitle,nodes,edges,notes,H):
 W=1400
 svg=[f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}" role="img" aria-label="{title}"><defs><marker id="a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10Z" fill="#587386"/></marker></defs><rect width="{W}" height="{H}" fill="#f5f8fb"/><style>text{{font-family:"Noto Sans CJK SC","Microsoft YaHei",sans-serif;fill:#172d40}}.t{{font-size:30px;font-weight:700}}.s{{font-size:19px;fill:#52687b}}.n{{font-size:20px}}.e{{font-size:17px;fill:#52687b}}</style>',f'<text x="50" y="56" class="t">{title}</text>',f'<text x="50" y="92" class="s">{subtitle}</text>']
 mx=E.Element('mxfile',host='app.diagrams.net');dia=E.SubElement(mx,'diagram',id=name,name=title);model=E.SubElement(dia,'mxGraphModel',dx=str(W),dy=str(H),grid='1',gridSize='10',page='1',pageWidth=str(W),pageHeight=str(H));root=E.SubElement(model,'root');E.SubElement(root,'mxCell',id='0');E.SubElement(root,'mxCell',id='1',parent='0')
 def cell(i,value,x,y,w,h,style):
  c=E.SubElement(root,'mxCell',id=i,value=value,style=style,vertex='1',parent='1');E.SubElement(c,'mxGeometry',x=str(x),y=str(y),width=str(w),height=str(h),attrib={'as':'geometry'})
 for i,v,y,sz in [('title',title,20,30),('subtitle',subtitle,65,19)]+[(f'note{k}',v,H-120+k*30,19) for k,v in enumerate(notes)]:
  cell(i,v,50,y,1300,40,f'text;html=0;align=left;whiteSpace=wrap;strokeColor=none;fillColor=none;fontFamily=Noto Sans CJK SC;fontSize={sz};')
 for i,(x,y,w,h,lines,kind) in nodes.items():
  col={'main':'#e1edf5','choice':'#fff0d8','end':'#e2efe8','plain':'#ffffff'}[kind]
  svg.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="14" fill="{col}" stroke="#a9bac8" stroke-width="1.5"/>')
  for j,line in enumerate(lines):svg.append(f'<text x="{x+w/2}" y="{y+h/2-(len(lines)-1)*15+j*30+7}" text-anchor="middle" class="n">{escape(line)}</text>')
  cell(i,'\n'.join(lines),x,y,w,h,f'rounded=1;whiteSpace=wrap;html=0;fillColor={col};strokeColor=#a9bac8;fontFamily=Noto Sans CJK SC;fontSize=20;')
 for k,(src,dst,label,points,lx,ly) in enumerate(edges):
  svg.append('<polyline points="'+' '.join(f'{x},{y}' for x,y in points)+'" fill="none" stroke="#587386" stroke-width="2" marker-end="url(#a)"/>')
  if label:svg.append(f'<text x="{lx}" y="{ly}" class="e">{escape(label)}</text>')
  sx,sy,sw,sh,*_=nodes[src];tx,ty,tw,th,*_=nodes[dst];ex,ey=(points[0][0]-sx)/sw,(points[0][1]-sy)/sh;ix,iy=(points[-1][0]-tx)/tw,(points[-1][1]-ty)/th
  c=E.SubElement(root,'mxCell',id=f'e{k}',value='',style=f'edgeStyle=none;rounded=0;html=0;endArrow=block;strokeColor=#587386;exitX={ex};exitY={ey};exitDx=0;exitDy=0;entryX={ix};entryY={iy};entryDx=0;entryDy=0;',edge='1',parent='1',source=src,target=dst);g=E.SubElement(c,'mxGeometry',relative='1',attrib={'as':'geometry'});E.SubElement(g,'mxPoint',x=str(points[0][0]),y=str(points[0][1]),attrib={'as':'sourcePoint'});E.SubElement(g,'mxPoint',x=str(points[-1][0]),y=str(points[-1][1]),attrib={'as':'targetPoint'});arr=E.SubElement(g,'Array',attrib={'as':'points'})
  for x,y in points[1:-1]:E.SubElement(arr,'mxPoint',x=str(x),y=str(y))
  if label:cell(f'label{k}',label,lx,ly-23,360,30,'text;html=0;align=left;strokeColor=none;fillColor=none;fontSize=17;fontFamily=Noto Sans CJK SC;')
 for j,line in enumerate(notes):svg.append(f'<text x="50" y="{H-95+j*30}" class="s">{escape(line)}</text>')
 svg.append('</svg>');(p/(name+'.svg')).write_text('\n'.join(svg));E.indent(mx);(p/(name+'.drawio')).write_text(E.tostring(mx,encoding='unicode'))
def edge(a,b,pts,label='',x=0,y=0):return(a,b,label,pts,x,y)
N={
'a':(370,140,660,90,['明确目标、范围与授权','新项目通常从 ff-grill 开始'],'main'),
'b':(370,290,660,100,['ff-grill 澄清用户与成功条件','已有明确确认可复用，不重复盘问'],'main'),
'c':(370,470,660,110,['ff-spec 确认基线与稳定需求 ID','openspec/specs + changes；验收可追踪'],'main'),
'd':(40,650,390,110,['ff-design 可选','视觉/交互方向需要选择','候选 → 选择 → 回写规格'],'choice'),
'e':(970,650,390,110,['ff-prove 可选','技术/真实环境存在关键未知','有界实验 → 证据 → 回写规格'],'choice'),
'f':(470,650,460,110,['规格与关键未知已就绪？','缺项回到对应责任补齐','无相关未知可跳过两侧环节'],'choice'),
'g':(370,850,660,110,['ff-plan 把确认变更拆成可执行票据','artifact ID → 依赖指纹 → 验收与证据'],'main'),
'h':(370,1030,660,110,['ff-review · plan','独立审查计划覆盖与可执行性','问题回到 Plan 或 Spec，复审后继续'],'plain'),
'i':(370,1210,660,110,['ff-implement 实施已获准切片','status / apply 判定 + 授权 → 实现 → 测试','每片保存当前版本的证据和检查点'],'main'),
'j':(370,1390,660,110,['ff-review · goal-mainflow + code','独立检查目标/真实主流程及代码风险','缺陷返回 Implement；需求偏移返回 Spec'],'plain'),
'k':(370,1570,660,110,['验证与人工接受分别记录','verified ≠ accepted ≠ archived','依赖或审核过期：FF gate 阻塞 archive'],'choice'),
'l':(370,1750,660,110,['ff-deliver 交付并记录规格状态','archive 正常路径同步 specs；取消不伪造 pass','PR 可选；不自动合并主分支或发布'],'end')}
Eds=[edge('a','b',[(700,230),(700,290)]),edge('b','c',[(700,390),(700,470)]),edge('c','f',[(700,580),(700,650)]),edge('c','d',[(370,525),(235,525),(235,650)],'视觉未知',80,510),edge('c','e',[(1030,525),(1165,525),(1165,650)],'技术未知',1100,510),edge('d','c',[(40,705),(20,705),(20,440),(500,440),(500,470)],'反馈更新规格',65,425),edge('e','c',[(1360,705),(1380,705),(1380,440),(900,440),(900,470)],'反馈更新规格',1080,425),edge('f','g',[(700,760),(700,850)],'就绪',710,805),edge('g','h',[(700,960),(700,1030)]),edge('h','i',[(700,1140),(700,1210)],'复审通过且已获准',710,1180),edge('i','j',[(700,1320),(700,1390)]),edge('j','k',[(700,1500),(700,1570)]),edge('k','l',[(700,1680),(700,1750)],'满足当前交付门槛',710,1720)]
N['diag']=(40,1210,290,120,['ff-diagnose · 故障支线','先复现、证据与定位','修复回 Implement'],'choice')
N['tdd']=(1070,1210,290,120,['ff-tdd · 实施内部','一次一个业务行为','red → green；重构先审'],'choice')
N['handoff']=(40,1930,550,110,['ff-handoff · 任意阶段暂停/换会话','出站：规格版本、变更状态、证据、下一步','不代表本轮已经最终交付'],'choice')
N['receiver']=(810,1930,550,110,['接收方 ff-intake · 只读核验','核对实际版本、脏状态与旧操作结果','再按缺口恢复相应责任'],'plain')
Eds.extend([edge('i','diag',[(370,1240),(330,1240)]),edge('diag','i',[(330,1300),(370,1300)]),edge('i','tdd',[(1030,1240),(1070,1240)]),edge('tdd','i',[(1070,1300),(1030,1300)]),edge('i','handoff',[(370,1265),(350,1265),(350,1885),(315,1885),(315,1930)],'暂停时（非必经）',50,1898),edge('handoff','receiver',[(590,1985),(810,1985)],'接手前核验',620,1970)])
build('new-project-workflow','新项目 从目标到规格 票据 实施与交付','九项主流程职责 + 三个可选方法；不是十二个必经阶段，也不承诺宿主自动调度。',N,Eds,['Diagnose 定位 → Implement 修复 → Review；TDD 逐条 red → green；大重构回 Plan/Review。','轻量小修可内联规格与票据；不取消验收、授权、验证和与风险相称的独立审核。','Handoff 可在任何阶段发生；Deliver 是成果交付，不自动合并、部署或发布。'],2240)

N={
'a':(370,140,660,110,['ff-intake 只读接手或恢复','openspec/specs / changes / Git 历史','核对代码、任务、证据、脏状态与旧操作'],'main'),
'b':(370,330,660,110,['判断材料有效性与下一责任','valid / stale / missing / unknown','保护现有修改；不在 Intake 中写文件'],'plain'),
'c':(45,550,300,130,['目标缺失或不清楚','ff-grill','只补关键目标与取舍','然后核对规格'],'choice'),
'd':(380,550,300,130,['目标清楚，规格缺失/过期','ff-spec','补主流程、边界、验收','需要时 Design / Prove'],'choice'),
'e':(715,550,300,130,['规格有效，票据缺失/过期','ff-plan','重排受影响切片与验证','再做独立计划审核'],'choice'),
'f':(1050,550,300,130,['规格和票据均有效','复用现有产物','核对审核与证据有效性','不必全流程重跑'],'choice'),
'g':(370,830,660,110,['汇合前补齐依赖的缺口','Grill → Spec → Plan，仅运行所需部分','Design / Prove 的结论反馈到规格与计划'],'plain'),
'h':(370,1020,660,120,['实施就绪与授权核对','独立 plan 审核有效？目标/票据/测试明确？','环境可用？风险与权限明确？','未就绪回到对应责任；未知不冒充通过'],'choice'),
'i':(370,1220,660,110,['ff-implement 继续最小获准切片','保留他人修改，核对旧操作后再续跑','实现/测试与证据绑定当前版本'],'main'),
'j':(370,1400,660,110,['ff-review · goal-mainflow + code','独立验证真实主流程与代码风险','失败修复复验；需求变化回到 Spec/Plan'],'plain'),
'k':(370,1580,660,110,['ff-deliver 当前版本交接（PR 可选）','验证 / 接受 / 规格合入 / 归档分别记录','正常归档须有效；显式取消不合入规格'],'end')}
Eds=[edge('a','b',[(700,250),(700,330)])]
for id,x in [('c',195),('d',530),('e',865),('f',1200)]:Eds.append(edge('b',id,[(700,440),(700,490),(x,490),(x,550)]));Eds.append(edge(id,'g',[(x,680),(x,760),(700,760),(700,830)]))
Eds.extend([edge('h','j',[(370,1080),(210,1080),(210,1455),(370,1455)],'实现有效：补审核',45,1190),edge('h','k',[(1030,1080),(1190,1080),(1190,1635),(1030,1635)],'证据及审核有效：直接交接',1045,1000),edge('g','h',[(700,940),(700,1020)]),edge('h','i',[(700,1140),(700,1220)],'已就绪且获准',710,1180),edge('i','j',[(700,1330),(700,1400)]),edge('j','k',[(700,1510),(700,1580)],'证据与交付门槛满足',710,1555)])
# Compact optional methods around the implementation step.
N['diag']=(40,1230,290,110,['ff-diagnose · 原因不明','复现与证据 → 根因','修复交回 Implement'],'choice')
N['tdd']=(1070,1230,290,110,['ff-tdd · Implement 内','一个行为 red → green','重构先审，获准再做'],'choice')
N['handoff']=(40,1780,550,110,['ff-handoff · 暂停/换模型/会话','出站：规格版本、变更状态、证据、下一步','与成果 Deliver 分开'],'choice')
N['receiver']=(810,1780,550,110,['接收方 ff-intake','先只读核验实际状态与旧操作结果','然后重新选择最短有效路径'],'plain')
# Route old shortcuts away from method boxes.
Eds=[e for e in Eds if not (e[0]=='h' and e[1] in ['j','k'])]
Eds.extend([edge('h','j',[(370,1080),(350,1080),(350,1455),(370,1455)],'实现有效：补审核',45,1130),edge('h','k',[(1030,1080),(1380,1080),(1380,1635),(1030,1635)],'证据及审核有效：交付',1040,1050),edge('i','diag',[(370,1250),(330,1250)]),edge('diag','i',[(330,1310),(370,1310)]),edge('i','tdd',[(1030,1250),(1070,1250)]),edge('tdd','i',[(1070,1310),(1030,1310)]),edge('i','handoff',[(370,1280),(340,1280),(340,1730),(315,1730),(315,1780)],'暂停时（非必经）',45,1740),edge('handoff','receiver',[(590,1835),(810,1835)],'接手前核验',620,1820)])
build('existing-project-workflow','已有项目 只读盘点后选择最短有效路径','九项主流程职责按需复用；Diagnose / TDD / Handoff 是支线或方法，不绕过就绪与授权。',N,Eds,['原因不明的故障可用 Diagnose；已知低风险小修可内联，不强造固定数量的假设。','有效规格、票据、独立审核及授权仍需核对；TDD 不替代真实主流程与独立审核。','Handoff 出站 → Intake 入站核验；交付不等于自动合并、部署或发布。'],2090)

N={
'a':(370,140,660,110,['当前有效规格 · 唯一现行承诺','openspec/specs + 稳定需求 ID + 验收标准'],'main'),
'b':(370,330,660,110,['活跃变更 · 尚未生效的差异','changes + delta + artifact ID / 依赖指纹'],'main'),
'c':(370,520,660,110,['instructions apply → 实施与验证','任务与证据绑定路径哈希与依赖指纹','验证通过不自动等于人工接受'],'plain'),
'd':(370,710,660,110,['独立 review + 当前版本真实接受','review 绑定目标版本 / 内容 / 依赖','缺失或过期：不允许正常 archive'],'choice'),
'e':(370,900,660,110,['validate / 正常 archive 共用 FF gate','策略、文件、依赖和 review 仍有效？','过期或冲突：阻塞并返回 Spec'],'choice'),
'f':(370,1090,660,110,['archive 正常路径：同步 specs + 移入历史','apply 仅实施指导；通过不等于用户接受','此合入不等于 Git 主分支合并或发布'],'end'),
'x':(45,710,280,110,['明确取消或拒绝','真实决议引用 + 原因','不合入当前有效规格'],'choice'),
'y':(45,1090,280,110,['原生 disposition 关闭','保留失败 / 未完成记录','不改规格，不补造 pass'],'end')}
Eds=[edge('a','b',[(700,250),(700,330)],'新变更引用基线',710,295),edge('b','c',[(700,440),(700,520)],'确认范围并完成计划审核',710,480),edge('c','d',[(700,630),(700,710)],'验证后仍须取得接受依据',710,675),edge('d','e',[(700,820),(700,900)]),edge('e','f',[(700,1010),(700,1090)],'检查通过且在授权内',710,1050),edge('b','x',[(370,385),(185,385),(185,710)],'取消路径',70,490),edge('x','y',[(185,820),(185,1090)]),edge('e','b',[(1030,955),(1330,955),(1330,385),(1030,385)],'过期 / 冲突：回到 Spec',1050,880)]
build('spec-lifecycle','规格生命周期 从当前承诺到变更闭环','0.5.0-rc2 · OpenSpec 原生 FF gate；内容绑定不等于真实性或授权。',N,Eds,['当前规格看现在；活跃变更看本轮；归档历史只在追溯时按需读取。','Handoff 记录真实版本与状态；Intake 只读核对实际结果，再选择下一责任。','显式 canceled/rejected 关闭保留原产物；不能用取消归档回滚已生效规格。'],1400)
