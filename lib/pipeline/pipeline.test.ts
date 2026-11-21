/**
 * The gate and the lint, tested on a real paper.
 *
 * Every negative test starts from content that passes, breaks exactly one
 * thing, and checks that the right rule objects. A rule with no failing test
 * is a rule nobody has seen work.
 */

import { FIGURE_KEYS } from "../content/figures";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { assemble, stableId } from "./assemble";
import { formatEstimate } from "./format";
import { gate, locate, type Validated } from "./gate";
import { deriveTier } from "./grade";
import { canonicalLicense, checkLicense } from "./license";
import { lint } from "./lint";
import { ART_FOR, DECK_LIMITS, SKETCH_SHAPES, SLIDE_KINDS, VERDICTS } from "./carousel";
import { EDITORIAL_SYSTEM } from "./prompts";
import { REAL_COMMON, REAL_CONCEPTS, REAL_LIBRARY, REAL_STUDIES } from "./fixtures/real-context";
import { parseMarkup } from "./markup";
import { findRetracted, parseRetractionWatch } from "./retractions";
import { numbersIn, sharedShingles, wordNumbersIn } from "./text";

const load = (slug: string) => {
  const dir = new URL(`../../content/papers/${slug}/`, import.meta.url);
  return {
    source: readFileSync(new URL("source.txt", dir), "utf8"),
    extraction: JSON.parse(readFileSync(new URL("extraction.json", dir), "utf8")),
    editorial: JSON.parse(readFileSync(new URL("editorial.json", dir), "utf8")),
  };
};
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

/**
 * The starter papers are still in the old flat shape, which the lint accepts only
 * for a slug on the temporary allowlist (scripts/legacy-shape.ts). Step 2E
 * rewrites them and removes this option; lib/pipeline/layers.test.ts covers the
 * three-layer shape.
 */
// The real papers each carry a figure now, so the lint needs the list of figures the app can draw.
// The real context studies and library ride along: caffeine's simulator draws on the half-life study.
const OPTIONS = { figures: FIGURE_KEYS, context: { studies: REAL_STUDIES, concepts: REAL_CONCEPTS, library: REAL_LIBRARY, common: REAL_COMMON } };

const steps = load("steps-days-per-week");
const hiit = load("hiit-body-composition");
const caffeine = load("daytime-caffeine-sleep");

function validated(paper: typeof steps): Validated {
  const result = gate(paper.extraction, paper.source);
  if (!result.ok) throw new Error(result.errors.join("\n"));
  return result.validated;
}

/** Runs the gate on a mutated copy of the steps extraction and returns its errors. */
function gateErrors(mutate: (extraction: any) => void, source = steps.source): string[] {
  const extraction = clone(steps.extraction);
  mutate(extraction);
  const result = gate(extraction, source);
  return result.ok ? [] : result.errors;
}

/** Runs the lint on a mutated copy of an editorial and returns "rule where" strings. */
function lintErrors(paper: typeof steps, mutate: (editorial: any) => void): string[] {
  const editorial = clone(paper.editorial);
  mutate(editorial);
  return lint(validated(paper), editorial, paper.source, OPTIONS).errors.map((e) => `${e.rule} ${e.where}: ${e.message}`);
}
const fact = (extraction: any, id: string) => extraction.facts.find((f: any) => f.id === id);

describe("the three starter papers", () => {
  it.each([["steps", steps], ["hiit", hiit], ["caffeine", caffeine]])("%s passes the gate and the lint", (_name, paper) => {
    const v = validated(paper);
    expect(lint(v, paper.editorial, paper.source, OPTIONS).errors).toEqual([]);
  });
});

