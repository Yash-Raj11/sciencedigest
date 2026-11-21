# Opus trial, paper 2 of 6: early against mid-day time-restricted eating, a draft for your review

Xie Z et al., *Nature Communications* 2022, doi:10.1038/s41467-022-28662-5 (PMC8864028, CC-BY). Free tier. **Not published** (`publishedAt` null).
A randomized trial: 90 healthy adults without obesity in Beijing. For five weeks they ate within 8 hours between 6:00 and 15:00 (early), within 8 hours between 11:00 and 20:00 (mid-day), or as usual. 82 were analysed.

**How this was made.** Claude Opus 5.5 wrote it by hand in Claude Code, with no API key: the extraction with its coverage map, the read, the deck and one figure. The project's real gate and lint judged every file. Treat it as an **upper bound** for a one-shot API run. Every refusal and fix: `fixes.md`.

**What to decide, or look at closely**

1. **The paper never says what its "±" figures are.** Every change is printed as "Δ = −1.08 ± 1.59", and the paper never says SD or SEM (only one figure legend says SEM, for a different analysis). So I recorded each change as a point with no spread. That means no simulator range is possible (H12), and the estimate explorer shows dots only. If you know the ± is an SD, the facts can carry it as `sd`, and the simulator gains a range.
2. **The headline is a between-group result with no size of its own.** The paper gives a p-value for early against mid-day, but no difference with a confidence interval. The read shows each group's change: −1.08, +0.39 and −0.05 HOMA-IR units.
3. **The protocol step carries weight.** "Eat only within 8 hours between 6:00 and 15:00" is backed by the primary result. "Plain drinks outside the window" was part of the rules but not tested on its own, so it carries weight 0.
4. **The deck's "why" slide has no picture**, for the same reason as paper 1: the authors' rhythm idea has no picture motif and no reviewed concept.
5. **Weak points the read states plainly:** participants knew their group; so did the researchers who estimated food from the photos; most participants were women; the trial was small and lasted five weeks; the eight who left were excluded from the analysis.

Every sentence is listed below with the paper's own words for each fact it cites. `[-]` means a sentence cites nothing. Long quotes are cut at 220 characters.
Deck: `deck/sheet-dark.png`, `deck/sheet-light.png` (6 slides, then 1 alternate opening).

## Feed card and top of the read

**Title**

