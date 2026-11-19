# Step 3B: what the lint refused in the draft, and the fix (2026-11-19)

The model's draft is saved as `editorial-as-drafted.json`, and the run that refused it as
`draft-1.txt`. The rules stayed as they were; every fix is in `editorial.json` or a fact label in
`extraction.json`. The final lint run is in `lint-after-fixes.txt`.

## Round 1: the model's draft (15 refusals, `draft-1.txt`)

| # | Refusal | Before (model) | After |
|---|---|---|---|
| 1 | `[headline] card.question`: "how many" presupposes an answer | Does sleeping longer at home reduce how many calories adults eat? | Do adults eat less when they sleep longer at home? |
| 2 | `[glance] glance.figure`: "estimate-explorer" is not one of the read's figures | `"figure": "estimate-explorer"` | `"figure": "energy-ledger"`, the mechanism figure built for this read |
| 3 | `[one-claim] title`: one clause cites 2 results | Adding 1.2 hours of sleep cut daily intake by 270.4 kcal without a diet | Two weeks of longer sleep at home: what 80 adults then ate |
| 4 | `[one-claim] teaser`: one clause cites 2 results (sleep and intake) | In a 4-week trial of 80 adults with overweight, extending sleep by 1.2 hours a night reduced daily energy intake by 270.4 kcal compared with habitual sleep. | Sleep advice added 1.2 hours of sleep a night. Over 2 weeks they ate 270.4 kcal a day less than the control group, with no diet. (Separate sentences.) |
| 5 | `[one-claim] teaser`: one clause cites 2 results (control and sleep group) | Look closer, and half of that gap came from the control group eating more. | Part of that gap came from the control group eating more than before. |
| 6 | `[orphan] populationPanel`: 80 is not in the cited passages | All 80 were randomized to extend their sleep or keep their usual schedule for 2 weeks at home. | 80 is now cited from `overall_mean_age`, in the panel's first sentence. Then: "Chance put each of them into longer sleep or their usual schedule, for 2 weeks at home." |
| 7 | `[H3] card.support`: "burned" without the studied population | Energy burned did not show a clear difference between groups. | The energy adults burned showed no clear difference between the groups. |
| 8 | `[one-claim] carousel.slides[0].heading` | 1.2 extra hours of sleep cut daily intake by 270.4 kcal without a diet | Adults who slept longer ate 270.4 kcal a day less |
| 9 | `[orphan] carousel.slides[1].heading`: a number with no citation | What changed in 2 weeks [-] | What changed in 2 weeks [baseline_and_intervention_periods] |
| 10 | `[H3] carousel.slides[1].body`: "burned" without the population | Energy burned showed no clear difference. | The energy participants burned showed no clear difference. |
| 11 | `[plain] facts.sleep_efficiency_ns.label`: "significant" outside the receipts | No significant difference in sleep efficiency change | No clear difference in sleep efficiency change |
| 12 | `[plain] facts.daytime_activity_counts_ns.label` | No significant change in actigraphy daytime activity counts | No clear change in total energy burned or daytime activity counts (the quote covers both) |
| 13 | `[H11] layers.mechanism[2]`: 36 words | Because intake dropped and burn stayed steady, adults in the sleep extension group shifted into a lower energy balance and lost 0.48 kg over 2 weeks, compared with a 0.39 kg gain in the control group. | With less coming in and the same going out, the ledger moved the other way. Over 2 weeks, the sleep group lost 0.48 kg, while the control group gained 0.39 kg. |
| 14 | `[H11] carousel.caption`: 31 words | In a 4-week randomized trial of 80 adults with overweight, extending sleep by 1.2 hours a night reduced daily energy intake by 270.4 kcal compared with controls, with no prescribed diet. | Three sentences: the trial and who was in it; "Sleep advice added 1.2 hours of sleep a night."; "Those adults ate 270.4 kcal a day less than the control group, with no diet." |
| 15 | `[H7] steps.five-nights-bedtime`: no fact holds 5 | 8.5 hours in bed on at least 5 nights this week (`targetPerWeek: 5`) | Removed. The trial tested every night, not a count of nights, so a weekly target would have needed a number the paper does not give. |

## Errors the lint passed but I fixed after reading the draft against the paper

| What the draft said | What the paper says | Fix |
|---|---|---|
| "a 4-week trial" (teaser, caption) | 2 weeks of usual sleep, then 2 weeks of the change. 4 weeks is how long actigraphy ran (`baseline_and_intervention_periods`, `sleep_monitoring_duration`) | Every mention of the trial's length now says "2 weeks" and cites `baseline_and_intervention_periods`. The protocol layer keeps "a wrist sensor recorded sleep for all 4 weeks". |
| "half of that gap came from the control group" | The control group rose by 114.9 kcal a day, out of a gap of 270.4: about 42% (`ei_ctrl_change`, `ei_diff_in_changes`) | "Part of that gap came from the control group eating more than before." |
| Step "Limit electronic devices before bed", detail "a key habit reported by participants", citing a limitation | The authors' limitations paragraph says limiting devices "appeared to be a key intervention among the participants"; the trial did not test it on its own (`limit_sleep_factors_unassessed`) | Step `devices-away-bed`: "The authors noted this seemed to be a key change for participants. The trial did not test it on its own, so it carries no weight." No `evidenceRef`. |
| Step `aim-8-5-bed` had no `evidenceRef` | The trial's target was 8.5 hours in bed; the tested result is the intake difference | `evidenceRef: ei_diff_in_changes`. The detail adds: "A tick records the bedtime, not your sleep." (H8) |
| "The authors' model predicts about 12 kg" | "the Hall dynamic prediction model": a published model, not the authors' own (`hall_model_prediction`) | "A weight prediction model puts that drop at about 12 kg lost over 3 years if it lasted; the trial did not test that." |
| A glossary with "randomized" and "wrist actigraphy", and no entry for BMI or kcal | The read never uses "actigraphy". BMI and kcal appear in the reader's layers | Glossary: BMI, kcal, fat-free mass (the reviewed concept `fat-free-mass`). |

