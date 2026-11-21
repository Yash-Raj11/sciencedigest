# Time-restricted eating: what the gate and the lint refused, and the fix (2026-11-21)

Written by hand by Claude Opus 5.5 in Claude Code, with no API call. This is an **upper bound** on a
one-shot API run: the writer could reread the paper and run the gate and lint before you saw anything.
The rules were not changed. Files: `extraction-as-written.json`, `editorial-as-drafted.json`,
`gate-1.txt`, `lint-1.txt` to `lint-5.txt`, `lint-final.txt`, `deck/`.

## How the quotes were written this time

Each quote was cut from `source.txt` by its first and last words (a small script), not typed. Typing
them would have failed: the paper puts a thin space (U+2009) inside every "8 h", which looks like an
ordinary space. That is how the gate passed on the first try.

## Gate

First run: **0 refusals**, 124 facts. Warning (true): no result has a confidence interval.

One change later, forced by the lint (below): `homa_etrf_better` now quotes the sentence only up to
"…p = 0.002)". The full sentence ended "but there was no difference between the changes in the mTRF
and control groups", which cancels the direction for the lint. That clause has its own fact,
`homa_mtrf_ns`. Two fact labels lost a p-value ("Early against mid-day: p < 0.001" → "Insulin
resistance: early against mid-day").

## Lint round 1: the first draft (12 refusals, `lint-1.txt`)

| # | Refusal | Fix |
|---|---|---|
| 1–3, 5–6 | `[plain]` "fell" in the teaser, card headline, a takeaway and the caption: "no cited fact states a direction" | The lint was right about the quote, not the claim: the primary fact's quote also held the null mid-day clause. Quote cut (above); the wording stays |
| 4 | `[plain]` "better" in the card question | "Does an early eating window lower insulin resistance more than a mid-day one?" |
| 7 | `[plain]` "dropped out" in what summaries miss | "the eight who did not finish were excluded" |
| 8–9 | `[plain]` p-values in two fact labels | Labels reworded (above) |
| 10 | `[H10]` audit 266 words, budget 250 | Merged and shortened receipts lines (took three rounds, 255 → 252 → 249) |
| 11 | `[figure]` `eating-windows` not listed | Built (below) |
| 12 | `[carousel]` slide 1, 27 words | "Adults ate early, at mid-day, or as usual, for five weeks." |
| 13 | `[H2]` "only" read as a caveat on the alternate opening | "Healthy adults ate between 6:00 and 15:00 for five weeks." |

The figure guard (eslint) refused three bare numbers in the first figure file; the sums moved to
`components/figures/windows-layout.ts`.

## Errors the lint passed, found by reading the draft against the paper

| What the draft said | What the paper supports | Fix |
|---|---|---|
| "So the clock seemed to matter more than the amount." | Food eaten fell 240 against 159 kcal a day, with **no clear** difference (p = 0.30). That is not "the same amount" | "The authors read this as a timing effect, since food eaten showed no clear difference between the windows." |
| Hormone and body-clock gene results, "in 19 people" | Only five of the 19 were early eaters (`rhythm_subset`) | "Exploratory, in 19 people, five of them early eaters: …" and "in all five" |
| "may be involved" (passive) | | "may play a part" |

## Looked at, then fixed (figure layout)

Rendered both new figures and looked at them. Three layout faults that no test caught:
- eating-windows: the right column's heading ran off the edge → anchored to the right edge.
- eating-windows: the "+0.39" and "−0.05" labels sat on the zero line → placed beyond each bar's end.
- clean-gap (paper 1): the zero line ran through the row labels → removed (the tracks show the scale).

## Built for this read (code, not content)

- `components/papers/time-restricted-eating-healthy/figures/EatingWindows.tsx`, `components/figures/windows-layout.ts`; registered in `lib/content/figures.ts` and `components/papers/registry.tsx`.
- `scripts/eating-windows.test.ts`, 10 tests. Mutation check: drawing every bar to the right of no change failed the scale test (1 failed, 9 passed); restored, 10 passed.
