# Fixed-input replay: final independent addendum

2026-10-17 01:13 UTC. Scope: ff07-agent-lab/replay/. This adds a new conclusion without changing the original flawed-provenance experiment, CORRECTION.md, prior review or provenance warning.

## Decision

**PASS for four bounded behavior scenarios with declared, frozen 0.7.0 inputs.** This closes the earlier exact-input ambiguity for the new replay only. It does not retroactively repair original-run attribution, turn two same-agent runs into independent samples, or prove a causal effect of the skill rules.

The stronger evidence is: a manifest and fixed copies were created before the replay responses; the parent notified this reviewer of the existing replay manifest while work was underway; the executor records actual fixed-copy read calls (chunks 9606d0 and e58ffe), followed by response/design execution (ae1e1d); final copies and output remain bound to that manifest. In the original run the saved copies were created only after behavior execution from mutable source. That critical ordering defect no longer applies to this replay's documented process.

Independent artifact checks performed here: all 12 fixed files match manifest hashes; all 6 SKILL.md frontmatters declare 0.7.0; all 8 before/after full-file snapshots match actual baseline/replay trees and result tree hashes; all 4 response files exactly match result.json. Reproduction: verify_replay.py, with output replay-verification.json. Read the actual design deliverable and original task prompts/source; the sole fixture mutation is the permitted design document, while code/config/dependency/untracked-file hashes are preserved.

Observed behavior remains correct within each sample: current linear retry behavior is not replaced by historical exponential claims; a question about 1000 ms is not treated as adoption; design-only request changes only the design artifact; passing two HTML-marker tests is not misrepresented as real-person acceptance, end-to-end validation or final completion.

## What this does and does not establish

The file hashes, version values, exact response equality and full-tree comparisons above were independently computed by this reviewer. The actual read-call chronology is the executor's recorded execution evidence plus the parent's contemporaneous manifest notification; this reviewer did not retrieve a separate trusted host transcript and does not claim cryptographic attestation of model attention or identity. No restricted session files were accessed.

This is a stronger reproducible association between specified 0.7.0 input bytes and the replay than the original after-the-fact copy. It is not a randomized causal experiment. The same agent created fixtures, knew expected behavior, performed the original run and replayed in its existing context. Four filesystem directories are not four independent model contexts. There is one replay per scenario, no statistical reliability result, no native installed-0.7 integration validation, no full browser journey and no real-human acceptance.

A minor copied limitation in replay/result.json says skills were read from source paths; the new process says frozen copies. Parent notified to correct that wording. This wording cleanup does not alter hashes, responses or the behavioral decision.

The earlier scoped 0.7 source/plan/health-code conclusions stand with this new replay evidence. CRAP completeness remains limited to the nine measured Python health functions; unmeasured added JS/helper scope remains NOT_MEASURED. Neither RECORDED nor this bounded independent review provides final user acceptance or authority for merge/release/deployment.
