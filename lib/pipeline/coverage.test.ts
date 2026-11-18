/**
 * The conditions & confounds pass and the coverage checklist. Built on the
 * turmeric paper, whose first Gemini extractions missed exactly these items.
 */

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { COVERAGE_ITEMS, CoveragePass, coverageChecklist, mergeCoverage, reviewCoverage } from "./coverage";
import { RawExtraction } from "./extraction";
import { gate } from "./gate";

const dir = new URL("../../content/papers/turmeric-pepper-breakfast/", import.meta.url);
const source = readFileSync(new URL("source.txt", dir), "utf8");
const hand = RawExtraction.parse(JSON.parse(readFileSync(new URL("extraction.json", dir), "utf8")));
/** Turmeric as it was hand-checked: the coverage pass was merged into the file on 2026-11-19. */
const handChecked: RawExtraction = { ...hand };
delete handChecked.coverage;
const sugar = hand.facts.find((f) => f.id === "sugar_row")!;
const base = { ...handChecked, facts: handChecked.facts.filter((f) => f.id !== "sugar_row") };
const empty = { conditions: [], dosing: [], confounds: [], priorEvidence: [], furtherInvestigation: [], funding: [] };
const summary = (x: unknown) => {
  const r = gate(x, source);
  if (!r.ok) throw new Error(r.errors.join("\n"));
  return { design: r.validated.design, sampleSize: r.validated.sampleSize, facts: r.validated.facts };
};

describe("mergeCoverage", () => {
  it("adds a missed fact, records which item it covers, and the result still passes the gate", () => {
    const pass = CoveragePass.parse({ facts: [sugar], coverage: { ...empty, confounds: ["sugar_row"], conditions: ["in_egg", "plate"] } });
    const { extraction } = mergeCoverage(base, pass);
    expect(extraction.facts.map((f) => f.id)).toContain("sugar_row");
    expect(extraction.coverage.confounds).toEqual(["sugar_row"]);
    expect(extraction.coverage.conditions).toEqual(["in_egg", "plate"]);
    expect(gate(extraction, source).ok).toBe(true);
  });

  it("renames a new fact whose id is taken, and points the coverage at the new name", () => {
    const clash = { ...sugar, id: "plate" };
    const { extraction, notes } = mergeCoverage(base, CoveragePass.parse({ facts: [clash], coverage: { ...empty, confounds: ["plate"] } }));
    expect(extraction.facts.filter((f) => f.id.startsWith("plate")).map((f) => f.id)).toEqual(["plate", "plate_2"]);
    expect(extraction.coverage.confounds).toEqual(["plate_2"]);
    expect(notes.join(" ")).toMatch(/renamed "plate_2"/);
  });

  it("keeps a repeated fact once", () => {
    const again = hand.facts.find((f) => f.id === "plate")!;
    const { extraction } = mergeCoverage(base, CoveragePass.parse({ facts: [{ ...again, id: "plate_again" }], coverage: { ...empty, conditions: ["plate_again"] } }));
    expect(extraction.facts.length).toBe(base.facts.length);
    expect(extraction.coverage.conditions).toEqual(["plate"]);
  });

  it("relabels a statement as a limitation, but never a result", () => {
    const asStatement = { ...base, facts: base.facts.map((f) => (f.id === "lim_taste" ? { ...f, kind: "statement" as const } : f)) };
    const { extraction, notes } = mergeCoverage(asStatement, CoveragePass.parse({ relabelAsLimitation: ["lim_taste", "glucose_30", "nope"], coverage: empty }));
    expect(extraction.facts.find((f) => f.id === "lim_taste")!.kind).toBe("limitation");
    expect(extraction.facts.find((f) => f.id === "glucose_30")!.kind).toBe("finding");
    expect(notes.join(" ")).toMatch(/"glucose_30" is a finding; only a statement or context becomes a limitation/);
    expect(notes.join(" ")).toMatch(/no fact "nope"/);
  });

  it("drops a coverage id that names no fact", () => {
    const { extraction } = mergeCoverage(base, CoveragePass.parse({ coverage: { ...empty, funding: ["made_up"] } }));
    expect(extraction.coverage.funding).toEqual([]);
  });
});

