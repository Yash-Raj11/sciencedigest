# Opus trial, paper 4 of 6: fructose, other sugars and an inflammation marker, a draft for your review

Della Corte KW et al., *Nutrients* 2018, doi:10.3390/nu10050606 (PMC5986486, CC-BY). Free tier. **Not published** (`publishedAt` null).
A systematic review and meta-analysis of 13 controlled sugar-feeding trials (1141 people, aged 11 to 72, 2 weeks to 3 months). Only CRP had enough trials to pool: fructose against glucose (6 trials, 403 people) and high-fructose corn syrup against table sugar (3 trials, 677 people). Both showed no clear difference; the authors rate both "low" on NutriGrade.

**How this was made.** Claude Opus 5.5 wrote it by hand in Claude Code, with no API key: the extraction with its coverage map, the read, the deck and one figure. The project's real gate and lint judged every file. Treat it as an **upper bound** for a one-shot API run. Every refusal and fix: `fixes.md`.

**What to decide, or look at closely**

1. **The design label overstates the trials.** The gate offers one design for a pooled analysis, `meta_analysis_rct`, so the deck's source line reads "Pooled randomized trials". But the review took in *controlled* trials ("controlled, parallel, or crossover design"), and two of the six fructose-against-glucose trials are not described as randomized in its Table 1 (Aeberli 2011: "Crossover Double-blind"; Cox/Rezvani 2009: "Parallel Blinded"). The design passage I used is the paper's own NutriGrade line ("for meta-analysis of randomized controlled trials"), which is how the authors graded it. The read says "controlled trials, not only randomized ones" in the audit. Choices: accept it; add a design such as `meta_analysis_controlled` (a schema and grading change: your call, rule 11); or leave this paper out. **I would not publish it until you decide.** The grade is not affected: the paper's own "low" rating wins over the design.
2. **A null result gives no step to tick.** The schema needs at least one step. The only one I could write honestly is the WHO limit the authors cite ("free sugars under 10% of the day's calories"), at weight 0, with a detail saying this review did not test it. You may prefer no read at all for a null review, or this step.
3. **The figure is in the audit layer, not the mechanism.** A 95% range may not appear in the mechanism layer (H10), so the interval figure sits with the receipts; it is also the feed-card figure.
4. **The "why" slide has no picture**, as in papers 1 to 3.
5. **Weak points the read states plainly:** low certainty; only CRP pooled; trials of two weeks to three months; very large doses in many trials; the two largest trials did not say how they randomized, lost about a quarter of people and had industry ties; weight change mostly not accounted for.

Every sentence is listed below with the paper's own words for each fact it cites. `[-]` means a sentence cites nothing. Long quotes are cut at 220 characters.
Deck: `deck/sheet-dark.png`, `deck/sheet-light.png` (6 slides, then 1 alternate opening). Figure: `figure/crp-gaps.html` (light and dark, full and feed-card views).

## Feed card and top of the read

**Title**

