# Opus trial, paper 3 of 6: short sleep and how appealing sweets look to teens, a draft for your review

Simon SL et al., *PLoS ONE* 2015, doi:10.1371/journal.pone.0115434 (PMC4338308, CC-BY). Free tier. **Not published** (`publishedAt` null).
A randomized crossover trial: 31 teens aged 14 to 17 each spent five nights with 6.5 hours in bed and five with 10, in random order, sleeping at home with a fixed wake time. After each block they rated 84 food photos and their hunger.

**How this was made.** Claude Opus 5.5 wrote it by hand in Claude Code, with no API key: the extraction with its coverage map, the read, the deck and one figure. The project's real gate and lint judged every file. Treat it as an **upper bound** for a one-shot API run. Every refusal and fix: `fixes.md`.

**What to decide, or look at closely**

1. **The paper gives two p-values for its main result.** The abstract says p = .045; the results section says p = .049 (same t = 2.07). The read prints both, in the weak-end line, and says the weak end may sit close to zero. There is no confidence interval and no mean rating per condition: the only size is Cohen's d = .41.
2. **The eating numbers are weaker than they look.** In this sample, food eaten was an exploratory check in 23 teens with **no test reported**: 1860 against 1647 kcal, and 0.74 against 0.49 servings of sweets (the "52% more"), with an SD of 1.49 on the 0.74. The read keeps these out of the mechanism and the deck and puts them in the audit's "missed" line. The only tested intake numbers are pooled with the authors' earlier study (68 teens): calories p = .039, sweets p = .017. The simulator uses those pooled numbers and says "both studies" on each row.
3. **The step "Give yourself 10 hours in bed" carries weight (graded low: a crossover under 50 people).** It is the teens' healthy-sleep schedule. For an adult reader, 10 hours in bed is a lot; the population panel says who was tested. You may prefer it at weight 0, or reworded for teens only. "Wake at the same time every day" was a rule on both schedules, not tested, so it carries weight 0.
4. **The deck's "why" slide has no picture**, as in papers 1 and 2: the authors' "hedonic value" idea has no picture motif and no reviewed concept.
5. **Weak points the read states plainly:** small sample; measured only after five short nights; hunger only self-rated; activity and the menstrual cycle not tracked; a two-day wash-out.

Every sentence is listed below with the paper's own words for each fact it cites. `[-]` means a sentence cites nothing. Long quotes are cut at 220 characters.
Deck: `deck/sheet-dark.png`, `deck/sheet-light.png` (6 slides, then 1 alternate opening). Figure: `figure/bedtimes.html` (light and dark, full and feed-card views).

## Feed card and top of the read

**Title**

- Five short nights: how appealing sweets looked to 31 teens
  - `five_nights`: “The three-week protocol consisted of a baseline week, followed randomly by five consecutive nights of SR (6.5 hours in bed) versus healthy sleep duration (HS; 10 hours in bed), a 2-night wash-out period, and a 5-night cr…”
  - `final_31`: “Of 38 teens randomized to the sleep manipulation, one dropped out and 6 were non-adherent to the sleep protocol (defined as <60 minutes difference in average sleep duration across the SR and HS conditions), leaving a fin…”

**Teaser**

- Teens spent five nights with 6.5 hours in bed and five with 10, in random order.
  - `five_nights`: “The three-week protocol consisted of a baseline week, followed randomly by five consecutive nights of SR (6.5 hours in bed) versus healthy sleep duration (HS; 10 hours in bed), a 2-night wash-out period, and a 5-night cr…”
  - `sr_in_bed`: “The three-week protocol consisted of a baseline week, followed randomly by five consecutive nights of SR (6.5 hours in bed) versus healthy sleep duration (HS; 10 hours in bed), a 2-night wash-out period, and a 5-night cr…”
  - `hs_in_bed`: “The three-week protocol consisted of a baseline week, followed randomly by five consecutive nights of SR (6.5 hours in bed) versus healthy sleep duration (HS; 10 hours in bed), a 2-night wash-out period, and a 5-night cr…”
  - `randomized_order`: “Adolescents who successfully completed the baseline week were randomized to an order of the experimental conditions (SR first vs. HS first) in a counterbalanced, within-subjects crossover design.”
- After the short nights, they rated photos of sweets and desserts as more appealing.
  - `sweets_more_appealing`: “Teens rated pictures of sweet/dessert foods to be more appealing after SR than after HS (Cohen’s d = .41, t = 2.07, p = .045).”
- Their hunger showed no clear difference.
  - `hunger_ns`: “the effect of sleep manipulation was non-significant for self-reported hunger and the appeal of non-sweet foods (p >.10).”

**Hook**

- Five nights of 6.5 hours in bed, and teens rated photos of sweets and desserts as more appealing.
  - `five_nights`: “The three-week protocol consisted of a baseline week, followed randomly by five consecutive nights of SR (6.5 hours in bed) versus healthy sleep duration (HS; 10 hours in bed), a 2-night wash-out period, and a 5-night cr…”
  - `sr_in_bed`: “The three-week protocol consisted of a baseline week, followed randomly by five consecutive nights of SR (6.5 hours in bed) versus healthy sleep duration (HS; 10 hours in bed), a 2-night wash-out period, and a 5-night cr…”
  - `sweets_more_appealing`: “Teens rated pictures of sweet/dessert foods to be more appealing after SR than after HS (Cohen’s d = .41, t = 2.07, p = .045).”
