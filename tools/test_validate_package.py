#!/usr/bin/env python3
"""Static mutation tests only, in disposable copies; never behavioral evaluation."""
import hashlib
import json
from pathlib import Path
import shutil
import tempfile
import sys
sys.dont_write_bytecode = True
from validate_package import validate, is_deliverable

def manifest(root):
    p=root/'MANIFEST.json'
    data=json.loads(p.read_text())
    data['files']={f.relative_to(root).as_posix():hashlib.sha256(f.read_bytes()).hexdigest() for f in sorted(root.rglob('*')) if f.is_file() and f!=p and f.name not in {'forgeflow-payload.tgz','forgeflow-payload.sha256'} and is_deliverable(f, root)}
    p.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')

def mutate(root,kind):
    if kind=='missing_optional': shutil.rmtree(root/'skills/ff-research')
    elif kind=='missing_optional_scenario':
        p=root/'evaluations/scenarios.json';d=json.loads(p.read_text());d['cases']=[c for c in d['cases'] if c['id']!='E25'];p.write_text(json.dumps(d))
    elif kind=='missing_method': shutil.rmtree(root/'skills/ff-handoff')
    elif kind=='wrong_version':
        p=root/'skills/ff-tdd/SKILL.md';p.write_text(p.read_text().replace(json.loads((root/'package.json').read_text())['version'],'0.4.0-rc1'))
    elif kind=='broken_reference':
        p=root/'skills/ff-diagnose/SKILL.md';p.write_text(p.read_text()+'\n[bad](references/missing.md)\n')
    elif kind=='missing_license': (root/'skills/ff-handoff/LICENSE-MATT').unlink()
    elif kind=='missing_replay':
        p=root/'evaluations/scenarios.json';d=json.loads(p.read_text());d['cases']=[c for c in d['cases'] if c['id']!='E17'];p.write_text(json.dumps(d))
    elif kind=='changed_source':
        p=root/'provenance/matt/engineering/tdd/tests.md';p.write_text(p.read_text()+'\nchanged\n')
    elif kind=='unknown_scenario_skill':
        p=root/'evaluations/scenarios.json';d=json.loads(p.read_text());d['cases'][-1]['skills'].append('ff-nonexistent');p.write_text(json.dumps(d))
    elif kind=='hash_tamper':
        p=root/'skills/ff-tdd/NOTICE.md';p.write_text(p.read_text()+'\ntampered\n');return
    manifest(root) # isolate structural assertion from ordinary manifest mismatch

if __name__=='__main__':
    root=Path(sys.argv[1]).resolve()
    baseline=validate(root)
    results=[{'case':'valid_package','passed':baseline['passed'],'errors':baseline['errors']}]
    for kind in ['missing_optional','missing_optional_scenario','missing_method','wrong_version','broken_reference','missing_license','missing_replay','changed_source','unknown_scenario_skill','hash_tamper']:
        with tempfile.TemporaryDirectory(prefix='ff-static-negative-') as d:
            clone=Path(d)/'package';shutil.copytree(root,clone,ignore=shutil.ignore_patterns(".git", ".build", ".bootstrap", "__pycache__", ".pnpm-data", ".pnpm-cache", ".pnpm-store"));mutate(clone,kind)
            outcome=validate(clone)
            results.append({'case':kind,'passed':not outcome['passed'],'detected':outcome['errors']})
    ok=all(x['passed'] for x in results)
    print(json.dumps({'kind':'static-validator-mutation-tests','passed':ok,'cases':results,'limits':'Not model behavior, native integration, product testing or user acceptance.'},ensure_ascii=False,indent=2))
    sys.exit(0 if ok else 1)
