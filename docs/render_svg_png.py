from pathlib import Path
import xml.etree.ElementTree as E
from PIL import Image,ImageDraw,ImageFont
from math import atan2,cos,sin
p=Path(__file__).parent/'diagrams';font='/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc';bold='/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc'
for f in p.glob('*.svg'):
 root=E.parse(f).getroot();im=Image.new('RGB',(int(root.get('width')),int(root.get('height'))),'white');d=ImageDraw.Draw(im)
 for e in root:
  tag=e.tag.split('}')[-1]
  if tag=='rect':
   x,y,w,h=[float(e.get(k,'0')) for k in ['x','y','width','height']];d.rounded_rectangle((x,y,x+w,y+h),radius=float(e.get('rx','0')),fill=e.get('fill'),outline=e.get('stroke'),width=2)
  elif tag=='polyline':
   points=[tuple(map(float,a.split(','))) for a in e.get('points').split()];d.line(points,fill='#587386',width=2);a,b=points[-2:];ang=atan2(b[1]-a[1],b[0]-a[0]);d.polygon([b,(b[0]-13*cos(ang-.45),b[1]-13*sin(ang-.45)),(b[0]-13*cos(ang+.45),b[1]-13*sin(ang+.45))],fill='#587386')
  elif tag=='text':
   cls=e.get('class');size={'t':30,'s':19,'n':20,'e':17}[cls];ft=ImageFont.truetype(bold if cls=='t' else font,size);x,y=float(e.get('x')),float(e.get('y'));d.text((x,y),e.text or '',font=ft,fill='#172d40' if cls in ['t','n'] else '#52687b',anchor='ms' if e.get('text-anchor')=='middle' else 'ls')
 im.save(f.with_suffix('.png'))
 print(f.name,im.size)
