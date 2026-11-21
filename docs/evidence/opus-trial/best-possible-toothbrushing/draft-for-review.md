# Opus trial, paper 1 of 6: best-possible toothbrushing, a draft for your review

Weik U et al., *BMC Oral Health* 2023, doi:10.1186/s12903-023-03127-3 (PMC10327354, CC-BY). Free tier. **Not published** (`publishedAt` null).
A randomized trial: 111 students were told to brush "as thoroughly as you can" or "as usual", and 91 were analysed.

**How this was made.** Claude Opus 5.5 wrote it by hand in Claude Code, with no API key. That includes the extraction with its coverage map, the read, the deck and one figure. The project's real gate and lint judged every file. Treat it as an **upper bound** for a one-shot API run: the writer could reread the paper and fix refusals before you saw it. Every refusal and fix: `fixes.md`.

**What to decide, or look at closely**

1. **Every step carries weight 0.** The trial tested an instruction ("brush your best"), and gumline plaque showed no clear difference. So no step has a result behind it, and this protocol's evidence-weighted adherence will always read 0. The steps are honest about this ("The trial did not test this step"). Publish it like that, or as a read without steps?
2. **The deck's "why" slide has no picture.** No motif fits, and a sketch needs a background concept you have reviewed. I wrote no concept. One option is a `dental-plaque` concept for your review, with a reference checked against its source.
3. **The figure draws "less than 40%" as a bar to 40%** that ends in a bound line, and its words say "less than". Check that this reads honestly to you: `deck/` has no figure view, so run the app or read `CleanGap.tsx`.
4. **New category "Teeth".**
5. **Headline choice.** The primary result is the trial's own primary outcome: gumline plaque, no clear difference. The hook leads with the more striking pair: they believed 70% of the gumline was clean, and the dentists found less than 40%.

Every sentence is listed below with the paper's own words for each fact it cites. The gate has checked each quote against the source. `[-]` means a sentence cites nothing and may carry no number. Long quotes are cut at 220 characters.
Deck: `deck/sheet-dark.png`, `deck/sheet-light.png` (6 slides, then the 2 alternate openings).

## Feed card and top of the read

**Title**

- Brushing as well as you can, once: what a dentist found on 91 students
  - `limit_one_event`: “Second, the results focus on only one toothbrushing event.”
  - `limit_n91`: “However, dropouts and outlying values resulted in only N = 91 available for inferential statistics.”
  - `limit_students`: “First, the participants were university students, and thus the data might not transfer to other populations.”

**Teaser**

