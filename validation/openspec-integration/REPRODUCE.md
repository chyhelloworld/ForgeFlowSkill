# Reproduce OpenSpec/FF validation

From the ForgeFlowSkill repository, use Node >=20.19, npm, Git, tar, Python 3 and PyYAML for package checks.

1. `node tools/openspec/build.mjs` (or inspect existing `.build`, then `--clean`). This is a pinned local source rebuild; no global installation.
2. `NODE_V8_COVERAGE=/absolute/path/coverage python validation/openspec-integration/run_trial.py --help` gives portable black-box arguments. Supply the built CLI and a fresh output directory. Test fixtures are synthetic; passing receipts are not real user decisions.
3. Run `node tools/openspec/.build/node_modules/vitest/vitest.mjs run` with cwd `tools/openspec/.build` for upstream regressions. The source archive lacks `.git`; three version-info tests explicitly assume a Git checkout, so those artifact-layout failures are recorded separately. In this cloud environment 19 Git/store failures also reproduce against unmodified upstream.
4. `node validation/openspec-integration/measure-ff-crap.mjs /absolute/path/coverage /absolute/path/result.json` measures the built evaluator, closure and first-mutation guard. The script reads the built project's installed ESLint and V8 execution ranges; preserve start/end source hashes alongside results. It reports missing coverage honestly.
5. `python -m unittest discover -s tools -p 'test_spec_lifecycle.py'` tests legacy write retirement. `python tools/test_validate_package.py .` executes the nine static validator/mutation cases. `python tools/validate_package.py .` checks manifest and 12-skill structure.

Evidence is scoped: byte preservation and SHA bindings are not semantic/visual validation, authenticated approval, Windows execution or malicious-writer race proof. Build and terminal closure do not grant permission to merge main, release, deploy or expand access.

Published coverage uses normalized `repo:` source URLs; the measurement script resolves these against the selected build/helper roots. See COVERAGE-NORMALIZATION.md for the exact transformation and raw-vs-normalized evidence distinction.
