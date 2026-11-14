/**
 * Amendment B to step 2D: every state the interactive grid can reach shows the
 * paper's own words, bound to a fact; and the grid is placed by calculation.
 */

import { describe, expect, it } from "vitest";
import { narrowestGap, timeScale } from "@/components/figures/scale";
import { freeContent } from "@/lib/content";
import { allCells, cellName, factAt, isFlagged, type Params } from "@/components/papers/turmeric-pepper-breakfast/figures/readings";

const read = freeContent("turmeric-pepper-breakfast")!;
const figure = read.layers!.protocol.figure!;
const p = figure.params as unknown as Params;

describe("the readings grid, in every state", () => {
  it("has one state for each meal at each reading", () => {
    expect(allCells(p)).toHaveLength(p.meals.length * p.times.length);
  });

  it("shows, in every state, a verbatim passage of a fact of this paper", () => {
    for (const cell of allCells(p)) {
      const fact = factAt(p, cell);
      expect(read.facts[fact.id], cellName(p, cell)).toBeDefined();
      expect(fact.quote).toBe(read.facts[fact.id].quote);
      expect(fact.quote.length).toBeGreaterThan(20);
      expect(fact.source, "a figure uses its own paper only").toBeUndefined();
    }
  });

  it("draws a reading as differing only where a result says so (solid orange = measured)", () => {
    const flagged = allCells(p).filter((cell) => isFlagged(p, cell));
    expect(flagged.length).toBeGreaterThan(0);
    for (const cell of flagged) {
      expect(["estimate", "finding"]).toContain(factAt(p, cell).kind);
      expect(cell.time).toBe(p.early.at.n);
    }
    // A reading with no result behind it never borrows the flagged result's passage.
    for (const cell of allCells(p).filter((c) => !isFlagged(p, c))) expect(factAt(p, cell).id).not.toBe(p.early.fact.id);
  });

  it("names every state from the params alone", () => {
    const names = allCells(p).map((cell) => cellName(p, cell));
    expect(new Set(names).size).toBe(names.length);
  });
});

describe("geometry comes from the fact values", () => {
  const times = p.times.map((time) => time.n);
  const at = timeScale(times, 27, 293);

  it("spaces the readings as the clock does: twice the minutes, twice the distance", () => {
    const sorted = [...times].sort((a, b) => a - b);
    for (let i = 1; i < sorted.length; i++) {
      for (let j = 1; j < sorted.length; j++) {
        const minutes = (sorted[i] - sorted[i - 1]) / (sorted[j] - sorted[j - 1]);
        const distance = (at(sorted[i]) - at(sorted[i - 1])) / (at(sorted[j]) - at(sorted[j - 1]));
        expect(distance).toBeCloseTo(minutes, 9);
      }
    }
    expect(at(0)).toBe(27);
    expect(at(Math.max(...times))).toBe(293);
  });

  it("moves when the fact moves", () => {
    const later = timeScale([...times.slice(0, -1), Math.max(...times) * 2], 27, 293);
    expect(later(times[1])).toBeCloseTo(27 + (at(times[1]) - 27) / 2, 9);
  });

  it("leaves a touch target of at least 44 px at a 360 px screen", () => {
    // The figure is 320 units wide and fills a 326 px column at 360 px (16 px gutters, 1 px borders).
    expect(narrowestGap(times, at) * (326 / 320)).toBeGreaterThanOrEqual(44);
  });
});
