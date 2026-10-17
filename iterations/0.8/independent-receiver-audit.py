"""Read-only audit of sealed receiver08 artifacts; never runs business actions."""
import argparse
import csv
from collections import Counter
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import stat

REPORT_DIR = Path(__file__).resolve().parent
WORKSPACE = REPORT_DIR.parents[2]
LAB = WORKSPACE / '_handoff' / '20261017' / 'resume-lab'
PROJECT = LAB / 'project-final'
RECEIVER = LAB / 'receiver' / 'receiver08'
EXPECTED_SEAL = '93365362587166063bfff5c0d09013bbea63ae97c3839ea7a98c4c8bc791d152'
EXPECTED_CHECKER = '76644c50f79c4d7a4f6f26a4789724a755070ce24c245afbae723c74b87fe8eb'


def read(path):
    return json.loads(path.read_text(encoding='utf-8-sig'))


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def files(root):
    pending = [root]
    result = {}
    while pending:
        directory = pending.pop()
        for entry in os.scandir(directory):
            path = Path(entry.path)
            info = entry.stat(follow_symlinks=False)
            if info.st_file_attributes & stat.FILE_ATTRIBUTE_REPARSE_POINT:
                raise ValueError('Unexpected reparse point in experiment evidence: ' + str(path))
            if stat.S_ISDIR(info.st_mode):
                pending.append(path)
            elif stat.S_ISREG(info.st_mode):
                result[path.relative_to(root).as_posix()] = {'sha256': sha(path), 'bytes': info.st_size}
            else:
                raise ValueError('Unexpected evidence object: ' + str(path))
    return result


def record_matches(root, record):
    rel = Path(record['path'])
    if rel.anchor or '..' in rel.parts or ':' in str(rel):
        return False
    path = root / rel
    return path.is_file() and sha(path) == record['sha256'] and ('bytes' not in record or path.stat().st_size == record['bytes'])


def manifest_files(manifest):
    return {Path(item['path']).as_posix(): {'sha256': item['sha256'], 'bytes': item['bytes']}
            for item in manifest['files']}


