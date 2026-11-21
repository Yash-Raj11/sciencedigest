# Opus trial, paper 6 of 6: a ceramide cream and cleanser for eczema, a draft for your review

Spada F et al., *Dermatologic Therapy* 2021, doi:10.1111/dth.14970 (PMC8459234, CC-BY). Free tier. **Not published** (`publishedAt` null).
A randomized, double-blind, placebo-controlled trial at one Australian skin clinic: 100 adults with moderate eczema, 50 per group, 28 days; 83 finished. Both groups used a cream twice a day and a cleanser once a day (ceramide set or look-alike placebo set), with a steroid gel to use if needed. The main outcome, the eczema score (EASI), showed no clear difference at day 28 (p = .7804): 14.70 to 8.25 with ceramide, 14.28 to 7.84 with placebo. The secondary outcomes, water loss through the skin and skin hydration, did better with the ceramide set.

**How this was made.** Claude Opus 5.5 wrote it by hand in Claude Code, with no API key: the extraction with its coverage map, the read, the deck and one figure. The project's real gate and lint judged every file. Treat it as an **upper bound** for a one-shot API run. Every refusal and fix: `fixes.md`.

**What to decide, or look at closely**

1. **The read leads with the null result.** The title, card, hook and deck say the eczema score showed no clear difference; the barrier results come second. The paper's own title and abstract lead the other way ("restores the skin permeability barrier", "improves the signs and symptoms of eczema"). The audit says so under "what most summaries miss".
2. **The weighted step rests on a secondary outcome.** "Ceramide cream on the whole body, morning and night" carries weight through `tewl_lower` (water loss fell more than with placebo; graded moderate, as a randomized trial of 100). The main outcome showed no clear difference. Is a barrier result enough to weight a skin-care step, or should it carry weight 0 like the wash step? This is a scoring question: your call, rule 11.
3. **Run by the manufacturer.** Six of the ten authors work for the company that makes the cream and sponsored the trial. It is the read's first limitation and on the deck's receipts. The read names no brand.
4. **No range can be shown.** The paper gives every score as mean ± standard error, and no confidence interval for the difference. The figure and the simulator show the printed means only.
5. **The paper disagrees with itself twice.** The quality-of-life test is p = .5256 in the abstract and p = .7804 in the results (the same figure as the eczema score); the read gives both. Table 2's sex rows contradict the text (see `fixes.md`); the read does not state the split.
6. **Water loss and hydration have no numbers.** The paper draws them only as charts, so the read can say which way they went but not by how much.
7. **The "why" slide has no picture**, as in papers 1 to 5.

Every sentence is listed below with the paper's own words for each fact it cites. `[-]` means a sentence cites nothing. Long quotes are cut at 220 characters.
Deck: `deck/sheet-dark.png`, `deck/sheet-light.png` (6 slides, then 1 alternate opening). Figure: `figure/eczema-scores.html` (light and dark, full and feed-card views).

## Feed card and top of the read

**Title**

