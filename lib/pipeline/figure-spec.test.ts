/**
 * Figure specs (lib/content/figure-kinds.ts) and rule H12. Each bad fixture in
 * fixtures/figure-spec/ breaks one rule and must be refused by name; the good
 * one must pass. Then the same through the real lint, on the caffeine paper.
 */

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { FIGURE_KEYS } from "../content/figures";
import { ESTIMATE_LABEL, FigureSpec, specProblems, type SpecFact } from "../content/figure-kinds";
import { gate } from "./gate";
import { HALF_LIFE_STUDY, REAL_LIBRARY, REAL_STUDIES } from "./fixtures/real-context";
import { BANNED_TERMS, SENTENCE_WORDS, THROAT_CLEARING, lint, type LintContext } from "./lint";
import { approved, checkConcept } from "./concepts";

const spec = (name: string) => JSON.parse(readFileSync(new URL(`fixtures/figure-spec/${name}.json`, import.meta.url), "utf8"));

const FACTS: Record<string, SpecFact> = {
  half_life: { kind: "estimate", unit: "h", point: 5, ciLow: 3, ciHigh: 7 },
  half_life_point_only: { kind: "estimate", unit: "h", point: 5, ciLow: null, ciHigh: null },
  half_life_minutes: { kind: "estimate", unit: "min", point: 300, ciLow: 180, ciHigh: 420 },
  said_so: { kind: "statement", unit: null, point: null, ciLow: null, ciHigh: null },
};
const check = (raw: unknown) => specProblems(raw, "spec", (id) => FACTS[id]).map((p) => `${p.rule} ${p.where}: ${p.message}`);

describe("a figure spec", () => {
  it("passes when it names a known kind and gated facts, and zod accepts it", () => {
    expect(check(spec("good"))).toEqual([]);
    expect(FigureSpec.safeParse(spec("good")).success).toBe(true);
  });

  it("fails on a literal number", () => {
    expect(check(spec("bad-literal-number"))).toEqual([expect.stringMatching(/^H7 spec\.facts\.halfLife: a literal number \(5\)/)]);
    expect(FigureSpec.safeParse(spec("bad-literal-number")).success).toBe(false);
  });

  it("fails on a number typed as text", () => {
    expect(check(spec("bad-number-as-text"))).toEqual([expect.stringMatching(/^H7 spec\.facts\.halfLife: a literal number \("5\.7"\)/)]);
  });

  it("fails on an unknown kind", () => {
    expect(check(spec("bad-unknown-kind"))).toEqual([expect.stringMatching(/^figure-spec spec\.kind: unknown kind "sparkline"/)]);
  });

  it("fails on a fact that is not gated: nothing is filled in", () => {
    expect(check(spec("bad-missing-fact"))).toEqual([expect.stringMatching(/"not_in_the_paper" is not a gated fact/)]);
  });

  it("H12: a simulator on a fact with no range fails; the still figure on the same fact passes", () => {
    expect(check(spec("bad-no-range"))).toEqual([expect.stringMatching(/^H12 spec\.simulator\.halfLife: .*no range, so there is no simulator/)]);
    expect(check({ kind: "decay", facts: { halfLife: "half_life_point_only" } })).toEqual([]);
  });

  it("fails on a fact that is not a number, on the wrong unit, on a missing or an extra param, and on an extra key", () => {
    expect(check({ kind: "decay", facts: { halfLife: "said_so" } })).toEqual([expect.stringMatching(/is a statement with no number/)]);
    expect(check({ kind: "decay", facts: { halfLife: "half_life_minutes" } })).toEqual([expect.stringMatching(/works in hours/)]);
    expect(check({ kind: "decay", facts: {} })).toEqual([expect.stringMatching(/needs "halfLife"/)]);
    expect(check({ kind: "decay", facts: { halfLife: "half_life", dose: "half_life" } })).toEqual([expect.stringMatching(/has no "dose"/)]);
    expect(check({ kind: "decay", facts: { halfLife: "half_life" }, label: "Caffeine" }).length).toBe(1);
  });

  it("a background concept never feeds a figure or a simulator: it carries no number", () => {
    expect(check(spec("bad-concept-number"))).toEqual([
      expect.stringMatching(/^context spec\.facts\.halfLife: "concept:adenosine" is a background concept/),
      expect.stringMatching(/^context spec\.simulator\.halfLife: "concept:adenosine" is a background concept/),
    ]);
  });

  it("the label of a personal estimate is the one H12 names", () => {
    expect(ESTIMATE_LABEL).toBe("Estimate from the study's numbers, not medical advice");
  });
});

