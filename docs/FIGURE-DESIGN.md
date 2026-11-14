# Figure design: two figures per paper

Design spec only (2026-11-15). Nothing here is built. It refines `docs/SIMULATORS.md` section j.
The owner ruled on it the same day (R1–R7, section 0.6); the rulings are applied below. CLAUDE.md rules
H7, H9, H10 and H12 hold everywhere: this file never relaxes them.

Every paper gets two figures:

- **A. "Why it happens"**: a drawn illustration. Objects, short labels on leader lines, two
  states side by side. It sits in the mechanism layer.
- **B. "What happens to you"**: a story chart. A takeaway headline, labels on the lines, a
  shaded zone that names the idea, phases marked along the bottom. It hosts the personal
  simulator and sits in the protocol layer.

Fact ids are in `code`. Every id below exists in the paper's `extraction.json` today, or in
`content/library.json`. Label wording is exact: build it as written, then run it through the lint.

---

## 0. Shared rules for all eight figures

### 0.1 Three classes of mark

| Class | Looks like | Rests on | Says on the figure |
|---|---|---|---|
| **Measured** | solid line, solid dot, filled band | a gated finding or estimate (id named) | the source line: "From the paper" or "From another study: <cite>, <grade>" |
| **Proposed** | dashed line, hollow shape | a gated sentence where the authors propose or describe something (id named) | "The authors' idea, not measured" |
| **Sketch** | thin dotted line, no fill of its own, no ticks, no values | a background concept, reviewed by the owner | **"Sketch, not data"**, on the figure itself |

A sketch never shares a value axis with measured marks. It may share the time axis. A sketch
panel that needs clock marks takes them from the measured layer beside it, not its own text.

### 0.2 Colour roles

All colours are tokens in `app/globals.css`.

| Role | Token | Used for |
|---|---|---|
| Pastel orange fill | `--band` | the paper's key result and its bands: the result box, a confidence band, the one zone the headline is about |
| Bright orange | `--accent-text` | small key text and numbers only: the one or two numbers the reader should leave with. Never a fill, never a line longer than a tick |
| Monochrome | `--ink`, `--muted`, `--meta`, `--line` | everything else: drawn objects, axes, context, comparison groups, habits, sketches |

One pastel zone per figure. If two things both want the fill, the paper's primary result wins
and the other goes monochrome.

### 0.3 The frame at 360 px

The figure is 360 px wide with a 16 px gutter each side, so the drawing area is **328 px**.
From the top:

1. **Headline**: serif, up to 3 lines. It says what to see.
2. **Drawing area**: 328 px wide. Heights are given per figure.
3. **Tag row**: class tags that apply ("Sketch, not data", "The authors' idea, not measured",
   "Estimate from the study's numbers, not medical advice").
4. **Source line**: "From the paper" or "From another study: <cite>, <grade>".

Labels are 12 px sans, sentence case, at most 2 lines of about 22 characters when they sit
inside a 150 px half. Leader lines are 1 px `--meta`, straight, never crossing each other.
No legend anywhere: each mark is named where it sits.

### 0.4 Card view and full view

- **Card (the "aha" still)**: headline, the drawing with at most four labels, no inputs, no
  tag row beyond the class tag, no audit text. It must make the point in one look.
- **Full**: every label, the tag row, the source line, and for figure B the simulator inputs
  above the chart and the result sentence below it.

The feed card holds one figure (amendment A). The pick per paper is named in each section.

### 0.5 Simulator behaviour, all papers

- Inputs sit above the chart. The chart redraws in place: no animation, no timer.
- The result is one plain sentence under the chart, then the band's own label (SIMULATORS.md
  section h), then `ESTIMATE_LABEL` where a model step was taken, then the source line.
- The reader's own marks are monochrome ink with the label "you" or "your …". The study's
  marks keep their colours. The reader's input is never drawn in pastel orange: that fill
  belongs to the paper.
- An input outside what was tested gets "Not tested in this study" and the chart falls back
  to the card still.

### 0.6 Owner rulings (2026-11-15), applied in this file

- **R1.** Sketches are monochrome and dotted; no sage. SIMULATORS.md j1 updated.
- **R2.** The sketch tag reads "Sketch, not data".
- **R3.** Steps figure A lives in the audit layer; the steps mechanism layer is text only.
- **R4.** Steps raw grids are monochrome; the pastel fill is only for the adjusted bands.
- **R5.** Steps 3–7 days: the half-filled dot is accepted; the label shows the exact
  "5.5 died per 100".
