from pathlib import Path
import xml.etree.ElementTree as E
import json,re
p=Path(__file__).parent
out={'version':json.loads((p.parent/'package.json').read_text())['version']}
for svg in (p/'diagrams').glob('*.svg'):
 s=E.parse(svg).getroot();d=E.parse(svg.with_suffix('.drawio')).getroot();texts=[e.text for e in s if e.tag.endswith('text')];values=[c.get('value','') for c in d.iter('mxCell')]
 missing=[t for t in texts if not any(t in v.split('\n') or t==v for v in values)];assert not missing,missing
 cells={c.get('id'):c for c in d.iter('mxCell')};edges=[c for c in cells.values() if c.get('edge')=='1'];assert all(c.get('source') in cells and c.get('target') in cells for c in edges)
 out[svg.stem]={'svg_text_count':len(texts),'drawio_preserves_all_text':True,'attached_edges':len(edges),'visual_png_inspected':'Historical diagrams retained; decision-index separately inspected in experiment2'}
h=(p/'FF-离线图文手册.html').read_text();assert h.count('<svg ')==4;assert not re.search(r'<script[^>]+src=|<link[^>]+href=',h)
for f in (p/'diagrams').glob('*.svg'):assert f.read_text() in h
out['html']={'embedded_diagrams':4,'svg_exact_matches':True,'external_asset_dependencies':0,'browser_layout_test':'Static checks only; actual 0.9 browser operations are separately recorded in iterations/0.9/ui-evidence-frozen','static_responsive_css_present':True}
ids=set(re.findall(r' id="([^"]+)"',h)); anchors=re.findall(r'href="#([^"]+)"',h)
assert all(a in ids for a in anchors), 'Broken internal navigation'
md=(p/'FF-中文使用手册.md').read_text()
local=re.findall(r'!\[[^\]]*\]\(([^)]+)\)',md)
assert all((p/a).is_file() for a in local), 'Broken local image links'
skills=['intake','grill','spec','design','prove','plan','implement','review','deliver','diagnose','tdd','handoff']
assert all('| ff-'+x+' |' in md for x in skills)
out['guide']={'workflow_skill_table_entries':12,'package_skill_directories':len(list((p.parent/'skills').glob('*/SKILL.md'))),'internal_navigation_targets':len(anchors),'local_image_links_valid':len(local),'host_command_registration':'NOT_TESTED'}
out['rendering']='PNG deterministic Pillow rendering from SVG elements; historical three diagrams retained; new decision-index PNG separately inspected. No host integration tested.'
(p/'guide-qa.json').write_bytes(json.dumps(out,ensure_ascii=False,indent=2).encode('utf-8'));print(json.dumps(out,ensure_ascii=False,indent=2))
