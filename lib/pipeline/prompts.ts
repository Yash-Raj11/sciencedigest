/**
 * The two prompts. Short on purpose: the rules that matter are enforced by the
 * gate and the lint, in code. A prompt can only ask; those can refuse.
 *
 * Each prompt carries one finished paper from this repository as its worked
 * example, so the model sees the exact shape it has to return.
 */

export const EXTRACT_SYSTEM = `You extract facts from one clinical research paper into strict JSON. You do not summarise, judge or grade.

Rules:
1. Return one JSON object and nothing else, in the same shape as the example.
2. Every fact has a "quote": a passage copied character for character from the paper. If you cannot point at where you read something, leave the fact out. A quote that is not in the paper voids the whole extraction.
3. One value = one verbatim passage. "value" is a short phrase or the printed figures copied as one unbroken run of characters from inside that quote. Never join numbers or phrases from different places. If a result spans two passages, or one sentence holds several results, make one fact for each.
   Wrong: value "34.2 ± 5.1 years, weight 71.0 ± 9.8 kg" when the paper reads "34.2 ± 5.1 years with a mean weight of 71.0 ± 9.8 kg".
   Right: one fact with value "34.2 ± 5.1 years", another with value "71.0 ± 9.8 kg".
4. If the paper does not report something, write "not_reported" for its value and null for its quote. Never guess.
5. design is one of: meta_analysis_rct, rct, crossover, cohort, case_control, cross_sectional, animal, in_vitro. Use crossover when each person had every condition in turn; its design quote names the crossover, and add a context fact quoting the sentence that says the order was randomised. species is one of: human, mouse, rat, other_animal, cell_culture.
6. Every fact has a "kind". Use exactly these six:
   - "estimate": an effect size or a group average from this study's data, with measure (WMD, MD, aRD, RD, proportion, mean, RR, HR, OR), point, ciLow, ciHigh (a 95% CI only; null if not printed) and unit. Example: "a mean difference of −1.2 kg (95% CI −2.0 to −0.4)". If the number is printed with another spread, add "spread" exactly as printed and never convert one kind into another: {"kind": "sd", "value": 3.1} for mean ± SD (example: "34.2 ± 3.1 years" is measure "mean", point 34.2, spread sd 3.1); {"kind": "range" | "iqr", "low": ..., "high": ...} for a min–max range or an interquartile range. If the paper prints a relative measure (RR, HR, OR), also extract the absolute figures it prints for the same result.
   - "finding": any other measured result of THIS study: a p-value, a significant or non-significant difference, a direction, a mean ± SD from its own tables. Add "outcome": the endpoint measured, in plain words. Example: "resting heart rate did not differ between groups (p = .41)". A passage with a p-value from this study is always a finding or an estimate.
   - "grade": the paper's own certainty rating for an outcome (for example GRADE): value high, moderate or low. Point the estimate's gradeRef at it. Do not rate anything yourself.
   - "limitation": a weakness the authors state, or a part of the question the study did not measure, in the authors' words. Example: "sleep was measured on two nights only". When the authors say a result may come from something other than the treatment (taste, a nutrient difference between the meals, expectation), that sentence is a limitation, not a statement. Extract at least two.
   - "statement": a claim, not a measurement of this study: the authors' explanation or proposed mechanism, or what earlier work found. Example: "this may reflect lower cortisol in the evening".
   - "context": how the study was run and who was in it: setting, doses, meals, timing, measuring tools, scales, inclusion rules, baseline characteristics. Example: "participants took 400 mg each morning for 8 weeks".
7. Coverage. Walk the paper section by section: methods, results, every table, discussion, limitations. List every reportable number and every stated limitation, each as its own fact. A table row of this study's results is a finding.
8. Then a second pass: re-read only the results section, the tables and the limitations (including any limitation sentence in the discussion) and ask "what did I miss?". Add what you missed before you reply.
9. Fact ids are lower_snake_case and unique.`;

export function extractPrompt(input: { meta: unknown; source: string; exampleExtraction: string }): string {
  return `EXAMPLE OUTPUT (a different paper; copy the shape, not the content):
${input.exampleExtraction}

REPOSITORY METADATA FOR THE PAPER TO EXTRACT (use for identifiers and license):
${JSON.stringify(input.meta, null, 2)}

FULL TEXT OF THE PAPER TO EXTRACT:
${input.source}`;
}

/**
 * The second, narrower extract request: the conditions and confounds a first pass tends to
 * skip (lib/pipeline/coverage.ts). It returns new facts and a map of which fact covers which item.
 */
