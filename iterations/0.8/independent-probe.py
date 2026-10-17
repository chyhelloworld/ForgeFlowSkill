"""Independent 0.8 review probes. Only writes independent-* review artifacts.

Run from source: python -B iterations/0.8/independent-probe.py --label before-fix
Fixtures and raw failures are intentionally retained. No real external action runs.
"""
import argparse
import copy
import hashlib
import importlib.util
import json
import locale
import os
from pathlib import Path
import subprocess
import sys
import time

sys.dont_write_bytecode = True
SOURCE = Path(__file__).resolve().parents[2]
REPORT_DIR = Path(__file__).resolve().parent
RESUME = SOURCE / 'skills/ff-handoff/scripts/resume.py'


def digest(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()


def evidence(p, root):
    return {'path': str(p.relative_to(root)), 'sha256': digest(p)}


def run_child(argv, env=None):
    child_env = dict(os.environ, PYTHONDONTWRITEBYTECODE='1', PYTHONIOENCODING='utf-8')
    if env:
        child_env.update(env)
    result = subprocess.run(argv, cwd=SOURCE, env=child_env, capture_output=True,
                            timeout=30, creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0))
    return {'argv': [str(x) for x in argv], 'exitCode': result.returncode,
            'stdout': result.stdout.decode('utf-8', errors='backslashreplace'),
            'stderr': result.stderr.decode('utf-8', errors='backslashreplace'),
            'stdoutHex': result.stdout.hex(), 'stderrHex': result.stderr.hex()}


