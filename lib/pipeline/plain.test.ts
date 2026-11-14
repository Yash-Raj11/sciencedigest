/**
 * Plain language (owner, 2026-11-14). Same method as layers.test.ts: start from a read that
 * passes (the turmeric paper, three layers), break exactly one thing, and check that the
 * "plain" rule objects; and check that the same words pass where they belong (the Receipts).
 *
 *   - "significant(ly)" never appears outside the Receipts;
 *   - no p-values, confidence intervals or "effect size" outside the Receipts;
 *   - never "didn't change" / "no effect" for a result the study could not tell from zero;
 *   - a direction word ("lower", "rose") only when a cited fact states the direction.
 */

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { FIGURE_KEYS } from "../content/figures";
import { gate, type ValidatedFact } from "./gate";
import { REAL_LIBRARY, REAL_STUDIES } from "./fixtures/real-context";
import { lint, statesDirection, type LintContext } from "./lint";
import { withoutInterval } from "./format";

function paper(slug: string) {
  const dir = new URL(`../../content/papers/${slug}/`, import.meta.url);
  const source = readFileSync(new URL("source.txt", dir), "utf8");
  const gated = gate(JSON.parse(readFileSync(new URL("extraction.json", dir), "utf8")), source);
  if (!gated.ok) throw new Error(gated.errors.join("\n"));
  return { source, validated: gated.validated, editorial: JSON.parse(readFileSync(new URL("editorial.json", dir), "utf8")) };
}

const context: LintContext = { studies: { ...REAL_STUDIES }, library: REAL_LIBRARY, concepts: {} };
const turmeric = paper("turmeric-pepper-breakfast");
const caffeine = paper("daytime-caffeine-sleep");
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

function plainErrors(read: ReturnType<typeof paper>, mutate: (editorial: any) => void, allowLegacyShape = false): string[] {
  const editorial = clone(read.editorial);
  mutate(editorial);
  const report = lint(read.validated, editorial, read.source, { context, figures: FIGURE_KEYS, allowLegacyShape });
  return report.errors.filter((e) => e.rule === "plain").map((e) => `${e.where}: ${e.message}`);
}
const addProtocol = (sentence: string) => (e: any) => { e.layers.protocol.paragraphs[0] += ` ${sentence}`; };
const addMissed = (sentence: string) => (e: any) => { e.layers.audit.missed += ` ${sentence}`; };

describe("the passing read", () => {
  it("turmeric has no plain-language error", () => {
    expect(plainErrors(turmeric, () => {})).toEqual([]);
  });
  it("caffeine (old shape) has none", () => {
    expect(plainErrors(caffeine, () => {}, true)).toEqual([]);
  });
});

describe('"significant" stays in the Receipts', () => {
  it("fails in the protocol layer, and says what to write instead", () => {
    const errors = plainErrors(turmeric, addProtocol("The 30-minute reading was significantly different. [glucose_30]"));
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/^layers\.protocol\[0\]: "significant" outside the Receipts; say "a clear difference"/);
  });
  it('fails "no significant difference" in the hook', () => {
    expect(plainErrors(turmeric, (e) => { e.hook += " Over 3 hours there was no significant difference. [glucose_total]"; }).join()).toMatch(/hook: "significant" outside/);
  });
  it("fails in the carousel and in a figure caption", () => {
    expect(plainErrors(turmeric, (e) => { e.carousel.caption += " The 3-hour total was non-significant. [glucose_total]"; })).toHaveLength(1);
    expect(plainErrors(turmeric, (e) => { e.layers.mechanism.figure.caption += " Only the last box is statistically significant. [glucose_lower]"; })).toHaveLength(1);
  });
  it("passes in the audit layer", () => {
    expect(plainErrors(turmeric, addMissed("The 30-minute reading was significantly different. [glucose_30]"))).toEqual([]);
  });
  it("old shape: passes in lower-bound, fails in found", () => {
    const sentence = "The differences were not statistically significant. [sleep_same]";
    const add = (id: string) => (e: any) => { e.sections.find((s: any) => s.id === id).paragraphs[0] += ` ${sentence}`; };
    expect(plainErrors(caffeine, add("lower-bound"), true)).toEqual([]);
    expect(plainErrors(caffeine, add("found"), true).join()).toMatch(/sections\.found\[0\]: "significant" outside/);
  });
});

describe("no p-values, confidence intervals or effect sizes outside the Receipts", () => {
  for (const [what, sentence] of [
    ["a p-value", "The 30-minute reading differed (p = .023). [glucose_30]"],
    ["a p-value written as p-value", "The p-value for the 30-minute reading was small. [glucose_30]"],
    ["a confidence interval", "The paper gives no confidence interval for it. [glucose_30]"],
    ["a CI", "The paper prints no CI for it. [glucose_30]"],
    ['"effect size"', "The paper gives no effect size for it. [glucose_30]"],
  ]) {
    it(`fails ${what} in the protocol layer, passes it in the audit`, () => {
      expect(plainErrors(turmeric, addProtocol(sentence))).toHaveLength(1);
      expect(plainErrors(turmeric, addMissed(sentence))).toEqual([]);
    });
  }
  it("a line outside the Receipts drops the interval of a formatted estimate", () => {
    expect(withoutInterval("Fat-free mass +0.63 kg (95% CI 0.17 to 1.09)")).toBe("Fat-free mass +0.63 kg");
    expect(withoutInterval("40.7%")).toBe("40.7%");
  });
});

