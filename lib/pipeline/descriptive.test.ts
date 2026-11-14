/**
 * The "descriptive" fact kind (owner, 2026-11-15): who was studied, measured at the start
 * (a baseline or table characteristic, verbatim). Two rules, each with a case that fails:
 *
 *   1. It may be drawn as measured (labelled "Measured at the start"), never as proposed.
 *   2. It is never a finding and never a headline: the gate refuses one that carries an outcome,
 *      an estimate or a p-value; the lint refuses it as the headline result, as a step's
 *      evidence, and in any headline sentence.
 *
 * Built on the steps paper, whose baseline ages and mobility shares are descriptive.
 */

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DESCRIPTIVE_LABEL, FIGURE_KEYS, evidenceKindProblem } from "../content/figures";
import { gate } from "./gate";
import { REAL_LIBRARY, REAL_STUDIES } from "./fixtures/real-context";
import { lint, type LintContext } from "./lint";

const DIR = new URL("../../content/papers/steps-days-per-week/", import.meta.url);
const source = readFileSync(new URL("source.txt", DIR), "utf8");
const extraction = JSON.parse(readFileSync(new URL("extraction.json", DIR), "utf8"));
const editorial = JSON.parse(readFileSync(new URL("editorial.json", DIR), "utf8"));
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const context: LintContext = { studies: { ...REAL_STUDIES }, library: REAL_LIBRARY, concepts: {} };

function gateWith(mutate: (x: any) => void) {
  const x = clone(extraction);
  mutate(x);
  return gate(x, source);
}
const gateErrors = (mutate: (x: any) => void) => { const r = gateWith(mutate); return r.ok ? [] : r.errors; };
const fact = (x: any, id: string) => x.facts.find((f: any) => f.id === id);

function lintErrors(mutate: (e: any) => void, rule?: string) {
  const gated = gateWith(() => {});
  if (!gated.ok) throw new Error(gated.errors.join("\n"));
  const e = clone(editorial);
  mutate(e);
  const report = lint(gated.validated, e, source, { context, figures: FIGURE_KEYS, allowLegacyShape: true });
  return report.errors.filter((x) => !rule || x.rule === rule).map((x) => `${x.rule} ${x.where}: ${x.message}`);
}

describe("rule 1: drawn as measured, never as proposed", () => {
  it("a descriptive fact may stand behind a measured mark", () => {
    expect(evidenceKindProblem("measured", { id: "ages", kind: "descriptive" })).toBeNull();
  });
  it("it may not be drawn as the authors' proposal", () => {
    expect(evidenceKindProblem("proposed", { id: "ages", kind: "descriptive" })).toMatch(/measurement at the start/);
  });
  it("a statement still may not be drawn as measured (the rule did not widen past descriptive)", () => {
    expect(evidenceKindProblem("measured", { id: "plateau", kind: "statement" })).toMatch(/not a result/);
  });
  it("the label the figure shows", () => expect(DESCRIPTIVE_LABEL).toBe("Measured at the start"));
  it("the steps read passes with 3A bound to ages and mobility as measured", () => {
    expect(lintErrors(() => {})).toEqual([]);
  });
  it("the lint refuses 3A's ages drawn as proposed", () => {
    const errors = lintErrors((e) => { e.auditFigure.params.ages.kind = "proposed"; }, "figure");
    expect(errors.join()).toMatch(/auditFigure\.params\.ages: drawn as proposed/);
  });
});

describe("rule 2: never a finding, never a headline", () => {
  it("the gate passes the steps extraction with ages and mobility descriptive", () => {
    expect(gateErrors(() => {})).toEqual([]);
    expect(fact(extraction, "ages").kind).toBe("descriptive");
  });
  it("the gate refuses a descriptive fact that names an outcome, as if it were a finding", () => {
    expect(gateErrors((x) => { fact(x, "ages").outcome = "Age"; }).join()).toMatch(/fact ages: a descriptive fact .* carries no outcome/);
  });
  it("the gate refuses a descriptive fact that carries an estimate", () => {
    const errors = gateErrors((x) => {
      fact(x, "ages").estimate = { outcome: "Age", measure: "mean", point: 63.7, ciLow: null, ciHigh: null, unit: "years", gradeRef: null };
    });
    expect(errors.join()).toMatch(/fact ages: a descriptive fact .* carries no estimate/);
  });
  it("the gate refuses a descriptive quote with a p-value: that is a result (turmeric's p = .023 passage)", () => {
    const tDir = new URL("../../content/papers/turmeric-pepper-breakfast/", import.meta.url);
    const tSource = readFileSync(new URL("source.txt", tDir), "utf8");
    const t = JSON.parse(readFileSync(new URL("extraction.json", tDir), "utf8"));
    const f = fact(t, "glucose_30");
    f.kind = "descriptive"; delete f.outcome;
    const result = gate(t, tSource);
    expect(result.ok ? [] : result.errors.join()).toMatch(/fact glucose_30: the quote carries a p-value, .* not "descriptive"/);
  });
  it("the lint refuses a descriptive fact as the headline result", () => {
    expect(lintErrors((e) => { e.primaryEstimate = "ages"; }, "H5").join()).toMatch(/"ages" is not a verified estimate or finding/);
  });
  it("the lint refuses a descriptive fact as a step's evidence", () => {
    expect(lintErrors((e) => { e.steps[1].evidenceRef = "ages"; }, "H7").join()).toMatch(/evidenceRef "ages" is not a verified estimate or finding/);
  });
  it("the lint refuses a descriptive fact cited in a headline sentence", () => {
    const errors = lintErrors((e) => { e.hook = "The group with no step days had an average age of 63.7. [ages]"; }, "descriptive");
    expect(errors.join()).toMatch(/^descriptive hook: "ages" describes who was studied at the start/);
    const finding = lintErrors((e) => { e.card.support = e.card.support; e.card.headline = `${e.card.headline.replace(/\]$/, ", mobility]")}`; }, "descriptive");
    expect(finding.join()).toMatch(/^descriptive card\.headline/);
  });
  it("the same fact in the body of the read is fine", () => {
    expect(lintErrors(() => {}, "descriptive")).toEqual([]);
  });
});
