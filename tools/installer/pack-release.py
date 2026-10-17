"""Maintainer-only reproducible payload packaging. Never run by npm lifecycle."""
from pathlib import Path
import gzip, hashlib, io, subprocess, tarfile
root = Path(__file__).resolve().parents[2]
subprocess.run(['node', str(root / 'tools/installer/update-manifest.mjs')], check=True)
import json
names = sorted([*json.loads((root / 'MANIFEST.json').read_text(encoding='utf-8'))['files'], 'MANIFEST.json'])
buf = io.BytesIO()
with tarfile.open(fileobj=buf, mode='w', format=tarfile.USTAR_FORMAT) as archive:
    for name in names:
        info = archive.gettarinfo(str(root / name), arcname=name)
        info.mtime = 0
        info.uid = info.gid = 0
        info.uname = info.gname = ''
        with (root / name).open('rb') as source:
            archive.addfile(info, source)
payload = gzip.compress(buf.getvalue(), mtime=0)
(root / 'forgeflow-payload.tgz').write_bytes(payload)
(root / 'forgeflow-payload.sha256').write_bytes((hashlib.sha256(payload).hexdigest() + '\n').encode('ascii'))