describe("reviewCoverage (the coverage-only run, owner 2026-11-19)", () => {
  const pass = CoveragePass.parse({ facts: [sugar], relabelAsLimitation: ["glp1"], coverage: { ...empty, confounds: ["sugar_row"], dosing: ["single_meal"] } });
  const after = mergeCoverage(base, pass).extraction;

  it("lists the added facts, the relabels and the map, with no problem, for a clean run", () => {
    const review = reviewCoverage(base, after);
    expect(review.added.map((f) => f.id)).toEqual(["sugar_row"]);
    expect(review.relabelled).toEqual(["glp1"]);
    expect(review.coverage.confounds).toEqual(["sugar_row"]);
    expect(review.problems).toEqual([]);
  });

  it("reports a hand-checked fact whose value was edited", () => {
    const edited = { ...after, facts: after.facts.map((f) => (f.id === "plate" ? { ...f, value: "something else" } : f)) };
    expect(reviewCoverage(base, edited).problems).toEqual(['hand-checked fact "plate" was edited']);
  });

  it("reports a hand-checked fact that was dropped or moved", () => {
    const dropped = { ...after, facts: after.facts.filter((f) => f.id !== "plate") };
    expect(reviewCoverage(base, dropped).problems.join(" ")).toMatch(/"plate" is missing or moved/);
  });

  it("reports a result whose kind changed (only a statement or context may become a limitation)", () => {
    const relabelled = { ...after, facts: after.facts.map((f) => (f.id === "glucose_30" ? { ...f, kind: "limitation" as const } : f)) };
    expect(reviewCoverage(base, relabelled).problems).toEqual(['hand-checked fact "glucose_30" changed kind from finding to limitation']);
  });

  it("reports a change to the design, n or identifiers", () => {
    const design = { ...after, sampleSize: { ...after.sampleSize, value: "99" } };
    expect(reviewCoverage(base, design).problems).toEqual(['"sampleSize" changed']);
  });

  it("reports an extraction that already had a coverage map", () => {
    expect(reviewCoverage({ ...base, coverage: empty }, after).problems).toEqual(["the hand-checked extraction already had a coverage map"]);
  });
});

describe("coverageChecklist", () => {
  it("ticks design, n and limitations from the gate, and the pass items from their facts", () => {
    const rows = coverageChecklist({ ...empty, conditions: ["in_egg"], dosing: ["single_meal"], furtherInvestigation: ["lim_mechanism"] }, summary(hand));
    const by = Object.fromEntries(rows.map((r) => [r.item, r]));
    expect(by.design.facts).toEqual(["design: crossover"]); // relabelled by the owner, 2026-11-14
    expect(by.sampleSize.facts).toEqual(["n = 20"]);
    expect(by.conditions).toMatchObject({ found: true, facts: ["in_egg"] });
    expect(by.limitations.facts).toContain("lim_taste");
    expect(by.funding).toMatchObject({ found: false, facts: [] });
  });

  it("does not tick an item with a fact the gate refused or that does not exist", () => {
    const rows = coverageChecklist({ ...empty, funding: ["no_such_fact"] }, summary(hand));
    expect(rows.find((r) => r.item === "funding")!.found).toBe(false);
  });

  it("shows every item as not found when the gate refused the extraction", () => {
    expect(coverageChecklist({ ...empty, conditions: ["in_egg"] }, null).every((r) => !r.found)).toBe(true);
  });

  it("never ticks a pass item for an extraction made without the pass", () => {
    const rows = coverageChecklist(undefined, summary(hand));
    for (const item of ["conditions", "dosing", "confounds", "priorEvidence", "furtherInvestigation", "funding"]) {
      expect(rows.find((r) => r.item === item)!.found).toBe(false);
    }
  });
});

describe("the coverage maps merged into content/papers (2026-11-19)", () => {
  const papers = new URL("../../content/papers/", import.meta.url);
  const slugs = ["daytime-caffeine-sleep", "hiit-body-composition", "steps-days-per-week", "turmeric-pepper-breakfast"];
  it.each(slugs)("%s: every id in its coverage map is one of its gated facts", (slug) => {
    const raw = JSON.parse(readFileSync(new URL(`${slug}/extraction.json`, papers), "utf8")) as { coverage?: Record<string, string[]> };
    const result = gate(raw, readFileSync(new URL(`${slug}/source.txt`, papers), "utf8"));
    if (!result.ok) throw new Error(result.errors.join("\n"));
    expect(Object.keys(raw.coverage ?? {}).sort()).toEqual([...COVERAGE_ITEMS].sort());
    const dangling = Object.entries(raw.coverage!).flatMap(([item, ids]) => ids.filter((id) => !Object.hasOwn(result.validated.facts, id)).map((id) => `${item}: ${id}`));
    expect(dangling).toEqual([]);
  });
});
