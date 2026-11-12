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
3. "value" is a short phrase or the printed figures that appear inside that quote.
4. If the paper does not report something, write "not_reported" for its value and null for its quote. Never guess.
5. design is one of: meta_analysis_rct, rct, cohort, case_control, cross_sectional, animal, in_vitro. species is one of: human, mouse, rat, other_animal, cell_culture.
6. For each number worth citing, add a fact of kind "estimate" with measure (WMD, MD, aRD, RD, proportion, RR, HR, OR), point, ciLow, ciHigh (null if not printed) and unit. If the paper prints a relative measure (RR, HR, OR), also extract the absolute figures it prints for the same result.
7. If the paper itself rates certainty for an outcome (for example GRADE), add a fact of kind "grade" and point the estimate's gradeRef at it. Do not rate anything yourself.
8. Extract at least two facts of kind "limitation", in the authors' own words.
9. Fact ids are lower_snake_case and unique.`;

export function extractPrompt(input: { meta: unknown; source: string; exampleExtraction: string }): string {
  return `EXAMPLE OUTPUT (a different paper; copy the shape, not the content):
${input.exampleExtraction}

REPOSITORY METADATA FOR THE PAPER TO EXTRACT (use for identifiers and license):
${JSON.stringify(input.meta, null, 2)}

FULL TEXT OF THE PAPER TO EXTRACT:
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
