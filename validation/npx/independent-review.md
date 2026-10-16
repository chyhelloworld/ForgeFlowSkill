# Independent npx entry review

Scope: Linux, Node 24/npm 11, actual locally packed npm tarballs. This report does not establish remote GitHub-commit installation, Windows behavior, native host discovery, publication or merge status.

## Verified so far
- Actual npm exec installed the local tgz into a project-scoped npm cache and invoked ff-install through its real node_modules/.bin symbolic link. Claude skills-only installed exactly 17 skills and honestly left CLI gates blocked.
- Outer npm package and embedded source payload were independently expanded. Every manifest member hash matched, outer bootstrap files matched embedded copies, and embedded .gitignore plus nested package-lock.json survived npm filtering. The package has no lifecycle scripts or npm dependencies and is marked private.
- Seven real command invocations covered experimental.4 to experimental.5 skills upgrade, doctor BLOCKED, full-without-build rejection with byte-identical active state, same-source no-op, rollback to the old source and exact managed-file bytes, and recover with no pending transaction. Rollback creates a new transaction record; it does not restore the old transaction ID byte-for-byte.
- The original 13 installer tests and four payload tests were independently rerun: 17 passed, zero skipped. An independent decoder suite exercised 20 accepted/rejected cases including traversal, absolute paths, backslashes, colon paths, links, devices, PAX entries, duplicates, missing/extra members and hash tampering.
- Review found that normal end-of-file could bypass the new double-zero tar terminator check. The implementation was corrected and a regression test added. No unresolved path-escape finding remains in the reviewed decoder.
- The inspected measured CRAP report covers 52 functions with zero unmeasured, maximum 18.0109, zero over 50 and five legacy functions over target 10. All eight implementation hashes match the report; new bootstrap functions meet target 10. Coverage is real V8-range coverage, not Istanbul branch/statement coverage.

## Boundaries
- Explicit project-local --cache bounds the tested npm cache. npm/Git/system default behavior is not a promise of zero HOME or external writes.
- Embedded hashes detect corruption; source identity still depends on the trusted repository and exact commit, not a signature embedded beside the payload.
- A floating main example is not a reproducibility guarantee. Record and verify the actual full commit SHA separately.
- Full cold build through actual npm exec succeeded on the authorized same-target retry: locked dependencies downloaded and TypeScript compiled, returning INSTALLED. The corrected-decoder package then returned READY through actual npm exec doctor; project-local doctor and pinned launcher help also exited successfully. Package hashes are recorded in independent-full.json. Initial interrupted download was not counted as a pass. Full build used the earlier code-candidate payload; the subsequent decoder-only correction and final documentation bytes are separate snapshots, not falsely claimed as the same tarball.
- Final delivered zip/tgz bytes must be rescanned after the last documentation and evidence edits. Earlier recursive scan found only public upstream fixture paths/IDs, scanner constants and a generic path mentioned in a historical report; no confirmed private session value.
