# Published evidence path normalization

Publication omits host workspace paths. Relevant V8 script URLs use `repo:<repository-relative-source>`; the measurement script maps the `.build` source prefix to the selected rebuilt source root and helper prefix to the selected helper root. Function names, offset ranges, counts and `isBlockCoverage` are exactly the captured values. This is URL/provenance normalization, **not raw byte equality**.

`coverage-subset-index.json` records the original private raw file SHA256, pre-normalization subset SHA256 and published normalized subset SHA256. Original raw files remain outside the published repository. The index does not grant access to raw host files. Independent review compares every retained function/range/count to the original and independently reruns the normalized metrics.

Other published logs and reports replace host repository prefixes with repository-relative paths, external run paths with `test-run/` labels and temporary fixture paths with `test-fixture/`. They are normalized historical evidence, not verbatim terminal transcripts. Commands can be rerun using the portable scripts and fresh fixture directories; these labels do not claim those fixtures exist in the repository.

Runtime TypeScript patch, pinned upstream archive, rebuilt CLI source hashes, and test behavior are unchanged. No passing test or coverage result was fabricated. Earlier exact-subset checks refer to the pre-normalization snapshot; the final normalization check is a separate result.
