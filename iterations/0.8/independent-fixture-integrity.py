"""Record no-follow Windows fixture inventories before/after native root moves."""
import argparse
import ctypes
from ctypes import wintypes
import hashlib
import json
import os
from pathlib import Path
import stat

REPORT_DIR = Path(__file__).resolve().parent
WORKSPACE = REPORT_DIR.parents[2].resolve()
DESTINATION = WORKSPACE / '_handoff' / '20261017' / 'independent08-fixtures'
PLAN = REPORT_DIR / 'independent-fixture-move-plan.json'


class StreamData(ctypes.Structure):
    _fields_ = [('size', ctypes.c_longlong), ('name', ctypes.c_wchar * 296)]


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def streams(path):
    kernel = ctypes.WinDLL('kernel32', use_last_error=True)
    first = kernel.FindFirstStreamW
    first.argtypes = [wintypes.LPCWSTR, ctypes.c_int, ctypes.POINTER(StreamData), wintypes.DWORD]
    first.restype = wintypes.HANDLE
    next_stream = kernel.FindNextStreamW
    next_stream.argtypes = [wintypes.HANDLE, ctypes.POINTER(StreamData)]
    next_stream.restype = wintypes.BOOL
    close = kernel.FindClose
    close.argtypes = [wintypes.HANDLE]
    close.restype = wintypes.BOOL
    data = StreamData()
    handle = first(str(path), 0, ctypes.byref(data), 0)
    if handle == ctypes.c_void_p(-1).value:
        error = ctypes.get_last_error()
        if error == 38:
            return []
        raise ctypes.WinError(error)
    result = []
    try:
        while True:
            name = data.name
            if name != '::$DATA':
                result.append({'name': name, 'bytes': data.size,
                               'sha256': digest(Path(str(path) + name))})
            if not next_stream(handle, ctypes.byref(data)):
                error = ctypes.get_last_error()
                if error != 38:
                    raise ctypes.WinError(error)
                break
    finally:
        close(handle)
    return sorted(result, key=lambda item: item['name'])


def inventory(root):
    pending = [root]
    rows = []
    while pending:
        directory = pending.pop()
        for entry in sorted(os.scandir(directory), key=lambda item: item.name):
            path = Path(entry.path)
            info = entry.stat(follow_symlinks=False)
            row = {'relativePath': str(path.relative_to(root)), 'attributes': info.st_file_attributes}
            if info.st_file_attributes & stat.FILE_ATTRIBUTE_REPARSE_POINT:
                row.update(kind='reparse', tag=info.st_reparse_tag, target=os.readlink(path))
                # Do not enumerate or read through a reparse point.
            elif stat.S_ISDIR(info.st_mode):
                row['kind'] = 'directory'
                pending.append(path)
            elif stat.S_ISREG(info.st_mode):
                row.update(kind='file', bytes=info.st_size, sha256=digest(path), streams=streams(path))
            else:
                raise ValueError('Unexpected fixture object: ' + str(path))
            rows.append(row)
    return sorted(rows, key=lambda item: item['relativePath'])


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('stage', choices=['before', 'after'])
    args = parser.parse_args()
    if args.stage == 'before':
        if PLAN.exists():
            parser.error('refusing to overwrite saved move plan')
        mappings = []
        for old in sorted(REPORT_DIR.glob('independent-fixtures-*')):
            new = DESTINATION / old.name
            if not old.resolve().is_relative_to(WORKSPACE) or not new.resolve().is_relative_to(WORKSPACE):
                raise ValueError('Path outside workspace')
            if old.lstat().st_file_attributes & stat.FILE_ATTRIBUTE_REPARSE_POINT or not old.is_dir() or new.exists():
                raise ValueError('Unsafe fixture root or occupied destination')
            mappings.append({'oldExecutionPath': str(old), 'newPreservedPath': str(new),
                             'oldInsideWorkspace': True, 'newInsideWorkspace': True,
                             'inventoryBefore': inventory(old)})
        logs = {str(p): digest(p) for p in REPORT_DIR.glob('independent-*')
                if p.is_file() and p.suffix in ['.json', '.log']}
        plan = {'workspace': str(WORKSPACE), 'destination': str(DESTINATION),
                'moveMethod': 'Native PowerShell Move-Item of each complete root on the same E: volume; no recursive traversal',
                'mappings': mappings, 'originalEvidenceHashesBefore': logs}
        PLAN.write_text(json.dumps(plan, ensure_ascii=False, indent=2), encoding='utf-8')
        print(json.dumps({'plan': str(PLAN), 'roots': len(mappings),
                          'files': sum(r['kind'] == 'file' for m in mappings for r in m['inventoryBefore']),
                          'reparsePoints': sum(r['kind'] == 'reparse' for m in mappings for r in m['inventoryBefore'])}))
        return
    plan = json.loads(PLAN.read_text(encoding='utf-8'))
    for mapping in plan['mappings']:
        old, new = Path(mapping['oldExecutionPath']), Path(mapping['newPreservedPath'])
        after = inventory(new)
        mapping.update(oldRootAbsent=not old.exists(), inventoryAfter=after,
                       bytesStreamsAndReparseMetadataPreserved=after == mapping['inventoryBefore'])
        mapping['retainedOriginalReparseTargets'] = [
            {'relativePath': row['relativePath'], 'target': row['target']}
            for row in after if row['kind'] == 'reparse']
    unchanged = {p: digest(Path(p)) == expected
                 for p, expected in plan['originalEvidenceHashesBefore'].items()}
    result = dict(plan, originalEvidenceUnchanged=unchanged,
                  allOriginalEvidenceBytesUnchanged=all(unchanged.values()),
                  allFixtureInventoriesPreserved=all(m['bytesStreamsAndReparseMetadataPreserved'] and m['oldRootAbsent'] for m in plan['mappings']),
                  limitation='Checkpoint projectRoot strings, log paths and junction absolute target text are retained unchanged as original evidence. Junction targets therefore refer to the old execution path after relocation. Use this mapping to locate moved data; do not rewrite original records or treat relocated fixtures as fresh checkpoints.')
    output = REPORT_DIR / 'independent-fixture-relocation.json'
    if output.exists():
        parser.error('refusing to overwrite relocation evidence')
    output.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps({'mapping': str(output), 'allOriginalEvidenceBytesUnchanged': result['allOriginalEvidenceBytesUnchanged'],
                      'allFixtureInventoriesPreserved': result['allFixtureInventoriesPreserved']}))


if __name__ == '__main__':
    main()
