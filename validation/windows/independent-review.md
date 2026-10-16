# Independent review: experimental.6 Windows fixes

Disposition: PASS for the reviewed Linux candidate and explicitly simulated Windows branches. Final delivered artifact bytes are checked separately after packaging.

## Scope and source review
- Reviewed the native Windows windows-test.2 handoff as historical evidence. That handoff does not prove experimental.6, whose bootstrap cleanup ownership changed.
- Windows alone adds pnpm --node-linker=hoisted; frozen-lockfile and ignore-scripts remain. Linux/macOS command branches retain their existing linker behavior.
- Windows alone supplies an always-true fs.cpSync filter, forcing per-entry copying without filtering out source content. The Chinese/space-path regression asserts that the actual upstream.json runtime file exists.
- Standalone build does not delete bootstrap. Installer cleanup is created for an exclusively new stage, bound by closure to its path and original filesystem identity. Preparation refuses pre-existing bootstrap. Successful full build and CLI probe precede cleanup; cleanup precedes strict release inventory.
- Bootstrap root and ancestor links are refused. Nested links are unlinked without traversing their targets. Existing runtime link checks were not weakened. Existing source, sibling stage, retained release and user-owned directory data are outside the cleanup capability.

## Independent execution
- All 29 Node tests passed with zero skips on Linux, including the original installer/payload suite and 12 Windows-branch safety tests. Platform simulation is explicitly not native Windows validation.
- Eight separately authored filesystem cases passed: fresh generated bootstrap removal while preserving outside link targets and sibling files; pre-existing bootstrap refusal; Linux no-op; root-link refusal; regular-file refusal; replaced-stage identity refusal; ancestor-link refusal; missing-bootstrap no-op.
- Package static validator passed with no errors.
- Actual npx local-tarball entry installed 17 Codex skills in a Chinese/space project. Subsequent actual npx commands covered doctor BLOCKED, full-without-build refusal without active-state changes, no-op reinstall, host migration, rollback restoring exact managed bytes, and recover with no pending transaction. Copied upstream.json and .gitignore exist, and transient unpack source directories were cleaned.

- Maintainer completed an actual npm-exec full cold build with 239 locked dependencies. Reviewer independently ran actual npx doctor (READY), project-local doctor and pinned launcher help, all exiting successfully. Linux bootstrap remained intact, confirming the cleanup did not expand to Linux. Exact tested tarball and installed manifest hashes are in independent-full.json.

## Measurement and boundaries
- Review identified that the initial CRAP measurement list omitted the changed standalone builder; this was corrected. The final report covers 62 measured functions across nine production files, zero unmeasured, maximum CRAP 18.0109 and zero above 50. Six functions exceed target 10, including the pre-existing builder npm helper at 10.2007. Newly added cleanup functions have maximum CRAP 4. All nine current source hashes match the measured report. Coverage is actual V8 range coverage, not Istanbul branch/statement coverage.
- Fixed remote commit transport, the final experimental.6 Windows install, real model task execution and Claude host invocation are not established by these Linux results.
- Full build and final zip/tgz byte verification must be associated with their actual hashes. Documentation/evidence repacking changes source manifest identity even when production code is unchanged.