def jsonl(path):
    return [json.loads(line) for line in path.read_text(encoding='utf-8').splitlines() if line]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--label', default='')
    args = parser.parse_args()
    if args.label and not args.label.replace('-', '').isalnum():
        parser.error('label must be alphanumeric/hyphen')
    output = REPORT_DIR / ('independent-receiver-audit' + ('-' + args.label if args.label else '') + '.json')
    if output.exists():
        raise ValueError('Refusing to overwrite prior independent audit')
    watched = [PROJECT, RECEIVER, LAB / 'project', LAB / 'snapshots']
    before_reads = {str(root): files(root) for root in watched}
    checks = {}
    details = {}

    seal = read(RECEIVER / 'receiver-evidence-manifest.json')
    checks['receiverSealMatchesAnnouncedIdentity'] = sha(RECEIVER / 'receiver-evidence-manifest.json') == EXPECTED_SEAL
    actual_receiver = files(RECEIVER)
    sealed_files = manifest_files(seal)
    excluded = {Path(name).as_posix() for name in seal['excludedSelfReferentialRecords']}
    checks['sealedReceiverFileSetCompleteWithinDeclaredExclusions'] = set(actual_receiver) - excluded == set(sealed_files)
    checks['allSealedReceiverFileBytesAndLengthsMatch'] = all(actual_receiver.get(name) == record for name, record in sealed_files.items())
    checks['externalReceiverReportCopyMatchesSeal'] = record_matches(Path(seal['externalReportCopy']['path']).parent, dict(seal['externalReportCopy'], path=Path(seal['externalReportCopy']['path']).name))

    original_manifest = read(LAB / 'snapshots' / 'after-interruption-final' / 'manifest.json')
    original_snapshot = Path(original_manifest['snapshotRoot'])
    old_manifest = read(LAB / 'snapshots' / 'after-interruption' / 'manifest.json')
    for label, manifest in [('final', original_manifest), ('legacy', old_manifest)]:
        snapshot = Path(manifest['snapshotRoot'])
        expected = {item['path']: {'sha256': item['sha256'], 'bytes': item['bytes']}
                    for item in manifest['entries'] if item['kind'] == 'file'}
        checks[label + 'OriginalSnapshotFileSetAndBytesPreserved'] = files(snapshot) == expected
        checks[label + 'OriginalSnapshotCopyHashesAgree'] = all(item['sha256'] == item['copySha256'] for item in manifest['entries'] if item['kind'] == 'file')
        if label == 'legacy':
            checks['legacyProjectAllOriginalFileBytesAndFileSetUnchanged'] = files(LAB / 'project') == expected

    bmanifest = read(RECEIVER / 'before-manifest.json')
    amanifest = read(RECEIVER / 'after-manifest.json')
    before_files, after_files = files(RECEIVER / 'before'), files(RECEIVER / 'after')
    checks['receiverBeforeManifestMatchesCompleteSnapshot'] = before_files == manifest_files(bmanifest)
    checks['receiverBeforeEqualsOriginalInterruptionSnapshot'] = before_files == files(original_snapshot)
    checks['receiverAfterManifestMatchesCompleteSnapshot'] = after_files == manifest_files(amanifest)
    checks['liveProjectEqualsSealedAfterSnapshot'] = files(PROJECT) == after_files
    added = sorted(set(after_files) - set(before_files))
    deleted = sorted(set(before_files) - set(after_files))
    changed = sorted(name for name in set(before_files) & set(after_files) if before_files[name] != after_files[name])
    expected_added = sorted(['outputs/index.json', 'outputs/review.json', 'receipts/index-01.json', 'receipts/review-01.json'] +
                            ['evidence/commands/' + action + suffix for action in ['index-01', 'review-01']
                             for suffix in ['.json', '.stdout.txt', '.stderr.txt']])
    checks['onlyTenExpectedNewFiles'] = added == expected_added
    checks['onlyCheckpointAndAppendLogChanged'] = changed == ['checkpoint.json', 'evidence/business-events.jsonl']
    checks['noOriginalFileDeleted'] = deleted == []
    checks['historicalBusinessEventsRemainBytePrefix'] = (PROJECT / 'evidence/business-events.jsonl').read_bytes().startswith((RECEIVER / 'before/evidence/business-events.jsonl').read_bytes())
    details['fileChanges'] = {'added': added, 'changed': changed, 'deleted': deleted}

    checkpoint = read(PROJECT / 'checkpoint.json')
    bcheckpoint = read(RECEIVER / 'before/checkpoint.json')
    spec = read(PROJECT / 'current/release-spec.json')
    goal = spec['goalRevision']
    fingerprint = hashlib.sha256(json.dumps(checkpoint['dependencies'], sort_keys=True, separators=(',', ':'), ensure_ascii=True).encode('utf-8')).hexdigest()
    checks['checkpointGoalAndRootMatchCurrentAnchor'] = checkpoint['goalRevision'] == goal and goal in (PROJECT / 'current/goal.md').read_text(encoding='utf-8') and checkpoint['projectRoot'] == str(PROJECT.resolve())
    checks['allFifteenDependenciesCurrentAndUnchanged'] = len(checkpoint['dependencies']) == 15 and checkpoint['dependencies'] == bcheckpoint['dependencies'] and all(record_matches(PROJECT, item) for item in checkpoint['dependencies'])
    checks['originalActionStatesPreservedInBeforeSnapshot'] = [(a['id'], a['state']) for a in bcheckpoint['actions']] == [('export-01', 'done'), ('index-01', 'running'), ('review-01', 'pending')]
    checks['allThreeCurrentActionStatesDone'] = [(a['id'], a['state']) for a in checkpoint['actions']] == [('export-01', 'done'), ('index-01', 'done'), ('review-01', 'done')]
    freeze = read(PROJECT / 'evidence/pre-execution-manifest.json')
    checks['frozenFilesMatchPreExecutionRecordedBytes'] = all(sha(PROJECT / row['frozenPath']) == row['sha256'] for row in freeze['frozenFiles'])
    checks['frozenAndCurrentProductionCheckerExactReviewedBytes'] = sha(PROJECT / 'frozen/skills/ff-handoff/scripts/resume.py') == EXPECTED_CHECKER == sha(WORKSPACE / 'source/skills/ff-handoff/scripts/resume.py')
    details['frozenSourceComparisonsNow'] = [{'source': row['source'], 'frozenPath': row['frozenPath'],
                                            'exactBytesSameNow': sha(Path(row['source'])) == row['sha256'],
                                            'textSameAfterNewlineNormalization': Path(row['source']).read_text(encoding='utf-8') == (PROJECT / row['frozenPath']).read_text(encoding='utf-8')}
                                           for row in freeze['frozenFiles']]
    checks['allEightFrozenInputsStillExactCurrentSourceBytesAtAuditTime'] = len(details['frozenSourceComparisonsNow']) == 8 and all(row['exactBytesSameNow'] for row in details['frozenSourceComparisonsNow'])

    immutable_export_paths = ['outputs/release.csv', 'receipts/export-01.json', 'runtime/export-01.execution.json',
                             'evidence/commands/export-01.json', 'evidence/commands/export-01.stdout.txt', 'evidence/commands/export-01.stderr.txt']
    checks['allOriginalExportBytesUnchanged'] = all(sha(PROJECT / name) == sha(RECEIVER / 'before' / name) == sha(RECEIVER / 'after' / name) == sha(original_snapshot / name) for name in immutable_export_paths)
    export_mtimes = {str(root): (root / 'outputs/release.csv').stat().st_mtime_ns for root in [original_snapshot, RECEIVER / 'before', RECEIVER / 'after', PROJECT]}
    checks['exportMtimeUnchangedAcrossAllFourCopies'] = len(set(export_mtimes.values())) == 1
    details['exportMtimeNs'] = export_mtimes
    business_events = jsonl(PROJECT / 'evidence/business-events.jsonl')
    counts = Counter(item['event'] for item in business_events)
    dispatches = Counter(item['actionId'] for item in business_events if item['event'] == 'command-dispatched')
    checks['oneExportExecutionAndNoRecordedReplay'] = read(PROJECT / 'runtime/export-01.execution.json')['executions'] == 1 and counts['export-worker-started'] == 1 and counts['export-output-written'] == 1 and dispatches['export-01'] == 1
    checks['oneInterruptedWorkerAndOneCompletionAndOneReview'] = counts['index-worker-started'] == counts['index-completion-worker-started'] == counts['local-review-written'] == dispatches['index-01'] == dispatches['review-01'] == 1
    details['eventCounts'] = dict(counts)
    details['dispatchCounts'] = dict(dispatches)

    interruption = read(PROJECT / 'evidence/interruption.json')
    supervisor = jsonl(PROJECT / 'evidence/supervisor-events.jsonl')
    event_names = [item['event'] for item in supervisor]
    required_events = ['inputs-frozen-before-execution', 'export-controller-starting', 'export-controller-exited', 'index-process-started', 'index-running-and-ready-observed', 'terminate-request-issued', 'child-exit-observed', 'interruption-evidence-written']
    checks['realInterruptionOrderedEventsAndObservedExit'] = event_names == required_events and interruption['childPid'] == 18960 and interruption['pollImmediatelyBeforeTerminate'] is None and interruption['exitObserved'] is True and interruption['exitCode'] == interruption['pollAfterWait'] == 1 and interruption['receiptForIndexExists'] is False and interruption['finalIndexExists'] is False
    checks['interruptionAndPreparationStillOriginalBytes'] = all(sha(PROJECT / name) == sha(original_snapshot / name) for name in ['evidence/interruption.json', 'evidence/supervisor-events.jsonl', 'work/index-01.prepared.json', 'runtime/index-01.ready.json'])
    process_observation = read(RECEIVER / 'commands/process-before.stdout.txt')
    index_dispatch = read(RECEIVER / 'commands/index-completion.json')
    checks['receiverObservedOriginalProcessesAbsentBeforeCompleting'] = all(not row['pidExists'] for row in process_observation['requested']) and {row['pid'] for row in process_observation['requested']} == {18960, 32220} and process_observation['matchingLabBusinessProcesses'] == [] and process_observation['pythonProcessesWithDeniedCommandLine'] == 0 and datetime.fromisoformat(process_observation['observedUtc']) < datetime.fromisoformat(index_dispatch['startedUtc'])
    process_after = read(RECEIVER / 'commands/process-after.stdout.txt')
    checks['receiverObservedOriginalProcessesStillAbsentAfterCompleting'] = all(not row['pidExists'] for row in process_after['requested']) and process_after['matchingLabBusinessProcesses'] == [] and datetime.fromisoformat(process_after['observedUtc']) > datetime.fromisoformat(index_dispatch['finishedUtc'])

    with (PROJECT / 'outputs/release.csv').open(encoding='utf-8', newline='') as stream:
        rows = list(csv.DictReader(stream))
    index = read(PROJECT / 'outputs/index.json')
    review = read(PROJECT / 'outputs/review.json')
    checks['actualThreeSkuRecordsEqualInputAndIndex'] = len(rows) == spec['expectedRows'] == index['rowCount'] == 3 and index['bySku'] == {row['sku']: row for row in rows} and (PROJECT / 'outputs/release.csv').read_bytes() == (PROJECT / 'inputs/inventory.csv').read_bytes()
    checks['currentIndexUsesOriginalPreparationAndExport'] = index['goalRevision'] == goal and record_matches(PROJECT, index['source']) and index['preparationSha256'] == sha(PROJECT / 'work/index-01.prepared.json')
    checks['localReviewChecksAndReferencedOutputsCurrent'] = len(review['checks']) == 6 and all(value is True for value in review['checks'].values()) and review['goalRevision'] == goal and all(record_matches(PROJECT, row) for row in review['outputs'])
    checks['onlyThreeAuthorizedLocalOutputsNoPublish'] = sorted(p.relative_to(PROJECT).as_posix() for p in (PROJECT / 'outputs').iterdir()) == sorted(spec['outputs']) and spec['externalPublish'] is False and spec['exportReplay'] is False

    commands = {}
    for item in checkpoint['actions']:
        aid = item['id']
        receipt_record = item['receipt'][0]
        receipt = read(PROJECT / receipt_record['path'])
        command = read(PROJECT / receipt['commandEvidence']['path'])
        checks[aid + 'ReceiptAndActualCommandProofBoundAndSuccessful'] = record_matches(PROJECT, receipt_record) and receipt['actionId'] == command['actionId'] == aid and receipt['goalRevision'] == goal and receipt['dependencyFingerprint'] == fingerprint and type(receipt['exitCode']) is int and receipt['exitCode'] == command['exitCode'] == 0 and record_matches(PROJECT, receipt['commandEvidence']) and all(record_matches(PROJECT, row) for row in receipt['outputs']) and record_matches(PROJECT, command['stdout']) and record_matches(PROJECT, command['stderr'])
        commands[aid] = {'workerPid': command['workerPid'], 'exitCode': command['exitCode'], 'startedUtc': command['startedUtc'], 'finishedUtc': command['finishedUtc']}
    details['businessCommandObservations'] = commands

    receiver_command_records = [read(path) for path in (RECEIVER / 'commands').glob('*.json')]
    checks['allReceiverRecordedCommandStreamsStillMatch'] = all(record_matches(RECEIVER, row['stdout']) and record_matches(RECEIVER, row['stderr']) for row in receiver_command_records)
    cb = read(RECEIVER / 'commands/checker-before.stdout.txt')
    ca = read(RECEIVER / 'commands/checker-after.stdout.txt')
    checks['initialCheckerPreservedExportAndRequiredInspect'] = read(RECEIVER / 'commands/checker-before.json')['exitCode'] == 1 and cb['status'] == 'INSPECT' and [(x['id'], x['recommendation']) for x in cb['actions']] == [('export-01', 'SKIP_COMPLETED'), ('index-01', 'INSPECT'), ('review-01', 'VERIFY_CURRENT_AUTHORITY')]
    checks['finalCheckerExitZeroThreeSkipResults'] = read(RECEIVER / 'commands/checker-after.json')['exitCode'] == 0 and ca['status'] == 'CHECKPOINT_CURRENT' and ca['gaps'] == [] and [(x['id'], x['recommendation']) for x in ca['actions']] == [('export-01', 'SKIP_COMPLETED'), ('index-01', 'SKIP_COMPLETED'), ('review-01', 'SKIP_COMPLETED')]
    checks['skuQueryActuallyReadAllCompletedRecords'] = read(RECEIVER / 'commands/sku-query.json')['exitCode'] == 0 and read(RECEIVER / 'commands/sku-query.stdout.txt')['lookupResults'] == index['bySku']
    checks['originalFailureRecordsPreserved'] = (RECEIVER / 'initial-cim-failure.json').is_file() and read(RECEIVER / 'commands/git-before.json')['exitCode'] == 128 and read(RECEIVER / 'commands/git-head.json')['exitCode'] == 128
    after_reads = {str(root): files(root) for root in watched}
    checks['independentAuditChangedNoWatchedEvidenceFileBytes'] = before_reads == after_reads
    report = {'observedUtc': datetime.now(timezone.utc).isoformat(),
              'scope': 'Independent read-only audit of the sealed three-row local interruption/recovery experiment; no business action or process operation rerun',
              'status': 'PASS' if all(checks.values()) else 'FAIL', 'checks': checks,
              'failedChecks': [name for name, passed in checks.items() if not passed], 'details': details,
              'sealSha256': sha(RECEIVER / 'receiver-evidence-manifest.json'), 'checkerSha256': sha(PROJECT / 'frozen/skills/ff-handoff/scripts/resume.py'),
              'counts': {'independentChecks': len(checks), 'beforeFiles': len(before_files), 'afterFiles': len(after_files), 'sealedReceiverFiles': len(sealed_files)},
              'limitations': ['Recorded events and hashes are consistency evidence, not human acceptance or authenticity/exactly-once proof.',
                             'Historical supervisor exit observation and receiver point-in-time process absence are separate evidence.',
                             'Frozen references are the actual execution inputs. Exact current source byte comparisons are recorded separately; any later source change requires fresh identity checks.',
                             'Final installer validation and same-version CRAP remain outside this audit.']}
    output.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps({'output': str(output), 'status': report['status'], 'counts': report['counts'], 'failedChecks': report['failedChecks']}, ensure_ascii=False))
    return 0 if report['status'] == 'PASS' else 1


if __name__ == '__main__':
    raise SystemExit(main())
