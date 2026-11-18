# Personal simulators

The owner's decisions of 2026-11-14. This is the plan the code is built to; where the code
already exists the file is named. Rules H7 and H12 (CLAUDE.md) and the `science-content` skill
still hold everywhere: this file never relaxes them.

## a. Principle

Every read's figure, in **full** mode, has a personal simulator. The reader types their own
values and sees their own result, built only from gated facts: a range never a single number
(H12), under the band's own label (section h) and `ESTIMATE_LABEL` ("Estimate from the study's
numbers, not medical advice"), with the source line ("From the paper" or "From another study:
<cite>, <grade>"). Caffeine is the template; the other kinds follow its shape.

## b. Five layers

```
gated facts          extraction.json → the gate (lib/pipeline/gate.ts). Numbers, spreads, quotes.
   ↓
figure spec          editorial.json: { kind, facts: {param: id}, simulator: {param: id} }. Data only:
                     ids, never a literal number (lib/content/figure-kinds.ts).
   ↓
build check          specProblems + the lint: the kind exists, every id is a gated fact, a
                     simulator's fact has a band (H12), context facts are cited like any other,
                     excluded facts are refused. Then the fallback chain (section g).
   ↓
model                pure maths in lib/models/ (decay.ts, spread.ts, ...). No React, no I/O.
   ↓
chart kind           components/figures/kinds/<Kind>.tsx, one component, mode "card" | "full".
                     The feed draws card (the still picture); the read draws full (picture +
                     simulator). Layout sums live beside it (components/figures/<kind>-layout.ts).
```

## c. Kinds and their simulators

| Kind | Reader enters | Reader sees | Hard limits |
|---|---|---|---|
| decay | time of dose, amount, (bedtime) | the range left now / at bedtime | the band from the half-life's spread; nothing past the curve is extrapolated silently |
| association-curve | their own value | the band (group) they fall in, and that group's printed result | interpolate only inside the measured range; no causal language, whatever the wording |
| compare-bars | their routine | which tested protocol it matches, and the pooled result | never combine subgroups; an unmatched routine says so |
| grid | their combination | the matching tested cell and its printed value | only cells that were tested |
| dose-response | their dose | the effect range | inside the tested dose range only; outside it the simulator says "not tested" |
| step-through | nothing | tap to advance | no simulator |

## d. After the result

Under the result: **Related reads**, other published papers sharing a tag. The simulator never
prompts for the Life Game (no "add this to your tracker" from a result): the protocol section of
the read does that, as now.

## e. Reader inputs

Stored on the device only, like the theme (`lib/start.ts` is the pattern): never in the
database, never synced. A reader's typed dose is not user history (rule 5 is about what the
user did; this is a scratchpad).

**Built 2026-11-19.** `lib/reader-inputs.ts` (pure): one key per paper and simulator,
`sd.sim.<slug>.<simulator>`, holding `{ v: 1, values }`; each simulator's shape lists its fields
and their checks (the simulator's own range and shape). A stored value that fails is dropped,
never clamped, so an unset input stays unset (H12). Figures get `remembered` as a prop; the hook
and the clear control are in `components/read/remembered.tsx`; the feed card never gets
remembered values (R7). A new kind or figure that holds input adds its shape to `KIND_INPUTS`,
`figureInputs` or `simulatorInputs`; with no entry it remembers nothing. Clear by the simulator,
or all of them on Me. BUILD-LOG 2026-11-19.

## f. Tier

The simulator follows the read's tier. A free read has a free simulator; a members' read's
simulator ships only with the members' content (rule 7: gated on the server, never hidden
with an `if`).

## g. Missing facts: fact library, publish first, upgrade later

- **Fact library.** Approved, gated context facts form a reusable library (first entry:
  `caffeine-saliva-half-life/half_life_caffeine`). Once the owner approves a library fact, any
  paper may use it without approving it again. Built: `content/library.json` (each entry names
  `ref`, `quantity`, `approved { by: "owner", on }` and a `note`; never a number),
  `lib/content/fact-library.ts` (`libraryProblems`, `simulatorSource`, `libraryFor`), loaded by
  `scripts/context-load.ts`. A library entry must be a gated, not withdrawn, not excluded
  estimate with a printed spread; any problem stops the build. The lint refuses a context fact
  in a spec's `simulator` group unless it is in the library (the still figure is unaffected).
