# ForgeFlow 0.5.0 real cloud project trial

## Result

One real Python standard-library project completed a narrow publishing lifecycle: persistent drafts, explicit publication, list, then search changed mid-flight to hide drafts by default. Actual subprocess tests, local Git commits, actual ForgeFlow CLI commands, state snapshots and a fresh-context receiver were used. No OpenSpec runtime, public deployment, external install, paid service, remote push or main-branch merge was used.

The final fresh run passed after two **test-harness corrections** and one **product guard correction prompted by this trial**. The initial negative-control probe exposed stale approval-reference acceptance with current evidence. The author added version-bound acceptance receipts; a fresh end-to-end rerun now rejects stale receipts and passes fresh receipts. The tool still cannot authenticate human approval. Do not describe this as all lifecycle risks solved.

Authoritative final artifacts are under final-run/. Root-level execution logs and the first blog-project preserve pre-fix history; they are not evidence that every historical command passed. The final-run log contains only the fresh corrected run, and every command matched its exact expected exit code.

All product confirmation and acceptance events are **SIMULATED test fixtures**, listed in SIMULATED_APPROVALS.md. The user authorized workflow development/testing, not real acceptance of this fictional blog product.

## Independent plan and actual implementation

CASE_PLAN.md was written before reading authored evaluation expected outcomes. The initial project is blog-project/, and the corrected fresh project is final-run/blog-project/, both on local branch trial-lifecycle. Baseline commit b4cc76ef6beb8ab2eade0229a533630f00dfdfb1 implements persistent technical/product draft creation, explicit publish and published-only list. Search v1 commit a62cf12 implements case-insensitive title/body search including drafts. Revised search commit 841d48f hides drafts by default and supports --include-drafts. The fresh final run independently starts at baseline fb71ddd, implements search in 2ec9445, and promotes repaired lifecycle state in 856a0a3.

Actual commands were run with the installed Python interpreter, git, and ff-workflow-skills-0.5.0-rc1/tools/spec_lifecycle.py. Full argv, stdout, stderr and return codes are in execution*.jsonl; use final-run/execution.jsonl for final status. Search tests each run separate CLI subprocesses using a temporary JSON database, so persistence is exercised rather than mocked.

## Version and evidence trail

| Stage | Current spec | Active change | Real outcome |
|---|---:|---:|---|
| Baseline draft/publish/list | 1 | none | 1 real unittest passed |
| First search implementation | 1 | CHG-SEARCH v1 verified | 2 real unittests passed |
| Interrupting privacy requirement confirmed in fixture | 1 | CHG-SEARCH v2 with stale v1 evidence | validate/apply both rejected rc1; entire state byte-for-byte unchanged |
| Implement revised privacy behavior | 1 | CHG-SEARCH v2 verified | 2 refreshed real unittests passed |
| Fresh v2 evidence with stale v1 acceptance receipt | 1 | CHG-SEARCH v2 verified | rejected rc1 stale acceptance change_version; entire state byte-for-byte unchanged |
| New simulated v2 acceptance and apply | 2 | CHG-SEARCH accepted | apply rc0; unrelated REQ-PUBLISH unchanged |
| Reapply same change | 2 | accepted | rejected rc1; entire state unchanged |
| Competing parallel v1 change | 2 | CHG-PARALLEL based on 1 | stale baseline rejected rc1; entire state unchanged |
| Archive accepted/rejected/canceled changes | 2 | none | current spec unchanged; rationale retained |
| Repeat archive | 2 | none | rejected rc1; entire state unchanged |

Final snapshots (under final-run/): baseline-state.json, search-v1-verified.json, interrupted-stale-evidence.json, search-v2-verified.json, search-v2-fresh-acceptance.json, promoted-v2.json, archived-v2.json. Current state and archive share one atomic state file. Full-state byte equality was asserted after rejected mutations, covering both current baseline and archive. For successful archival operations the current JSON object was compared for exact structural equality, since pretty-print serialization is part of the tool write.

The interruption is an explicit fixture proposal followed by a distinct explicit-confirmation fixture; it is not an actual new human message. The test changes behavior, versions the active change, preserves prior evidence in snapshots, clears obsolete acceptance, re-runs code/tests and supplies a new simulated acceptance reference.

## Failures and corrections, preserved rather than hidden

