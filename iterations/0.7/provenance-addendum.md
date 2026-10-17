# Agent experiment provenance addendum

2026-10-17 01:10 UTC. This addendum preserves, and narrows, REVIEW-final.md; no original lab report, saved skill or output was altered by this reviewer.

The saved skill-inputs/ff-review/SKILL.md actually declares 0.7.0 while lab REPORT.md/result.json state the initially loaded six skills declared 0.6.1. The saved file's modification time is 01:07:48 UTC, matching result production. A saved file's hash matching result.json and current source establishes the saved artifact identity only. It cannot establish that the exact saved bytes were the agent's earlier inputs. My earlier independent hash verification did not prove historical read identity.

Pending the executor's chronology clarification:

- The four observed behavior conclusions and the eight independently verified fixture/baseline snapshots remain supported: no false adoption, no unauthorized implementation, no false human acceptance, current code correctly distinguished from historical text.
- Attribution to the exact frozen 0.7 skill bytes is **PENDING**, and the saved copies must not be described as pre-execution input snapshots.
- Do not treat these examples as frozen-version or installed-0.7 verification. The source implementation review and independently reproduced health/installer/metric tests are unaffected.
- Requirements/mainflow PASS in REVIEW-final.md remains limited to behavior and source implementation, not a claim that immutable 0.7 skill loading was proven. If exact frozen-version experiment provenance is a required closing criterion, that criterion remains open until a fresh, properly frozen run or sufficient contemporaneous read evidence is obtained.

Executor clarification may resolve whether a version-only change occurred between initial reading and later saving, but an unverified reconstruction must stay labelled as such. No access to restricted historical session data was attempted.
