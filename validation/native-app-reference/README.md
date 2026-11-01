# Optional native App design references — 2026-11-01

Base local landing commit: `589423cb6f05d73c0d905ea8d57ed5df68ac260d` (remote ancestor `38d95e1`). Cloud-only source changes, no desktop/global install, GitHub upload, release or deployment. The landing reference and writing-document content remain unchanged.

## Scope and evidence

Adds optional iOS/Android/native-audit references selected by target OS **and** framework. Flutter/RN cross-platform apps consider both targets. Generic design, brand and scope remain primary. FF adds permission/draft/lifecycle/offline recovery checks. No upstream engine/hooks/live or SDK is installed. Unknown application behavior is not upgraded to observed success.

Frozen N1–N4 prompts and criteria predate candidate edits. Fresh separate agents read the same prompts and their respective ff-design versions; baseline is the previous landing version. Responses are synthetic plans/audits, not application runs. A nonblind independent reviewer compares meaning and evidence, not keyword counts. Single samples cannot establish improvement/stability or actual human acceptance. No fabricated child/person data is used.

## Regression procedure

After final source/evidence changes, regenerate manifest and payload, then run:

- `python -X utf8 tools/installer/pack-release.py`
- `FF_TEST_ROOT=<external fixture dir> node --test tools/installer/tests/*.test.mjs`
- `python -X utf8 -B -m unittest discover -s tools/workflow -p 'test_*.py' -v`
- `python -X utf8 -B tools/validate_package.py .`
- `python -X utf8 -B tools/test_validate_package.py .`

New installer tests verify all four references and transitive MIT license on Codex/Claude layouts, controlled pre-reference upgrade/rollback, landing reference preservation and other skill bytes (normalizing only generated manifest bindings). They are fixtures, not old binary/native host tests. A third test checks pinned source and license hashes. Independent source review found a transitive MIT license omission (ehmo/platform-design-skills); the original license, attribution and pinned blob/hash were added and independently rechecked. Initial targeted command was launched from the parent directory and could not find the test; corrected repository-root run passed. A static pre-pack check showed expected stale manifest mismatches, not a product behavior defect. Final logs are outside the repository in the recovery/test archive to avoid recursively changing the package manifest.

## Limits

No Flutter/iOS/Android build, simulator, physical device, UI screenshot, gesture, screen reader, actual keyboard, permission, lifecycle or performance measurement was performed. No native acceptance, browser-based substitution, current-project compatibility, Windows or automatic skill discovery claim is made. Tests confirm artifact delivery and sampled instruction behavior, not production App correctness.

## Observed results

Independent nonblind behavior review: baseline N1/N2 PARTIAL on explicit OS/framework distinction or reference routing; N3/N4 PASS. Candidate N2/N3/N4 PASS; N1 PARTIAL only because the frozen rubric mentions offline recovery and the answer did not explicitly discuss it. The prompt has no defined network/backend dependency, so this is a bounded coverage caveat, **not** proof of a missing product feature or a reason to invent sync behavior. No factual/unsafe-execution blocker was found. No claim of broad quality superiority, native execution or stability follows from these samples. See behavior-review.md for exact supporting locations and optional pass-with-caveat interpretation of that conditional criterion. No outcome was silently regraded or rewritten.

Source review found the transitive MIT license gap and rechecked it after correction; no remaining source blocker. Final regression at the current source is installer82/82, workflow71 pass/2 existing skips; static/package and mutation results are preserved in external final logs. Runtime and writing-document code, plus the landing reference, are byte-identical to the base. Their previous evidence remains separate and is not relabeled as mobile execution.
