import { describe, expect, it } from "vitest";
import { mergeExtractions, splitSource, tokensOf } from "./chunks";
import type { RawExtraction } from "./extraction";

const paragraph = (i: number) => `Paragraph ${i}. ${"Words in a sentence. ".repeat(40)}`;
const source = Array.from({ length: 30 }, (_, i) => paragraph(i)).join("\n\n");

describe("splitSource", () => {
  it("never drops or changes a character, and keeps each part under the limit", () => {
    const parts = splitSource(source, 4000);
    expect(parts.length).toBeGreaterThan(1);
    expect(parts.join("")).toBe(source);
    for (const part of parts) expect(part.length).toBeLessThanOrEqual(4000);
  });
  it("cuts at a paragraph break when it can", () => {
    for (const part of splitSource(source, 4000).slice(1)) expect(part.startsWith("\n\nParagraph")).toBe(true);
  });
  it("returns the source whole when it fits, and cuts hard text with no breaks", () => {
    expect(splitSource(source, source.length)).toEqual([source]);
    expect(splitSource("x".repeat(2500), 1000).join("")).toBe("x".repeat(2500));
  });
  it("estimates tokens on the high side", () => expect(tokensOf("a".repeat(350))).toBe(100));
});

const leaf = (value: string, quote: string | null) => ({ value, quote });
const part = (facts: RawExtraction["facts"], design = leaf("rct", null)): RawExtraction => ({
  identifiers: { doi: "10.1000/x", pmid: null, pmcid: null, title: "T", authors: "A", journal: "J", year: 2024, citation: "A, J 2024" },
  license: "CC BY 4.0", design, species: leaf("human", null), population: leaf("adults", null), sampleSize: leaf("10", null), facts,
});
const fact = (id: string, quote: string, gradeRef: string | null = null) => ({
  id, kind: "estimate" as const, label: id, value: id, quote,
  estimate: { outcome: "o", measure: "MD" as const, point: 1, ciLow: null, ciHigh: null, unit: "h", gradeRef },
}) as unknown as RawExtraction["facts"][number];

describe("mergeExtractions", () => {
  it("keeps a repeated fact once, renames a clash with its gradeRef, and takes study fields from the part that quotes them", () => {
    const { merged, notes } = mergeExtractions([
      part([fact("half_life", "q1"), fact("grade", "g1")]),
      part([fact("half_life", "q1"), fact("grade", "g2"), fact("other", "q3", "grade")], leaf("rct", "We randomised.")),
    ]);
    expect(merged.facts.map((f) => f.id)).toEqual(["half_life", "grade", "grade_2", "other"]);
    expect(merged.facts.find((f) => f.id === "other")!.estimate!.gradeRef).toBe("grade_2");
    expect(merged.design.quote).toBe("We randomised.");
    expect(notes).toHaveLength(2);
  });
});
