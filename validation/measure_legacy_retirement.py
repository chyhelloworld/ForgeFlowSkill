"""Measure modified retirement entrypoints with actual regression execution; not radon."""
import ast
import dis
import hashlib
import importlib.util
import json
from pathlib import Path
import sys
import trace
import types
import unittest
sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'tools'))
import spec_lifecycle as subject
import test_spec_lifecycle as tests
SOURCE = ROOT / 'tools/spec_lifecycle.py'
tracer = trace.Trace(count=True, trace=False)
result = tracer.runfunc(unittest.TextTestRunner(verbosity=2).run,
                       unittest.defaultTestLoader.loadTestsFromModule(tests))
counts = tracer.results().counts
class Complexity(ast.NodeVisitor):
    def __init__(self): self.n = 1
    def generic_visit(self, node):
        if isinstance(node, (ast.If, ast.For, ast.AsyncFor, ast.While, ast.IfExp, ast.ExceptHandler, ast.Assert)): self.n += 1
        if isinstance(node, ast.BoolOp): self.n += len(node.values) - 1
        if isinstance(node, ast.comprehension): self.n += 1 + len(node.ifs)
        if isinstance(node, ast.Try) and node.orelse: self.n += 1
        super().generic_visit(node)
def executable(code):
    lines = {line for _, line in dis.findlinestarts(code)} - {code.co_firstlineno}
    for child in code.co_consts:
        if isinstance(child, types.CodeType): lines |= {line for _, line in dis.findlinestarts(child)}
    return lines
rows = []
for node in ast.parse(SOURCE.read_bytes()).body:
    if not isinstance(node, ast.FunctionDef) or node.name not in {'transition', 'atomic_write', 'mutate', 'main'}: continue
    lines = executable(getattr(subject, node.name).__code__)
    hit = {line for line in lines if counts.get((str(SOURCE), line), 0)}
    cc = Complexity(); cc.visit(node)
    coverage = len(hit) / len(lines)
    rows.append({'function': node.name, 'cc': cc.n, 'executable_lines': sorted(lines),
                 'hit_lines': sorted(hit), 'line_coverage': coverage,
                 'crap': round(cc.n ** 2 * (1 - coverage) ** 3 + cc.n, 5)})
out = {'source': 'tools/spec_lifecycle.py', 'sha256': hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
       'python': sys.version.split()[0], 'test_source': 'tools/test_spec_lifecycle.py',
       'tests_run': result.testsRun, 'tests_passed': result.wasSuccessful(),
       'scope': 'Four modified production entrypoints for legacy write retirement. Unchanged legacy validators and historical implementation excluded, not a whole-repository claim.',
       'method': 'Actual stdlib trace line events / CPython dis.findlinestarts executable lines excluding top function definition. AST CC = 1 + if/for/while/conditional expression/except/assert + extra boolean operands + comprehension generators/filters + try else. CRAP=CC^2*(1-coverage)^3+CC. Not radon, branch or basis-path coverage; no historical measurements reused.',
       'functions': rows, 'maximum_crap': max(row['crap'] for row in rows),
       'threshold_50_passed': all(row['crap'] <= 50 for row in rows)}
(ROOT / 'validation/legacy-retirement-crap.json').write_text(json.dumps(out, indent=2) + '\n')
print(json.dumps(out, indent=2))
raise SystemExit(0 if result.wasSuccessful() and out['threshold_50_passed'] else 1)
