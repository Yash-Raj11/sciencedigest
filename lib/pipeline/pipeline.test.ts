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
const LEGACY = { allowLegacyShape: true, figures: FIGURE_KEYS };

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
  return lint(validated(paper), editorial, paper.source, LEGACY).errors.map((e) => `${e.rule} ${e.where}: ${e.message}`);
}
const fact = (extraction: any, id: string) => extraction.facts.find((f: any) => f.id === id);

describe("the three starter papers", () => {
  it.each([["steps", steps], ["hiit", hiit], ["caffeine", caffeine]])("%s passes the gate and the lint", (_name, paper) => {
    const v = validated(paper);
    expect(lint(v, paper.editorial, paper.source, LEGACY).errors).toEqual([]);
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
    const paper = assemble(validated(hiit), editorial);
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
      .toEqual([expect.stringContaining("H5 hook: statistical significance described as magnitude")]);
  });
  it("H5: the interval of the headline estimate must be spelled out", () => {
    expect(lintErrors(steps, (e) => { e.sections = e.sections.filter((s: any) => s.id !== "lower-bound"); }))
      .toEqual(expect.arrayContaining([expect.stringContaining("H5 sections.lower-bound: must state both ends"), expect.stringContaining('structure sections: a section with id "lower-bound"')]));
  });
  it("H5: a result with no interval must say so in words", () => {
    expect(lintErrors(caffeine, (e) => {
      e.sections.find((s: any) => s.id === "lower-bound").paragraphs = ["Sleep was the same on both kinds of night. [sleep_same]"];
    })).toEqual([expect.stringContaining('H5 sections.lower-bound: "sleep_same" has no interval')]);
  });
  it("H6: a limitation that cites no limitation from the paper", () => {
    expect(lintErrors(steps, (e) => { e.limitations = ["More research is needed. [-]"]; }))
      .toEqual([expect.stringContaining("H6 limitations[0]")]);
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
  it("carousel: population slide, limitation slide, closing slide, slide count", () => {
    const drop = (kind: string) => (e: any) => { e.carousel.slides = e.carousel.slides.filter((s: any) => s.kind !== kind); };
    expect(lintErrors(steps, drop("population"))).toEqual([expect.stringContaining("H3 carousel.slides: the studied population gets its own slide")]);
    expect(lintErrors(steps, drop("limitation"))).toEqual([expect.stringContaining("H6 carousel.slides")]);
    expect(lintErrors(steps, drop("cta"))).toEqual([expect.stringContaining("the last slide points to the interactive widget")]);
    expect(lintErrors(steps, (e) => {
      const filler = { kind: "nuance", heading: "Filler [-]", body: null };
      e.carousel.slides.splice(1, 0, ...Array.from({ length: 5 }, () => filler));
    })).toEqual([expect.stringContaining("Instagram allows 10 slides; this has 12")]);
  });
  it("carousel: a character the slide fonts may not carry", () => {
    expect(lintErrors(steps, (e) => { e.carousel.slides[1].heading = "Risk ≤ before [-]"; }))
      .toEqual([expect.stringContaining("contains a character the slide fonts may not carry")]);
  });
  it("copy: prose lifted from the paper", () => {
    const lifted = "Although our findings might suffer from residual confounding that should be addressed in future research, these findings suggest that people may receive substantial health benefits by walking just a couple of days a week";
    const inSource = steps.source.includes("Our study has 2 major strengths");
    expect(inSource).toBe(true);
    const errors = lintErrors(steps, (e) => {
      e.sections[0].paragraphs.push("Our study has two major strengths. First, we used objective measurements of daily steps throughout a week based on accelerometer data, which allowed us to avoid potential bias from exposure misclassification due to faulty self-report. [cohort]");
    });
    expect(errors.some((e) => e.startsWith("copy read"))).toBe(true);
    expect(lifted.length).toBeGreaterThan(0);
  });
});

describe("assemble", () => {
  const paper = assemble(validated(hiit), hiit.editorial);
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
