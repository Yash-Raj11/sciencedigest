/**
 * Direction said once (owner, 2026-11-15): a minus sign together with "lower", "fewer" or "less"
 * is a double negative ("−14.9 points lower"). Rule "direction" refuses it in any sentence a reader
 * sees, and on the finding card, where the card prints the headline result's number in front of a
 * headline that states none. Same method as headline.test.ts: start from reads that pass, break
 * one thing, and check that the rule objects.
 */

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { FIGURE_KEYS } from "../content/figures";
import { glanceView } from "../content/glance";
import { headlineStatesNumber } from "./format";
import { gate } from "./gate";
import { REAL_LIBRARY, REAL_STUDIES } from "./fixtures/real-context";
import { directionTwice, lint, type LintContext } from "./lint";

function paper(slug: string) {
  const dir = new URL(`../../content/papers/${slug}/`, import.meta.url);
  const source = readFileSync(new URL("source.txt", dir), "utf8");
  const gated = gate(JSON.parse(readFileSync(new URL("extraction.json", dir), "utf8")), source);
  if (!gated.ok) throw new Error(gated.errors.join("\n"));
  return { source, validated: gated.validated, editorial: JSON.parse(readFileSync(new URL("editorial.json", dir), "utf8")) };
}

const context: LintContext = { studies: { ...REAL_STUDIES }, library: REAL_LIBRARY, concepts: {} };
const SLUGS = ["daytime-caffeine-sleep", "steps-days-per-week", "turmeric-pepper-breakfast", "hiit-body-composition"];
const reads = Object.fromEntries(SLUGS.map((slug) => [slug, paper(slug)]));
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

function directionErrors(slug: string, mutate: (editorial: any) => void): string[] {
  const read = reads[slug];
  const editorial = clone(read.editorial);
  mutate(editorial);
  const report = lint(read.validated, editorial, read.source, { context, figures: FIGURE_KEYS, allowLegacyShape: true });
  return report.errors.filter((e) => e.rule === "direction").map((e) => `${e.where}: ${e.message}`);
}

describe("directionTwice", () => {
  it("catches a minus sign with lower, fewer or less", () => {
    expect(directionTwice("−14.9 points lower 10-year risk of death.")).toBe(true);
    expect(directionTwice("Fat mass was −1.86 kg less.")).toBe(true);
    expect(directionTwice("A difference of -16.5 points, so fewer deaths.")).toBe(true);
    expect(directionTwice("Lower risk (−18.8 to −10.9 points).")).toBe(true);
  });
  it("leaves alone a dash that is not a minus sign, and a sign without the words", () => {
    expect(directionTwice("People with 1–2 such days had a 14.9-point lower 10-year risk.")).toBe(false);
    expect(directionTwice("Days 3-7 had fewer deaths.")).toBe(false);
    expect(directionTwice("Fat mass −1.86 kg, vs no exercise.")).toBe(false);
  });
});

describe("rule direction through the real lint", () => {
  for (const slug of SLUGS) {
    it(`${slug} passes as written`, () => expect(directionErrors(slug, () => {})).toEqual([]));
  }
  it("fails the old steps headline: the card prints −14.9 points in front of 'lower ...'", () => {
    const errors = directionErrors("steps-days-per-week", (e) => {
      e.card.headline = "lower 10-year risk of death, compared with 0 days a week. [ard_1_2, followup, threshold]";
    });
    expect(errors.some((m) => m.startsWith("card.headline:"))).toBe(true);
  });
  it("fails a sentence that writes the minus sign and 'lower' itself", () => {
    const errors = directionErrors("steps-days-per-week", (e) => {
      e.card.headline = "People with 1–2 such days had a −14.9-point lower 10-year risk of death than people with none. [ard_1_2, followup, threshold]";
    });
    expect(errors.length).toBeGreaterThan(0);
  });
  it("fails it in any sentence a reader sees, not only the card", () => {
    const errors = directionErrors("hiit-body-composition", (e) => {
      e.card.support = "Fat mass was −1.86 kg less than with no exercise. [fm_all]";
    });
    expect(errors.some((m) => m.startsWith("card.support:"))).toBe(true);
  });
});

describe("a headline that states its number gets none in front of it", () => {
  it("headlineStatesNumber", () => {
    expect(headlineStatesNumber([{ text: "People with 1–2 such days had a 14.9-point lower risk." }], -14.9)).toBe(true);
    expect(headlineStatesNumber([{ text: "lower 10-year risk of death" }], -14.9)).toBe(false);
    expect(headlineStatesNumber([{ text: "Fat-free mass +0.51 kg and fat mass −1.86 kg." }], 0.51)).toBe(true);
  });
  it("the steps feed card shows the owner's sentence with no '−14.9 points' in front", async () => {
    const { freeContent } = await import("../content");
    const content = freeContent("steps-days-per-week");
    expect(content).toBeTruthy();
    const view = glanceView(content!);
    expect(view.headline).toBe("People with 1–2 such days had a 14.9-point lower 10-year risk of death than people with none.");
    expect(view.headline).not.toMatch(/−/);
  });
});