- **R6.** HIIT figure A keeps "The trials did not test why."
- **R7.** Feed cards use figure B's still view, with no reader-dependent numbers.

The sketch rule (item 4 of the same list): where the paper measured something relevant, draw that
data; otherwise a sketch may rest on a background concept **the owner has reviewed**. Enforced by
`lib/content/sketch.ts` (a sketch with a number, on an unreviewed concept, or in orange fails).
Concepts written for review, not yet approved: `adenosine` (caffeine A and B),
`post-meal-blood-sugar` (turmeric B), `fat-free-mass` (HIIT A). Until the owner approves each one,
the sketch that rests on it cannot ship.

---

## 1. Caffeine (`daytime-caffeine-sleep`, crossover trial, free)

The finding the figures must never contradict: **sleep showed no clear difference from placebo
nights** (`sleep_same`, `quality_same`, `no_depth_change`). Nothing in either figure may show
or hint at a worse night.

### 1A. Why it happens: "the parking spot"

**Headline:** "Caffeine takes the tiredness signal's parking spot."

**Composition (328 × 200).** Two panels side by side, 156 px each, 16 px gap, a thin
`--line` rule between them. Each panel shows the same drawn object: the surface of a brain
cell as a horizontal band along the bottom third, with one cup-shaped dock rising from it.

- **Left panel, title "Without caffeine".** Small round tokens drift down from the top;
  one sits in the dock. A small glow mark under the dock.
- **Right panel, title "With caffeine".** A differently shaped token (hexagon) sits in the
  dock. The round tokens are still there, crowded above it, unable to land. No glow.

**Labels, exact.**

| Where | Label |
|---|---|
| Left, round token | "Tiredness signal (adenosine). It builds up while you are awake." |
| Left, dock | "The dock on a brain cell" |
| Left, under the dock | "Signal lands. You feel sleepy." |
| Right, hexagon | "Caffeine" |
| Right, dock | "Caffeine sits in the dock" |
| Right, crowded round tokens | "The signal is still there. It just can't land." |
| Right, under the dock | "You feel alert." |

**Measured, proposed, sketch.**

