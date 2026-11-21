# Alternate-day fasting and weight: what the gate and the lint refused, and the fix (2026-11-21)

Written by hand by Claude Opus 5.5 in Claude Code, with no API call. This is an **upper bound** on a
one-shot API run: the writer could reread the paper and run the gate and lint before you saw anything.
The rules were not changed. Files: `extraction-as-written.json`, `editorial-as-drafted.json`,
`gate-1.txt`, `gates.txt`, `lint-1.txt` to `lint-3.txt`, `lint-final.txt`, `deck/`, `figure/`, `checks.txt`.

## Gate

First run (`gate-1.txt`): **0 refusals**, 80 facts. One warning, expected: the paper prints no
confidence interval, so the read must say so (it does, in the audit's weak-end line).

One slip caught before the first gate run: the `lean_ns` quote's end matched an earlier
"(Independent samples t-test)." and took in the wrong sentence; the quote now starts at "No difference
between groups for fat free mass at week 12".

One later change, forced by the lint: `crp_change_p`'s label carried a p-value ("the change test also
gave p = 0.01"); it now reads "CRP: the change test agreed".

## Lint round 1: the first draft (12 refusals, `lint-1.txt`)

| # | Refusal | Fix |
|---|---|---|
| 1 | `[one-claim]` teaser: "they ate about what the control group ate" joined two results | Two sentences: 1856 kcal on free days [feed_w12]; the control group 1790 [ctrl_w12] |
| 2, 3, 5 | `[orphan]` "week 12" in the mechanism, the figure caption and the audit: the food-record and Table 4 rows do not print "12" | "By the end", "at the end of the trial", "end-of-trial p" |
| 4, 10 | `[orphan]`, `[H7]` "between 12:00 and 14:00" (protocol, step label): the paper prints "12.00 pm and 2.00 pm" | Written as the paper does |
| 6 | `[orphan]` "32 randomized": the passages spell it "Thirty-two" | "Thirty-two started and 30 finished" |
| 7 | `[orphan]` alternate opening heading "12 weeks" with `[-]` | Cites `twelve_weeks` |
| 8 | `[plain]` "Total cholesterol and blood pressure fell": `chol_ns` states no direction | "showed no clear difference from controls" |
| 9 | `[plain]` p-value in `crp_change_p`'s label | See Gate |
| 11 | `[figure]` `fast-days` not listed | Built (below) |
| 12 | `[H7]` figure title "Food eaten per day, week 12" holds a number | "… end of trial" |

Round 2: 1 refusal (the figure). Round 3: 0. Four warnings then cleared by hand: two sentences over 22
words split, two passives given their subject ("the authors sized the trial", "the authors merged the
groups"). Left: the "Who this was tested in" phrase every read uses.

## The figure: `fast-days`

`components/papers/alternate-day-fasting-weight/figures/FastDays.tsx`, layout in
`components/figures/fast-days-layout.ts`, tests in `scripts/fast-days.test.ts` (10). Two rows of daily
bars on one value scale: the fasting group alternates the fast-day bar (489 kcal) with the feed-day bar
(1856); the control group repeats its bar (1790). All six bars per row are measured, bound to their
food-record facts. How many days are drawn is the layout's choice, said in the design note. The figure
guard and the typecheck passed on the first try. Two visual faults found in the preview
(`figure/fast-days.html`):

- "Days, in order" sat tight under the amounts line: more room under the last row.
- The control bars were near-invisible: `--line` on the background is about 1.4 to 1 in dark and less
  in light. A solid `--muted` fill would outweigh the finding, so the bars keep the pale fill and gain a
  solid muted edge (still filled, so still "measured").

## Errors the lint passed, found by reading the draft against the paper

| Where | Problem | Fix |
|---|---|---|
| Population panel | "A random draw put 15 into fasting and 15 into eating as usual": 32 were randomized; 15 per group is who *finished* | "A random draw split them between fasting and eating as usual. Fifteen in each group finished." |
| Audit, food-record limitation | Said only that people under-report; the authors add that this makes their own "no catch-up eating" finding possibly inaccurate, and the mechanism layer leans on that finding | "… so the finding of little catch-up eating may be off." |
| Teaser, card | Checked: "adults without obesity" matches BMI 20 to 29.9; "most were women" matches 22 of 30 | No change |
| Audit, "two tests" paragraph | Checked the table footnotes: column 4 is the week-12 comparison, column 6 the change comparison | No change |
