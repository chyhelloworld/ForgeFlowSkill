# OpenSpec × ForgeFlow source adaptation (0.5.0-rc3)

This is a small, opt-in patch of upstream OpenSpec 1.14.2, not an independent spec database or an authentication system. The rc3 package is `@forgeflow/ff-spec`, its executable name is `ff-spec`, and its version is `1.14.2-ff.0.5.0-rc3`. User configuration and data use the `ff-spec` namespace; project files remain under the compatible `openspec/` tree. Native `status`, `instructions apply`, `validate` and `archive` share the same validity evaluator. Projects with neither FF policy nor FF receipts keep upstream spec behavior, subject to the rc3 initialization/tool-update restrictions below. Release metadata is not a test result; rc2 evidence does not establish rc3 correctness.

## Rebuild and invoke

Prerequisites: Node >=20.19, npm, Git, and tar in PATH. No global packages or user-computer installation is performed. From this repository:

```sh
node tools/openspec/build.mjs
# Subsequent clean rebuild, deleting only generated .build output:
node tools/openspec/build.mjs --clean
```

The builder verifies the bundled official source archive, patch and bootstrap lock hashes against `upstream.json`, extracts source, applies the TS patch outside enclosing Git path discovery, installs exact local pnpm 10.34.5 using npm lock integrity, installs upstream dependencies with its frozen pnpm lock and lifecycle scripts disabled, then compiles TypeScript. Dependencies are fetched from the npm registry. `--clean` replaces only generated `.build`; `.bootstrap` is an ignored local dependency cache. There is no global install, publish, deployment or main-branch change. Build metadata is `.build/FF-BUILD.json`.

Use the stable launcher from the target project's root. These canonical examples assume this package's `tools/openspec/` directory is in that project:

```sh
node tools/openspec/ff-spec.mjs status --change trial --json
node tools/openspec/ff-spec.mjs instructions apply --change trial --json
node tools/openspec/ff-spec.mjs validate trial --strict --json
node tools/openspec/ff-spec.mjs archive trial --yes --json
```

If this checkout lives in a nested directory or a separate location, replace `tools/openspec/ff-spec.mjs` with its actual relative or absolute path. For example, from `/path/to/YourProject`, run `node /path/to/ForgeFlowSkill/tools/openspec/ff-spec.mjs status --change trial --json`. The current working directory must remain the target project; locating the launcher must not silently switch which project is read or modified. Do not invoke internal build entrypoints or fall back to a globally installed official CLI. A missing build must be rebuilt using the pinned builder first. Archive examples require the real acceptance/decision and write authorization described below; they are not authorization themselves.

## Coexistence with the official CLI

The fork uses package `@forgeflow/ff-spec`, executable `ff-spec`, and the `ff-spec` user configuration/data namespace rather than the official identities. No global package installation or PATH replacement is needed or recommended. Existing official user configuration and tool integrations are not migrated or refreshed by FF initialization.

Initialization requires the explicit command `node tools/openspec/ff-spec.mjs init --tools none`. Other tool selections, including implicit selection, are refused. Even when the project already contains official tool integrations, FF init does not refresh them. The FF `update` command is refused. Install or update the twelve ForgeFlow skills separately under [the authorized installation process](../../INSTALL.md); do not use the upstream tool generator for that purpose.

This separation avoids accidental command/configuration/tool-file collisions, but it is not a security boundary. The official CLI can still read and modify a compatible `openspec/` tree when it has filesystem access, without running this fork's FF gate. Use the launcher consistently for FF-controlled workflows and inspect Git changes. Neither the launcher nor hash gates restrict another filesystem writer's authority.

On Windows use quoted Windows paths and `node`; the builder avoids shell interpolation, invokes npm's JS entry, and uses upstream portable archive code. Git and tar must be installed. Windows execution has **not** been tested in this Linux cloud run. This is repeatable source/dependency reconstruction, not a claim of byte-identical builds on every OS or an independent supply-chain audit.

## Authority and adoption

`openspec/specs/**/spec.md` is the only current spec authority. Native archive applies its deltas. Non-spec artifacts remain in their explicitly named project paths; FF never promotes arbitrary attachments. Git keeps commits, diffs, recovery and history. `ff-artifacts.json` contains review/production references only; it is not another current-content database. The deprecated Python lifecycle tool is read-only; see [migration](../../MIGRATION.md).

