/**
 * Ruling C: a simulator's band comes from the spread the paper printed, under that spread's
 * own label, and an SD is never turned into a CI or the reverse.
 */

import { describe, expect, it } from "vitest";
import { SPREAD_LABEL, simulatorBand } from "./spread";

describe("simulatorBand", () => {
  it("an SD fact gives mean ± 1 SD: 5.15 ± 1.21 h → 3.94 to 6.36 h, typical spread between people", () => {
    expect(simulatorBand({ point: 5.15, ciLow: null, ciHigh: null, spread: { kind: "sd", value: 1.21 } }))
      .toEqual({ low: 3.94, high: 6.36, kind: "sd", label: "typical spread between people in this study" });
  });

  it("a CI fact keeps its own ends and its own label (no SD is worked out from it)", () => {
    expect(simulatorBand({ point: 5.15, ciLow: 4.47, ciHigh: 5.83 }))
      .toEqual({ low: 4.47, high: 5.83, kind: "ci95", label: "range for the study average" });
    expect(simulatorBand({ point: 5.15, ciLow: null, ciHigh: null, spread: { kind: "ci95", low: 4.47, high: 5.83 } })?.label).toBe(SPREAD_LABEL.ci95);
  });

  it("an SD wins over a printed CI: the person's spread, not the average's", () => {
    expect(simulatorBand({ point: 5.15, ciLow: 4.47, ciHigh: 5.83, spread: { kind: "sd", value: 1.21 } })).toMatchObject({ low: 3.94, high: 6.36, kind: "sd" });
  });

  it("a range and an IQR are labelled as such", () => {
    expect(simulatorBand({ point: 23, ciLow: null, ciHigh: null, spread: { kind: "range", low: 22, high: 35 } })).toEqual({ low: 22, high: 35, kind: "range", label: "range in this study" });
    expect(simulatorBand({ point: 23, ciLow: null, ciHigh: null, spread: { kind: "iqr", low: 21, high: 27 } })?.label).toBe("middle half of people in this study");
  });

  it("no spread, a bad SD or reversed ends: no band, so no simulator (H12)", () => {
    expect(simulatorBand({ point: 5.15, ciLow: null, ciHigh: null })).toBeNull();
    expect(simulatorBand({ point: 5.15, ciLow: null, ciHigh: null, spread: { kind: "sd", value: 0 } })).toBeNull();
    expect(simulatorBand({ point: null, ciLow: null, ciHigh: null, spread: { kind: "sd", value: 1.21 } })).toBeNull();
    expect(simulatorBand({ point: 5, ciLow: null, ciHigh: null, spread: { kind: "range", low: 9, high: 2 } })).toBeNull();
  });
});
