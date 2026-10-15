# Independent black-box case plan (fixed before implementation)

Date: 2026-10-15. Execute rebuilt OpenSpec 1.14.2 CLI on isolated cloud Linux fixtures. Author owns implementation. Tester owns fixtures, probes and evidence. No install or remote upload.

## Required outcomes

1. Default CLI without FF policy: init/new/status/instructions/validate/archive retain upstream behavior; rejected prose review remains non-gating by default.
2. Explicit project FF policy and change manifest: status, apply instructions, validate and native archive consume the same fail-closed evaluation. `archive --yes`, `--no-validate`, `--skip-specs` (if supported) never bypass FF policy.
3. Exactly 12 artifact identities spanning Markdown proposal/spec/tasks/design/review/handoff/plan and draw.io/SVG/PNG/HTML/JSON. Chinese and spaces in project and artifact paths. Content bytes and relative filenames bind fingerprints, not timestamps alone.
4. Two successive upstream edits invalidate direct and transitive downstream receipts. No new review after edit means archive rejects. Explicit rereview after restoring correct bindings re-enables archive. Graph freshness is not semantic correctness or user acceptance.
5. Missing review, rejected review, empty review, stale target hash, missing manifest, malformed manifest, baseline/current mismatch and policy-required artifact omission each fail closed, with pre/post file-tree hashes equal.
6. Multifile artifact: add/delete/rename detected through changed path+byte set. Test rename only to supported extent, no claim of semantic rename tracking.
7. Canonical pointer resolves existing authoritative current content. No duplicate state database or implicit generic-artifact promotion. External current modification is detected by baseline comparison.
8. Valid native archive preserves all change artifact bytes and history, updates standard OpenSpec spec current where configured. Compare exact SHA256 sets.
9. Git commits preserve two edits; restore from first committed snapshot into isolated clone and compare hashes. Attribute Git restoration to Git.
10. Portable script accepts executable and output path, records full commands/cwd/exit/stdout/stderr and checks. Never claims Windows, concurrent-write atomicity, model adherence, semantic review, product acceptance or remote deployment from this Linux run.

Fresh-context FF skill handoff will be coordinated with parent separately when implementation docs are ready. Test findings must be reported to author, not patched by tester.

## Delivery-blocking compatibility regression added before terminal implementation

An explicitly canceled/rejected, incomplete change must be closeable without promoting current specs. For each disposition, exercise real native archive with the announced explicit API and a synthetic decision reference. Retain missing/rejected/stale review evidence without rewriting it to pass. Compare every preexisting archived file byte and canonical current spec tree. Missing decision or reason must reject without writes; ordinary archive must still reject the same incomplete fixture; a repeated close must reject without mutation. These synthetic terminal decisions are test-only, not user approval or acceptance. Previous 85/85 belongs to the pre-terminal candidate and will not be claimed as final-code coverage.