- **Build check order** for each simulator input:
  1. the paper's own gated facts;
  2. the approved library;
  3. otherwise: publish the read with the tap-to-explore (card) figure and no simulator, and
     queue a **simulator upgrade** in `/admin/queue` with 1 to 3 Europe PMC candidates (licence
     from the API, not retracted, the body text states the value with a spread).
- The owner reviews upgrades in a **weekly batch**: no alert per item. On approval the fact
  joins the library and the figure upgrades on the next build. The text of the read does not
  change.
- Background concepts never feed a number. A fact listed in a study's `excluded.json` never
  feeds a simulator (the lint refuses the citation).

## h. Spreads (ruling C)

A fact may carry one spread, captured verbatim and checked by the gate (`spreadProblem`).
`simulatorBand` (`lib/models/spread.ts`) turns it into the band and its label:

| Spread | Band | Label shown |
|---|---|---|
| sd | mean − 1 SD to mean + 1 SD | typical spread between people in this study |
| ci95 (or an estimate's own CI) | the printed ends | range for the study average |
| range | the printed ends | range in this study |
| iqr | the printed ends | middle half of people in this study |

**Never convert one into another.** Worked example, the caffeine half-life (5.15 ± 1.21 h,
n = 12):

- SD band: 5.15 − 1.21 = **3.94 h** to 5.15 + 1.21 = **6.36 h**. About two people in three
  fall inside it, if the spread is roughly normal. It says how much *people* differ.
- A 95% CI for the *average* would be 5.15 ± 1.96 × 1.21 / √12 = 5.15 ± 0.68, so **4.47 to
  5.83 h** (a t-interval with 11 degrees of freedom gives 4.38 to 5.92). It says how sure the
  study is of its average, and it shrinks as the study grows.
- This CI is **not printed in the paper**, so it may never be shown (the gate refuses a ci95
  whose ends are not in the quote; a test holds this). It is here only to show the difference.

A personal simulator is about one person, so it uses the SD when the paper prints one. When a
paper prints only a CI, the simulator uses the CI and says "range for the study average": the
reader is told it is the uncertainty of an average, not the spread between people.

## i. Worked example: caffeine, "coffee time vs bedtime"

The reader has 95 mg of caffeine at 4 pm and goes to bed at 11 pm: 7 hours. Using the SD band
3.94 to 6.36 h and the decay model (`lib/models/decay.ts`, share left = 0.5^(hours / half-life)):

| Half-life | Share left after 7 h | Left of 95 mg |
|---|---|---|
| 3.94 h | 0.5^(7 / 3.94) = 0.292 | ≈ 28 mg |
| 5.15 h | 0.5^(7 / 5.15) = 0.390 | ≈ 37 mg |
| 6.36 h | 0.5^(7 / 6.36) = 0.466 | ≈ 44 mg |

Shown as **"about 28–44 mg at bedtime"**, never the 37 alone. Caveats shown beside it, from the
gated study: tested at 25 mg, measured in saliva, n = 12 young adults, grade low, caffeine-alone
arm only (the arm with methylliberine and theacrine is excluded). The 95 mg is the reader's own
input, not a fact.

---

## j. Figure plans (owner, 2026-11-14; planned, not built)

### j1. A new visual class: the sketch (owner's ruling, 2026-11-15)

Where the paper measured something relevant, the figure draws that data: solid, bound to fact ids.
Otherwise it may draw a **sketch**: a shape only, no numbers. It shows how something behaves when
the paper prints no values for it (sleep pressure over a day, a glucose curve). It has its own
look, so no one mistakes it for data (rulings R1, R2):

- a thin **dotted** line in monochrome ink (`--ink`, `--muted`, `--meta` or `--line`), no fill of
  its own, never orange (the earlier sage wash is dropped);
- no axis ticks, no gridlines, no value axis and no band;
- the tag **"Sketch, not data"** on the figure itself, not only in the caption.

The three classes read apart at a glance: solid means measured, dashed means proposed by the
authors, dotted means a sketch.

**The ruling.** A sketch may rest only on a background concept **the owner has reviewed**
(`content/concepts/<slug>.json`, `reviewed_by_owner` set by `approve-concept`). It never shares a
value axis with data (it may share the time axis), and it never contradicts the paper's finding.
A concept still never feeds a number (H7, H12).

Enforced by code (`lib/content/sketch.ts`, called by the lint for each entry of the editorial's
`sketches`; fixtures in `lib/content/sketch.test.ts` and `lib/pipeline/sketch-lint.test.ts`):

- `sketch-number`: a digit in any of its words, any number in the spec, or a field that would
  carry a value or a fact (`facts`, `ticks`, `values`, `axis`, `ref`, `n` ...);
- `sketch-concept`: no concept, an unknown or failing concept, or one the owner has not reviewed;
- `sketch-colour`: an ink that is not monochrome, or any word naming orange or the finding's
  colours; and `scripts/visual-system.test.ts` fails a sketch component that uses an orange token;
- `sketch`: the tag is not exactly "Sketch, not data", the stroke is not dotted, or no alt text.

### j2. The pattern for every figure

- **A takeaway headline above the chart**, in plain words. It says what to see, not what is drawn.
- **Labels on the lines**: each line, band or bar is named where it sits. No legend.
- **A story over time where it fits**: the x axis is the reader's day or the study's follow-up,
  so the figure reads left to right as something that happens.
- **The paper's own result sits in its own box beside the chart**, never joined to a modelled
  line.

### j3. Caffeine: the "hidden tiredness" day chart

- **Headline:** "Caffeine hides tiredness; it doesn't remove it."
- **The day:** the x axis runs from waking to bedtime, in words ("wake", "noon", "bed"), with no
  clock ticks. The reader's own times come in the simulator.
- **Sleep pressure (sketch):** a dotted monochrome line rises through the day, labelled "Sleep
  pressure keeps building" (`concept:adenosine`, once reviewed). A second dotted line, "How tired
  you feel", runs under it while caffeine is in the body. The gap between the two is hatched in
  `--line` (no fill) and labelled "Hidden tiredness". The layer carries "Sketch, not data".
- **The caffeine curve (data):** solid ink, driven by the real half-life band
  (`caffeine-saliva-half-life/half_life_caffeine`, peach band, "From another study: Wildgrube et
  al., early evidence"), stacked over the paper's three doses (`dose`, `schedule`: 45, 255 and
  475 min after waking). Stacking the doses is a model step, so the curve is labelled "Estimate
  from the study's numbers" (H12).
- **In its own box:** "This study: sleep showed no clear difference from placebo nights"
  (`sleep_same`), with its source line. Nothing links the box to the curve.

### j4. Turmeric: the annotated drawing

- **Headline:** "Pepper may slow the first rise in blood sugar; the paper measured only the
  last step."
- **The drawing:** a simple left-to-right picture:
  1. mouth;
  2. the heat sensor (`trpv1_mouth`, `trpv1`);
  3. the gut's "food has arrived" signal (`glp1`, `gut`);
  4. blood sugar.

  Steps 1–3 are unmeasured, so they are drawn faint and dashed and cite the authors' proposing
  sentences. Their caveat (`lim_mechanism`) stays in the audit (H10). Step 4 is solid.
- **Blood sugar:** a sketch (dotted, monochrome, "Sketch, not data"), since the paper prints no
  glucose values. It shows two curves after a meal, labelled "plain" and "with pepper", that part
  early and meet again by the end. On it, solid dots mark the readings that were taken
  (`timepoints`). One filled dot at 30 min is labelled "differed" (`glucose_30`). A bracket over
  the whole span reads "total: no clear difference" (`glucose_total`).
- **Rule:** the sketch's gap is never given a height. The 30-min dot carries no value, because
  the paper prints none.

### j5. Steps: a week and ten years

- **Headline:** "People who hit 8,000 steps on just 1–2 days a week had a lower 10-year death
  rate than people who never did." It describes an association, so there is no arrow.
- **The week:** a strip of seven day-boxes per group, ticked to show the group's span
  (`threshold`, groups 0, 1–2 and 3–7). The reader's own week is ticked in the simulator.
- **Ten years:** the x axis runs from the start of the study to "10 years later" (`followup`).
  Each group ends in a solid bar showing the share who died, labelled raw (`crude_0`,
  `crude_1_2`, `crude_3_7`). Beside it, a bracket shows the group's adjusted difference as a
  peach band (`ard_1_2`, `ard_3_7`).
- **Rule:** no line is drawn between the start and the end, because the paper prints only the
  end values.
- **Under the chart:** "Who this was tested in", plus the plateau note (`plateau`: the curve
  flattened at 3 to 4 days a week).

### j6. HIIT: "the order flips" (members)

- **Headline:** "Sold on fat loss; the strongest evidence is for keeping fat-free mass."
- **The chart:** two columns.
  - Left, "What it's sold on": fat loss first, drawn as plain text with no data.
  - Right, "What the pooled trials found": the three results, ordered by how sure the evidence
    is (`grade_ffm` strong, `grade_fm` decent, `grade_bf` early). Each is a peach band with its
    point and a no-change mark (`ffm_all`, `fm_all`, `bf_all`). The grade meter and words sit on
    each row.
  - A bracket shows the order flipping between the columns. This is a ranking, not a causal
    arrow.
- **Story over time:** the trials' span (`trials`: 3 to 15 weeks) labels the x axis of an inset
  for the simulator's settings. Only subgroups the paper prints are offered (`ffm_over8`,
  `fm_cycling` and the rest); nothing is interpolated.

