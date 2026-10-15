#!/usr/bin/env python3
"""Pattern-based full deliverable privacy scan; not a guarantee of secret absence."""
import json,re,sys,tarfile,zipfile,io
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'tools'))
from validate_package import is_deliverable
ROOT=Path(sys.argv[1]).resolve()
patterns={
'internal_absolute_path':r'(?<![A-Za-z0-9_/:])/(?:workspace|home/agent|mnt/data|agent_notes|user_notes)/[^\s"<>]*',
'private_thread_link':r'(?:codex://threads/|chatgpt.com/(?:c|g/[^/]+/c)/)[A-Za-z0-9_-]+',
'uuid':r'\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b',
'private_file_id':r'\b(?:file_[a-zA-Z0-9]{15,}|sediment://file_[a-zA-Z0-9]{15,})',
'secret_like':r'\b(?:sk-[a-zA-Z0-9]{20,}|ghp_[a-zA-Z0-9]{20,}|AKIA[A-Z0-9]{16})\b',
'private_named_id':r'(?i)(?:thread_id|threadId|conversation_id|session_id)\s*[=:]\s*["\']?[A-Za-z0-9_-]{12,}'
}
reviewed=[]
public_examples={'5f8a2c1e-4b6d-4f9a-9c3d-7e1b2a8d4c6f','f47ac10b-58cc-4372-a567-0e02b2c3d479','0e249867-af5d-445b-92c7-722fbec024f1'}
found=[];count=0;binary=0;archives=0

def scan(name,b):
 global count,binary,archives
 count+=1
 if name.endswith(('.tar.gz','.tgz')):
  archives+=1
  with tarfile.open(fileobj=io.BytesIO(b),mode='r:gz') as t:
   for f in t.getmembers():
    if f.isfile():scan(name+'!'+f.name,t.extractfile(f).read())
 elif name.endswith('.zip'):
  archives+=1
  with zipfile.ZipFile(io.BytesIO(b)) as z:
   for n in z.namelist():
    if not n.endswith('/'):scan(name+'!'+n,z.read(n))
 try:s=b.decode('utf8')
 except UnicodeDecodeError:binary+=1;return
 for key,regex in patterns.items():
  for m in re.finditer(regex,s):
   record={'file':name,'pattern':key,'line':s[:m.start()].count('\n')+1}
   if key=='uuid' and m.group() in public_examples and (name.startswith('tools/openspec/upstream-v1.14.2.tar.gz!') or name=='validation/scan_privacy.py'):
    reviewed.append({**record,'reason':'Reviewed public upstream documentation/test fixture ID or exact allowlist definition, not this user conversation'})
   else:found.append(record)
for p in sorted(ROOT.rglob('*')):
 if p.is_file() and is_deliverable(p,ROOT):scan(str(p.relative_to(ROOT)),p.read_bytes())
print(json.dumps({'scope':'All deliverable files including historical provenance and recursively expanded archives; UTF-8 text pattern scan; binary PNG inspected separately, not OCR-scanned','files_and_archive_members':count,'archives_expanded':archives,'binary_nontext_files':binary,'patterns':list(patterns),'reviewed_public_examples':reviewed,'findings':found,'passed':not found,'limits':'Patterns cannot establish absolute absence of private data or all secrets; historical sanitized hashes are not rewritten as original source bytes.'},ensure_ascii=False,indent=2))
sys.exit(bool(found))