Create `openspec/ff-policy.json` explicitly. Every adopted active change then requires `openspec/changes/<change>/ff-artifacts.json`. A receipt without a policy fails closed. Removing both files is an intentional opt-out that ordinary filesystem authority can perform; this policy is not a security boundary against a malicious writer.

Minimal policy:

```json
{"version":1,"artifacts":[
  {"id":"design","paths":["docs/current/design/*.drawio","docs/current/design/*.png"],"requires":[],"reviewRequired":true},
  {"id":"handoff","paths":["docs/current/handoff.md"],"requires":["design"],"reviewRequired":true}
]}
```

IDs are stable logical identities; paths can be changed deliberately without changing identity, but the policy change invalidates old receipts. Paths are project-relative POSIX strings, including on Windows. Exact files and `*`, `**`, `?`, `[]` globs are supported; braces/parentheses, traversal, absolute paths, duplicate scopes, shared file ownership and dependency cycles are rejected. Each declared scope must yield at least one nonempty regular file. Globs detect added/removed/renamed members. Exact paths intentionally register only those files; use a glob for a whole collection. Symlink components are refused; glob scopes conservatively refuse any symlink below their static directory prefix, even an unmatched descendant. Policy and receipt cannot be included in their own artifact file sets. Paths inside the active change are allowed, but naturally move at archive; archived receipts are historical, not subsequently evaluated as active state.

## Capture and review exact versions

After building, inspect hashes without writing or approving anything:

```sh
node tools/openspec/ff-snapshot.mjs /path/to/project trial
```

The output includes raw-byte `policyHash`, resolved-schema `schemaHash`, per-artifact sorted file lists and fingerprints, and reasons. Missing receipt is expected initially. Producer/reviewer explicitly records baselines in the receipt; this tool does not synthesize acceptance.

```json
{"version":1,"policyHash":"<snapshot policyHash>","schemaHash":"<snapshot schemaHash>","artifacts":{
  "design":{"version":"design-v1","fingerprint":"<design fingerprint>","inputs":{},
    "review":{"verdict":"pass","targetId":"design","targetVersion":"design-v1",
      "targetFingerprint":"<design fingerprint>","inputs":{},"reviewer":"explicit reviewer/tool identity",
      "toolVersion":"review-process-v1","evidence":[{"path":"reviews/design-v1.md","sha256":"<evidence SHA256>"}]}},
  "handoff":{"version":"handoff-v1","fingerprint":"<handoff fingerprint>","inputs":{"design":"<design fingerprint>"},
    "review":{"verdict":"pass","targetId":"handoff","targetVersion":"handoff-v1",
      "targetFingerprint":"<handoff fingerprint>","inputs":{"design":"<design fingerprint>"},"reviewer":"explicit reviewer/tool identity",
      "toolVersion":"review-process-v1","evidence":[{"path":"reviews/handoff-v1.md","sha256":"<evidence SHA256>"}]}}
}}
```

Fingerprint formula: `SHA256(JSON.stringify(sorted [{path,sha256}]))`, with file records sorted by path; file SHA256 is over original bytes. Schema hash is SHA256 of JSON serialization of the effective parsed schema. Policy bytes, effective schema, file sets and dependency versions must all agree. A differing `--schema` override is blocked for an adopted change. Dependency maps must exactly match declared dependencies. Review target ID, target version, fingerprint, input map, checker/tool version and nonempty evidence file hashes must match. Any supplied invalid review fails even if reviewRequired is false.

A changed upstream artifact makes its dependents stale transitively, even when intermediate bytes remain unchanged. Re-reading or snapshotting never refreshes records. After a real review, deliberately update its recorded version/inputs/evidence. Format-only changes conservatively trigger re-review too. States are `missing`, `stale`, `needs-review`, `valid`; hash validity does not establish semantic quality, reviewer identity or genuine user approval.

## Native gate behavior

`status --json` and apply instructions expose `ffValidity`; default upstream artifact `done` still means presence, and FF validity separately controls aggregate completion/readiness. Text status names blocked FF reasons. Apply instructions report `state: blocked`; as upstream does, informational instructions may exit zero, so inspect JSON state. `validate` reports error issues. Native `archive` refuses invalid FF state even with `--yes`, `--no-validate` or `--skip-specs`.

