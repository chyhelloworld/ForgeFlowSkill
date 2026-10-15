# Independent cloud trial plan
Planned before inspecting implementation or authored evaluation expected outcomes.

Use one real Python standard-library project: local CLI stores personal technical blog posts and product introductions in JSON. No network deployment or external dependencies. All product approvals in this trial are explicitly SIMULATED fixtures; the real user authorized testing the workflow, not accepting this fictional product.

1. Baseline v1: create draft, publish, list published posts; subprocess tests prove persistent storage across processes.
2. Open active change A for search. Open parallel change B against same v1. Implement and test A.
3. Simulate an interrupting requirement: exclude draft posts from search by default and require explicit --include-drafts. Record the proposal, then separate simulated explicit confirmation. Re-run genuinely changed code/tests.
4. Previously captured test evidence and acceptance must not qualify after changed requirements. Attempt promotion with stale evidence; expect no current-spec write.
5. Refresh tests/evidence and simulated acceptance, promote A. Attempt B against stale v1; expect rejection, full current-spec byte equality before/after.
6. Launch actual fresh-context receiver agent, giving only project path and checkpoint path, no prior conversation. It must identify current goal and continue by running relevant tests.
7. Archive promoted A with durable rationale. Open and cancel C, archive it; compare current spec bytes before/after cancellation and archive.
8. Report actual failures and fixes, versions, commands and artifact hashes. Scope is one cloud trial, not longitudinal confidence.