## Appendix: design notes for the four papers

Each note uses only the gated facts in the paper's `extraction.json` (and, for caffeine, the
gated context study). Ids in `code`.

### 1. Caffeine: decay, "coffee time vs bedtime" (`daytime-caffeine-sleep`, free)

**Built 2026-11-14.** `editorial.json` `simulator: { kind: "decay", spec, words }`: the spec
names the library half-life; `words` holds the alt text, the half-life note and the paper's
finding (markup, linted like the read). `components/figures/kinds/Decay.tsx` (full mode),
`components/read/KindSimulator.tsx`, sums in `components/figures/decay-layout.ts`.

- **Reader enters:** when they had caffeine, their amount in mg, and their bedtime. **No dose
  presets** (owner, 2026-11-14): how much caffeine is in a cup is not a gated fact, so the app
  offers no "one coffee = 95 mg" button. The field is empty until the reader types, and is
  labelled **"your amount"**: the number is theirs, not the study's.
- **Reader sees:** the range left at bedtime, on the halving curve, as a band plus one plain
  sentence. **Beside the band, the paper's own sleep finding** (owner, 2026-11-14): in daily
  users, with the last 150 mg dose 8 hours before bed, measured sleep did not differ from
  placebo nights (`sleep_same`, `recording`, `who`). It is shown as what the study found in
  its population, never as a prediction for the reader's night. With 95 mg at 4 pm and bed
  at 11 pm: 95 × 0.5^(7 / 3.94) ≈ 28 mg to 95 × 0.5^(7 / 6.36) ≈ 44 mg, "about 28–44 mg"
  (section i), under "typical spread between people in this study".