def main():
    global RESUME
    parser = argparse.ArgumentParser()
    parser.add_argument('--label', required=True)
    parser.add_argument('--resume', type=Path, default=RESUME)
    parser.add_argument('--receipt-format', choices=['legacy', 'bound'], default='legacy')
    parser.add_argument('--fixture-root', type=Path,
                        default=SOURCE.parent / '_handoff' / '20261017' / 'independent08-fixtures',
                        help='Project-local directory outside source for retained fixtures')
    args = parser.parse_args()
    RESUME = args.resume.resolve()
    if not args.label.replace('-', '').isalnum():
        parser.error('label must be alphanumeric/hyphen')
    output = REPORT_DIR / ('independent-' + args.label + '.json')
    if output.exists():
        parser.error('will not overwrite existing raw evidence')
    fixture_parent = args.fixture_root.resolve()
    if not fixture_parent.is_relative_to(SOURCE.parent.resolve()) or fixture_parent.is_relative_to(SOURCE.resolve()):
        parser.error('fixture-root must stay inside the project workspace and outside source')
    fixture_parent.mkdir(parents=True, exist_ok=True)
    run_dir = fixture_parent / ('independent-fixtures-' + args.label + '-' + str(time.time_ns()))
    run_dir.mkdir()
    spec = importlib.util.spec_from_file_location('independent_resume', RESUME)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    report = {'label': args.label, 'source': str(RESUME), 'sourceSha256': digest(RESUME),
              'python': sys.version, 'platform': sys.platform,
              'localeEncoding': locale.getencoding(), 'utf8Mode': sys.flags.utf8_mode,
              'fixtureDirectory': str(run_dir), 'receiptFormat': args.receipt_format, 'probes': []}

    def save():
        output.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')

    def fixture(name):
        base = run_dir / name
        root = base / 'root'
        root.mkdir(parents=True)
        (root / 'spec.txt').write_text('approved source revision A', encoding='utf-8')
        (root / 'output.txt').write_text('actual bounded test result: revision A, exit 0', encoding='utf-8')
        receipt = {'actionId': 'test-01', 'goalRevision': 'R2', 'operation': 'bounded fake executor test',
                   'exitCode': 0, 'outputs': [evidence(root / 'output.txt', root)]}
        dependencies = [evidence(root / 'spec.txt', root)]
        if args.receipt_format == 'bound':
            receipt['dependencyFingerprint'] = module.dependency_fingerprint(dependencies)
        (root / 'receipt.json').write_text(json.dumps(receipt), encoding='utf-8')
        data = {'version': 1, 'projectRoot': str(root.resolve()), 'goalRevision': 'R2',
                'dependencies': dependencies,
                'actions': [{'id': 'test-01', 'state': 'done',
                             'receipt': [evidence(root / 'receipt.json', root)]},
                            {'id': 'next-01', 'state': 'pending'}]}
        return base, root, data, receipt

    def check(name, mutate=None, accepted=False, goal='R2', cli=False, checkpoint_encoding='utf-8',
              bind_after_mutation=False, recommendations=None):
        base, root, data, receipt = fixture(name)
        try:
            metadata = mutate(base, root, data, receipt) if mutate else None
        except Exception as error:
            report['probes'].append({'name': name, 'status': 'BLOCKED',
                                     'errorType': type(error).__name__, 'error': str(error)})
            save()
            return
        if bind_after_mutation:
            receipt['dependencyFingerprint'] = module.dependency_fingerprint(data['dependencies'])
            (root / 'receipt.json').write_text(json.dumps(receipt), encoding='utf-8')
            data['actions'][0]['receipt'] = [evidence(root / 'receipt.json', root)]
        checkpoint = root / 'checkpoint.json'
        checkpoint.write_text(json.dumps(data, ensure_ascii=not cli), encoding=checkpoint_encoding)
        known = list(root.iterdir())
        if (base / 'outside').is_dir():
            known.extend((base / 'outside').iterdir())
        if isinstance(metadata, dict) and 'streamPath' in metadata:
            known.append(Path(metadata['streamPath']))
        known = [p for p in known if p.is_file()]
        before = {str(p): digest(p) for p in known}
        try:
            if cli:
                raw = run_child([sys.executable, '-B', str(RESUME), str(checkpoint),
                                 '--root', str(root), '--current-goal', goal])
                result = json.loads(raw['stdout']) if raw['stdout'].strip() else None
            else:
                result = module.inspect(root, data, goal)
                raw = None
            current = result is not None and result.get('status') == 'CHECKPOINT_CURRENT'
            status = 'PASS' if current == accepted else 'FAIL'
            actual_recommendations = {a['id']: a['recommendation'] for a in result.get('actions', [])}
            if recommendations is not None and actual_recommendations != recommendations:
                status = 'FAIL'
            after = {str(p): digest(p) for p in known}
            if before != after:
                status = 'FAIL'
            row = {'name': name, 'status': status,
                   'expectation': 'current' if accepted else 'reject current / require inspection',
                   'result': result, 'input': copy.deepcopy(data), 'metadata': metadata,
                   'readonlyKnownFiles': before == after, 'knownFileHashesBefore': before,
                   'expectedRecommendations': recommendations}
            if raw is not None:
                row['rawCli'] = raw
        except Exception as error:
            row = {'name': name, 'status': 'ERROR', 'errorType': type(error).__name__,
                   'error': str(error), 'input': data, 'metadata': metadata}
        report['probes'].append(row)
        save()

    def rewrite_receipt(root, data, receipt, ascii_only=True):
        (root / 'receipt.json').write_text(json.dumps(receipt, ensure_ascii=ascii_only), encoding='utf-8')
        data['actions'][0]['receipt'] = [evidence(root / 'receipt.json', root)]

    check('happy-valid-checkpoint', accepted=True, cli=True)
    check('stale-dependency', lambda b, r, d, x: (r / 'spec.txt').write_text('changed source B', encoding='utf-8'))
    check('stale-output', lambda b, r, d, x: (r / 'output.txt').write_text('different output', encoding='utf-8'))
    check('stale-goal', goal='R3')

    def wrong_receipt_id(b, r, d, x):
        x['actionId'] = 'other-01'
        rewrite_receipt(r, d, x)
    check('wrong-receipt-action-id', wrong_receipt_id)

    def wrong_receipt_goal(b, r, d, x):
        x['goalRevision'] = 'R1'
        rewrite_receipt(r, d, x)
    check('wrong-receipt-goal', wrong_receipt_goal)

    def boolean_exit(b, r, d, x):
        x['exitCode'] = False
        rewrite_receipt(r, d, x)
    check('boolean-receipt-exit-code', boolean_exit)
    check('duplicate-action-id', lambda b, r, d, x: d['actions'][1].update(id='test-01'))
    for state in ['running', 'unknown', 'invalid', None]:
        check('action-state-' + str(state), lambda b, r, d, x, state=state: d['actions'][0].update(state=state))
    check('pending-does-not-inherit-authority', lambda b, r, d, x: d.update(actions=[{'id': 'next-01', 'state': 'pending', 'approved': True, 'authorization': 'old approval'}]), accepted=True,
          recommendations={'next-01': 'VERIFY_CURRENT_AUTHORITY'})
    check('empty-dependencies', lambda b, r, d, x: d.update(dependencies=[]))
    check('empty-actions', lambda b, r, d, x: d.update(actions=[]))
    check('malformed-action', lambda b, r, d, x: d.update(actions=[None]))
    check('boolean-version', lambda b, r, d, x: d.update(version=True))
    check('parent-traversal', lambda b, r, d, x: d['dependencies'][0].update(path='../outside/spec.txt'))

    def rooted_dependency(b, r, d, x):
        outside = b / 'outside'
        outside.mkdir()
        p = outside / 'spec.txt'
        p.write_text('bounded outside-project test data', encoding='utf-8')
        rel = str(p.resolve())[2:]
        d['dependencies'] = [{'path': rel, 'sha256': digest(p)}]
        return {'outsideFile': str(p), 'pathIsAbsolute': Path(rel).is_absolute(),
                'resolvedReadTarget': str((r / rel).resolve()), 'outsideProject': not (r / rel).resolve().is_relative_to(r.resolve())}
    check('windows-rooted-dependency-escape', rooted_dependency)

    def rooted_receipt(b, r, d, x):
        outside = b / 'outside'
        outside.mkdir()
        p = outside / 'receipt.json'
        p.write_text(json.dumps(x), encoding='utf-8')
        rel = str(p.resolve())[2:]
        d['actions'][0]['receipt'] = [{'path': rel, 'sha256': digest(p)}]
        return {'outsideFile': str(p), 'resolvedReadTarget': str((r / rel).resolve())}
    check('windows-rooted-receipt-escape', rooted_receipt)

    def junction_dependency(b, r, d, x):
        outside = b / 'outside'
        outside.mkdir()
        p = outside / 'spec.txt'
        p.write_text('bounded outside-project junction target', encoding='utf-8')
        junction = r / 'linked'
        raw = run_child(['cmd.exe', '/d', '/c', 'mklink', '/J', str(junction), str(outside)])
        if raw['exitCode'] != 0:
            raise RuntimeError(json.dumps(raw))
        d['dependencies'] = [{'path': 'linked/spec.txt', 'sha256': digest(p)}]
        return {'junctionCreation': raw, 'isSymlink': junction.is_symlink(),
                'resolvedReadTarget': str((junction / 'spec.txt').resolve()),
                'outsideProject': not (junction / 'spec.txt').resolve().is_relative_to(r.resolve())}
    check('windows-junction-dependency-escape', junction_dependency)

    def ads_dependency(b, r, d, x):
        host = r / 'visible.txt'
        host.write_text('visible content', encoding='utf-8')
        p = r / 'visible.txt:hidden'
        p.write_text('alternate data stream evidence', encoding='utf-8')
        d['dependencies'] = [{'path': p.name, 'sha256': digest(p)}]
        return {'streamPath': str(p), 'streamIsFile': p.is_file(), 'visibleFileBytes': host.read_text(encoding='utf-8')}
    check('windows-ads-hidden-evidence', ads_dependency)

    def unicode_checkpoint(b, r, d, x):
        d['note'] = '中文项目的恢复检查点'
    check('utf8-chinese-checkpoint-cli', unicode_checkpoint, accepted=True, cli=True)

    def unicode_receipt(b, r, d, x):
        d['actions'][0]['id'] = '测试-01'
        x['actionId'] = '测试-01'
        x['operation'] = '运行测试'
        rewrite_receipt(r, d, x, ascii_only=False)
    check('utf8-chinese-receipt', unicode_receipt, accepted=True)

    def refreshed_checkpoint_old_receipt(b, r, d, x):
        old_hash = digest(r / 'spec.txt')
        old_receipt = digest(r / 'receipt.json')
        (r / 'spec.txt').write_text('approved source revision B; test has not been rerun', encoding='utf-8')
        d['dependencies'] = [evidence(r / 'spec.txt', r)]
        return {'originalDependencySha256': old_hash, 'currentDependencySha256': digest(r / 'spec.txt'),
                'unchangedReceiptSha256': old_receipt, 'operationActuallyReran': False}
    check('refreshed-dependency-index-reuses-old-completion', refreshed_checkpoint_old_receipt)

    if args.receipt_format == 'bound':
        def legacy_receipt(b, r, d, x):
            del x['dependencyFingerprint']
            rewrite_receipt(r, d, x)
        check('legacy-receipt-without-binding-rejected', legacy_receipt)

        # Fresh current bindings isolate path rejection from stale receipt rejection.
        check('windows-rooted-dependency-escape-bound-current-index', rooted_dependency, bind_after_mutation=True)
        check('windows-junction-dependency-escape-bound-current-index', junction_dependency, bind_after_mutation=True)
        check('windows-ads-hidden-evidence-bound-current-index', ads_dependency, bind_after_mutation=True)

        for state in ['running', 'unknown']:
            def extra_unknown(b, r, d, x, state=state):
                d['actions'].append({'id': 'upload-01', 'state': state, 'jobId': 'bounded-fake-job-never-executed'})
            check('independent-completion-preserved-with-' + state, extra_unknown,
                  recommendations={'test-01': 'SKIP_COMPLETED', 'next-01': 'VERIFY_CURRENT_AUTHORITY', 'upload-01': 'INSPECT'})

        for name, path in [('absolute-path', str(run_dir / 'not-read.txt')),
                           ('drive-relative-path', 'C:independent-not-read.txt'),
                           ('nul-path', 'spec\x00.txt'), ('unc-path', r'\\uncontacted.invalid\share\not-read.txt')]:
            check(name, lambda b, r, d, x, path=path: d['dependencies'][0].update(path=path), cli=True)

        check('empty-dependency-file', lambda b, r, d, x: (r / 'spec.txt').write_bytes(b''))
        check('empty-output-file', lambda b, r, d, x: (r / 'output.txt').write_bytes(b''))
        check('empty-receipt-file', lambda b, r, d, x: (r / 'receipt.json').write_bytes(b''))

        def malformed_receipt(b, r, d, x):
            (r / 'receipt.json').write_text('[]', encoding='utf-8')
            d['actions'][0]['receipt'] = [evidence(r / 'receipt.json', r)]
        check('malformed-receipt-array', malformed_receipt)

        def empty_outputs(b, r, d, x):
            x['outputs'] = []
            rewrite_receipt(r, d, x)
        check('missing-receipt-outputs', empty_outputs)

    def missing_project_root(b, r, d, x):
        del d['projectRoot']
    check('missing-project-root', missing_project_root)

    # The public CLI promises exit 2 for malformed structured input. Keep raw output.
    for name, payload in [('top-level-array', []), ('top-level-null', None), ('top-level-string', 'bad')]:
        base = run_dir / name
        base.mkdir()
        checkpoint = base / 'checkpoint.json'
        checkpoint.write_text(json.dumps(payload), encoding='utf-8')
        raw = run_child([sys.executable, '-B', str(RESUME), str(checkpoint), '--root', str(base), '--current-goal', 'R2'])
        report['probes'].append({'name': name, 'status': 'PASS' if raw['exitCode'] == 2 else 'FAIL', 'rawCli': raw})
        save()

    report['summary'] = {status: sum(p['status'] == status for p in report['probes']) for status in ['PASS', 'FAIL', 'ERROR', 'BLOCKED']}
    save()
    print(json.dumps({'report': str(output), 'sourceSha256': report['sourceSha256'], 'summary': report['summary']}, ensure_ascii=False))
    return 1 if report['summary']['FAIL'] or report['summary']['ERROR'] else 0


if __name__ == '__main__':
    raise SystemExit(main())
