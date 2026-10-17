# Reproduce this candidate

Use a disposable checkout. No global installation, login, deployment or external model CLI is required.

1. Python 3.9+: `python -m unittest discover -s tools/workflow -v`.
2. Node >=20.19: `node --test tools/installer/tests/*.test.mjs` (Windows entries are mocked on Linux).
3. After all report updates: `python tools/installer/pack-release.py`; `python tools/validate_package.py .`; `python tools/test_validate_package.py .`.
4. Optional measured Python scope: install coverage==7.6.1 and radon==6.0.1 into an isolated venv. Capture the SHA256 of each source under skills/ff-review/scripts into a JSON map of repository-relative paths immediately before running coverage.
5. `coverage run --branch --source=skills/ff-review/scripts -m unittest discover -s tools/workflow`; `coverage json -o coverage.json`; `python tools/workflow/measure.py . coverage.json metrics.json source-snapshot.json`.

The last command checks current sources against the supplied pre-run snapshot, not historical execution identity. It rejects missing files/functions, stale source, unsupported native report and ambiguous/nested function mapping. Use native function-level combined line+branch coverage only; don't turn unavailable coverage into an observed zero. Instrumented main() unit tests collect the CLI handler; separate subprocess smoke remains an additional behavioral check.

Live simulated-context outputs are a bounded agent experiment, not deterministic tests. Their full fixture snapshots are delivered separately; report/result alone don't replace original files. No claim of four independent contexts, model-version pinning, billing visibility or human acceptance.