describe("gate (stage 2)", () => {
  it("rejects a number that is not in the quoted passage", () => {
    expect(gateErrors((x) => { fact(x, "ard_1_2").estimate.point = -24.9; })).toEqual(
      [expect.stringContaining("fact ard_1_2: -24.9, -18.8, -10.9 do not all appear")]);
  });
  it("rejects a quote that is not in the source", () => {
    expect(gateErrors((x) => { fact(x, "plateau").quote = "the benefit kept rising with every extra day"; })).toEqual(
      [expect.stringContaining("fact plateau: quote not found in the source")]);
  });
  it("rejects a value with no quote: a value the model cannot point at is void", () => {
    expect(gateErrors((x) => { fact(x, "plateau").quote = null; })[0]).toContain("has a value but no quote");
  });
  it("accepts not_reported, and rejects not_reported that still carries a quote", () => {
    expect(gateErrors((x) => { fact(x, "thresholds").value = "not_reported"; fact(x, "thresholds").quote = null; })).toEqual([]);
    expect(gateErrors((x) => { fact(x, "thresholds").value = "not_reported"; })[0]).toContain("marked not_reported but carries a quote");
  });
  it("rejects a paraphrase passed off as a verbatim phrase", () => {
    expect(gateErrors((x) => { fact(x, "plateau").value = "levelled off after three days"; })[0]).toContain("does not appear inside its quote");
  });
  it("rejects licences outside the allowlist, even open-access ones", () => {
    expect(gateErrors((x) => { x.license = "CC BY-NC 4.0"; })[0]).toContain("NC (non-commercial) bars use behind a paid tier");
    expect(gateErrors((x) => { x.license = "CC BY-ND 4.0"; })[0]).toContain("ND (no derivatives) bars summaries");
  });
  it("rejects a design the quoted passage does not support", () => {
    expect(gateErrors((x) => { x.design.value = "rct"; })[0]).toContain('does not support "rct"');
  });
  it("requires a species (H4) and at least one limitation (H6)", () => {
    expect(gateErrors((x) => { x.species.value = "unknown"; })[0]).toContain("species is required: H4");
    expect(gateErrors((x) => { x.facts = x.facts.filter((f: any) => f.kind !== "limitation"); })[0]).toContain("H6");
  });
  it("rejects a sample size the passage does not state", () => {
    expect(gateErrors((x) => { x.sampleSize.value = "31010"; })[0]).toContain("31010 does not appear");
  });
  it("rejects a grade reference that is not a verified grade", () => {
    expect(gateErrors((x) => { fact(x, "ard_1_2").estimate.gradeRef = "plateau"; })[0]).toContain("is not a verified grade fact");
  });
  it("rejects output that does not match the schema", () => {
    expect(gateErrors((x) => { delete x.identifiers.doi; })[0]).toContain("schema: identifiers.doi");
  });
  it("finds a quote despite different dashes, quote marks and line breaks", () => {
    const source = "Age, mean (SD), y\n63.7 (19.3)\n51.5 (19.0)\nrisk was −14.9% (’adjusted’)";
    expect(locate(source, "Age, mean (SD), y 63.7 (19.3) 51.5 (19.0)")).toEqual([0, 41]);
    expect(locate(source, "risk was -14.9% ('adjusted')")).not.toBeNull();
    expect(locate(source, "risk was -15.9%")).toBeNull();
  });
});

/**
 * Regressions from the Gemini extract benchmark on turmeric (2026-11-14, BUILD-LOG): the model
 * filed every measured result as a "statement" and strung several printed figures into one value.
 * Each case starts from the hand-checked extraction, which passes, and repeats one real failure.
 */
describe("gate: the turmeric benchmark's failures are refused", () => {
  const turmeric = load("turmeric-pepper-breakfast");
  const errorsFor = (mutate: (extraction: any) => void) => {
    const extraction = clone(turmeric.extraction);
    mutate(extraction);
    const result = gate(extraction, turmeric.source);
    return result.ok ? [] : result.errors;
  };
  const asStatement = (x: any, id: string) => { const f = fact(x, id); f.kind = "statement"; delete f.outcome; };

  it("the hand-checked extraction passes", () => {
    expect(errorsFor(() => {})).toEqual([]);
  });
  it("refuses a measured result with a p-value filed as a statement or as context", () => {
    expect(errorsFor((x) => asStatement(x, "glucose_30"))).toEqual(
      [expect.stringContaining('fact glucose_30: the quote carries a p-value, so it reports a result of this study; use kind "finding"')]);
    expect(errorsFor((x) => { asStatement(x, "gut"); fact(x, "gut").kind = "context"; })).toEqual(
      [expect.stringContaining('fact gut: the quote carries a p-value')]);
  });
  it("accepts the methods sentence that sets the significance threshold as context", () => {
    const quote = "Significances were indicated when (p < .05).";
    expect(locate(turmeric.source, quote)).not.toBeNull();
    expect(errorsFor((x) => { x.facts.push({ id: "alpha", kind: "context", label: "Significance threshold", value: "p < .05", quote }); })).toEqual([]);
  });
  it("refuses an extraction whose results are all mislabelled: no finding left to report", () => {
    // The taste means are estimates since 2026-11-14 (mean ± SD): mislabel them too, as a model might.
    const errors = errorsFor((x) => {
      for (const f of x.facts) {
        if (f.kind === "finding") asStatement(x, f.id);
        else if (f.kind === "estimate") { asStatement(x, f.id); delete f.estimate; delete f.spread; }
      }
    });
    expect(errors).toContain("no verified estimate or finding: there is no result to report");
  });
  it("refuses a value stitched from several printed figures, even when every figure is in the quote", () => {
    expect(errorsFor((x) => {
      x.facts.push({ ...clone(fact(x, "ages")), id: "baseline_female", value: "21.4 ± 0.72 years, BMI 23.5 ± 3.9, fasting blood glucose 73.5 ± 9.05 mg/dL" });
    })).toEqual([expect.stringContaining("fact baseline_female: \"21.4 ± 0.72 years, BMI 23.5 ± 3.9")]);
  });
});

