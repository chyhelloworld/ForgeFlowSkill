# Fresh-context handoff receiver report

Date: 2026-10-15 (UTC)
Result: **PASS for the narrow local trial.** The checkpoint was sufficient to recover the task, validate current state and acceptance-history bindings, run the unit suite, and complete an independent persisted CLI journey. The original digest recipe ambiguity was identified, resolved from project bytes, and subsequently clarified in the checkpoint.

## Context boundary and recovered goal

Started by reading `CHECKPOINT.md`, then inspected only this project's `.forgeflow/spec-state.json`, `blog.py`, `test_blog.py`, `.gitignore`, file listing, and working-tree status. Did not read sibling scripts, reports, evaluation results, prior chats, other project copies, or the referenced sibling evidence logs.

Recovered goal: an offline personal publishing CLI for technical posts and product introductions, stored in JSON. Posts start as drafts; publication is explicit; listing shows published posts only. Search is case-insensitive across title and body. Ordinary search hides drafts, and `--include-drafts` is explicit opt-in. No website deployment, network service, main-branch merge, paid dependency, or production-hardening claim is authorized by this checkpoint.

Environment: Python 3.12.14. Commands below were executed from this project directory.

## State and acceptance-history verification

Independent Python assertions passed for:

- Schema version 1; current specification version 2.
- Exactly `REQ-PUBLISH` and `REQ-SEARCH` in current requirements; no active changes.
- Archived `CHG-SEARCH`: accepted, change version 2, baseline version 1, applied version 2. Its delta's new requirement exactly matches current `REQ-SEARCH`, and its rationale records the privacy interruption.
- Current receipt: `SIMULATED-ACCEPT-SEARCH-V2`, `change_id=CHG-SEARCH`, `change_version=2`, `baseline_version=1`, `evidence_version=2`. The legacy `acceptance_ref` agrees. Current tasks and passing evidence are bound to change version 2.
- Exactly one retained history entry at version 1. It records invalidation and retains v1 passing evidence plus receipt `SIMULATED-ACCEPT-SEARCH-V1`, with change, baseline, and evidence versions all 1.
- `CHG-PARALLEL` is rejected, with baseline 1 older than current version 2.
- `CHG-CANCEL` is canceled; `REQ-DELETE` was not added to current requirements.
- The current evidence reference's code digest equals SHA-256 of `blog.py` raw bytes immediately followed by `test_blog.py` raw bytes:

  `0756bf97ee59bc2d07a6fc810f9fc9780800068ad8dbcffbb2116f840f0c8d75`

Reproducible core metadata/hash check:

```sh
python - <<'PY'
import hashlib, json
from pathlib import Path
s = json.loads(Path('.forgeflow/spec-state.json').read_text())
assert s['schema_version'] == 1 and s['current']['version'] == 2
assert set(s['current']['requirements']) == {'REQ-PUBLISH', 'REQ-SEARCH'}
assert s['active'] == {}
c = s['archived']['CHG-SEARCH']
assert (c['status'], c['version'], c['baseline_version'], c['applied_version']) == ('accepted', 2, 1, 2)
assert c['delta'][0]['new'] == s['current']['requirements']['REQ-SEARCH']
assert 'privacy' in c['delta'][0]['why'].lower()
assert c['delta'][0]['confirmation_ref'].startswith('SIMULATED')
assert c['acceptance'] == {'ref': 'SIMULATED-ACCEPT-SEARCH-V2', 'change_id': 'CHG-SEARCH', 'change_version': 2, 'baseline_version': 1, 'evidence_version': 2}
assert c['acceptance_ref'] == c['acceptance']['ref']
assert c['tasks'] and all(t['change_version'] == 2 for t in c['tasks'])
assert c['evidence'] and all(e['change_version'] == 2 and e['result'] == 'pass' for e in c['evidence'])
assert len(c['history']) == 1
h = c['history'][0]
assert h['version'] == 1 and 'invalidated' in h['reason']
assert h['acceptance'] == {'ref': 'SIMULATED-ACCEPT-SEARCH-V1', 'change_id': 'CHG-SEARCH', 'change_version': 1, 'baseline_version': 1, 'evidence_version': 1}
assert h['evidence'] and all(e['change_version'] == 1 and e['result'] == 'pass' for e in h['evidence'])
assert s['archived']['CHG-PARALLEL']['status'] == 'rejected'
assert s['archived']['CHG-PARALLEL']['baseline_version'] < s['current']['version']
assert s['archived']['CHG-CANCEL']['status'] == 'canceled'
assert 'REQ-DELETE' not in s['current']['requirements']
digest = hashlib.sha256(Path('blog.py').read_bytes() + Path('test_blog.py').read_bytes()).hexdigest()
assert c['evidence'][0]['ref'].split('#sha256-code-', 1)[1] == digest
print('PASS: state, history, and combined code digest')
PY
```

These receipts are simulated fixtures and establish no authenticated human acceptance. The original v1 source and evidence log contents were outside scope, so the v1 historical digest and both external log contents were not independently verified. The current digest match binds the available source/test bytes only; the independently rerun tests provide fresh behavioral evidence.

