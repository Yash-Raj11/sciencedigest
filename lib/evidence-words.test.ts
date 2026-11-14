/**
 * Grade words and the "why" sentence (owner, 2026-11-14): a reader sees Early, Decent or
 * Strong evidence with a 3-bar meter and one plain sentence on why. Never the weight.
 *
 * The why sentence is written from the same rules that derive the grade, so it is checked
 * against deriveTier on every path: a sentence that explains a different grade fails.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { GRADE_BARS, GRADE_WORDS, gradeWhy } from "./evidence-words";
import { DESIGNS, SMALL_TRIAL, SPECIES, deriveTier, type Design, type Species } from "./pipeline/grade";
import { BANNED_TERMS, CAUSAL_VERB, NULL_OVERCLAIM, PLAIN_SIGNIFICANT, PLAIN_STATS, SENTENCE_WORDS } from "./pipeline/lint";
import type { EvidenceGrade } from "./evidence";

const SIZES = [null, 12, SMALL_TRIAL - 1, SMALL_TRIAL, 3101];
const REPORTED: (EvidenceGrade | null)[] = [null, "high", "moderate", "low"];

/** Every combination deriveTier can see. */
const CASES = DESIGNS.flatMap((design) => SPECIES.flatMap((species) => SIZES.flatMap((sampleSize) =>
  REPORTED.map((reportedGrade) => ({ design: design as Design, species: species as Species, sampleSize, reportedGrade })))));

/** Which branch of deriveTier a case takes, from the inputs alone. */
function branch(c: (typeof CASES)[number]): "not-human" | "reported" | "small" | "pooled" | "trial" | "watched" {
  if (c.species !== "human" || c.design === "animal" || c.design === "in_vitro") return "not-human";
  if (c.reportedGrade) return "reported";
  if (c.design === "meta_analysis_rct" || c.design === "rct" || c.design === "crossover") {
    if (c.sampleSize !== null && c.sampleSize < SMALL_TRIAL) return "small";
    return c.design === "meta_analysis_rct" ? "pooled" : "trial";
  }
  return "watched";
}

const SAYS: Record<ReturnType<typeof branch>, RegExp> = {
  "not-human": /not in people/,
  reported: /authors rated/,
  small: /only \d+ took part/,
  pooled: /pools trials/,
  trial: /in one study/,
  watched: /watched people without assigning/,
};

describe("the why sentence follows the rule that set the grade", () => {
  it(`agrees with deriveTier on all ${CASES.length} combinations`, () => {
    for (const c of CASES) {
      const tier = deriveTier(c);
      const why = gradeWhy({ tier, design: c.design, species: c.species, sampleSize: c.sampleSize, reported: c.reportedGrade !== null });
      expect(why, JSON.stringify(c)).toMatch(SAYS[branch(c)]);
      if (branch(c) === "reported") expect(why).toContain(`rated it ${tier}`);
      if (branch(c) === "small") expect(why).toContain(`only ${c.sampleSize} took part`);
    }
  });
  it("a sentence written for another grade is caught (the check is not vacuous)", () => {
    const wrong = gradeWhy({ tier: "moderate", design: "cohort", species: "human", sampleSize: 3101, reported: false });
    expect(wrong).not.toMatch(SAYS.trial);
    expect(gradeWhy({ tier: "low", design: "crossover", species: "human", sampleSize: 20, reported: false })).not.toMatch(SAYS.trial);
  });
});

describe("the sentences are plain and hold no weight", () => {
  const sentences = [...new Set(CASES.map((c) => gradeWhy({
    tier: deriveTier(c), design: c.design, species: c.species, sampleSize: c.sampleSize, reported: c.reportedGrade !== null,
  })))];
  it("no weight, no statistics, no hype, no causal verb, no overclaim, short", () => {
    for (const s of sentences) {
      expect(s).not.toMatch(/×|\b0\.\d|\bweight/i);
      expect(s).not.toMatch(PLAIN_SIGNIFICANT);
      for (const [, pattern] of PLAIN_STATS) expect(s).not.toMatch(pattern);
      for (const [, pattern] of BANNED_TERMS) expect(s).not.toMatch(pattern);
      expect(s).not.toMatch(CAUSAL_VERB);
      expect(s).not.toMatch(NULL_OVERCLAIM);
      expect(s.split(/\s+/).length).toBeLessThanOrEqual(SENTENCE_WORDS.fail);
    }
  });
  it("words and bars rise together", () => {
    expect(GRADE_WORDS).toEqual({ high: "Strong evidence", moderate: "Decent evidence", low: "Early evidence", none: "No evidence grade" });
    expect([GRADE_BARS.none, GRADE_BARS.low, GRADE_BARS.moderate, GRADE_BARS.high]).toEqual([0, 1, 2, 3]);
  });
});

describe("no screen shows a weight", () => {
  const SHOWS_WEIGHT = /weightLabel|weightOf|WEIGHT_TENTHS|×\s?[01](?:\.\d)?\b/;
  const files = (dir: string): string[] => readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : /\.(tsx?|css)$/.test(name) ? [path] : [];
  });
  it("components/ and app/ never import a weight or print one", () => {
    const hits = [...files("components"), ...files("app")].filter((f) => SHOWS_WEIGHT.test(readFileSync(f, "utf8")));
    expect(hits).toEqual([]);
  });
  it("the check catches one", () => {
    expect(SHOWS_WEIGHT.test('import { weightLabel } from "@/lib/evidence";')).toBe(true);
    expect(SHOWS_WEIGHT.test("<span>×0.4</span>")).toBe(true);
    expect(SHOWS_WEIGHT.test("<span>Early evidence</span>")).toBe(false);
  });
});
