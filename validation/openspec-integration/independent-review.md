# Independent integration review

Review date: 2026-10-15. Status: PASS for the scoped terminal-complete integration, with explicit platform and evidence limits. The final signoff section supersedes earlier chronological findings and pending statuses.

## Scope and evidence

Read the prior trial REPORT.md and source-adaptation-feasibility.md, current FF SPEC-LIFECYCLE.md, baseline CRAP measurement script/report, and upstream v1.14.2 archive implementation. Review is independent from implementation. No author-owned code changed by this reviewer.

## Plan verdict

Conditionally suitable: opt-in project FF policy, per-change reference records, one shared validity evaluator across native status/apply/validate/archive, pinned upstream source and reproducible patch/build, no general non-spec promotion. OpenSpec specs become the sole spec authority; explicit canonical non-spec files remain in place. Git supplies history.

Required implementation checks communicated to author:

- Preserve default upstream behavior with absent policy. Malformed enabled configuration fails closed.
- Prevent archive bypass through --yes, --no-validate, --skip-specs; recheck after asynchronous prompts/preparation before mutation.
- Explicitly specify file-collection boundaries so additions, deletions and renames invalidate the right version.
- Propagate stale dependencies transitively even when intermediate bytes stay unchanged.
- Bind review target, exact input/output versions, evidence bytes, checker/tool version and policy version. Structural validity does not authenticate reviewers or acceptance.
- Do not retain two writable spec authorities after adoption; safe migration retains historical records and never fabricates acceptance.
- Exercise mixed spec and non-spec archive to avoid canonical spec promotion invalidating an in-flight repeated check.
- Preserve upstream rollback/path containment guarantees, and avoid claiming protection against hostile concurrent filesystem writers.

## Existing evidence caution

Baseline validation/review-crap.json describes main as zero-covered while its main row reports coverage 1.0. This is a stale description in earlier evidence, not fresh proof about integration code. Integration complexity/coverage measurements must be regenerated with exact source hashes, test scope, stated algorithm and actual results. Historical evidence must remain clearly historical.

## Final verdict

Pending source diff, independent isolated-fixture execution, rebuild check, migration review and actual complexity/coverage evidence. No implementation acceptance is implied by the plan review.

## Final source and execution review

The plan-stage status above is superseded by this final review. The reviewer inspected the shared evaluator, native hooks, reproducible builder, pinned source metadata, migration and lifecycle documentation. No implementation files were edited by the reviewer.

Findings required and received fixes:

1. An individual required glob could be empty while a sibling scope matched. Reproduced independently (initial 9/10 probes). Every declared glob now must match a file; final retest passes.
2. Only policy bytes were bound, so effective schema changes did not invalidate records. Added resolved-schema hash binding; independent black-box tester exercised local schema changes.
3. Archive validation did not pass the actual project root for nested changes. Call now supplies root.path.
4. A runtime --schema override could disagree with the evaluator's metadata/default schema. Adopted changes now reject differing effective schemas. Reviewer independently exercised native status and apply instructions with alternate schema: both block FF validity.
5. Initial complexity script used development build paths and omitted the new archive callback. Final measurement uses the frozen packaged build and includes beforeFFMutation. Legacy write-guard coverage measured independently below.

### Independent reviewer executions

- Packaged runtime evaluator and native CLI probes: 13/13 pass. Includes positive three-level graph, transitive stale with unchanged consumers, overlapping canonical paths, empty required glob, escaping symlink, orphan manifest, malformed policy, directory/empty artifacts, clean opt-out, default-schema positive status and native status/apply alternate-schema blocking. See reviewer-probes.py and reviewer-probes.json. Initial failure is retained separately in reviewer-probes-initial.json.
- Legacy audit/retirement tests: 4/4 pass; CLI and module write entrypoints refuse with original state bytes unchanged. See reviewer-legacy-tests.log.
- Pinned archive/patch/bootstrap hashes verified; tag resolves to f80d860fc510ba4f51180c8ddde35b91b32de657; tar member paths checked for traversal. Source reconstruction completed in packaged .build, not by shipping node_modules-only edits.
- Read and cross-checked independent tester's final packaged evidence and before/after source hashes. Evaluator and archive TypeScript/compiled JavaScript hashes are identical across coverage collection and match the metric report.