- Measured: nothing. This figure holds no result.
- Proposed (dashed outlines on the dock and both tokens): caffeine blocks the dock and may
  hold back the rise in sleep pressure (`adenosine_block`, the authors' own description).
  Tag: "How the authors describe it, not measured in this study".
- Sketch: the tokens building up through the day rest on `concept:adenosine` (to be
  reviewed). Tag: "Sketch, not data". The number of tokens drawn is a geometry prop and
  means nothing; the alt text says so.

**Colour.** All monochrome. The caffeine hexagon is solid `--ink`; the round tokens are
`--muted` outlines. The only orange is the two words "sleepy" and "alert" in `--accent-text`.
No pastel fill: this figure has no result to fill.

**Simulator.** None. Figure A never takes input.

**Card vs full.** Card: both panels, four labels only ("Tiredness signal", "Signal lands. You
feel sleepy.", "Caffeine sits in the dock", "You feel alert."). Full: all seven labels and
both tags.

### 1B. What happens to you: "the hidden tiredness day"

**Headline:** "Caffeine hides tiredness. It doesn't remove it."

**Composition (328 × 300).** Two stacked panels sharing one time axis (reference style 3),
then the result box.

- **Time axis (shared, bottom of panel 2).** Runs from waking to bedtime. Word marks only in
  card view: "wake", "midday", "bed". Three small ticks mark the study's doses at 45, 255 and
  475 minutes after waking (`schedule`), labelled "dose" once.
- **Panel 1, "Caffeine in the body" (328 × 110).** A curve that steps up at each dose and
  falls between them. The centre line is solid ink; around it a pastel band shows the spread
  of the half-life (`caffeine-saliva-half-life/half_life_caffeine`, mean ± 1 SD). No value
  ticks in card view.
- **Panel 2, "How tired you feel" (328 × 110).** Two dotted sketch lines. The upper one rises
  steadily from wake to bed. The lower one follows it at first, drops away after the first
  dose, and runs below it for the rest of the day. The gap narrows toward bedtime but **does
  not close**, and neither line continues past "bed".
- **Phase strip (328 × 20, between panel 2 and the axis).** Three brackets: "first dose",
  "in effect", "fading".
- **Result box (328 × 56, under the axis, its own border, not touching any line).** Pastel
  fill.

**Labels, exact.**

| Where | Label |
|---|---|
| Panel 1, on the curve | "Caffeine still in the body" |
| Panel 1, on the band | "Faster and slower bodies" |
| Panel 1, dose ticks | "The study's doses: 150 mg, three times a day" (`dose`) |
| Panel 2, upper line | "Sleep pressure keeps building" |
| Panel 2, lower line | "How tired you feel" |
| Panel 2, the gap | "Hidden tiredness" |
| Panel 2, right end | "The gap narrows as caffeine fades" |
| Right edge, both panels | "Sleep recording began 8 hours after the last dose" (`recording`) |
| Result box, line 1 | "What this study found" |
| Result box, line 2 | "Sleep showed no clear difference from placebo nights." (`sleep_same`) |
| Result box, line 3 | "20 men aged 18 to 35 who drink caffeine every day." (`sample`, `who`) |

**Measured, proposed, sketch.**

- Measured: the dose times and size (`schedule`, `dose`), the recording time (`recording`),
  the half-life and its spread (library fact, "From another study: Wildgrube et al. 2025,
  early evidence"), and the result box (`sleep_same`, `sample`, `who`).
- Model step: stacking three doses on the halving curve (`lib/models/decay.ts`) is
  arithmetic on measured facts, so panel 1 carries `ESTIMATE_LABEL`. The paper did not
  measure caffeine levels; the caption says "Worked out from the doses and another study's
  half-life. Not measured in this study."
- Sketch: all of panel 2, resting on `concept:adenosine`. Tag "Sketch, not data" inside the
  panel. No ticks, no values, no digits in its text.

**Guard against contradicting the finding.** No zone is called "the crash". Nothing is drawn
after "bed". No sentence joins panel 1 or panel 2 to the result box. The box reports the
study's group, never the reader's night.

**Colour.** Pastel: the result box and the half-life band (the band is the only filled shape
in the chart area; the box sits outside it). Bright orange: "no clear difference" in the box,
and in full view the reader's result range. Monochrome: the curve's centre line, both sketch
lines, the gap (a `--line` hatch, not a fill), axis, phases, dose ticks.

**Simulator (decay; inputs as built: when, "your amount" in mg, bedtime; no presets).**

- The time axis gains the reader's clock times at their dose and their bedtime.
- Panel 1 swaps the study's three-dose curve for the reader's own curve and band, starting
  at their dose time. The study's dose ticks stay, in `--meta`, labelled "the study's doses".
- A vertical ink marker stands at the reader's bedtime, labelled "your bedtime". Where it
  crosses the band, the band's two ends are marked.
- Panel 2 does not change shape with the input, because a sketch holds no number. Only its
  dose mark and bed mark move to the reader's times.
- Result sentence: "About <low>–<high> mg still in your body at bedtime." Then "Typical
  spread between people in this study", `ESTIMATE_LABEL`, and the source line. Worked
  example in SIMULATORS.md section i: 95 mg at 4 pm, bed at 11 pm, "about 28–44 mg".
- The result box stays where it is, unchanged.

**Card vs full.** Card: headline, panel 2 with "Sleep pressure keeps building", "How tired
you feel" and "Hidden tiredness", the tag, and the result box's second line. Panel 1 is not
in the card. Full: everything above. **Feed card pick: 1B, its still view (R7: no reader-dependent numbers).**

---

## 2. Turmeric and pepper (`turmeric-pepper-breakfast`, crossover trial, free)

The finding the figures must never contradict: pepper meals **differed at 30 minutes**
(`glucose_30`), the **whole 3 hours showed no clear difference** (`glucose_total`), and
**turmeric alone showed no clear difference** (`turmeric_none`). The paper prints no glucose
values, so no height is ever given.

### 2A. Why it happens: "from the tongue to the blood"

**Headline:** "The authors think pepper's heat sets off a gut signal. They measured only
the blood sugar."

**Composition (328 × 240).** Two rows, one per state, each a left-to-right chain of four
drawn objects, 70 px apiece with 16 px links between.

1. a fried egg on a plate (the top row plain, the bottom row with dark specks);
2. a tongue in side view with one small sensor bump;
3. a loop of gut with one small signal drop leaving it;
4. a blood vessel in cross-section with sugar cubes inside.

Row titles on the left edge, rotated: "Plain egg" and "Egg with pepper". In the top row
objects 2 and 3 are drawn quiet (no bump lit, no drop). In the bottom row the bump is lit
and the drop is drawn. Object 4 is drawn the same size in both rows; the bottom one carries
the measured label.

**Labels, exact.**

| Where | Label |
|---|---|
| Object 1, bottom row | "1 g of black pepper, mixed into the egg" (`meals`, `in_egg`) |
| Object 2 | "Heat sensor in the mouth" (`trpv1_mouth`) |
| Object 2, bottom row | "Pepper may switch it on" (`trpv1`) |
| Object 3 | "The gut's 'food has arrived' signal" (`glp1`, `concept:glucagon-like-peptide`) |
| Object 3, bottom row | "May be released sooner" |
| Object 4, bottom row | "Blood sugar: lower than after the plain egg" (`glucose_lower`) |
| Object 4, bottom row, second line | "The clear difference: at 30 minutes" (`glucose_30`) |
| Under the links 1→2→3 | "The authors' idea. No hormones were measured." (`lim_hormones`) |
| Under object 4 | "Measured" |

**Measured, proposed, sketch.**

- Measured (solid): object 1 (the meal as served) and object 4's label.
- Proposed (dashed outlines, dashed links): objects 2 and 3 and the links between 1, 2, 3
  and 4 (`trpv1`, `trpv1_mouth`, `glp1`). This is a randomized trial, so the solid claim
  "pepper meal → lower blood sugar" (`glucose_lower`) may be drawn as one solid arrow running **under** the
  chain, straight from object 1 to object 4, labelled "What the trial showed". The chain
  above it stays dashed.
- Sketch: none. The sugar cubes in object 4 are not counted: both rows draw the same number
  (a geometry prop), and the difference is carried by the label alone.

The label under the links states a fact about what was measured, not a caveat about the
mechanism; the mechanism's limitation (`lim_mechanism`) stays in the audit (H10).

**Colour.** Pastel: the background of object 4 in the bottom row only. Bright orange: the
words "lower than after the plain egg" (owner, 2026-11-15, rule `one-claim`: the direction is
`glucose_lower`'s, the time is `glucose_30`'s; each label cites one). Monochrome: everything else; dashed objects in
`--meta`.

**Simulator.** None.

**Card vs full.** Card: the bottom row only, with "Heat sensor in the mouth", "The gut's
'food has arrived' signal", "Blood sugar: lower", and "The authors' idea"
under the dashed part. Full: both rows and all labels.

### 2B. What happens to you: "the first half hour"

**Headline:** "With pepper, blood sugar was lower. The clear difference was at 30 minutes;
across 3 hours, no clear difference." (Owner, 2026-11-15: one fact per clause.)

**Composition (328 × 250).** Two curves compared over time (reference style 4).

- **Time axis.** "Meal" at the left, then ticks at 30, 60, 120 and 180 minutes
  (`timepoints`), spaced to scale across 296 px. The ticks belong to the measured layer.
- **Curves (sketch).** Two dotted lines start together at "meal", rise, peak and fall. The
  "with pepper" line rises more slowly at first; the two meet by the 60-minute tick and run
  together to the end. No value axis, no gridlines.
- **Measured marks on the time axis, not on the curves.** A row of five small dots sits on
  the axis line itself, one per reading (`timepoints`). The dot at 30 is solid and larger.
- **Zone.** A pastel column 36 px wide, centred on the 30-minute tick, full chart height.
- **Bracket.** A thin bracket above the curves spanning meal to 180.
- **Phase strip.** "eat", "the first rise", "settling".

**Labels, exact.**

| Where | Label |
|---|---|
| Upper curve | "Plain egg" |
| Lower curve | "Egg with pepper" |
| Pastel column | "Clear difference here" (`glucose_30`: it gives the time, not the direction) |
| Bracket | "Whole 3 hours: no clear difference" (`glucose_total`) |
| Axis dots | "Blood sugar was checked at these times" (`timepoints`) |
| Under the chart | "The paper prints no blood sugar values, so the lines show shape only." |
| Under the chart, line 2 | "20 healthy adults, one meal each way." (`sample`, `single_meal`) |

**Measured, proposed, sketch.**

- Measured: the reading times, that the 30-minute reading differed, that the 3-hour total did
  not, the people.
- Sketch: both curves, resting on `concept:post-meal-blood-sugar` (to be written and
  reviewed). Tag "Sketch, not data" inside the chart. The gap between the lines is a
  geometry prop with no meaning; the alt text says "the size of the gap is not from the
  paper".
- The sketch may part the lines **only** inside the pastel column and must draw them
  together from the 60-minute tick onward, or the bracket's claim is contradicted.

**Colour.** Pastel: the 30-minute column. Bright orange: "Clear difference here". Monochrome: both
curves (`--ink` dotted for the reader's meal, `--muted` dotted for the other), dots, bracket,
axis.

**Simulator (grid; two switches: "Black pepper" and "Turmeric", each on or off).**

| Reader's meal | What the chart draws | Result sentence |
|---|---|---|
| Neither | One curve, "Plain egg". No pastel column. | "This is the plain meal the others were compared with." |
| Pepper | Two curves; "Egg with pepper" in ink; column lit. | "After this meal, blood sugar was lower than after the plain egg. (`glucose_lower`) The clear difference was at 30 minutes. (`glucose_30`) Over 3 hours: no clear difference. (`glucose_total`)" |
| Pepper + turmeric | As pepper; lower curve relabelled "Egg with pepper and turmeric". A note under it: "This meal's tea had more sugar: 10 g, not 8 g." (`sugar_row`) | Same sentence as pepper. |
| Turmeric | One curve, labelled "Plain egg and egg with turmeric". No column. | "Turmeric alone: no clear difference in blood sugar from the plain egg." (`turmeric_none`) |

No p-values on the chart (owner, 2026-11-14): they live in the Receipts. Below the result,
in full view only, a four-cell strip shows overall pleasantness for the four meals as printed
(`taste_c`, `taste_bp`, `taste_tr`, `taste_both`), each as a monochrome band labelled "typical
spread between people in this study", with the reader's cell outlined in ink. It is context,
so it takes no pastel.

**Card vs full.** Card: the pepper state, with "Plain egg", "Egg with pepper", "Clear difference here"
and the bracket label, plus the tag. Full: switches, all labels, the result sentence, the
taste strip. **Feed card pick: 2B, its still view (R7: no reader-dependent numbers).**

---

## 3. Steps (`steps-days-per-week`, cohort, free)

This is an observational study. **Neither figure draws an arrow, a causal verb or a line that
implies one thing leads to another.** Links between objects are plain lines with no head, or
nothing at all.

### 3A. Why it happens: "three different crowds"

The honest answer to "why" is that the paper cannot say. What it can show is why the raw gap
looks so large: the groups were different people from the start.

**Headline:** "The three groups were different people before anyone counted a step."

**Composition (328 × 230).** Three columns side by side, 100 px each, 14 px gaps: the
reference's two-state layout stretched to three states. Each column, top to bottom:

1. a week strip: seven small boxes, with boxes ticked to show the group (none; two; five);
2. a drawn standing figure, the same outline in every column (no ageing cues beyond the
   label, so the drawing does not caricature);
3. two short fact lines under the figure.

**Labels, exact.**

| Where | Label |
|---|---|
| Column titles | "0 days" · "1–2 days" · "3–7 days" (`threshold`) |
| Under the titles, once, spanning | "Days a week with 8,000 steps or more" |
| Fact line 1 | "Average age 64" · "Average age 52" · "Average age 46" (`ages`: 63.7, 51.5, 46.0) |
| Fact line 2 | "Half had trouble walking or with stairs" · "1 in 5 did" · "About 1 in 15 did" (`mobility`: 50.5%, 20.3%, 6.8%; `mobility_def`) |
| Under all three | "Poor health can lower both step counts and survival. The study adjusted for much of this, not all." (`confounding`, `models`) |
| Last line | "Steps were counted for one week only." (`one_week`) |

The plain-language fractions round the printed percentages; the full view prints the exact
figure beside each ("50.5%", "20.3%", "6.8%") and the exact ages.

**Measured, proposed, sketch.** Everything is measured (`threshold`, `ages`, `mobility`).
Nothing is proposed and nothing is sketched. The sentence under the columns is the authors'
own limitation; because figure A sits in the mechanism layer, where H10 allows no caveat,
**this figure is placed at the top of the audit layer instead**, under the title "Why the raw
gap is so wide". The mechanism layer for this paper carries text only.

**Colour.** All monochrome. Bright orange: the three ages. No pastel: the paper's key result
is not in this figure.

**Simulator.** None.

**Card vs full.** Card: the three columns with titles and the age line only. Full: all labels
with exact figures.

### 3B. What happens to you: "100 people, ten years on"

**Headline:** "Of every 100 people who never reached 8,000 steps, about 59 were alive ten
years on. With 1–2 days a week, about 86."

The headline counts are the paper's raw numbers: 40.7% died (`crude_0`, 257 of 632) and
14.1% died (`crude_1_2`, 75 of 532), so about 59 and about 86 alive out of 100. No other
source feeds the grid.

**Composition (328 × 330).**

- **Week strips (328 × 28).** One strip of seven boxes above each grid, ticked as in 3A.
- **Phase marks.** Left edge "Start: 100 people in each group". Right edge "10 years later"
  (`followup`). **No line is drawn between them**: the paper prints only the end values.
- **Three dot grids (each 100 × 100, 10 × 10 dots, 14 px gaps).** A filled dot is a person
  alive at ten years; a hollow dot is a person who died. Hollow dots fill from the bottom
  right, in whole rows first, so the two blocks read at a glance.
  - 0 days: 59 filled, 41 hollow (`crude_0`, 40.7% died).
  - 1–2 days: 86 filled, 14 hollow (`crude_1_2`, 14.1% died).
  - 3–7 days: 94 filled, 5 hollow, and one half-filled dot (`crude_3_7`, 5.5% died). The
    half dot keeps the picture true to the printed 5.5 without rounding it either way (R5:
    accepted).
  Dot counts are computed in the layout file from the fact, never typed into the component.
- **Adjusted strip (328 × 44, under the grids, pastel).** A horizontal scale "fewer deaths
  per 100 people, compared with 0 days". Two bands on it, each with a point mark:
  `ard_1_2` (point 14.9, band 10.9 to 18.8) and `ard_3_7` (point 16.5, band 12.5 to 20.4).
- **Plateau note.** A dashed bracket over the 3–7 grid.

**Labels, exact.**

| Where | Label |
|---|---|
| Grid titles | "0 days" · "1–2 days" · "3–7 days" |
| Under each grid | "40.7 died per 100" · "14.1 died per 100" · "5.5 died per 100" (R5; all three in the same words) |
| Under those, once, spanning | "Raw counts. The groups differ in age and health." |
| Filled dot, named once | "Alive at 10 years" |
| Hollow dot, named once | "Died" |
| Adjusted strip, title | "After allowing for age, health and habits" |
| Adjusted strip, band 1 | "1–2 days: 14.9 fewer deaths per 100" |
| Adjusted strip, band 2 | "3–7 days: 16.5 fewer deaths per 100" |
| Adjusted strip, under | "Range for the study average" |
| Dashed bracket | "The authors say the benefit levelled off at 3–4 days." (`plateau`) |
| Under the chart | "Who this was tested in: 3,101 US adults aged 20 and over, steps counted for one week, followed for 10 years." (`sample`, `cohort`, `one_week`, `followup`) |
| Last line | "People who walk more may differ in ways the study could not measure. This shows a link, not a cause." (`confounding`) |

**Measured, proposed, sketch.**

- Measured: all three grids, both adjusted bands, the follow-up.
- Proposed (dashed): the plateau bracket (`plateau`, a statement).
- Sketch: none.

**Colour.** Pastel: the two adjusted bands, and nothing else. The raw grids are monochrome on
purpose: the raw gap is partly age and health, so it must not wear the "key result" fill.
Bright orange: "14.9" and "16.5" in the strip labels. Monochrome: every dot (`--ink` filled,
`--meta` hollow), week strips, bracket, phase marks.

**Simulator (association-curve, as built: days a week at 8,000 steps, 0 to 7).**

- The reader taps the days they reach 8,000 steps on one week strip of their own, placed
  above the three study strips and labelled "Your week".
- The matching group's grid stays at full strength and gains the small ink tag "your group".
  The other two grids drop to `--meta`.
- In the adjusted strip the matching band stays pastel and the other goes to an outline.
  With 0 days, both bands go to outlines and the strip's title reads "Compared with your
  group".
- Result sentence, 2 days: "In the 1–2 days group, 14.1% died within 10 years (75 of 532),
  against 40.7% in the 0 days group (257 of 632). Raw." Then: "Adjusted difference: 14.9
  fewer deaths per 100 (10.9 to 18.8). Range for the study average." Then "Who this was
  tested in", directly under the result.
- The sentence always says "people in this group of the study". It never says "your risk",
  and no dot is marked "you".

**Card vs full.** Card: headline, the first two grids only (0 days and 1–2 days) with their
"% died" labels and the "Raw counts" line. Full: three grids, adjusted strip, plateau,
simulator. **Feed card pick: 3B, its still view (R7: no reader-dependent numbers).**

---

## 4. HIIT (`hiit-body-composition`, meta-analysis of trials, members)

Both figures ship only with the members' content (rule 7). The paper proposes no biological
mechanism, so figure A draws what was done and what was weighed, not a pathway.

### 4A. Why it happens: "two piles and a session"

**Headline:** "The scale weighs two things. Interval training moved them in opposite
directions."

**Composition (328 × 250).** Two bands.

- **Top band (328 × 130): the body as two piles.** Two panels side by side, 156 px each.
  Each shows the same standing outline with two stacked blocks beside it: a lower block and
  an upper block. Left panel title "Before"; right panel title "After 3 to 15 weeks"
  (`trials`). In the right panel a small "less" mark sits beside the fat block and a small
  "a little more" mark beside the other block. The blocks are **drawn the same size in both
  panels**; the change is carried by the marks and labels, because block sizes would be
  invented numbers.
- **Bottom band (328 × 100): a session as a strip.** Two horizontal strips of alternating
  tall and short blocks, like a bar of music. Upper strip: short tall blocks with short low
  blocks between them. Lower strip: long tall blocks with long flat gaps.

**Labels, exact.**

| Where | Label |
|---|---|
| Lower block | "Fat" |
| Upper block | "Fat-free mass: everything else (muscle, bone, water)" |
| Right panel, fat block | "Less, on average" (`fm_all`) |
| Right panel, other block | "A little more, on average" (`ffm_all`) |
| Under the top band | "The trials did not test why." |
| Upper strip, title | "Short bursts, short active rests" |
| Upper strip, tall block | "Hard effort, 60 seconds or less" (`ffm_le60`, `fm_le60`) |
| Upper strip, low block | "Easy movement, 90 seconds or less" (`ffm_rest_le90`, `ffm_active`) |
| Lower strip, title | "Long bursts, long still rests" |
| Under the strips | "The authors found the first pattern more effective." (`recipe`) |

**Measured, proposed, sketch.**

- Measured: the direction marks on the two blocks (`fm_all`, `ffm_all`), the trial length
  (`trials`), the burst and rest cut-offs (they are the paper's own subgroup edges).
- Proposed (dashed outline round the upper strip): the authors' recipe (`recipe`, a
  statement).
- Sketch: the two-block body rests on `concept:fat-free-mass` (to be written and reviewed).
  Tag "Sketch, not data" in the top band. Block sizes and strip block counts are geometry
  props.

"The trials did not test why" states what was measured; it is not a limitation of a
mechanism, because the figure offers none.

**Colour.** Pastel: none. Bright orange: "Less" and "A little more". Monochrome: outlines,
blocks (`--muted` for fat, `--ink` outline for the rest), both strips.

**Simulator.** None.

**Card vs full.** Card: the top band only, with "Fat", "Fat-free mass: everything else (muscle, bone, water)",
"Less, on average", "A little more, on average". Full: both bands.

### 4B. What happens to you: "the order flips"

**Headline:** "Sold on fat loss. The surest result is that fat-free mass held up."

**Composition (328 × 320).**

- **Phase marks.** Left edge "Start". Right edge "After 3 to 15 weeks of training"
  (`trials`). No line joins them: the paper prints end differences only.
- **Three result rows (each 328 × 64), ordered by how sure the evidence is**, strongest at
  the top. Each row is a horizontal scale with a vertical "no change" line, a pastel band
  for the 95% range, and a point mark. Each row has its own scale and unit; rows never share
  a value axis.
  1. Fat-free mass: `ffm_all` (+0.51 kg, 0.06 to 0.95), grade `grade_ffm`.
  2. Fat mass: `fm_all` (−1.86 kg, −2.55 to −1.18), grade `grade_fm`.
  3. Body fat percentage: `bf_all` (−1.53 points, −2.13 to −0.92), grade `grade_bf`.
- **Left margin (60 px), "the pitch".** A plain text list in `--meta`, in the order the
  thing is usually sold: "fat loss" first, "lean mass" last (owner, 2026-11-15: "muscle" never stands in for fat-free mass). A thin bracket joins each word to
  its row, so the reader sees the lines cross. The bracket has no arrowhead: it shows a
  ranking.
- **Sensitivity row (full view only, 328 × 40, hollow).** Under row 1, an outline band with
  no fill: `ffm_loo` (−0.46, −1.38 to 0.44).

**Labels, exact.**

| Where | Label |
|---|---|
| Left margin, title | "How it's sold" |
| Rows, title | "What 36 trials found, surest first" (`trials`) |
| Row 1 | "Fat-free mass: +0.51 kg" · grade words "strong evidence" |
| Row 2 | "Fat: −1.86 kg" · "decent evidence" |
| Row 3 | "Body fat share: −1.53 points" · "early evidence" |
| Each no-change line, named once | "No change" |
| Each band, named once | "Range for the study average" |
| Sensitivity row | "With one trial left out: −0.46 kg, and the range crosses no change." (`ffm_loo`, `lim_loo`) |
| Under the chart | "Compared with people who did no training. Mostly inactive adults carrying extra weight." (`lim_population`) |

**Measured, proposed, sketch.**

- Measured: every row, every grade, the sensitivity row.
- Proposed: none in the still. The left margin's "How it's sold" is not a fact from the
  paper; it is the read's own hook, drawn as plain text with no mark and no number, and it
  goes through the lint as wording.
- Sketch: none.

**Colour.** Pastel: the three pooled bands. Bright orange: the three point numbers.
Monochrome: no-change lines, the margin list, grade meters, the hollow sensitivity band, and
every subgroup row in the simulator.

**Simulator (compare-bars; inputs: cycling, treadmill or overground running; 2 or 3 sessions
a week; bursts of 60 s or less, or longer; rests of 90 s or less, or longer; active or
passive rest; longer than 8 weeks or not).**

- Under each pooled row, one thin monochrome row appears per matching subgroup the paper
  prints for that outcome, each labelled "subgroup result" with its setting: for example
  under fat mass, "cycling" (`fm_cycling`), "3 sessions a week" (`fm_3wk`), "bursts of 60
  seconds or less" (`fm_le60`), "rests of 90 seconds or less" (`fm_rest_le90`), "active
  rest" (`fm_active`), "longer than 8 weeks" (`fm_over8`).
- Subgroup rows are half the height of the pooled row and drawn as `--muted` outlines with a
  small point mark. The pooled row stays pastel and reads first.
- A subgroup whose range crosses "no change" is labelled "no clear change in this subgroup"
  (for example `fm_treadmill`, `ffm_gt60`, `ffm_passive`, `bf_2wk`).
- A setting the paper prints no subgroup for under an outcome shows nothing for that
  outcome, with the line "Not reported for this outcome". A routine that matches no subgroup
  at all shows "Not tested" and the pooled rows only.
- **No combined number, ever.** Subgroups overlap in trials; the result sentence lists them:
  "Your routine matches 6 tested subgroups for fat. Each is shown separately. They cannot be
  added together."
- A long list of subgroup rows scrolls inside the figure in full view; the three pooled
  rows stay pinned.

**Card vs full.** Card (members' card, amendment A: hook and one figure): the three pooled
rows with their point numbers and grade words, and the "How it's sold" margin. No
sensitivity row, no inputs. Full: everything. **Feed card pick: 4B, its still view (R7: no reader-dependent numbers).**

---

## 5. Six standing rules for future papers' figures

1. **Two figures, two jobs.** A is a drawing of objects that answers "why"; B is a story
   chart that answers "what happens to you" and hosts the simulator. If the paper offers no
   mechanism, A draws what was done or who was studied, and says the paper did not test why.
   If A needs a caveat to be honest, it moves to the audit layer.
2. **Every mark declares its class.** Solid is measured and names a fact id. Dashed is the
   authors' proposal and names their sentence. Dotted is a sketch, says "Sketch, not data"
   on the figure, rests on a reviewed concept, and carries no digit, tick or value axis. If a
   mark fits none of the three, it is not drawn.
3. **No number is invented, and no size stands in for one.** Where the paper prints no
   value, objects are drawn the same size in both states and the label carries the finding.
   A count grid uses the paper's raw numbers and nothing else.
4. **A sketch bends to the finding, never the other way.** Write the paper's primary result
   on a card first, then draw. Any shape that a reader could take as a different result (a
   "crash" before a night that showed no difference, a gap where the total showed none) is
   redrawn or removed.
5. **The design decides the arrows.** Randomized trials may draw one solid arrow for the
   tested effect. Observational papers draw none: groups sit side by side, the raw gap stays
   monochrome, and the words say "link" and "people in this group", never "your risk".
6. **Colour is rationed.** One pastel fill per figure, on the paper's key result or its
   band. Bright orange on the one or two numbers to remember. Everything else, including
   the reader's own input, is monochrome. If a figure seems to need a fourth role, the
   figure is doing two jobs: split it.
