# Specification lifecycle, schema 1

When an authorized project adopts persisted lifecycle tracking, its current valid specification, active change deltas and archived history are distinct views of one engineering record: `.forgeflow/spec-state.json`. It is the only authoritative state; prose PRDs, plans, diagrams and handoffs cite its version and stable requirement IDs rather than becoming competing baselines. The tool is `tools/spec_lifecycle.py` in the distribution; Python standard library only. No OpenSpec installation or CLI is needed.

## Proportional use and authority

A tiny fix needs one requirement, one old/new delta, one linked task and one meaningful check; these may remain an inline equivalent record when no persisted lifecycle has been adopted. Do not require a new JSON file or invent a ceremony or twelve new documents. The CLI operates only on adopted persisted snapshots. Reuse existing IDs; additions use a new stable ID, deletions preserve the ID in history. Current requirements describe accepted behavior; implementation observations and proposed wishes must not overwrite them. An initial baseline must be established from independently confirmed scope; this tool does not manufacture that confirmation.

Record Mode 0 prohibits persisting the full conversation or Grill transcript. It does not cancel independently authorized engineering specifications, plans, code or evidence. Store concise decision references, not chat dumps or secrets. If engineering-state persistence itself lacks authority, keep the proposal in conversation and ask before writing.

## Shape and lifecycle

State: `schema_version: 1`, `current: {version: positive integer, requirements: {REQ-ID: {text: string}}}`, `active: {CHG-ID: change}`, `archived: {CHG-ID: change}`. IDs are stable ASCII identifiers, beginning with a letter. One JSON snapshot avoids a baseline update succeeding while an archive move fails.

Each change has a positive `baseline_version` and `version`, `status`, nonempty `delta`, `tasks`, and `evidence`. Each delta has `requirement_id`, explicit `old` and `new` requirement objects (null means absent), `why`, and `confirmation_ref` pointing to the actual confirmation of changed scope. Old values must match current exactly. Each task has `id`, `requirement_ids`, and `change_version`; every affected requirement must have a task. Evidence additionally has `ref` and `result: pass|fail`. Linked IDs must be affected IDs. All task/evidence versions must equal the change version. Increment change version whenever requirements or acceptance scope change; invalidate old evidence and refresh/review linked tasks before claiming verification. The tool checks consistency of the snapshot, not tamper-proof history.

- `proposed`: confirmed scope delta, work not started. Unconfirmed ideas remain outside this actionable delta until confirmation exists.
- `implementing`: executing authorized work; not proof or acceptance.
- `verified`: actual objective checks cover every affected requirement, all supplied evidence passes for this exact version. Preserve failing or superseded evidence and acceptance in an optional change.history array of {version, reason, evidence, acceptance} snapshots before replacing active evidence/acceptance; do not silently erase or relabel results. History is explanatory, never active proof; the tool does not semantically validate historical snapshots.
- `accepted`: genuine acceptance for the specific verified change is established independently; only explicit apply promotes current and increments its version. Acceptance does not authorize merging main, publishing, deploying, spending or security changes.
- `canceled` / `rejected`: terminal decisions that may be archived without changing current.

Archive is a location, not an acceptance state. Only accepted/canceled/rejected changes can archive. An accepted record retains `acceptance_ref` and `applied_version`; an archived rejected record remains rejected. Archive never applies deltas.

## Commands and failures

`python tools/spec_lifecycle.py validate PROJECT` reads state and reports structural errors without writes. `python tools/spec_lifecycle.py apply PROJECT CHG-ID --acceptance-ref REF` accepts/promotes a verified change only after the caller has checked real acceptance and action authority. Before apply, record change.acceptance = {ref, change_id, change_version, baseline_version, evidence_version} from that actual acceptance; all versions are positive integers bound to the exact change and evidence revision, the ID matches CHG-ID, and ref matches the CLI argument. Missing or stale receipts reject without mutation. A caller must not relabel an old receipt to make it pass: the tool checks binding, not authenticity. The receipt is optional before acceptance; accepted records retain it alongside acceptance_ref. `python tools/spec_lifecycle.py archive PROJECT CHG-ID --reason TEXT` moves a terminal record to history without changing current. JSON output contains `passed`, `action`, `errors`, `limits`; return code 0 means structural success and 1 failure. No init command or automatic approval lookup is implied.

Baseline versions and old values must match for active proposed/implementing/verified changes. After one change applies, concurrent drafts become stale even if non-overlapping: explicitly reconcile old/new values, baseline version and task/evidence versions, and re-run affected checks; never silently force or auto-rebase. Validate can report other stale drafts after a successful promotion. Mutations check the selected change rather than blocking terminal archival on an unrelated stale draft.

Explicit project path must be an existing directory without symlink ancestors; `.forgeflow` and state cannot be symlinks. Mutation uses an exclusive `.spec.lock` and a same-directory fsynced temporary file with atomic replacement. Conflicts do not alter state; pre-existing locks refuse concurrent writes. Interrupted processes may leave a lock; inspect before authorized removal. This is cooperative single-project locking, not defense against a malicious concurrent filesystem writer. Do not hand-edit concurrently, use unsafe shared paths, or infer distributed transaction guarantees.

The validator does not execute evidence, verify its truth, authenticate references, reconstruct historical edits, or grant permission. A JSON status, passing test, or CLI reference is never user acceptance by itself. Real product main-flow tests, independent review, and measured function-level CRAP <= 50 requirements remain in force; missing measurements stay explicitly unmeasured. Package checks and simulated skill cases are separate from actual product behavior and native installation.

## Stage responsibilities

Intake reads current and active state before routing. Spec owns versioned old/new deltas and confirmation references. Plan links tasks to affected requirement IDs and the exact change version. Implement follows that scope and invalidates evidence after a scope change. Review checks old/new consistency, coverage and genuine evidence; verification is not acceptance. Deliver promotes only after independently established explicit acceptance, archives terminal decisions separately, and reports unresolved/stale records. Handoff names current version, active change/version/status, requirement IDs, linked tasks and evidence, pending acceptance and next verification; a new model must reread the state.

## Attribution

Concepts adapted from OpenSpec's current specifications, change deltas and archival workflow; no upstream code copied and no runtime dependency added. Official references: https://github.com/Fission-AI/OpenSpec/blob/main/docs/concepts.md , https://github.com/Fission-AI/OpenSpec/blob/main/docs/workflows.md , https://github.com/Fission-AI/OpenSpec/blob/main/docs/cli.md . Existing source licenses/notices remain unchanged.
