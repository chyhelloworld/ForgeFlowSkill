# 0.5.0-rc3 coexistence evidence

This folder records the rc3 run, separately from historical rc2 evidence in `../openspec-integration/`. The pinned source patch SHA256 is `44099ae1ea94b3a521ab3383616e6b0e8ac0a7be20c697323357a46bd21bb1c9`. No main-branch merge, publication, deployment or global install was performed.

## Implemented contract

- Private package `@forgeflow/ff-spec`, exported bin `ff-spec`, version `1.14.2-ff.0.5.0-rc3`.
- Canonical entry: `node tools/openspec/ff-spec.mjs`, relative to the target project root; if this checkout is elsewhere, substitute its actual launcher path while keeping the target cwd. The launcher never invokes PATH `openspec`, `npx`, or a package-registry fallback.
- Before import, verify package name/version/bin, pinned archive/patch/commit/adapter metadata, and SHA256 inventory of package/bin/dist/schemas. Missing, stale, official or modified builds fail closed. This detects accidental replacement, not a malicious filesystem writer able to replace both verifier and metadata.
- FF global configuration, schema/data and store registry use the separate `ff-spec` namespace; the compatible project `openspec/` data layout remains unchanged.
- `init --tools none` uses a dedicated planning/config-only path. It never invokes upstream integration cleanup, migration or generators. Existing config/schema/tool files are retained. Tool generation, force/profile/Copilot init options and `update` are refused. The hidden `experimental --tool none` alias uses the same safe guard.
- Shell completion is temporarily refused because upstream generators/installers own official `openspec` shell names and files. `version --check` is refused because upstream upgrade advice/flows use official executable layouts; ordinary `version`, `--version` and other read commands remain available. Telemetry and automatic update checks are disabled in the FF entry.
- Explicit command strings in source diagnostics, instruction templates and bundled schema now point to the project launcher. This is a reviewable static source change, not runtime rewriting of user content. `command-replacement-scope.json` lists final source mentions.

## Actual final-build results

- Clean archive + patch + frozen dependency reconstruction: succeeded (`rebuild.log`).
- FF black-box scenarios: 125/125 (`checks.json`, `commands.json`, `e2e-summary.json`), including real launcher execution from a project path with spaces and Unicode.
- Affected upstream archive/workflow regression: 318/318 in four files (`affected-regression.log`). Eight original test cases initially expected old executable hints; `pre-adaptation-diagnostic-assertions.log` preserves those failures. The final source patch changes their expected launcher strings without weakening semantics or modifying the malicious-name injection fixture.
- Additional core probes: 13/13 (`reviewer-probes.json`). Terminal close and fault-injection probes: 11/11 (`reviewer-closure-probes.json`). These are final rc3 reruns, not reused rc2 outcomes.
- Legacy write-retirement tests: 4/4 (`legacy-tests.log`). Guide structure/link checks passed (`guide-check.log`); diagrams retain explicitly historical visual inspection, no new browser-layout claim.
- Static package validation and 9/9 validator/mutation cases passed (`static-package.json`, `static-mutations.json`).
- Final-pin independent coexistence: 23 command cases + 4 store-isolation cases passed with semantic/byte-preservation checks (`RC3-FINAL-REPORT.md`, `rc3-results.json`, `rc3-store-results.json`).
- Coexistence helper/command probes: 26/26 passed (`probe-results.json`). New-code scope: 13/13 functions measured, zero hard CRAP failures, max 11.0905. Existing gate/closure/helper scope: 71/71 measured, zero hard failures. Four build functions overlap; combined unique scope is 80, not 84. Combined maximum CRAP is 14.9467; six functions remain above the approximate target 10 but all meet <=50 (`combined-summary.json`). This is scoped, not whole-upstream coverage. Launcher module coverage is 100%; no invented function CRAP is assigned to module-only logic.
- Coverage normalization retains 133 scoped observations for 10 source files (~1.34 MB), with raw/subset/source hashes. Verification compares 6,808 original function records and raw-vs-normalized metrics (`normalization-verification.json`). Only final pinned-build observations are used, not rc2 or intermediate rc3 coverage. See `REPRODUCE.md` for scope and exact method.

## Reproduce

1. From the repository: `node tools/openspec/build.mjs --clean` after inspecting disposable `.build` output. Requires Node >=20.19, npm, Git and tar; dependencies are installed only into ignored local directories.
2. `NODE_V8_COVERAGE=/absolute/new/coverage python validation/openspec-integration/run_trial.py --cli tools/openspec/ff-spec.mjs --expected-version 1.14.2-ff.0.5.0-rc3 --out /absolute/new/trial`
3. From `tools/openspec/.build`: `node node_modules/vitest/vitest.mjs run test/core/archive.test.ts test/core/validation.archive-preflight.test.ts test/commands/workflow`
4. `NODE_V8_COVERAGE=/absolute/new/coverage python validation/ff-spec-rc3/reviewer-probes.py` and `NODE_V8_COVERAGE=/absolute/new/coverage python validation/ff-spec-rc3/reviewer-closure-probes.py`. These write only isolated fixtures and their named evidence JSON.
5. `python -m unittest discover -s tools -p test_spec_lifecycle.py`; `python tools/validate_package.py .`; `python tools/test_validate_package.py .`.

## Limits

Official OpenSpec can still archive or modify the same compatible `openspec/` tree when deliberately invoked with filesystem access, ignoring FF gates; the independent test demonstrates this boundary. Renaming is collision prevention, not authorization enforcement. User-installed official workflows are not automatically removed or rewritten. Runtime hashes do not authenticate user approval or semantic artifact quality. No real global installation, Windows execution, host skill discovery, full new upstream suite, production deployment, atomic malicious-writer protection or universal OS reproducibility is claimed.
