# Resume checkpoint

Goal: a local personal publishing CLI for technical posts and product introductions. Persistent JSON storage, explicit draft→publish flow, published-only list, case-insensitive search over title/body. Ordinary search must hide drafts; --include-drafts is explicit opt-in. No website deployment, network services, main-branch merge or paid dependencies.

Source of current truth: .forgeflow/spec-state.json current version 2. CHG-SEARCH version 2 was promoted and archived; its rationale records the interrupting privacy requirement. CHG-PARALLEL was rejected as stale baseline and archived; CHG-CANCEL was canceled and archived. All confirmation/acceptance references prefixed SIMULATED are fixtures, not human acceptance.

Files: blog.py; test_blog.py. Run python -m unittest -v in this directory. CLI: python blog.py --db PATH create TITLE BODY [--kind technical|product]; publish ID; list; search QUERY [--include-drafts]. CLI is one narrow local trial, not production hardened.

Next step: independently recover the current goal from this checkpoint and project files; verify state matches, execute tests and a manual real persistence/search journey. Save HANDOFF_RECEIVER_REPORT.md here with commands, results, and any inconsistency. Do not modify current spec or promote anything. Approval fixtures confer no deployment authority.

Acceptance receipts now structurally bind change_id, change_version, baseline_version and evidence_version; they still do not authenticate people. Archived CHG-SEARCH has the new SIMULATED v2 receipt and a history entry retaining invalidated v1 evidence/receipt. Verify this data when resuming.

Evidence ref #sha256-code digest recipe: SHA-256 of blog.py raw bytes concatenated with test_blog.py raw bytes, in that order. It is not a single-file digest.