- Their hunger showed no clear difference.
  - `hunger_ns`: “the effect of sleep manipulation was non-significant for self-reported hunger and the appeal of non-sweet foods (p >.10).”

**Card question**

- Do short nights make sweets look better to teens?
  - `sweets_more_appealing`: “Teens rated pictures of sweet/dessert foods to be more appealing after SR than after HS (Cohen’s d = .41, t = 2.07, p = .045).”

**Card headline**

- After five short nights, teens rated sweets and desserts as more appealing.
  - `five_nights`: “The three-week protocol consisted of a baseline week, followed randomly by five consecutive nights of SR (6.5 hours in bed) versus healthy sleep duration (HS; 10 hours in bed), a 2-night wash-out period, and a 5-night cr…”
  - `sweets_more_appealing`: “Teens rated pictures of sweet/dessert foods to be more appealing after SR than after HS (Cohen’s d = .41, t = 2.07, p = .045).”

**Card support**

- Hunger and the appeal of other foods showed no clear difference.
  - `hunger_ns`: “the effect of sleep manipulation was non-significant for self-reported hunger and the appeal of non-sweet foods (p >.10).”
  - `nonsweets_ns`: “the effect of sleep manipulation was non-significant for self-reported hunger and the appeal of non-sweet foods (p >.10).”

**Source line: who**

- 31 teens aged 14 to 17
  - `final_31`: “Of 38 teens randomized to the sleep manipulation, one dropped out and 6 were non-adherent to the sleep protocol (defined as <60 minutes difference in average sleep duration across the SR and HS conditions), leaving a fin…”
  - `inclusion`: “Similar to our prior study [], we enrolled typically-developing 14–17 year-olds without a current psychiatric diagnosis or history of neurological illness/injury.”

**Source line: span**

- five short and five long nights each
  - `five_nights`: “The three-week protocol consisted of a baseline week, followed randomly by five consecutive nights of SR (6.5 hours in bed) versus healthy sleep duration (HS; 10 hours in bed), a 2-night wash-out period, and a 5-night cr…”

**Feed card figure alt text**