### Metrics and broader regression evidence

final-ff-crap.json measures 45 FF runtime functions using installed ESLint classic complexity on compiled JavaScript and actual V8 exact-offset range coverage. Maximum CRAP is 14.9467; none exceeds 50. Three functions exceed the aspirational approximately 10 target (strings, relativeName, safePath). Range/byte-segment coverage is explicitly not Istanbul statement/branch coverage. Four build helper functions and the snapshot helper file remain explicitly NOT_MEASURED; no blanket all-code quality pass is inferred.

reviewer-legacy-crap.json adds actual independent CPython trace measurements for transition, atomic_write and mutate. Each function is AST-verified to contain one raise, CC=1, observed executable-line coverage=1, CRAP=1. This evidence records the exact current source hash; historical rc1 metrics are not used as proof.

The patched full upstream suite reports 6,448 passing and 19 failing tests. The exact 19 failing tests reproduce in pristine pinned upstream affected suites; upstream-baseline-comparison.json records both lists and logs. This is baseline comparison evidence, not an all-tests-pass result or a proven specific environmental diagnosis.

## Final verdict and limits

The scoped opt-in reference/validity adapter passes independent source review and the reviewer probes after fixes. It maintains one current spec authority, explicit non-spec canonical paths, Git history, preserved historical evidence, source-rebuildable packaging and a shared hard gate for native CLI paths. Ordinary opt-out behavior remains available only when policy and active receipts are absent. No approval/authentication claims are manufactured.

Important capability regression remains explicit: rc2 has no supported native cancellation/rejection archival path for intentionally incomplete or failed work. It cannot use --skip-specs to bypass the FF gate. The migration documentation describes separately authorized Git-preserving manual history organization; that is not executable lifecycle parity with rc1. User-facing handoff must disclose this limitation. A future bounded terminal-disposition operation would need a reason, preservation of failed/stale evidence, and unconditional prohibition on spec promotion; a generic gate bypass is not acceptable.

Windows/native-host execution, malicious-writer concurrency safety, arbitrary-format semantic/visual verification, generic non-spec promotion and complete helper coverage are not established. Main-branch merge, release/deployment and user acceptance are outside this review. No claim of full lifecycle parity or universal transaction safety is made.

## Addendum: review reopened for terminal closure

At 04:52 UTC the parent requested implementation of a bounded native canceled/rejected closure path to eliminate the explicit lifecycle gap. The preceding final verdict applies only to the pre-closure snapshot; it is not acceptance of the new code. New source, terminal behavior, refusal cases, rollback and metrics must be independently reviewed and retested before this report closes. Earlier evidence remains retained rather than relabeled as coverage of new code.

## Terminal closure review and retest, 04:56 UTC

The previous unsupported cancellation/rejection limitation is resolved by the newly reviewed dedicated path. Native `archive --ff-disposition canceled|rejected --ff-reason ... --ff-decision-ref ...` branches before normal freshness/spec validation and never calls spec promotion. It is an explicit non-acceptance operation, not a general gate bypass. `--skip-specs`/`--no-validate` combinations are refused; ordinary archive flags do not invoke closure. Terminal JSON explicitly includes the disposition and `specsUpdated: false`.

Source review required replacement of an independent terminal lock with the same `archive/.openspec-archive.lock` used by ordinary archive. The final code acquires it exclusively, rechecks source and destination, creates `ff-disposition.json` without replacement, and uses a same-filesystem rename to an absent destination. Existing receipt/destination/lock and symlink paths refuse. Receipt/lock cleanup checks file ownership, and a post-rename lock-cleanup failure states that the change already moved. The receipt records a decision reference, not authenticated approval. No crash-durability or malicious-writer guarantee is inferred.

Reviewer executions on the frozen packaged source b5f69771b907024eddec409bca98ba39ae9cdd9249728c92c09c701a79ab94f0:

