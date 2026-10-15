"""Portable stdlib-only black-box evidence harness; no implementation imports."""
from pathlib import Path
import hashlib, json, os, subprocess, datetime

class Harness:
    def __init__(self, output, cli):
        self.output = Path(output).resolve()
        self.output.mkdir(parents=True, exist_ok=True)
        self.cli = [str(x) for x in cli]
        self.commands, self.checks = [], []
        self.env = dict(os.environ, OPENSPEC_TELEMETRY='0', DO_NOT_TRACK='1', XDG_CONFIG_HOME=str(self.output / 'xdg'))
    def run(self, name, cwd, args, cli=True):
        command = (self.cli if cli else []) + [str(x) for x in args]
        result = subprocess.run(command, cwd=cwd, env=self.env, capture_output=True, text=True, timeout=90)
        record = dict(name=name, command=command, cwd=str(cwd), exit=result.returncode, stdout=result.stdout, stderr=result.stderr)
        self.commands.append(record)
        self.save()
        return record
    def check(self, name, condition, detail=None):
        self.checks.append(dict(name=name, passed=bool(condition), detail=detail))
        self.save()
    def json(self, record):
        try: return json.loads(record['stdout'])
        except (json.JSONDecodeError, TypeError): return {}
    def save(self):
        for name, data in [('commands.json', self.commands), ('checks.json', self.checks)]:
            (self.output / name).write_text(json.dumps(data, ensure_ascii=False, indent=2)+'\n')

def tree(root):
    root = Path(root)
    return {str(p.relative_to(root)).replace(os.sep,'/'):hashlib.sha256(p.read_bytes()).hexdigest()
            for p in sorted(root.rglob('*')) if p.is_file() and '.git' not in p.relative_to(root).parts}

def write(root, name, data):
    p = Path(root) / name
    p.parent.mkdir(parents=True, exist_ok=True)
    if isinstance(data, bytes): p.write_bytes(data)
    else: p.write_text(data, encoding='utf-8')
    return p

def write_json(root, name, data):
    return write(root,name,json.dumps(data,ensure_ascii=False,indent=2)+'\n')
