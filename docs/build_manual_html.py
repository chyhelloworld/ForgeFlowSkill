from pathlib import Path
import re,html,json
b=Path(__file__).parent
text=(b/'FF-中文使用手册.md').read_text()
def inline(t):
 t=html.escape(t)
 t=re.sub(r'\[([^\]]+)\]\((https?://[^\s)]+)\)',r'<a href="\2" target="_blank" rel="noreferrer">\1</a>',t)
 t=re.sub(r'`([^`]+)`',r'<code>\1</code>',t)
 t=re.sub(r'\*\*([^*]+)\*\*',r'<strong>\1</strong>',t)
 return t
out=[];toc=[];buf=[];lis=None;table=[];idx=0

def flush():
 global buf,lis,table
 if buf:out.append('<p>'+inline(' '.join(buf))+'</p>');buf=[]
 if lis:out.append('</'+lis+'>');lis=None
 if table:
  rows=[r for r in table if not re.match(r'^\|\s*:?-+',r)]
  out.append('<div class="table-wrap"><table>')
  for i,r in enumerate(rows):
   tag='th' if i==0 else 'td';out.append('<tr>'+''.join('<'+tag+'>'+inline(c.strip())+'</'+tag+'>' for c in r.strip('|').split('|'))+'</tr>')
  out.append('</table></div>');table=[]
for line in text.splitlines():
 m=re.match(r'^(#{1,3}) (.*)',line)
 if m:
  flush();lev=len(m[1]);idx+=1;id=f's{idx}';title=m[2]
  if lev==2 and title=='新项目如何从想法走到交付':
   pass
  out.append(f'<h{lev} id="{id}">{inline(title)}</h{lev}>')
  if lev>1:toc.append(f'<a class="l{lev}" href="#{id}">{html.escape(title)}</a>')
  if lev==2 and title in ['新项目如何从想法走到交付','旧项目或半成品项目怎么接手','先看当前承诺 再看本轮变更','跨会话决策索引（实验2可选）']:
   fn='decision-index.svg' if title.startswith('跨会话') else 'spec-lifecycle.svg' if title.startswith('先看') else ('new-project-workflow.svg' if title.startswith('新') else 'existing-project-workflow.svg')
   p=b/'diagrams'/fn
   if p.exists():out.append('<figure>'+p.read_text().replace('<?xml version="1.0" encoding="UTF-8"?>','')+'<figcaption>按需选择的交接路线；不表示宿主自动调度或必须全流程运行。</figcaption></figure>')
 elif line.startswith('!['):continue
 elif line.startswith('|'):flush() if buf or lis else None;table.append(line)
 elif re.match(r'^[-*] ',line) or re.match(r'^\d+\. ',line):
  if buf or table:flush()
  tag='ul' if line[0] in '-*' else 'ol'
  if lis!=tag:
   if lis:out.append('</'+lis+'>')
   out.append('<'+tag+'>');lis=tag
  out.append('<li>'+inline(re.sub(r'^(?:[-*]|\d+\.) ','',line))+'</li>')
 elif line.startswith('> '):flush();out.append('<blockquote>'+inline(line[2:])+'</blockquote>')
 elif not line.strip():flush()
 else:buf.append(line)
flush()
css='''*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;color:#1c2731;background:#f5f7fa;font:16px/1.85 system-ui,-apple-system,"Segoe UI","Noto Sans CJK SC","Microsoft YaHei",sans-serif}nav{position:fixed;inset:0 auto 0 0;width:290px;overflow:auto;background:#fff;border-right:1px solid #dde3ea;padding:24px 18px}nav strong{font-size:19px}input{width:100%;padding:11px;border:1px solid #bbc9d5;border-radius:7px;margin:15px 0}nav a{display:block;color:#34516a;text-decoration:none;padding:5px 0;font-size:14px;line-height:1.45}.l3{padding-left:14px!important}main{max-width:1120px;margin-left:290px;padding:42px 54px 100px}h1{font-size:36px;line-height:1.35;margin:0 0 22px}h2{font-size:26px;margin:55px 0 20px;border-bottom:1px solid #dce3e9;padding-bottom:10px;scroll-margin-top:20px}h3{font-size:21px;margin-top:38px;scroll-margin-top:20px;color:#174969}p,li{overflow-wrap:anywhere}li{margin:8px 0}a{color:#09669a}code{background:#e9eef4;padding:1px 4px;border-radius:3px;font-size:.92em}.table-wrap{overflow:auto}table{border-collapse:collapse;width:100%;background:#fff;font-size:14px}th,td{border:1px solid #d5dfe7;text-align:left;padding:10px 12px;vertical-align:top}th{background:#e8eff6}blockquote{background:#fff;margin:20px 0;padding:18px 22px;border-left:3px solid #527c99}figure{margin:22px 0;background:white;padding:12px;border:1px solid #dce3e9;border-radius:8px}figure svg{display:block;width:100%;height:auto}figcaption{font-size:13px;color:#657481;margin-top:10px}.hint{font-size:12px;color:#647482}.hide{display:none} @media(max-width:850px){nav{position:relative;width:100%;max-height:330px;border-bottom:1px solid #ddd}main{margin:0;padding:26px 20px}h1{font-size:29px}}@media print{nav{display:none}main{margin:0;padding:0;max-width:none}body{background:#fff;font-size:11pt}h2,h3{break-after:avoid}figure,table{break-inside:avoid}a{color:inherit}}'''
js='''document.querySelector('#search').addEventListener('input',e=>{let q=e.target.value.toLowerCase().trim();document.querySelectorAll('nav a').forEach(a=>a.classList.toggle('hide',!!q&&!a.textContent.toLowerCase().includes(q)))});'''
version=json.loads((b.parent/'package.json').read_text(encoding='utf-8'))['version']
page='<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>ForgeFlow 十二技能中文使用手册</title><style>'+css+'</style></head><body><nav><strong>ForgeFlow 使用手册</strong><div class="hint">9 主流程职责 + 3 方法 · '+html.escape(version)+' 候选 · 两条项目路线 + 规格生命周期</div><input id="search" type="search" placeholder="筛选目录，例如 验收 / 接手" aria-label="筛选目录"><div class="hint">正文查找可用浏览器 Ctrl/Cmd+F</div>'+''.join(toc)+'</nav><main>'+''.join(out)+'</main><script>'+js+'</script></body></html>'
(b/'FF-离线图文手册.html').write_bytes(page.encode('utf-8'))
print('HTML bytes',len(page.encode()),'headings',idx,'external scripts',len(re.findall(r'<script[^>]+src=',page)))