- 11/11 terminal probes pass. Both canceled and rejected changes contain unfinished tasks, malformed policy and failed/stale evidence; original archived bytes are identical and current specs remain unchanged. Refusal cases cover ordinary archive, missing reference, ambiguous flags, existing disposition, shared native lock and destination collision.
- Narrow fault injection into the real compiled module: rename EXDEV, rename EIO, and receipt write ENOSPC each fail with the expected fault, retain the original file tree byte-for-byte and remove only owned receipt/lock/new archive state. No copy fallback is used.
- All prior 13 evaluator/native schema probes rerun successfully on this final packaged build. Final source archive/patch/bootstrap checksums match the pin manifest.
- A single upstream update test's generatedBy regex was extended to accept a semver prerelease suffix, matching the explicitly branded FF version. The change is limited to that version-format expectation; it does not suppress a behavioral assertion.

Evidence: reviewer-closure-probes.py, reviewer-close-faults.mjs, reviewer-closure-probes.json, reviewer-probes.json and final-source-pin-review.json. Actual V8 coverage for these tests was collected in the same final-terminal packaged coverage directory as the independent CLI suite. Final complexity report verification follows.

## Final closure and evidence signoff, 04:58 UTC

The terminal-complete packaged snapshot now passes this review. This section supersedes earlier pending statuses and earlier missing-coverage/unsupported-closure limits.

- Independent black-box suite: 125/125 assertions pass. Reviewer probes: 13/13 validity/schema assertions plus 11/11 terminal/fault assertions pass. Affected upstream suites: 457 + 65 = 522 tests pass on the final package.
- Final terminal CRAP report: 71 measured functions across evaluator, terminal closure, first-mutation callback and builder; 0 unmeasured functions, 0 values over 50; maximum 14.9467. Five values exceed the aspirational approximately 10 target. Snapshot module was actually executed and declares no functions. Separately, three changed Python legacy write guards each measure CRAP 1. These scopes do not claim measurement of the entire upstream project.
- Reviewer independently checked all 109 retained V8 subsets against original complete coverage JSON. Every original/subset SHA-256 matches its index, and every retained script object is exactly present in the original: no execution ranges/counts changed. All metric source hashes match current files; terminal source start/end hashes are identical. See reviewer-final-evidence-check.json.
- The broader upstream baseline failures remain explicitly reported, along with packaged-source tests whose assumptions require a Git checkout. No all-upstream-tests-pass claim is made. Affected final regression suites passing does not erase those earlier results.
- Final evidence packaging must preserve this report, its cited reviewer probe JSON/scripts and source/hash verification. Copied scripts were flagged for repository-relative path correction; that packaging correction does not change the frozen runtime source.

Cleared for the authorized work-branch integration and review handoff, subject to preserving these documented limits and final manifest verification. This does not authorize main-branch merge, deployment, release or manufacture user acceptance. Linux runtime/byte-level behavior is established in the stated tests; Windows/native-host behavior, arbitrary-format semantic correctness, authenticated decision references, and universal crash/concurrency safety remain unclaimed.

Packaging verification: copied repository-relative reviewer scripts were independently rerun from the repository at 04:59 UTC; terminal probes remain 11/11 and evaluator/schema probes 13/13. Their output evidence was regenerated before manifest freeze. Portable-path correction is verified.

## Published metadata normalization review, 05:13 UTC

PASS. Publication now uses logical repository-relative source URLs and normalized run/fixture labels. This is an explicitly disclosed metadata transformation, not raw transcript or normalized-byte equality.

Independent verification checked 109 coverage files containing 224 retained script objects against the private raw originals. Original, pre-normalization and normalized SHA-256 values agree with the index. Every retained script field except the declared URL change is unchanged, including function names, offsets, counts and isBlockCoverage. Each logical URL maps to the exact compiled/helper source content hash. Runtime pin metadata and the frozen TypeScript patch remain unchanged.

The reviewer reran the normalized measurement script: all 71 function metric records and the complete summary are identical to the pre-normalization report and the published recalculation. The maximum remains 14.9467 with zero hard failures or unmeasured functions in that declared scope. No unrelated runtime tests were repeated or inferred from this metadata check.

See reviewer-normalization-check.json and COVERAGE-NORMALIZATION.md. Earlier exact-subset statements describe the retained pre-normalization snapshot; published normalized files have their own hashes and are not represented as byte-identical originals. This removes the metadata-publication blocker without changing the prior runtime-review verdict or its limitations.