## Round 2: my rewrite (10 refusals)

| Refusal | Before (my first rewrite) | After |
|---|---|---|
| `[orphan] glance.alt`: a causal sentence with no citation | For each group, a bar for food eaten and a bar for energy burned. [-] | Food eaten and energy burned by adults in each group, drawn as bars. [energy_intake_method, dlw_method] |
| `[H3] glance.alt`: "burned" without the population | (same) | (same: "by adults") |
| `[H3] layers.mechanism[0]` | Food goes into one column; the energy your body burns, at rest and on the move, goes into the other. | Food goes into one column. The energy people burn, at rest and on the move, goes into the other. |
| `[H3] layers.protocol[1]` | Researchers measured the energy each person burned, … | Researchers measured the energy participants burned, … |
| `[H3] layers.audit.limitations[2]` | The method that measured energy burned is precise to about 5%, … | The method that measured the energy participants burned is precise to about 5%, … |
| `[H3] layers.audit.more[0]` | Total energy burned (53.9 kcal a day lower, P = .19) and energy burned through activity showed no clear difference between groups. | Total energy participants burned (53.9 kcal a day, P = .19) and energy burned through activity showed no clear difference. |
| `[plain] layers.audit.more[0]`: "lower", but the range crosses zero | (same: "53.9 kcal a day lower") | "53.9 kcal a day", with no direction word (the 95% range is −134.9 to 27.1) |
| `[H3] layers.audit.more[1]` | Resting energy burned while fasting was 32.5 kcal a day lower (P = .047); … | At rest while fasting, participants in the sleep group burned 32.5 kcal a day less (P = .047); … |
| `[H10] layers.audit`: 263 words, budget 250 | The weak-end paragraph ended "The trial lasted 2 weeks, so the range says nothing about months." | Removed: it repeated limitation 2. |
| `[figure] layers.mechanism.figure`: unknown figure | `energy-ledger` was not built yet | Built in `components/papers/sleep-extension-energy-intake/figures/EnergyLedger.tsx` and registered |

## Round 3 (1 refusal)

| Refusal | Before | After |
|---|---|---|
| `[H10] layers.audit`: 257 words, budget 250 | The control group ate more and gained weight during the trial, and that rise is part of the gap. / Funded by the US National Institutes of Health; the authors report no conflicts of interest. | The control group's rise in intake and weight may have added to the gap. ("may have contributed" is the paper's wording.) / Funded by the US National Institutes of Health; no conflicts of interest reported. |

## Round 4: once the figure existed (1 refusal)

| Refusal | Before | After |
|---|---|---|
| `[H3] layers.mechanism.figure.alt`: "burned" without the studied population | Two groups, one above the other, each with a bar for food eaten and a bar for energy burned. | Two groups of adults, one above the other, each with a bar for food eaten and a bar for energy burned. |

Final run: `lint-after-fixes.txt`. Lint ok, 601 words (mechanism 142, protocol 85, audit 250).
Three warnings remain, none of them errors: "was studied" may be passive, plus two audit sentences
of 27 and 24 words (the warning starts at 22).

## After a sentence-by-sentence read against the quotes (`draft-for-review.md`), no lint refusal

| What it said | Why it was wrong | Now |
|---|---|---|
| Hook: "Most weight trials tell people what to eat or how much to move. [-]" | A claim about other trials with no source; the paper does not say it | "This trial gave 80 adults no diet and no exercise plan. It aimed to change one thing, their time in bed, and then measured what they ate." |
| "sleep advice added 1.2 hours of sleep a night" (teaser, caption, takeaway) | 1.2 hours is the difference in change against the control group, not a gain from baseline (`sleep_duration_diff`) | "Sleep advice gave the sleep group 1.2 hours more sleep a night than the control group." |
| "Across everyone, each extra hour of sleep went with about 162 kcal a day less food." | "Considering all participants" belongs to the correlation's sentence, not to the cited fact's quote | "Each extra hour of sleep went with about 162 kcal a day less food." |
| "With less coming in and the same going out, …" | Energy burned showed no clear difference; that is not "the same" | "With less coming in and no clear change going out, …" |
| Receipts: "A weight prediction model puts that drop at …" | Each receipt stands alone in a list, so "that drop" pointed at nothing | "A weight model predicts about 12 kg lost over 3 years if a drop of about 270 kcal a day lasted; the trial did not test that." |
| Straight apostrophes in reader text | The UI rules ask for curly quotes | ’ throughout the read |

The lint still passes: 596 words (mechanism 141, protocol 85, audit 248), with the same kinds of
warning (`lint-after-fixes.txt`).