- A trial gave 111 students one of two instructions: brush as thoroughly as you can, or brush as usual.
  - `randomized_111`: “Finally, 111 participants were recruited and randomized to the study arms (see Fig. 1).”
  - `instruction_bp`: “These were either “brush your teeth as thoroughly as you can so that they are completely clean” (arm 1; best of one’s abilities (BP)) or “brush your teeth as usual” “(arm 2; as usual (AU)) (instructions are translated fr…”
  - `instruction_au`: “These were either “brush your teeth as thoroughly as you can so that they are completely clean” (arm 1; best of one’s abilities (BP)) or “brush your teeth as usual” “(arm 2; as usual (AU)) (instructions are translated fr…”
- The best-effort group brushed for nearly a minute longer.
  - `nearly_one_minute`: “Their brushing time exceeded that of the AU group by nearly one minute (see Fig. 1).”
- Plaque left along the gumline showed no clear difference between the groups.
  - `plaque_after_ns`: “Groups did not differ significantly with respect to the primary (overall MPI: t89 = 1.045; p = 0.149; d = 0.22) or secondary (TQHI % 3–5 overall: t89 = 1.126; p = 0.132; d = 0.24) outcome variable.”
- Both groups thought their teeth were about twice as clean as they were.
  - `overestimate_twofold`: “Both groups overestimated their actual oral cleanliness by approximately twofold.”

**Hook**

- Students told to brush as well as they could believed 70% of their gumline was clean.
  - `instruction_bp`: “These were either “brush your teeth as thoroughly as you can so that they are completely clean” (arm 1; best of one’s abilities (BP)) or “brush your teeth as usual” “(arm 2; as usual (AU)) (instructions are translated fr…”
  - `bp_thought_70`: “While objective plaque data indicate that less than 40% of the sections of the gingival margins were free from plaque, participants in the BP group thought it was 70%.”
- The dentists found less than 40% of it free of plaque.
  - `under_40_clean`: “While objective plaque data indicate that less than 40% of the sections of the gingival margins were free from plaque, participants in the BP group thought it was 70%.”

**Card question**

- Does brushing as well as you can leave your gumline cleaner?
  - `instruction_bp`: “These were either “brush your teeth as thoroughly as you can so that they are completely clean” (arm 1; best of one’s abilities (BP)) or “brush your teeth as usual” “(arm 2; as usual (AU)) (instructions are translated fr…”
  - `plaque_after_ns`: “Groups did not differ significantly with respect to the primary (overall MPI: t89 = 1.045; p = 0.149; d = 0.22) or secondary (TQHI % 3–5 overall: t89 = 1.126; p = 0.132; d = 0.24) outcome variable.”

**Card headline**

- Plaque along the gumline showed no clear difference from brushing as usual.
  - `plaque_after_ns`: “Groups did not differ significantly with respect to the primary (overall MPI: t89 = 1.045; p = 0.149; d = 0.22) or secondary (TQHI % 3–5 overall: t89 = 1.126; p = 0.132; d = 0.24) outcome variable.”

**Card support**

- The best-effort group brushed nearly a minute longer, mostly on the outer surfaces.
  - `nearly_one_minute`: “Their brushing time exceeded that of the AU group by nearly one minute (see Fig. 1).”
  - `extra_time_outer`: “Nevertheless, detailed analyses revealed that this difference had its main origin in an extended brushing of outer surfaces.”

**Source line: who**

- 91 students aged 18 to 35
  - `limit_n91`: “However, dropouts and outlying values resulted in only N = 91 available for inferential statistics.”
  - `inclusion_age`: “Inclusion criteria were being a student-resident of Giessen aged at least 18 to a maximum of 35 years as well as the predominant use of a manual toothbrush for at least six months (at least two-thirds of all tooth brushi…”
  - `limit_students`: “First, the participants were university students, and thus the data might not transfer to other populations.”

**Source line: span**

- one filmed brushing session each
  - `limit_one_event`: “Second, the results focus on only one toothbrushing event.”
  - `camera_mirror`: “This front camera served both as a mirror and as a recording tool for video recording of the participants’ tooth brushing performance.”

**Feed card figure alt text**

- Two bars for the best-effort group: the gumline they believed was clean, and the much smaller part the dentists found clean.
  - `bp_thought_70`: “While objective plaque data indicate that less than 40% of the sections of the gingival margins were free from plaque, participants in the BP group thought it was 70%.”
  - `under_40_clean`: “While objective plaque data indicate that less than 40% of the sections of the gingival margins were free from plaque, participants in the BP group thought it was 70%.”

**Population panel**

- Who was studied: university students in Giessen aged 18 to 35.
  - `limit_students`: “First, the participants were university students, and thus the data might not transfer to other populations.”
  - `inclusion_age`: “Inclusion criteria were being a student-resident of Giessen aged at least 18 to a maximum of 35 years as well as the predominant use of a manual toothbrush for at least six months (at least two-thirds of all tooth brushi…”
- All mainly used a manual toothbrush.
  - `inclusion_manual_brush`: “Inclusion criteria were being a student-resident of Giessen aged at least 18 to a maximum of 35 years as well as the predominant use of a manual toothbrush for at least six months (at least two-thirds of all tooth brushi…”
- A drawn lot gave each of 111 students one of two instructions before brushing once.
  - `randomization_lots`: “For randomization, A2 drew a lot with the respective instruction out of an opaque box.”
  - `randomized_111`: “Finally, 111 participants were recruited and randomized to the study arms (see Fig. 1).”
  - `limit_one_event`: “Second, the results focus on only one toothbrushing event.”
- People with braces, dentures, a recent professional cleaning or dental training could not take part.
  - `exclusion_criteria`: “Exclusion criteria were fixed orthodontic appliances, removable prostheses/dentures, oral piercings or dental jewelry, dental prophylaxis within the previous four months, pregnancy/lactation or use of antibiotics within …”

## Mechanism

**Paragraph 1**

- Plaque is a sticky film on the teeth.
- The film left along the gumline is one important cause of gum disease.
  - `marginal_plaque_cause`: “One important etiological factor is persistent marginal plaque [, ].”
- More than half of adults have that disease.
  - `prevalence`: “More than 50% of adults are affected by these chronic inflammatory disorders [], and the global prevalence of severe periodontitis is estimated to be eleven to thirteen percent [, ].”

**Paragraph 2**

- So a dentist’s idea of clean is strict: every bit of film gone, gumline included.
  - `spoc_dentist_standard`: “They learned that, in dental judgment, a clean surface is only achieved when all plaque deposits, including those at the gum line, are removed.”
- The authors think most people brush to remove the plaque others can see.
  - `social_motive`: “This might be due to an important social motive of tooth brushing, i.e., removing visible plaque.”

**Paragraph 3**

- This trial asked what happens when you tell people to try harder.
  - `instruction_bp`: “These were either “brush your teeth as thoroughly as you can so that they are completely clean” (arm 1; best of one’s abilities (BP)) or “brush your teeth as usual” “(arm 2; as usual (AU)) (instructions are translated fr…”
- Students told to brush as thoroughly as they could brushed nearly a minute longer.
  - `instruction_bp`: “These were either “brush your teeth as thoroughly as you can so that they are completely clean” (arm 1; best of one’s abilities (BP)) or “brush your teeth as usual” “(arm 2; as usual (AU)) (instructions are translated fr…”
  - `nearly_one_minute`: “Their brushing time exceeded that of the AU group by nearly one minute (see Fig. 1).”
- Most of the extra time went to the outer surfaces.
  - `extra_time_outer`: “Nevertheless, detailed analyses revealed that this difference had its main origin in an extended brushing of outer surfaces.”

**Paragraph 4**

- How they brushed showed no clear difference.
  - `shares_ns`: “No statistically significant between-group differences were found for any of these variables (see Table 2).”
- About two-thirds in both groups skipped at least one section of the mouth.
  - `missed_a_sextant`: “Instead, approximately two-thirds of both groups missed at least one sextant, and approximately 10% did not brush their inner surfaces at all.”
- About one in ten never brushed their inner surfaces at all.
  - `inner_never_brushed`: “Instead, approximately two-thirds of both groups missed at least one sextant, and approximately 10% did not brush their inner surfaces at all.”
- Side-to-side scrubbing, which is generally discouraged, showed no clear difference between the groups.
  - `horizontal_not_reduced`: “The instruction to brush to the best of one’s abilities did not reduce the application of horizontal brushing movements, which are generally discouraged [].”
  - `shares_ns`: “No statistically significant between-group differences were found for any of these variables (see Table 2).”

**Paragraph 5**

- Afterwards, plaque along the gumline showed no clear difference between the groups.
  - `plaque_after_ns`: “Groups did not differ significantly with respect to the primary (overall MPI: t89 = 1.045; p = 0.149; d = 0.22) or secondary (TQHI % 3–5 overall: t89 = 1.126; p = 0.132; d = 0.24) outcome variable.”
- Less than 40% of the gumline came out free of plaque.
  - `under_40_clean`: “While objective plaque data indicate that less than 40% of the sections of the gingival margins were free from plaque, participants in the BP group thought it was 70%.”
- In the best-effort group, plaque stayed on 80% of the gumline sections between the teeth.
  - `proximal_80`: “Instead, plaque persisted in 80% of these sections.”

**Paragraph 6**

- The gap is one people cannot see.
  - `not_aware`: “However, they are not aware of this deficiency, as the current data show.”
- The best-effort group believed 70% of their gumline was clean.
  - `bp_thought_70`: “While objective plaque data indicate that less than 40% of the sections of the gingival margins were free from plaque, participants in the BP group thought it was 70%.”
- Both groups rated their teeth about twice as clean as the dentists found.
  - `overestimate_twofold`: “Both groups overestimated their actual oral cleanliness by approximately twofold.”
- The authors read this as trying harder meaning more time, not reaching more of the teeth.
  - `quantity_not_quality`: “The participants’ concept of optimized tooth brushing apparently refers mainly to the brushing quantity in terms of time but not to its quality in terms of sufficient consideration of all surfaces or the application of m…”

**Figure caption**

- The best-effort group, right after brushing, as the paper measured it.
  - `under_40_clean`: “While objective plaque data indicate that less than 40% of the sections of the gingival margins were free from plaque, participants in the BP group thought it was 70%.”
  - `bp_thought_70`: “While objective plaque data indicate that less than 40% of the sections of the gingival margins were free from plaque, participants in the BP group thought it was 70%.”

**Figure alt text**

- Two bars on a scale of the whole gumline.
  - `bp_thought_70`: “While objective plaque data indicate that less than 40% of the sections of the gingival margins were free from plaque, participants in the BP group thought it was 70%.”
  - `under_40_clean`: “While objective plaque data indicate that less than 40% of the sections of the gingival margins were free from plaque, participants in the BP group thought it was 70%.”
- The top bar, what the best-effort group believed was clean, reaches 70%.
  - `bp_thought_70`: “While objective plaque data indicate that less than 40% of the sections of the gingival margins were free from plaque, participants in the BP group thought it was 70%.”
- The bottom bar, what the dentists found free of plaque, stops below 40%.
  - `under_40_clean`: “While objective plaque data indicate that less than 40% of the sections of the gingival margins were free from plaque, participants in the BP group thought it was 70%.”

## Protocol

**Paragraph 1**

- Each student came twice, two weeks apart, and cleaned nothing for at least four hours before each visit.
  - `visits_two_weeks`: “Eligible students were scheduled for two appointments that were two weeks apart.”
  - `no_hygiene_4h`: “All participants were instructed to refrain from any oral hygiene behavior at least four hours before the appointments.”
- A drawn lot set the instruction they got before brushing.
  - `randomization_lots`: “For randomization, A2 drew a lot with the respective instruction out of an opaque box.”
- It was either brush as thoroughly as you can so your teeth are completely clean, or brush as usual.
  - `instruction_bp`: “These were either “brush your teeth as thoroughly as you can so that they are completely clean” (arm 1; best of one’s abilities (BP)) or “brush your teeth as usual” “(arm 2; as usual (AU)) (instructions are translated fr…”
  - `instruction_au`: “These were either “brush your teeth as thoroughly as you can so that they are completely clean” (arm 1; best of one’s abilities (BP)) or “brush your teeth as usual” “(arm 2; as usual (AU)) (instructions are translated fr…”
- They brushed at both visits; plaque after brushing was scored at the second.
  - `plaque_second_visit`: “While study participants were asked to brush their teeth at both appointments, plaque after brushing was only assessed at the second appointment.”

**Paragraph 2**

- Everyone got the same manual toothbrush and toothpaste, with floss and small between-teeth brushes free to use on a table.
  - `standard_brush`: “The participants were provided with a standard manual toothbrush (Elmex InterX short brush-head, medium; GABA, Loerrach, Germany) and toothpaste (Elmex; GABA, Loerrach, Germany).”
  - `devices_on_table`: “Additionally, dental floss (waxed and unwaxed dental floss; Elmex; GABA, Loerrach, Germany), super floss (Meridol Special-Floss; GABA, Loerrach, Germany) and interdental brushes (Elmex interdental brush sizes 2 and 4; GA…”
  - `devices_available`: “A2 informed the participants that these devices were at their free disposal.”
- A tablet camera served as the mirror and filmed the brushing.
  - `camera_mirror`: “This front camera served both as a mirror and as a recording tool for video recording of the participants’ tooth brushing performance.”
- A red film on its screen hid the plaque dye.
  - `stain_hidden`: “A red transparent sheet covered the surface of the tablet display to make plaque staining invisible for the participant.”
- Dentists who did not know the instruction scored plaque before and right after brushing.
  - `blinding`: “A2 was kept blind regarding the results of the dental examinations, as were the dentists regarding the experimental condition of the participant.”
  - `plaque_twice`: “Dental plaque was assessed twice (before and immediately after brushing).”

## Audit

**Effect**

- Gumline plaque after brushing, best effort against as usual: no clear difference (t89 = 1.045; p = 0.149; d = 0.22).
  - `plaque_after_ns`: “Groups did not differ significantly with respect to the primary (overall MPI: t89 = 1.045; p = 0.149; d = 0.22) or secondary (TQHI % 3–5 overall: t89 = 1.126; p = 0.132; d = 0.24) outcome variable.”

**Weak end**

- The paper reports no confidence interval for this result, only the test above.
  - `plaque_after_ns`: “Groups did not differ significantly with respect to the primary (overall MPI: t89 = 1.045; p = 0.149; d = 0.22) or secondary (TQHI % 3–5 overall: t89 = 1.126; p = 0.132; d = 0.24) outcome variable.”
- The authors add that every unclear difference was far below what the planned sample could detect.
  - `nonsig_far_below`: “In addition, all nonsignificant effect sizes were far below the level that could have been significant with the targeted sample size.”

**Limitation 1**

- Only university students took part, so the result may not hold for others.
  - `limit_students`: “First, the participants were university students, and thus the data might not transfer to other populations.”

**Limitation 2**

- It was one brushing session, so nobody knows what trying harder for weeks would do.
  - `limit_one_event`: “Second, the results focus on only one toothbrushing event.”
  - `limit_longer_period`: “No information is available on how oral hygiene would improve if people would increase their efforts for a longer period.”

**Limitation 3**

- The as-usual group may have tried harder than at home to meet social expectations.
  - `limit_au_norms`: “Third, the AU group might have increased their efforts to fulfill social norms and expectations, which might have reduced the observable differences between the two groups.”
  - `limit_au_longer`: “The AU might have brushed longer than they would do at home.”

**Limitation 4**

- The study analysed only 91, short of the 102 it planned for.
  - `limit_n91`: “However, dropouts and outlying values resulted in only N = 91 available for inferential statistics.”
  - `power_calculation`: “Sample size was calculated using G*Power 3, a free available power analysis program [], and resulted in n = 102 participants needed to detect medium effect sizes (Cohen`s d = 0.5–0.8 []) with α = 5% and test-power of 1–β…”

**Limitation 5**

- The authors registered the trial only after collecting the data.
  - `registration_retrospective`: “Registration was conducted retrospectively in August 2019 after completion of data assessment.”

**What most summaries miss**

- Two-thirds of the best-effort group cleaned between their teeth, against one-quarter of the as-usual group.
  - `interdental_share`: “Interdental hygiene devices were used by two-thirds of the BP group compared to only one-quarter of the AU-brushers.”
- That showed no clear sign of a cleaner gumline between the teeth.
  - `interdental_no_benefit`: “Furthermore, the more frequent use of interdental devices in the BP group did not improve their cleanliness in the proximal sections of the gum lines.”
- Only 4 people in each group flossed correctly.
  - `floss_correct`: “N = 4 in each group applied dental floss correctly.”

**Full receipts 1**

- The best-effort group rated their teeth cleaner (t88 = 2.548; p = 0.006; d = 0.54).
  - `felt_cleaner`: “Analyses of subjectively perceived oral cleanliness (Fig. 5) revealed significant group differences for the primary outcome variable, the overall SPOCd (t88 = 2.548; p = 0.006; d = 0.54), as well as for the SPOCd subscal…”

**Full receipts 2**

- The best-effort group brushed longer (t89 = -2.700; p = 0.008; d = -0.57), mainly on the outer surfaces (p = 0.003).
  - `brushed_longer`: “Participants in the BP group brushed their teeth longer (p = 0.008, d = 0.57) and used interdental devices more often (p < 0.001).”
  - `time_total`: “Analysis of the primary behavioral variables, i.e., total tooth contact time and tooth contact time at the occlusal and outer surfaces, revealed significant group differences in the total tooth contact time (t89 = -2.700…”
  - `time_outer`: “Analysis of the primary behavioral variables, i.e., total tooth contact time and tooth contact time at the occlusal and outer surfaces, revealed significant group differences in the total tooth contact time (t89 = -2.700…”

**Full receipts 3**

- On the outer surfaces the plaque differences were medium-sized, d = 0.37 and d = 0.46, but not clear.
  - `outer_effect_sizes`: “Additional analyses revealed that the largest effect sizes emerged for the outer surfaces both for the MPI (d = 0.37) and the TQHI % 3–5 (d = 0.46).”
  - `limit_coronal`: “Finally, even though plaque after oral hygiene did not differ statistically, medium effect sizes were observable with regard to more coronal parts of the crown.”

**Full receipts 4**

- One hundred and six finished; 15 of them were then left out for extreme values.
  - `finished_106`: “One hundred and six participants finished the study (see Fig. 1).”
  - `excluded_15`: “Due to outlying value(s) (M ± 3 SD) in at least one of the behavioral parameters, 15 participants were excluded from statistical analyses.”

**Full receipts 5**

- The as-usual group had more decayed, missing or filled teeth.
  - `dmft_imbalance`: “Descriptive data of the DMFT show differences between the two groups, with a higher DMFT value in the AU group (Table 1).”
- Leaving out the five with the most kept the results pointing the same way.
  - `dmft_sensitivity`: “An additional analysis excluding those five participants in this group with DMFT values > 10 did not change the direction of the results.”

**Full receipts 6**

- Paid for from an author’s institutional budget; no conflicts of interest declared.
  - `funding`: “The study was financed by the institutional budget of RD.”
  - `no_conflicts`: “All authors declare that they have no conflicts of interest.”

## Glossary

- **plaque dye**: A dye painted on the teeth that colours plaque, so the dentists could see and score it. (rests on disclosing_agent)
- **inner surfaces**: The sides of the teeth that face the tongue. (rests on time_inner_ns)

## Takeaways

**Takeaway 1**

- Told to brush their best, students brushed nearly a minute longer, mostly on the outer surfaces.
  - `nearly_one_minute`: “Their brushing time exceeded that of the AU group by nearly one minute (see Fig. 1).”
  - `extra_time_outer`: “Nevertheless, detailed analyses revealed that this difference had its main origin in an extended brushing of outer surfaces.”

**Takeaway 2**

- Plaque along the gumline afterwards showed no clear difference from brushing as usual.
  - `plaque_after_ns`: “Groups did not differ significantly with respect to the primary (overall MPI: t89 = 1.045; p = 0.149; d = 0.22) or secondary (TQHI % 3–5 overall: t89 = 1.126; p = 0.132; d = 0.24) outcome variable.”

**Takeaway 3**

- The authors suggest teaching which surfaces to reach and showing people what they miss; the trial did not test that.
  - `emphasize_quality`: “Emphasizing the qualitative aspects of tooth brushing behavior and raising awareness of hygiene deficits could be a first step toward improving the effectiveness of oral hygiene.”

## Steps (what a reader can tick)

- **Brush the inner surfaces too** (`brush-inner-surfaces`, evidence: none, weight 0): About one in ten people in this trial never brushed the sides that face the tongue. The trial did not test this step, so it carries no weight. A tick records that you brushed them. Refs: inner_never_brushed
- **Reach every section of your mouth** (`reach-every-section`, evidence: none, weight 0): About two-thirds of both groups skipped at least one section. The trial did not test this step, so it carries no weight. Refs: missed_a_sextant
- **Clean between your teeth** (`floss-to-gumline`, evidence: none, weight 0): Only 4 people in each group flossed correctly. The trial did not test this step, so it carries no weight. Refs: floss_correct

## Simulator

`estimate-explorer`: Chewing surfaces, as usual (%) → `share_occlusal_au` = 44.6; Chewing surfaces, best effort (%) → `share_occlusal_bp` = 40.52; Outer surfaces, as usual (%) → `share_outer_au` = 40.63; Outer surfaces, best effort (%) → `share_outer_bp` = 42.7; Inner surfaces, as usual (%) → `share_inner_au` = 14.77; Inner surfaces, best effort (%) → `share_inner_bp` = 16.78

## Instagram deck

**Slide 1 (hook) heading**

- Does trying your best at the sink get teeth cleaner?

**Slide 1 body**

- Students brushed as thoroughly as they could, or as usual, then dentists checked.
  - `instruction_bp`: “These were either “brush your teeth as thoroughly as you can so that they are completely clean” (arm 1; best of one’s abilities (BP)) or “brush your teeth as usual” “(arm 2; as usual (AU)) (instructions are translated fr…”
  - `instruction_au`: “These were either “brush your teeth as thoroughly as you can so that they are completely clean” (arm 1; best of one’s abilities (BP)) or “brush your teeth as usual” “(arm 2; as usual (AU)) (instructions are translated fr…”
  - `plaque_twice`: “Dental plaque was assessed twice (before and immediately after brushing).”

  art: `{"motif": "pair", "a": {"value": {"text": "70%", "ref": "bp_thought_70"}, "label": "Gumline they thought was clean [bp_thought_70]"}, "b": {"value": {"text": "40%", "ref": "under_40_clean"}, "label": "Less than this was plaque-free [under_40_clean]"}}`

**Slide 2 (finding) heading**

- Gumline plaque: no clear difference from brushing as usual.
  - `plaque_after_ns`: “Groups did not differ significantly with respect to the primary (overall MPI: t89 = 1.045; p = 0.149; d = 0.22) or secondary (TQHI % 3–5 overall: t89 = 1.126; p = 0.132; d = 0.24) outcome variable.”

**Slide 2 body**

- Trying hard added nearly a minute, mostly on the outer surfaces.
  - `nearly_one_minute`: “Their brushing time exceeded that of the AU group by nearly one minute (see Fig. 1).”
  - `extra_time_outer`: “Nevertheless, detailed analyses revealed that this difference had its main origin in an extended brushing of outer surfaces.”

  art: `{"motif": "verdicts", "rows": [{"label": "Gumline plaque [-]", "verdict": "no-clear-difference", "fact": "fact:plaque_after_ns"}, {"label": "Brushing time [-]", "verdict": "higher", "fact": "fact:brushed_longer"}, {"label": "Cleaned between teeth [-]", "verdict": "higher", "fact": "fact:interdental_use"}, {"label": "Felt clean [-]", "verdict": "higher", "fact": "fact:felt_cleaner_higher"}]}`

**Slide 3 (why) heading**

- More time, same blind spots.
  - `quantity_not_quality`: “The participants’ concept of optimized tooth brushing apparently refers mainly to the brushing quantity in terms of time but not to its quality in terms of sufficient consideration of all surfaces or the application of m…”

**Slide 3 body**

- Two-thirds skipped a section of the mouth (sextant).
  - `missed_a_sextant`: “Instead, approximately two-thirds of both groups missed at least one sextant, and approximately 10% did not brush their inner surfaces at all.”
- One in ten never brushed the tongue side.
  - `inner_never_brushed`: “Instead, approximately two-thirds of both groups missed at least one sextant, and approximately 10% did not brush their inner surfaces at all.”

**Slide 4 (who) heading**

- Tested on students, after one brushing.
  - `limit_students`: “First, the participants were university students, and thus the data might not transfer to other populations.”
  - `limit_one_event`: “Second, the results focus on only one toothbrushing event.”

  art: `{"motif": "who", "tested": ["91 students aged 18 to 35 [limit_n91, inclusion_age]", "Manual toothbrush users [inclusion_manual_brush]", "One brushing session [limit_one_event]"], "notTested": ["Braces or dentures [exclusion_criteria]", "Dental training [exclusion_criteria]", "Non-students [limit_students]", "Weeks of extra effort [limit_longer_period]"]}`

**Slide 5 (receipts) heading**

- How sure can we be?

  art: `{"motif": "checks", "strong": "Instruction set by lot; dentists did not know which. [randomization_lots, blinding]", "weak": "One session, students only. [limit_one_event, limit_students]", "missing": "Weeks of trying harder: not studied. [limit_longer_period]"}`

**Slide 6 (cta) heading**

- Where does your brushing time go?

**Slide 6 body**

- Compare how each group split its time between surfaces.
  - `shares_ns`: “No statistically significant between-group differences were found for any of these variables (see Table 2).”

**Alternate opening “The flossing”**

- How many people floss the way dentists mean?
- In a filmed trial, this many in each group got it right.
  - `floss_correct`: “N = 4 in each group applied dental floss correctly.”

  art: `{"motif": "number", "value": {"text": "4", "ref": "floss_correct"}, "unit": "people [-]", "label": "flossed correctly, in each group [floss_correct]"}`

**Alternate opening “The gaps between teeth”**

- Does brushing your best clean between your teeth?
- After students brushed their best, plaque stayed on this share of the gumline between teeth.
  - `instruction_bp`: “These were either “brush your teeth as thoroughly as you can so that they are completely clean” (arm 1; best of one’s abilities (BP)) or “brush your teeth as usual” “(arm 2; as usual (AU)) (instructions are translated fr…”
  - `proximal_80`: “Instead, plaque persisted in 80% of these sections.”

  art: `{"motif": "number", "value": {"text": "80%", "ref": "proximal_80"}, "label": "of between-teeth gumline sections kept plaque [proximal_80]"}`

**Caption**

- A randomized trial of 111 university students told to brush as well as they could, or as usual.
  - `randomized_111`: “Finally, 111 participants were recruited and randomized to the study arms (see Fig. 1).”
  - `limit_students`: “First, the participants were university students, and thus the data might not transfer to other populations.”
  - `instruction_bp`: “These were either “brush your teeth as thoroughly as you can so that they are completely clean” (arm 1; best of one’s abilities (BP)) or “brush your teeth as usual” “(arm 2; as usual (AU)) (instructions are translated fr…”
  - `instruction_au`: “These were either “brush your teeth as thoroughly as you can so that they are completely clean” (arm 1; best of one’s abilities (BP)) or “brush your teeth as usual” “(arm 2; as usual (AU)) (instructions are translated fr…”
- The best-effort group brushed nearly a minute longer.
  - `nearly_one_minute`: “Their brushing time exceeded that of the AU group by nearly one minute (see Fig. 1).”
- Plaque along the gumline afterwards showed no clear difference.
  - `plaque_after_ns`: “Groups did not differ significantly with respect to the primary (overall MPI: t89 = 1.045; p = 0.149; d = 0.22) or secondary (TQHI % 3–5 overall: t89 = 1.126; p = 0.132; d = 0.24) outcome variable.”
- Both groups thought their teeth were about twice as clean as the dentists found.
  - `overestimate_twofold`: “Both groups overestimated their actual oral cleanliness by approximately twofold.”
- One brushing session, students only.
  - `limit_one_event`: “Second, the results focus on only one toothbrushing event.”
  - `limit_students`: “First, the participants were university students, and thus the data might not transfer to other populations.”
- Full read and the brushing-time explorer: link in bio.

Hashtags: #oralhealth #dentalcare #toothbrushing #evidencebased #clinicaltrial
