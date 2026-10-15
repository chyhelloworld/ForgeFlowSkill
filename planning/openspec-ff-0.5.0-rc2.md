# 0.5.0-rc2 OpenSpec integration plan and outcome

User-confirmed scope: continue OpenSpec CLI adaptation on the existing 0.5.0 work branch. Main merge, deployment, paid services, persistent access changes and local-computer installation remain outside this work.

- [x] Pin official 1.14.2 full source and retain license/integrity.
- [x] Define opt-in policy, stable artifact paths/file sets, schema/dependency/review version bindings.
- [x] Implement shared native status/apply/validate/archive gate; default opt-out preserved.
- [x] Add bounded explicit canceled/rejected close with no spec promotion and unchanged failed evidence.
- [x] Deprecate legacy spec-state mutations; safe explicit migration and one current spec authority.
- [x] Update 12 skills, docs, manual and diagrams without another mandatory phase.
- [x] Rebuild from bundled source+patch with pinned local dependencies.
- [x] Run actual CLI E2E, fault injection, regression comparison and actual scoped complexity/coverage measurements.
- [ ] Coordinated work-branch commit/push and remote verification by publisher after final independent review.

Final implementation evidence and explicit limitations: [Chinese integration report](../docs/OpenSpec-FF接入报告.md). Publication status must be verified remotely; this file does not assert merge, deployment or user acceptance.
