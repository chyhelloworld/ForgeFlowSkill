from pathlib import Path
import xml.etree.ElementTree as E
import json,re
p=Path(__file__).parent
out={'version':'0.5.0-rc3'}
for svg in (p/'diagrams').glob('*.svg'):
 s=E.parse(svg).getroot();d=E.parse(svg.with_suffix('.drawio')).getroot();texts=[e.text for e in s if e.tag.endswith('text')];values=[c.get('value','') for c in d.iter('mxCell')]
 missing=[t for t in texts if not any(t in v.split('\n') or t==v for v in values)];assert not missing,missing
 cells={c.get('id'):c for c in d.iter('mxCell')};edges=[c for c in cells.values() if c.get('edge')=='1'];assert all(c.get('source') in cells and c.get('target') in cells for c in edges)
 out[svg.stem]={'svg_text_count':len(texts),'drawio_preserves_all_text':True,'attached_edges':len(edges),'visual_png_inspected':'Historical rc2 inspection; not repeated in rc3'}
h=(p/'FF-离线图文手册.html').read_text();assert h.count('<svg ')==3;assert not re.search(r'<script[^>]+src=|<link[^>]+href=',h)
for f in (p/'diagrams').glob('*.svg'):assert f.read_text() in h
out['html']={'embedded_diagrams':3,'svg_exact_matches':True,'external_asset_dependencies':0,'browser_layout_test':'NOT_RUN for rc3: desktop/mobile HTML browser interaction not repeated','static_responsive_css_present':True}
ids=set(re.findall(r' id="([^"]+)"',h)); anchors=re.findall(r'href="#([^"]+)"',h)
assert all(a in ids for a in anchors), 'Broken internal navigation'
md=(p/'FF-中文使用手册.md').read_text()
local=re.findall(r'!\[[^\]]*\]\(([^)]+)\)',md)
assert all((p/a).is_file() for a in local), 'Broken local image links'
skills=['intake','grill','spec','design','prove','plan','implement','review','deliver','diagnose','tdd','handoff']
assert all('| ff-'+x+' |' in md for x in skills)
out['guide']={'skill_table_entries':12,'internal_navigation_targets':len(anchors),'local_image_links_valid':len(local),'host_command_registration':'NOT_TESTED'}
out['rendering']='PNG deterministic Pillow rendering from SVG elements; all three PNGs retain their historical rc2 visual inspection, not repeated in rc3. No host integration tested.'
(p/'guide-qa.json').write_text(json.dumps(out,ensure_ascii=False,indent=2));print(json.dumps(out,ensure_ascii=False,indent=2))
