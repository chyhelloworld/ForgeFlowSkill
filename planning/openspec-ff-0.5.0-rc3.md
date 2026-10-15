# 0.5.0-rc3 CLI coexistence plan and verification scope

Scope: isolate the ForgeFlow CLI entry and user-level configuration/data from official OpenSpec while preserving the compatible project `openspec/` tree and existing FF validity gates. Continue on the existing authorized work branch. No global installation, main-branch merge, release/deployment, paid service, expanded persistent access, or user-computer installation is implied.

## Contract

- Package: `@forgeflow/ff-spec`; executable: `ff-spec`; user configuration/data namespace: `ff-spec`.
- Canonical project-local entry: `node tools/openspec/ff-spec.mjs <subcommand>`, run from the target project root. For an embedded or external ForgeFlow checkout, substitute its actual launcher path without changing the target cwd.
- Initialization requires explicit `init --tools none` and must not refresh existing official tool integrations. FF `update` is refused. Manage the twelve FF skills separately.
- Keep `openspec/specs/` as current spec authority, active changes and review receipts in their existing project paths, and Git history intact.
- Official OpenSpec can still modify a compatible project tree when it has filesystem access. Coexistence is collision prevention, not an authorization or filesystem security boundary.

## Changes and verification

- [x] Align twelve skill entries and lifecycle references with the launcher and coexistence contract.
- [x] Update current README/install/migration/routing/lifecycle/manual/CLI documentation and distinguish rc2 evidence from rc3 results.
- [x] Rebuild the pinned source/patch and verify rc3 package, binary, version, and launcher behavior.
- [x] Test actual launcher commands from a target project, including an external/nested checkout path and spaces in paths.
- [x] Verify official and FF user config/data remain separate and the official command is not replaced.
- [x] Verify init requires `--tools none`, does not refresh existing official integrations, and update refuses before tool-file writes.
- [x] Run affected CLI regression, FF gate/closure negative cases, package integrity/static checks, and independent review against the final rc3 state.
- [x] Record actual outcomes and evidence locations; retain failures and NOT_RUN/BLOCKED scope without relabelling rc2 results.

These checkboxes record this plan's verification state, not user acceptance or publication. The implementation owner must update pending verification only from actual rc3 evidence. Historical rc2 logs and counts remain in `validation/openspec-integration/` and [the integration report](../docs/OpenSpec-FF接入报告.md); they do not establish rc3 correctness. Windows and host discovery/invocation require their own explicit evidence.

Final-build evidence: [rc3 validation](../validation/ff-spec-rc3/README.md). Final patch SHA256: `44099ae1ea94b3a521ab3383616e6b0e8ac0a7be20c697323357a46bd21bb1c9`. Native archive/workflow: 318/318; FF scenarios: 125/125; core probes: 13/13; terminal/fault probes: 11/11.

Final independent coexistence: 23 + 4 checks pass. New helper/command probes: 26/26. Static package and mutation checks: 9/9. Scoped CRAP: 80 unique measured functions, zero unmeasured/hard failures, maximum 14.9467; six above approximate target 10 are explicitly retained. No user acceptance or publication is implied.
