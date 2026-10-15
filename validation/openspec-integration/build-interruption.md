The first clean package build's polling call returned:
`write_stdin failed: Unified exec process failed: automatic approval review was cancelled`
No user cancellation/denied install action was reported. The authorized frozen local build was restarted normally; no escalation or alternate access route was used. Subsequent clean reconstruction succeeded. Separately, one exec call returned `exec-server transport disconnected`; a normal retry succeeded.
The builder was corrected during development to set GIT_CEILING_DIRECTORIES to its parent before `git apply`, because Git otherwise silently skipped patches inside the enclosing ForgeFlow checkout. Final build verifies ff-validity.ts exists; final actual CLI E2E checks its behavior and custom version.