- Fructose or glucose: what pooled trials found for an inflammation marker
  - `fru_glu_ns`: “Using a random effects model, pooled effects of the interventions (investigated as mean difference (MD)) revealed no differences in (hs)CRP between fructose intervention and glucose control groups (MD: −0.03 mg/L (95% CI…”

**Teaser**

- Researchers have suggested fructose may fan inflammation more than other sugars.
  - `hypothesis`: “It has been postulated that dietary sugar consumption contributes to increased inflammatory processes in humans, and that this may be specific to fructose (alone, in sucrose or in high-fructose corn syrup (HFCS)).”
- A review pooled trials that gave people fructose or the same calories of glucose.
  - `six_matched`: “The dietary fructose intake ranged from 17 grams daily to 217 grams daily in the eight fructose intervention studies. Six of the 8 studies on fructose compared free fructose to free glucose isocalorically.”
- CRP, a blood marker of inflammation, showed no clear difference.
  - `fru_glu_ns`: “Using a random effects model, pooled effects of the interventions (investigated as mean difference (MD)) revealed no differences in (hs)CRP between fructose intervention and glucose control groups (MD: −0.03 mg/L (95% CI…”
- The certainty is low.
  - `grade_fru_glu`: “Overall, the quality of meta-evidence for the association between dietary fructose vs glucose, and comparing HFCS vs sucrose on CRP was rated as “low”, (i.e., confidence in the effect estimate is low). Further research w…”

**Hook**

- The liver has to handle fructose, and some of it can become fat.
  - `fructose_liver`: “In contrast to glucose, which can be metabolized by any cell in the body, fructose must be metabolized in the liver. Since there are no negative feedback mechanisms that control for and prevent excess substrate supply of…”
  - `no_brake`: “In contrast to glucose, which can be metabolized by any cell in the body, fructose must be metabolized in the liver. Since there are no negative feedback mechanisms that control for and prevent excess substrate supply of…”
- Yet pooled trials found no clear difference in CRP, a blood marker of inflammation, between fructose and glucose.
  - `fru_glu_ns`: “Using a random effects model, pooled effects of the interventions (investigated as mean difference (MD)) revealed no differences in (hs)CRP between fructose intervention and glucose control groups (MD: −0.03 mg/L (95% CI…”

**Card question**

- Does fructose fan inflammation more than glucose?
  - `hypothesis`: “It has been postulated that dietary sugar consumption contributes to increased inflammatory processes in humans, and that this may be specific to fructose (alone, in sucrose or in high-fructose corn syrup (HFCS)).”

**Card headline**

- Pooled trials found no clear difference in CRP, a blood marker of inflammation.
  - `md_fru_glu`: “Using a random effects model, pooled effects of the interventions (investigated as mean difference (MD)) revealed no differences in (hs)CRP between fructose intervention and glucose control groups (MD: −0.03 mg/L (95% CI…”

**Card support**

- The certainty is low: few trials, and wide ranges.
  - `grade_fru_glu`: “Overall, the quality of meta-evidence for the association between dietary fructose vs glucose, and comparing HFCS vs sucrose on CRP was rated as “low”, (i.e., confidence in the effect estimate is low). Further research w…”
  - `grade_reasons`: “Overall, the quality of meta-evidence for the association between dietary fructose vs glucose, and comparing HFCS vs sucrose on CRP was rated as “low”, (i.e., confidence in the effect estimate is low). Further research w…”

**Source line: who**

- 1141 people in 13 trials
  - `total_1141`: “The 13 intervention trials that addressed dietary fructose, sucrose, glucose, or HFCS intake as a nutritional exposure variable [,,,,,,,,,,,,,,] lasted between 2 weeks and 3 months, and included a total of 1141 participa…”
  - `studies_13`: “Taken together, 13 studies were identified by the search as matches, and were included in the review (one study [] resulted in two publications: Cox et al. [] and Rezvani et al. [], each covering different outcomes).”

**Source line: span**

- 2 weeks to 3 months of sugar each
  - `durations`: “The 13 intervention trials that addressed dietary fructose, sucrose, glucose, or HFCS intake as a nutritional exposure variable [,,,,,,,,,,,,,,] lasted between 2 weeks and 3 months, and included a total of 1141 participa…”

**Feed card figure alt text**

- Two bands, one for each pair of sugars; both cross the line for no difference.
  - `md_fru_glu`: “Using a random effects model, pooled effects of the interventions (investigated as mean difference (MD)) revealed no differences in (hs)CRP between fructose intervention and glucose control groups (MD: −0.03 mg/L (95% CI…”
  - `md_hfcs_suc`: “Similarly, no differences were observed between HFCS and sucrose interventions (MD: 0.21 mg/L (−0.11, 0.53), I2 = 0%).”
  - `md_zero`: “MD = mean of intervention group—mean of control group. MD = 0: no difference between groups. MD > 0: greater value of respective outcome measured in intervention (first) groups. MD < 0: greater value of respective outcom…”

**Population panel**

- Who was tested: 1141 people aged 11 to 72, across 13 controlled trials.
  - `total_1141`: “The 13 intervention trials that addressed dietary fructose, sucrose, glucose, or HFCS intake as a nutritional exposure variable [,,,,,,,,,,,,,,] lasted between 2 weeks and 3 months, and included a total of 1141 participa…”
  - `ages`: “The 13 intervention trials that addressed dietary fructose, sucrose, glucose, or HFCS intake as a nutritional exposure variable [,,,,,,,,,,,,,,] lasted between 2 weeks and 3 months, and included a total of 1141 participa…”
  - `studies_13`: “Taken together, 13 studies were identified by the search as matches, and were included in the review (one study [] resulted in two publications: Cox et al. [] and Rezvani et al. [], each covering different outcomes).”
- They were healthy, overweight or obese, with or without diseases in which inflammation is not a main feature.
  - `inclusion_people`: “Inclusion criteria limited search to either (1) healthy, overweight, or obese adults or adolescents (age 11 and up), (2) with or without diseases for which inflammation is not a major symptomatic factor.”
- The fructose-against-glucose result pooled 6 trials with 403 people.
  - `fru_glu_n`: “Fructose vs glucose | 6 | 403 | −0.03 | −0.52, 0.46 | (p = 0.90) | 44 (0, 75) | Low |”
- The review left out people with major inflammatory diseases, such as arthritis.
  - `excluded_inflammatory`: “We additionally excluded intervention studies on participants with major inflammatory diseases, such as arthritis, hepatitis, or irritable bowel syndrome, i.e., diseases for which inflammation or oxidative stress with cl…”
- Trials lasted 2 weeks to 3 months.
  - `durations`: “The 13 intervention trials that addressed dietary fructose, sucrose, glucose, or HFCS intake as a nutritional exposure variable [,,,,,,,,,,,,,,] lasted between 2 weeks and 3 months, and included a total of 1141 participa…”

## Mechanism

**Paragraph 1**

- Picture two fuels that look alike.
- Any cell in the body can burn glucose.
  - `fructose_liver`: “In contrast to glucose, which can be metabolized by any cell in the body, fructose must be metabolized in the liver. Since there are no negative feedback mechanisms that control for and prevent excess substrate supply of…”
- Fructose has to go to the liver first.
  - `fructose_liver`: “In contrast to glucose, which can be metabolized by any cell in the body, fructose must be metabolized in the liver. Since there are no negative feedback mechanisms that control for and prevent excess substrate supply of…”

**Paragraph 2**

- In the liver, nothing caps how much fructose comes in.
  - `no_brake`: “In contrast to glucose, which can be metabolized by any cell in the body, fructose must be metabolized in the liver. Since there are no negative feedback mechanisms that control for and prevent excess substrate supply of…”
- Some of it becomes a building block for fat.
  - `no_brake`: “In contrast to glucose, which can be metabolized by any cell in the body, fructose must be metabolized in the liver. Since there are no negative feedback mechanisms that control for and prevent excess substrate supply of…”
- Researchers call this making of new fat de novo lipogenesis.
  - `liver_fat_making`: “Central to the potentially relevant mechanisms is the fact that dietary sugar promotes de novo synthesis of free fatty acids (FFA) in the liver [,,], which according to the lipotoxicity theory, would produce FFA metaboli…”

**Paragraph 3**

- The theory goes one step further.
- By-products of that new fat may set off inflammation, the body's alarm response.
  - `lipotoxicity`: “Central to the potentially relevant mechanisms is the fact that dietary sugar promotes de novo synthesis of free fatty acids (FFA) in the liver [,,], which according to the lipotoxicity theory, would produce FFA metaboli…”
- One sign of it is CRP, a blood protein used as a marker of inflammation.
  - `crp_protein`: “We selected the acute-phase protein high-sensitivity C-reactive protein (hsCRP), proinflammatory cytokines (interleukin-6 (IL-6), interleukin-18 (IL-18), interleukin-1 receptor antagonist (IL-1RA), tumor necrosis factor-…”

**Paragraph 4**

- So the review asked a sharp question.
- Does fructose raise CRP more than the same calories of glucose?
  - `six_matched`: “The dietary fructose intake ranged from 17 grams daily to 217 grams daily in the eight fructose intervention studies. Six of the 8 studies on fructose compared free fructose to free glucose isocalorically.”
- Pooled across trials, the answer was no clear difference.
  - `fru_glu_ns`: “Using a random effects model, pooled effects of the interventions (investigated as mean difference (MD)) revealed no differences in (hs)CRP between fructose intervention and glucose control groups (MD: −0.03 mg/L (95% CI…”
- High-fructose corn syrup against table sugar showed no clear difference either.
  - `hfcs_suc_ns`: “Similarly, no differences were observed between HFCS and sucrose interventions (MD: 0.21 mg/L (−0.11, 0.53), I2 = 0%).”

**Paragraph 5**

- The authors offer two reasons a gap may not show.
- Fructose barely spikes blood sugar, which may spare it some inflammation.
  - `low_gi`: “Fructose has a low glycemic index (GI), and there is evidence that suggests that consumption of foods with a lower dietary GL/GI is associated with anti-inflammatory effects. Accordingly, ingestion of fructose may contri…”
- And very large sugar doses may inflame through sheer calories, hiding any difference between sugars.
  - `overload`: “The fact that there was often no difference observed between intervention and control groups in studies that administered supra-physiological doses [,,,,] may be due to post-prandial stress, that activates low-grade infl…”

## Protocol

**Paragraph 1**

- What the pooled trials tested: fructose against the same calories of glucose.
  - `six_matched`: “The dietary fructose intake ranged from 17 grams daily to 217 grams daily in the eight fructose intervention studies. Six of the 8 studies on fructose compared free fructose to free glucose isocalorically.”
- Fructose doses ran from 17 to 217 g a day, for 2 weeks to 3 months.
  - `fructose_doses`: “The dietary fructose intake ranged from 17 grams daily to 217 grams daily in the eight fructose intervention studies. Six of the 8 studies on fructose compared free fructose to free glucose isocalorically.”
  - `durations`: “The 13 intervention trials that addressed dietary fructose, sucrose, glucose, or HFCS intake as a nutritional exposure variable [,,,,,,,,,,,,,,] lasted between 2 weeks and 3 months, and included a total of 1141 participa…”

**Paragraph 2**

- The review gives no advice on how much sugar to eat.
- The limit the authors cite is the WHO's: at most 10% of daily energy from free sugars.
  - `who_limit`: “Overall sugar energy intakes are, however, still much higher than the United Kingdom’s Scientific Advisory Committee on Nutrition (SACN) guidelines, which recommend a maximum free sugars intake of 5% daily energy intake …”
- This review did not test that limit.

## Audit

**Effect**

- CRP, fructose against glucose: a pooled difference of −0.03 mg/L (p = 0.90), from 6 trials and 403 people.
  - `md_fru_glu`: “Using a random effects model, pooled effects of the interventions (investigated as mean difference (MD)) revealed no differences in (hs)CRP between fructose intervention and glucose control groups (MD: −0.03 mg/L (95% CI…”
  - `fru_glu_p`: “Fructose vs glucose | 6 | 403 | −0.03 | −0.52, 0.46 | (p = 0.90) | 44 (0, 75) | Low |”
  - `fru_glu_n`: “Fructose vs glucose | 6 | 403 | −0.03 | −0.52, 0.46 | (p = 0.90) | 44 (0, 75) | Low |”

**Weak end**

- The 95% range runs from −0.52 to 0.46 mg/L.
  - `md_fru_glu`: “Using a random effects model, pooled effects of the interventions (investigated as mean difference (MD)) revealed no differences in (hs)CRP between fructose intervention and glucose control groups (MD: −0.03 mg/L (95% CI…”
- So the true difference could sit on either side of zero.
  - `md_fru_glu`: “Using a random effects model, pooled effects of the interventions (investigated as mean difference (MD)) revealed no differences in (hs)CRP between fructose intervention and glucose control groups (MD: −0.03 mg/L (95% CI…”
- The certainty is low: more trials will likely change the estimate.
  - `grade_fru_glu`: “Overall, the quality of meta-evidence for the association between dietary fructose vs glucose, and comparing HFCS vs sucrose on CRP was rated as “low”, (i.e., confidence in the effect estimate is low). Further research w…”
  - `grade_meaning`: “Overall, the quality of meta-evidence for the association between dietary fructose vs glucose, and comparing HFCS vs sucrose on CRP was rated as “low”, (i.e., confidence in the effect estimate is low). Further research w…”

**Limitation 1**

- Only CRP had enough trials to pool, and some comparisons had few trials.
  - `limit_crp_only`: “Sufficient studies (≥3) to pool were only available for (hs)CRP.”
  - `limit_heterogeneity`: “The limitations of this review lie in the fact that the data have substantial heterogeneity, and some of the comparisons had only a small number of studies. The studies range in duration from two weeks to three months. M…”

**Limitation 2**

- Trials lasted two weeks to three months, so they say nothing about years of eating.
  - `limit_duration`: “The limitations of this review lie in the fact that the data have substantial heterogeneity, and some of the comparisons had only a small number of studies. The studies range in duration from two weeks to three months. M…”
  - `limit_years`: “The limitations of this review lie in the fact that the data have substantial heterogeneity, and some of the comparisons had only a small number of studies. The studies range in duration from two weeks to three months. M…”

**Limitation 3**

- The two largest trials did not say how they randomized, lost about a quarter of people, and had industry ties.
  - `limit_two_largest`: “The methodological limitations of the two largest studies both lasting 10 weeks are worth mentioning. These two studies used HFCS- [] or sucrose-sweetened milk [] as intervention diets, and addressed the effect on CRP on…”
  - `limit_industry`: “The methodological limitations of the two largest studies both lasting 10 weeks are worth mentioning. These two studies used HFCS- [] or sucrose-sweetened milk [] as intervention diets, and addressed the effect on CRP on…”

**Limitation 4**

- Very large doses may hide differences between sugars.
  - `limit_big_doses`: “If this is the case, then no conclusions can be drawn about the unique effects of fructose versus glucose metabolism from studies that administer supra-physiological doses across comparative groups.”

**What most summaries miss**

- The review took in controlled trials, not only randomized ones.
  - `controlled_trials`: “The search was restricted to human intervention studies (controlled, parallel, or crossover design).”
- Most trials did not account for weight change, a possible link between sugar and inflammation.
  - `limit_weight`: “The remainder of the studies did not take changes in weight into account.”
  - `weight_mediator`: “Because obesity and sugar intake are closely linked (at least with respect to SSB) on the one hand, and obesity and inflammation are closely linked on the other, it is certainly possible that weight gain is a potential m…”

**Full receipts 1**

- Corn syrup against table sugar: 0.21 mg/L (range −0.11 to 0.53, p = 0.19), 3 trials, 677 people, certainty low.
  - `md_hfcs_suc`: “Similarly, no differences were observed between HFCS and sucrose interventions (MD: 0.21 mg/L (−0.11, 0.53), I2 = 0%).”
  - `hfcs_suc_p`: “HFCS vs sucrose | 3 | 677 | 0.21 | −0.11, 0.53 | (p = 0.19) | 0 (0, 75) | Low |”
  - `hfcs_suc_n`: “HFCS vs sucrose | 3 | 677 | 0.21 | −0.11, 0.53 | (p = 0.19) | 0 (0, 75) | Low |”
  - `grade_hfcs_suc`: “Overall, the quality of meta-evidence for the association between dietary fructose vs glucose, and comparing HFCS vs sucrose on CRP was rated as “low”, (i.e., confidence in the effect estimate is low). Further research w…”

**Full receipts 2**

- Inconsistency between trials: 44% and 0%; above 50% counts as substantial.
  - `fru_glu_i2`: “Fructose vs glucose | 6 | 403 | −0.03 | −0.52, 0.46 | (p = 0.90) | 44 (0, 75) | Low |”
  - `hfcs_suc_i2`: “HFCS vs sucrose | 3 | 677 | 0.21 | −0.11, 0.53 | (p = 0.19) | 0 (0, 75) | Low |”
  - `i2_meaning`: “An I2-value of greater than 50% was considered to indicate substantial heterogeneity [].”

**Full receipts 3**

- Of the six matched trials, two reported a difference on one marker each; the overall picture was inconsistent.
  - `two_of_six`: “Two of these studies reported significant effects on biomarkers of subclinical inflammation: Jin et al. [] found a difference between the fructose and glucose group in hsCRP (increase by 4% vs decrease by 23%, respective…”
  - `inconsistent`: “As summarized narratively, effects were observed in a small number of studies, but the overall picture is inconsistent, the effect sizes are variable, and the overall quality of meta-evidence is low.”

**Full receipts 4**

- IL-6, MCP-1 and the other markers had too few trials to pool; no trial reported IL-18 or IL-1RA.
  - `others_not_pooled`: “The analyses of the comparators high-fructose vs low-fructose, fructose vs sucrose, and glucose vs sucrose could not be performed because these subgroups had two or less comparisons to report on. For the same reason, the…”
  - `no_il18`: “No studies were found that reported effects of dietary sugar on IL-18 or IL-1RA.”

**Full receipts 5**

- Studies that only watched people link sugary drinks with CRP; the authors cannot say if their result agrees.
  - `observational_ssb`: “One could argue that our data disagree with evidence from observational studies, since the relationship between SSB intake and the inflammatory biomarker CRP has been consistently reported in observational studies [,,].”
  - `cannot_compare`: “Hence, it is not possible to state whether our results from intervention studies agree with observational data.”

**Full receipts 6**

- Funded by German ministries.
  - `funding`: “The DONALD study is supported by the Ministry of Culture and Science of the state of North Rhine Westphalia, Germany. The German Diabetes Center is funded by the German Federal Ministry of Health (BMG), the Ministry of C…”
- One author sits on an ILSI Europe expert group and a carbohydrate consortium.
  - `coi_buyken`: “A.E. Buyken is a member of the International Carbohydrate Quality Consortium and a member of an expert group convened by ILSI Europe which prepared a scientific review entitled “Dietary carbohydrates: A review of interna…”

**Audit figure caption**

- Each band is the 95% range of a pooled difference in CRP.
  - `md_fru_glu`: “Using a random effects model, pooled effects of the interventions (investigated as mean difference (MD)) revealed no differences in (hs)CRP between fructose intervention and glucose control groups (MD: −0.03 mg/L (95% CI…”
  - `md_hfcs_suc`: “Similarly, no differences were observed between HFCS and sucrose interventions (MD: 0.21 mg/L (−0.11, 0.53), I2 = 0%).”
- Both cross the line for no difference.
  - `fru_glu_ns`: “Using a random effects model, pooled effects of the interventions (investigated as mean difference (MD)) revealed no differences in (hs)CRP between fructose intervention and glucose control groups (MD: −0.03 mg/L (95% CI…”
  - `hfcs_suc_ns`: “Similarly, no differences were observed between HFCS and sucrose interventions (MD: 0.21 mg/L (−0.11, 0.53), I2 = 0%).”

**Audit figure alt text**

- Two rows.
- Fructose against glucose: −0.03 mg/L, range −0.52 to 0.46.
  - `md_fru_glu`: “Using a random effects model, pooled effects of the interventions (investigated as mean difference (MD)) revealed no differences in (hs)CRP between fructose intervention and glucose control groups (MD: −0.03 mg/L (95% CI…”
- Corn syrup against table sugar: 0.21 mg/L, range −0.11 to 0.53.
  - `md_hfcs_suc`: “Similarly, no differences were observed between HFCS and sucrose interventions (MD: 0.21 mg/L (−0.11, 0.53), I2 = 0%).”
- Both ranges cross zero, the line for no difference.
  - `md_zero`: “MD = mean of intervention group—mean of control group. MD = 0: no difference between groups. MD > 0: greater value of respective outcome measured in intervention (first) groups. MD < 0: greater value of respective outcom…”

## Glossary

- **CRP**: C-reactive protein: a blood protein used as a marker of inflammation. (rests on crp_protein)
- **de novo lipogenesis**: The liver making new fat from sugar. (rests on liver_fat_making)

## Takeaways

**Takeaway 1**

- Pooled trials found no clear difference in CRP between fructose and the same calories of glucose.
  - `fru_glu_ns`: “Using a random effects model, pooled effects of the interventions (investigated as mean difference (MD)) revealed no differences in (hs)CRP between fructose intervention and glucose control groups (MD: −0.03 mg/L (95% CI…”
  - `six_matched`: “The dietary fructose intake ranged from 17 grams daily to 217 grams daily in the eight fructose intervention studies. Six of the 8 studies on fructose compared free fructose to free glucose isocalorically.”

**Takeaway 2**

- Corn syrup against table sugar: no clear difference either.
  - `hfcs_suc_ns`: “Similarly, no differences were observed between HFCS and sucrose interventions (MD: 0.21 mg/L (−0.11, 0.53), I2 = 0%).”

**Takeaway 3**

- Certainty is low, and the review could pool only CRP.
  - `grade_fru_glu`: “Overall, the quality of meta-evidence for the association between dietary fructose vs glucose, and comparing HFCS vs sucrose on CRP was rated as “low”, (i.e., confidence in the effect estimate is low). Further research w…”
  - `limit_crp_only`: “Sufficient studies (≥3) to pool were only available for (hs)CRP.”

## Steps (what a reader can tick)

- **Keep free sugars under 10% of the day's calories** (`free-sugars-under-10`, evidence: none, weight 0): The WHO limit the authors cite. This review did not test it, so it carries no weight. Refs: who_limit

## Simulator

`estimate-explorer`: Fructose against glucose (mg/L) → `md_fru_glu` = MD: −0.03 mg/L (95% CI: −0.52, 0.46); Corn syrup against table sugar (mg/L) → `md_hfcs_suc` = MD: 0.21 mg/L (−0.11, 0.53)

## Instagram deck

**Slide 1 (hook) heading**

- Does fructose fan inflammation more than other sugars?
  - `hypothesis`: “It has been postulated that dietary sugar consumption contributes to increased inflammatory processes in humans, and that this may be specific to fructose (alone, in sucrose or in high-fructose corn syrup (HFCS)).”

**Slide 1 body**

- A review pooled trials that gave people fructose or the same calories of glucose.
  - `six_matched`: “The dietary fructose intake ranged from 17 grams daily to 217 grams daily in the eight fructose intervention studies. Six of the 8 studies on fructose compared free fructose to free glucose isocalorically.”

  art: `{"motif": "number", "value": {"text": "13", "ref": "studies_13"}, "unit": "trials [-]", "label": "1141 people, pooled [total_1141]"}`

**Slide 2 (finding) heading**

- Fructose and glucose: no clear difference in CRP.
  - `fru_glu_ns`: “Using a random effects model, pooled effects of the interventions (investigated as mean difference (MD)) revealed no differences in (hs)CRP between fructose intervention and glucose control groups (MD: −0.03 mg/L (95% CI…”

**Slide 2 body**

- CRP is a blood protein used as a marker of inflammation.
  - `crp_protein`: “We selected the acute-phase protein high-sensitivity C-reactive protein (hsCRP), proinflammatory cytokines (interleukin-6 (IL-6), interleukin-18 (IL-18), interleukin-1 receptor antagonist (IL-1RA), tumor necrosis factor-…”

  art: `{"motif": "verdicts", "rows": [{"label": "Fructose vs glucose [-]", "verdict": "no-clear-difference", "fact": "fact:fru_glu_ns"}, {"label": "Corn syrup vs table sugar [-]", "verdict": "no-clear-difference", "fact": "fact:hfcs_suc_ns"}]}`

**Slide 3 (why) heading**

- Fructose goes to the liver, where some can become fat.
  - `fructose_liver`: “In contrast to glucose, which can be metabolized by any cell in the body, fructose must be metabolized in the liver. Since there are no negative feedback mechanisms that control for and prevent excess substrate supply of…”
  - `no_brake`: “In contrast to glucose, which can be metabolized by any cell in the body, fructose must be metabolized in the liver. Since there are no negative feedback mechanisms that control for and prevent excess substrate supply of…”

**Slide 3 body**

- The theory: by-products of that fat may set off inflammation (lipotoxicity).
  - `lipotoxicity`: “Central to the potentially relevant mechanisms is the fact that dietary sugar promotes de novo synthesis of free fatty acids (FFA) in the liver [,,], which according to the lipotoxicity theory, would produce FFA metaboli…”

**Slide 4 (who) heading**

- Tested in 13 controlled trials.
  - `studies_13`: “Taken together, 13 studies were identified by the search as matches, and were included in the review (one study [] resulted in two publications: Cox et al. [] and Rezvani et al. [], each covering different outcomes).”

  art: `{"motif": "who", "tested": ["1141 people aged 11 to 72 [total_1141, ages]", "Healthy, overweight or obese [inclusion_people]", "Often very large doses [limit_big_doses]"], "notTested": ["Major inflammatory diseases [excluded_inflammatory]", "Years of sugar [limit_years]", "Markers other than CRP [limit_crp_only]"]}`

**Slide 5 (receipts) heading**

- How sure can we be?

  art: `{"motif": "checks", "strong": "Every trial had a control group; review registered first. [controlled_trials, registered]", "weak": "Low certainty: few trials, wide ranges. [grade_fru_glu, limit_heterogeneity]", "missing": "Long trials at everyday doses. [limit_future]"}`

**Slide 6 (cta) heading**

- Where does your sugar come from?

**Slide 6 body**

- See how wide each pooled range is.
  - `md_fru_glu`: “Using a random effects model, pooled effects of the interventions (investigated as mean difference (MD)) revealed no differences in (hs)CRP between fructose intervention and glucose control groups (MD: −0.03 mg/L (95% CI…”
  - `md_hfcs_suc`: “Similarly, no differences were observed between HFCS and sucrose interventions (MD: 0.21 mg/L (−0.11, 0.53), I2 = 0%).”

**Alternate opening “The liver”**

- Does fructose inflame more than glucose?
- Any cell can burn glucose; fructose has to go to the liver.
  - `fructose_liver`: “In contrast to glucose, which can be metabolized by any cell in the body, fructose must be metabolized in the liver. Since there are no negative feedback mechanisms that control for and prevent excess substrate supply of…”

  art: `{"motif": "number", "value": {"text": "403", "ref": "fru_glu_n"}, "unit": "people [-]", "label": "in the fructose-against-glucose trials [fru_glu_n]"}`

**Caption**

- A review pooled 13 controlled trials with 1141 people.
  - `studies_13`: “Taken together, 13 studies were identified by the search as matches, and were included in the review (one study [] resulted in two publications: Cox et al. [] and Rezvani et al. [], each covering different outcomes).”
  - `total_1141`: “The 13 intervention trials that addressed dietary fructose, sucrose, glucose, or HFCS intake as a nutritional exposure variable [,,,,,,,,,,,,,,] lasted between 2 weeks and 3 months, and included a total of 1141 participa…”
- CRP, a blood marker of inflammation, showed no clear difference between fructose and glucose.
  - `fru_glu_ns`: “Using a random effects model, pooled effects of the interventions (investigated as mean difference (MD)) revealed no differences in (hs)CRP between fructose intervention and glucose control groups (MD: −0.03 mg/L (95% CI…”
- Corn syrup against table sugar: no clear difference either.
  - `hfcs_suc_ns`: “Similarly, no differences were observed between HFCS and sucrose interventions (MD: 0.21 mg/L (−0.11, 0.53), I2 = 0%).”
- Certainty is low: few trials, short ones, often at very large doses.
  - `grade_fru_glu`: “Overall, the quality of meta-evidence for the association between dietary fructose vs glucose, and comparing HFCS vs sucrose on CRP was rated as “low”, (i.e., confidence in the effect estimate is low). Further research w…”
  - `limit_heterogeneity`: “The limitations of this review lie in the fact that the data have substantial heterogeneity, and some of the comparisons had only a small number of studies. The studies range in duration from two weeks to three months. M…”
  - `limit_big_doses`: “If this is the case, then no conclusions can be drawn about the unique effects of fructose versus glucose metabolism from studies that administer supra-physiological doses across comparative groups.”
- Full read and the range explorer: link in bio.

Hashtags: #nutrition #sugar #inflammation #evidencebased #metaanalysis
