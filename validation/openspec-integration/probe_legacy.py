#!/usr/bin/env python3
import argparse, importlib.util, json, sys
from pathlib import Path
from harness import Harness, tree, write_json
p=argparse.ArgumentParser();p.add_argument('--tool',required=True);p.add_argument('--out',required=True);a=p.parse_args()
out=Path(a.out).resolve()
if out.exists(): raise SystemExit('Output must not exist.')
h=Harness(out,[]);project=out/'project';project.mkdir()
state=json.loads((Path(__file__).parent/'legacy-input.json').read_text())
write_json(project,'.forgeflow/spec-state.json',state)
for action,extra in [('validate',[]),('apply',['CHG-SEARCH','--acceptance-ref','synthetic-fixture-only']),('archive',['CHG-SEARCH','--reason','synthetic-fixture-only'])]:
    before=tree(project);r=h.run('legacy-'+action,project,[sys.executable,str(Path(a.tool).resolve()),action,str(project)]+extra,cli=False)
    h.check('legacy '+action+' read-only',tree(project)==before,r)
    if action!='validate': h.check('legacy '+action+' refuses with retirement reason',r['exit']!=0 and 'retired' in r['stdout'],r)
spec=importlib.util.spec_from_file_location('legacy_under_test',a.tool);module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
for name,args in [('transition',(state,'apply','CHG-SEARCH','synthetic-fixture-only')),('atomic_write',(project/'.forgeflow/spec-state.json',{})),('mutate',(project,'apply','CHG-SEARCH','synthetic-fixture-only'))]:
    before=tree(project);failed=False
    try: getattr(module,name)(*args)
    except module.Invalid as error: failed='retired' in str(error)
    h.check(name+' module entry refuses',failed)
    h.check(name+' module entry read-only',before==tree(project))
print(json.dumps({'checks':len(h.checks),'failed':[x['name'] for x in h.checks if not x['passed']]}))