- **Fact ids:** `caffeine-saliva-half-life/half_life_caffeine` (mean 5.15 h, sd 1.21; library);
  from the paper, for the caption and caveats: `dose` (3 × 150 mg), `schedule`, `recording`,
  `sleep_same`, `later_bed` (about 25 min later at home), `lim_male`, `lim_young`, `lim_n`.
- **Why decay:** the read's question is "is my afternoon coffee still in me at night?". A level
  that halves on a schedule is exactly what a decay curve shows, and the reader's own clock is
  what a still picture cannot show.
- **Missing facts:** the paper prints no half-life, so its own facts cannot feed the simulator.
  Filled through the library: the context study, owner-picked and gated (crossover, grade low),
  arm D excluded. The band is not a sleep prediction: the sleep finding beside it says what
  happened to habitual users (300 to 600 mg a day, `who`) given 3 × 150 mg a day (`dose`),
  whose sleep did not differ from placebo (`sleep_same`). The two sit side by side, each with
  its own source line; no sentence joins them into "so you will sleep fine".

### 2. Steps: association-curve (`steps-days-per-week`, free)

**Built 2026-11-14.** `simulator: { kind: "association-curve", spec: { raw: [crude_0, crude_1_2,
crude_3_7], adjusted: [ard_1_2, ard_3_7] }, params: { groups } (edges and mean ages as { n, ref }),
words: { alt, headline, ask, who } }`. `components/figures/kinds/AssociationCurve.tsx`, sums in
`components/figures/association-layout.ts`; `kindParamsProblems` checks groups line up with the
spec. The models comparison and the cardiovascular outcome of the old hand-built simulator are
not in the kind; both stay in the read's text and receipts.

