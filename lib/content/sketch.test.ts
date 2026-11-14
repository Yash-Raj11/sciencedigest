/**
 * The sketch rule (owner, 2026-11-15): a shape only, no numbers, monochrome and dotted, tagged
 * "Sketch, not data", resting on a reviewed concept. Start from a sketch that passes, break one
 * thing, and check that the matching rule objects.
 */

import { describe, expect, it } from "vitest";
import type { Concept, ConceptState } from "../pipeline/concepts";
import { SKETCH_TAG, sketchProblems } from "./sketch";

const concept: Concept = { term: "adenosine", plain: "A tiredness signal.", model: "Tokens that pile up.", reference: { doi: "10.1126/science.276.5316.1265", title: "t" }, reviewed_by_owner: true };
const concepts: Record<string, ConceptState> = {
  adenosine: { ok: true, concept, reviewed: true },
  "post-meal-blood-sugar": { ok: true, concept: { ...concept, reviewed_by_owner: false }, reviewed: false },
  broken: { ok: false, errors: ["no numbers: plain"] },
};

const good = () => ({
  id: "sleep-pressure",
  concept: "adenosine",
  tag: SKETCH_TAG,
  ink: "muted",
  stroke: "dotted",
  words: { alt: "A dotted line rises from waking to bed. It is a sketch of a shape, not data.", labels: { rising: "Sleep pressure keeps building", gap: "Hidden tiredness" } },
});
const rules = (spec: unknown) => sketchProblems(spec, "sketches[0]", concepts).map((p) => p.rule);
const messages = (spec: unknown) => sketchProblems(spec, "sketches[0]", concepts).map((p) => p.message).join("\n");

describe("a sketch that keeps the rule", () => {
  it("passes", () => {
    expect(sketchProblems(good(), "sketches[0]", concepts)).toEqual([]);
  });
});

describe("a sketch with numbers fails", () => {
  it("a digit in a label", () => {
    expect(rules({ ...good(), words: { ...good().words, labels: { rising: "Builds for 16 hours" } } })).toContain("sketch-number");
  });
  it("a digit in the alt text", () => {
    expect(rules({ ...good(), words: { alt: "A line that rises by 3 units." } })).toContain("sketch-number");
  });
  it("a number anywhere in the spec", () => {
    expect(rules({ ...good(), peak: 0.8 })).toContain("sketch-number");
  });
  it("a field that would give it a value or bind it to a fact", () => {
    expect(rules({ ...good(), ticks: ["morning"] })).toContain("sketch-number");
    expect(rules({ ...good(), facts: { level: "half_life" } })).toContain("sketch-number");
  });
});

describe("a sketch without a reviewed concept fails", () => {
  it("no concept named", () => {
    const rest: Record<string, unknown> = good();
    delete rest.concept;
    expect(rules(rest)).toContain("sketch-concept");
  });
  it("a concept that does not exist", () => {
    expect(messages({ ...good(), concept: "melatonin" })).toMatch(/no content\/concepts\/melatonin\.json/);
  });
  it("a concept the owner has not reviewed", () => {
    expect(messages({ ...good(), concept: "post-meal-blood-sugar" })).toMatch(/has not been reviewed by the owner/);
  });
  it("a concept that fails its own checks", () => {
    expect(rules({ ...good(), concept: "broken" })).toContain("sketch-concept");
  });
});

describe("a sketch in orange fails", () => {
  it("an orange ink", () => {
    expect(rules({ ...good(), ink: "signal-evidence-fill" })).toContain("sketch-colour");
    expect(rules({ ...good(), ink: "orange" })).toContain("sketch-colour");
  });
  it("any word naming the finding's colours", () => {
    expect(rules({ ...good(), words: { ...good().words, fill: "var(--signal-evidence-fill)" } })).toContain("sketch-colour");
    expect(rules({ ...good(), words: { ...good().words, wash: "peach" } })).toContain("sketch-colour");
  });
  it("the retired sage wash is not a sketch ink either", () => {
    expect(rules({ ...good(), ink: "sage" })).toContain("sketch-colour");
  });
});

describe("the look", () => {
  it("the tag must read exactly \"Sketch, not data\"", () => {
    expect(rules({ ...good(), tag: "Shape only, not data" })).toContain("sketch");
  });
  it("dotted, never solid or dashed", () => {
    expect(rules({ ...good(), stroke: "dashed" })).toContain("sketch");
  });
  it("alt text is required", () => {
    expect(rules({ ...good(), words: { labels: {} } })).toContain("sketch");
  });
});