describe("derived tiers: the model never grades", () => {
  it("uses the paper's own GRADE rating when it reports one", () => {
    const v = validated(hiit);
    expect(v.facts.ffm_cycling.estimate?.tier).toBe("high");
    expect(v.facts.fm_all.estimate?.tier).toBe("moderate");
    expect(v.facts.bf_overground.estimate?.tier).toBe("low");
  });
  it("grades by design otherwise", () => {
    expect(validated(steps).facts.ard_1_2.estimate?.tier).toBe("low");
    expect(validated(caffeine).facts.sleep_same.finding?.tier).toBe("low");
    expect(deriveTier({ design: "rct", species: "human", sampleSize: 400, reportedGrade: null })).toBe("moderate");
    expect(deriveTier({ design: "rct", species: "human", sampleSize: 20, reportedGrade: null })).toBe("low");
    expect(deriveTier({ design: "cohort", species: "human", sampleSize: 90000, reportedGrade: null })).toBe("low");
  });
  it("never gives weight to non-human evidence, whatever else is claimed (H4)", () => {
    expect(deriveTier({ design: "rct", species: "mouse", sampleSize: 400, reportedGrade: "high" })).toBe("none");
    expect(deriveTier({ design: "animal", species: "rat", sampleSize: null, reportedGrade: null })).toBe("none");
  });
  it("licenses causal verbs for randomized human evidence only (H3)", () => {
    expect(validated(steps).causalLanguagePermitted).toBe(false);
    expect(validated(hiit).causalLanguagePermitted).toBe(true);
  });
  it("ignores a grade smuggled into the editorial: the step's grade comes from its evidence", () => {
    const editorial = clone(hiit.editorial);
    const fatStep = editorial.steps.find((s: any) => s.key === "fat-running");
    fatStep.grade = "high";
    fatStep.evidence_grade = "high";
    const paper = assemble(validated(hiit), editorial, OPTIONS.context);
    expect(paper.steps.find((s) => s.key === "fat-running")?.grade).toBe("low");
    expect(paper.steps.find((s) => s.key === "lean-cycling")?.grade).toBe("high");
  });
});

