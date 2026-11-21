# Sleep restriction and sweets: what the gate and the lint refused, and the fix (2026-11-21)

Written by hand by Claude Opus 5.5 in Claude Code, with no API call. This is an **upper bound** on a
one-shot API run: the writer could reread the paper and run the gate and lint before you saw anything.
The rules were not changed. Files: `extraction-as-written.json`, `editorial-as-drafted.json`,
`gate-1.txt`, `gates.txt`, `lint-1.txt` to `lint-4.txt`, `lint-final.txt`, `deck/`, `figure/`.

## Gate

First run (`gate-1.txt`): **3 refusals**, 97 facts.

| # | Refusal | Fix |
|---|---|---|
| 1 | `species`: the quoted passage does not support "human" | The abstract line "31 typically-developing adolescents aged 14–17 years" names no word on the gate's human list (participants, adults, people …). The species now quotes the ethics sentence: "All participants and their parents provided …" |
| 2–3 | `sleep_28`, `pooled_68`: the quote carries a p-value, so it is a result, not context | Both made `finding`, with an outcome |

Second run (`gates.txt`): 0 refusals. Warning (true): no result has a confidence interval.

Later changes, forced by the lint: `hunger_ns` and `nonsweets_ns` now quote the results sentence
("the effect of sleep manipulation was non-significant …") instead of the abstract ("did not affect …"),
because the verdict check needs the passage to say no difference was clear. Four fact labels lost
the words "p-value" or a p figure.

## Lint round 1: the first draft (13 refusals, `lint-1.txt`)

| # | Refusal | Fix |
|---|---|---|
| 1 | `[orphan]` protocol: "10" not in the cited passages | Cited `hs_in_bed` |
| 2–3 | `[plain]` "fell asleep" read as a direction, in the protocol and the receipts | "were asleep by about 22:06"; "Sleep began at 0:34 against 22:06" |
| 4 | `[plain]` "no effect" in the weak end | "the weak end may sit close to zero" (round 2 also refused "far smaller") |
| 5–8 | `[plain]` p-values in four fact labels | Reworded ("Pooled calories: the test result"); round 2 also refused the word "p-value" in a label |
| 9 | `[H10]` audit 255 words, budget 250 | Two receipts lines shortened |
| 10 | `[figure]` `bedtimes` not listed | Built (below) |
| 11–12 | `[H5]` deck verdicts "no clear difference" on hunger and other foods: the passage does not say so | Quotes moved to the results sentence (above) |
| 13 | `[carousel]` alternate opening's label, 7 words | "in bed, five nights running" |

Rounds 2 to 4: 4, 1 (the figure) and 0 refusals. Five passive sentences flagged as warnings were
then rewritten (`lint-final.txt` keeps the house phrase "Who this was tested in").

## The figure: `bedtimes`

`components/papers/sleep-restriction-sweet-foods/figures/Bedtimes.tsx`, layout in
`components/figures/bedtimes-layout.ts`, tests in `scripts/bedtimes.test.ts` (10). One night strip
from 21:00 to 9:00; each schedule's measured night is a solid bar from the printed time of falling
asleep (0:34, 22:06) to the printed wake time (7:12, 7:11). The bars end together: only the bedtime
moved. The figure guard passed on the first run. Looking at it caught two faults the tests did not:
the midnight line ran through the words under the bars (now a short tick on each strip), and the
feed-card view kept the full view's row spacing (now tighter).

## Errors the lint passed, found by reading the draft against the paper

| Where | Problem | Fix |
|---|---|---|
| Mechanism, last paragraph | "the change was in how sweets looked, not in how hungry the teens felt" claims hunger did not change; the paper only found no clear difference | "what moved was how sweets looked; hunger showed no clear difference" |
| Simulator rows | The pooled calorie and sweets numbers include the authors' earlier study, but the labels did not say so | Each row now says "both studies" |
| Mechanism (first draft plan) | The 11% and 52% intake rises had no test in this sample; in the mechanism they would read as findings, and the mechanism may carry no caveat | Kept out of the mechanism and the deck; in the audit's "missed" line with "no test reported" |

## What the paper itself gets wrong or leaves open

- Main result: p = .045 in the abstract, p = .049 in the results, same t = 2.07. Both are printed.
- No mean rating per condition, no confidence interval: Cohen's d = .41 is the only size.
- "Sweets 52% more" rests on 0.74 ± 1.49 against 0.49 ± 0.76 servings, in 23 teens, untested.
