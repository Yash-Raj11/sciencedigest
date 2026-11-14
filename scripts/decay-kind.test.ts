/**
 * The "decay" figure kind, drawn to markup: one component, two modes, and H12.
 */

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { decayPaths, decayPlace, estimateAtBed, gapWords, halfGoneWords, halfLifeRange, halvings, hoursUntil } from "../components/figures/decay-layout";
import { Decay } from "../components/figures/kinds/Decay";
import { ESTIMATE_LABEL } from "../lib/content/figure-kinds";
import type { ResolvedFact } from "../lib/content/types";
import { amountLeftRange } from "../lib/models/decay";

// A made-up fact for the test only. No read carries it.
const estimate = { outcome: "Half-life", measure: "mean", point: 4, ciLow: 2, ciHigh: 8, unit: "h", absolute: true, tier: "moderate" } as NonNullable<ResolvedFact["estimate"]>;
const withRange: ResolvedFact = { id: "half_life", kind: "estimate", label: "Half-life in the test", quote: "a test passage", estimate };
const pointOnly: ResolvedFact = { ...withRange, estimate: { ...estimate, ciLow: null, ciHigh: null } };
const noNumber: ResolvedFact = { id: "said", kind: "statement", label: "A sentence", quote: "a test passage" };
const sd: ResolvedFact = { ...pointOnly, estimate: { ...estimate, point: 5.15, ciLow: null, ciHigh: null }, spread: { kind: "sd", value: 1.21 } };

const draw = (mode: "card" | "full", halfLife: ResolvedFact, extra: Record<string, unknown> = {}) =>
  renderToStaticMarkup(createElement(Decay, { mode, halfLife, alt: "A line that falls by half at each step.", sourceLine: "From the paper", ...extra }));

describe("the decay kind", () => {
  it("card: the still curve and its band, drawn as measured from the fact, and no questions", () => {
    const html = draw("card", withRange);
    expect(html).toContain('data-mode="card"');
    expect(html).toContain('data-evidence="measured"');
    expect(html).toContain('data-fact="half_life"');
    expect(html).toContain("data-band");
    expect(html).not.toContain("<input");
    expect(html).not.toContain(ESTIMATE_LABEL);
  });

  it("full: the same chart, three labelled questions, a live answer, the H12 label and the source line", () => {
    const html = draw("full", withRange);
    const chart = (markup: string) => markup.match(/<svg[\s\S]*<\/svg>/)![0];
    expect(chart(html)).toBe(chart(draw("card", withRange)));
    expect(html.match(/<input/g)).toHaveLength(3);
    expect(html.match(/<label/g)).toHaveLength(3);
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain(ESTIMATE_LABEL.replace("'", "&#x27;"));
    expect(html).toContain("From the paper.");
    expect(html).not.toContain("data-marker");
  });

  it("no dose presets: the amount starts empty and is the reader's own; nothing is filled in", () => {
    const html = draw("full", sd);
    expect(html).toContain("Your amount (mg)");
    expect(html).not.toMatch(/<button/);
    for (const input of html.match(/<input[^>]*>/g)!) expect(input).toContain('value=""');
  });

  it("the paper's own finding sits beside the result, in its own box", () => {
    const html = draw("full", sd, { beside: createElement("p", null, "What this paper found") });
    expect(html).toContain("data-beside");
    expect(html).toContain("What this paper found");
    expect(draw("full", sd)).not.toContain("data-beside");
  });

  it("H12: a fact with no range gives the still chart and no simulator", () => {
    const html = draw("full", pointOnly);
    expect(html).toContain("<path");
    expect(html).not.toContain("data-band");
    expect(html).not.toContain("<input");
    expect(html).not.toContain("data-simulator");
    expect(halfLifeRange(pointOnly)).toBeNull();
  });

  it("ruling C: an SD fact gives mean ± 1 SD under its own label, and the figure says which spread it used", () => {
    expect(halfLifeRange(sd)).toEqual({ low: 3.94, high: 6.36, kind: "sd", label: "typical spread between people in this study" });
    const html = draw("full", sd);
    expect(html).toContain("data-simulator");
    expect(html).toContain("3.94 h to 6.36 h, the typical spread between people in this study");
    expect(html).toContain("Half of it is gone 3.94 to 6.36 h after you take it.");
    expect(draw("full", withRange)).toContain("the range for the study average");
  });

  it("a fact with no number draws nothing at all", () => {
    expect(draw("full", noNumber)).toBe("");
    expect(draw("card", noNumber)).toBe("");
  });
});

describe("the sums behind it", () => {
  it("hours from the dose to bed: a bedtime at or before the dose is the next day; an empty field is no answer", () => {
    expect(hoursUntil("16:00", "23:00")).toBe(7);
    expect(hoursUntil("16:30", "23:00")).toBe(6.5);
    expect(hoursUntil("23:00", "01:00")).toBe(2);
    expect(hoursUntil("08:00", "08:00")).toBe(24);
    expect(hoursUntil("", "23:00")).toBeNull();
    expect(hoursUntil("16:00", "25:00")).toBeNull();
    expect(gapWords(6.5)).toBe("6 h 30 min");
    expect(gapWords(7)).toBe("7 h");
  });

  it("the worked example of SIMULATORS.md section i: 95 mg at 4 pm, bed at 11 pm, about 28 to 44 mg", () => {
    const band = halfLifeRange(sd)!;
    const at = estimateAtBed("95", "16:00", "23:00", band)!;
    expect(at.amountWords).toBe("28 to 44");
    expect(at.percentWords).toBe("29% to 47%");
    const model = amountLeftRange(95, 7, band);
    expect(Math.round(model.low)).toBe(28);
    expect(Math.round(model.high)).toBe(44);
    expect(at.share.low).toBeLessThan(at.share.high);
  });

  it("nothing until both times are given; without an amount, a share of the dose", () => {
    const band = halfLifeRange(sd)!;
    expect(estimateAtBed("95", "", "23:00", band)).toBeNull();
    expect(estimateAtBed("95", "16:00", "", band)).toBeNull();
    const shareOnly = estimateAtBed("", "16:00", "23:00", band)!;
    expect(shareOnly.amountWords).toBeNull();
    expect(shareOnly.percentWords).toBe("29% to 47%");
    expect(estimateAtBed("abc", "16:00", "23:00", band)!.amountWords).toBeNull();
    expect(estimateAtBed("-5", "16:00", "23:00", band)!.amountWords).toBeNull();
  });

  it("places by calculation: ticks at each halving, the band between the fast and the slow end", () => {
    const { times, levels } = halvings(4);
    expect(times).toEqual([0, 4, 8, 12, 16]);
    expect(levels).toEqual([1, 0.5, 0.25, 0.125, 0.0625]);
    const place = decayPlace(4);
    expect(place.x(8)! - place.x(0)!).toBeCloseTo(2 * (place.x(4)! - place.x(0)!), 10);
    expect(place.x(17)).toBeNull();
    expect(place.y(1)).toBeLessThan(place.y(0.5));
    expect(decayPaths(4, null).area).toBeNull();
    expect(decayPaths(4, { low: 2, high: 8 }).area).toMatch(/^M.*Z$/);
    expect(halfGoneWords({ low: 2, high: 8 })).toBe("Half of it is gone 2 to 8 h after you take it.");
  });
});
