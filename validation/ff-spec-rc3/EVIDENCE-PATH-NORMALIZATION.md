# Published evidence path normalization

Captured reports are normalized copies, not byte-identical raw logs. Original files and the pre-normalization complete bundle are retained outside the published tree. `path-normalization-index.json` records the original and published SHA256 values of each changed evidence file.

Only location strings were transformed:
- `repo:` means this repository root.
- `official:` means the separately built official baseline root.
- `upstream:` means the editable upstream-source checkout.
- `run:` means the enclosing isolated validation workspace.
- `temporary:<fixture-name>` means an isolated temporary directory from that run.
- `runtime:python`, `runtime:codex` and `runtime:home` identify interpreter/runtime locations without exposing their host installation paths.

This transformation covers current rc3 reports and historical example/static logs that still embedded interpreter or temporary paths. It does not change exit codes, assertions, numeric metrics, booleans, result counts, pass/fail conclusions, captured content hashes, or source/build/patch identities. JSON and JSONL structure and non-string scalar values were independently checked against originals. The separate V8 normalization index continues to bind its original range/count records and source hashes; its published coverage records are unchanged by this pass.

Captured commands containing these logical roots document what ran; they are not copy/paste shell commands. Use the documented reproduction scripts with your selected repository, official baseline and output directories. Audit scripts derive this repository from their location (or FF_REPO), require FF_OFFICIAL_ROOT, and use fresh temporary directories. Helper probes use the operating system temporary directory or FF_MEASURE_FIXTURE_ROOT. No cloud-workspace path is required.

The full deliverable list was scanned for host workspace, agent-home and installed-runtime prefixes, including the reviewable patch and textual provenance. No such host prefix remains. Source files inside the immutable official archive are upstream content, not generated execution evidence.

After making the audit scripts portable, the 23-command and 4-store cases were rerun with explicitly selected roots and external output directories; all passed. The normalized coverage recalculation remained identical, and package validation plus all nine static mutation cases passed again. Runtime source, source patch and build identity were not changed by this cleanup.

A final privacy pass also replaced private conversation identifiers in historical user-feedback source descriptions with dated, non-private source descriptions. User requirement facts and public references remain unchanged. Historical package digests remain explicitly historical; their manifests now additionally list hashes of the published redacted descriptions. The immutable official archive was inspected and retained unchanged: its generic workspace-related source references and synthetic cross-platform test paths are public upstream material, not execution-host metadata. See private-metadata-cleanup.json for the scan and hash mapping.