## Unit test execution

Executed:

```sh
python -m unittest -v
```

Observed:

```text
test_draft_publish_and_persistent_list ... ok
test_search_defaults_to_published_and_explicit_drafts ... ok
Ran 2 tests in 0.328s
OK
```

Exit status: 0. Both existing tests passed without editing source or tests.

## Separate real persisted CLI journey

Used a fresh temporary directory unrelated to the unit-test temporary databases. Every `python blog.py` invocation below was a separate operating-system process. Actual database: `<TEMP>/forgeflow-fresh-handoff.OuoncQ/posts.json`.

Executed commands (comments summarize observed results):

```sh
JOURNEY_DIR=$(mktemp -d <TEMP>/forgeflow-fresh-handoff.XXXXXX)
DB="$JOURNEY_DIR/posts.json"
export DB
python blog.py --db "$DB" list
# [] on a fresh database
python blog.py --db "$DB" create "PyThOn persistence" "NeedleAlpha in technical body" --kind technical
# id 1, kind technical, published false
python blog.py --db "$DB" create "Private launch" "NeedleBeta in product body" --kind product
# id 2, kind product, published false
python blog.py --db "$DB" list
# []: drafts hidden
python blog.py --db "$DB" search NEEDLE
# []: drafts hidden
python blog.py --db "$DB" search NEEDLE --include-drafts
# ids 1 and 2
python blog.py --db "$DB" publish 1
# id 1, published true
python blog.py --db "$DB" list
# id 1 only
python blog.py --db "$DB" search python
# id 1: case-insensitive title match
python blog.py --db "$DB" search nEeDlEaLpHa
# id 1: case-insensitive body match
python blog.py --db "$DB" search nEeDlEbEtA
# []: remaining product draft hidden
python blog.py --db "$DB" search nEeDlEbEtA --include-drafts
# id 2: explicit draft opt-in
python blog.py --db "$DB" search DOES_NOT_EXIST
# []
python - <<'PY'
import json, os
from pathlib import Path
posts = json.loads(Path(os.environ['DB']).read_text())
assert [(p['id'], p['kind'], p['published']) for p in posts] == [(1, 'technical', True), (2, 'product', False)]
assert posts[0]['title'] == 'PyThOn persistence'
assert posts[1]['body'] == 'NeedleBeta in product body'
print('PASS: separate process reopened persisted JSON')
PY
python blog.py --db "$DB" publish 2
# id 2, published true
python blog.py --db "$DB" list
# ids 1 and 2, both published
python blog.py --db "$DB" search NEEDLEBETA
# id 2: now visible without draft opt-in
python - <<'PY'
import json, os, subprocess, sys
from pathlib import Path
p = Path(os.environ['DB'])
posts = json.loads(p.read_text())
assert len(posts) == 2 and all(x['published'] for x in posts)
before = p.read_bytes()
r = subprocess.run([sys.executable, 'blog.py', '--db', str(p), 'publish', '999'], capture_output=True, text=True)
assert r.returncode == 2 and 'post not found' in r.stderr
assert p.read_bytes() == before
print('PASS: persisted publication and safe missing-ID error')
PY
```

All normal CLI commands succeeded. Both direct JSON-reopen assertions passed. The deliberately invalid publication returned exit status 2 and left the persisted database byte-for-byte unchanged.

## Observed ambiguity and resolution

The initially supplied checkpoint did not specify how `#sha256-code` was calculated. An initial receiver assertion assumed the hash covered `blog.py` alone and failed. The separately executed unit tests still passed. Diagnostic hashes showed that the recorded digest exactly equals the concatenation of `blog.py` followed by `test_blog.py`; the corrected state/hash assertion run passed in full. This was an assumption correction, not evidence of source corruption.

After reporting this finding, the coordinating task added the exact combined-digest recipe to `CHECKPOINT.md`. The receiver reread that local file and verified the clarification. No source or specification modification was needed. No unresolved inconsistency was found within the checked scope.

## Preservation and limits

Receiver changes: this report only. The journey database was created outside the project in the temporary location above. `blog.py`, `test_blog.py`, and `.forgeflow/spec-state.json` retained the following identical hashes before and after verification:

- `blog.py`: `24b91037e5fc7d70c7a866be798e6f8e897036485248aa96d72cd8040d470d9f`
- `test_blog.py`: `7edd5082a19b998f96ab137344d419ad4409f393eaa937031bf19f378bf37172`
- `.forgeflow/spec-state.json`: `125c681462e2f2ee57695caa5c67a75962e15af92c9e3ff16b50df5a98fc58d2`

The checkpoint's initial hash was `a8dd50f5e22693f1b209772a960acf6082eb3c92897dbbe083a07ae8d8905b08`; after the coordinating task's clarification it was `fde9685bb781a3a3bb81503734e78707053fcf693693ef24e74526e178c399c3`.

The narrow local acceptance behavior is verified. Concurrency, atomic writes, malformed database recovery, authentication, production reliability, deployments, and state transitions/promotion were not tested or authorized by this receiver assignment. No commit, merge, deployment, promotion, external service, or acceptance fabrication was performed.
