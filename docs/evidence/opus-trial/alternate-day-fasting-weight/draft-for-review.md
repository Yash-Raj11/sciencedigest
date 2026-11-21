# Opus trial, paper 5 of 6: alternate-day fasting in adults without obesity, a draft for your review

Varady KA et al., *Nutrition Journal* 2013, doi:10.1186/1475-2891-12-146 (CC-BY). Free tier. **Not published** (`publishedAt` null).
A 12-week randomized trial in Chicago: 32 adults aged 35 to 65 with a BMI of 20 to 29.9 were randomized; 30 finished, 15 per group. On fast days the fasting group ate 25% of their energy needs (one provided 400 to 600 kcal meal, eaten between 12.00 pm and 2.00 pm); on feed days they ate freely. After 12 weeks they weighed 5.2 kg less than the control group (p < 0.001), 3.6 kg of it fat; lean mass showed no clear difference.

**How this was made.** Claude Opus 5.5 wrote it by hand in Claude Code, with no API key: the extraction with its coverage map, the read, the deck and one figure. The project's real gate and lint judged every file. Treat it as an **upper bound** for a one-shot API run. Every refusal and fix: `fixes.md`.

**What to decide, or look at closely**

1. **No range can be shown.** The paper prints every ± as a standard error and no confidence interval. The gate forbids converting one, so the headline has no 95% range; the audit says so in words, and the simulator shows the point only. Grade: low (randomized, under 50 people).
2. **A step that happens every other day.** The tracker is daily. The step "Fast day: one meal of 400 to 600 kcal" (weighted, resting on `weight_md`) is meant for alternate days; its detail says so, but an unticked feed day will look like a miss in plain consistency. Is that acceptable, or should this read carry no weighted step until the tracker knows about alternate days (a scoring question: your call, rule 11)?
3. **"One meal" is my reading.** The paper says fast-day meals were provided (400 to 600 kcal) and all were eaten between 12.00 pm and 2.00 pm. A two-hour window reads as one meal, and the hook, step and deck say "one meal". If you want the paper's exact words, it becomes "400 to 600 kcal, eaten between 12.00 pm and 2.00 pm".
4. **The blood-marker claims switch tests.** For triglycerides and LDL particle size the paper reports the week-12 comparison (significant) while the change comparison is not (p = 0.22, 0.13); for adiponectin and leptin it reports the change comparison while the week-12 one is not (p = 0.15, 0.55). The read puts this under "what most summaries miss", and leaves those markers out of the card and the deck. The trial was sized for LDL cholesterol, which showed no clear difference from controls.
5. **A pilot, merged after the fact.** It was planned as normal weight against overweight; recruitment fell short and the authors combined the groups. The audit lists it; the deck's weak line says it.
6. **The "why" slide has no picture**, as in papers 1 to 4.

Every sentence is listed below with the paper's own words for each fact it cites. `[-]` means a sentence cites nothing. Long quotes are cut at 220 characters.
Deck: `deck/sheet-dark.png`, `deck/sheet-light.png` (6 slides, then 1 alternate opening). Figure: `figure/fast-days.html` (light and dark, full and feed-card views).

## Feed card and top of the read

**Title**

- A quarter of your needs every other day: 12 weeks in adults without obesity
  - `fast_day_quarter`: “During the dietary intervention period, ADF subjects consumed 25% of their baseline energy needs on the fast day (24 h), and then ate ad libitum on each alternating feed day (24 h).”
  - `twelve_weeks`: “A 12-week, randomized, controlled, parallel-arm feeding trial was implemented as a means of testing the study objectives. Subjects were randomized by KAV by way of a stratified random sample. Subjects were first divided …”

**Teaser**