- A ceramide cream and cleanser for eczema, against a placebo set for 28 days
  - `placebo_set`: “QV intensive with ceramides light moisturizing cream (ceramide cream) and QV intensive with ceramides hydrating body wash (ceramide cleanser) were obtained from Ego Pharmaceuticals Pty. Ltd. (Braeside, Victoria, Australi…”
  - `twenty_eight_days`: “The objective of this randomized, double‐blind, placebo‐controlled, single centre, comparative trial was to determine whether a two‐part system consisting of a ceramide‐dominant physiological lipid‐based moisturizing cre…”

**Teaser**

- Adults with moderate eczema used a ceramide cream and cleanser, or a look-alike placebo set, for 28 days.
  - `inclusion_moderate`: “A total of 100 patients were recruited from the outpatient clinic at St George Dermatology and Skin Cancer Centre (Kogarah, New South Wales, Australia) between September 2015 and October 2019. Inclusion criteria were: (a…”
  - `placebo_set`: “QV intensive with ceramides light moisturizing cream (ceramide cream) and QV intensive with ceramides hydrating body wash (ceramide cleanser) were obtained from Ego Pharmaceuticals Pty. Ltd. (Braeside, Victoria, Australi…”
  - `twenty_eight_days`: “The objective of this randomized, double‐blind, placebo‐controlled, single centre, comparative trial was to determine whether a two‐part system consisting of a ceramide‐dominant physiological lipid‐based moisturizing cre…”
- The eczema score showed no clear difference between them.
  - `easi_ns`: “For the primary efficacy outcome, both ceramide cream and cleanser (day 0:14.70 ± 0.52 vs day 28:8.25 ± 0.78, P < .0001) and placebo cream and cleanser (day 0:14.28 ± 0.43 vs day 28:7.84 ± 0.75, P < .0001) significantly …”
- The ceramide set did keep more water in the skin.
  - `hydration_up`: “Strikingly though, use of the ceramide cream and cleanser resulted in significant improvements in barrier function compared to the placebo as measured by a decrease in TEWL and increased skin hydration.”

**Hook**

- By day 28, the eczema score stood at 8.25 with a ceramide cream and cleanser.
  - `easi_active_28`: “For the primary efficacy outcome, both ceramide cream and cleanser (day 0:14.70 ± 0.52 vs day 28:8.25 ± 0.78, P < .0001) and placebo cream and cleanser (day 0:14.28 ± 0.43 vs day 28:7.84 ± 0.75, P < .0001) significantly …”
- With a look-alike placebo set, it stood at 7.84.
  - `easi_placebo_28`: “For the primary efficacy outcome, both ceramide cream and cleanser (day 0:14.70 ± 0.52 vs day 28:8.25 ± 0.78, P < .0001) and placebo cream and cleanser (day 0:14.28 ± 0.43 vs day 28:7.84 ± 0.75, P < .0001) significantly …”

**Card question**

- Does a ceramide cream and cleanser calm eczema better than a placebo set?
  - `easi_ns`: “For the primary efficacy outcome, both ceramide cream and cleanser (day 0:14.70 ± 0.52 vs day 28:8.25 ± 0.78, P < .0001) and placebo cream and cleanser (day 0:14.28 ± 0.43 vs day 28:7.84 ± 0.75, P < .0001) significantly …”

**Card headline**

- After 28 days, the eczema score showed no clear difference between the two sets.
  - `easi_ns`: “For the primary efficacy outcome, both ceramide cream and cleanser (day 0:14.70 ± 0.52 vs day 28:8.25 ± 0.78, P < .0001) and placebo cream and cleanser (day 0:14.28 ± 0.43 vs day 28:7.84 ± 0.75, P < .0001) significantly …”

**Card support**

- Water loss through the skin fell more with the ceramide set.
  - `tewl_lower`: “Strikingly though, use of the ceramide cream and cleanser resulted in significant improvements in barrier function compared to the placebo as measured by a decrease in TEWL and increased skin hydration.”

**Source line: who**

- 100 adults with moderate eczema
  - `itt_100`: “The demographics and baseline characteristics of the ITT population are described in Table 2 and consisted of 100 patients (53 female, 47 male; aged 18‐73 years; mean age 30.9 years) who received either ceramide cream an…”
  - `inclusion_moderate`: “A total of 100 patients were recruited from the outpatient clinic at St George Dermatology and Skin Cancer Centre (Kogarah, New South Wales, Australia) between September 2015 and October 2019. Inclusion criteria were: (a…”

**Source line: span**

- 28 days
  - `twenty_eight_days`: “The objective of this randomized, double‐blind, placebo‐controlled, single centre, comparative trial was to determine whether a two‐part system consisting of a ceramide‐dominant physiological lipid‐based moisturizing cre…”

**Feed card figure alt text**

- Two rows, one for each set: a line from the score at the start to the score at the end.
  - `easi_active_0`: “For the primary efficacy outcome, both ceramide cream and cleanser (day 0:14.70 ± 0.52 vs day 28:8.25 ± 0.78, P < .0001) and placebo cream and cleanser (day 0:14.28 ± 0.43 vs day 28:7.84 ± 0.75, P < .0001) significantly …”
  - `easi_active_28`: “For the primary efficacy outcome, both ceramide cream and cleanser (day 0:14.70 ± 0.52 vs day 28:8.25 ± 0.78, P < .0001) and placebo cream and cleanser (day 0:14.28 ± 0.43 vs day 28:7.84 ± 0.75, P < .0001) significantly …”
- The two lines nearly match.
  - `easi_ns`: “For the primary efficacy outcome, both ceramide cream and cleanser (day 0:14.70 ± 0.52 vs day 28:8.25 ± 0.78, P < .0001) and placebo cream and cleanser (day 0:14.28 ± 0.43 vs day 28:7.84 ± 0.75, P < .0001) significantly …”

**Population panel**

- Who this was tested in: 100 adults with moderate eczema, from one skin clinic in New South Wales, Australia.
  - `itt_100`: “The demographics and baseline characteristics of the ITT population are described in Table 2 and consisted of 100 patients (53 female, 47 male; aged 18‐73 years; mean age 30.9 years) who received either ceramide cream an…”
  - `inclusion_moderate`: “A total of 100 patients were recruited from the outpatient clinic at St George Dermatology and Skin Cancer Centre (Kogarah, New South Wales, Australia) between September 2015 and October 2019. Inclusion criteria were: (a…”
  - `recruited`: “A total of 100 patients were recruited from the outpatient clinic at St George Dermatology and Skin Cancer Centre (Kogarah, New South Wales, Australia) between September 2015 and October 2019. Inclusion criteria were: (a…”
- They were aged 18 to 73, and about half were Asian.
  - `age_mean`: “The demographics and baseline characteristics of the ITT population are described in Table 2 and consisted of 100 patients (53 female, 47 male; aged 18‐73 years; mean age 30.9 years) who received either ceramide cream an…”
  - `asian_row`: “Asian | 27 (54%) | 22 (44%) | 49 (49%) |”
- Everyone stopped their usual creams and skin medicines; both groups had a steroid gel to use if needed.
  - `washout`: “Patients were instructed not to use their usual moisturizers, cleansers or topical medications for 1 week prior to participation (wash‐out) or during the study period.”
  - `rescue_steroid`: “Patients were instructed to massage the cleanser into wet skin across their whole body once daily, rinse with water and pat dry, for 28 days. Patients were also required to apply the cream liberally to their whole body, …”
- A random draw put 50 on each set, and 83 finished.
  - `randomized_blocks`: “Patients meeting the inclusion criteria were randomly assigned to receive either the ceramide cream and ceramide cleanser or placebo cream and placebo cleanser according to a randomization schedule generated using SAS st…”
  - `per_group_50`: “The demographics and baseline characteristics of the ITT population are described in Table 2 and consisted of 100 patients (53 female, 47 male; aged 18‐73 years; mean age 30.9 years) who received either ceramide cream an…”
  - `completed_83`: “The demographics and baseline characteristics of the ITT population are described in Table 2 and consisted of 100 patients (53 female, 47 male; aged 18‐73 years; mean age 30.9 years) who received either ceramide cream an…”

## Mechanism

**Paragraph 1**

- Picture the outer layer of your skin as a brick wall.
- The cells are the bricks, and a fatty mortar fills the gaps between them.
  - `mortar`: “Ceramides act as water modulators and an integral part of the skins permeability barrier by forming multi‐layered lamellar structures with cholesterol and free fatty acids between cells of the SC.”
- Part of that mortar is a family of fats called ceramides.
  - `mortar`: “Ceramides act as water modulators and an integral part of the skins permeability barrier by forming multi‐layered lamellar structures with cholesterol and free fatty acids between cells of the SC.”

**Paragraph 2**

- In eczema, the mortar holds less ceramide.
  - `ceramide_low`: “The compromised skin barrier is mainly attributable to significantly decreased levels of ceramides in the stratum corneum (SC) in lesional and non‐lesional skin.”
- Water seeps out through the gaps, the skin dries, and irritants inflame it more easily.
  - `leaky`: “The abnormal barrier function in eczema results in increased transepidermal water loss (TEWL) leading to xerosis, and predisposes the skin to inflammatory processes evoked by irritants and allergens.”
- The name for this escaping water is transepidermal water loss.
  - `leaky`: “The abnormal barrier function in eczema results in increased transepidermal water loss (TEWL) leading to xerosis, and predisposes the skin to inflammatory processes evoked by irritants and allergens.”

**Paragraph 3**

- The tested cream carries two ceramides, cholesterol and a fatty acid in a set ratio.
  - `ratio_311`: “Ceramide cream and cleanser also contain ceramide EOP and ceramide NP, cholesterol and linoleic acid from safflower oil in a 3:1:1 M ratio.”
- The authors say it also draws water into the skin, seals it in, and smooths the surface.
  - `triple_system`: “Comprising a “triple moisturizing system”, ceramide cream and cleanser contain glycerin and sodium PCA as humectants to attract and hold water in the SC and epidermis, dimethicone and petrolatum as occludents to maintain…”
- They add that ordinary moisturizers mostly sit on top, while skin fats like ceramides soak in.
  - `conventional`: “Conventional moisturizers form a more superficial occlusive barrier on the skin whereas physiologic lipids, including ceramides, permeate the SC and are synthesized in the keratinocytes, processed in lamellar bodies, and…”

**Paragraph 4**

- On the wall itself, the ceramide set did better than the placebo set.
- Water loss through the skin fell more, and skin hydration rose more.
  - `tewl_lower`: “Strikingly though, use of the ceramide cream and cleanser resulted in significant improvements in barrier function compared to the placebo as measured by a decrease in TEWL and increased skin hydration.”
  - `hydration_up`: “Strikingly though, use of the ceramide cream and cleanser resulted in significant improvements in barrier function compared to the placebo as measured by a decrease in TEWL and increased skin hydration.”
- Hydration stayed ahead of the placebo set at every weekly visit.
  - `hydration_better`: “The difference in skin hydration between the active and placebo groups was significant at all‐time points (P < .05; Figure 4), with skin hydration consistently improving in the active group over time.”

**Paragraph 5**

- The eczema itself is another matter.
- The redness, swelling, itch and thickening the eczema score counts improved about as much in patients on either set.
  - `easi_scale`: “The EASI combines the severity of four signs of eczema (redness, thickness/swelling, itching, lichenification) and the extent of skin involvement at four body regions (head/neck, upper limbs, trunk and lower limbs), with…”
  - `easi_ns`: “For the primary efficacy outcome, both ceramide cream and cleanser (day 0:14.70 ± 0.52 vs day 28:8.25 ± 0.78, P < .0001) and placebo cream and cleanser (day 0:14.28 ± 0.43 vs day 28:7.84 ± 0.75, P < .0001) significantly …”

**Figure caption**

- Each line runs from a group's average eczema score at the start to its score at day 28.
  - `easi_active_0`: “For the primary efficacy outcome, both ceramide cream and cleanser (day 0:14.70 ± 0.52 vs day 28:8.25 ± 0.78, P < .0001) and placebo cream and cleanser (day 0:14.28 ± 0.43 vs day 28:7.84 ± 0.75, P < .0001) significantly …”
  - `easi_active_28`: “For the primary efficacy outcome, both ceramide cream and cleanser (day 0:14.70 ± 0.52 vs day 28:8.25 ± 0.78, P < .0001) and placebo cream and cleanser (day 0:14.28 ± 0.43 vs day 28:7.84 ± 0.75, P < .0001) significantly …”
  - `easi_placebo_0`: “For the primary efficacy outcome, both ceramide cream and cleanser (day 0:14.70 ± 0.52 vs day 28:8.25 ± 0.78, P < .0001) and placebo cream and cleanser (day 0:14.28 ± 0.43 vs day 28:7.84 ± 0.75, P < .0001) significantly …”
  - `easi_placebo_28`: “For the primary efficacy outcome, both ceramide cream and cleanser (day 0:14.70 ± 0.52 vs day 28:8.25 ± 0.78, P < .0001) and placebo cream and cleanser (day 0:14.28 ± 0.43 vs day 28:7.84 ± 0.75, P < .0001) significantly …”

**Figure alt text**

- Two rows on one scale.
- Ceramide set: from 14.70 to 8.25.
  - `easi_active_0`: “For the primary efficacy outcome, both ceramide cream and cleanser (day 0:14.70 ± 0.52 vs day 28:8.25 ± 0.78, P < .0001) and placebo cream and cleanser (day 0:14.28 ± 0.43 vs day 28:7.84 ± 0.75, P < .0001) significantly …”
  - `easi_active_28`: “For the primary efficacy outcome, both ceramide cream and cleanser (day 0:14.70 ± 0.52 vs day 28:8.25 ± 0.78, P < .0001) and placebo cream and cleanser (day 0:14.28 ± 0.43 vs day 28:7.84 ± 0.75, P < .0001) significantly …”
- Placebo set: from 14.28 to 7.84.
  - `easi_placebo_0`: “For the primary efficacy outcome, both ceramide cream and cleanser (day 0:14.70 ± 0.52 vs day 28:8.25 ± 0.78, P < .0001) and placebo cream and cleanser (day 0:14.28 ± 0.43 vs day 28:7.84 ± 0.75, P < .0001) significantly …”
  - `easi_placebo_28`: “For the primary efficacy outcome, both ceramide cream and cleanser (day 0:14.70 ± 0.52 vs day 28:8.25 ± 0.78, P < .0001) and placebo cream and cleanser (day 0:14.28 ± 0.43 vs day 28:7.84 ± 0.75, P < .0001) significantly …”

## Protocol

**Paragraph 1**

- The tested routine ran for 28 days.
  - `twenty_eight_days`: “The objective of this randomized, double‐blind, placebo‐controlled, single centre, comparative trial was to determine whether a two‐part system consisting of a ceramide‐dominant physiological lipid‐based moisturizing cre…”
- Once a day, massage the cleanser into wet skin over the whole body, then rinse and pat dry.
  - `cleanser_daily`: “Patients were instructed to massage the cleanser into wet skin across their whole body once daily, rinse with water and pat dry, for 28 days. Patients were also required to apply the cream liberally to their whole body, …”
- Apply the cream liberally to the whole body twice a day, morning and night.
  - `cream_twice`: “Patients were instructed to massage the cleanser into wet skin across their whole body once daily, rinse with water and pat dry, for 28 days. Patients were also required to apply the cream liberally to their whole body, …”
- One of those goes on straight after the wash.
  - `cream_after_wash`: “Patients were instructed to massage the cleanser into wet skin across their whole body once daily, rinse with water and pat dry, for 28 days. Patients were also required to apply the cream liberally to their whole body, …”

**Paragraph 2**

- Both groups stopped their usual moisturizers and had a steroid gel to use if needed.
  - `washout`: “Patients were instructed not to use their usual moisturizers, cleansers or topical medications for 1 week prior to participation (wash‐out) or during the study period.”
  - `rescue_steroid`: “Patients were instructed to massage the cleanser into wet skin across their whole body once daily, rinse with water and pat dry, for 28 days. Patients were also required to apply the cream liberally to their whole body, …”
- How much gel they used showed no clear difference.
  - `rescue_ns`: “There were no significant differences in the amount of mometasone furoate used as rescue medication by either group at any time point (all P > .05; Figure 5).”

## Audit

**Effect**

- Eczema score at day 28: no clear difference between the two sets (p = .7804).
  - `easi_ns`: “For the primary efficacy outcome, both ceramide cream and cleanser (day 0:14.70 ± 0.52 vs day 28:8.25 ± 0.78, P < .0001) and placebo cream and cleanser (day 0:14.28 ± 0.43 vs day 28:7.84 ± 0.75, P < .0001) significantly …”
- It went from 14.70 to 8.25 with the ceramide set, and from 14.28 to 7.84 with placebo.
  - `easi_active_0`: “For the primary efficacy outcome, both ceramide cream and cleanser (day 0:14.70 ± 0.52 vs day 28:8.25 ± 0.78, P < .0001) and placebo cream and cleanser (day 0:14.28 ± 0.43 vs day 28:7.84 ± 0.75, P < .0001) significantly …”
  - `easi_active_28`: “For the primary efficacy outcome, both ceramide cream and cleanser (day 0:14.70 ± 0.52 vs day 28:8.25 ± 0.78, P < .0001) and placebo cream and cleanser (day 0:14.28 ± 0.43 vs day 28:7.84 ± 0.75, P < .0001) significantly …”
  - `easi_placebo_0`: “For the primary efficacy outcome, both ceramide cream and cleanser (day 0:14.70 ± 0.52 vs day 28:8.25 ± 0.78, P < .0001) and placebo cream and cleanser (day 0:14.28 ± 0.43 vs day 28:7.84 ± 0.75, P < .0001) significantly …”
  - `easi_placebo_28`: “For the primary efficacy outcome, both ceramide cream and cleanser (day 0:14.70 ± 0.52 vs day 28:8.25 ± 0.78, P < .0001) and placebo cream and cleanser (day 0:14.28 ± 0.43 vs day 28:7.84 ± 0.75, P < .0001) significantly …”

**Weak end**

- The paper reports no confidence interval for the difference in eczema score.
  - `easi_ns`: “For the primary efficacy outcome, both ceramide cream and cleanser (day 0:14.70 ± 0.52 vs day 28:8.25 ± 0.78, P < .0001) and placebo cream and cleanser (day 0:14.28 ± 0.43 vs day 28:7.84 ± 0.75, P < .0001) significantly …”
- Its ± figures are standard errors, so the size of a difference the trial could miss stays unknown.
  - `sem`: “Mean ± SEM (Range) | 14.70 ± 0.52 (10.0‐25.2) | 14.28 ± 0.43 (10.0‐19.8) | 14.49 ± 0.48 (10.0–25.2) |”

**Limitation 1**

- Run by the cream's maker, which employs six of the authors.
  - `limit_sponsor`: “Fabrizio Spada, Ian P. Harrison, Tanya M. Barnes, Kerryn A. Greive, Daisy Daniels and Joshua P. Townley are employed by Ego Pharmaceuticals, the sponsor of the study and manufacturer of the ceramide cream and cleanser.”

**Limitation 2**

- Water loss and hydration were secondary outcomes; the main outcome showed no clear difference.
  - `limit_secondary`: “Secondary efficacy outcomes were the comparison of the treatments based on EASI at days 7, 14, and 21 compared to baseline, as well as the change in TEWL, skin hydration and the amount of mometasone furoate used as rescu…”

**Limitation 3**

- Only 28 days, with no follow-up afterwards.
  - `twenty_eight_days`: “The objective of this randomized, double‐blind, placebo‐controlled, single centre, comparative trial was to determine whether a two‐part system consisting of a ceramide‐dominant physiological lipid‐based moisturizing cre…”
  - `limit_short`: “Furthermore, a change in EASI may have been observed if a longer study period was used.”
  - `limit_no_followup`: “A limitation of the study is that patients were not followed up after completion of the study to determine whether the skin barrier continued to improve.”

**Limitation 4**

- 83 of 100 finished.
  - `limit_dropouts`: “The demographics and baseline characteristics of the ITT population are described in Table 2 and consisted of 100 patients (53 female, 47 male; aged 18‐73 years; mean age 30.9 years) who received either ceramide cream an…”

**What most summaries miss**

- The abstract concludes that the set improves eczema in adults.
  - `abstract_claim`: “The ceramide‐dominant moisturizing cream and cleanser safely restores skin permeability and improves the signs and symptoms of eczema in adults.”
- Its main outcome, the eczema score, showed no clear difference from placebo.
  - `easi_ns`: “For the primary efficacy outcome, both ceramide cream and cleanser (day 0:14.70 ± 0.52 vs day 28:8.25 ± 0.78, P < .0001) and placebo cream and cleanser (day 0:14.28 ± 0.43 vs day 28:7.84 ± 0.75, P < .0001) significantly …”
- Patients rated itch relief better at day 14, not at day 28 (p = .7147).
  - `itch_d14`: “However, analysis of the patient satisfaction survey by cumulative logistic regression (Table 3) found that several questions were answered more positively in the active compared to the placebo group, including relief of…”
  - `itch_d28`: “Day 28 | 0.8638 | 0.3461 | 0.3938 to 1.8944 | .7147 |”
- The paper counts softness at day 28 as a win, at p = .0573.
  - `softness`: “However, analysis of the patient satisfaction survey by cumulative logistic regression (Table 3) found that several questions were answered more positively in the active compared to the placebo group, including relief of…”

**Full receipts 1**

- Water loss: better than placebo at every visit except day 21 (p = .0660).
  - `tewl_day21`: “This improvement was statistically significant at all‐time points (P < .05) except for day 21, where it approached significance (P = .0660).”

**Full receipts 2**

- Over the trial, water loss and hydration improved in patients on the ceramide set, and stayed level or worsened on placebo.
  - `trend`: “Corroborating evidence from the mixed models analysis found both TEWL and skin hydration improved in the active group, while it either stayed the same or worsened in the placebo group (P = .0342 and P < .0001, respective…”

**Full receipts 3**

- Quality of life improved in patients in both groups, with no clear difference (results p = .7804; abstract p = .5256).
  - `dlqi_ns`: “DLQI scores improved significantly over time in both groups (P < .0001; Figure 6), with no significant difference observed between groups (P = .7804).”
  - `dlqi_abstract_p`: “Dermatology life quality index scores improved significantly in both groups (P < .0001), with no difference between groups (P = .5256).”

**Full receipts 4**

- Patients rated dry-skin relief better at days 14 and 28.
  - `dry_skin`: “However, analysis of the patient satisfaction survey by cumulative logistic regression (Table 3) found that several questions were answered more positively in the active compared to the placebo group, including relief of…”
- Redness, pleasantness, ease of use and overall satisfaction showed no clear difference.
  - `sat_ns`: “No differences were found between groups for the reduction of redness and inflammation, treatment pleasantness, maintenance of healthy skin, ease of use and overall satisfaction (all P > .05).”

**Full receipts 5**

- Side effects: 11 people on the ceramide set, 7 on placebo; stinging in 5, all on the ceramide set.
  - `ae_groups`: “There were a small number of AEs (22) experienced by 18 patients (18%), with 11 (11%) of those patients in the active group and 7 (7%) in the placebo group. Of these, 8 patients (8%) were found to have 10 AEs that were r…”
  - `stinging`: “There were a small number of AEs (22) experienced by 18 patients (18%), with 11 (11%) of those patients in the active group and 7 (7%) in the placebo group. Of these, 8 patients (8%) were found to have 10 AEs that were r…”

**Full receipts 6**

- No one left because of side effects; none were serious.
  - `no_serious`: “There were a small number of AEs (22) experienced by 18 patients (18%), with 11 (11%) of those patients in the active group and 7 (7%) in the placebo group. Of these, 8 patients (8%) were found to have 10 AEs that were r…”

## Glossary

- **ceramides**: Fats that make up part of the mortar between the cells of the outer skin. (rests on mortar)
- **transepidermal water loss**: Water escaping from the body through the outer layer of the skin. (rests on leaky)
- **placebo**: A look-alike cream and cleanser made without the active skin ingredients. (rests on placebo_set)

## Takeaways

**Takeaway 1**

- After 28 days, the eczema score showed no clear difference between a ceramide cream and cleanser and a placebo set.
  - `easi_ns`: “For the primary efficacy outcome, both ceramide cream and cleanser (day 0:14.70 ± 0.52 vs day 28:8.25 ± 0.78, P < .0001) and placebo cream and cleanser (day 0:14.28 ± 0.43 vs day 28:7.84 ± 0.75, P < .0001) significantly …”

**Takeaway 2**

- Water loss through the skin fell more with the ceramide set.
  - `tewl_lower`: “Strikingly though, use of the ceramide cream and cleanser resulted in significant improvements in barrier function compared to the placebo as measured by a decrease in TEWL and increased skin hydration.”

**Takeaway 3**

- Run by the cream's maker, for 28 days only.
  - `limit_sponsor`: “Fabrizio Spada, Ian P. Harrison, Tanya M. Barnes, Kerryn A. Greive, Daisy Daniels and Joshua P. Townley are employed by Ego Pharmaceuticals, the sponsor of the study and manufacturer of the ceramide cream and cleanser.”
  - `twenty_eight_days`: “The objective of this randomized, double‐blind, placebo‐controlled, single centre, comparative trial was to determine whether a two‐part system consisting of a ceramide‐dominant physiological lipid‐based moisturizing cre…”

## Steps (what a reader can tick)

- **Ceramide cream on the whole body, morning and night** (`ceramide-cream-twice`, evidence: tewl_lower): As the trial did for 28 days. A tick records that you put it on, not any change in your skin. Refs: cream_twice
- **Wash once a day, then cream straight after** (`wash-then-cream`, evidence: none, weight 0): Part of the tested routine, not tested on its own, so it carries no weight. Refs: cleanser_daily, cream_after_wash

## Simulator

`estimate-explorer`: Ceramide set, at the start → `easi_active_0` = 14.70; Ceramide set, at the end → `easi_active_28` = 8.25; Placebo set, at the start → `easi_placebo_0` = 14.28; Placebo set, at the end → `easi_placebo_28` = 7.84

## Instagram deck

**Slide 1 (hook) heading**

- Does a ceramide cream beat a plain cream for eczema?

**Slide 1 body**

- Adults with moderate eczema used one or the other twice a day, for 28 days.
  - `inclusion_moderate`: “A total of 100 patients were recruited from the outpatient clinic at St George Dermatology and Skin Cancer Centre (Kogarah, New South Wales, Australia) between September 2015 and October 2019. Inclusion criteria were: (a…”
  - `cream_twice`: “Patients were instructed to massage the cleanser into wet skin across their whole body once daily, rinse with water and pat dry, for 28 days. Patients were also required to apply the cream liberally to their whole body, …”
  - `twenty_eight_days`: “The objective of this randomized, double‐blind, placebo‐controlled, single centre, comparative trial was to determine whether a two‐part system consisting of a ceramide‐dominant physiological lipid‐based moisturizing cre…”

  art: `{"motif": "pair", "a": {"value": {"text": "8.25", "ref": "easi_active_28"}, "label": "score out of 72, ceramide set [easi_active_28, easi_scale]"}, "b": {"value": {"text": "7.84", "ref": "easi_placebo_28"}, "label": "score out of 72, placebo set [easi_placebo_28, easi_scale]"}}`

**Slide 2 (finding) heading**

- On the eczema score, no clear difference after 28 days.
  - `easi_ns`: “For the primary efficacy outcome, both ceramide cream and cleanser (day 0:14.70 ± 0.52 vs day 28:8.25 ± 0.78, P < .0001) and placebo cream and cleanser (day 0:14.28 ± 0.43 vs day 28:7.84 ± 0.75, P < .0001) significantly …”

**Slide 2 body**

- But the ceramide set kept more water in the skin.
  - `hydration_up`: “Strikingly though, use of the ceramide cream and cleanser resulted in significant improvements in barrier function compared to the placebo as measured by a decrease in TEWL and increased skin hydration.”

  art: `{"motif": "verdicts", "rows": [{"label": "Eczema score [-]", "verdict": "no-clear-difference", "fact": "fact:easi_ns"}, {"label": "Water loss [-]", "verdict": "lower", "fact": "fact:tewl_lower"}, {"label": "Skin hydration [-]", "verdict": "higher", "fact": "fact:hydration_up"}, {"label": "Steroid gel used [-]", "verdict": "no-clear-difference", "fact": "fact:rescue_ns"}]}`

**Slide 3 (why) heading**

- Ceramides are part of the mortar between skin cells.
  - `mortar`: “Ceramides act as water modulators and an integral part of the skins permeability barrier by forming multi‐layered lamellar structures with cholesterol and free fatty acids between cells of the SC.”

**Slide 3 body**

- Eczema skin holds less, so water escapes (transepidermal water loss).
  - `ceramide_low`: “The compromised skin barrier is mainly attributable to significantly decreased levels of ceramides in the stratum corneum (SC) in lesional and non‐lesional skin.”
  - `leaky`: “The abnormal barrier function in eczema results in increased transepidermal water loss (TEWL) leading to xerosis, and predisposes the skin to inflammatory processes evoked by irritants and allergens.”

**Slide 4 (who) heading**

- Tested in 100 adults with moderate eczema.
  - `itt_100`: “The demographics and baseline characteristics of the ITT population are described in Table 2 and consisted of 100 patients (53 female, 47 male; aged 18‐73 years; mean age 30.9 years) who received either ceramide cream an…”

  art: `{"motif": "who", "tested": ["50 on each set [per_group_50]", "Aged 18 to 73 [age_mean]", "One Australian skin clinic [recruited]"], "notTested": ["Children [inclusion_adults]", "Mild or severe eczema [inclusion_moderate]", "Beyond 28 days [twenty_eight_days]"]}`

**Slide 5 (receipts) heading**

- How sure can we be?

  art: `{"motif": "checks", "strong": "Double-blind, placebo set, registered first. [double_blind, registered]", "weak": "Run by the cream's maker; 28 days only. [limit_sponsor, twenty_eight_days]", "missing": "Any follow-up after the trial. [limit_no_followup]"}`

**Slide 6 (cta) heading**

- Is your moisturizer doing the mortar's job?

**Slide 6 body**

- Compare the eczema scores for both sets, start to finish.
  - `easi_active_28`: “For the primary efficacy outcome, both ceramide cream and cleanser (day 0:14.70 ± 0.52 vs day 28:8.25 ± 0.78, P < .0001) and placebo cream and cleanser (day 0:14.28 ± 0.43 vs day 28:7.84 ± 0.75, P < .0001) significantly …”
  - `easi_placebo_28`: “For the primary efficacy outcome, both ceramide cream and cleanser (day 0:14.70 ± 0.52 vs day 28:8.25 ± 0.78, P < .0001) and placebo cream and cleanser (day 0:14.28 ± 0.43 vs day 28:7.84 ± 0.75, P < .0001) significantly …”

**Alternate opening “The mortar”**

- Can a cream patch the mortar between skin cells?
- Adults with eczema tried a ceramide cream and cleanser.
  - `inclusion_moderate`: “A total of 100 patients were recruited from the outpatient clinic at St George Dermatology and Skin Cancer Centre (Kogarah, New South Wales, Australia) between September 2015 and October 2019. Inclusion criteria were: (a…”
  - `cream_twice`: “Patients were instructed to massage the cleanser into wet skin across their whole body once daily, rinse with water and pat dry, for 28 days. Patients were also required to apply the cream liberally to their whole body, …”

  art: `{"motif": "number", "value": {"text": "28", "ref": "twenty_eight_days"}, "unit": "days [-]", "label": "twice a day, whole body [cream_twice]"}`

**Caption**

- A randomized, double-blind trial in 100 adults with moderate eczema.
  - `randomized_blocks`: “Patients meeting the inclusion criteria were randomly assigned to receive either the ceramide cream and ceramide cleanser or placebo cream and placebo cleanser according to a randomization schedule generated using SAS st…”
  - `double_blind`: “The objective of this randomized, double‐blind, placebo‐controlled, single centre, comparative trial was to determine whether a two‐part system consisting of a ceramide‐dominant physiological lipid‐based moisturizing cre…”
  - `itt_100`: “The demographics and baseline characteristics of the ITT population are described in Table 2 and consisted of 100 patients (53 female, 47 male; aged 18‐73 years; mean age 30.9 years) who received either ceramide cream an…”
- After 28 days, the eczema score showed no clear difference between a ceramide cream and cleanser and a placebo set.
  - `easi_ns`: “For the primary efficacy outcome, both ceramide cream and cleanser (day 0:14.70 ± 0.52 vs day 28:8.25 ± 0.78, P < .0001) and placebo cream and cleanser (day 0:14.28 ± 0.43 vs day 28:7.84 ± 0.75, P < .0001) significantly …”
- Water loss through the skin fell more with the ceramide set.
  - `tewl_lower`: “Strikingly though, use of the ceramide cream and cleanser resulted in significant improvements in barrier function compared to the placebo as measured by a decrease in TEWL and increased skin hydration.”
- Run by the cream's maker.
  - `limit_sponsor`: “Fabrizio Spada, Ian P. Harrison, Tanya M. Barnes, Kerryn A. Greive, Daisy Daniels and Joshua P. Townley are employed by Ego Pharmaceuticals, the sponsor of the study and manufacturer of the ceramide cream and cleanser.”
- Full read: link in bio.

Hashtags: #eczema #skincare #ceramides #dermatology #evidencebased
