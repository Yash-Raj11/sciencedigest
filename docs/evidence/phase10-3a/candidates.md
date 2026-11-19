# Step 3A: the retraction check and three candidate papers (2026-11-19)

## 1. `npm run retractions`

Raw output: `retractions.txt`. The local copy of the Retraction Watch data was first cloned on
2026-11-13 (data of 2026-11-12); this run pulled it up to date (data commit `8107b3a`,
2026-11-18).

- **67,951 retraction records** checked against the 4 published papers and the 1 context study.
- **None retracted.** Exit 0.
- `.env.local` holds no service role key, so nothing was written to the hosted database.

## 2. The search

Europe PMC REST search (`/search`, `resultType=core`), one query per everyday topic, sorted by
citations. Every query had this filter:

```
(PUB_TYPE:"Randomized Controlled Trial" OR PUB_TYPE:"Meta-Analysis")
AND (LICENSE:"cc by" OR LICENSE:"cc0" OR LICENSE:"cc by-sa")
AND IN_EPMC:Y AND OPEN_ACCESS:Y AND PUB_YEAR:[2019 TO 2026]
```

Topics: naps, sitting breaks, water, breakfast, nuts, eggs, time-restricted eating, mindfulness,
social media, strength training, stretching, cold water, sauna, alcohol, fibre, sleep extension,
morning light, walking after meals, salt, vinegar. Topics already covered by a read (caffeine
and sleep, steps, interval training, turmeric) were left out.

- **Licence.** Every record was put through the pipeline's own `checkLicense`
  (`lib/pipeline/license.ts`), the same check `paper fetch` runs.
- **Results.** 424 records, all with an allowed licence (`search-results.csv`).
- **API errors.** Europe PMC answered 503 for seven topics and 500 for one on the first pass.
  All eight came back on a retry with 4 s between requests (`search-log.txt`).

Each finalist was then checked four more ways:

1. its DOI against the Retraction Watch data with the pipeline's `findRetracted`;
2. its Europe PMC publication types, for a retraction flag;
3. the licence statement inside its own full text (`<permissions>`, read in memory, nothing saved);
4. its design and size, from the paper's own abstract.

## 3. The three candidates

### A. Less salt, lower blood pressure, and how much less matters

| | |
|---|---|
| Title | Effect of dose and duration of reduction in dietary sodium on blood pressure levels: systematic review and meta-analysis of randomised trials |
| Journal, DOI | BMJ 2020, `10.1136/bmj.m315` (PMC7190039) |
| Design | Meta-analysis of randomised trials (133 trials) |
| n | 12,197 participants |
| Licence | CC BY 4.0 per the API and the article's licence link. **But** its copyright line also says "Re-use permitted under CC BY. No commercial re-use." See the note below |
| Retracted | No (Retraction Watch: not listed; Europe PMC: no flag) |

**Why it would make a good read:** it gives a dose. Each 50 mmol less sodium a day went with
1.10 mm Hg lower systolic blood pressure (0.66 to 1.54). Trials shorter than 15 days showed less
than half the effect of longer ones. That suits a "how much would you cut" simulator built on a
range.

**Licence note.** The licence text itself is CC BY 4.0 and explicitly allows commercial use. The
copyright line above it contradicts that. It passes `checkLicense`, because the pipeline reads
the licence field. Choose this one for the free tier only after deciding that line does not
matter, or pick B or C.

### B. Sleep longer, eat less

| | |
|---|---|
| Title | Effect of Sleep Extension on Objectively Assessed Energy Intake Among Adults With Overweight in Real-life Settings: A Randomized Clinical Trial |
| Journal, DOI | JAMA Internal Medicine 2022, `10.1001/jamainternmed.2021.8098` (PMC8822469) |
| Design | Randomized clinical trial, single centre, at home ("real-life settings") |
| n | 80 randomized and analysed. Adults 21 to 40 with overweight (BMI 25.0 to 29.9) who slept under 6.5 hours |
| Licence | CC-BY (API; the paper: "an open access article distributed under the terms of the CC-BY License", creativecommons.org/licenses/by/4.0) |
| Retracted | No (Retraction Watch: not listed; Europe PMC: no flag) |

**Why it would make a good read:** the opening number is counter-intuitive. People who slept
about 1.2 hours longer a night ate 270 kcal a day less (95% CI 147 to 393 less) than the control
group. It was measured, not self-reported (doubly labelled water and body composition scans), in
people living their normal lives.

### C. The same eating window, earlier or at midday

| | |
|---|---|
| Title | Randomized controlled trial for time-restricted eating in healthy volunteers without obesity |
| Journal, DOI | Nature Communications 2022, `10.1038/s41467-022-28662-5` (PMC8864028) |
| Design | Randomized controlled trial, three arms (early window, midday window, control), 5 weeks. Outcome assessors blinded; participants not |
| n | 90 randomized (30 per arm), 82 analysed |
| Licence | CC BY 4.0 (API; the paper: "licensed under a Creative Commons Attribution 4.0 International License") |
| Retracted | No (Retraction Watch: not listed; Europe PMC: no flag) |

**Why it would make a good read:** it tests timing, not just fasting. Body mass changed by
-1.6 ± 1.4 kg on the early window against +0.3 ± 1.2 kg in the control group. The midday window
showed no clear difference from control. Insulin resistance was the primary outcome.

## 4. Considered and set aside

- **Short daytime naps.** Meta-analysis, PMC8507757, 11 studies, 381 participants. The effect is
  only in standardised units (0.18), the studies are mostly laboratory ones, and the designs are
  mixed.
- **Eggs and cholesterol.** Meta-analysis of 17 RCTs, PMC7400894, LDL 8.14 mg/dL higher. A good
  topic, but the participant total was not found in the full text on a first search.
- **Walking after meals.** Meta-analysis, PMC10036272. Blood sugar again, beside the turmeric read.
- **Cold-water immersion.** Meta-analysis, PMC11778651, 3,177 participants. 3,018 of them come
  from one trial, and most results are before/after changes within groups.
- **14-day social media break.** Randomized, PMC10936093, 165 analysed. No difference between
  groups on the main outcomes.