- Adults who were normal weight or overweight ate a quarter of their energy needs every other day, and ate freely in between.
  - `inclusion_bmi`: “Inclusion criteria were as follows: BMI between 20 and 29.9 kg/m2; age between 35 and 65 years; pre-menopausal or post-menopausal (absence of menses for more than 2 years); lightly active (< 3 h/week of light intensity e…”
  - `fast_day_quarter`: “During the dietary intervention period, ADF subjects consumed 25% of their baseline energy needs on the fast day (24 h), and then ate ad libitum on each alternating feed day (24 h).”
  - `feed_day_free`: “During the dietary intervention period, ADF subjects consumed 25% of their baseline energy needs on the fast day (24 h), and then ate ad libitum on each alternating feed day (24 h).”
- After 12 weeks, they weighed 5.2 kg less than a control group.
  - `weight_md`: “Body weight decreased (P < 0.001) by 5.2 ± 0.9 kg (6.5 ± 1.0%) in the ADF group, relative to the control group, by week 12.”
- On free days, they ate 1856 kcal.
  - `feed_w12`: “Feed day energy intake (kcal/d) | ADF | 1874 ± 136 | 1856 ± 229 | 0.93 | 0.92 | -18 ± 186 | 0.50 |”
- The control group ate 1790 kcal a day.
  - `ctrl_w12`: “| Control | 1873 ± 243 | 1790 ± 286 | 0.71 | | -82 ± 75 | |”

**Hook**

- Every other day, 15 adults ate a single meal of 400 to 600 kcal.
  - `per_group_15`: “Thirty-two subjects commenced the study, with 30 completing the entire 12-week trial (Figure 1). After loss due to dropouts, the remaining subjects in each intervention group were as follows: ADF (n = 15) and control (n …”
  - `meal_kcal`: “The feed and fast days began at midnight each day, and all fast day meals were consumed between 12.00 pm and 2.00 pm to ensure that each subject was undergoing the same duration of fasting. ADF subjects were provided wit…”
- After 12 weeks, they weighed 5.2 kg less than a control group.
  - `weight_md`: “Body weight decreased (P < 0.001) by 5.2 ± 0.9 kg (6.5 ± 1.0%) in the ADF group, relative to the control group, by week 12.”

**Card question**

- Does fasting every other day help adults without obesity lose weight?
  - `weight_md`: “Body weight decreased (P < 0.001) by 5.2 ± 0.9 kg (6.5 ± 1.0%) in the ADF group, relative to the control group, by week 12.”

**Card headline**

- After 12 weeks, the fasting group weighed 5.2 kg less than the control group.
  - `weight_md`: “Body weight decreased (P < 0.001) by 5.2 ± 0.9 kg (6.5 ± 1.0%) in the ADF group, relative to the control group, by week 12.”

**Card support**

- Most of that was fat: 3.6 kg, while lean mass showed no clear difference.
  - `fat_md`: “Fat mass was reduced (P < 0.001) by 3.6 ± 0.7 kg, and fat free mass did not change, versus controls.”
  - `lean_ns`: “No difference between groups for fat free mass at week 12 (Independent samples t-test).”

**Source line: who**

- 30 adults aged 35 to 65
  - `completed_30`: “Thirty-two subjects commenced the study, with 30 completing the entire 12-week trial (Figure 1). After loss due to dropouts, the remaining subjects in each intervention group were as follows: ADF (n = 15) and control (n …”
  - `inclusion_age`: “Inclusion criteria were as follows: BMI between 20 and 29.9 kg/m2; age between 35 and 65 years; pre-menopausal or post-menopausal (absence of menses for more than 2 years); lightly active (< 3 h/week of light intensity e…”

**Source line: span**

- 12 weeks
  - `twelve_weeks`: “A 12-week, randomized, controlled, parallel-arm feeding trial was implemented as a means of testing the study objectives. Subjects were randomized by KAV by way of a stratified random sample. Subjects were first divided …”

**Feed card figure alt text**

- Fasting group: short fast-day bars alternate with tall feed-day bars.
  - `fast_w12`: “Fast day energy intake (kcal/d) | ADF | 482 ± 19 | 489 ± 20 | 0.74 | | 7 ± 5 | |”
  - `feed_w12`: “Feed day energy intake (kcal/d) | ADF | 1874 ± 136 | 1856 ± 229 | 0.93 | 0.92 | -18 ± 186 | 0.50 |”
- Control group: every bar is tall.
  - `ctrl_w12`: “| Control | 1873 ± 243 | 1790 ± 286 | 0.71 | | -82 ± 75 | |”

**Population panel**

- Who this was tested in: 30 adults in Chicago aged 35 to 65, with a BMI of 20 to 29.9.
  - `completed_30`: “Thirty-two subjects commenced the study, with 30 completing the entire 12-week trial (Figure 1). After loss due to dropouts, the remaining subjects in each intervention group were as follows: ADF (n = 15) and control (n …”
  - `recruited`: “Subjects were recruited from the Chicago area by means of advertisements placed around the University of Illinois, Chicago campus. A total of 107 individuals expressed interest in the study, but only 32 were recruited to…”
  - `inclusion_age`: “Inclusion criteria were as follows: BMI between 20 and 29.9 kg/m2; age between 35 and 65 years; pre-menopausal or post-menopausal (absence of menses for more than 2 years); lightly active (< 3 h/week of light intensity e…”
  - `inclusion_bmi`: “Inclusion criteria were as follows: BMI between 20 and 29.9 kg/m2; age between 35 and 65 years; pre-menopausal or post-menopausal (absence of menses for more than 2 years); lightly active (< 3 h/week of light intensity e…”
- That is normal weight or overweight, not obese.
  - `inclusion_bmi`: “Inclusion criteria were as follows: BMI between 20 and 29.9 kg/m2; age between 35 and 65 years; pre-menopausal or post-menopausal (absence of menses for more than 2 years); lightly active (< 3 h/week of light intensity e…”
- Most were women.
  - `sex_table`: “Sex (M/F) | 5 / 10 | 3 / 12 | 0.44 |”
- None had diabetes or heart disease, or smoked, and all were lightly active.
  - `inclusion_health`: “Inclusion criteria were as follows: BMI between 20 and 29.9 kg/m2; age between 35 and 65 years; pre-menopausal or post-menopausal (absence of menses for more than 2 years); lightly active (< 3 h/week of light intensity e…”
  - `inclusion_active`: “Inclusion criteria were as follows: BMI between 20 and 29.9 kg/m2; age between 35 and 65 years; pre-menopausal or post-menopausal (absence of menses for more than 2 years); lightly active (< 3 h/week of light intensity e…”
- A random draw split them between fasting and eating as usual.
  - `stratified`: “A 12-week, randomized, controlled, parallel-arm feeding trial was implemented as a means of testing the study objectives. Subjects were randomized by KAV by way of a stratified random sample. Subjects were first divided …”
- Fifteen in each group finished.
  - `per_group_15`: “Thirty-two subjects commenced the study, with 30 completing the entire 12-week trial (Figure 1). After loss due to dropouts, the remaining subjects in each intervention group were as follows: ADF (n = 15) and control (n …”

## Mechanism

**Paragraph 1**

- Think of two days as one budget.
- On a fast day, the fasting group ate one provided meal of 400 to 600 kcal, about a quarter of their needs.
  - `meal_kcal`: “The feed and fast days began at midnight each day, and all fast day meals were consumed between 12.00 pm and 2.00 pm to ensure that each subject was undergoing the same duration of fasting. ADF subjects were provided wit…”
  - `fast_day_quarter`: “During the dietary intervention period, ADF subjects consumed 25% of their baseline energy needs on the fast day (24 h), and then ate ad libitum on each alternating feed day (24 h).”
- On the next day, they ate whatever they liked.
  - `feed_day_free`: “During the dietary intervention period, ADF subjects consumed 25% of their baseline energy needs on the fast day (24 h), and then ate ad libitum on each alternating feed day (24 h).”

**Paragraph 2**

- The plan only works if the free day does not refill the gap.
- By the end, a free day held 1856 kcal and a fast day 489.
  - `feed_w12`: “Feed day energy intake (kcal/d) | ADF | 1874 ± 136 | 1856 ± 229 | 0.93 | 0.92 | -18 ± 186 | 0.50 |”
  - `fast_w12`: “Fast day energy intake (kcal/d) | ADF | 482 ± 19 | 489 ± 20 | 0.74 | | 7 ± 5 | |”
- The control group ate 1790 kcal a day.
  - `ctrl_w12`: “| Control | 1873 ± 243 | 1790 ± 286 | 0.71 | | -82 ± 75 | |”
- So every two days, the fasting group's budget came out well below the control group's.
  - `feed_w12`: “Feed day energy intake (kcal/d) | ADF | 1874 ± 136 | 1856 ± 229 | 0.93 | 0.92 | -18 ± 186 | 0.50 |”
  - `fast_w12`: “Fast day energy intake (kcal/d) | ADF | 482 ± 19 | 489 ± 20 | 0.74 | | 7 ± 5 | |”
  - `ctrl_w12`: “| Control | 1873 ± 243 | 1790 ± 286 | 0.71 | | -82 ± 75 | |”

**Paragraph 3**

- The authors saw little or no burst of overeating after a fast, which they call hyperphagia.
  - `no_overeating`: “Complementary to previous reports [,], there was very little or no hyperphagic response on the feed day in response to the lack of food on the fast day. This lack of hyperphagia allowed for overall energy restriction to …”
- Food eaten stayed level on both kinds of day across the 12 weeks.
  - `intake_constant`: “From week 1 to 12 of the study, energy intake remained constant on both feed and fast days in the ADF group.”

**Paragraph 4**

- The scale followed.
- After 12 weeks, the fasting group weighed 5.2 kg less than the control group.
  - `weight_md`: “Body weight decreased (P < 0.001) by 5.2 ± 0.9 kg (6.5 ± 1.0%) in the ADF group, relative to the control group, by week 12.”
- Of that, 3.6 kg was fat; lean mass showed no clear difference.
  - `fat_md`: “Fat mass was reduced (P < 0.001) by 3.6 ± 0.7 kg, and fat free mass did not change, versus controls.”
  - `lean_ns`: “No difference between groups for fat free mass at week 12 (Independent samples t-test).”

**Paragraph 5**

- Fasting got easier to live with, too.
- Fullness and satisfaction on fast days rose over the trial, and hunger stayed level.
  - `fullness_up`: “Satisfaction and fullness increased (P < 0.01) from baseline to post-treatment in the ADF group, with no change in the control group.”
  - `hunger_ns`: “Hunger levels were moderate as baseline, and did not change by week 12 in either group.”

**Figure caption**

- Each bar is the group's average food for that kind of day at the end of the trial, from food records.
  - `feed_w12`: “Feed day energy intake (kcal/d) | ADF | 1874 ± 136 | 1856 ± 229 | 0.93 | 0.92 | -18 ± 186 | 0.50 |”
  - `fast_w12`: “Fast day energy intake (kcal/d) | ADF | 482 ± 19 | 489 ± 20 | 0.74 | | 7 ± 5 | |”
  - `ctrl_w12`: “| Control | 1873 ± 243 | 1790 ± 286 | 0.71 | | -82 ± 75 | |”

**Figure alt text**

- Two rows of bars on one scale.
- Fasting group: fast-day bars at 489 kcal alternate with feed-day bars at 1856 kcal.
  - `fast_w12`: “Fast day energy intake (kcal/d) | ADF | 482 ± 19 | 489 ± 20 | 0.74 | | 7 ± 5 | |”
  - `feed_w12`: “Feed day energy intake (kcal/d) | ADF | 1874 ± 136 | 1856 ± 229 | 0.93 | 0.92 | -18 ± 186 | 0.50 |”
- Control group: every bar at 1790 kcal.
  - `ctrl_w12`: “| Control | 1873 ± 243 | 1790 ± 286 | 0.71 | | -82 ± 75 | |”

## Protocol

**Paragraph 1**

- The tested plan ran for 12 weeks.
  - `twelve_weeks`: “A 12-week, randomized, controlled, parallel-arm feeding trial was implemented as a means of testing the study objectives. Subjects were randomized by KAV by way of a stratified random sample. Subjects were first divided …”
- On a fast day: one meal of 400 to 600 kcal, eaten between 12.00 pm and 2.00 pm.
  - `meal_kcal`: “The feed and fast days began at midnight each day, and all fast day meals were consumed between 12.00 pm and 2.00 pm to ensure that each subject was undergoing the same duration of fasting. ADF subjects were provided wit…”
  - `meal_window`: “The feed and fast days began at midnight each day, and all fast day meals were consumed between 12.00 pm and 2.00 pm to ensure that each subject was undergoing the same duration of fasting. ADF subjects were provided wit…”
- That was 25% of each person's energy needs.
  - `fast_day_quarter`: “During the dietary intervention period, ADF subjects consumed 25% of their baseline energy needs on the fast day (24 h), and then ate ad libitum on each alternating feed day (24 h).”
- On the next day, people ate freely.
  - `feed_day_free`: “During the dietary intervention period, ADF subjects consumed 25% of their baseline energy needs on the fast day (24 h), and then ate ad libitum on each alternating feed day (24 h).”

**Paragraph 2**

- On fast days, the trial allowed energy-free drinks, tea, coffee and sugar-free gum, and encouraged plenty of water.
  - `fast_drinks`: “ADF subjects were permitted to consume energy-free beverages, tea, coffee, and sugar-free gum, and were encouraged to drink plenty of water.”
- The provided meals were 30% fat, 15% protein and 55% carbohydrate.
  - `meal_menu`: “Fast day meals were provided as a 3-day rotating menu, and were formulated based on the American Heart Association (AHA) guidelines (30% kcal from fat, 15% kcal from protein, 55% kcal from carbohydrate) [].”

## Audit

**Effect**

- Body weight at week 12: 5.2 kg lower in the fasting group than in the control group (p < 0.001).
  - `weight_md`: “Body weight decreased (P < 0.001) by 5.2 ± 0.9 kg (6.5 ± 1.0%) in the ADF group, relative to the control group, by week 12.”
  - `weight_down`: “Body weight decreased (P < 0.001) by 5.2 ± 0.9 kg (6.5 ± 1.0%) in the ADF group, relative to the control group, by week 12.”
- That is 6.5% of body weight.
  - `weight_pct`: “Body weight decreased (P < 0.001) by 5.2 ± 0.9 kg (6.5 ± 1.0%) in the ADF group, relative to the control group, by week 12.”

**Weak end**

- The paper reports no confidence interval.
  - `weight_md`: “Body weight decreased (P < 0.001) by 5.2 ± 0.9 kg (6.5 ± 1.0%) in the ADF group, relative to the control group, by week 12.”
- Its ± figures are standard errors, which the read does not turn into a range.
  - `sem`: “Results are presented as means ± standard error of the mean (SEM).”
- So how far the true difference strays from 5.2 kg stays unknown.
  - `weight_md`: “Body weight decreased (P < 0.001) by 5.2 ± 0.9 kg (6.5 ± 1.0%) in the ADF group, relative to the control group, by week 12.”

**Limitation 1**

- Small: 15 people a group, for 12 weeks.
  - `limit_small`: “Thirdly, the sample size of each group was small (n = 15). Thus, this study may not be adequately powered to detect changes in certain CHD risk parameters (e.g. resistin).”
  - `limit_twelve`: “Thirty-two subjects (BMI 20–29.9 kg/m2) were randomized to either an ADF group or a control group for 12 weeks.”

**Limitation 2**

- Planned as normal weight against overweight; the authors merged the groups after the fact.
  - `limit_post_hoc`: “First and foremost, it must be acknowledged that this pilot study was originally designed to compare the effects of ADF in normal weight versus overweight individuals on body weight and CHD risk. Due to a low recruitment…”

**Limitation 3**

- Nobody measured physical activity.
  - `limit_activity`: “Secondly, physical activity was not assessed throughout the trial, thus the degree of weight loss associated with increased energy expenditure from exercise is not known.”

**Limitation 4**

- Food records: people with overweight under-report by about 30%, so the finding of little catch-up eating may be off.
  - `limit_food_records`: “Fourthly, this study employed food records to assess dietary intake/adherence. It is well known that overweight subject underreport food intake by ~30% [,]. Thus, our findings for the hyperphagic response on the feed day…”

**What most summaries miss**

- The blood-marker claims mix two tests.
- Triglycerides and LDL particle size differed from controls at week 12, but their changes did not (p = 0.22 and 0.13).
  - `tg_down`: “Triacylglycerol concentrations decreased (P = 0.01) in the ADF group relative to controls at week 12.”
  - `ldl_size_up`: “LDL particle size increased (P < 0.01) in the ADF group relative to controls by the end of the study.”
  - `tg_change_p`: “Triacylglycols (mg/dl) | ADF | 109 ± 13 | 87 ± 9 | 0.06 | 0.01 | -22 ± 11 | 0.22 |”
  - `ldl_size_change_p`: “LDL particle size (Å) | ADF | 254 ± 1 | 258 ± 2 | <0.01 | <0.01 | 4 ± 1 | 0.13 |”
- Adiponectin and leptin are the reverse (end-of-trial p = 0.15 and 0.55).
  - `adiponectin_up`: “Plasma adiponectin increased (P < 0.01) while leptin decreased (P = 0.03) in the ADF group versus controls by the end of the study.”
  - `leptin_down`: “Plasma adiponectin increased (P < 0.01) while leptin decreased (P = 0.03) in the ADF group versus controls by the end of the study.”
  - `adiponectin_w12_p`: “Adiponectin (ng/ml) | ADF | 10728 ± 1251 | 11401 ± 1197 | 0.58 | 0.15 | 672 ± 1191 | <0.01 |”
  - `leptin_w12_p`: “Leptin (ng/ml) | ADF | 25 ± 4 | 15 ± 3 | 0.04 | 0.55 | -10 ± 3 | 0.03 |”
- The authors sized the trial for LDL cholesterol, which showed no clear difference from controls.
  - `power_ldl`: “Sample size was calculated assuming a 10% change in LDL-cholesterol concentrations in the ADF group, with a power of 80% and an alpha risk of 5%.”
  - `ldl_ns`: “LDL cholesterol concentrations were reduced (P = 0.01) within the ADF group, but no significant between-group differences were noted.”

**Full receipts 1**

- Fat mass: 3.6 kg lower than controls (p < 0.001); lean mass showed no clear difference.
  - `fat_md`: “Fat mass was reduced (P < 0.001) by 3.6 ± 0.7 kg, and fat free mass did not change, versus controls.”
  - `fat_down`: “Fat mass was reduced (P < 0.001) by 3.6 ± 0.7 kg, and fat free mass did not change, versus controls.”
  - `lean_ns`: “No difference between groups for fat free mass at week 12 (Independent samples t-test).”

**Full receipts 2**

- CRP was lower than controls on both tests (p = 0.01).
  - `crp_down`: “CRP decreased (P = 0.01) in the ADF group relative to controls at week 12.”
  - `crp_change_p`: “C-reactive protein (mg/L) | ADF | 2 ± 1 | 1 ± 1 | 0.29 | 0.01 | -1 ± 1 | 0.01 |”

**Full receipts 3**

- Total cholesterol and blood pressure showed no clear difference from controls.
  - `chol_ns`: “However, changes in total cholesterol levels were not significantly different from controls at week 12.”
  - `bp_ns`: “Systolic and diastolic blood pressure decreased (P < 0.05) within the ADF group, but no significant between-group differences were noted.”
- HDL, homocysteine and resistin stayed level.
  - `hdl_ns`: “HDL cholesterol concentrations remained unchanged throughout the trial.”
  - `others_ns`: “Plasma homocysteine and resistin concentrations remained unchanged after 12 weeks of treatment.”

**Full receipts 4**

- Kept to the fast-day plan: 98%, by self-report.
  - `adherence`: “Adherence to the fast day protocol was high in the ADF group (98 ± 5%).”

**Full receipts 5**

- Thirty-two started and 30 finished; one left because they could not keep to the diet.
  - `randomized_32`: “Thirty-two subjects (BMI 20–29.9 kg/m2) were randomized to either an ADF group or a control group for 12 weeks.”
  - `completed_30`: “Thirty-two subjects commenced the study, with 30 completing the entire 12-week trial (Figure 1). After loss due to dropouts, the remaining subjects in each intervention group were as follows: ADF (n = 15) and control (n …”
  - `one_dropout_diet`: “It should be noted, however, that one normal weight subject dropped out of the trial due to an inability to adhere to the diet.”

**Full receipts 6**

- Side effects: two mild headaches and one case of constipation, early on.
  - `side_effects`: “A couple of adverse events were reported during the study. Two subjects experienced mild headaches during week 1 of the trial, which may or may not be related to dietary treatment. One other subject reported constipation…”

**Full receipts 7**

- Funded by a departmental grant; no conflicts of interest.
  - `funding`: “Departmental grant from Kinesiology and Nutrition at the University of Illinois, Chicago.”
  - `no_competing`: “The authors have no conflicts of interest to report.”

## Glossary

- **hyperphagia**: Eating much more than usual, here on the day after a fast. (rests on no_overeating)
- **kcal**: Kilocalories, the unit of food energy that labels usually just call calories. (rests on meal_kcal)

## Takeaways

**Takeaway 1**

- Fasting every other day, adults without obesity weighed 5.2 kg less than a control group after 12 weeks.
  - `weight_md`: “Body weight decreased (P < 0.001) by 5.2 ± 0.9 kg (6.5 ± 1.0%) in the ADF group, relative to the control group, by week 12.”

**Takeaway 2**

- Most of the difference was fat; lean mass showed no clear difference.
  - `fat_md`: “Fat mass was reduced (P < 0.001) by 3.6 ± 0.7 kg, and fat free mass did not change, versus controls.”
  - `lean_ns`: “No difference between groups for fat free mass at week 12 (Independent samples t-test).”

**Takeaway 3**

- Small and short, and the authors merged the groups after the fact.
  - `limit_small`: “Thirdly, the sample size of each group was small (n = 15). Thus, this study may not be adequately powered to detect changes in certain CHD risk parameters (e.g. resistin).”
  - `limit_twelve`: “Thirty-two subjects (BMI 20–29.9 kg/m2) were randomized to either an ADF group or a control group for 12 weeks.”
  - `limit_post_hoc`: “First and foremost, it must be acknowledged that this pilot study was originally designed to compare the effects of ADF in normal weight versus overweight individuals on body weight and CHD risk. Due to a low recruitment…”

## Steps (what a reader can tick)

- **Fast day: one meal of 400 to 600 kcal** (`fast-day-one-meal`, evidence: weight_md): On alternate days, as the fasting group did for 12 weeks. A tick records the fast day, not any change in your weight. Refs: meal_kcal, fast_day_quarter
- **Eat the fast-day meal between 12.00 pm and 2.00 pm** (`fast-day-meal-midday`, evidence: none, weight 0): The trial's timing rule, not tested on its own, so it carries no weight. Refs: meal_window

## Simulator

`estimate-explorer`: Body weight (kg) → `weight_md` = 5.2 ± 0.9 kg; Fat mass (kg) → `fat_md` = 3.6 ± 0.7 kg

## Instagram deck

**Slide 1 (hook) heading**

- Does fasting every other day work if you're not obese?

**Slide 1 body**

- Adults ate one meal of 400 to 600 kcal every other day, for 12 weeks.
  - `meal_kcal`: “The feed and fast days began at midnight each day, and all fast day meals were consumed between 12.00 pm and 2.00 pm to ensure that each subject was undergoing the same duration of fasting. ADF subjects were provided wit…”
  - `twelve_weeks`: “A 12-week, randomized, controlled, parallel-arm feeding trial was implemented as a means of testing the study objectives. Subjects were randomized by KAV by way of a stratified random sample. Subjects were first divided …”

  art: `{"motif": "pair", "a": {"value": {"text": "489", "ref": "fast_w12"}, "label": "kcal on a fast day [fast_w12]"}, "b": {"value": {"text": "1856", "ref": "feed_w12"}, "label": "kcal on a feed day [feed_w12]"}}`

**Slide 2 (finding) heading**

- After 12 weeks, the fasting group weighed 5.2 kg less.
  - `weight_md`: “Body weight decreased (P < 0.001) by 5.2 ± 0.9 kg (6.5 ± 1.0%) in the ADF group, relative to the control group, by week 12.”

**Slide 2 body**

- Most of it was fat: 3.6 kg.
  - `fat_md`: “Fat mass was reduced (P < 0.001) by 3.6 ± 0.7 kg, and fat free mass did not change, versus controls.”

  art: `{"motif": "verdicts", "rows": [{"label": "Body weight [-]", "verdict": "lower", "fact": "fact:weight_down"}, {"label": "Fat mass [-]", "verdict": "lower", "fact": "fact:fat_down"}, {"label": "Lean mass [-]", "verdict": "no-clear-difference", "fact": "fact:lean_ns"}]}`

**Slide 3 (why) heading**

- Free days did not refill the gap.
  - `no_overeating`: “Complementary to previous reports [,], there was very little or no hyperphagic response on the feed day in response to the lack of food on the fast day. This lack of hyperphagia allowed for overall energy restriction to …”

**Slide 3 body**

- On free days they ate about what the control group ate, with little catch-up eating (hyperphagia).
  - `feed_w12`: “Feed day energy intake (kcal/d) | ADF | 1874 ± 136 | 1856 ± 229 | 0.93 | 0.92 | -18 ± 186 | 0.50 |”
  - `ctrl_w12`: “| Control | 1873 ± 243 | 1790 ± 286 | 0.71 | | -82 ± 75 | |”

**Slide 4 (who) heading**

- Tested in 30 adults without obesity.
  - `completed_30`: “Thirty-two subjects commenced the study, with 30 completing the entire 12-week trial (Figure 1). After loss due to dropouts, the remaining subjects in each intervention group were as follows: ADF (n = 15) and control (n …”

  art: `{"motif": "who", "tested": ["15 fasting, 15 eating as usual [per_group_15]", "Aged 35 to 65 [inclusion_age]", "Normal weight or overweight [inclusion_bmi]"], "notTested": ["Obesity [inclusion_bmi]", "Diabetes or heart disease [inclusion_health]", "Longer than 12 weeks [limit_twelve]"]}`

**Slide 5 (receipts) heading**

- How sure can we be?

  art: `{"motif": "checks", "strong": "Groups set by a random draw; body fat scanned. [stratified, dxa]", "weak": "Small, and groups merged after the fact. [limit_small, limit_post_hoc]", "missing": "Physical activity. [limit_activity]"}`

**Slide 6 (cta) heading**

- Could you eat one small meal every other day?

**Slide 6 body**

- Compare weight and fat lost against the control group.
  - `weight_md`: “Body weight decreased (P < 0.001) by 5.2 ± 0.9 kg (6.5 ± 1.0%) in the ADF group, relative to the control group, by week 12.”
  - `fat_md`: “Fat mass was reduced (P < 0.001) by 3.6 ± 0.7 kg, and fat free mass did not change, versus controls.”

**Alternate opening “The number”**

- What do 12 weeks of every-other-day fasting do?
  - `twelve_weeks`: “A 12-week, randomized, controlled, parallel-arm feeding trial was implemented as a means of testing the study objectives. Subjects were randomized by KAV by way of a stratified random sample. Subjects were first divided …”
- Adults without obesity ate one small meal on alternate days.
  - `meal_kcal`: “The feed and fast days began at midnight each day, and all fast day meals were consumed between 12.00 pm and 2.00 pm to ensure that each subject was undergoing the same duration of fasting. ADF subjects were provided wit…”
  - `inclusion_bmi`: “Inclusion criteria were as follows: BMI between 20 and 29.9 kg/m2; age between 35 and 65 years; pre-menopausal or post-menopausal (absence of menses for more than 2 years); lightly active (< 3 h/week of light intensity e…”

  art: `{"motif": "number", "value": {"text": "5.2", "ref": "weight_md"}, "unit": "kg [-]", "label": "less than the control group [weight_md]"}`

**Caption**

- A randomized trial in 30 adults without obesity.
  - `stratified`: “A 12-week, randomized, controlled, parallel-arm feeding trial was implemented as a means of testing the study objectives. Subjects were randomized by KAV by way of a stratified random sample. Subjects were first divided …”
  - `completed_30`: “Thirty-two subjects commenced the study, with 30 completing the entire 12-week trial (Figure 1). After loss due to dropouts, the remaining subjects in each intervention group were as follows: ADF (n = 15) and control (n …”
  - `inclusion_bmi`: “Inclusion criteria were as follows: BMI between 20 and 29.9 kg/m2; age between 35 and 65 years; pre-menopausal or post-menopausal (absence of menses for more than 2 years); lightly active (< 3 h/week of light intensity e…”
- Every other day, the fasting group ate one meal of 400 to 600 kcal.
  - `meal_kcal`: “The feed and fast days began at midnight each day, and all fast day meals were consumed between 12.00 pm and 2.00 pm to ensure that each subject was undergoing the same duration of fasting. ADF subjects were provided wit…”
- After 12 weeks, they weighed 5.2 kg less than the control group.
  - `weight_md`: “Body weight decreased (P < 0.001) by 5.2 ± 0.9 kg (6.5 ± 1.0%) in the ADF group, relative to the control group, by week 12.”
- Small, 12 weeks, and the authors merged the groups after the fact.
  - `limit_small`: “Thirdly, the sample size of each group was small (n = 15). Thus, this study may not be adequately powered to detect changes in certain CHD risk parameters (e.g. resistin).”
  - `limit_twelve`: “Thirty-two subjects (BMI 20–29.9 kg/m2) were randomized to either an ADF group or a control group for 12 weeks.”
  - `limit_post_hoc`: “First and foremost, it must be acknowledged that this pilot study was originally designed to compare the effects of ADF in normal weight versus overweight individuals on body weight and CHD risk. Due to a low recruitment…”
- Full read and the weight explorer: link in bio.

Hashtags: #intermittentfasting #weightloss #nutrition #evidencebased #clinicaltrial