describe("through the content lint, on the caffeine paper", () => {
  const dir = new URL("../../content/papers/daytime-caffeine-sleep/", import.meta.url);
  const source = readFileSync(new URL("source.txt", dir), "utf8");
  const gated = gate(JSON.parse(readFileSync(new URL("extraction.json", dir), "utf8")), source);
  if (!gated.ok) throw new Error(gated.errors.join("\n"));
  const validated = gated.validated;
  const fixture = JSON.parse(readFileSync(new URL("fixtures/layered-caffeine.json", import.meta.url), "utf8"));
  const oldShape = JSON.parse(readFileSync(new URL("editorial.json", dir), "utf8"));
  const context: LintContext = {
    // The real half-life study and library: caffeine's simulator draws on them.
    studies: { ...REAL_STUDIES },
    library: REAL_LIBRARY,
    concepts: {
      "non-rem-sleep": checkConcept(approved(fixture.concepts["non-rem-sleep"], "2026-11-13T00:00:00Z"),
        { banned: BANNED_TERMS, throatClearing: THROAT_CLEARING, maxSentenceWords: SENTENCE_WORDS.fail }),
    },
  };
  function run(figureSpec: unknown): string[] {
    const base = Object.fromEntries(Object.entries(structuredClone(oldShape)).filter(([key]) => !["sections", "limitations", "figure", "layers", "glossary"].includes(key)));
    const layers = structuredClone(fixture.layers);
    layers.mechanism.figure = { figure: "decay", caption: "How long it stays. [-]", alt: "A line that falls by half at each step. [-]", params: {}, spec: figureSpec };
    return lint(validated, { ...base, layers, glossary: structuredClone(fixture.glossary) } as never, source, { context, figures: FIGURE_KEYS })
      .errors.map((e) => `${e.rule} ${e.where}: ${e.message}`);
  }

  it("the paper has no gated half-life, so a decay spec on it is refused (the pilot's finding)", () => {
    expect(Object.values(validated.facts).filter((f) => /half.?life/i.test(`${f.id} ${f.label} ${f.quote}`))).toEqual([]);
    expect(run(spec("good"))).toEqual([
      expect.stringMatching(/^figure-spec layers\.mechanism\.figure\.spec\.facts\.halfLife: "half_life" is not a gated fact/),
      expect.stringMatching(/^figure-spec layers\.mechanism\.figure\.spec\.simulator\.halfLife: "half_life" is not a gated fact/),
    ]);
  });

  // A gated context study may feed a spec (owner's rule change, 2026-11-14). Its fact is made up here.
  const OTHER = "made-up-context-study";
  const anyFact = Object.values(validated.facts)[0];
  const contextStudy = (withdrawn: boolean): LintContext["studies"][string] => ({
    ok: true,
    validated: { ...validated, facts: { half_life: { ...anyFact, id: "half_life", kind: "estimate", estimate: { unit: "h", point: 5, ciLow: 3, ciHigh: 7, tier: "low" } } } } as never,
    withdrawn: withdrawn ? { nature: "Retraction", date: null, reason: "test" } : null,
  });
  function runWith(figureSpec: unknown, studies: LintContext["studies"], library: string[] = [`${OTHER}/half_life`]) {
    const saved = { studies: context.studies, library: context.library };
    context.studies = { ...REAL_STUDIES, ...studies };
    context.library = [...REAL_LIBRARY, ...library];
    try { return run(figureSpec); } finally { Object.assign(context, saved); }
  }
  const studySpec = { kind: "decay", facts: { halfLife: `${OTHER}/half_life` }, simulator: { halfLife: `${OTHER}/half_life` } };

  it("a gated context study's fact may feed the spec and, once in the fact library, its simulator", () => {
    expect(runWith(studySpec, { [OTHER]: contextStudy(false) })).toEqual([]);
  });

  it("a context fact outside the fact library cannot feed a simulator; the still figure may still draw it", () => {
    expect(runWith(studySpec, { [OTHER]: contextStudy(false) }, [])).toEqual([
      expect.stringMatching(/^context layers\.mechanism\.figure\.spec\.simulator\.halfLife: ".*\/half_life" is not in the fact library/),
    ]);
    expect(runWith({ kind: "decay", facts: studySpec.facts }, { [OTHER]: contextStudy(false) }, [])).toEqual([]);
  });

  it("the study fed to a spec is listed for the audit", () => {
    const base = Object.fromEntries(Object.entries(structuredClone(oldShape)).filter(([key]) => !["sections", "limitations", "figure", "layers", "glossary"].includes(key)));
    const layers = structuredClone(fixture.layers);
    layers.mechanism.figure = { figure: "decay", caption: "How long it stays. [-]", alt: "A line that falls by half at each step. [-]", params: {}, spec: studySpec };
    const report = lint(validated, { ...base, layers, glossary: structuredClone(fixture.glossary) } as never, source, { context: { ...context, studies: { ...REAL_STUDIES, [OTHER]: contextStudy(false) } }, figures: FIGURE_KEYS });
    expect(report.context?.studies).toEqual([HALF_LIFE_STUDY, OTHER].sort());
  });

  it("a withdrawn or missing context study cannot feed a spec", () => {
    expect(runWith(studySpec, { [OTHER]: contextStudy(true) })).toEqual(expect.arrayContaining([expect.stringMatching(/^context .*has been withdrawn/)]));
    expect(runWith(studySpec, {})).toEqual(expect.arrayContaining([expect.stringMatching(/^context .*no gated source/)]));
  });

  it("a concept-sourced number in a spec fails through the lint", () => {
    expect(runWith(spec("bad-concept-number"), {})).toEqual([
      expect.stringMatching(/^context layers\.mechanism\.figure\.spec\.facts\.halfLife: "concept:adenosine" is a background concept/),
      expect.stringMatching(/^context layers\.mechanism\.figure\.spec\.simulator\.halfLife: "concept:adenosine" is a background concept/),
    ]);
  });

  it("refuses a literal number and an unknown kind there too", () => {
    expect(run(spec("bad-literal-number"))).toEqual([expect.stringMatching(/^H7 .*literal number/)]);
    expect(run(spec("bad-unknown-kind"))).toEqual([expect.stringMatching(/^figure-spec .*unknown kind/)]);
  });
});
