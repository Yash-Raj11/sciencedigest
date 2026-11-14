import { describe, expect, it } from "vitest";
import { amountLeft, amountLeftRange, decayCurve, fractionLeft } from "./decay";

describe("decay", () => {
  it("halves every half-life", () => {
    expect(fractionLeft(0, 5)).toBe(1);
    expect(fractionLeft(5, 5)).toBeCloseTo(0.5, 12);
    expect(fractionLeft(10, 5)).toBeCloseTo(0.25, 12);
    expect(amountLeft(200, 15, 5)).toBeCloseTo(25, 10);
  });

  it("gives a range from the half-life's range: the short end leaves least", () => {
    const left = amountLeftRange(200, 6, { low: 3, high: 6 });
    expect(left.low).toBeCloseTo(50, 10);
    expect(left.high).toBeCloseTo(100, 10);
    expect(left.low).toBeLessThan(left.high);
  });

  it("a half-life with no spread gives a range with no spread, never a wider one", () => {
    const left = amountLeftRange(100, 4, { low: 4, high: 4 });
    expect(left.low).toBe(left.high);
  });

  it("draws a curve that starts whole and only falls", () => {
    const points = decayCurve(5, 20, 8);
    expect(points).toHaveLength(9);
    expect(points[0]).toEqual({ hour: 0, share: 1 });
    expect(points.at(-1)!.hour).toBe(20);
    points.slice(1).forEach((p, i) => expect(p.share).toBeLessThan(points[i].share));
  });

  it("refuses what it cannot work out, so nothing is filled in", () => {
    expect(() => fractionLeft(1, 0)).toThrow(/half-life/);
    expect(() => fractionLeft(1, Number.NaN)).toThrow(/half-life/);
    expect(() => fractionLeft(-1, 5)).toThrow(/hours/);
    expect(() => amountLeft(-1, 1, 5)).toThrow(/amount/);
    expect(() => amountLeftRange(1, 1, { low: 6, high: 3 })).toThrow(/reversed/);
    expect(() => decayCurve(5, 20, 0)).toThrow(/step/);
  });
});