1. Initial harness used the wrong tool path (package is nested under ff-workflow-skills-0.5.0-rc1). Commands failed rc2. Its overly loose negative-test assertion accepted any nonzero code. Corrected to exact expected rc1 plus parseable tool JSON. Those first-attempt entries are retained in execution-first-attempt.jsonl and are **not** lifecycle proof.
2. After genuine v2 tests, the harness initially appended v2 evidence while retaining active v1 evidence. Validation rejected stale evidence. The author confirmed all active evidence must be current-version. Corrected to preserve v1 evidence in historical snapshots and replace active evidence with genuine v2 rerun results. execution-second-attempt.jsonl preserves this rejected run.
3. Isolated acceptance freshness probe, acceptance-boundary-probe.json: starting from valid v2 test evidence, apply with obsolete SIMULATED-ACCEPT-SEARCH-V1 succeeds rc0. This is a demonstrated tool boundary, not a passing freshness guard. The primary project was not changed by this temporary-directory probe. This finding prompted a code correction: a mandatory acceptance receipt now binds reference, change ID, change version, baseline version and evidence version. The clean final rerun with fresh tests and the old v1 receipt rejects rc1 with stale acceptance change_version; refreshing the receipt to v2 then succeeds. Original vulnerable probe output remains preserved. Caller must still verify approval content and authorized person; a structured receipt is not authentication.
4. The first fresh receiver found a low-severity fixture naming defect: canceled delete change used search-oriented task ID and rationale. Corrected in final-run to TASK-DELETE and deletion-specific cancellation rationale; the original report remains intact.

## Fresh-context handoff

A genuinely new agent was launched with fork_turns=none and given only the project path and CHECKPOINT.md. It was explicitly restricted from sibling trial scripts, reports, evaluation expected outcomes and prior conversation. It independently recovered the current goal, checked current spec v2 with no active changes and terminal archives, ran the two unit tests and a separate real JSON persistence/search journey. See blog-project/HANDOFF_RECEIVER_REPORT.md for receiver commands/evidence. A second genuinely new receiver was launched on the corrected final-run project with the same fresh-context restriction; its report is final-run/blog-project/HANDOFF_RECEIVER_REPORT.md. This establishes bounded fresh-context handoffs, not long-term cross-model reliability.

## Boundaries

- Real code and tests establish only the narrow main business path. The CLI is not production hardened (for example, concurrent blog database writers are not supported).
- The structural guard does not execute tests, inspect referenced logs, authenticate acceptance, or prove the current implementation matches prose. Actual tests here are separate evidence.
- One project scenario (replayed after correction), one interrupted change, one stale parallel proposal and fresh receivers are a bounded cloud trial. No claim of multiweek workflow stability, every possible field combination, broad product quality or real human product acceptance is made.
- final-run/run_trial.py phase commands operate on expected checkpoints; they are an execution harness, not a destructive universal reset/replay tool. Preserve existing results before rerunning.

## Historical evidence retention after correction

The final archived CHG-SEARCH contains history[0] with prior version 1, the reason it was invalidated, original evidence and original simulated receipt. Active evidence and acceptance remain version 2. Historical entries preserve why without qualifying as current proof. The final source/tool/state hashes are in final-run/artifact-hashes.json.

## Final counts, hashes and portable verification

The clean final-run/execution.jsonl contains **17 commands: 17 matched expected exit codes**, comprising 11 successful commands and 6 expected rejections. Of these, 11 invoke the real ForgeFlow lifecycle CLI. The two product test runs each pass 2 tests (first search behavior, then revised privacy behavior). Baseline bootstrap separately passed 1 test. Receiver and independent-reviewer test runs are additional, not folded into those 17 counts. Historical failed attempts are excluded from final pass counts.

SHA-256:
- Baseline blog.py: f2063dc6d43bc62eca6f2f0a5f4c8cf16119c92712eb6f77495068d37a749e6e
- Final blog.py: 24b91037e5fc7d70c7a866be798e6f8e897036485248aa96d72cd8040d470d9f
- Final test_blog.py: 7edd5082a19b998f96ab137344d419ad4409f393eaa937031bf19f378bf37172
- Repaired spec_lifecycle.py: e69f6ac8190be04ad0a127bb0d0b72ff9ead7fa66101c4e1d385c3a0b3e4e2a5
- Final spec-state.json: 125c681462e2f2ee57695caa5c67a75962e15af92c9e3ff16b50df5a98fc58d2

From the ff-workflow-0.5.0-20261015 artifact root, safe repeatable verification without mutating lifecycle state:

```sh
(cd cloud-test/final-run/blog-project && python -m unittest -v)
python ff-workflow-skills-0.5.0-rc1/tools/spec_lifecycle.py validate cloud-test/final-run/blog-project
```

No external packages are needed. To rerun the lifecycle harness itself, first create a new isolated baseline project and evidence directory as done in this trial; do not invoke setup_fixture.py on an existing user project, since it deliberately authors initial state.

Final receiver also identified an underspecified checkpoint digest recipe. The evidence suffix is SHA-256(blog.py raw bytes + test_blog.py raw bytes), in that order, rather than a single-source-file hash. The receiver independently checked the combined digest; CHECKPOINT.md now states this explicitly. This is a handoff documentation correction, not a source/test change.