Archive checks initially, after prompts before archive-directory creation, and immediately before its first business mutation. It does not repeatedly invalidate itself after legitimately updating canonical specs. Upstream spec fingerprint/rollback safeguards remain in place. No claim is made of a multi-process lock over all FF files or malicious-writer atomicity; use a quiescent working tree, review changes and commit. No generic non-spec promotion is implemented. There is no generic validity override or synthesized 'accepted' status. For explicit non-acceptance closure use the dedicated path below.

## Close canceled or rejected work without promotion

```sh
node tools/openspec/ff-spec.mjs archive trial --ff-disposition canceled --ff-reason "Scope withdrawn" --ff-decision-ref "explicit decision reference" --json
```

`--ff-disposition` accepts only `canceled` or `rejected`; both a nonempty `--ff-reason` and `--ff-decision-ref` are required. A policy or active receipt must exist, although it may be malformed/stale or missing a passing review. This dedicated branch preserves all preexisting artifacts and receipts unchanged, writes a create-only `ff-disposition.json`, and moves the change into the dated archive. It never applies spec deltas, runs a semantic promotion or manufactures acceptance. JSON explicitly returns the disposition and `specsUpdated: false`. The recorded reference is not authenticated authorization; the caller must have actual permission for the decision.

Only flat change names are accepted, consistent with native archive; Unicode names are allowed. Existing date prefixes are retained. The shared archive/.openspec-archive.lock serializes normal archive and terminal close. Existing terminal receipt/destination, unsafe paths and symlinks fail closed. The path only uses same-filesystem atomic rename; EXDEV is refused, with removal of its own newly created receipt and reservation. It does not fall back to copy/delete. Ordinary `--yes`, `--no-validate` and `--skip-specs` cannot invoke it. Combining terminal closure with `--no-validate` or `--skip-specs` is rejected; `--yes` is redundant because this explicit operation does not prompt. A repeated call fails rather than overwrite history. If rename succeeds but lock cleanup fails, the error explicitly names the archived path; do not treat it as an unperformed move. Process-kill/disk failure recovery and crash durability are not claimed transactional across all platforms; inspect any reported rollback error before retrying.

## Provenance, license and evidence

`upstream.json` pins official tag v1.14.2 / commit `f80d860fc510ba4f51180c8ddde35b91b32de657` and archive/patch SHA256. `upstream-v1.14.2.tar.gz` is a full tracked-source Git archive, including upstream tests, schemas, lockfile and license. `forgeflow.patch` is a reviewable TS/source metadata diff. `LICENSE.upstream` preserves OpenSpec Contributors' MIT notice. Dependency packages retain their own licenses in the local installation; this is not blanket legal clearance for dependency redistribution. No node_modules directory is shipped.

See repository validation evidence and the integration report for version-labelled Linux CLI results, full-suite failures reproduced against pristine upstream, coverage/complexity scope and remaining limits. Existing 0.5.0-rc1 and rc2 evidence is historical, not proof that rc3 coexistence has passed. Current rc3 verification must be recorded against the rebuilt rc3 artifacts; see [the rc3 plan](../../planning/openspec-ff-0.5.0-rc3.md).

## Trial-fix protocol v2
The legacy examples above describe protocol v1. New projects may explicitly adopt v2 and the deterministic `receipt snapshot/template/check/record/diagnose` commands through the stable launcher; see [the lifecycle contract](../../docs/maintainers/SPEC-LIFECYCLE.md#v2-试点修复契约094-trial1-本地候选). Installed-project command hints now use `node .forgeflow/ff-spec.mjs`. Developers may still invoke this checkout's actual `tools/openspec/ff-spec.mjs` from the target project. Both target content and evidence are checked before recording; templates never claim pass, old bytes are retained, migrations require a new review and `--migrate`. v1 data are never automatically upgraded.
The builder passes its verified archive basename relative to its own directory, avoiding GNU tar's interpretation of Windows drive letters as remote hosts. `ff-build.mjs` can verify an explicitly supplied build directory for offline reuse; runtime state remains local to each project/worktree.
