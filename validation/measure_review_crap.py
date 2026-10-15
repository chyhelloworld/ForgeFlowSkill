"""Documented stdlib AST CC + CPython executable-line trace, not radon or basis-path coverage."""
import ast, dis, hashlib, importlib.util, json, pathlib, sys, trace, types, unittest
ROOT=pathlib.Path(__file__).resolve().parent
s=importlib.util.spec_from_file_location('review_guards', ROOT/'review_guards.py');t=importlib.util.module_from_spec(s);s.loader.exec_module(t)
source=t.P.read_bytes();tree=ast.parse(source);tracer=trace.Trace(count=True,trace=False)
result=tracer.runfunc(unittest.TextTestRunner(verbosity=1).run,unittest.defaultTestLoader.loadTestsFromModule(t))
counts=tracer.results().counts
class CC(ast.NodeVisitor):
    def __init__(self):self.n=1
    def generic_visit(self,node):
        if isinstance(node,(ast.If,ast.For,ast.AsyncFor,ast.While,ast.IfExp,ast.ExceptHandler,ast.Assert)):self.n+=1
        if isinstance(node,ast.BoolOp):self.n+=len(node.values)-1
        if isinstance(node,ast.comprehension):self.n+=1+len(node.ifs)
        if isinstance(node,ast.Try) and node.orelse:self.n+=1
        super().generic_visit(node)
def executable(code):
    lines={line for _,line in dis.findlinestarts(code)}-{code.co_firstlineno}
    for child in code.co_consts:
        if isinstance(child,types.CodeType): lines |= {line for _,line in dis.findlinestarts(child)}
    return lines
rows=[]
for node in tree.body:
    if not isinstance(node,(ast.FunctionDef,ast.AsyncFunctionDef)):continue
    obj=getattr(t.m,node.name); lines=executable(obj.__code__);hit={line for line in lines if counts.get((str(t.P),line),0)>0}
    v=CC();v.visit(node);c=len(hit)/len(lines) if lines else None
    rows.append({'function':node.name,'cc':v.n,'executable_lines':sorted(lines),'hit_lines':sorted(hit),'coverage':c,'crap':round(v.n**2*(1-c)**3+v.n,5) if c is not None else 'NOT_MEASURED'})
out={'source':str(t.P),'sha256':hashlib.sha256(source).hexdigest(),'python':sys.version,'measurement':'stdlib trace line events / CPython dis.findlinestarts executable lines, excluding top function definition; nested comprehension lines included. AST CC = 1 + if/for/while/conditional-expression/except/assert decisions + boolean operands beyond first + comprehension generators/filters + try else. Not basis-path coverage and not radon. All top-level functions measured, including unused main with observed zero coverage.','test_scope':'Independent review_guards.py assertion tests; no tests added solely to raise coverage.','tests_passed':result.wasSuccessful(),'functions':rows}
(ROOT/'review-crap.json').write_text(json.dumps(out,indent=2)+'\n');print(json.dumps([{k:r[k] for k in ['function','cc','coverage','crap']} for r in rows],indent=2))
