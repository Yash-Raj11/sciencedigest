/**
 * The "decay" figure kind, drawn to markup: one component, two modes, and H12.
 */

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { decayPlace, estimateLeft, halfLifeRange, halvings } from "../components/figures/decay-layout";
import { Decay } from "../components/figures/kinds/Decay";
import { ESTIMATE_LABEL } from "../lib/content/figure-kinds";
import type { ResolvedFact } from "../lib/content/types";
import { amountLeftRange } from "../lib/models/decay";

// A made-up fact for the test only. No read carries it.
const estimate = { outcome: "Half-life", measure: "mean", point: 4, ciLow: 2, ciHigh: 8, unit: "h", absolute: true, tier: "moderate" } as NonNullable<ResolvedFact["estimate"]>;
const withRange: ResolvedFact = { id: "half_life", kind: "estimate", label: "Half-life in the test", quote: "a test passage", estimate };
const pointOnly: ResolvedFact = { ...withRange, estimate: { ...estimate, ciLow: null, ciHigh: null } };
const noNumber: ResolvedFact = { id: "said", kind: "statement", label: "A sentence", quote: "a test passage" };

const draw = (mode: "card" | "full", halfLife: ResolvedFact) =>
  renderToStaticMarkup(createElement(Decay, { mode, halfLife, alt: "A line that falls by half at each step.", sourceLine: "From the paper" }));

describe("the decay kind", () => {
  it("card: the still curve, drawn as measured from the fact, and no questions", () => {
    const html = draw("card", withRange);
    expect(html).toContain('data-mode="card"');
    expect(html).toContain('data-evidence="measured"');
    expect(html).toContain('data-fact="half_life"');
    expect(html).not.toContain("<input");
    expect(html).not.toContain(ESTIMATE_LABEL);
  });

  it("full: the same chart, two labelled questions, a live answer, the H12 label and the source line", () => {
    const html = draw("full", withRange);
    const chart = (markup: string) => markup.match(/<polyline[^>]*>/)![0];
    expect(chart(html)).toBe(chart(draw("card", withRange)));
    expect(html.match(/<input/g)).toHaveLength(2);
    expect(html.match(/<label/g)).toHaveLength(2);
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain(ESTIMATE_LABEL.replace("'", "&#x27;"));
    expect(html).toContain("From the paper: Half-life in the test");
    expect(html).not.toContain("data-marker");
  });

  it("H12: a fact with no range gives the still chart and no simulator", () => {
    const html = draw("full", pointOnly);
    expect(html).toContain("<polyline");
    expect(html).not.toContain("<input");
    expect(html).not.toContain("data-simulator");
    expect(halfLifeRange(pointOnly)).toBeNull();
  });

  it("ruling C: an SD fact gives mean ± 1 SD under its own label, and the figure says which spread it used", () => {
    const sd: ResolvedFact = { ...pointOnly, estimate: { ...estimate, point: 5.15, ciLow: null, ciHigh: null }, spread: { kind: "sd", value: 1.21 } };
    expect(halfLifeRange(sd)).toEqual({ low: 3.94, high: 6.36, kind: "sd", label: "typical spread between people in this study" });
    const html = draw("full", sd);
    expect(html).toContain("data-simulator");
    expect(html).toContain("3.94 h to 6.36 h, the typical spread between people in this study");
    expect(draw("full", withRange)).toContain("the range for the study average");
  });

  it("a fact with no number draws nothing at all", () => {
    expect(draw("full", noNumber)).toBe("");
    expect(draw("card", noNumber)).toBe("");
  });

  it("the estimate is a range from the fact's range, and nothing until both answers are given", () => {
    const range = halfLifeRange(withRange)!;
    expect(range).toEqual({ low: 2, high: 8, kind: "ci95", label: "range for the study average" });
    expect(estimateLeft("", "4", range)).toBeNull();
    expect(estimateLeft("200", "", range)).toBeNull();
    expect(estimateLeft("abc", "4", range)).toBeNull();
    expect(estimateLeft("200", "-1", range)).toBeNull();
    const left = estimateLeft("200", "4", range)!;
    const model = amountLeftRange(200, 4, range);
    expect(left.words).toBe(`${Math.round(model.low)} to ${Math.round(model.high)}`);
    expect(left.words).toBe("50 to 141");
    expect(left.share.low).toBeLessThan(left.share.high);
  });

  it("places by calculation: dots at each halving, the marker where the hours put it", () => {
    const { times, levels } = halvings(4);
    expect(times).toEqual([0, 4, 8, 12, 16]);
    expect(levels).toEqual([1, 0.5, 0.25, 0.125, 0.0625]);
    const place = decayPlace(4);
    expect(place.x(8)! - place.x(0)!).toBeCloseTo(2 * (place.x(4)! - place.x(0)!), 10);
    expect(place.x(17)).toBeNull();
    expect(place.y(1)).toBeLessThan(place.y(0.5));
  });
});