- Same 8 hours, different clock: what changed in 82 adults over five weeks
  - `etrf_window`: “We conducted a randomized, controlled trial, in which participants were randomized to an eTRF group (eating during no more than 8 h between 06:00 and 15:00 and fasting for the rest of the day), an mTRF group (eating duri…”
  - `mtrf_window`: “We conducted a randomized, controlled trial, in which participants were randomized to an eTRF group (eating during no more than 8 h between 06:00 and 15:00 and fasting for the rest of the day), an mTRF group (eating duri…”
  - `analysed_82`: “Remaining 82 participants completed the trial and were included in the present analysis.”
  - `five_weeks`: “We conducted a five-week randomized trial to compare the effects of the two TRF regimens in healthy individuals without obesity (ChiCTR2000029797).”

**Teaser**

- A trial gave healthy adults an 8-hour eating window early in the day, a window at mid-day, or no window.
  - `etrf_window`: “We conducted a randomized, controlled trial, in which participants were randomized to an eTRF group (eating during no more than 8 h between 06:00 and 15:00 and fasting for the rest of the day), an mTRF group (eating duri…”
  - `mtrf_window`: “We conducted a randomized, controlled trial, in which participants were randomized to an eTRF group (eating during no more than 8 h between 06:00 and 15:00 and fasting for the rest of the day), an mTRF group (eating duri…”
  - `control_diet`: “We conducted a randomized, controlled trial, in which participants were randomized to an eTRF group (eating during no more than 8 h between 06:00 and 15:00 and fasting for the rest of the day), an mTRF group (eating duri…”
- Both window groups ate less than before.
  - `ei_groups_differ`: “There was a significant difference in the change in energy intake among the eTRF, mTRF, and control groups (p < 0.001), with the eTRF (Δ = −240 ± 409 kcal/day) and mTRF (Δ = −159 ± 397 kcal/day) groups showing a reductio…”
- The amount they ate showed no clear difference between the two windows.
  - `ei_tr_ns`: “However, there was no difference between the two TRF groups (p = 0.30, Fig. 2a).”
- Only the early group's insulin resistance fell more than the other groups'.
  - `homa_etrf_better`: “The eTRF group showed a larger reduction in HOMA-IR (Δ = −1.08 ± 1.59) than either the mTRF group (Δ = 0.39 ± 0.71, p < 0.001) or the control group (Δ = −0.05 ± 0.75, p = 0.002)”

**Hook**

- Two groups ate within the same 8 hours a day, and both ate less than before.
  - `etrf_window`: “We conducted a randomized, controlled trial, in which participants were randomized to an eTRF group (eating during no more than 8 h between 06:00 and 15:00 and fasting for the rest of the day), an mTRF group (eating duri…”
  - `mtrf_window`: “We conducted a randomized, controlled trial, in which participants were randomized to an eTRF group (eating during no more than 8 h between 06:00 and 15:00 and fasting for the rest of the day), an mTRF group (eating duri…”
  - `ei_groups_differ`: “There was a significant difference in the change in energy intake among the eTRF, mTRF, and control groups (p < 0.001), with the eTRF (Δ = −240 ± 409 kcal/day) and mTRF (Δ = −159 ± 397 kcal/day) groups showing a reductio…”
- Only the group that ate between 6:00 and 15:00 saw its insulin resistance fall clearly.
  - `etrf_choose`: “Participants in the eTRF group were instructed to choose an 8 h eating period between 6:00 and 15:00 and to fast for the rest of the day.”
  - `homa_etrf_better`: “The eTRF group showed a larger reduction in HOMA-IR (Δ = −1.08 ± 1.59) than either the mTRF group (Δ = 0.39 ± 0.71, p < 0.001) or the control group (Δ = −0.05 ± 0.75, p = 0.002)”

**Card question**

- Does an early eating window lower insulin resistance more than a mid-day one?
  - `homa_etrf_better`: “The eTRF group showed a larger reduction in HOMA-IR (Δ = −1.08 ± 1.59) than either the mTRF group (Δ = 0.39 ± 0.71, p < 0.001) or the control group (Δ = −0.05 ± 0.75, p = 0.002)”

**Card headline**

- Insulin resistance fell more with an early window than with a mid-day window.
  - `homa_etrf_better`: “The eTRF group showed a larger reduction in HOMA-IR (Δ = −1.08 ± 1.59) than either the mTRF group (Δ = 0.39 ± 0.71, p < 0.001) or the control group (Δ = −0.05 ± 0.75, p = 0.002)”

**Card support**

- Both windows lasted 8 hours, and food eaten showed no clear difference between them.
  - `etrf_window`: “We conducted a randomized, controlled trial, in which participants were randomized to an eTRF group (eating during no more than 8 h between 06:00 and 15:00 and fasting for the rest of the day), an mTRF group (eating duri…”
  - `ei_tr_ns`: “However, there was no difference between the two TRF groups (p = 0.30, Fig. 2a).”

**Source line: who**

- 82 healthy adults aged 18 to 64
  - `analysed_82`: “Remaining 82 participants completed the trial and were included in the present analysis.”
  - `inclusion_age`: “The inclusion criteria were: (1) 18–64 years old; (2) ability to attend the hospital at regular intervals; (3) ability to independently provide informed consent; (4) BMI between 17.5 and 30.0 kg/m2; (5) daily feeding per…”

**Source line: span**

- five weeks of eating windows
  - `five_weeks`: “We conducted a five-week randomized trial to compare the effects of the two TRF regimens in healthy individuals without obesity (ChiCTR2000029797).”

**Feed card figure alt text**

- Three groups, each with a day strip showing when it could eat and a bar for its change in insulin resistance.
  - `etrf_window`: “We conducted a randomized, controlled trial, in which participants were randomized to an eTRF group (eating during no more than 8 h between 06:00 and 15:00 and fasting for the rest of the day), an mTRF group (eating duri…”
  - `mtrf_window`: “We conducted a randomized, controlled trial, in which participants were randomized to an eTRF group (eating during no more than 8 h between 06:00 and 15:00 and fasting for the rest of the day), an mTRF group (eating duri…”
  - `homa_etrf`: “The eTRF group showed a larger reduction in HOMA-IR (Δ = −1.08 ± 1.59) than either the mTRF group (Δ = 0.39 ± 0.71, p < 0.001) or the control group (Δ = −0.05 ± 0.75, p = 0.002), but there was no difference between the c…”
  - `homa_mtrf`: “The eTRF group showed a larger reduction in HOMA-IR (Δ = −1.08 ± 1.59) than either the mTRF group (Δ = 0.39 ± 0.71, p < 0.001) or the control group (Δ = −0.05 ± 0.75, p = 0.002), but there was no difference between the c…”
  - `homa_ctrl`: “The eTRF group showed a larger reduction in HOMA-IR (Δ = −1.08 ± 1.59) than either the mTRF group (Δ = 0.39 ± 0.71, p < 0.001) or the control group (Δ = −0.05 ± 0.75, p = 0.002), but there was no difference between the c…”

**Population panel**

- Who was studied: 82 healthy adults aged 18 to 64 in Beijing, none with obesity.
  - `analysed_82`: “Remaining 82 participants completed the trial and were included in the present analysis.”
  - `inclusion_age`: “The inclusion criteria were: (1) 18–64 years old; (2) ability to attend the hospital at regular intervals; (3) ability to independently provide informed consent; (4) BMI between 17.5 and 30.0 kg/m2; (5) daily feeding per…”
  - `recruitment`: “Participants were recruited from the Beijing area from Feb. 16th, 2020, to Mar. 22nd, 2020, by means of posters, emails, flyers, social media, and website advertisements.”
  - `inclusion_bmi`: “The inclusion criteria were: (1) 18–64 years old; (2) ability to attend the hospital at regular intervals; (3) ability to independently provide informed consent; (4) BMI between 17.5 and 30.0 kg/m2; (5) daily feeding per…”
- Most were women.
  - `limit_selfselected`: “Secondly, the people who applied to join the trial might already have been interested in TRF or wished to improve their health through making a dietary change, and most were women.”
- All usually ate over more than 8 hours a day.
  - `habit_over_8h`: “Ninety participants who were in the habit of eating over more than 8 h per day and who did not have recent experience of fasting were recruited into the trial after providing their written informed consent.”
- A computer's random numbers put each into one of three groups for five weeks.
  - `randomization`: “Ninety participants were randomized to eTRF (n=30), mTRF (n=30), or control groups (n=30) using a computer-based random-number generator.”
  - `five_weeks`: “We conducted a five-week randomized trial to compare the effects of the two TRF regimens in healthy individuals without obesity (ChiCTR2000029797).”
- People with diabetes, high blood pressure, night shifts or recent fasting could not take part.
  - `exclusion_criteria`: “The exclusion criteria were: (1) night-shift work more than once a week; (2) fasting during the preceding 8 weeks; (3) alcohol consumption more than twice a week; (4) pregnancy, gastrointestinal abnormalities or eating d…”
  - `exclusion_nightshift`: “The exclusion criteria were: (1) night-shift work more than once a week; (2) fasting during the preceding 8 weeks; (3) alcohol consumption more than twice a week; (4) pregnancy, gastrointestinal abnormalities or eating d…”

## Mechanism

**Paragraph 1**

- After you eat, sugar passes into the blood, and the body moves it into muscle and other cells.
  - `concept:post-meal-blood-sugar` (background concept, reviewed: True): “After you eat, sugar from the food passes from the gut into the blood, so the level rises. The body then moves that sugar into muscle and other cells, and the level falls back towards where it started.”
- This trial scored how much insulin the body needs to hold morning blood sugar steady, a measure called insulin resistance (HOMA-IR).
  - `primary_outcome`: “The primary outcome was the change in HOMA-IR, an index of insulin resistance that is calculated using the fasting glucose and insulin concentrations.”
- A higher score means the body works harder to do the same job.
  - `primary_outcome`: “The primary outcome was the change in HOMA-IR, an index of insulin resistance that is calculated using the fasting glucose and insulin concentrations.”

**Paragraph 2**

- Time-restricted eating fits all food into a set number of hours a day.
  - `trf_definition`: “Time-restricted feeding (TRF), in which the daily window for food consumption is restricted to a period of 4–10 h, is thought to be a feasible fasting regimen for most people.”
- Here, two groups had the same 8 hours to eat.
  - `etrf_window`: “We conducted a randomized, controlled trial, in which participants were randomized to an eTRF group (eating during no more than 8 h between 06:00 and 15:00 and fasting for the rest of the day), an mTRF group (eating duri…”
  - `mtrf_window`: “We conducted a randomized, controlled trial, in which participants were randomized to an eTRF group (eating during no more than 8 h between 06:00 and 15:00 and fasting for the rest of the day), an mTRF group (eating duri…”
- One picked its hours between 6:00 and 15:00, the other between 11:00 and 20:00.
  - `etrf_choose`: “Participants in the eTRF group were instructed to choose an 8 h eating period between 6:00 and 15:00 and to fast for the rest of the day.”
  - `mtrf_choose`: “Those in mTRF group were instructed to choose an 8 h eating period between 11:00 and 20:00 and to fast for the rest of the day.”
- Neither got a diet.
  - `eat_freely`: “The participants in both TRF groups were instructed to eat ad libitum during their daily 8 h eating periods and no specific nutritional guidance was given to them, such that the trial conditions were similar to real-life…”

**Paragraph 3**

- Both window groups ate less than before, by 240 and 159 kcal a day.
  - `ei_etrf`: “There was a significant difference in the change in energy intake among the eTRF, mTRF, and control groups (p < 0.001), with the eTRF (Δ = −240 ± 409 kcal/day) and mTRF (Δ = −159 ± 397 kcal/day) groups showing a reductio…”
  - `ei_mtrf`: “There was a significant difference in the change in energy intake among the eTRF, mTRF, and control groups (p < 0.001), with the eTRF (Δ = −240 ± 409 kcal/day) and mTRF (Δ = −159 ± 397 kcal/day) groups showing a reductio…”
- The control group ate 64 kcal a day more.
  - `ei_ctrl`: “There was a significant difference in the change in energy intake among the eTRF, mTRF, and control groups (p < 0.001), with the eTRF (Δ = −240 ± 409 kcal/day) and mTRF (Δ = −159 ± 397 kcal/day) groups showing a reductio…”
- Between the two windows, food eaten showed no clear difference.
  - `ei_tr_ns`: “However, there was no difference between the two TRF groups (p = 0.30, Fig. 2a).”

**Paragraph 4**

- Yet only the early window moved insulin resistance clearly.
  - `homa_etrf_better`: “The eTRF group showed a larger reduction in HOMA-IR (Δ = −1.08 ± 1.59) than either the mTRF group (Δ = 0.39 ± 0.71, p < 0.001) or the control group (Δ = −0.05 ± 0.75, p = 0.002)”
- The score changed by −1.08 in the early group, +0.39 in the mid-day group and −0.05 in the control group.
  - `homa_etrf`: “The eTRF group showed a larger reduction in HOMA-IR (Δ = −1.08 ± 1.59) than either the mTRF group (Δ = 0.39 ± 0.71, p < 0.001) or the control group (Δ = −0.05 ± 0.75, p = 0.002), but there was no difference between the c…”
  - `homa_mtrf`: “The eTRF group showed a larger reduction in HOMA-IR (Δ = −1.08 ± 1.59) than either the mTRF group (Δ = 0.39 ± 0.71, p < 0.001) or the control group (Δ = −0.05 ± 0.75, p = 0.002), but there was no difference between the c…”
  - `homa_ctrl`: “The eTRF group showed a larger reduction in HOMA-IR (Δ = −1.08 ± 1.59) than either the mTRF group (Δ = 0.39 ± 0.71, p < 0.001) or the control group (Δ = −0.05 ± 0.75, p = 0.002), but there was no difference between the c…”

**Paragraph 5**

- The early group also lost weight: 1.6 kg on average, against a 0.3 kg gain in the control group.
  - `mass_etrf_vs_ctrl`: “Multiple comparisons following ANOVA showed that there was a greater reduction in body mass in the eTRF group (Δ = −1.6 ± 1.4 kg) than in the control group (Δ = 0.3 ± 1.2 kg, p = 0.009), but there were no differences in …”
  - `mass_etrf`: “Multiple comparisons following ANOVA showed that there was a greater reduction in body mass in the eTRF group (Δ = −1.6 ± 1.4 kg) than in the control group (Δ = 0.3 ± 1.2 kg, p = 0.009), but there were no differences in …”
  - `mass_ctrl`: “Multiple comparisons following ANOVA showed that there was a greater reduction in body mass in the eTRF group (Δ = −1.6 ± 1.4 kg) than in the control group (Δ = 0.3 ± 1.2 kg, p = 0.009), but there were no differences in …”
- Its fat mass fell by 0.76 kg.
  - `fat_etrf_vs_ctrl`: “In addition, the eTRF group showed significantly larger reductions in percentage body fat and body fat mass (Δ = −0.60 ± 1.22% and Δ = −0.76 ± 1.01 kg, respectively) than the control group (Δ = 0.42 ± 1.16% and Δ = 0.41 …”
  - `fatmass_etrf`: “In addition, the eTRF group showed significantly larger reductions in percentage body fat and body fat mass (Δ = −0.60 ± 1.22% and Δ = −0.76 ± 1.01 kg, respectively) than the control group (Δ = 0.42 ± 1.16% and Δ = 0.41 …”

**Paragraph 6**

- The authors read this as a timing effect, since food eaten showed no clear difference between the windows.
  - `not_energy`: “Furthermore, the lack of a significant difference in the change in energy intake between the two TRF groups suggests that the differences in the improvements in metabolic health were not caused by differences in energy i…”
  - `ei_tr_ns`: “However, there was no difference between the two TRF groups (p = 0.30, Fig. 2a).”
- They suggest the body's daily rhythms may play a part.
  - `rhythm_hypothesis`: “Taken together, these findings suggest that TRF with a window for food consumption early in the day is better for metabolic health than a window later in the day, and that the mechanism may involve changes to daily rhyth…”

**Figure caption**

- Each group's eating hours and its change in insulin resistance after five weeks, as the paper measured it.
  - `etrf_window`: “We conducted a randomized, controlled trial, in which participants were randomized to an eTRF group (eating during no more than 8 h between 06:00 and 15:00 and fasting for the rest of the day), an mTRF group (eating duri…”
  - `mtrf_window`: “We conducted a randomized, controlled trial, in which participants were randomized to an eTRF group (eating during no more than 8 h between 06:00 and 15:00 and fasting for the rest of the day), an mTRF group (eating duri…”
  - `five_weeks`: “We conducted a five-week randomized trial to compare the effects of the two TRF regimens in healthy individuals without obesity (ChiCTR2000029797).”

**Figure alt text**

- Three rows, one per group, each with a day strip and a bar.
  - `etrf_window`: “We conducted a randomized, controlled trial, in which participants were randomized to an eTRF group (eating during no more than 8 h between 06:00 and 15:00 and fasting for the rest of the day), an mTRF group (eating duri…”
  - `mtrf_window`: “We conducted a randomized, controlled trial, in which participants were randomized to an eTRF group (eating during no more than 8 h between 06:00 and 15:00 and fasting for the rest of the day), an mTRF group (eating duri…”
  - `control_diet`: “We conducted a randomized, controlled trial, in which participants were randomized to an eTRF group (eating during no more than 8 h between 06:00 and 15:00 and fasting for the rest of the day), an mTRF group (eating duri…”
- The early group's window sits between 6:00 and 15:00, and its bar falls by 1.08.
  - `etrf_choose`: “Participants in the eTRF group were instructed to choose an 8 h eating period between 6:00 and 15:00 and to fast for the rest of the day.”
  - `homa_etrf`: “The eTRF group showed a larger reduction in HOMA-IR (Δ = −1.08 ± 1.59) than either the mTRF group (Δ = 0.39 ± 0.71, p < 0.001) or the control group (Δ = −0.05 ± 0.75, p = 0.002), but there was no difference between the c…”
- The mid-day group's window sits between 11:00 and 20:00, and its bar rises by 0.39.
  - `mtrf_choose`: “Those in mTRF group were instructed to choose an 8 h eating period between 11:00 and 20:00 and to fast for the rest of the day.”
  - `homa_mtrf`: “The eTRF group showed a larger reduction in HOMA-IR (Δ = −1.08 ± 1.59) than either the mTRF group (Δ = 0.39 ± 0.71, p < 0.001) or the control group (Δ = −0.05 ± 0.75, p = 0.002), but there was no difference between the c…”
- The control group has no window, and its bar barely moves, at 0.05 below no change.
  - `control_diet`: “We conducted a randomized, controlled trial, in which participants were randomized to an eTRF group (eating during no more than 8 h between 06:00 and 15:00 and fasting for the rest of the day), an mTRF group (eating duri…”
  - `homa_ctrl`: “The eTRF group showed a larger reduction in HOMA-IR (Δ = −1.08 ± 1.59) than either the mTRF group (Δ = 0.39 ± 0.71, p < 0.001) or the control group (Δ = −0.05 ± 0.75, p = 0.002), but there was no difference between the c…”

## Protocol

**Paragraph 1**

- For five weeks, the early group ate within any 8 hours between 6:00 and 15:00.
  - `five_weeks`: “We conducted a five-week randomized trial to compare the effects of the two TRF regimens in healthy individuals without obesity (ChiCTR2000029797).”
  - `etrf_choose`: “Participants in the eTRF group were instructed to choose an 8 h eating period between 6:00 and 15:00 and to fast for the rest of the day.”
- The mid-day group did the same between 11:00 and 20:00.
  - `mtrf_choose`: “Those in mTRF group were instructed to choose an 8 h eating period between 11:00 and 20:00 and to fast for the rest of the day.”
- The control group ate as usual, over more than 8 hours a day.
  - `control_usual`: “Participants in the control group could eat ad libitum, following their usual eating regimens, with food being consumed over more than 8 h per day.”

**Paragraph 2**

- Outside the window, only water, flavoured sparkling water, unsweetened tea and coffee were allowed.
  - `fasting_drinks`: “Participants in the eTRF and mTRF groups were only allowed to consume water, flavored carbonated water, unsweetened tea, and coffee during the fasting period.”
- Nobody got a diet or food advice.
  - `eat_freely`: “The participants in both TRF groups were instructed to eat ad libitum during their daily 8 h eating periods and no specific nutritional guidance was given to them, such that the trial conditions were similar to real-life…”
- Everyone photographed each meal as they started and finished.
  - `photo_compliance`: “To ensure compliance, participants were required to take photos of their food as they began to eat and as they finished and to send them privately to the investigators using a WeChat-supported web message-sending applet.”
- Blood was taken in the morning after at least 8 hours without food.
  - `fasting_blood`: “Fasting blood sampled were collected during the morning (07:00–08:30) after an overnight fast of at least 8 h.”

## Audit

**Effect**

- Change in insulin resistance (HOMA-IR) over five weeks: −1.08 early, against +0.39 mid-day (p < 0.001) and −0.05 control (p = 0.002).
  - `homa_etrf_better`: “The eTRF group showed a larger reduction in HOMA-IR (Δ = −1.08 ± 1.59) than either the mTRF group (Δ = 0.39 ± 0.71, p < 0.001) or the control group (Δ = −0.05 ± 0.75, p = 0.002)”
  - `homa_etrf`: “The eTRF group showed a larger reduction in HOMA-IR (Δ = −1.08 ± 1.59) than either the mTRF group (Δ = 0.39 ± 0.71, p < 0.001) or the control group (Δ = −0.05 ± 0.75, p = 0.002), but there was no difference between the c…”
  - `homa_vs_mtrf_p`: “The eTRF group showed a larger reduction in HOMA-IR (Δ = −1.08 ± 1.59) than either the mTRF group (Δ = 0.39 ± 0.71, p < 0.001) or the control group (Δ = −0.05 ± 0.75, p = 0.002), but there was no difference between the c…”
  - `homa_vs_ctrl_p`: “The eTRF group showed a larger reduction in HOMA-IR (Δ = −1.08 ± 1.59) than either the mTRF group (Δ = 0.39 ± 0.71, p < 0.001) or the control group (Δ = −0.05 ± 0.75, p = 0.002), but there was no difference between the c…”

**Weak end**

- The paper reports no confidence interval for these changes, and does not say what its ± figures are.
  - `homa_etrf_better`: “The eTRF group showed a larger reduction in HOMA-IR (Δ = −1.08 ± 1.59) than either the mTRF group (Δ = 0.39 ± 0.71, p < 0.001) or the control group (Δ = −0.05 ± 0.75, p = 0.002)”
  - `homa_etrf`: “The eTRF group showed a larger reduction in HOMA-IR (Δ = −1.08 ± 1.59) than either the mTRF group (Δ = 0.39 ± 0.71, p < 0.001) or the control group (Δ = −0.05 ± 0.75, p = 0.002), but there was no difference between the c…”
- So the true difference's size is unknown.

**Limitation 1**

- Participants knew their group, as did the researchers who estimated food from photos.
  - `limit_unblinded`: “Firstly, although it was a randomized trial, the participants could not be blinded to the intervention.”
  - `photo_checkers_unblinded`: “Investigators who checked posted photos and estimated energy contents from photos were not blinded to the assignment of the group.”

**Limitation 2**

- Volunteers may have been keen on this way of eating already, and most were women.
  - `limit_selfselected`: “Secondly, the people who applied to join the trial might already have been interested in TRF or wished to improve their health through making a dietary change, and most were women.”

**Limitation 3**

- The trial was small and lasted 5 weeks.
  - `limit_small`: “Thirdly, the number of participants in the trial was relatively small and they may not have been representative of the wider population.”
  - `limit_five_weeks`: “The present study has shown that 5 weeks of eTRF, but not mTRF, improves insulin sensitivity, reduces fasting plasma glucose, reduces body mass and adiposity, ameliorates inflammation, and increases gut microbial diversi…”

**Limitation 4**

- Meal times varied within each group, and so may the fast before the blood tests.
  - `limit_timing_varied`: “Fifthly, the participants in the TRF groups were required to consume their meals within an 8 h period, but the specific timing and duration of their meals varied within each group, which may have influenced the results.”
  - `limit_fast_before_test`: “Sixthly, the changes in the eating periods that were made in the TRF groups may have caused changes in the duration of fasting prior to testing, which might have influenced the results.”

**What most summaries miss**

- Mid-day eating showed no clear difference from usual eating on insulin resistance, fasting blood sugar, weight or fat.
  - `homa_mtrf_ns`: “The eTRF group showed a larger reduction in HOMA-IR (Δ = −1.08 ± 1.59) than either the mTRF group (Δ = 0.39 ± 0.71, p < 0.001) or the control group (Δ = −0.05 ± 0.75, p = 0.002), but there was no difference between the c…”
  - `fpg_mtrf_ns`: “There were no differences in the change in FPG between the mTRF (Δ = −0.18 ± 1.17 mmol/L) and control groups or between the TRF groups.”
  - `mass_others_ns`: “Multiple comparisons following ANOVA showed that there was a greater reduction in body mass in the eTRF group (Δ = −1.6 ± 1.4 kg) than in the control group (Δ = 0.3 ± 1.2 kg, p = 0.009), but there were no differences in …”
  - `fat_mtrf_ns`: “No differences in these two parameters were found between the mTRF (Δ = −0.22  ± 1.70% and Δ = −0.30 ± 1.25 kg, respectively) and control groups or between the TRF groups (Fig. 2e, f).”
- Food came from meal photos; the eight who did not finish were excluded.
  - `energy_from_photos`: “Energy intake was estimated using pictures of the meals consumed.”
  - `dropouts_excluded`: “The energy that was consumed on non-compliant days was not included in the calculation of the mean daily energy consumption and the data for the eight participants who did not complete the trial were excluded from the an…”

**Full receipts 1**

- Fasting blood sugar changed by −0.59 mmol/L early and +0.16 with usual eating (p = 0.005); fat mass by −0.76 and +0.41 kg (p = 0.001).
  - `fpg_etrf_vs_ctrl`: “The change in FPG significantly differed across the three groups (ANOVA p = 0.007, Fig. 2c), which reflected a significant difference between the eTRF group (Δ = −0.59 ± 0.84 mmol/L) and control group (Δ = 0.16 ± 0.38 mm…”
  - `fpg_etrf`: “The change in FPG significantly differed across the three groups (ANOVA p = 0.007, Fig. 2c), which reflected a significant difference between the eTRF group (Δ = −0.59 ± 0.84 mmol/L) and control group (Δ = 0.16 ± 0.38 mm…”
  - `fpg_ctrl`: “The change in FPG significantly differed across the three groups (ANOVA p = 0.007, Fig. 2c), which reflected a significant difference between the eTRF group (Δ = −0.59 ± 0.84 mmol/L) and control group (Δ = 0.16 ± 0.38 mm…”
  - `fat_etrf_vs_ctrl`: “In addition, the eTRF group showed significantly larger reductions in percentage body fat and body fat mass (Δ = −0.60 ± 1.22% and Δ = −0.76 ± 1.01 kg, respectively) than the control group (Δ = 0.42 ± 1.16% and Δ = 0.41 …”
  - `fatmass_etrf`: “In addition, the eTRF group showed significantly larger reductions in percentage body fat and body fat mass (Δ = −0.60 ± 1.22% and Δ = −0.76 ± 1.01 kg, respectively) than the control group (Δ = 0.42 ± 1.16% and Δ = 0.41 …”
  - `fatmass_ctrl`: “In addition, the eTRF group showed significantly larger reductions in percentage body fat and body fat mass (Δ = −0.60 ± 1.22% and Δ = −0.76 ± 1.01 kg, respectively) than the control group (Δ = 0.42 ± 1.16% and Δ = 0.41 …”

**Full receipts 2**

- Two inflammation signals changed more with early eating than usual eating: TNF-α (p = 0.024) and IL-8 (p = 0.045).
  - `tnf_etrf_vs_ctrl`: “The change in TNF-α was larger in the eTRF group (Δ = −0.81 ± 1.98 pg/mL) than in the control group (Δ = 0.39 ± 1.35 pg/mL, p = 0.024), but there were no differences between the mTRF group (Δ = −0.06 ± 0.95 pg/mL) and th…”
  - `il8_etrf_vs_ctrl`: “Similarly, there was a larger reduction in the IL-8 concentration in the eTRF group (Δ = −1.9 ± 4.5 pg/mL) than in the control group (Δ = 1.1 ± 2.9 pg/mL, p = 0.045), but there were no differences between the mTRF group …”
- A third, hsCRP, showed no clear difference (p = 0.70).
  - `hscrp_ns`: “However, the changes in hsCRP were similar in the three groups (p = 0.70, Table S1).”

**Full receipts 3**

- Blood pressure, blood fats, sleep and appetite showed no clear difference.
  - `bp_ns`: “The changes in systolic blood pressure (SBP), diastolic blood pressure (DBP), and mean arterial pressure (MAP) did not significantly differ among the eTRF, mTRF, and control groups (p = 0.078, p = 0.099, and p = 0.088, r…”
  - `lipids_ns`: “There were also no differences found in the circulating high-density lipoprotein-cholesterol (HDL-C) (p = 0.28), low-density lipoprotein-cholesterol (LDL-C) (p = 0.68), total cholesterol (p = 0.94), and triglyceride (p =…”
  - `sleep_ns`: “The changes in PSQI did not significantly differ among the eTRF (Δ = −1.08 ± 1.78), mTRF (Δ = −0.22 ± 2.19), and control (Δ = −0.36 ± 1.73) groups (p = 0.24, Table S1).”
  - `appetite_ns`: “There were no significant differences in the CNAQ results among the three groups (eTRF: Δ = −0.24 ± 2.30, mTRF: Δ = −0.83 ± 2.50, control: Δ = 0.07 ± 1.82; p = 0.35).”

**Full receipts 4**

- Exploratory, in 19 people, five of them early eaters: the hunger hormone ghrelin was higher at 23:00 with early eating.
  - `rhythm_subset`: “Furthermore, blood samples were collected at four times of day (07:00, 12:00, 17:00, and 23:00) at both the beginning and end of the interventions from 19 participants (five, eight, and six from the eTRF, mTRF, and contr…”
  - `ghrelin_23`: “Two-way ANOVA showed that the plasma ghrelin concentration at 23:00 was significantly increased by eTRF (0.49 ± 0.17%, p = 0.037); and the resistin concentration increased at 12:00 (0.22% ± 0.085%, p = 0.048) and decreas…”
  - `ghrelin_hunger`: “The daily rhythm in circulating ghrelin concentration has been reported to synchronize with TRF in mice, with the concentration increasing before the feeding period, and it should be noted that ghrelin has an important r…”
- One body-clock gene swung more each day in all five.
  - `sirt1_amplitude`: “In the eTRF group, the SIRT1 mRNA expression of all the participants increased in amplitude during the trial (Fig. 4a).”
  - `clock_exploratory`: “Because not all the expression data for every participant fitted Cosinor curves, the parameters were calculated just for exploratory purposes, to provide clues for future investigations.”

**Full receipts 5**

- 82 finished (91.1%); self-reported days kept in the window: 96.8% and 98.2%.
  - `analysed_82`: “Remaining 82 participants completed the trial and were included in the present analysis.”
  - `completed_82`: “Eighty-two participants (91.1%) completed the entire five-week trial; two, four, and two participants in the eTRF, mTRF, and control groups did not.”
  - `compliance`: “Self-reported compliance with the regimens was 949 out of 980 person-days (96.8%) in the eTRF group, and 894 out of 910 person-days (98.2%) in the mTRF group.”
  - `compliance_mtrf`: “Self-reported compliance with the regimens was 949 out of 980 person-days (96.8%) in the eTRF group, and 894 out of 910 person-days (98.2%) in the mTRF group.”

**Full receipts 6**

- No serious side effects were reported.
  - `no_serious_ae`: “No serious adverse events were reported during the trial.”

**Full receipts 7**

- Funded by a CAMS innovation grant, which had no role; no competing interests.
  - `funding`: “This work was supported by grants from the CAMS Innovation Fund for Medical Sciences (CIFMS) (No.2016-I2M-1-001) (Y.M. and H.Y.).”
  - `sponsor_no_role`: “The study sponsors played no role in study design, conduct, data acquisition, analysis, manuscript preparation or the decision to submit the manuscript for publication.”
  - `no_competing`: “The authors declare no competing interests.”

## Glossary

- **insulin resistance**: How much insulin the body needs to hold fasting blood sugar steady. More insulin for the same sugar means more resistance. (rests on primary_outcome)
- **HOMA-IR**: A score for insulin resistance worked out from a morning blood test of sugar and insulin. (rests on primary_outcome)
- **time-restricted eating**: Eating all of the day's food inside a set number of hours. (rests on trf_definition)
- **kcal**: Kilocalories, the unit of food energy that labels usually just call calories. (rests on ei_etrf)

## Takeaways

**Takeaway 1**

- Eating within 8 hours between 6:00 and 15:00, adults' insulin resistance fell more than with a mid-day window.
  - `etrf_choose`: “Participants in the eTRF group were instructed to choose an 8 h eating period between 6:00 and 15:00 and to fast for the rest of the day.”
  - `homa_etrf_better`: “The eTRF group showed a larger reduction in HOMA-IR (Δ = −1.08 ± 1.59) than either the mTRF group (Δ = 0.39 ± 0.71, p < 0.001) or the control group (Δ = −0.05 ± 0.75, p = 0.002)”

**Takeaway 2**

- Both windows cut food eaten by amounts that showed no clear difference.
  - `ei_groups_differ`: “There was a significant difference in the change in energy intake among the eTRF, mTRF, and control groups (p < 0.001), with the eTRF (Δ = −240 ± 409 kcal/day) and mTRF (Δ = −159 ± 397 kcal/day) groups showing a reductio…”
  - `ei_tr_ns`: “However, there was no difference between the two TRF groups (p = 0.30, Fig. 2a).”

**Takeaway 3**

- The trial was small and short, and participants knew their group.
  - `limit_small`: “Thirdly, the number of participants in the trial was relatively small and they may not have been representative of the wider population.”
  - `limit_unblinded`: “Firstly, although it was a randomized trial, the participants could not be blinded to the intervention.”

## Steps (what a reader can tick)

- **Eat only within 8 hours between 6:00 and 15:00** (`eat-6-to-15`, evidence: homa_etrf_better): The early group's rule in this trial. A tick records that you kept the window, not any change in your blood. Refs: etrf_choose
- **Outside the window: water, plain tea or coffee only** (`plain-drinks-outside`, evidence: none, weight 0): The trial allowed water, flavoured sparkling water, unsweetened tea and coffee outside the window. It was part of the rules, not tested on its own, so it carries no weight. Refs: fasting_drinks

## Simulator

`estimate-explorer`: Early window (kg) → `mass_etrf` = Δ = −1.6 ± 1.4 kg; Mid-day window (kg) → `mass_mtrf` = Δ = −0.2 ± 2.2 kg; Control, usual eating (kg) → `mass_ctrl` = Δ = 0.3 ± 1.2 kg

## Instagram deck

**Slide 1 (hook) heading**

- Does it matter when you eat, within the same 8 hours?
  - `etrf_window`: “We conducted a randomized, controlled trial, in which participants were randomized to an eTRF group (eating during no more than 8 h between 06:00 and 15:00 and fasting for the rest of the day), an mTRF group (eating duri…”
  - `mtrf_window`: “We conducted a randomized, controlled trial, in which participants were randomized to an eTRF group (eating during no more than 8 h between 06:00 and 15:00 and fasting for the rest of the day), an mTRF group (eating duri…”

**Slide 1 body**

- Adults ate early, at mid-day, or as usual, for five weeks.
  - `etrf_window`: “We conducted a randomized, controlled trial, in which participants were randomized to an eTRF group (eating during no more than 8 h between 06:00 and 15:00 and fasting for the rest of the day), an mTRF group (eating duri…”
  - `mtrf_window`: “We conducted a randomized, controlled trial, in which participants were randomized to an eTRF group (eating during no more than 8 h between 06:00 and 15:00 and fasting for the rest of the day), an mTRF group (eating duri…”
  - `control_diet`: “We conducted a randomized, controlled trial, in which participants were randomized to an eTRF group (eating during no more than 8 h between 06:00 and 15:00 and fasting for the rest of the day), an mTRF group (eating duri…”
  - `five_weeks`: “We conducted a five-week randomized trial to compare the effects of the two TRF regimens in healthy individuals without obesity (ChiCTR2000029797).”

  art: `{"motif": "pair", "a": {"value": {"text": "15:00", "ref": "etrf_choose"}, "label": "Early window: last bite by [etrf_choose]"}, "b": {"value": {"text": "20:00", "ref": "mtrf_choose"}, "label": "Mid-day window: last bite by [mtrf_choose]"}}`

**Slide 2 (finding) heading**

- In these adults, only the early window clearly lowered insulin resistance.
  - `homa_etrf_better`: “The eTRF group showed a larger reduction in HOMA-IR (Δ = −1.08 ± 1.59) than either the mTRF group (Δ = 0.39 ± 0.71, p < 0.001) or the control group (Δ = −0.05 ± 0.75, p = 0.002)”

**Slide 2 body**

- Both window groups ate less, by amounts with no clear difference.
  - `ei_tr_ns`: “However, there was no difference between the two TRF groups (p = 0.30, Fig. 2a).”

  art: `{"motif": "verdicts", "rows": [{"label": "Insulin resistance, early vs mid-day [-]", "verdict": "lower", "fact": "fact:homa_etrf_better"}, {"label": "Insulin resistance, mid-day vs usual [-]", "verdict": "no-clear-difference", "fact": "fact:homa_mtrf_ns"}, {"label": "Weight, early vs usual [-]", "verdict": "lower", "fact": "fact:mass_etrf_vs_ctrl"}, {"label": "Food eaten, early vs mid-day [-]", "v`

**Slide 3 (why) heading**

- Same hours of eating, a different time of day.
  - `etrf_window`: “We conducted a randomized, controlled trial, in which participants were randomized to an eTRF group (eating during no more than 8 h between 06:00 and 15:00 and fasting for the rest of the day), an mTRF group (eating duri…”
  - `mtrf_window`: “We conducted a randomized, controlled trial, in which participants were randomized to an eTRF group (eating during no more than 8 h between 06:00 and 15:00 and fasting for the rest of the day), an mTRF group (eating duri…”

**Slide 3 body**

- The authors suggest the body's daily rhythms (circadian clock) may play a part.
  - `rhythm_hypothesis`: “Taken together, these findings suggest that TRF with a window for food consumption early in the day is better for metabolic health than a window later in the day, and that the mechanism may involve changes to daily rhyth…”

**Slide 4 (who) heading**

- Tested in healthy adults, for five weeks.
  - `five_weeks`: “We conducted a five-week randomized trial to compare the effects of the two TRF regimens in healthy individuals without obesity (ChiCTR2000029797).”

  art: `{"motif": "who", "tested": ["82 adults aged 18 to 64 [analysed_82, inclusion_age]", "Without obesity [inclusion_bmi]", "Mostly women [limit_selfselected]"], "notTested": ["Night-shift workers [exclusion_nightshift]", "Diabetes or high blood pressure [exclusion_criteria]", "Longer than five weeks [limit_five_weeks]"]}`

**Slide 5 (receipts) heading**

- How sure can we be?

  art: `{"motif": "checks", "strong": "Groups set by chance; outcome measurers blinded. [randomization, assessors_blinded]", "weak": "Small, short, and participants knew their group. [limit_small, limit_unblinded]", "missing": "Why timing matters: not shown. [rhythm_hypothesis]"}`

**Slide 6 (cta) heading**

- When is your last bite of the day?

**Slide 6 body**

- Compare each group's weight change after five weeks.
  - `mass_etrf`: “Multiple comparisons following ANOVA showed that there was a greater reduction in body mass in the eTRF group (Δ = −1.6 ± 1.4 kg) than in the control group (Δ = 0.3 ± 1.2 kg, p = 0.009), but there were no differences in …”
  - `mass_mtrf`: “Multiple comparisons following ANOVA showed that there was a greater reduction in body mass in the eTRF group (Δ = −1.6 ± 1.4 kg) than in the control group (Δ = 0.3 ± 1.2 kg, p = 0.009), but there were no differences in …”
  - `mass_ctrl`: “Multiple comparisons following ANOVA showed that there was a greater reduction in body mass in the eTRF group (Δ = −1.6 ± 1.4 kg) than in the control group (Δ = 0.3 ± 1.2 kg, p = 0.009), but there were no differences in …”
  - `five_weeks`: “We conducted a five-week randomized trial to compare the effects of the two TRF regimens in healthy individuals without obesity (ChiCTR2000029797).”

**Alternate opening “The weight”**

- Can eating earlier in the day change your weight?
- Healthy adults ate between 6:00 and 15:00 for five weeks.
  - `etrf_choose`: “Participants in the eTRF group were instructed to choose an 8 h eating period between 6:00 and 15:00 and to fast for the rest of the day.”
  - `five_weeks`: “We conducted a five-week randomized trial to compare the effects of the two TRF regimens in healthy individuals without obesity (ChiCTR2000029797).”

  art: `{"motif": "number", "value": {"text": "1.6", "ref": "mass_etrf"}, "unit": "kg [-]", "label": "average weight lost, early window [mass_etrf]"}`

**Caption**

- A randomized trial of 82 healthy adults over five weeks.
  - `analysed_82`: “Remaining 82 participants completed the trial and were included in the present analysis.”
  - `five_weeks`: “We conducted a five-week randomized trial to compare the effects of the two TRF regimens in healthy individuals without obesity (ChiCTR2000029797).”
- One group ate within 8 hours between 6:00 and 15:00, another between 11:00 and 20:00, a third as usual.
  - `etrf_choose`: “Participants in the eTRF group were instructed to choose an 8 h eating period between 6:00 and 15:00 and to fast for the rest of the day.”
  - `mtrf_choose`: “Those in mTRF group were instructed to choose an 8 h eating period between 11:00 and 20:00 and to fast for the rest of the day.”
  - `control_usual`: “Participants in the control group could eat ad libitum, following their usual eating regimens, with food being consumed over more than 8 h per day.”
- Only the early group's insulin resistance fell more than the other groups'.
  - `homa_etrf_better`: “The eTRF group showed a larger reduction in HOMA-IR (Δ = −1.08 ± 1.59) than either the mTRF group (Δ = 0.39 ± 0.71, p < 0.001) or the control group (Δ = −0.05 ± 0.75, p = 0.002)”
- Both window groups ate less, with no clear difference between them.
  - `ei_tr_ns`: “However, there was no difference between the two TRF groups (p = 0.30, Fig. 2a).”
- Small, short, and participants knew their group.
  - `limit_small`: “Thirdly, the number of participants in the trial was relatively small and they may not have been representative of the wider population.”
  - `limit_unblinded`: “Firstly, although it was a randomized trial, the participants could not be blinded to the intervention.”
- Full read and the weight explorer: link in bio.

Hashtags: #nutrition #intermittentfasting #metabolism #evidencebased #clinicaltrial