describe("lint (stage 4)", () => {
  it("H1: banned vocabulary", () => {
    const errors = lintErrors(steps, (e) => { e.hook = "This secret will boost your lifespan. [-]"; });
    expect(errors.some((e) => e.startsWith("H1 hook") && e.includes('"secret"'))).toBe(true);
    expect(errors.some((e) => e.startsWith("H1 hook") && e.includes('"boost"'))).toBe(true);
  });
  it("H3: a causal verb in an observational study", () => {
    expect(lintErrors(steps, (e) => { e.teaser = "Walking on two days a week lowers the risk of death. [ard_1_2]"; }))
      .toEqual([expect.stringContaining('H3 teaser: causal verb "lowers" in a cohort study')]);
  });
  it("H3: a causal verb in a trial is allowed only alongside the studied population", () => {
    expect(lintErrors(hiit, (e) => { e.hook = "Interval training reduced fat mass. [fm_all]"; }))
      .toEqual([expect.stringContaining('H3 hook: causal verb "reduced" without the studied population')]);
    expect(lintErrors(hiit, (e) => { e.hook = "Interval training reduced fat mass in these adults. [fm_all]"; })).toEqual([]);
  });
  it("H5: an absolute difference written as a percentage", () => {
    expect(lintErrors(steps, (e) => { e.teaser = "Their risk of death was 14.9% lower. [ard_1_2]"; }))
      .toEqual([expect.stringContaining('H5 teaser: an absolute risk difference must be written in "points"')]);
  });
  it("H5: relative wording with no absolute figure cited", () => {
    expect(lintErrors(steps, (e) => { e.hook = "The risk halved in the active group. [plateau]"; }))
      .toEqual([expect.stringContaining("H5 hook: relative wording with no absolute figure")]);
  });
  it("H5: statistical significance dressed up as size", () => {
    expect(lintErrors(steps, (e) => { e.hook = "The difference was highly significant and massive. [ard_1_2]"; }))
      .toEqual([
        expect.stringContaining("H5 hook: statistical significance described as magnitude"),
        // And, since 2026-11-14, "significant" outside the Receipts at all.
        expect.stringContaining('plain hook: "significant" outside the Receipts'),
      ]);
  });
  it("H5: the interval of the headline estimate must be spelled out", () => {
    expect(lintErrors(steps, (e) => { e.layers.audit.weakEnd = "The range around this gap is wide. [ard_1_2]"; }))
      .toEqual([expect.stringContaining("H5 layers.audit.weakEnd: must state both ends")]);
  });
  it("H5: a result with no interval must say so in words", () => {
    expect(lintErrors(caffeine, (e) => {
      e.layers.audit.weakEnd = "Sleep was the same on both kinds of night. [sleep_same]";
    })).toEqual([expect.stringContaining('H5 layers.audit.weakEnd: "sleep_same" has no interval')]);
  });
  it("H6: a limitation that cites no limitation from the paper", () => {
    expect(lintErrors(steps, (e) => { e.layers.audit.limitations = ["More research is needed. [-]"]; }))
      .toEqual([expect.stringContaining("H6 layers.audit.limitations[0]")]);
  });
  it("orphans: a number with no citation, a number not in the cited passage, an unknown fact", () => {
    expect(lintErrors(steps, (e) => { e.hook = "Most people walk 5,000 steps a day. [-]"; }))
      .toEqual([expect.stringContaining("orphan hook: a sentence with a number must cite a fact")]);
    expect(lintErrors(steps, (e) => { e.hook = "The gap was 24.9 points. [ard_1_2]"; }))
      .toEqual([expect.stringContaining("orphan hook: 24.9 not found in the cited passage(s) [ard_1_2]")]);
    expect(lintErrors(steps, (e) => { e.hook = "Walking is popular. [made_up_fact]"; }))
      .toEqual([expect.stringContaining('orphan hook: refers to "made_up_fact"')]);
  });
  it("markup: text with no citation marker at all", () => {
    expect(lintErrors(steps, (e) => { e.hook = "Walking is good for you."; })).toEqual([expect.stringContaining("markup hook")]);
  });
  it("H7: step numbers and step evidence must trace to the paper", () => {
    expect(lintErrors(steps, (e) => { e.steps[1].label = "12,000 steps on at least 1 day this week"; }))
      .toEqual([expect.stringContaining("H7 steps.one-day: 12000 not found")]);
    expect(lintErrors(steps, (e) => { e.steps[1].evidenceRef = "plateau"; }))
      .toEqual([expect.stringContaining('H7 steps.one-day: evidenceRef "plateau" is not a verified estimate or finding')]);
  });
  it("H7: a bare or untraceable number in simulator data", () => {
    expect(lintErrors(steps, (e) => { e.simulator.params.bonusPoints = 50; }))
      .toEqual([expect.stringContaining("H7 simulator.params.bonusPoints: a bare number")]);
    expect(lintErrors(steps, (e) => { e.simulator.params.threshold = { n: 10000, ref: "ages" }; }))
      .toEqual([expect.stringContaining('H7 simulator.params.threshold: 10000 does not appear in the passage for "ages"')]);
  });
  it("steps: a weekly target must count an action that exists", () => {
    expect(lintErrors(steps, (e) => { e.steps[1].countsKey = "no-such-step"; }))
      .toEqual([expect.stringContaining("steps steps.one-day: a weekly target needs")]);
  });
  // The deck (second shape, owner 2026-11-19; lib/pipeline/carousel.ts). Steps' deck: 0 hook,
  // 1 finding, 2 why, 3 who, 4 receipts, 5 cta. Each case breaks one rule and must be refused.
  it("carousel: all six kinds, in order, the single ones once, at most 8 slides", () => {
    for (const kind of ["hook", "finding", "why", "who", "receipts", "cta"]) {
      expect(lintErrors(steps, (e) => { e.carousel.slides = e.carousel.slides.filter((s: any) => s.kind !== kind); }), kind)
        .toContainEqual(expect.stringContaining(`carousel carousel.slides: no ${kind} slide`));
    }
    // The finding comes straight after the hook (owner, 2026-11-19).
    expect(lintErrors(steps, (e) => { const s = e.carousel.slides; [s[1], s[2]] = [s[2], s[1]]; }))
      .toContainEqual(expect.stringContaining("carousel carousel.slides[2]: a finding slide after a why slide"));
    expect(lintErrors(steps, (e) => { e.carousel.slides.splice(1, 0, structuredClone(e.carousel.slides[0])); }))
      .toContainEqual(expect.stringContaining("2 hook slides; a deck has one"));
    expect(lintErrors(steps, (e) => { e.carousel.slides.splice(1, 0, ...Array.from({ length: 3 }, () => structuredClone(e.carousel.slides[1]))); }))
      .toEqual([expect.stringContaining("at most 8 slides; this has 9")]);
    // A finding may repeat in place, within 8 slides.
    expect(lintErrors(steps, (e) => { e.carousel.slides.splice(1, 0, structuredClone(e.carousel.slides[1])); })).toEqual([]);
  });
  it("carousel: a caveat on the hook slide is refused (H2: open with the question)", () => {
    expect(lintErrors(steps, (e) => { e.carousel.slides[0].heading = "A small study: 8,000 steps a day? [threshold]"; }))
      .toEqual([expect.stringContaining('H2 carousel.slides[0]: a caveat ("small study") on the hook slide')]);
    expect(lintErrors(steps, (e) => { e.carousel.slides[0].art.label = "but this is observational [cohort]"; }))
      .toEqual([expect.stringContaining('H2 carousel.slides[0]: a caveat ("observational") on the hook slide')]);
    // The same words are fine on the receipts slide, where caveats belong.
    expect(lintErrors(steps, (e) => { e.carousel.slides[4].heading = "Observational: how sure? [cohort]"; })).toEqual([]);
  });
  it("carousel: a technical word on a slide comes after its plain picture, in brackets (H9)", () => {
    expect(lintErrors(steps, (e) => { e.carousel.slides[2].heading = "Your cohort walked more. [-]"; }))
      .toContainEqual(expect.stringContaining('H9 carousel.slides[2]: "cohort" on a slide with no plain words before it'));
    expect(lintErrors(steps, (e) => { e.carousel.slides[2].heading = "(Cohort) people walked more. [-]"; }))
      .toContainEqual(expect.stringContaining('H9 carousel.slides[2]: "cohort"'));
    expect(lintErrors(steps, (e) => { e.carousel.slides[2].heading = "A group followed over years (a cohort). [-]"; })
      .filter((x) => x.startsWith("H9"))).toEqual([]);
  });
  it("carousel: picture labels are markup, at most 3, short", () => {
    const ramp = (labels: string[]) => ({ motif: "ramp", kind: "measured", fact: "fact:ard_1_2", labels });
    expect(lintErrors(steps, (e) => { e.carousel.slides[2].art = ramp(["Then flat [-]"]); })).toEqual([]);
    expect(lintErrors(steps, (e) => { e.carousel.slides[2].art = ramp(["a [-]", "b [-]", "c [-]", "d [-]"]); }).join("\n")).toMatch(/schema|labels/);
    expect(lintErrors(steps, (e) => { e.carousel.slides[2].art = ramp(["Extraordinarily steep at the beginning [-]"]); }))
      .toContainEqual(expect.stringContaining("a label on the picture holds at most 28"));
    expect(lintErrors(steps, (e) => { e.carousel.slides[2].art = ramp(["The cohort [-]"]); }))
      .toContainEqual(expect.stringContaining('H9 carousel.slides[2]: "cohort"'));
  });
  it("carousel: a caveat on the why slide is refused (H10: the why slide is the deck's mechanism)", () => {
    expect(lintErrors(steps, (e) => { e.carousel.slides[2].body = "A limitation: it levelled off at 3 to 4 days a week. [plateau]"; }))
      .toContainEqual(expect.stringContaining('H10 carousel.slides[2]: a caveat ("limitation") on the why slide'));
  });
  it("carousel: at most 25 words in the heading and body, 24 in the art, 6 in a label", () => {
    expect(lintErrors(steps, (e) => { e.carousel.slides[0].body = "Most step goals are daily, every single day of the week. [-] This study counted how many days a week 3,101 adults reached 8,000. [threshold, sample]"; }))
      .toEqual([expect.stringContaining("carousel carousel.slides[0]: 30 words in the heading and body; the limit is 25")]);
    expect(lintErrors(steps, (e) => { e.carousel.slides[3].art.tested[0] = "3,101 US adults from all over the country [sample]"; }))
      .toContainEqual(expect.stringContaining("carousel carousel.slides[3].art.tested[0]: 8 words; a label, row or list entry holds at most 6"));
    // The receipts' strong, weak and missing are sentences, not labels; the art total still binds them,
    // and the range bar's numbers count toward it.
    expect(lintErrors(steps, (e) => { e.carousel.slides[4].art.strong = "3,101 adults, ten years of national death records, every one of them followed. [sample, followup]"; }))
      .toEqual([expect.stringContaining("carousel carousel.slides[4].art: 31 words drawn in the art; the limit is 24")]);
  });
  it("carousel: the receipts slide's weak point cites a limitation (H6), and it has no body", () => {
    expect(lintErrors(steps, (e) => { e.carousel.slides[4].art.weak = "The study ran for 10 years. [followup]"; }))
      .toEqual([expect.stringContaining("H6 carousel.slides[4]: the receipts slide's weak point states a limitation")]);
    expect(lintErrors(steps, (e) => { e.carousel.slides[4].body = "One week of steps. [one_week]"; }))
      .toEqual([expect.stringContaining("carousel carousel.slides[4].body: the receipts slide says it in its art")]);
  });
  it("carousel: who was and was not tested cites the paper (H3)", () => {
    expect(lintErrors(steps, (e) => { e.carousel.slides[3].art.notTested[0] = "Children [-]"; }))
      .toEqual([expect.stringContaining('H3 carousel.slides[3].art.notTested[0]: who was or was not tested must cite the paper')]);
  });
  it("carousel: art values are the passage's own characters; art words are markup", () => {
    expect(lintErrors(steps, (e) => { e.carousel.slides[1].art.a.value = { text: "15.9", ref: "ard_1_2" }; }))
      .toEqual([expect.stringContaining('H7 carousel.slides[1].art.a.value: "15.9" does not appear in the passage for "ard_1_2"')]);
    expect(lintErrors(steps, (e) => { e.carousel.slides[1].art.a.value = { text: "14.9", ref: "no_such_fact" }; }))
      .toContainEqual(expect.stringContaining('ref "no_such_fact" is not a gated fact'));
    expect(lintErrors(steps, (e) => { e.carousel.slides[1].art.a.label = "1 or 2 days, 9 in 10 [threshold]"; }).join("\n"))
      .toMatch(/carousel\.slides\[1\]\.art\.a\.label/);
  });
  it("carousel: each kind draws its own art, and a picture is drawn as measured only on a result", () => {
    expect(lintErrors(steps, (e) => { e.carousel.slides[2].art.fact = "fact:plateau"; }))
      .toEqual([expect.stringContaining("figure carousel.slides[2].art: drawn as measured, but \"plateau\" is a statement")]);
    expect(lintErrors(steps, (e) => { e.carousel.slides[3].art = { motif: "ramp", kind: "measured", fact: "fact:ard_1_2" }; }))
      .toContainEqual(expect.stringContaining('a who slide draws who, not "ramp"'));
    expect(lintErrors(steps, (e) => { e.carousel.slides[5].art = structuredClone(e.carousel.slides[0].art); }))
      .toContainEqual(expect.stringContaining("a cta slide draws its own art"));
    expect(lintErrors(steps, (e) => { e.carousel.slides[1].art = null; }))
      .toEqual([expect.stringContaining("a finding slide needs its art")]);
  });
  it("carousel: a plateau's axis and levelling stretch are the paper's numbers, the stretch inside the axis (H7)", () => {
    expect(lintErrors(steps, (e) => { e.carousel.slides[2].art.to.n = 6; }))
      .toEqual([expect.stringContaining('H7 carousel.slides[2].art.to: 6 is not in the passage for "threshold"')]);
    expect(lintErrors(steps, (e) => { e.carousel.slides[2].art.levels.from = { n: 0, ref: "threshold" }; }))
      .toEqual([expect.stringContaining("carousel carousel.slides[2].art: the stretch where it levels off (0 to 4) must sit inside the axis (0 to 7)")]);
    expect(lintErrors(steps, (e) => { e.carousel.slides[2].art.levels.label = "Levels off at 5 [plateau]"; }).join("\n"))
      .toMatch(/carousel\.slides\[2\]\.art\.levels\.label/);
  });
  it("carousel: an alternate opening is held to every rule the hook is held to", () => {
    expect(lintErrors(steps, () => {})).toEqual([]);
    // H2: no caveat or hedge on an opening, whichever one the owner picks.
    expect(lintErrors(steps, (e) => { e.carousel.altHooks[0].body = "An observational study of 3,101 adults. [sample, cohort]"; }))
      .toContainEqual(expect.stringContaining('H2 carousel.altHooks[0]: a caveat ("observational") on the hook slide'));
    // H7: its big number is the passage's own characters.
    expect(lintErrors(steps, (e) => { e.carousel.altHooks[0].art.value = { text: "15.9", ref: "ard_1_2" }; }))
      .toEqual([expect.stringContaining('H7 carousel.altHooks[0].art.value: "15.9" does not appear in the passage for "ard_1_2"')]);
    // H7: the plateau opening's axis numbers come from their passages.
    expect(lintErrors(steps, (e) => { e.carousel.altHooks[1].art.to.n = 6; }))
      .toEqual([expect.stringContaining('H7 carousel.altHooks[1].art.to: 6 is not in the passage for "threshold"')]);
    // Word limits, as on any slide.
    expect(lintErrors(steps, (e) => { e.carousel.altHooks[2].body += " Every goal in that whole range, from the lowest to the highest one they tried. [thresholds]"; }).join("\n"))
      .toMatch(/carousel carousel\.altHooks\[2\]: \d+ words in the heading and body/);
  });
  it("carousel: an alternate opening is a hook with a hook's art, at most three, each named once", () => {
    expect(lintErrors(steps, (e) => { e.carousel.altHooks[0].kind = "finding"; }))
      .toContainEqual(expect.stringContaining("carousel carousel.altHooks[0]: an alternate opening slide is a hook, not a finding slide"));
    expect(lintErrors(steps, (e) => { e.carousel.altHooks[0].art = structuredClone(e.carousel.slides[3].art); }))
      .toContainEqual(expect.stringContaining('carousel carousel.altHooks[0].art: a hook slide draws day or number or pair or plateau, not "who"'));
    expect(lintErrors(steps, (e) => { e.carousel.altHooks[2].name = "the number"; }))
      .toContainEqual(expect.stringContaining('carousel carousel.altHooks[2].name: "the number" names another alternate already'));
    expect(lintErrors(steps, (e) => { e.carousel.altHooks.push(structuredClone({ ...e.carousel.altHooks[0], name: "A fourth" })); }))
      .toContainEqual(expect.stringContaining("carousel carousel.altHooks: at most 3 alternate hooks; this has 4"));
  });
  it("carousel: a character the slide fonts may not carry", () => {
    expect(lintErrors(steps, (e) => { e.carousel.slides[2].heading = "Risk ≤ before. [-]"; }))
      .toEqual([expect.stringContaining("contains a character the slide fonts may not carry")]);
    expect(lintErrors(steps, (e) => { e.carousel.slides[1].art.b.label = "3 to 7 days ✓ [threshold]"; }))
      .toEqual([expect.stringContaining("contains a character the slide fonts may not carry")]);
  });
  // Caffeine's deck: 0 hook (the day), 1 finding (verdict rows), 2 why (a sketch), 3 who, 4 receipts, 5 cta.
  it("carousel: a verdict row says what its fact says (H5)", () => {
    // sleep_same says no difference was clear: "lower" overstates it.
    expect(lintErrors(caffeine, (e) => { e.carousel.slides[1].art.rows[0].verdict = "lower"; }))
      .toEqual([expect.stringContaining('H5 carousel.slides[1].art.rows[0]: "lower": the cited passage does not say "lower"')]);
    // A verdict rests on a measured result, not on the design.
    expect(lintErrors(caffeine, (e) => { e.carousel.slides[1].art.rows[0].fact = "fact:blind"; }))
      .toContainEqual(expect.stringContaining("a verdict rests on a measured result"));
  });
  it("carousel: every time on the day is a number in its cited passage (H7)", () => {
    expect(lintErrors(caffeine, (e) => { e.carousel.slides[0].art.marks[2].at.n = 600; }))
      .toEqual([expect.stringContaining('H7 carousel.slides[0].art.marks[2].at: 600 is not in the passage for "schedule"')]);
    expect(lintErrors(caffeine, (e) => { e.carousel.slides[0].art.tail.length.n = 6; }))
      .toContainEqual(expect.stringContaining('6 is not in the passage for "recording"'));
  });
  it("carousel: a sketch holds no number and rests on a concept file", () => {
    expect(lintErrors(caffeine, (e) => { e.carousel.slides[2].art.b = "After 7 days [concept:caffeine-tolerance]"; }))
      .toContainEqual(expect.stringContaining('sketch carousel.slides[2].art.b: a sketch holds no number'));
    expect(lintErrors(caffeine, (e) => { e.carousel.slides[2].art.concept = "no-such-concept"; }))
      .toContainEqual(expect.stringContaining('there is no content/concepts/no-such-concept.json'));
  });
  it("carousel: common knowledge is cited on the deck only, and supplies only its own numbers", () => {
    expect(lintErrors(caffeine, (e) => { e.layers.audit.more.push("A cup of coffee holds roughly 100 mg of caffeine. [common:coffee-cup-caffeine]"); }))
      .toContainEqual(expect.stringContaining("common knowledge may be cited on the deck only, not in the read"));
    expect(lintErrors(caffeine, (e) => { e.carousel.slides[1].body = "Each dose was 150 mg, about 5 cups of coffee. [dose, common:coffee-cup-caffeine]"; }).join("\n"))
      .toMatch(/carousel\.slides\[1\]\.body.*\b5\b/);
    expect(lintErrors(caffeine, (e) => { e.carousel.slides[1].body = "Each dose was 150 mg, about a cup and a half. [dose, common:no-such-fact]"; }))
      .toContainEqual(expect.stringContaining("there is no content/common/no-such-fact.json"));
  });
  it("carousel: the drafting prompt names every slide kind, motif, verdict and sketch shape the lint accepts", () => {
    const motifs = new Set(Object.values(ART_FOR).flatMap((a) => a.motifs));
    for (const word of [...SLIDE_KINDS, ...motifs, ...Object.keys(VERDICTS), ...SKETCH_SHAPES]) {
      expect(EDITORIAL_SYSTEM, word).toContain(`"${word}"`.replace(/^"(hook|finding|why|who|receipts|cta)"$/, "$1"));
    }
    expect(EDITORIAL_SYSTEM).toContain(`At most ${DECK_LIMITS.wordsPerSlide} words in a slide's heading and body`);
    expect(EDITORIAL_SYSTEM).toContain(`at most ${DECK_LIMITS.artWords} drawn`);
  });
  it("carousel: an unreviewed concept or common fact on the deck holds up the deck, not the read", () => {
    const report = lint(validated(caffeine), caffeine.editorial, caffeine.source, OPTIONS);
    expect(report.errors).toEqual([]);
    expect(report.deckPending).toEqual(expect.arrayContaining(["common:coffee-cup-caffeine", "concept:caffeine-tolerance"]));
    // Reviewed, they leave nothing pending.
    const reviewedContext = {
      ...OPTIONS.context,
      concepts: Object.fromEntries(Object.entries(REAL_CONCEPTS).map(([k, v]) => [k, v.ok ? { ...v, reviewed: true } : v])),
      common: Object.fromEntries(Object.entries(REAL_COMMON).map(([k, v]) => [k, v.ok ? { ...v, reviewed: true } : v])),
    };
    expect(lint(validated(caffeine), caffeine.editorial, caffeine.source, { ...OPTIONS, context: reviewedContext }).deckPending ?? []).toEqual([]);
  });
  it("copy: prose lifted from the paper", () => {
    const lifted = "Although our findings might suffer from residual confounding that should be addressed in future research, these findings suggest that people may receive substantial health benefits by walking just a couple of days a week";
    const inSource = steps.source.includes("Our study has 2 major strengths");
    expect(inSource).toBe(true);
    const errors = lintErrors(steps, (e) => {
      e.layers.audit.more.push("Our study has two major strengths. First, we used objective measurements of daily steps throughout a week based on accelerometer data, which allowed us to avoid potential bias from exposure misclassification due to faulty self-report. [cohort]");
    });
    expect(errors.some((e) => e.startsWith("copy read"))).toBe(true);
    expect(lifted.length).toBeGreaterThan(0);
  });
});

