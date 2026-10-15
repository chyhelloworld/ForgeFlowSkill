"""Actual CPython trace coverage for the three newly retired write entrypoints."""
import ast, dis, hashlib, json, pathlib, sys, trace, unittest
ROOT=pathlib.Path(__file__).resolve().parents[2]
TOOLS=ROOT/'tools';sys.path.insert(0,str(TOOLS))
import spec_lifecycle as m
import test_spec_lifecycle as tests
tracer=trace.Trace(count=True,trace=False)
result=tracer.runfunc(unittest.TextTestRunner().run,unittest.defaultTestLoader.loadTestsFromModule(tests))
counts=tracer.results().counts
source=pathlib.Path(m.__file__).read_bytes(); tree=ast.parse(source)
rows=[]
for name in ['transition','atomic_write','mutate']:
 obj=getattr(m,name);node=next(n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name==name)
 # These exact functions have only a raise; verify this rather than infer a metric.
 assert len(node.body)==1 and isinstance(node.body[0],ast.Raise)
 lines={ln for _,ln in dis.findlinestarts(obj.__code__)}-{obj.__code__.co_firstlineno}
 hit={ln for ln in lines if counts.get((m.__file__,ln),0)>0}; cov=len(hit)/len(lines)
 rows.append(dict(function=name,cc=1,executable_lines=sorted(lines),hit_lines=sorted(hit),coverage=cov,crap=(1-cov)**3+1))
report=dict(source=str(pathlib.Path(m.__file__).resolve()),sha256=hashlib.sha256(source).hexdigest(),python=sys.version,scope='Only three changed legacy write guards; prior read-only validator functions excluded.',method='AST verifies each exact measured function is one raise statement, cyclomatic complexity 1. CPython trace observed executed lines divided by dis.findlinestarts executable lines excluding definition. CRAP=CC^2*(1-coverage)^3+CC.',tests_passed=result.wasSuccessful(),functions=rows)
(ROOT/'validation/openspec-integration/reviewer-legacy-crap.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(rows))

raise SystemExit(0 if result.wasSuccessful() and all(row['crap'] <= 50 for row in rows) else 1)
