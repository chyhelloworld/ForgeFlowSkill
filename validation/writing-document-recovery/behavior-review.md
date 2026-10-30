# Candidate and baseline observational review

Candidate source: candidate/responses.md
Baseline source: baseline/conversations.md
Conditions: same user prompts; candidate supplied ff-writing-document, baseline default assistant without a writing skill. Single-run, nonblind observation, not controlled statistical improvement and not comparison to exact old ff-writing-shape. No Word or other document files generated.

## Case A — PASS (observed turns/content)
Source: Candidate Case A / Turn 1 Answer; Turn 2 Answer §§1–6.
- Turn 1 provides only six headings with one scope sentence each and explicitly waits for confirmation. It reuses known audience/purpose/materials instead of redundant questions.
- Turn 2 follows the confirmed outline. Role/entry diagram answers who uses which device, rather than presenting unrelated technical architecture.
- Compatibility remains untested (§4); tag-reader-to-phone mapping remains subject to verification (§3.2). 20–30 person-days remain an estimate, not elapsed delivery days (§5.1). Price is a formula pending supplied unit rate; capacity is not invented (§5.2–5.3).
- Public fields, permissions, exception behavior are marked unconfirmed rather than silently promised. Physical-device/cloud fees are explicitly not folded into an unsupported total.
- Separator and final delivery note state no Word generation/rendering. This is an inline response; the note is not evidence of pollution of a nonexistent document file.
Limit: output supports a content assessment, not proof of an independent reader walkthrough or real reader acceptance. Actual Word layout not evaluated.

## Case B — PARTIAL
Source: Candidate Case B / Turn 2 Answer §3, “采购仍存在不同意见” and “采购意见未统一”.
Concrete factual-boundary issue: input gives Li's preference to collect monthly growth and Wang's temporary objection to procurement. It does not give anyone's affirmative procurement position or a documented finding of group disagreement. Candidate §2 correctly says no recorded consensus, but §3 upgrades absence of a recorded agreement into affirmative claims of disagreement/unified-opinion failure. Replace those with “材料未记录采购一致决定；王工暂不同意采购” or equivalent.
Other requirements pass: Turn 1 is outline-only and waits; Turn 2 preserves Li and Wang's discussion, does not turn 180GB into a recommended/purchased capacity, retains absence of measurement, excludes budget, and explicitly labels added next steps as proposed/unapproved with no invented owner/date.

## Case C — PASS
Source: Candidate Case C / Turn 1 Answer.
Performs the exact supplied typo substitution only; does not restart clarification or outline approval and does not claim a tool-edited file.

## Case D — PASS for observed clarification stage
Source: Candidate Case D / Turn 1 Answer.
Asks for theme/purpose/audience, facts/evidence, delivery requirements; ties professionalism to evidence and clarity. Explicitly commits to outline then confirmation; urgent deadline is not treated as permission to skip. No subsequent user answers/body were tested.

## Baseline comparison, descriptive only
- A: baseline also waits for outline confirmation, preserves compatibility/capacity uncertainty and avoids fabricated pricing. Candidate outline is tighter (single range sentence per chapter); baseline has multiple bullets. Both final drafts are reader-oriented and evidence-bounded. No demonstrated broad quality superiority.
- B: both preserve discussion and distinguish proposed verification from performed testing. Baseline's “现有材料没有记录……一致决议” is more epistemically careful than candidate's affirmative disagreement claims.
- C: both perform the limited substitution without a restarted workflow.
- D: both ask useful clarification. Candidate explicitly promises subsequent outline confirmation; baseline does not mention that later gate in this observed response. No later baseline turn tests whether it would actually skip the gate.

## Untested contracts
Changed audience/purpose requiring a revised outline; a user demanding direct full text before outline approval; ambiguous approval; adaptation of an already approved outline; full reader walkthrough trace; real file generation and layout; native skill discovery. Do not label those dynamically validated from these four cases alone.

## Supplement: Case E — PASS
Source: candidate/case-e-responses.md, Turns 1–3.
- Turn 1 provides outline only and waits. Some scenario details remain open but are explicitly deferred, not invented.
- Turn 2 changes audience/purpose from client proposal to internal minutes and says “直接写吧”. Candidate recognizes structural change, removes quotation content, presents a revised outline and waits instead of treating urgency/direct-write language as approval of an unseen outline.
- Turn 3 follows explicit revised-outline approval. It retains compatibility and capacity uncertainty, preserves the actual user-reported capacity controversy without inventing participants/positions, excludes quotation, and labels added next actions as proposals not assigned meeting decisions.
- Unlike B, E's “存在争论” is directly supported by the user's explicit “保留我们对180GB容量的争论”.
This supplementary case dynamically covers changed audience/purpose and a direct-write request during that change. It does not test the initial-outline direct-write path, ambiguous approval or native discovery.

## Follow-up status
Parent reports a narrow factual-boundary rule added after the B finding. Original B remains PARTIAL; no claim that original outputs changed or the whole candidate suite was rerun. Capabilities documentation mismatch has been corrected (count plus independent entry).

## Fresh Case B targeted retest — PASS
Source: retest-b/responses.md, Turns 1–2. Reviewed after the narrow reference amendment.
- Outline is confirmed before body.
- Turn 2 §2 explicitly treats Li's suggestion as verification-order advice, not procurement assent; Wang's temporary objection remains intact. It says the material does not record a purchase decision/consensus, not that disagreement is a proved group fact.
- §3 distinguishes discussion from unavailable capacity results. §4 keeps proposed verification unassigned and does not presume Li owns it.
- No budget, capacity recommendation or invented approval.
This is one targeted retest, not a rerun of A/C/D/E or a stability estimate. Original B remains PARTIAL in the permanent record. No new concrete defect found in the retest.
