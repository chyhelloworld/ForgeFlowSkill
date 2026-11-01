# Independent behavior review — frozen L1–L4

Reviewed 2026-11-01. Read both complete responses.md files and both sample.html files against cases.json and criteria.md. This is a single-run, unblinded, source/text observation of simulated responses; not browser QA or a causal effectiveness experiment.

## Findings

No blocking deviation from the frozen behavioral criteria was found. Both baseline and candidate pass the observable text/source criteria. No improvement in pass rate is established.

| Case | Baseline | Candidate | Observed evidence |
| --- | --- | --- | --- |
| L1, pre-confirmation | PASS | PASS | Outline only, no full page copy/HTML in first turn. Audience, goal, migration/training/export objections map to named sections. Baseline has five sections; candidate four; neither count is required. Both preserve Inter, navy/white and static navigation, and disclose unavailable booking. |
| L1, after supplied confirmation | PASS (source only) | PASS (source only) | Coherent standalone HTML follows each respective outline. Only four supplied capabilities are stated; Excel import and reminders remain unavailable. No invented customers, testimonials, prices, gains, trials or refund guarantees. Two disabled booking buttons with reasons, no form/script/fake success. Shared CSS definitions, responsive breakpoint and focus rules exist. |
| L2 | PASS | PASS | Exact typo replacement only, no questionnaire, redesign or marketing pipeline. No unsupported claim of editing an unseen product file. |
| L3 | PASS | PASS | Operate design preserved; owner/status conjunction, clear and no-result behavior described without promotional CTA/proof structure. Existing data and states are reused; no implementation success claimed. |
| L4 | PASS | PASS | Reject unsupported customer count and unauthorized refund policy; offer factual, locally scoped replacement copy without changing other sections. |

## Independent static checks

Python HTMLParser inspection of both HTML files found: zero duplicate IDs; zero missing fragment targets; two buttons, both disabled; zero scripts/forms; zero external src/href/action URLs. Manual reading found centralized CSS, local font fallbacks, viewport metadata and mobile media rules in each. These checks do not establish actual layout, contrast or keyboard behavior.

Both responses explicitly disclose missing browser/visual acceptance evidence. Candidate describes those limits and the hypothetical confirmation particularly clearly, but this is a reporting difference, not evidence of better aesthetics or business results.

## Interpretation and limits

- Baseline already satisfies every observed frozen criterion. Candidate retains these behaviors; the sample does not demonstrate an incremental quality gain.
- L1's prompt itself explicitly requires outline confirmation, honest evidence, retained brand and unavailable booking. Thus success is not attributable solely to the new reference.
- The reviewer saw both outputs and criteria; not blinded. No repeated runs, stability test, token/cost comparison or statistical claim.
- Browser rendering at desktop/390px: NOT_RUN by reviewer. Keyboard operation, touch, computed contrast, visual quality and real-user acceptance: NOT_RUN. Real booking/backend outcome: not applicable to these offline samples, not passed.
- The supplied confirmation is synthetic, not real-user approval of either design. Differences in section count, layout and phrasing are not ranked as visual improvements from source inspection.

## Reviewed identities

```text
0d36289d086cd07e09b765dac192d2695562c019b0d047a8f0fed0de1b153f83  cases.json
cea20cab6a7f03e6a5945bf603963c1e8f9ec76d948c81890748c3144be64489  criteria.md
289d8e4b602764f0944659ace2d0d2b2559ea87c45981054580d95cd9d6d2722  baseline/responses.md
7916f58cb977d93413b1fa2911b7bfa7e400fd2950ff5933963c8f170a697ae8  baseline/sample.html
45e0b8848616df7f3e3ef59eaddde43aeeaae6ea6aa4fcd2baec42919819c9ed  candidate/responses.md
2fb5dae055e3275ed60969ed8550a2842c18ddec17e3b52c1c381f10e59f2f1b  candidate/sample.html
```
