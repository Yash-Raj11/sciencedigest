# Best-possible toothbrushing: what the gate and the lint refused, and the fix (2026-11-21)

Written by hand by Claude Opus 5.5 in Claude Code, with no API call. This is an **upper bound** on
what a one-shot API run would produce: here the writer could open the paper, run the gate and the
lint, and fix their refusals before you saw anything. The API pipeline gets one reply per stage plus
one retry.

The rules were not changed. Every fix is in `extraction.json` or `editorial.json`, except the new
figure (below), which the read needed and which the sleep read also had built by hand in step 3B.

Files: `extraction-as-written.json` (first extraction), `editorial-as-drafted.json` (first read),
`lint-1.txt` to `lint-3.txt` (each content build), `deck/` (the slides in all four looks, with sheets).

## Gate

First run: **0 refusals**, 112 facts. One warning, which is true: the paper prints no confidence
interval for any result, so the read must say so (it does, in the weak-end line).

Later changes to the extraction, none of them forced by the gate:

| Change | Why |
|---|---|
| Fact label "Two visits two weeks apart…" on `plaque_second_visit` corrected; new fact `visits_two_weeks` | The label said "two weeks", which the fact's quote does not say. The paper says it elsewhere ("two appointments that were two weeks apart"), so that sentence is now its own fact |
| `floss_correct`: outcome "(floss curved against the tooth down to the gumline)" removed | The paper never defines correct flossing. I had added the definition from general knowledge |
| New findings `brushed_longer` and `felt_cleaner_higher` (abstract sentences) | The deck's verdict rows say "higher"; the results-section quotes give only test statistics, with no direction word. The abstract says "brushed their teeth longer" and "SPOC values … were higher" |
| New context fact `devices_on_table` | The protocol says floss and brushes were on a table; the only quote cited said "at their free disposal" |
| `dmft_sensitivity` label "did not change" → "kept the results pointing the same way" | Lint rule `plain` (below) |

Final: 116 facts, all quotes found in the paper.

## Lint round 1: the first draft (16 refusals, `lint-1.txt`)

| # | Refusal | Before | After |
|---|---|---|---|
| 1 | `[one-claim] hook`: one clause cites two results | Less than 40% of it was free of plaque, but they thought 70% was. | Two sentences: they believed 70% was clean [bp_thought_70]; the dentists found less than 40% free of plaque [under_40_clean] |
| 2–3 | `[orphan]` and `[H3] mechanism[0]`: "builds up" read as a causal verb with no citation | Plaque is a sticky film that builds up on teeth between brushings. [-] | Plaque is a sticky film on the teeth. [-] |
| 4 | `[orphan] audit.more[3]`: 106 not in the passages (the paper writes "One hundred and six") | Extreme values removed 15 of the 106 who finished. | One hundred and six finished; 15 of them were then left out for extreme values. |
| 5 | `[one-claim] slide 2 heading` | Longer brushing, no clearly cleaner gumline. | Gumline plaque: no clear difference from brushing as usual. |
| 6 | `[plain] audit.weakEnd`: "smaller" claims a direction | …every unclear difference was far smaller than the study could have detected. | …far below what the planned sample could detect. (the paper's "far below") |
| 7–8 | `[plain]` "did not change" in `audit.more[4]` and the `dmft_sensitivity` label | …did not change the direction of the results. | …kept the results pointing the same way. |
| 9 | `[H10] audit`: 251 words, budget 250 | | Shortened the felt-cleaner line |
| 10 | `[figure]`: `clean-gap` not listed | The figure did not exist yet | Built (below) |
| 11–12 | `[carousel]` slide 1 labels: 7 words, limit 6 | of the gumline they thought was clean / less than this was free of plaque | Gumline they thought was clean / Less than this was plaque-free |
| 13–14 | `[H5]` slide 2 verdicts "higher": the cited passages give no direction | `nearly_one_minute`, `felt_cleaner` | `brushed_longer`, `felt_cleaner_higher` (the abstract's own words). Note: the lint's "higher" list has no "longer"; it passed on "more often" in the same sentence. The verdict is right, but it passed on the wrong word |
| 15 | `[carousel]` slide 4 art: 30 words, limit 24 | | 22 words (shorter entries) |
| 16 | `[carousel]` second alternate opening: 26 words, limit 25 | | 21 words |

## Lint round 2: 0 refusals (`lint-2.txt`)

## Errors the lint passed, found by reading the draft against the paper

| What the draft said | What the paper says | Fix |
|---|---|---|
| "At the second visit, a drawn lot gave the instruction." | Students brushed at both visits; plaque after brushing was scored only at the second. The paper does not say when the lot was drawn | "A drawn lot set the instruction they got before brushing. … They brushed at both visits; plaque after brushing was scored at the second." |
| Teaser and some limitations were in the passive | Warnings only | Rewritten in the active voice |
| "Side-to-side scrubbing … was as common in the best-effort group" | The paper: no clear difference in movement shares | "…showed no clear difference between the groups." |

Final: `lint-3.txt` plus the last wording fix. 0 refusals, 722 words (mechanism 232, protocol 115, audit 245).

## Built for this read (code, not content)

- `components/papers/best-possible-toothbrushing/figures/CleanGap.tsx` and `components/figures/gap-layout.ts`: two solid bars on one scale (the whole gumline), believed 70% against found under 40%. The second bar stops at the printed bound and ends in a short upright line; its words say "less than 40%". The glance view has no numbers.
- Registered in `lib/content/figures.ts` and `components/papers/registry.tsx`.
- `scripts/clean-gap.test.ts`, 9 tests. Mutation check: when the figure was made to drop "less than", the bound test failed (1 failed, 8 passed); it passes again after the restore.
