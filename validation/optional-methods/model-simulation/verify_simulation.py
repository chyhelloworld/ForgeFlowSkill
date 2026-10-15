"""Mechanical trace checks only; not a semantic judge or approval verifier."""
import json,hashlib,pathlib
R=pathlib.Path(__file__).resolve().parent
es=[json.loads(x) for x in (R/'transcript.jsonl').read_text().splitlines()]
checks=[]
def ck(name,v):checks.append({'name':name,'passed':bool(v)})
def file(p):return (R/p).read_text()
def fid(x):return next(e['id'] for e in es if e.get('fixture_id')==x)
def writes(p,actor=None):return [e for e in es if e['kind']=='file_write' and e.get('path')==p and (actor is None or e['actor']==actor)]
fixtures=[e for e in es if e['actor']=='SYNTHETIC AUTHOR FIXTURE' and e['kind']=='input']
ck('Every author input explicitly synthetic, no real approval',all(e.get('synthetic') and e.get('real_user_approval') is False for e in fixtures))
manifest=json.loads(file('input-manifest.json'))
ck('Frozen source snapshots retain original hashes',all(hashlib.sha256((R/i['snapshot']).read_bytes()).hexdigest()==i['sha256'] for i in manifest))
fw=writes('fragments.md','MODEL')
ck('Fragments model creates once, then appends only',fw[0]['mode']=='create' and all(e['mode']=='append' for e in fw[1:]))
ck('Fragment author edit preserved and number absent','70%' not in file('fragments.md') and '第一次维护项目的人' in file('fragments.md') and 'instructions 给了指令和模板，下一步到底由谁写文件？' in file('fragments.md'))
ck('Fragment stop prevents all subsequent fragment writes',not any(e['id']>fid('F5') for e in writes('fragments.md')))
ck('Both branches read the same frozen fragments',len({e['sha256'] for e in es if e['kind']=='full_read' and e.get('path')=='fragments.md' and e['id']>fid('B0')})==1)
ck('Beats never reads shape output',not any(e.get('path')=='shape-draft.md' for e in es if fid('B0')<e['id']<fid('S0')))
bw=writes('beats-draft.md','MODEL')
ck('One chosen beat, no next beat written',len(bw)==1 and fid('B1')<bw[0]['id']<fid('B2'))
ck('Beats deletion retained and concept set rebuilt','哈希' not in file('beats-draft.md') and '指纹' not in file('beats-draft.md') and any(e.get('concepts_rebuilt') and '哈希' not in e.get('concepts_current',[]) for e in es))
sw=writes('shape-draft.md','MODEL')
ck('Shape has two separately selected writes',len(sw)==2 and fid('S1')<sw[0]['id']<fid('S2')<sw[1]['id']<fid('S3'))
ck('Shape author edit preserved','第一次接手项目' in file('shape-draft.md') and '第一次维护项目' not in file('shape-draft.md'))
consistent=True
for i,e in enumerate(es):
 if e['kind']!='file_write':continue
 p=es[i-1]
 consistent &= p['kind']=='full_read' and p.get('path')==e['path'] and p.get('sha256')==e['before_sha256']
 consistent &= hashlib.sha256(e['text'].encode()).hexdigest()==e['after_sha256']
 if e['mode']=='append':consistent &= e['text'].startswith(p['text'])
ck('Every document write immediately follows full current read; hashes/append prefixes match',consistent)
ck('Drafts labeled synthetic and contain no injected false claims',all('SYNTHETIC' in file(p) and '70%' not in file(p) and 'instructions 会自动写出一篇完成稿' not in file(p) for p in ['shape-draft.md','beats-draft.md']))
ck('Retro candidate precedes falsification and zero rules/patches',any(e.get('candidate')=='C1' and e.get('patch_applied') is False for e in es) and any(e.get('falsified') and e.get('new_rules')==0 and e.get('patches')==0 for e in es))
result={'scope':'Mechanical trace checks for one instructed simulation, NOT behavioral benchmark or independent review','checks':checks,'passed':sum(c['passed'] for c in checks),'total':len(checks),'semantic_caveat':'Shape includes ffValidity/done field names without fully defining them for first-time maintainers.'}
(R/'verification.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(result,ensure_ascii=False,indent=2))
assert all(c['passed'] for c in checks)
