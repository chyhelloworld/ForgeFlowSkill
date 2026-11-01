# Independent native-reference source review

Date: 2026-11-01. Baseline: `589423cb6f05d73c0d905ea8d57ed5df68ac260d`. Reviewed the working-tree diff, four candidate references, routing/user documentation, provenance snapshots and manifest, existing license notices, and new installer test source. This is a source review, not native execution or behavioral acceptance.

## Initial finding — resolved on re-review

**R1 — upstream-of-upstream MIT text is not preserved (at initial review).** `skills/ff-design/NOTICE-IMPECCABLE.md` explicitly identifies `ios.md` and `android.md` as derived from ehmo/platform-design-skills under MIT. The new references now directly adapt those files and the provenance directory redistributes their complete Impeccable versions. The skill carries the Impeccable Apache license but no platform-design-skills MIT text/copyright. Existing MIT files name unrelated Elaya and Leonxlnx and do not close that chain. Preserve the platform-design-skills MIT license with verifiable provenance and link its relationship from the native-source manifest/notice; include it in installed payloads. This is a conservative attribution/release-readiness finding, not a legal clearance determination.

Checked the [upstream license](https://raw.githubusercontent.com/ehmo/platform-design-skills/main/LICENSE): it is MIT, with a 2026 copyright line and an inclusion condition for copyright/permission notices. That URL is mutable; the implementation should pin a revision and hash rather than treating this live lookup as historical provenance.

## No additional blocking source defect identified

- Target OS and implementation framework are separate; Flutter/RN dual targets load both OS references. Mixed repositories and typo-only changes are explicitly bounded.
- Existing brands, shared themes, and local-change scope are preserved. No forced SF/Roboto, icon replacement, or new design-system runtime.
- Source/design/browser/simulator/device evidence remain distinct. No automatic native acceptance, fabricated aggregate health score, or browser-as-native substitute.
- Permissions, background recording/interruption, drafts, and offline/retry checks are clearly FF additions and conditional on product scope; undeclared synchronization/background-recording features are not silently authorized.
- The Flutter table is explicitly a lookup guide, not pasteable API code. Its `PopScope` caveat agrees with the [official API documentation](https://api.flutter.dev/flutter/widgets/PopScope-class.html), including absent Cupertino gesture callbacks when `canPop` is false. No concrete false API instruction found.
- No engine/hooks/live execution, installation, user-device change, automatic repair, branch merge, or deployment is introduced by the candidate instructions.
- All three source snapshot SHA-256 values match `native-app-design-sources.json`.
- Read-only local link check across routing, affected docs, skill-level Markdown and four new references checked 85 relative links: none broken. Verbatim provenance snapshots retain upstream-relative links; they are archival source, not operative FF reference routes.

## Test coverage / evidence limits

The two new installer tests cover two temporary host layouts, unchanged 21-skill count, exact new reference bytes, other-skill/landing-reference preservation, rollback hashes, and removal of added files. The old-layout fixture accurately discloses that it is synthetic, not the historical baseline installer. No installer code was executed by this reviewer.

The missing-license installer assertion was added in the repair. Remaining nonblocking improvement: automate native-source hash validation. The general package validator currently checks `provenance/sources.json`, not this new native-source manifest. The new installer tests cannot establish behavior routing, brand preservation, or evidence discipline; those require the separately assigned evaluator, not keyword tests or installer success.

## Independence disclosure

A combined source-inspection command accidentally printed `baseline.md` behavior outputs while loading criteria. No candidate behavior outputs were read; no behavior scoring or baseline-versus-candidate judgment is made here. This report is restricted to source, provenance, license packaging and test-source review.


## Repair verification (2026-11-01 14:33 UTC)

**R1 resolved; no outstanding blocking source-review findings.** Re-read the repaired notice, native source manifest, license, and installer test source:

- `LICENSE-PLATFORM-DESIGN-SKILLS` preserves the official MIT text and copyright verbatim. Local Git blob is `14fac913ccf80234b1848540089a3bbcb6e5283d`; SHA-256 is `1126322e2cc8d165adc4c792eeb195717de2bcc7b39be1ce77959d78e87ef685`, both matching the new provenance record.
- NOTICE links the included license and explains the transitive derivation. Provenance honestly distinguishes the pinned license blob read from `main` from the unknown source revision used by Impeccable. No historical derivation revision is invented.
- Installer test `added` now includes this license, covering exact bytes on both hosts, upgrade presence and rollback removal alongside the references. Parent reports both tests passing; this reviewer verified assertions but did not independently rerun them.
- Recomputed hashes of all three corrected raw snapshots match the current manifest. The prior newline-normalized snapshots have been replaced; no claim of independent remote Git-blob authentication is made by this review.

No candidate behavior outputs were inspected during repair verification; no behavioral score is assigned.
