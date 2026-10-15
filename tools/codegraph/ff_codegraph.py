#!/usr/bin/env python3
"""Optional local CodeGraph 1.6.2 evidence capture. Not an approval/security gate."""
import argparse
import datetime
import hashlib
import json
import os
from pathlib import Path
import subprocess
import time

VERSION = '1.6.2'
GAPS = ['Static graph is incomplete: inspect DI/AOP, reflection, configuration and SQL manually.',
        'No results does not mean no impact; no tests found does not justify skipping tests.',
        'Freshness is an observation, not reviewer approval; refresh never restores prior approval.',
        'Concurrent edits can race snapshots; stop writers/watchers for a stable capture.',
        'Windows and live MCP watcher behavior were not tested.']

def digest(data):
    return hashlib.sha256(data).hexdigest()

def jsonhash(data):
    return digest(json.dumps(data, sort_keys=True, ensure_ascii=True).encode())

def command(args, root, env):
    start = time.perf_counter()
    p = subprocess.run(args, cwd=root, env=env, text=True, capture_output=True, timeout=180)
    return {'argv': args, 'exit': p.returncode, 'seconds': round(time.perf_counter()-start, 6),
            'stdout': p.stdout, 'stderr': p.stderr}

def snapshot(root):
    files = {}
    for folder, dirs, names in os.walk(root, followlinks=False):
        dirs[:] = sorted(d for d in dirs if d not in {'.git', '.codegraph'})
        for name in sorted(names + [d for d in dirs if (Path(folder)/d).is_symlink()]):
            p = Path(folder)/name
            rel = str(p.relative_to(root))
            if p.is_symlink():
                raise ValueError('Symlink input needs separate scope review: '+rel)
            files[rel] = digest(p.read_bytes())
    head = subprocess.check_output(['git','rev-parse','HEAD'], cwd=root, text=True).strip()
    branch = subprocess.check_output(['git','rev-parse','--abbrev-ref','HEAD'], cwd=root, text=True).strip()
    status = subprocess.check_output(['git','status','--porcelain=v1','--untracked-files=all'], cwd=root, text=True)
    # Index files are generated evidence, not user source dirtiness.
    status = '\n'.join(s for s in status.splitlines() if not s[3:].startswith('.codegraph/'))
    return {'commit':head, 'branch':branch, 'dirty_status':status, 'files_sha256':files,
            'tree_sha256':jsonhash(files)}

def validate_index_path(root):
    index = root/'.codegraph'
    if index.is_symlink(): raise ValueError('Index directory must not be a symlink')
    for folder, dirs, files in os.walk(index, followlinks=False):
        for name in dirs + files:
            if (Path(folder)/name).is_symlink():
                raise ValueError('Index member must not be a symlink')

def index_state(root):
    validate_index_path(root)
    return {str(p.relative_to(root)):digest(p.read_bytes()) for p in sorted((root/'.codegraph').rglob('*')) if p.is_file()}

def main(argv=None):
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--enabled', action='store_true')
    p.add_argument('--repo', required=True)
    p.add_argument('--cli', required=True, help='Explicit locally installed CLI path')
    p.add_argument('--out', required=True, help='New evidence directory outside repository')
    p.add_argument('--query', default='')
    p.add_argument('--kind', choices=['explore','impact','query'], default='explore')
    a=p.parse_args(argv)
    if not a.enabled:
        print('Adapter disabled; use normal source reading and FF workflow.'); return 0
    root=Path(a.repo).resolve(); out=Path(a.out).resolve(); cli=Path(a.cli).resolve()
    if out.is_relative_to(root) or out.exists():
        raise ValueError('Output must be a new external directory (no overwrite).')
    if not a.query.strip() or a.query.startswith('-'): raise ValueError('A non-option query is required when enabled.')
    # Isolate all CLI user configuration. Do not run install, serve, upgrade or MCP.
    out.mkdir(parents=True); home=out/'home'; home.mkdir()
    env={k:v for k,v in os.environ.items() if not k.startswith('CODEGRAPH_') and k not in {'NODE_OPTIONS','NODE_PATH'}}
    env.update(HOME=str(home), DO_NOT_TRACK='1', CODEGRAPH_TELEMETRY='0', CODEGRAPH_NO_UPDATE_CHECK='1')
    env.pop('CODEGRAPH_DIR',None)
    evidence={'schema':1,'created_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),
              'gaps':GAPS,'approval':'not-granted','environment':{'DO_NOT_TRACK':'1','CODEGRAPH_TELEMETRY':'0','CODEGRAPH_NO_UPDATE_CHECK':'1'},
              'cli_path':str(cli)}
    try:
        validate_index_path(root)
        evidence['cli_launcher_sha256']=digest(cli.read_bytes())
        version=command([str(cli),'--version'],root,env); evidence['version']=version
        if version['exit'] or version['stdout'].strip()!=VERSION: raise ValueError('Expected CodeGraph '+VERSION)
        before=snapshot(root); evidence['repository_before']=before
        action='index' if (root/'.codegraph/codegraph.db').exists() else 'init'
        args=[str(cli),action,str(root)]+(['--yes'] if action=='init' else ['--quiet'])
        indexed=command(args,root,env); evidence['index_command']=indexed
        if indexed['exit']: raise ValueError('Index command failed')
        after=snapshot(root); evidence['repository_indexed']=after
        if before!=after: raise ValueError('Repository changed during indexing; evidence invalid')
        evidence['index_before_query']=index_state(root)
        args=[str(cli),a.kind,a.query,'--path',str(root)]+(['--json'] if a.kind!='explore' else [])
        evidence['query']=command(args,root,env)
        evidence['repository_after']=snapshot(root); evidence['index_after_query']=index_state(root)
        if evidence['query']['exit']: raise ValueError('Query failed')
        if after!=evidence['repository_after']: raise ValueError('Repository changed during query; evidence invalid')
        if evidence['index_before_query']!=evidence['index_after_query']: raise ValueError('Index changed during query; evidence invalid')
        evidence['capture_status']='stable-observation-not-approved'
    except Exception as ex:
        evidence['capture_status']='invalid'; evidence['error']=str(ex)
    (out/'evidence.json').write_text(json.dumps(evidence,ensure_ascii=False,indent=2)+'\n')
    print(str(out/'evidence.json'))
    return 0 if evidence['capture_status']=='stable-observation-not-approved' else 2

if __name__=='__main__':
    raise SystemExit(main())