describe("assemble", () => {
  const paper = assemble(validated(hiit), hiit.editorial, OPTIONS.context);
  it("derives stable ids: same slug and key, same id, every time", () => {
    expect(stableId("paper:hiit-body-composition")).toBe(paper.meta.id);
    expect(paper.meta.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(new Set(paper.steps.map((s) => s.id)).size).toBe(paper.steps.length);
  });
  it("writes the source line from the estimate, not from the editorial", () => {
    expect(paper.steps.find((s) => s.key === "lean-cycling")?.sourceEstimate).toBe("Fat-free mass +0.63 kg (95% CI 0.17 to 1.09)");
    expect(paper.steps.find((s) => s.key === "fat-running")?.sourceEstimate).toBe("Body fat percentage −2.80 points (95% CI −3.89 to −1.71)");
    expect(paper.steps.find((s) => s.key === "log-session")?.sourceEstimate).toBeNull();
  });
  it("links a weekly target to the step it counts", () => {
    const log = paper.steps.find((s) => s.key === "log-session")!;
    expect(paper.steps.find((s) => s.key === "lean-three-sessions")?.countsStepId).toBe(log.id);
  });
  it("resolves simulator references into the verified estimates", () => {
    const outcomes = paper.content.simulator.params.outcomes as { overall: { estimate: { point: number; tier: string } } }[];
    expect(outcomes[0].overall.estimate).toMatchObject({ point: 0.51, tier: "high" });
  });
  it("ships only the facts a reader can reach", () => {
    expect(Object.keys(paper.content.facts)).toContain("ffm_loo");
    expect(Object.keys(paper.content.facts)).not.toContain("fm_rest_gt90");
  });
});

describe("helpers", () => {
  it("reads numbers the way a person would", () => {
    expect(numbersIn("took 8,000 steps on 3-7 days; aRD −14.9% (95% CI, −18.8% to −10.9%)")).toEqual([8000, 3, 7, -14.9, 95, -18.8, -10.9]);
    expect(numbersIn("between 6000 and 10 000 steps")).toEqual([6000, 10000]);
    expect(wordNumbersIn("Twenty male volunteers and thirty-six trials")).toEqual([20, 36]);
  });
  it("parses editorial markup and refuses unmarked text", () => {
    expect(parseMarkup("A claim. [a, b] A frame. [-]")).toEqual([{ text: "A claim.", refs: ["a", "b"] }, { text: "A frame.", refs: [] }]);
    expect(() => parseMarkup("A claim. [a] Trailing claim.")).toThrow("without a [reference] marker");
  });
  it("formats estimates with their intervals", () => {
    expect(formatEstimate({ point: -14.9, ciLow: -18.8, ciHigh: -10.9, unit: "points", measure: "aRD" })).toBe("−14.9 points (95% CI −18.8 to −10.9)");
    expect(formatEstimate({ point: 40.7, ciLow: null, ciHigh: null, unit: "%", measure: "proportion" })).toBe("40.7%");
  });
  it("canonicalises licences", () => {
    expect(canonicalLicense("https://creativecommons.org/licenses/by-nc-nd/4.0/")).toBe("CC-BY-NC-ND");
    expect(canonicalLicense("CC BY 4.0")).toBe("CC-BY");
    expect(checkLicense("CC0 1.0")).toEqual({ ok: true, license: "CC0" });
    expect(checkLicense("cc by-sa")).toEqual({ ok: true, license: "CC-BY-SA" });
    expect(checkLicense(null).ok).toBe(false);
    expect(checkLicense("All rights reserved").ok).toBe(false);
  });
  it("measures copying in runs of seven words", () => {
    expect(sharedShingles("one two three four five six seven eight", "zero one two three four five six seven")).toEqual(["one two three four five six seven"]);
    expect(sharedShingles("one two three four five six", "one two three four five six")).toEqual([]);
  });
  it("reads the Retraction Watch file and joins it against live papers", () => {
    const csv = [
      "Record ID,Title,OriginalPaperDOI,RetractionDate,RetractionNature,Reason",
      '1,"A paper, with a comma",10.1000/ABC.1,3/14/2024 0:00,Retraction,"+Data concerns;+Investigation"',
      "2,Another,10.1000/def.2,1/02/2023 0:00,Correction,+Error in text",
      "3,No doi,unavailable,1/02/2023 0:00,Retraction,+Unknown",
    ].join("\n");
    const rows = parseRetractionWatch(csv);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({ doi: "10.1000/abc.1", nature: "Retraction", date: "2024-03-14", reason: "+Data concerns;+Investigation" });
    expect(findRetracted(["https://doi.org/10.1000/abc.1", "10.1000/def.2", "10.1000/zzz.9"], rows).map((r) => r.doi)).toEqual(["10.1000/abc.1"]);
    expect(() => parseRetractionWatch("a,b\n1,2")).toThrow("the file format has changed");
  });
});

describe("publishedAt is set by the approve command, never typed", () => {
  it("accepts null (a draft) and a full timestamp", () => {
    expect(lintErrors(caffeine, (e) => { e.publishedAt = null; })).toEqual([]);
    expect(lintErrors(caffeine, (e) => { e.publishedAt = "2026-11-13T09:30:00.000Z"; })).toEqual([]);
  });
  it("refuses the text \"null\", a bare date and a local date: each would publish the paper", () => {
    for (const typed of ["null", "13/11/2026", "2026-11-13", "today", ""]) {
      expect(lintErrors(caffeine, (e) => { e.publishedAt = typed; }), typed)
        .toEqual([expect.stringContaining("schema publishedAt")]);
    }
  });
});
