# Sugar and inflammation markers: what the gate and the lint refused, and the fix (2026-11-21)

Written by hand by Claude Opus 5.5 in Claude Code, with no API call. This is an **upper bound** on a
one-shot API run: the writer could reread the paper and run the gate and lint before you saw anything.
The rules were not changed. Files: `extraction-as-written.json`, `editorial-as-drafted.json`,
`gate-1.txt`, `gates.txt`, `lint-1.txt` to `lint-4.txt`, `lint-final.txt`, `deck/`, `figure/`, `checks.txt`.

## Gate

First run (`gate-1.txt`): **4 refusals**, 83 facts.

| # | Refusal | Fix |
|---|---|---|
| 1, 3 | `md_fru_glu`, `md_hfcs_suc`: a ci95 spread repeats ciLow/ciHigh | Spread removed; the interval lives once, in the estimate |
| 2, 4 | `grade_fru_glu`, `grade_hfcs_suc`: grade must be high, moderate or low | The value was "Low" from Table 3; it now quotes the results sentence ("rated as “low”") |

Second run (`gates.txt`): 0 refusals.

One later change, forced by the lint: `hypothesis` quoted the whole abstract, which also holds "no
differences", so it could not carry a direction. It now quotes the abstract's first sentence only.

## Lint round 1: the first draft (10 refusals, `lint-1.txt`)

| # | Refusal | Fix |
|---|---|---|
| 1 | `[card]` the headline must cite the headline result | Cited `md_fru_glu` (round 2 then refused two results in one clause; it cites `md_fru_glu` alone) |
| 2 | `[orphan]` "2 weeks to 3 months" not in `limit_duration`, which prints "two weeks to three months" | Written as the paper does |
| 3 | `[one-claim]` who-slide heading joined two results | "Tested in 13 controlled trials." |
| 4, 6 | `[plain]` "worse" in the card question and the hook slide | "Does fructose fan inflammation more than …?", citing the authors' hypothesis, which says "increased" |
| 5, 7 | `[plain]` "higher CRP" and "rises with inflammation": no cited fact states a direction | "link sugary drinks with CRP"; "a blood protein used as a marker of inflammation" (also in the mechanism and the glossary, for one wording) |
| 8 | `[H10]` audit 286 words, budget 250 | p-values folded into their lines; review registration moved to the deck; funding line shortened (250 in round 3) |
| 9 | `[figure]` `crp-gaps` not listed | Built (below) |
| 10 | `[carousel]` who-slide art 26 words | "Years of sugar", "Markers other than CRP" |

Rounds 2 to 4: 3, 1 (the figure), 0 refusals. Two glossary entries the read never used were dropped;
two passive sentences rewritten.

## The figure: `crp-gaps`

`components/papers/sugar-inflammation-markers/figures/CrpGaps.tsx`, layout in
`components/figures/crp-gaps-layout.ts`, tests in `scripts/crp-gaps.test.ts` (8). It reuses the
project's interval rules (`interval-layout.ts`, `IntervalPlot`): each pooled difference as a mark,
its printed 95% range as a band, one "no difference" line at 0. The figure guard refused five bare
numbers in the first file (row indexes and "first row"); they moved to the layout file. The first
test run caught that the full view marks only the pastel band with `data-band`; the test now reads
each row's band from its fact group.

## Errors the lint passed, found by reading the draft against the paper

| Where | Problem | Fix |
|---|---|---|
| Deck source line | "Pooled randomized trials": the review took in controlled trials, two of the six headline trials not described as randomized | Not fixable in the content: the gate has one pooled design. Flagged for you (decision 1); the audit says "controlled trials, not only randomized ones" |
| Population panel | "healthy, overweight or obese" left out that some trials had people with other diseases (for example polycystic ovary syndrome) | "… with or without diseases in which inflammation is not a main feature" |
| Receipts slide | "Controlled trials, registered in advance" read as if the trials were registered; it was the review | "Every trial had a control group; review registered first" |
| Who slide, caption | "Mostly very large doses": the paper names five trials with very large doses, not most | "Often very large doses" |