describe('never "no effect" for a result the study could not tell from zero', () => {
  for (const sentence of [
    "Turmeric alone did not change blood glucose. [turmeric_none]",
    "Turmeric alone didn't change blood glucose. [turmeric_none]",
    "Turmeric alone had no effect on blood glucose. [turmeric_none]",
    "Turmeric alone showed no glucose effect. [turmeric_none]",
    "Turmeric alone left blood glucose unchanged. [turmeric_none]",
    "Turmeric alone showed nothing. [turmeric_none]",
  ]) {
    it(`fails "${sentence}", in the audit too`, () => {
      expect(plainErrors(turmeric, addProtocol(sentence))).toHaveLength(1);
      expect(plainErrors(turmeric, addMissed(sentence))).toHaveLength(1);
    });
  }
  it('passes "no clear difference" and "no clear effect"', () => {
    expect(plainErrors(turmeric, addProtocol("Turmeric alone showed no clear difference in blood glucose. [turmeric_none]"))).toEqual([]);
    expect(plainErrors(turmeric, addProtocol("Turmeric alone showed no clear effect on blood glucose. [turmeric_none]"))).toEqual([]);
  });
  it('"no effect size" is the statistics rule, not this one', () => {
    expect(plainErrors(turmeric, addMissed("The paper gives no effect size. [glucose_30]"))).toEqual([]);
  });
});

describe("a direction word needs a fact that states the direction", () => {
  it('fails "lower" on a fact that only says the meals differed', () => {
    const errors = plainErrors(turmeric, addProtocol("Blood glucose was lower at 30 minutes. [glucose_30]"));
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/"lower" says which way it went, but no cited fact states a direction; say "differed"/);
  });
  it('fails "higher" on a fact with no direction, and an uncited "rose" outside the mechanism', () => {
    expect(plainErrors(turmeric, addProtocol("Blood glucose was higher after turmeric alone. [turmeric_none]"))).toHaveLength(1);
    expect(plainErrors(turmeric, addMissed("Blood sugar rose less after pepper. [-]"))).toHaveLength(1);
  });
  it('passes "lower" on the fact that says lower, and neutral "differed" on either', () => {
    expect(plainErrors(turmeric, addProtocol("Blood glucose was lower at 30 minutes. [glucose_lower]"))).toEqual([]);
    expect(plainErrors(turmeric, addProtocol("Blood glucose differed at 30 minutes. [glucose_30]"))).toEqual([]);
  });
  it("a background sentence in the mechanism layer is not a result", () => {
    expect(plainErrors(turmeric, (e) => { e.layers.mechanism.paragraphs[0] += " After a meal, blood sugar rises. [-]"; })).toEqual([]);
  });

  const estimate = (point: number, ciLow: number | null, ciHigh: number | null, measure = "aRD"): ValidatedFact => ({
    id: "x", kind: "estimate", label: "x", value: "x", quote: "x", span: [0, 1],
    estimate: { outcome: "x", measure, point, ciLow, ciHigh, unit: "points", gradeRef: null, absolute: true, tier: "low" } as unknown as ValidatedFact["estimate"],
  });
  it("an estimate states a direction when its range excludes no difference", () => {
    expect(statesDirection(estimate(-14.9, -18.8, -10.9))).toBe(true);
    expect(statesDirection(estimate(-1.2, -3.0, 0.6))).toBe(false);
    expect(statesDirection(estimate(0.8, 0.7, 0.95, "HR"))).toBe(true);
    expect(statesDirection(estimate(0.9, 0.7, 1.1, "HR"))).toBe(false);
    expect(statesDirection(estimate(14.1, null, null, "proportion"))).toBe(false);
  });
  it("two printed levels that differ state a direction between them", () => {
    expect(plainErrors(paper("steps-days-per-week"), (e) => {
      e.carousel.caption += " The share who died was lower in the 1-2-day group. [crude_1_2, crude_0]";
    }, true)).toEqual([]);
  });
});

describe("a figure's words follow its layer", () => {
  it("the mechanism figure's alt may describe a shape; the protocol figure's alt may not claim a direction", () => {
    expect(plainErrors(turmeric, (e) => { e.layers.mechanism.figure.alt += " A line that falls by half at each step. [-]"; })).toEqual([]);
    expect(plainErrors(turmeric, (e) => { e.layers.protocol.figure.alt += " The pepper row is lower. [-]"; })).toHaveLength(1);
  });
});
