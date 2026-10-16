#!/usr/bin/env python3
"""Read-only package checks. Requires PyYAML; no behavior or quality verdict."""
import hashlib
import json
from pathlib import Path
import re
import sys
import yaml

def is_deliverable(path, root):
    parts = path.relative_to(root).parts
    if any(part in {".git", "__pycache__", ".pnpm-data", ".pnpm-cache", ".pnpm-store"} for part in parts):
        return False
    return parts[:3] not in {("tools", "openspec", ".build"), ("tools", "openspec", ".bootstrap")}

def validate(root):
    errors=[]; checked={'skills':0,'local_links':0,'source_hashes':0,'manifest_files':0}
    def need(ok,msg):
        if not ok: errors.append(msg)
    skills=root/'skills'
    for folder in sorted(skills.iterdir()):
        if not folder.is_dir(): continue
        checked['skills']+=1
        source=(folder/'SKILL.md').read_text()
        match=re.match(r'^---\n(.*?)\n---\n',source,re.S)
        need(bool(match),f'{folder.name}: frontmatter absent')
        if not match: continue
        data=yaml.safe_load(match.group(1))
        need(data.get('name')==folder.name,f'{folder.name}: name mismatch')
        need(bool(data.get('description')),f'{folder.name}: empty description')
        need(data.get('metadata',{}).get('version')=='0.6.0-experimental.7',f'{folder.name}: expected version 0.6.0-experimental.7')
        need((folder/'NOTICE.md').is_file(),f'{folder.name}: missing NOTICE')
        need((folder/('LICENSE-IMPECCABLE' if folder.name=='ff-design' else 'LICENSE-MATT')).is_file(),f'{folder.name}: missing license')
        ui=yaml.safe_load((folder/'agents/openai.yaml').read_text())['interface']
        need(25<=len(ui['short_description'])<=64,f'{folder.name}: UI description length')
        need('$'+folder.name in ui['default_prompt'],f'{folder.name}: UI prompt invocation')
        for file in folder.rglob('*.md'):
            for link in re.findall(r'\[[^\]]+\]\(([^)]+)\)',file.read_text()):
                if '://' in link or link.startswith('#'): continue
                checked['local_links']+=1
                target=(file.parent/link.split('#')[0]).resolve()
                need(target.is_relative_to(folder.resolve()),f'{file}: external local dependency {link}')
                need(target.is_file(),f'{file}: broken link {link}')
    need({p.name for p in skills.iterdir() if p.is_dir()}=={'ff-intake','ff-grill','ff-spec','ff-design','ff-prove','ff-plan','ff-implement','ff-review','ff-deliver','ff-diagnose','ff-tdd','ff-handoff','ff-research','ff-retro','ff-writing-fragments','ff-writing-shape','ff-writing-beats'},'expected twelve baseline plus five optional skills')
    cases=json.loads((root/'evaluations/scenarios.json').read_text())['cases']
    ids=[c['id'] for c in cases]
    need(len(ids)==len(set(ids)), 'duplicate evaluation case IDs')
    need(set(['E07','E08','E09','E10','E11','E12','E13','E14','E15','E16','E17','E18','E21','E22','E23','E24','E25']).issubset(ids), 'missing required workflow or method scenarios')
    installed={p.name for p in skills.iterdir() if p.is_dir()}
    for case in cases:
        need(bool(case.get('prompt')) and len(case.get('criteria', []))==3 and bool(case.get('critical_failures')), f"invalid scenario: {case.get('id')}")
        need(set(case.get('skills', [])).issubset(installed), f"unknown scenario skill: {case.get('id')}")
    checked['scenarios']=len(cases)
    sources=json.loads((root/'provenance/sources.json').read_text())
    for entry in sources['sources']+[sources['ff_baseline']]:
        p=root/entry['path'];checked['source_hashes']+=1
        need(p.is_file() and hashlib.sha256(p.read_bytes()).hexdigest()==entry['sha256'],f'source changed: {p}')
    manifest=root/'MANIFEST.json'
    if manifest.exists():
        manifest_data=json.loads(manifest.read_text())
        need(manifest_data.get('version')=='0.6.0-experimental.7','manifest version mismatch')
        listed=manifest_data['files']
        actual={p.relative_to(root).as_posix() for p in root.rglob('*') if p.is_file() and p!=manifest and p.name not in {'forgeflow-payload.tgz','forgeflow-payload.sha256'} and is_deliverable(p, root)}
        need(actual==set(listed),'manifest file set mismatch')
        for rel, expected in listed.items():
            p=root/rel;checked['manifest_files']+=1
            need(p.is_file() and hashlib.sha256(p.read_bytes()).hexdigest()==expected,f'manifest mismatch: {rel}')
    else: errors.append('MANIFEST.json missing')
    return {'kind':'static-package-validation','checks':checked,'errors':errors,'passed':not errors,'limits':'Not a behavioral test, installer, license clearance or T3 integration test.'}

if __name__=='__main__':
    try: result=validate(Path(sys.argv[1]).resolve())
    except Exception as exc: result={'kind':'static-package-validation','passed':False,'errors':[str(exc)]}
    print(json.dumps(result,ensure_ascii=False,indent=2))
    sys.exit(0 if result['passed'] else 1)
