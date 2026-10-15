# rc3 coexistence: scoped complexity and actual V8 coverage

This evidence measures exactly the newly added runtime-verification helpers and launcher, the conservative complete modified build helper, the new safe `InitCommand.execute`, the new rejecting `UpdateCommand.execute`, the changed `getCommandPath`, and the entire CLI `preAction` callback containing the new guard plus its predicate. It does not classify unchanged upstream init/update bodies or the rest of the large CLI as new FF code. Core FF validity/closure is a separate report.

The launcher has only module-level code and no function. Its observed range coverage is reported separately; no function complexity or CRAP is invented for it.

## Formula and limitations

Actual installed ESLint classic complexity is measured from emitted JavaScript AST. Real V8 observations are matched by exact function start and end offsets; class methods use the AST MethodDefinition boundary matching V8, while retaining the function-node ESLint complexity. Union coverage uses the most-specific V8 ranges and conservatively takes the minimum of observed executed byte fraction and executed range-segment fraction.

CRAP = CC² × (1 − coverage)³ + CC. The hard threshold is <= 50; the aspiration is <= 10. This V8 metric is not Istanbul statement or branch coverage, and cannot infer unobserved branch boundaries. A 100% observed range result does not claim all theoretical branches or platforms were tested. The unchanged Windows npm fallback was not executed on this Linux host; that helper remains above the aspiration but below the hard threshold. verifyBuild has CC 11, so even full observed coverage cannot bring its CRAP below 11.

## Reproduction

All four probe/measure/normalize scripts use the same fixture root: FF_MEASURE_FIXTURE_ROOT when supplied, otherwise the `ff-rc3-measure-fixtures` child of Node's `os.tmpdir()`. Set the variable consistently when collecting and measuring copied-helper observations. Helper and command probe reports are written to `helper-probes.json` and `command-probes.json` inside that root; source-copy inclusion still requires exact SHA-256 equality. Existing normalized `repo:` coverage does not depend on a local fixture path.

Run from the repository root after rebuilding the pinned source. These commands write only the selected evidence and isolated test fixtures, except the explicitly shown build command. Use a new empty coverage directory for a new build; do not merge older builds.

    export NODE_V8_COVERAGE="$(mktemp -d)"
    REPORT_DIR="$(mktemp -d)"
    node tools/openspec/build.mjs --clean
    node validation/ff-spec-rc3/probe-rc3-helper-branches.mjs "$PWD/tools/openspec"
    OPENSPEC_TELEMETRY=0 OPENSPEC_NO_UPDATE_CHECK=1 node validation/ff-spec-rc3/probe-rc3-command-branches.mjs "$PWD"
    node validation/ff-spec-rc3/measure-rc3-crap.mjs "$PWD" "$NODE_V8_COVERAGE" "$REPORT_DIR/rc3-repro-raw.json"

The full published observation set also includes the final-only 125-case E2E and the independent coexistence audit. Repeat those documented suites with the same NODE_V8_COVERAGE destination to reproduce their additional observations. The 318 regression tests were run without V8 coverage and do not contribute to this metric.

To recalculate the retained evidence without the private original raw V8 files:

    node validation/ff-spec-rc3/measure-rc3-crap.mjs "$PWD" validation/ff-spec-rc3/coverage-scoped "$REPORT_DIR/rc3-recalculated.json"

The selected source hashes must match the rebuilt files; mismatched source attestations fail rather than silently reuse obsolete coverage. The report also verifies the current source patch hash against the final build marker and checks compiled measured files against marker runtime hashes.

## Provenance and normalization

`coverage-scoped/` contains actual records from the six coexistence-scoped source files and, separately, the legacy FF validity/closure/snapshot modules plus the selected archive beforeFFMutation function. The extra legacy records are retained for the separate existing core measurement script; they do not enlarge the 13-function coexistence result. It retains each module envelope and the exact measured function/method records, excluding unmodified upstream function records, compiler/npm dependencies, and unrelated scripts. Original function names, offset ranges, counts and `isBlockCoverage` flags remain unchanged.

Script URLs are normalized to `repo:<repository-relative-source>`. Isolated helper negative tests import byte-identical copies under a dedicated `/tmp` fixture directory. The source copy SHA-256 is checked before those observations may contribute, and their origin is recorded. These fixture tests exercise valid builds, identity failures, stale metadata, tampered runtime bytes, missing/malformed markers, unsupported symbolic links, and launcher success/failure. Direct command probes exercise the safe initialization path and rejection paths entirely in isolated fixture projects.

`coverage-subset-index.json` records original raw-file SHA-256, pre-normalization subset SHA-256, published normalized subset SHA-256, exact source hashes, and copy origin. Original raw observations are not shipped in the repository. Published data is a normalized selected subset, not a claim of raw byte equality.

`verify-rc3-normalization.mjs` independently checks every retained function record against the original raw record and verifies all three hashes plus the equality of metrics from raw and normalized evidence. Its captured result is `normalization-verification.json`. Re-running that particular comparison requires the original raw directory; recalculating the retained metric does not.

    node validation/ff-spec-rc3/verify-rc3-normalization.mjs "$PWD" "$RAW_COVERAGE_DIR" validation/ff-spec-rc3

No repository source or build artifact was modified by the measurement or probe workers.

Set RAW_COVERAGE_DIR to your retained original raw observation directory for the last verification command. Logical repo:/official:/temporary: paths in captured reports are labels, not directly runnable shell paths. Reproduction commands above use explicitly selected local directories.