- **Reader enters:** on how many days a week they reach 8,000 steps (0 to 7).
- **Reader sees:** their band and its printed numbers, with no causal verb. The labels say which
  number is which (owner, 2026-11-14): 14.1% against 40.7% is **raw** (unadjusted: the groups
  differ in age and health), −14.9 points is **adjusted**. **"Who this was tested in"** (H3)
  sits directly under the result, not further down the page. Example, 2 days →
  the "1–2 days" group: 14.1% of that group died within 10 years (75/532, `crude_1_2`) against
  40.7% of the 0-day group (257/632, `crude_0`). Adjusted difference −14.9 points (95% CI −18.8
  to −10.9, `ard_1_2`), labelled "range for the study average" (a CI, not a spread between
  people). 3 to 7 days → 5.5% (`crude_3_7`), −16.5 points (−20.4 to −12.5, `ard_3_7`). No sums:
  every number is printed.
- **Fact ids:** `threshold`, `crude_0`, `crude_1_2`, `crude_3_7`, `ard_1_2`, `ard_3_7`,
  `plateau` (a statement: drawn dashed), `confounding`, `one_week`, `hawthorne`, `cohort`.
- **Why association-curve:** a cohort shows how risk went with a habit across groups; a band
  per group shows that without implying the steps did it (H3). The groups are the measured
  range: there is nothing to interpolate inside a group, and nothing outside 0 to 7 days.
- **Missing facts:** none for the band. A personal risk is not computed: the groups differ in
  age (mean 63.7, 51.5 and 46.0 years for 0, 1–2 and 3–7 days, `ages`), and a personal
  prediction from adjusted group differences goes beyond what was
  measured. The simulator says "people in this group of the cohort", never "your risk".

### 3. HIIT: compare-bars (`hiit-body-composition`, members)

- **Reader enters:** their routine: cycling, treadmill or overground running; sessions a week
  (2 or 3); work bursts (60 s or less, or longer); rests (90 s or less, or longer); active or
  passive rest; programme longer than 8 weeks or not.
- **Reader sees:** each tested subgroup their routine matches, side by side, and the pooled
  result; never one combined number. Each subgroup bar is labelled **"subgroup result"** and
  drawn visually secondary to the pooled bar (thinner, muted), so the pooled result reads
  first (owner, 2026-11-14). Example, cycling, 3 sessions, 30 s bursts, 60 s active
  rest, 10 weeks → fat mass: cycling −1.72 kg (95% CI −2.41 to −1.30, `fm_cycling`); 3
  sessions −1.24 (−2.00 to −0.48, `fm_3wk`); bursts ≤ 60 s −2.20 (−3.01 to −1.39, `fm_le60`);
  rests ≤ 90 s −2.26 (−3.08 to −1.43, `fm_rest_le90`); active rest −2.13 (−2.99 to −1.27,
  `fm_active`); over 8 weeks −1.92 (−2.35 to −1.50, `fm_over8`). Pooled: −1.86 (−2.55 to
  −1.18, `fm_all`; grade moderate, `grade_fm`). Fat-free mass: cycling +0.63 (0.17 to 1.09,
  `ffm_cycling`), the only modality that raised it (`ffm_only_cycling`).
