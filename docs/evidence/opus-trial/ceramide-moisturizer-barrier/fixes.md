# Ceramide cream and cleanser for eczema: what the gate and the lint refused, and the fix (2026-11-21)

Written by hand by Claude Opus 5.5 in Claude Code, with no API call. This is an **upper bound** on a
one-shot API run: the writer could reread the paper and run the gate and lint before you saw anything.
The rules were not changed. Files: `extraction-as-written.json`, `editorial-as-drafted.json`,
`gate-1.txt`, `gates.txt`, `lint-1.txt` to `lint-3.txt`, `lint-final.txt`, `deck/`, `figure/`, `checks.txt`.

## Gate

First run (`gate-1.txt`): **0 refusals**, 68 facts. One warning, expected: the paper prints no
confidence interval for the eczema score, so the read must say so (it does).

Before the first run, the script itself stopped on the source's thin spaces around "±" (the table rows
could not be found); the row finder and four literal quotes now go through the space-tolerant matcher.

Added after the first run (`gates.txt`, 70 facts, 0 refusals): `tewl_lower` and `hydration_up`, both
quoting the discussion's "a decrease in TEWL and increased skin hydration". The results sentences say
only "improved", and the deck's verdict rows ("lower", "higher") need a passage that states the
direction.

## Lint round 1: the first draft (19 refusals, `lint-1.txt`)

| # | Refusal | Fix |
|---|---|---|
| 1, 3, 5, 6 | `[H3]` causal verbs ("improved", "improves") without the population | "in patients on either set", "in adults", "in patients in both groups" |
| 2, 4, 7, 8, 9 | `[orphan]` "28 days" cited only to a limitation whose passage has no 28 | Also cites `twenty_eight_days`; one sentence became "Over the trial" |
| 10, 11 | `[plain]` hook "fell": the primary passage also says "not significantly different" | "the eczema score stood at 8.25 … it stood at 7.84" |
| 12 to 16 | `[plain]` four fact labels held a p-value or "significant" | Reworded labels; the p-values stay in the audit |
| 17 | `[H10]` audit 284 words, budget 250 | Merged the side-effect lines and the two quality-of-life sentences; the registration line went to the deck's receipts (249) |
| 18 | `[figure]` `eczema-scores` not listed | Built (below) |
| 19 | `[H7]` the figure's "day 28" cited `twenty_eight_days`, whose passage says "over 28 days" | Cites `easi_active_28`, whose passage prints "day 28" |

Round 2: 3 refusals. The audit was 3 words over. The figure was not yet built. **`[copy]`**: three 7-word
runs matched the paper ("improves the signs and symptoms of eczema in adults"), now "The abstract
concludes that the set improves eczema in adults." Round 3: 0. Three passives then rewritten
("Patients rated …").

## The figure: `eczema-scores`

`components/papers/ceramide-moisturizer-barrier/figures/EczemaScores.tsx`, layout in
`components/figures/eczema-scores-layout.ts`, tests in `scripts/eczema-scores.test.ts` (9). One row per
set on a shared scale from the score's floor: a dot at the start score, a dot at day 28, a solid line
between. The two lines nearly match, which is the read's point. The guard and the typecheck passed on the
first try. Two visual faults found in the preview (`figure/eczema-scores.html`):

- The start dot was pale with a grey edge and read as an outline, which in this system means
  "proposed". It is now a smaller solid grey dot.
- Nothing said which end was which, and the line runs right to left (the score fell). The first row now
  names its dots, "start" and "day 28"; "start" is end-anchored so it stays inside the frame.

## Errors the lint passed, found by reading the draft against the paper

| Where | Problem | Fix |
|---|---|---|
| Population panel, who slide, a fact label | "Sydney": the paper's text names Kogarah, New South Wales; "Sydney" came from the authors' affiliations and my own knowledge | "one skin clinic in New South Wales, Australia"; "One Australian skin clinic" |
| Mechanism | "irritants get in more easily": the paper says a weak barrier leaves skin prone to inflammation from irritants | "irritants inflame it more easily" |
| Mechanism | The cream's "draws water in, seals it, smooths" was stated as fact; it is the authors' account of the ingredients | "The authors say it also draws water …" |
| Hook slide | "8.25" and "7.84" meant nothing without the scale | "score out of 72, ceramide set", citing `easi_scale` |
| Sex | Checked: the text says 53 women and 47 men, but Table 2 labels the totals the other way round (male 53, with group percentages that do not match the counts) | The read does not state the split; flagged |
