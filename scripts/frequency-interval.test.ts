/**
 * The two shared figure layouts (owner, 2026-11-15). Each rule has a case that fails when it is
 * broken:
 *
 *   FrequencyGrid  N from the base rate; a dot is never rounded up; a half dot for a remainder
 *                  of a half or more (R5); the exact rate in the label; events fill from the
 *                  bottom right, a whole row first.
 *   IntervalPlot   baseline 0 for a difference, 1 for a ratio on a log scale; end labels are the
 *                  fact's own ends; overlapping end labels fall back to the range under the row.
 */

import { describe, expect, it } from "vitest";
import { eventDots, gridDots, gridSize, perWords } from "../components/figures/frequency-layout";
import { baselineOf, intervalLayout, scaleOf } from "../components/figures/interval-layout";

describe("FrequencyGrid", () => {
  it("N comes from the base rate: 100, or 1,000 when under one in a hundred, or none", () => {
    expect(gridSize(40.7)).toBe(100);
    expect(gridSize(1)).toBe(100);
    expect(gridSize(0.4)).toBe(1000);
    expect(gridSize(0.05)).toBeNull();
  });
  it("never rounds a dot up: 40.7 → 40 and a half dot, 14.1 → 14, 5.5 → 5 and a half dot", () => {
    expect(eventDots(40.7, 100)).toEqual({ whole: 40, half: true });
    expect(eventDots(14.1, 100)).toEqual({ whole: 14, half: false });
    expect(eventDots(5.5, 100)).toEqual({ whole: 5, half: true });
    expect(eventDots(5.49, 100)).toEqual({ whole: 5, half: false });
    // The picture never shows more events than were printed.
    for (const rate of [0.4, 5.5, 14.1, 40.7, 99.9]) {
      const { whole, half } = eventDots(rate, 100);
      expect(whole + (half ? 0.5 : 0)).toBeLessThanOrEqual(rate);
    }
  });
  it("events fill from the bottom right, the bottom row before the next", () => {
    const dots = gridDots(14.1, 100, { x: 0, y: 0, size: 100 });
    const events = dots.map((d, i) => (d.state === "event" ? i : -1)).filter((i) => i >= 0);
    expect(events).toEqual(Array.from({ length: 14 }, (_, k) => 86 + k));
    expect(dots.filter((d) => d.state === "half")).toHaveLength(0);
    const half = gridDots(5.5, 100, { x: 0, y: 0, size: 100 });
    expect(half.findIndex((d) => d.state === "half")).toBe(94);
    expect(half.filter((d) => d.state === "event")).toHaveLength(5);
  });
  it("the label keeps the exact printed rate", () => {
    expect(perWords(40.7, 100, "died")).toBe("40.7 died per 100");
    expect(perWords(5.5, 100, "died")).toBe("5.5 died per 100");
  });
});

describe("IntervalPlot", () => {
  const frame = { left: 0, width: 300, size: 13 };
  it("a difference has its baseline at 0, a ratio at 1", () => {
    expect(scaleOf("aRD")).toBe("difference");
    expect(scaleOf("WMD")).toBe("difference");
    expect(scaleOf("HR")).toBe("ratio");
    expect(scaleOf("OR")).toBe("ratio");
    expect(baselineOf("difference")).toBe(0);
    expect(baselineOf("ratio")).toBe(1);
  });
  it("a ratio is drawn on a log scale: a halving and a doubling sit the same distance from 1", () => {
    const { baseline, rows } = intervalLayout([{ point: 0.5, ciLow: 0.25, ciHigh: 1 }, { point: 2, ciLow: 1, ciHigh: 4 }], "ratio", frame);
    expect(Math.abs(rows[0].point - baseline)).toBeCloseTo(Math.abs(rows[1].point - baseline), 6);
  });
  it("end labels are the fact's own printed ends; mirrored rows drop the sign and keep the order on screen", () => {
    const plain = intervalLayout([{ point: 0.51, ciLow: 0.06, ciHigh: 0.95 }], "difference", frame).rows[0];
    expect([plain.lowText, plain.highText]).toEqual(["0.06", "0.95"]);
    const mirrored = intervalLayout([{ point: -14.9, ciLow: -18.8, ciHigh: -10.9 }], "difference", frame, { mirror: true }).rows[0];
    expect([mirrored.lowText, mirrored.highText]).toEqual(["10.9", "18.8"]);
    expect(mirrored.low!).toBeLessThan(mirrored.high!);
    expect(mirrored.pointText).toBe("14.9");
  });
  it("end labels that would overlap fall back to the range under the row", () => {
    const narrow = intervalLayout([{ point: 0.51, ciLow: 0.5, ciHigh: 0.52 }, { point: -3, ciLow: -4, ciHigh: 3 }], "difference", frame).rows[0];
    expect(narrow.endsFit).toBe(false);
    expect(narrow.rangeText).toBe("0.50 to 0.52");
    const wide = intervalLayout([{ point: -1.86, ciLow: -2.55, ciHigh: -1.18 }], "difference", frame).rows[0];
    expect(wide.endsFit).toBe(true);
  });
});