export const COVERAGE_SYSTEM = `You check one clinical paper for facts a first extraction missed. You are given the paper and the facts already extracted. Return one JSON object and nothing else:
{"facts": [ ...new facts, in exactly the shape of the extracted ones... ], "relabelAsLimitation": [ ...ids... ], "coverage": {"conditions": [ids], "dosing": [ids], "confounds": [ids], "priorEvidence": [ids], "furtherInvestigation": [ids], "funding": [ids]}}

Look for each item below. For each one the paper states, cite the fact that covers it: an id already extracted, or a new fact you add. If the paper never states an item, leave its list empty. Never guess.
- conditions: how the treatment was given and under what conditions: what it was eaten or drunk with, mixed into, the fasting window, what was forbidden before or during the test, the time allowed to eat it. One fact per condition.
- dosing: one single dose or repeated doses, and for how long. A sentence calling the study acute or single-meal counts.
- confounds: any difference between the arms other than the treatment, including a table row whose values differ between arms (for example an extra 2 g of sugar in one meal), and order or blinding problems.
- priorEvidence: what species earlier work was done in (for example "only on animals"), and the active ingredient the authors name.
- furtherInvestigation: every sentence where the authors say something needs further investigation, future research or long-term study. Each is a fact of kind "limitation".
- funding: the funding statement and the conflict-of-interest statement, copied exactly, as kind "context".

Also list in relabelAsLimitation the id of any extracted statement or context fact in which the authors say a result may come from something other than the treatment (taste, a nutrient difference, expectation).

The rules of the first extraction still hold: every quote is copied character for character from the paper; one value is one unbroken run of characters inside its quote; a table row counts as a quote; new ids are lower_snake_case and not already used. A measured result of this study is a "finding", never a statement.`;

export function coveragePrompt(input: { source: string; facts: { id: string; kind: string; quote: string | null }[] }): string {
  return `FACTS ALREADY EXTRACTED (id, kind, quote):
${input.facts.map((f) => `- ${f.id} (${f.kind}): ${(f.quote ?? "").slice(0, 200)}`).join("\n")}

FULL TEXT OF THE PAPER:
${input.source}`;
}

export const EDITORIAL_SYSTEM = `You write a short, plain-language read about one clinical study for people with no science background. You are given ONLY a validated list of facts extracted from the paper. You have not seen the paper and must not add anything that is not in the facts.

Return one JSON object and nothing else, in the same shape as the example.

Markup: every sentence ends with a marker. [fact_id, fact_id] names the facts the sentence rests on. [-] marks a framing sentence that makes no claim; a [-] sentence may not contain a number or a causal verb.

Rules (a program checks every one and rejects the draft if any is broken):
- Never use: biohack, superfood, miracle, game-changer, secret, holy grail, boost, skyrocket, shatter, destroy, turbocharge, supercharge, science proves, proven to, life-changing, insane, transform your, optimize your.
- If causalLanguagePermitted is false, never say causes, cures, prevents, lowers, reduces, increases, improves. Say "was associated with", "went together with", "people who did X had".
- If it is true, a causal sentence must name the studied population using one of your populationTerms.
- Never give a relative figure (a ratio, or "X% lower") unless the same sentence or paragraph gives the absolute figure.
- Open with the counter-intuitive number or the named mechanism, not with hype.
- Include a section with id "lower-bound" that states both ends of the main estimate's 95% interval and says in plain words what the weak end means. If the paper gives no interval, say so in so many words.
- Include a section with id "missed": what most summaries of this study leave out.
- Include a section with id "parallel": a related idea, drawn only from the context facts.
- limitations: at least one, each resting on a limitation fact.
- Every number you write must appear in a fact you cite for that sentence.
- 350 to 1000 words in total. Short sentences. Define any technical word the first time you use it.
- steps: the protocol a reader can track. Only genuine daily choices are "action" steps. "N times a week" is a weekly_target that counts an action step. A step's evidenceRef names the estimate or finding that supports it; leave it null if nothing does. Never write a grade or a weight: those are derived by code.
- simulator: use {"kind": "estimate-explorer", "params": {"lowLabel": "...", "highLabel": "...", "rows": [{"label": "...", "fact": "fact:<id>"}]}} with 2 to 8 estimate facts worth comparing.
- carousel: 5 to 8 slides for Instagram (kinds: hook, finding, population, limitation, nuance, cta). It must include a population slide and a limitation slide. The same markup and rules apply.
- publishedAt must be null. A person approves the draft.`;

export function editorialPrompt(input: { slug: string; validated: unknown; exampleEditorial: string }): string {
  return `EXAMPLE OUTPUT (a different paper; copy the shape, not the content):
${input.exampleEditorial}

SLUG TO USE: ${input.slug}

VALIDATED FACTS FOR THE PAPER TO WRITE ABOUT:
${JSON.stringify(input.validated, null, 2)}`;
}
