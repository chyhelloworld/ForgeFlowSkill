# ForgeFlow 0.7 independent follow-up review

Date: 2026-10-17. Baseline: 130e79e62b45c93bf817505b0907ea6eb91e3a7d plus the inspected uncommitted candidate. Initial findings remain preserved in REVIEW-initial.md and probe-results.json; implementation changes were made by the parent, not this reviewer.

## Three separate conclusions

1. Requirements/mainflow: **PASS for the defined 0.7 increment and observed samples**. Seventeen skills remain; mandatory requirements, purpose/value, observable evidence and assumptions are distinguished; no fabricated acceptance, aggregate score or automatic plan mutation. The read-only evidence summary's independently reproduced omissions are repaired. Four actual agent-run simulated-context examples support the intended boundaries, within the explicit limits below. This is not acceptance of a real user's product or proof of generalized agent reliability.
2. Plan: **PASS for the scoped 0.7 increment**. Stage separation, independent review and version-bound evidence are present. Later 0.8/0.9 work and unresolved 0.6.1 GUI/old-project evidence are not silently accepted by this conclusion.
3. Code: **PASS for reviewed health-summary behavior and Python hard-metric scope; broader metric scope remains NOT_MEASURED**. No remaining correctness blocker found in the inspected changes after repairs. The nine health.py functions have independently reproduced same-run CRAP measurements, all at or below 50. New JS installer helper and the measurement utility itself are outside that function-metric run. Do not state that every changed function or all of 0.7 has a measured CRAP pass. No merge/release/deployment or final human acceptance is authorized by this review.

## Verified repairs and independent tests

- Re-ran 22 independently constructed CLI fixtures, including valid ordinary records, valid bound N/A, valid metric exemption, declared human evidence, stale and unbound N/A, malformed/blank reasons, missing author/next, wrong goal type, absent metric provenance, missing/duplicate function identity, truthy string exemption, malformed containers/rows, NaN, missing human acceptance, stale target/files, CRAP above 50 and exactly 50. All matched intended outcomes. Valid exemptions and the boundary remained accepted; malformed inputs failed closed. Complete inputs/output are in probe-revised-results.json.
- Independently ran 14 installer tests, all passed, including Python cache exclusion and the installed health helper's --help. Reviewed source.mjs diff: cache exclusion applies consistently to skill inventory and skill payload; runtime inventory remains strict. This is a narrow installer safety review, not new JS CRAP measurement.
- Independently executed the current 10 health unit tests under coverage 7.6.1, took a pre-run source hash, and recomputed using the repaired measure utility. Native per-function coverage, AST and Radon mapping contain the same nine health.py functions. Independently obtained metric rows exactly match the parent's final rows. Raw files: pre-run-snapshot.json, coverage-reproduced.json and metrics-reproduced.json.
- New measure.py empty-report failure was found by this review and fixed by the implementer. Empty files now exits unsuccessfully rather than reporting allWithin50=true. No-function and zero-denominator paths explicitly reject. Source snapshot matching is required; report honestly notes that caller must capture it immediately before that exact run. It cannot itself attest historical execution identity.
- Coverage ratio is explicitly combined executable lines plus branches, not basis-path/pure branch coverage. Same-process CLI tests were added and included in the independent rerun, superseding the initial zero-coverage main limitation. Only the latest metrics artifact should be quoted for current numeric results.

## Actual agent experiment inspection

Read original prompts, baseline/fixture source, runtime logs, actual response.md files and the produced design artifact. Independently recomputed all eight full baseline/fixture snapshots including .git, hidden/untracked files, modes, byte sizes and hashes. Each matched its before/after artifact exactly. Verified all twelve frozen skill/reference hashes and compared them to the then-current source; they were identical at inspection time. Any subsequent version-only bump should be described as packaging after these runs, not retroactively as an installed-version experiment.

- Current code versus history: actual retry delay source is linear, and real invocation agrees; response correctly rejects the stale historical exponential claim without changing files.
- Question versus adoption: draft defines 500/1000 ms quiet interval; response answers the +500 ms tradeoff and leaves selection pending. It also correctly notes absent timer cancellation. No fixture file changed.
- Design only: only docs/design/error-states.md changed. Source, configuration, dependencies and untracked local file remained byte/mode-identical. Draft includes concrete error/focus/retry states and labels unverified API/visual/accessibility points. No implementation or visual acceptance claim.
- Human acceptance missing: actual two tests only assert HTML elements. Response explicitly identifies that narrow scope and the missing mainflow, independent review and real-person acceptance. No fixture file changed and no false final completion was claimed.

These were four single samples executed in one actual agent context with isolated fixture directories. The executor authored fixtures and knew the evaluation intent. They are not four fresh/blinded agents, native 0.7 installation runs, browser journey verification, real-user acceptance or a measured general success rate. The report preserves that limitation accurately.

## Evidence interpretation and stopping boundary

Health.py verifies coherent declared metadata and hashes of supplied evidence; it does not parse every raw report to establish numerical truth, authenticate a human/reviewer, prove evidence scope completeness, validate semantics or approve the next action. SOURCES paths/hashes plus tool labels are traceability, not independent authentication. Calling a result RECORDED cannot turn missing real-user acceptance into final PASS. A legitimate automatic-only stage may be recorded without human acceptance, while final acceptance remains separate.

The scoped 0.7 review can be recorded with the explicit NOT_MEASURED scope above and existing inherited limitations. No further code blocker found in this review; any source change beyond version-only metadata requires affected checks to be reconsidered.