- Two bars across a night, one for each schedule.
- On the short nights, sleep starts much later; both bars end at the same wake time.
  - `later_onset`: “As planned, this difference in sleep duration was due to later sleep onset during SR (after midnight: 0:34 ± 0:45) than HS (22:06 ± 0:57) (p<.0001), in the presence of highly similar wake times across conditions (SR: 7:1…”
  - `wake_same`: “As planned, this difference in sleep duration was due to later sleep onset during SR (after midnight: 0:34 ± 0:45) than HS (22:06 ± 0:57) (p<.0001), in the presence of highly similar wake times across conditions (SR: 7:1…”

**Population panel**

- Who this was tested in: 31 typically developing teens aged 14 to 17.
  - `final_31`: “Of 38 teens randomized to the sleep manipulation, one dropped out and 6 were non-adherent to the sleep protocol (defined as <60 minutes difference in average sleep duration across the SR and HS conditions), leaving a fin…”
  - `inclusion`: “Similar to our prior study [], we enrolled typically-developing 14–17 year-olds without a current psychiatric diagnosis or history of neurological illness/injury.”
- 59% were girls; 52% were white and 41% African-American.
  - `female_59`: “Of 38 teens randomized to the sleep manipulation, one dropped out and 6 were non-adherent to the sleep protocol (defined as <60 minutes difference in average sleep duration across the SR and HS conditions), leaving a fin…”
  - `ethnicity`: “Of 38 teens randomized to the sleep manipulation, one dropped out and 6 were non-adherent to the sleep protocol (defined as <60 minutes difference in average sleep duration across the SR and HS conditions), leaving a fin…”
- The study left out teens with marked obesity.
  - `exclusion_obesity`: “In addition, we excluded for intellectual disability or marked obesity (IQ<70 or BMI>30, initially screened by parent and teen report, then confirmed objectively during a baseline visit).”
- Each teen slept at home on both schedules, in an order set by a random draw.
  - `at_home`: “All sleep occurred at home and was monitored via a daily sleep diary and actigraphy (MicroMotionlogger Sleep Watch, Ambulatory Monitoring, Inc.).”
  - `randomized_order`: “Adolescents who successfully completed the baseline week were randomized to an order of the experimental conditions (SR first vs. HS first) in a counterbalanced, within-subjects crossover design.”
- The result describes teens like these, after five short nights.
  - `final_31`: “Of 38 teens randomized to the sleep manipulation, one dropped out and 6 were non-adherent to the sleep protocol (defined as <60 minutes difference in average sleep duration across the SR and HS conditions), leaving a fin…”
  - `limit_after_five`: “We recommend future research also overcome several limitations of this study, including our limited outcome measures, measurement exclusively after 5 nights of SR (as opposed to examining change as sleep debt accumulates…”

## Mechanism

**Paragraph 1**

- Picture a scoreboard in your head that rates each food as it comes into view.
  - `hedonic_shift`: “One potential mechanism is a shift in hedonic value.”
- The score is how much pleasure the food seems to promise; psychologists call it hedonic value.
  - `hedonic_shift`: “One potential mechanism is a shift in hedonic value.”
- A higher score makes a food more likely to get eaten.
  - `appeal_to_intake`: “Using behavioral economics theory, if SR causes teens to perceive sweet-tasting foods as more appealing, the intake of those foods would be expected to increase [].”

**Paragraph 2**

- The authors' idea is that short sleep turns up the score for sweet things.
  - `hedonic_shift`: “One potential mechanism is a shift in hedonic value.”
  - `may_increase_appeal`: “Finally, it took an important step in the construction of a mechanistic causal model by which SR might influence dietary choices, suggesting that SR may increase the subjective appeal of already attractive sweet/dessert …”
- Earlier work in adults points the same way.
- Sleep-deprived adults crave calorie-dense food more.
  - `adult_cravings`: “Sleep-deprived adults experience an increase in subjective cravings for calorie-dense foods.”
- In brain scans, food photos set off reward areas more after short sleep.
  - `adult_brain`: “Consistent with this, adult functional neuroimaging studies show that pictures of appealing foods trigger a greater response in reward-relevant brain regions after SR than after a period of full rest [].”

**Paragraph 3**

- This trial checked the score in teens.
- Each teen spent five nights with 6.5 hours in bed and five with 10.
  - `five_nights`: “The three-week protocol consisted of a baseline week, followed randomly by five consecutive nights of SR (6.5 hours in bed) versus healthy sleep duration (HS; 10 hours in bed), a 2-night wash-out period, and a 5-night cr…”
  - `sr_in_bed`: “The three-week protocol consisted of a baseline week, followed randomly by five consecutive nights of SR (6.5 hours in bed) versus healthy sleep duration (HS; 10 hours in bed), a 2-night wash-out period, and a 5-night cr…”
  - `hs_in_bed`: “The three-week protocol consisted of a baseline week, followed randomly by five consecutive nights of SR (6.5 hours in bed) versus healthy sleep duration (HS; 10 hours in bed), a 2-night wash-out period, and a 5-night cr…”
- Only the bedtime moved; the wake time stayed the same, weekends included.
  - `bedtime_moved`: “When in the SR condition, teens’ bedtimes were adjusted to allow 6.5 hours in bed each night for 5 nights.”
  - `same_wake`: “That wake time was maintained throughout the study (i.e., subjects were not allowed to “sleep in” any morning during the study, including the weekends) to minimize shifts in circadian rhythm.”
- They slept 6.7 hours a night on the short schedule and 9.1 on the long one.
  - `sleep_sr`: “The nightly sleep for the other 28 was markedly shorter during SR (6.7 ± 0.6 hr) than HS (9.1 ± 0.7 hr) (p<.0001).”
  - `sleep_hs`: “The nightly sleep for the other 28 was markedly shorter during SR (6.7 ± 0.6 hr) than HS (9.1 ± 0.7 hr) (p<.0001).”

**Paragraph 4**

- The morning after each block, they rated 84 food photos from “gross” to “delicious”.
  - `photo_sets`: “Two matched sets with 84 photos of 42 sweets/desserts and 42 non-sweets (fruits/vegetables, meat/eggs) were compiled. One set was viewed at each experimental week visit and teens were asked to rate how appetizing each pi…”
  - `rating_scale`: “Two matched sets with 84 photos of 42 sweets/desserts and 42 non-sweets (fruits/vegetables, meat/eggs) were compiled. One set was viewed at each experimental week visit and teens were asked to rate how appetizing each pi…”
- Sweets and desserts looked more appealing after the short nights.
  - `sweets_more_appealing`: “Teens rated pictures of sweet/dessert foods to be more appealing after SR than after HS (Cohen’s d = .41, t = 2.07, p = .045).”
- Meat, eggs, fruit and vegetables showed no clear difference.
  - `nonsweets_ns`: “the effect of sleep manipulation was non-significant for self-reported hunger and the appeal of non-sweet foods (p >.10).”
- Neither did hunger.
  - `hunger_ns`: “the effect of sleep manipulation was non-significant for self-reported hunger and the appeal of non-sweet foods (p >.10).”

**Paragraph 5**

- So what moved was how sweets looked; hunger showed no clear difference.
  - `sweets_more_appealing`: “Teens rated pictures of sweet/dessert foods to be more appealing after SR than after HS (Cohen’s d = .41, t = 2.07, p = .045).”
  - `hunger_ns`: “the effect of sleep manipulation was non-significant for self-reported hunger and the appeal of non-sweet foods (p >.10).”
- The authors see this as one route from short sleep to eating more sweets.
  - `may_increase_appeal`: “Finally, it took an important step in the construction of a mechanistic causal model by which SR might influence dietary choices, suggesting that SR may increase the subjective appeal of already attractive sweet/dessert …”

**Figure caption**

- When the teens fell asleep and woke, on average, under each schedule.
  - `onset_sr`: “As planned, this difference in sleep duration was due to later sleep onset during SR (after midnight: 0:34 ± 0:45) than HS (22:06 ± 0:57) (p<.0001), in the presence of highly similar wake times across conditions (SR: 7:1…”
  - `onset_hs`: “As planned, this difference in sleep duration was due to later sleep onset during SR (after midnight: 0:34 ± 0:45) than HS (22:06 ± 0:57) (p<.0001), in the presence of highly similar wake times across conditions (SR: 7:1…”
  - `wake_sr`: “As planned, this difference in sleep duration was due to later sleep onset during SR (after midnight: 0:34 ± 0:45) than HS (22:06 ± 0:57) (p<.0001), in the presence of highly similar wake times across conditions (SR: 7:1…”
  - `wake_hs`: “As planned, this difference in sleep duration was due to later sleep onset during SR (after midnight: 0:34 ± 0:45) than HS (22:06 ± 0:57) (p<.0001), in the presence of highly similar wake times across conditions (SR: 7:1…”

**Figure alt text**

- Two bars across a night.
- On the short nights, sleep starts at 0:34 and ends at 7:12.
  - `onset_sr`: “As planned, this difference in sleep duration was due to later sleep onset during SR (after midnight: 0:34 ± 0:45) than HS (22:06 ± 0:57) (p<.0001), in the presence of highly similar wake times across conditions (SR: 7:1…”
  - `wake_sr`: “As planned, this difference in sleep duration was due to later sleep onset during SR (after midnight: 0:34 ± 0:45) than HS (22:06 ± 0:57) (p<.0001), in the presence of highly similar wake times across conditions (SR: 7:1…”
- On the long nights, it starts at 22:06 and ends at 7:11.
  - `onset_hs`: “As planned, this difference in sleep duration was due to later sleep onset during SR (after midnight: 0:34 ± 0:45) than HS (22:06 ± 0:57) (p<.0001), in the presence of highly similar wake times across conditions (SR: 7:1…”
  - `wake_hs`: “As planned, this difference in sleep duration was due to later sleep onset during SR (after midnight: 0:34 ± 0:45) than HS (22:06 ± 0:57) (p<.0001), in the presence of highly similar wake times across conditions (SR: 7:1…”
- The bars end together, because only the bedtime moved.
  - `wake_same`: “As planned, this difference in sleep duration was due to later sleep onset during SR (after midnight: 0:34 ± 0:45) than HS (22:06 ± 0:57) (p<.0001), in the presence of highly similar wake times across conditions (SR: 7:1…”
  - `bedtime_moved`: “When in the SR condition, teens’ bedtimes were adjusted to allow 6.5 hours in bed each night for 5 nights.”

## Protocol

**Paragraph 1**

- The tested schedule: five nights in a row with 10 hours in bed, against five with 6.5 hours.
  - `five_nights`: “The three-week protocol consisted of a baseline week, followed randomly by five consecutive nights of SR (6.5 hours in bed) versus healthy sleep duration (HS; 10 hours in bed), a 2-night wash-out period, and a 5-night cr…”
  - `hs_in_bed`: “The three-week protocol consisted of a baseline week, followed randomly by five consecutive nights of SR (6.5 hours in bed) versus healthy sleep duration (HS; 10 hours in bed), a 2-night wash-out period, and a 5-night cr…”
  - `sr_in_bed`: “The three-week protocol consisted of a baseline week, followed randomly by five consecutive nights of SR (6.5 hours in bed) versus healthy sleep duration (HS; 10 hours in bed), a 2-night wash-out period, and a 5-night cr…”
- The wake time stayed fixed every morning, weekends included, so only the bedtime moved.
  - `same_wake`: “That wake time was maintained throughout the study (i.e., subjects were not allowed to “sleep in” any morning during the study, including the weekends) to minimize shifts in circadian rhythm.”
  - `bedtime_moved`: “When in the SR condition, teens’ bedtimes were adjusted to allow 6.5 hours in bed each night for 5 nights.”

**Paragraph 2**

- With 10 hours in bed, the teens were asleep by about 22:06 and slept 9.1 hours.
  - `hs_in_bed`: “The three-week protocol consisted of a baseline week, followed randomly by five consecutive nights of SR (6.5 hours in bed) versus healthy sleep duration (HS; 10 hours in bed), a 2-night wash-out period, and a 5-night cr…”
  - `onset_hs`: “As planned, this difference in sleep duration was due to later sleep onset during SR (after midnight: 0:34 ± 0:45) than HS (22:06 ± 0:57) (p<.0001), in the presence of highly similar wake times across conditions (SR: 7:1…”
  - `sleep_hs`: “The nightly sleep for the other 28 was markedly shorter during SR (6.7 ± 0.6 hr) than HS (9.1 ± 0.7 hr) (p<.0001).”
- They took no naps and kept caffeine to 1 coffee or energy drink a day.
  - `no_naps_caffeine`: “Teens were asked to refrain from napping and limit caffeine intake to no more than 1 coffee or energy drink per day or no more than 2 caffeinated sodas per day.”
- The trial measured how appealing food looked, not anyone's health.
  - `primary_appeal`: “The primary outcomes for this study were obtained via a computerized food-appeal rating-system.”

## Audit

**Effect**

- Teens rated sweet and dessert photos more appealing after short sleep than after healthy sleep: a standardized effect (Cohen’s d) of .41.
  - `sweets_more_appealing`: “Teens rated pictures of sweet/dessert foods to be more appealing after SR than after HS (Cohen’s d = .41, t = 2.07, p = .045).”
  - `sweets_d`: “Teens rated pictures of sweet/dessert foods to be more appealing after SR than after HS (Cohen’s d = .41, t = 2.07, p = .045).”
- By convention, .20 is small and .50 medium.
  - `d_convention`: “By convention, d = .20 indicates a small effect and d = .50 indicates a medium-sized effect [].”

**Weak end**

- The paper reports no confidence interval for this effect.
  - `sweets_more_appealing`: “Teens rated pictures of sweet/dessert foods to be more appealing after SR than after HS (Cohen’s d = .41, t = 2.07, p = .045).”
- Its test gives p = .045 in the abstract and p = .049 in the results.
  - `sweets_p_abstract`: “Teens rated pictures of sweet/dessert foods to be more appealing after SR than after HS (Cohen’s d = .41, t = 2.07, p = .045).”
  - `sweets_p_results`: “Images of sweets/desserts were rated more appealing after SR than HS (t = 2.07, p = .049), but the effect of sleep manipulation was non-significant for self-reported hunger and the appeal of non-sweet foods (p >.10).”
- Both sit just inside the usual line, so the weak end may sit close to zero.

**Limitation 1**

- Small: 31 teens, measured only after five short nights.
  - `limit_small`: “We recommend future research also overcome several limitations of this study, including our limited outcome measures, measurement exclusively after 5 nights of SR (as opposed to examining change as sleep debt accumulates…”
  - `final_31`: “Of 38 teens randomized to the sleep manipulation, one dropped out and 6 were non-adherent to the sleep protocol (defined as <60 minutes difference in average sleep duration across the SR and HS conditions), leaving a fin…”
  - `limit_after_five`: “We recommend future research also overcome several limitations of this study, including our limited outcome measures, measurement exclusively after 5 nights of SR (as opposed to examining change as sleep debt accumulates…”

**Limitation 2**

- Hunger was only self-rated, and nobody measured physical activity.
  - `limit_hunger_measure`: “Lastly, more sensitive measurements of hunger integrating both subjective and physiological measures would be helpful.”
  - `limit_activity`: “We recommend future research also overcome several limitations of this study, including our limited outcome measures, measurement exclusively after 5 nights of SR (as opposed to examining change as sleep debt accumulates…”

**Limitation 3**

- The study did not track the menstrual cycle, and the wash-out between schedules lasted 2 days.
  - `limit_menstrual`: “Additionally, our study did not take into account female menstrual cycle; while sleep timing and composition show relatively little fluctuation across the menstrual cycle in healthy women [], increases in caloric and mac…”
  - `limit_washout`: “Our study also used a relatively short “washout” period (2 days), though it is reassuring to note that we found no evidence of carryover effects across conditions, and similar experimental work has found that 2 days is s…”

**What most summaries miss**

- Food eaten was only an exploratory check, in 23 teens, with no test reported for this sample.
  - `diet_exploratory`: “To allow for exploratory comparison against our prior dietary findings, roughly 3/4 of the sample also underwent a 24-hour diet recall at each experimental week assessment visit using the USDA Multiple Pass Method [].”
  - `diet_23`: “Using the same criteria, the 23 teens in this study with dietary data ate 11% more calories (kcal) during SR (1860 ± 689 kcal) than HS (1647 ± 508 kcal) and 52% more servings of sweets/desserts during SR (0.74 ± 1.49 ser…”
- Calories were 1860 after short nights against 1647 after long ones.
  - `kcal_sr`: “Using the same criteria, the 23 teens in this study with dietary data ate 11% more calories (kcal) during SR (1860 ± 689 kcal) than HS (1647 ± 508 kcal) and 52% more servings of sweets/desserts during SR (0.74 ± 1.49 ser…”
  - `kcal_hs`: “Using the same criteria, the 23 teens in this study with dietary data ate 11% more calories (kcal) during SR (1860 ± 689 kcal) than HS (1647 ± 508 kcal) and 52% more servings of sweets/desserts during SR (0.74 ± 1.49 ser…”
- The 52% rise in sweets was 0.74 against 0.49 servings a day.
  - `sweets_more_eaten`: “Using the same criteria, the 23 teens in this study with dietary data ate 11% more calories (kcal) during SR (1860 ± 689 kcal) than HS (1647 ± 508 kcal) and 52% more servings of sweets/desserts during SR (0.74 ± 1.49 ser…”
  - `sweets_sr`: “Using the same criteria, the 23 teens in this study with dietary data ate 11% more calories (kcal) during SR (1860 ± 689 kcal) than HS (1647 ± 508 kcal) and 52% more servings of sweets/desserts during SR (0.74 ± 1.49 ser…”
  - `sweets_hs`: “Using the same criteria, the 23 teens in this study with dietary data ate 11% more calories (kcal) during SR (1860 ± 689 kcal) than HS (1647 ± 508 kcal) and 52% more servings of sweets/desserts during SR (0.74 ± 1.49 ser…”

**Full receipts 1**

- Pooled with the authors' earlier study, 68 teens ate 1934 kcal against 1764 (p = .039).
  - `pooled_68`: “Applying our previously-published selection criteria to pool data from both studies (n = 68), teens consumed 10% more calories in a 24-hour period during SR (1934 ± 740 kcal) than HS (1764 ± 649 kcal), d = .25, t = 2.1 (…”
  - `pooled_kcal_sr`: “Applying our previously-published selection criteria to pool data from both studies (n = 68), teens consumed 10% more calories in a 24-hour period during SR (1934 ± 740 kcal) than HS (1764 ± 649 kcal), d = .25, t = 2.1 (…”
  - `pooled_kcal_hs`: “Applying our previously-published selection criteria to pool data from both studies (n = 68), teens consumed 10% more calories in a 24-hour period during SR (1934 ± 740 kcal) than HS (1764 ± 649 kcal), d = .25, t = 2.1 (…”
  - `pooled_kcal_p`: “Applying our previously-published selection criteria to pool data from both studies (n = 68), teens consumed 10% more calories in a 24-hour period during SR (1934 ± 740 kcal) than HS (1764 ± 649 kcal), d = .25, t = 2.1 (…”
- Sweets: 1.46 against 0.75 servings a day (p = .017).
  - `pooled_sweets_sr`: “Applying our previously-published selection criteria to pool data from both studies (n = 68), teens consumed 10% more calories in a 24-hour period during SR (1934 ± 740 kcal) than HS (1764 ± 649 kcal), d = .25, t = 2.1 (…”
  - `pooled_sweets_hs`: “Applying our previously-published selection criteria to pool data from both studies (n = 68), teens consumed 10% more calories in a 24-hour period during SR (1934 ± 740 kcal) than HS (1764 ± 649 kcal), d = .25, t = 2.1 (…”
  - `pooled_sweets_p`: “Applying our previously-published selection criteria to pool data from both studies (n = 68), teens consumed 10% more calories in a 24-hour period during SR (1934 ± 740 kcal) than HS (1764 ± 649 kcal), d = .25, t = 2.1 (…”

**Full receipts 2**

- Sleep per night, by wrist sensor in 28 teens: 6.7 hours short, 9.1 hours long.
  - `sleep_28`: “The nightly sleep for the other 28 was markedly shorter during SR (6.7 ± 0.6 hr) than HS (9.1 ± 0.7 hr) (p<.0001).”
  - `sleep_sr`: “The nightly sleep for the other 28 was markedly shorter during SR (6.7 ± 0.6 hr) than HS (9.1 ± 0.7 hr) (p<.0001).”
  - `sleep_hs`: “The nightly sleep for the other 28 was markedly shorter during SR (6.7 ± 0.6 hr) than HS (9.1 ± 0.7 hr) (p<.0001).”

**Full receipts 3**

- Sleep began at 0:34 against 22:06; waking came at 7:12 against 7:11.
  - `onset_sr`: “As planned, this difference in sleep duration was due to later sleep onset during SR (after midnight: 0:34 ± 0:45) than HS (22:06 ± 0:57) (p<.0001), in the presence of highly similar wake times across conditions (SR: 7:1…”
  - `onset_hs`: “As planned, this difference in sleep duration was due to later sleep onset during SR (after midnight: 0:34 ± 0:45) than HS (22:06 ± 0:57) (p<.0001), in the presence of highly similar wake times across conditions (SR: 7:1…”
  - `wake_sr`: “As planned, this difference in sleep duration was due to later sleep onset during SR (after midnight: 0:34 ± 0:45) than HS (22:06 ± 0:57) (p<.0001), in the presence of highly similar wake times across conditions (SR: 7:1…”
  - `wake_hs`: “As planned, this difference in sleep duration was due to later sleep onset during SR (after midnight: 0:34 ± 0:45) than HS (22:06 ± 0:57) (p<.0001), in the presence of highly similar wake times across conditions (SR: 7:1…”

**Full receipts 4**

- No sign that the first schedule carried over into the second.
  - `no_carryover`: “No significant interaction was found across any of our outcome measures (all p > .05), indicating that the effect of sleep manipulation did not vary based on the order in which HS or SR was presented.”

**Full receipts 5**

- Of 38 randomized, one dropped out and 6 broke the schedule, leaving 31.
  - `randomized_38`: “Of 38 teens randomized to the sleep manipulation, one dropped out and 6 were non-adherent to the sleep protocol (defined as <60 minutes difference in average sleep duration across the SR and HS conditions), leaving a fin…”
  - `dropped_7`: “Of 38 teens randomized to the sleep manipulation, one dropped out and 6 were non-adherent to the sleep protocol (defined as <60 minutes difference in average sleep duration across the SR and HS conditions), leaving a fin…”
  - `final_31`: “Of 38 teens randomized to the sleep manipulation, one dropped out and 6 were non-adherent to the sleep protocol (defined as <60 minutes difference in average sleep duration across the SR and HS conditions), leaving a fin…”

**Full receipts 6**

- Each rating left out teens who strongly disliked that food type.
  - `dislikers_removed`: “For the food appeal analyses, subjects who indicated a strong dislike (mean rating <2) of a particular food type were removed from that analysis.”

**Full receipts 7**

- Funded by the US National Institutes of Health, which had no role; no competing interests.
  - `funding`: “This work was supported by the National Institutes of Health (R01 HL092149, UL1 RR026314).”
  - `funder_no_role`: “The funders had no role in study design, data collection and analysis, decision to publish, or preparation of the manuscript.”
  - `no_competing`: “Competing Interests: The authors have declared that no competing interests exist.”

## Glossary

- **hedonic value**: How much pleasure a food seems to promise before you eat it. (rests on hedonic_shift)
- **Cohen’s d**: The average difference between two conditions, divided by how much that difference varied from person to person. (rests on d_meaning)
- **randomized**: Set by chance, here the order of the two sleep schedules. (rests on randomized_order)
- **kcal**: Kilocalories, the unit of food energy that labels usually just call calories. (rests on kcal_sr)

## Takeaways

**Takeaway 1**

- After five nights of 6.5 hours in bed, teens rated sweets and desserts as more appealing than after 10-hour nights.
  - `five_nights`: “The three-week protocol consisted of a baseline week, followed randomly by five consecutive nights of SR (6.5 hours in bed) versus healthy sleep duration (HS; 10 hours in bed), a 2-night wash-out period, and a 5-night cr…”
  - `sr_in_bed`: “The three-week protocol consisted of a baseline week, followed randomly by five consecutive nights of SR (6.5 hours in bed) versus healthy sleep duration (HS; 10 hours in bed), a 2-night wash-out period, and a 5-night cr…”
  - `hs_in_bed`: “The three-week protocol consisted of a baseline week, followed randomly by five consecutive nights of SR (6.5 hours in bed) versus healthy sleep duration (HS; 10 hours in bed), a 2-night wash-out period, and a 5-night cr…”
  - `sweets_more_appealing`: “Teens rated pictures of sweet/dessert foods to be more appealing after SR than after HS (Cohen’s d = .41, t = 2.07, p = .045).”

**Takeaway 2**

- Hunger and the appeal of other foods showed no clear difference.
  - `hunger_ns`: “the effect of sleep manipulation was non-significant for self-reported hunger and the appeal of non-sweet foods (p >.10).”
  - `nonsweets_ns`: “the effect of sleep manipulation was non-significant for self-reported hunger and the appeal of non-sweet foods (p >.10).”

**Takeaway 3**

- The trial was small, and measured only after five short nights.
  - `limit_small`: “We recommend future research also overcome several limitations of this study, including our limited outcome measures, measurement exclusively after 5 nights of SR (as opposed to examining change as sleep debt accumulates…”
  - `limit_after_five`: “We recommend future research also overcome several limitations of this study, including our limited outcome measures, measurement exclusively after 5 nights of SR (as opposed to examining change as sleep debt accumulates…”

## Steps (what a reader can tick)

- **Give yourself 10 hours in bed** (`ten-hours-in-bed`, evidence: sweets_more_appealing): The healthy-sleep schedule the teens kept in this trial. A tick records the time you gave to sleep, not what you ate. Refs: hs_in_bed
- **Wake at the same time every day, weekends too** (`same-wake-time`, evidence: none, weight 0): Part of the trial's rules on both schedules, not tested on its own, so it carries no weight. Refs: same_wake

## Simulator

`estimate-explorer`: Calories after short nights, both studies (kcal) → `pooled_kcal_sr` = 1934 ± 740 kcal; Calories after long nights, both studies (kcal) → `pooled_kcal_hs` = 1764 ± 649 kcal; Sweets after short nights, both studies (servings) → `pooled_sweets_sr` = 1.46 ± 2.11 servings; Sweets after long nights, both studies (servings) → `pooled_sweets_hs` = 0.75 ± 1.13 servings

## Instagram deck

**Slide 1 (hook) heading**

- Do short nights give teens a sweet tooth?

**Slide 1 body**

- Teens spent five nights with 6.5 hours in bed and five with 10, then rated food photos.
  - `five_nights`: “The three-week protocol consisted of a baseline week, followed randomly by five consecutive nights of SR (6.5 hours in bed) versus healthy sleep duration (HS; 10 hours in bed), a 2-night wash-out period, and a 5-night cr…”
  - `sr_in_bed`: “The three-week protocol consisted of a baseline week, followed randomly by five consecutive nights of SR (6.5 hours in bed) versus healthy sleep duration (HS; 10 hours in bed), a 2-night wash-out period, and a 5-night cr…”
  - `hs_in_bed`: “The three-week protocol consisted of a baseline week, followed randomly by five consecutive nights of SR (6.5 hours in bed) versus healthy sleep duration (HS; 10 hours in bed), a 2-night wash-out period, and a 5-night cr…”
  - `photo_sets`: “Two matched sets with 84 photos of 42 sweets/desserts and 42 non-sweets (fruits/vegetables, meat/eggs) were compiled. One set was viewed at each experimental week visit and teens were asked to rate how appetizing each pi…”

  art: `{"motif": "pair", "a": {"value": {"text": "6.5", "ref": "sr_in_bed"}, "label": "hours in bed, short nights [sr_in_bed]"}, "b": {"value": {"text": "10", "ref": "hs_in_bed"}, "label": "hours in bed, long nights [hs_in_bed]"}}`

**Slide 2 (finding) heading**

- After short nights, teens rated sweets as more appealing.
  - `sweets_more_appealing`: “Teens rated pictures of sweet/dessert foods to be more appealing after SR than after HS (Cohen’s d = .41, t = 2.07, p = .045).”

**Slide 2 body**

- Hunger showed no clear difference.
  - `hunger_ns`: “the effect of sleep manipulation was non-significant for self-reported hunger and the appeal of non-sweet foods (p >.10).”

  art: `{"motif": "verdicts", "rows": [{"label": "Sweets and desserts [-]", "verdict": "higher", "fact": "fact:sweets_more_appealing"}, {"label": "Meat, eggs, fruit, vegetables [-]", "verdict": "no-clear-difference", "fact": "fact:nonsweets_ns"}, {"label": "Hunger [-]", "verdict": "no-clear-difference", "fact": "fact:hunger_ns"}]}`

**Slide 3 (why) heading**

- Short sleep may turn up how good sweets look.
  - `may_increase_appeal`: “Finally, it took an important step in the construction of a mechanistic causal model by which SR might influence dietary choices, suggesting that SR may increase the subjective appeal of already attractive sweet/dessert …”

**Slide 3 body**

- The authors' idea: sweets promise more pleasure (hedonic value) after short nights.
  - `hedonic_shift`: “One potential mechanism is a shift in hedonic value.”

**Slide 4 (who) heading**

- Tested in 31 teens, over five short nights.
  - `final_31`: “Of 38 teens randomized to the sleep manipulation, one dropped out and 6 were non-adherent to the sleep protocol (defined as <60 minutes difference in average sleep duration across the SR and HS conditions), leaving a fin…”
  - `five_nights`: “The three-week protocol consisted of a baseline week, followed randomly by five consecutive nights of SR (6.5 hours in bed) versus healthy sleep duration (HS; 10 hours in bed), a 2-night wash-out period, and a 5-night cr…”

  art: `{"motif": "who", "tested": ["Teens aged 14 to 17 [inclusion]", "Sleeping at home [at_home]", "59% girls [female_59]"], "notTested": ["Adults [inclusion]", "Marked obesity [exclusion_obesity]", "More than five short nights [limit_after_five]"]}`

**Slide 5 (receipts) heading**

- How sure can we be?

  art: `{"motif": "checks", "strong": "Each teen did both schedules, in random order. [randomized_order]", "weak": "Small, and only five short nights. [limit_small, limit_after_five]", "missing": "A body measure of hunger. [limit_hunger_measure]"}`

**Slide 6 (cta) heading**

- What time do you go to bed?

**Slide 6 body**

- Compare calories and sweets after each kind of night.
  - `pooled_kcal_sr`: “Applying our previously-published selection criteria to pool data from both studies (n = 68), teens consumed 10% more calories in a 24-hour period during SR (1934 ± 740 kcal) than HS (1764 ± 649 kcal), d = .25, t = 2.1 (…”
  - `pooled_kcal_hs`: “Applying our previously-published selection criteria to pool data from both studies (n = 68), teens consumed 10% more calories in a 24-hour period during SR (1934 ± 740 kcal) than HS (1764 ± 649 kcal), d = .25, t = 2.1 (…”
  - `pooled_sweets_sr`: “Applying our previously-published selection criteria to pool data from both studies (n = 68), teens consumed 10% more calories in a 24-hour period during SR (1934 ± 740 kcal) than HS (1764 ± 649 kcal), d = .25, t = 2.1 (…”
  - `pooled_sweets_hs`: “Applying our previously-published selection criteria to pool data from both studies (n = 68), teens consumed 10% more calories in a 24-hour period during SR (1934 ± 740 kcal) than HS (1764 ± 649 kcal), d = .25, t = 2.1 (…”

**Alternate opening “The hours”**

- What do five short nights do to a sweet tooth?
- 31 teens rated food photos after short and long nights.
  - `final_31`: “Of 38 teens randomized to the sleep manipulation, one dropped out and 6 were non-adherent to the sleep protocol (defined as <60 minutes difference in average sleep duration across the SR and HS conditions), leaving a fin…”
  - `photo_sets`: “Two matched sets with 84 photos of 42 sweets/desserts and 42 non-sweets (fruits/vegetables, meat/eggs) were compiled. One set was viewed at each experimental week visit and teens were asked to rate how appetizing each pi…”

  art: `{"motif": "number", "value": {"text": "6.5", "ref": "sr_in_bed"}, "unit": "hours [-]", "label": "in bed, five nights running [sr_in_bed, five_nights]"}`

**Caption**

- A randomized crossover trial in 31 teens aged 14 to 17.
  - `randomized_order`: “Adolescents who successfully completed the baseline week were randomized to an order of the experimental conditions (SR first vs. HS first) in a counterbalanced, within-subjects crossover design.”
  - `final_31`: “Of 38 teens randomized to the sleep manipulation, one dropped out and 6 were non-adherent to the sleep protocol (defined as <60 minutes difference in average sleep duration across the SR and HS conditions), leaving a fin…”
  - `inclusion`: “Similar to our prior study [], we enrolled typically-developing 14–17 year-olds without a current psychiatric diagnosis or history of neurological illness/injury.”
- Each spent five nights with 6.5 hours in bed and five with 10.
  - `five_nights`: “The three-week protocol consisted of a baseline week, followed randomly by five consecutive nights of SR (6.5 hours in bed) versus healthy sleep duration (HS; 10 hours in bed), a 2-night wash-out period, and a 5-night cr…”
  - `sr_in_bed`: “The three-week protocol consisted of a baseline week, followed randomly by five consecutive nights of SR (6.5 hours in bed) versus healthy sleep duration (HS; 10 hours in bed), a 2-night wash-out period, and a 5-night cr…”
  - `hs_in_bed`: “The three-week protocol consisted of a baseline week, followed randomly by five consecutive nights of SR (6.5 hours in bed) versus healthy sleep duration (HS; 10 hours in bed), a 2-night wash-out period, and a 5-night cr…”
- After the short nights, they rated sweets and desserts as more appealing.
  - `sweets_more_appealing`: “Teens rated pictures of sweet/dessert foods to be more appealing after SR than after HS (Cohen’s d = .41, t = 2.07, p = .045).”
- Hunger showed no clear difference.
  - `hunger_ns`: “the effect of sleep manipulation was non-significant for self-reported hunger and the appeal of non-sweet foods (p >.10).”
- Small, and measured only after five short nights.
  - `limit_small`: “We recommend future research also overcome several limitations of this study, including our limited outcome measures, measurement exclusively after 5 nights of SR (as opposed to examining change as sleep debt accumulates…”
  - `limit_after_five`: “We recommend future research also overcome several limitations of this study, including our limited outcome measures, measurement exclusively after 5 nights of SR (as opposed to examining change as sleep debt accumulates…”
- Full read and the calorie explorer: link in bio.

Hashtags: #sleep #teenhealth #nutrition #evidencebased #clinicaltrial
