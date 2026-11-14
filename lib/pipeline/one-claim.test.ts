/**
 * One claim per clause (owner, 2026-11-15): a headline or finding clause may cite only one result
 * (an estimate or a finding), so a time from one fact cannot merge with a direction from another.
 * Context facts may come along (the "3 hours" of the meal window). Each case must fail.
 */

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { FIGURE_KEYS } from "../content/figures";
import { gate } from "./gate";
import { REAL_LIBRARY, REAL_STUDIES } from "./fixtures/real-context";
import { lint, type LintContext } from "./lint";

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
const errors = (slug: string, mutate: (e: any) => void) => {
  const r = reads[slug];
  const e = JSON.parse(JSON.stringify(r.editorial));
  mutate(e);
  return lint(r.validated, e, r.source, { context, figures: FIGURE_KEYS, allowLegacyShape: true }).errors
    .filter((x) => x.rule === "one-claim").map((x) => `${x.where}: ${x.message}`);
};

describe('rule "one-claim"', () => {
  for (const slug of SLUGS) it(`${slug} passes as written`, () => expect(errors(slug, () => {})).toEqual([]));

  it("fails the old turmeric finding: the time from glucose_30 joined to the direction from glucose_lower", () => {
    const found = errors("turmeric-pepper-breakfast", (e) => {
      e.card.headline = "Blood sugar was lower 30 minutes after the pepper meals; over 3 hours, no clear difference. [glucose_30, glucose_lower, glucose_total, nothing_else]";
    });
    expect(found.join()).toMatch(/^card\.headline: one clause cites 3 results \(glucose_30, glucose_lower, glucose_total\)/);
  });
  it("fails two pooled results under one marker", () => {
    const found = errors("hiit-body-composition", (e) => {
      e.card.headline = "Fat-free mass +0.51 kg and fat mass −1.86 kg, vs no exercise, trials pooled. [ffm_all, fm_all]";
    });
    expect(found).toHaveLength(1);
  });
  it("fails it in any headline sentence: the hook and a carousel heading", () => {
    expect(errors("turmeric-pepper-breakfast", (e) => { e.hook = "Blood glucose was lower 30 minutes later. [glucose_lower, glucose_30]"; })).toHaveLength(1);
    expect(errors("turmeric-pepper-breakfast", (e) => { e.carousel.slides[1].heading = "Lower at 30 minutes [glucose_lower, glucose_30]"; })).toHaveLength(1);
  });
  it("lets context facts come along with the one result", () => {
    expect(errors("steps-days-per-week", () => {})).toEqual([]); // [ard_1_2, followup, threshold]
  });
});
