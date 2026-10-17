#!/usr/bin/env python3
"""Combine native coverage.py function summaries with Radon; reject incomplete mapping.
Run with coverage==7.6.1 and radon==6.0.1 installed in an isolated environment.
Inputs must be freshly captured from the same source revision. No coverage inferred.
"""
import ast
import hashlib
import json
import sys
from pathlib import Path
from radon.complexity import cc_visit

root, coverage_file, output, snapshot_file = map(Path, sys.argv[1:5])
snapshot = json.loads(snapshot_file.read_text())
data = json.loads(coverage_file.read_text())
if not data.get('files') or data.get('meta', {}).get('version') != '7.6.1' or data.get('meta', {}).get('branch_coverage') is not True:
    raise SystemExit('Missing or unsupported native coverage report')
rows = []
for name, coverage in data['files'].items():
    path = root / name
    if snapshot.get(name) != hashlib.sha256(path.read_bytes()).hexdigest():
        raise SystemExit('Missing/stale pre-run source snapshot: ' + name)
    source = path.read_text()
    nodes = [n for n in ast.walk(ast.parse(source)) if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef))]
    # These helpers deliberately use top-level functions only. Reject ambiguity,
    # nested functions and methods rather than guessing ownership/qualified names.
    if len(nodes) != len({n.name for n in nodes}) or any(n.col_offset for n in nodes):
        raise SystemExit('Unsupported nested/duplicate/method mapping: ' + name)
    cc = {b.name:b.complexity for b in cc_visit(source)}
    funcs = {k:v for k,v in coverage['functions'].items() if k}
    if not nodes:
        raise SystemExit('No functions measured: ' + name)
    if set(cc) != {n.name for n in nodes} or set(funcs) != set(cc):
        raise SystemExit('Incomplete function mapping: ' + name)
    for function, complexity in cc.items():
        summary = funcs[function]['summary']
        denominator = summary['num_statements'] + summary['num_branches']
        if denominator <= 0:
            raise SystemExit('NOT_MEASURED: empty executable denominator')
        ratio = (summary['covered_lines'] + summary['covered_branches']) / denominator
        rows.append({'file':name,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),
                     'name':function,'cc':complexity,'coverage':ratio,
                     'crap':complexity**2*(1-ratio)**3+complexity})
result = {'kind':'snapshot-bound-function-metrics','ccTool':'radon 6.0.1','coverageTool':'coverage.py 7.6.1',
          'coverageDefinition':'combined covered executable lines plus branches / executable lines plus branches; native function scope',
          'sourceSnapshot':str(snapshot_file),
          'limits':'Caller must capture snapshot immediately before the same coverage run; this script verifies present source matches that snapshot, not historical execution identity. Top-level Python functions only; no JS/UI metrics; subprocess coverage absent unless explicitly collected.',
          'functions':rows,'allWithin50':all(r['crap']<=50 for r in rows)}
output.write_text(json.dumps(result,indent=2)+'\n')