- **Fact ids:** the `fm_*`, `ffm_*` and `bf_*` estimates; `grade_ffm`, `grade_fm`, `grade_bf`;
  `recipe` (the authors' settings: a statement, drawn dashed); `lim_population`,
  `lim_heterogeneity`, `lim_methods`, `lim_loo`.
- **Why compare-bars:** a meta-analysis reports one subgroup at a time. Bars per matching
  subgroup show "where your routine was tested" honestly, and every bar is a printed estimate.
- **Missing facts:** a combined estimate for a routine that matches several subgroups does not
  exist, so it is never computed (subgroups overlap: adding them would count the same trials
  twice). A routine that matches no subgroup (for example a rowing machine) gets "not tested"
  and the pooled result only. Members only: the simulator ships with the members' content.

### 4. Turmeric: grid (`turmeric-pepper-breakfast`, free)

- **Reader enters:** their combination: black pepper (1 g) yes or no, turmeric (1 g) yes or
  no, in the egg breakfast that was tested (`meals`, `in_egg`, `plate`).
- **Reader sees:** the matching tested cell and its printed findings, in plain words. **No
  p-values in the grid** (owner, 2026-11-14): a cell says "lower at 30 min, a clear difference
  in this study"; the p-values (p = .023, `glucose_30`) live in the Receipts. Example, pepper +
  turmeric → blood glucose 30 minutes after eating lower than the plain meal, a clear
  difference in this study (`glucose_30`, `glucose_lower`; no size printed), no difference
  over the whole 3 hours (`glucose_total`); less hunger, more satiety (`appetite`); overall
  pleasantness 6.6 ± 0.42 on a 9-point scale against 6.5 ± 0.39 for the plain meal
  (`taste_both`, `taste_c`). Turmeric alone → no effect on glucose (`turmeric_none`),
  pleasantness 6.1 ± 0.40 (`taste_tr`). No arithmetic: values are shown as printed.
- **Fact ids:** `meals`, `in_egg`, `plate`, `glucose_30`, `glucose_lower`, `glucose_total`,
  `turmeric_none`, `turmeric_dose`, `appetite`, `fullness_ns`, `gut`, `taste_rank`,
  `taste_c`, `taste_bp`, `taste_tr`, `taste_both`, `sugar_row` (the combined meal had 10 g of
  sugar, the others 8 g: shown as a confound), `lim_stated`, `lim_hormones`, `lim_taste`.
- **Why grid:** a 2 × 2 design (pepper × turmeric) is a grid, and the reader's choice is one
  cell. Only the four tested cells exist; there is no dose to slide.
- **Missing facts:** the glucose values per meal are printed only in Figure 1 (an image), so
  the cells carry direction and p-values, not a glucose number; that stays so (H12: no range,
  no estimate). The taste values were re-extracted as estimates (measure mean, spread sd, unit
  points on the 9-point scale; 2026-11-14), so a cell can show each as a band labelled
  "typical spread between people in this study". No
  library or queue path is proposed for glucose: another study's meal would not be this cell.

## Colour scope (owner, 2026-11-15, second pass)

Orange means "this paper's finding" and the orange budget (at most three orange items per 390 px
screen, one focal) applies to **reads, figures, simulators and feed cards**, unchanged. The Life
Game (`/today`, its habit tiles, bars and rings), the companion cat and the Me screen's controls
are **exempt**: they keep their original look, drawn in the pastel tokens (`--signal-evidence-fill`,
`--signal-evidence-pale`, `--signal-evidence-soft`). The exemption is the `data-life-game` marker
(and `ProgressRing`'s `lifeGame` prop); `scripts/visual-system.test.ts` fails if it appears in a
read, figure or feed card. Sketches stay monochrome everywhere.
