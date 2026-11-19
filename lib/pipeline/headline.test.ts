/**
 * The question headline (owner, 2026-11-15): a read's headline is the question its paper
 * answers, with the plain finding directly beneath it. Same method as plain.test.ts: start from
 * reads that pass, break one thing, and check that rule "headline" objects.
 *
 *   - the question is one sentence ending in "?";
 *   - it does not presuppose an answer (a yes/no opening; no "why", "how much", "still" ...);
 *   - a finding line sits under it, and is not a question itself.
 */

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { FIGURE_KEYS } from "../content/figures";
import { gate } from "./gate";
import { REAL_LIBRARY, REAL_STUDIES } from "./fixtures/real-context";
import { lint, questionProblems, type LintContext } from "./lint";

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

function headlineErrors(slug: string, mutate: (editorial: any) => void): string[] {
  const read = reads[slug];
  const editorial = clone(read.editorial);
  mutate(editorial);
  const report = lint(read.validated, editorial, read.source, { context, figures: FIGURE_KEYS });
  return report.errors.filter((e) => e.rule === "headline").map((e) => e.message);
}

describe("the four reads pass", () => {
  for (const slug of SLUGS) {
    it(`${slug}: a yes/no question with its finding beneath`, () => {
      expect(headlineErrors(slug, () => {})).toEqual([]);
      expect(reads[slug].editorial.card.question).toMatch(/\?/);
    });
  }
});

describe("rule broken → the lint objects", () => {
  const caffeine = "daytime-caffeine-sleep";

  it("a headline that is not a question", () => {
    expect(headlineErrors(caffeine, (e) => { e.card.question = "Afternoon coffee and your sleep. [schedule]"; }).join()).toMatch(/ending in "\?"/);
  });

  it("a question that presupposes the answer: why", () => {
    expect(headlineErrors(caffeine, (e) => { e.card.question = "Why does an afternoon coffee wreck your sleep? [schedule]"; }).join()).toMatch(/"Why" presupposes an answer/);
  });

  it("a question that presupposes the answer: how much", () => {
    expect(headlineErrors("hiit-body-composition", (e) => { e.card.question = "How much fat does interval training burn? [trials]"; }).join()).toMatch(/"How much" presupposes/);
  });

  it("a question that presupposes the answer: still", () => {
    expect(headlineErrors(caffeine, (e) => { e.card.question = "Does an afternoon coffee still wreck your sleep? [schedule]"; }).join()).toMatch(/"still" presupposes/);
  });

  it("an open question that does not start as yes/no", () => {
    expect(headlineErrors(caffeine, (e) => { e.card.question = "What does an afternoon coffee do to your sleep? [schedule]"; }).join()).toMatch(/open with Does, Do, Is, Can/);
  });

  it("two sentences in the headline", () => {
    expect(headlineErrors(caffeine, (e) => { e.card.question = "Coffee keeps you up. [-] Does it? [schedule]"; }).join()).toMatch(/one question, one sentence; found 2/);
  });

  it("a question under the question instead of the finding", () => {
    expect(headlineErrors(caffeine, (e) => { e.card.headline = "Did sleep differ from placebo nights? [sleep_same]"; }).join()).toMatch(/the finding, not another question/);
  });

  it("no finding line under the question", () => {
    expect(questionProblems(["Does an afternoon coffee wreck your sleep?"], [])).toEqual(["a question headline needs the plain finding directly under it (card.headline)"]);
  });

  it("a read with no question at all fails its schema", () => {
    const read = reads[caffeine];
    const editorial = clone(read.editorial);
    delete editorial.card.question;
    const report = lint(read.validated, editorial, read.source, { context, figures: FIGURE_KEYS });
    expect(report.errors.some((e) => e.rule === "schema" && e.where.includes("card.question"))).toBe(true);
  });
});
