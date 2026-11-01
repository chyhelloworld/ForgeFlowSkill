# Optional landing-page reference validation (2026-11-01)

Base: `38d95e11681edc1320c325d825e0d1ceba3731d6`. Scope: source-only, optional marketing-page method; no new runtime, skill count, global style or native App flow changes. The frozen cases and rubric predate candidate edits. Independent agents generated baseline/candidate responses against the same brief; the reviewer read both outputs and was not blinded. Synthetic outline approval is a test input, not user acceptance.

## Behavioral result

See `behavior-review.md` and `independent-review.md`. Both baseline and candidate satisfy the four observed text/source cases. This demonstrates no detected regression in these samples, **not** superiority, stability, aesthetics, conversion or business results. Baseline already passes. The HTML samples are minimal offline examples, not deployed products. Missing proof is not invented, the backend control stays nonmarketing, and a typo stays a local edit.

## Regression procedure

Run from repository root after generating the manifest/payload:

```sh
python -X utf8 tools/installer/pack-release.py
FF_TEST_ROOT=/absolute/external/fixture-directory node --test tools/installer/tests/*.test.mjs
python -X utf8 -B -m unittest discover -s tools/workflow -p 'test_*.py' -v
python -X utf8 -B tools/validate_package.py .
python -X utf8 -B tools/test_validate_package.py .
```

The new installer tests cover dual-host reference/license delivery and a controlled prior-layout upgrade/rollback. This fixture is not a historical binary or live Codex/Claude host execution. Unselected installed bytes are compared with only generated manifest source-hash bindings normalized. Existing runtime and writing-document source are unchanged. Final command logs and exit codes are in the separate recovery/test archive so recording them cannot invalidate this package's manifest.

During harness preparation the new fixture first omitted installer files, then compared generated manifest bindings as ordinary unchanged bytes; both test assumptions were corrected and the targeted tests rerun. A pre-pack full run also exposed the stale embedded payload/manifest mismatch. A subsequent broad run omitted the existing suites’ required FF_TEST_ROOT; rerun uses an explicit external fixture directory. These are disclosed setup failures, not invented product-red TDD evidence. Final regression must use a freshly generated payload.

## Explicit limitations

Normal sandboxed Chromium failed to launch (socket permission / SIGABRT). The official cloud browser rejected `file://` navigation under its HTTP(S)-only policy. No bypass or sandbox reduction was attempted. Browser rendering, computed contrast, keyboard/touch operation, real mobile layout and real-user acceptance remain **NOT VERIFIED**. Static HTML structure/media rules do not prove these qualities. No Windows installation, production backend, remote push, merge or deployment was performed.
