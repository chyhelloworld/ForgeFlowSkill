# Independent project installer review

Disposition: PASS for the reviewed Linux project-local installer behavior, with explicit limits below. This is not publication, deployment, merge, native-host or Windows approval.

## Plan
The plan is a bounded project installer: 17 skill directories, pinned CLI source and project launcher, explicit full/skills-only mode, ownership manifest, transaction backups, upgrade/rollback and one pending-transaction recovery path. No global installation, MCP setup, persistent-access changes, policy/spec migration or automatic CodeGraph activation was added.

## Defects found and independently retested
- Generated launcher/doctor omitted fileURLToPath import and crashed. Fixed; both public entrypoints now produce the expected skills-only BLOCKED result.
- Failed state commit restored files but orphaned the prepared release and blocked retry. Fixed with integrity-checked release records written before release promotion; injected state-commit failure now restores old files and retry succeeds.
- Escaping symlinks in project-local cache/config descendants were insufficiently guarded. Fixed; an external npm-cache symlink is rejected before external mutation.

- Final rollback hardening independently retested: a tampered historical release is rejected before state changes, so a successful rollback cannot select a known-corrupt retained runtime.

## Actual execution evidence
- Fresh Codex and Claude project directories; exactly 17 installed skills; Unicode and space-containing paths.
- Same-version no-op, unmanaged collision refusal, modified/missing managed file refusal, unrelated user files preserved.
- Host migration and rollback, historical release reuse, explicit full build requirement without disturbing existing state.
- Source checksum tamper and target/cache escaping symlink rejection.
- Actual SIGKILL after eight managed-file commits, retained old state and pending journal, explicit recovery restoring original skill bytes, successful retry upgrade and rollback with user file retained. Upgrade source is an explicitly controlled version fixture, not a released new version.
- Genuine cold-built FF runtime copied to a different Unicode/space project location. Both doctor entrypoints and pinned launcher help succeed; CLI package identity is @forgeflow/ff-spec.
- PATH collision fixture named openspec is never used. Runtime identity tampering fails integrity validation.
- Real init --tools none followed by list --json succeeds in the temporary project. No official tool integration files are generated.
- Public text scan found no actual executor /workspace or /home/agent paths at review time.

## Complexity and coverage review
The inspected report uses ESLint AST cyclomatic complexity and actual V8 ranges, with the documented conservative minimum of byte/range-segment coverage. All six reviewed implementation file hashes match report hashes. Final report: 42 measured functions, zero unmeasured, maximum CRAP 18.0109, zero above 50 and five above target 10. V8 range coverage is not Istanbul statement/branch coverage. The final report includes genuine full-runtime observations; all implementation hashes were rechecked.

## Limits and non-blocking observations
- Native Windows, real Codex/Claude discovery and actual official OpenSpec package coexistence were not tested. PATH collision is a controlled fixture.
- Full dependency build was performed by implementer; reviewer independently exercised its real resulting runtime after copying the complete project.
- SIGKILL recovery was exercised; power-loss/fsync durability is not promised.
- Local doctor is a runtime-health probe; root installer doctor additionally checks installed ownership. Documentation must preserve this distinction.
- Reviewed warm public entrypoints took approximately 1.07–1.29 seconds. Hashing the complete local cache on every launch could be optimized later; it is not a demonstrated blocking issue here.
- The final source manifest/package hash must be regenerated and validated after evidence/document edits. No push, merge, publication or deployment was performed by this reviewer.
