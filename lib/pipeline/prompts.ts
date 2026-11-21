/**
 * The two prompts. Short on purpose: the rules that matter are enforced by the
 * gate and the lint, in code. A prompt can only ask; those can refuse.
 *
 * Each prompt carries one finished paper from this repository as its worked
 * example, so the model sees the exact shape it has to return.
 */

import type { FigureKind } from "../content/figure-kinds";

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
  const { stable, rest } = extractPromptParts(input);
  return stable + rest;
}

/**
 * The extract prompt in two pieces: `stable` (the worked example, the same for every paper, so a
 * provider can cache it) and `rest`. `stable + rest` is the whole prompt, character for character.
 */
export function extractPromptParts(input: { meta: unknown; source: string; exampleExtraction: string }): { stable: string; rest: string } {
  return {
    stable: `EXAMPLE OUTPUT (a different paper; copy the shape, not the content):
${input.exampleExtraction}

`,
    rest: `REPOSITORY METADATA FOR THE PAPER TO EXTRACT (use for identifiers and license):
${JSON.stringify(input.meta, null, 2)}

FULL TEXT OF THE PAPER TO EXTRACT:
${input.source}`,
  };
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

const EDITORIAL_RULES = `You write a short, plain-language read about one clinical study for people with no science background. You are given ONLY a validated list of facts extracted from the paper. You have not seen the paper and must not add anything that is not in the facts.

Return one JSON object and nothing else, in the same shape as the example.

Markup: every sentence ends with a marker. [fact_id, fact_id] names the facts the sentence rests on. [-] marks a framing sentence that makes no claim; a [-] sentence may not contain a number or a causal verb.

Rules (a program checks every one and rejects the draft if any is broken):
- Never use: biohack, superfood, miracle, game-changer, secret, holy grail, boost, skyrocket, shatter, destroy, turbocharge, supercharge, science proves, proven to, life-changing, insane, transform your, optimize your.
- If causalLanguagePermitted is false, never say causes, cures, prevents, lowers, reduces, increases, improves. Say "was associated with", "went together with", "people who did X had".
- If it is true, a causal sentence must name the studied population using one of your populationTerms.
- Never give a relative figure (a ratio, or "X% lower") unless the same sentence or paragraph gives the absolute figure.
- Open with the counter-intuitive number or the named mechanism, not with hype.
- card: {"headline": "...", "support": "..."}, the key finding at a glance. The headline cites primaryEstimate; for an estimate it says what the number is, in plain words; for a finding it states the finding. One supporting line.
- source: {"who": "...", "span": "..."}, the source line around the design: who took part and how many ("20 healthy adults [sample]"), and how long or how often ("four breakfasts each [crossover]"). Each cites the fact that states it.
- Shape: three separate layers and a glossary (H10). "layers": {"mechanism": {"paragraphs": [...], "figure": null}, "protocol": {"paragraphs": [...], "figure": null}, "audit": {"effect": "...", "weakEnd": "...", "limitations": [...], "missed": "...", "more": [...], "figure": null}}, and "glossary": [{"term": "...", "plain": "...", "refs": ["fact_id"]}] or [{"term": "...", "concept": "<slug>"}]. Never write "sections" or a top-level "limitations" or "figure": that old shape is refused.
- mechanism: why it happens, at most 350 words. Give the mental model first, then the name (H9). No caveats here: never limitation, confound, self-reported, p =, p <, 95%, CI, sample size, dropout or funded.
- protocol: what the data supports, at most 150 words: the tested parameters.
- audit: the receipts, at most 250 words. effect: the raw effect size, citing primaryEstimate. weakEnd: both ends of its 95% interval and what the weak end means; if there is none, say "no confidence interval" in so many words. limitations: at least one, each citing a limitation fact. missed: what most summaries leave out. more: the rest.
- Plain language: outside the audit layer, never write "significant", a p-value, a confidence interval or "effect size": say "a clear difference" or "no clear difference". Never write "no effect" or "did not change" for a result the study could not tell from zero. Write "lower", "higher", "rose" or "fell" only when a cited fact states that direction; otherwise "differed".
- Glossary (H9): any of adenosine, receptor, antagonist, upregulate, downregulate, attenuate, modulate, AMPK, mTOR, cortisol, circadian, REM, hypertrophy, VO2max, insulin sensitivity, all-cause mortality, hazard ratio, confidence interval, meta-analysis, cohort, randomized used in the hook, the population panel, the mechanism or the protocol needs a glossary entry saying in plain words what it physically does. A plain entry cites the facts it rests on in refs and uses none of those words and no number they do not hold.
- Voice (H11): short sentences, never over 30 words, aim for 22. Active voice. Never "it is worth noting", "it should be noted", "it is important to note", "interestingly", "notably", "the authors observed that", "the results suggest that it may".
- Other sources: cite a fact of another study only by its id, [<study>/<fact_id>], and a background concept only as [concept:<slug>] or a glossary "concept". Never write a number from another study without its id, and never cite an id you were not given. A concept carries no number.
- Every number you write must appear in a fact you cite for that sentence.
- 350 to 1000 words in total.
- steps: the protocol a reader can track. Only genuine daily choices are "action" steps. "N times a week" is a weekly_target that counts an action step. A step's evidenceRef names the estimate or finding that supports it; leave it null if nothing does. Never write a grade or a weight: those are derived by code.
- simulator: choose it from FIGURE KINDS AVAILABLE, below the facts. That list was worked out by a program from these facts; it is the only list.
  - Prefer a kind filled from this paper's own facts. A kind marked ANOTHER STUDY ONLY rests on an owner-approved fact from another study: use it only when this read is about what that fact measures, and say in words.halfLifeNote (or the kind's note) that the number comes from another study.
  - If a kind offers a simulator, use it: {"kind": "<kind>", "spec": {"kind": "<kind>", "facts": {...}, "simulator": {...}}, "params": {...}, "words": {"alt": "...", ...}}. The kind's guide says which params and words it reads.
  - Every value in "spec" is a fact id copied from that kind's list, in the slot it is listed under. Never a number, never text to show, never a fact id that is not listed there.
  - If no kind fits (none offers a simulator, or the only ones are ANOTHER STUDY ONLY and this read is about something else), use {"kind": "estimate-explorer", "params": {"lowLabel": "...", "highLabel": "...", "rows": [{"label": "...", "fact": "fact:<id>"}]}} with 2 to 8 estimate facts worth comparing. Never make up a personal estimate: a simulator exists only where a listed fact has a range.
  - glance.figure may be "simulator" only for a simulator drawn by kind.
  - words.alt describes in one sentence what the chart shows. Every word in "words" is markup and follows every rule above.
- carousel: 6 to 8 slides for Instagram that tell one story: the common belief, what the study found, why, who it applies to, how sure we can be, then try it. The order is hook, finding, why, who, receipts, cta; each appears once except finding, which may repeat in place. At most 25 words in a slide's heading and body together, at most 24 drawn in its art, at most 6 in any label, row or list entry. The same markup and rules apply to every word, the art's words too.
  - Write for someone who has never seen the paper. Say what a number means in daily life, not only the dose: "150 mg, about a cup and a half of coffee", never "150 mg three times a day" alone.
  - hook: the question people actually ask, set against the common advice, and what the study did. No caveat, no hedge. art: {"motif": "day", "start": "<markup>", "end": "<markup>", "marks": [{"at": {"n": <number>, "ref": "<fact id>", "unit": "min" | "h"}, "label": "<markup>"}, up to 4], "tail": {"length": {"n", "ref", "unit"}, "label": "<markup>"}} for a schedule across a waking day (each time is a number in its cited passage), or {"motif": "number", "value": {"text": "<the exact characters of the passage>", "ref": "<fact id>"}, "unit": "<markup, optional>", "label": "<markup>"}, or {"motif": "pair", "a": {"value", "unit", "label"}, "b": {...}}.
  - finding: the plain result as the heading, absolute numbers (H5). art: {"motif": "verdicts", "rows": [{"label": "<markup>", "verdict": "no-clear-difference" | "lower" | "higher", "fact": "fact:<id>"}, up to 4]}, or "number" or "pair" as above. A verdict must say what its fact says: "no clear difference" only where the interval includes no difference or the paper says no difference was clear; "lower" or "higher" only where the interval is wholly on that side or the paper uses that word. Never "same".
  - why: the mechanism in one picture, and the deck's mechanism layer (H9, H10): the plain picture first, the technical name after it in brackets, and no caveat. art (optional): {"motif": "parking-spot" | "two-piles" | "ledger" | "ramp" | "doorbell", "kind": "measured" | "proposed", "fact": "fact:<id>", "labels": [up to 3 markup labels, 28 characters each]}: measured cites an estimate or a finding, proposed cites the authors' sentence. Labels go in the motif's order (parking-spot: the bay, the turned-away car, the blocked arrow; two-piles: the fat pile, the other pile, above between the arrows; ledger: food in, energy out, the page; ramp: the drop, the level stretch, the floor; doorbell: what presses, the bell, the ring). Where the paper reports a curve that falls and then levels off, a plateau chart on the paper's own axis: {"motif": "plateau", "kind": "measured" | "proposed", "fact": "fact:<id>", "y": "<markup: what the curve measures>", "axis": "<markup: what the axis counts>", "from": {"n": <axis start>, "ref": "<fact id>"}, "to": {"n": <axis end>, "ref": "<fact id>"}, "levels": {"from": {"n": ..., "ref": ...}, "to": {"n": ..., "ref": ...}, "label": "<markup>"}}: every number is in its cited passage, the axis runs in whole steps, and the levelling stretch sits inside it; the curve's height is shape only and the slide says so. Where the paper measured nothing to draw, a sketch: {"motif": "sketch", "shape": "shrink", "concept": "<concept slug>", "a": "<markup>", "b": "<markup>", "caption": "<markup>"}, a shape only, citing only the concept, with no digit anywhere in it.
  - who: a heading on whether it applies to the reader; no body needed. art: {"motif": "who", "tested": ["<markup>", up to 4], "notTested": ["<markup>", up to 4]}; every entry cites a fact of this paper (H3).
  - receipts: heading only, no body. art: {"motif": "checks", "strong": "<markup>", "weak": "<markup>", "missing": "<markup>" | null}. weak cites a limitation fact (H6). The design, who took part and the headline result's 95% range bar are printed from the gate; the bar's numbers count toward the art's 24 words.
  - cta: points to the read's interactive part on the web app; no art (it redraws the hook's day when there is one).
  - altHooks: 1 to 3 other opening slides, so the owner can choose the opening: [{"name": "<a short name for the owner, never drawn>", "kind": "hook", "heading": ..., "body": ..., "art": ...}]. Each opens from a genuinely different angle (the headline number, the shape of the result, a common question the paper answers), not a rewording of the hook, and follows every hook rule above. A plateau chart may open a deck too: the same "plateau" art as the why slide.
  - On every slide (no glossary there, H9): a technical word comes after its plain picture, in brackets: "sleepiness locks (adenosine receptors)".
  - Common knowledge: a fact any adult knows that makes a number mean something (how much caffeine a cup of coffee holds) may be cited on the deck only, as [common:<slug>], and only if content/common/<slug>.json exists. Its numbers are the only numbers it lets a sentence print. Never cite it in the read, and never write a common fact yourself: propose one for the owner to review.
- publishedAt must be null. A person approves the draft.`;

/**
 * What each figure kind draws and reads, for the draft stage. One entry per kind in
 * FIGURE_KINDS (a test fails when a kind has no guide). Words only: the numbers come from
 * the facts the spec names.
 */
export const KIND_GUIDE: Record<FigureKind, string> = {
  decay: `decay: something the body clears over time, drawn as a falling curve from one half-life. The reader enters a time and an amount and sees the range left at bedtime.
  params: {}. words: alt; halfLifeNote (where the half-life comes from, and who it was measured in); finding (this paper's own result, shown beside the estimate).`,
  "association-curve": `association-curve: groups of an observational study, in order, the first the comparison group. The reader picks their own value and sees their group's printed result. Never causal, whatever the design.
  spec.facts.raw and spec.simulator.raw: each group's unadjusted share, in group order. spec.simulator.adjusted: each later group's adjusted difference from the first (one fewer than raw).
  params.groups: one per group, in order, [{"from": {"n": <low edge>, "ref": "<fact>"}, "to": {"n": <high edge>, "ref": "<fact>"}}], each number cited from the fact whose quote prints it; edges follow on with no gap.
  words: alt; ask (the question put to the reader); headline; who (who this was tested in); rawNote; stripTitle; stripUnder.`,
};

export const EDITORIAL_SYSTEM = `${EDITORIAL_RULES}

Figure kinds (what each one draws, the params it needs, the words it reads):
${Object.values(KIND_GUIDE).join("\n")}`;

/**
 * The draft request. `context` lists the other sources the read may cite, by id (contextMenu).
 * `kinds` is the menu from lib/pipeline/propose.ts (kindMenu(proposeKinds(...))),
 * worked out from the same validated facts: the model picks its figure kind and simulator inputs
 * from it, and the lint checks the spec it writes.
 */
export function editorialPrompt(input: { slug: string; validated: unknown; exampleEditorial: string; kinds: string; context: string }): string {
  const { stable, rest } = editorialPromptParts(input);
  return stable + rest;
}

/** The draft prompt in two pieces, as extractPromptParts: the worked example, then the rest. */
export function editorialPromptParts(input: { slug: string; validated: unknown; exampleEditorial: string; kinds: string; context: string }): { stable: string; rest: string } {
  return {
    stable: `EXAMPLE OUTPUT (a different paper; copy the shape, not the content):
${input.exampleEditorial}

`,
    rest: `SLUG TO USE: ${input.slug}

VALIDATED FACTS FOR THE PAPER TO WRITE ABOUT:
${JSON.stringify(input.validated, null, 2)}

OTHER SOURCES YOU MAY CITE (by these ids only; from lib/pipeline/propose.ts contextMenu):
${input.context}

FIGURE KINDS AVAILABLE (worked out from these facts; pick the simulator from this list only):
${input.kinds}`,
  };
}
