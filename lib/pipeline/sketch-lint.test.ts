/**
 * The sketch rule inside the real lint (owner, 2026-11-15): a read that declares a sketch is
 * refused when the sketch carries a number, rests on an unreviewed concept, or is orange; and
 * passes when it keeps the rule. The rule itself: lib/content/sketch.test.ts.
 */

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { FIGURE_KEYS } from "../content/figures";
import { SKETCH_TAG } from "../content/sketch";
import type { Concept } from "./concepts";
import { gate } from "./gate";
import { REAL_LIBRARY, REAL_STUDIES } from "./fixtures/real-context";
import { lint, type LintContext } from "./lint";

const dir = new URL("../../content/papers/daytime-caffeine-sleep/", import.meta.url);
const source = readFileSync(new URL("source.txt", dir), "utf8");
const gated = gate(JSON.parse(readFileSync(new URL("extraction.json", dir), "utf8")), source);
if (!gated.ok) throw new Error(gated.errors.join("\n"));
const validated = gated.validated;
const editorial = JSON.parse(readFileSync(new URL("editorial.json", dir), "utf8"));

const adenosine: Concept = { term: "adenosine", plain: "A tiredness signal.", model: "Tokens that pile up.", reference: { doi: "10.1126/science.276.5316.1265", title: "t" }, reviewed_by_owner: false };
const withConcept = (reviewed: boolean): LintContext => ({
  studies: { ...REAL_STUDIES }, library: REAL_LIBRARY,
  concepts: { adenosine: { ok: true, concept: { ...adenosine, reviewed_by_owner: reviewed }, reviewed } },
});
// The read's own sketch, drawn by its mechanism figure ("sketch:tiredness-tokens"), changed per test.
const sketch = { id: "tiredness-tokens", concept: "adenosine", words: { alt: "Small dotted tokens: a sketch of the tiredness signal, not data.", labels: { signal: "Tiredness signal (adenosine). It builds up while you are awake." } }, tag: SKETCH_TAG, ink: "muted", stroke: "dotted" };

function sketchErrors(change: Record<string, unknown>, reviewed = true, edit: (ed: any) => void = () => {}): string[] {
  const ed = { ...JSON.parse(JSON.stringify(editorial)), sketches: [{ ...sketch, ...change }] };
  edit(ed);
  const report = lint(validated, ed, source, { context: withConcept(reviewed), figures: FIGURE_KEYS, allowLegacyShape: true });
  return report.errors.filter((e) => e.rule.startsWith("sketch")).map((e) => `[${e.rule}] ${e.where}`);
}

describe("sketches in the lint", () => {
  it("a sketch on a reviewed concept, shape only, passes", () => {
    expect(sketchErrors({})).toEqual([]);
  });
  it("a sketch with numbers fails", () => {
    expect(sketchErrors({ words: { alt: "Rises over 16 hours." } })).toContain("[sketch-number] sketches[0].words.alt");
  });
  it("a sketch without a reviewed concept fails", () => {
    expect(sketchErrors({}, false)).toEqual(["[sketch-concept] sketches[0].concept"]);
  });
  it("a figure that draws an undeclared sketch fails", () => {
    expect(sketchErrors({}, true, (ed) => { ed.figure.params.tokens = "sketch:made-up"; }))
      .toEqual(["[sketch] figure.params.tokens", "[sketch] sketches"]);
  });
  it("a declared sketch that no figure draws fails", () => {
    expect(sketchErrors({ id: "spare-shape" })).toEqual(["[sketch] figure.params.tokens", "[sketch] sketches"]);
    expect(sketchErrors({}, true, (ed) => { ed.sketches.push({ ...sketch, id: "spare-shape" }); })).toEqual(["[sketch] sketches"]);
  });
  it("a sketch in orange fails", () => {
    expect(sketchErrors({ ink: "signal-evidence-text" })).toContain("[sketch-colour] sketches[0].ink");
  });
});
