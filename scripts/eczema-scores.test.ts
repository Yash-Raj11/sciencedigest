/**
 * "Eczema score, start and end" (ceramide cream and cleanser), on the real gated draft.
 * Each test fails when its rule is broken. Each group's row has two measured dots, bound to its
 * printed start and day-28 scores, placed on one shared scale from the score's floor. The only
 * numbers drawn are those printed scores and the day. The glance view draws no number. Nothing is
 * dashed, and no range is drawn.
 *
 * The read is a draft (publishedAt null), so the test gates and assembles it from content/papers/.
 */

import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ECZEMA_FRAME, floorAt, peakOf, scoreAt } from "../components/figures/eczema-scores-layout";
import { FigureFor } from "../components/papers/registry";
import type { FigureRef, ResolvedFact } from "../lib/content/types";
import { assemble } from "../lib/pipeline/assemble";
import { REAL_COMMON, REAL_CONCEPTS, REAL_LIBRARY, REAL_STUDIES } from "../lib/pipeline/fixtures/real-context";
import { gate } from "../lib/pipeline/gate";

const SLUG = "ceramide-moisturizer-barrier";
const dir = `content/papers/${SLUG}`;
const gated = gate(JSON.parse(readFileSync(`${dir}/extraction.json`, "utf8")), readFileSync(`${dir}/source.txt`, "utf8"));
if (!gated.ok) throw new Error("the ceramide extraction no longer passes the gate");
const editorial = JSON.parse(readFileSync(`${dir}/editorial.json`, "utf8"));
const paper = assemble(gated.validated, editorial, { studies: REAL_STUDIES, concepts: REAL_CONCEPTS, common: REAL_COMMON, library: REAL_LIBRARY });
const figure = paper.content.layers!.mechanism.figure!;
const render = (params = figure.params, glance?: { x: string | null; y: string | null }) =>
  renderToStaticMarkup(createElement(FigureFor, { slug: SLUG, figure: { ...figure, params } as FigureRef, glance }));
const html = render();
const texts = (markup: string) => [...markup.matchAll(/<text[^>]*>([\s\S]*?)<\/text>/g)].map((m) => m[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
const dots = (markup: string) => [...markup.matchAll(/<g data-evidence="(\w+)" data-fact="(\w+)"><circle cx="([^"]+)"/g)]
  .map(([, kind, fact, cx]) => ({ kind, fact, cx: Number(cx) }));
const PEAK = 14.7;

describe("the eczema scores", () => {
  it("is the read's mechanism figure and its feed-card figure", () => {
    expect(figure.figure).toBe("eczema-scores");
    expect(editorial.glance.figure).toBe("eczema-scores");
  });

  it("draws two measured dots per group, bound to its printed start and day-28 scores", () => {
    expect(dots(html).map((d) => `${d.kind}:${d.fact}`)).toEqual([
      "measured:easi_active_0", "measured:easi_active_28", "measured:easi_placebo_0", "measured:easi_placebo_28",
    ]);
  });

  it("places every dot on one scale from the floor to the highest score", () => {
    const at = Object.fromEntries(dots(html).map((d) => [d.fact, d.cx]));
    expect(at.easi_active_0).toBeCloseTo(scoreAt(14.7, PEAK), 5);
    expect(at.easi_active_28).toBeCloseTo(scoreAt(8.25, PEAK), 5);
    expect(at.easi_placebo_0).toBeCloseTo(scoreAt(14.28, PEAK), 5);
    expect(at.easi_placebo_28).toBeCloseTo(scoreAt(7.84, PEAK), 5);
    expect(at.easi_active_0).toBeCloseTo(ECZEMA_FRAME.left + ECZEMA_FRAME.width - ECZEMA_FRAME.dot, 5);
  });

  it("the only numbers drawn are the printed scores and the day", () => {
    expect(texts(html).join(" ").match(/\d+(?:\.\d+)?/g)).toEqual(["28", "14.7", "8.25", "28", "14.28", "7.84", "28"]);
  });

  it("the glance view draws the same dots with no number at all", () => {
    const card = render(figure.params, { x: "Eczema score", y: null });
    expect(texts(card).join(" ")).not.toMatch(/\d/);
    expect(dots(card)).toHaveLength(4);
  });

  it("nothing is dashed, no range is drawn, and the orange is the ceramide set only", () => {
    expect(html).not.toMatch(/stroke-dasharray|data-range/);
    expect(html.match(/fill="var\(--signal-evidence-fill\)"/g)).toHaveLength(1);
  });

  it("refuses to draw a result as proposed, or a limitation as measured", () => {
    const params = figure.params as { rows: { end: { kind: string; fact: ResolvedFact } }[] };
    const swap = (end: unknown) => ({ ...figure.params, rows: [{ ...params.rows[0], end }, ...params.rows.slice(1)] });
    expect(() => render(swap({ ...params.rows[0].end, kind: "proposed" }))).toThrow(/proposed element cites the sentence/);
    expect(() => render(swap({ kind: "measured", fact: paper.content.facts.limit_short }))).toThrow(/not a result/);
  });
});

describe("the eczema scores layout", () => {
  it("starts the scale at the floor and ends it at the peak, inside the frame", () => {
    expect(scoreAt(0, 10)).toBe(floorAt());
    expect(scoreAt(10, 10)).toBe(ECZEMA_FRAME.left + ECZEMA_FRAME.width - ECZEMA_FRAME.dot);
  });

  it("refuses nothing to scale by, and a score that is not one", () => {
    expect(() => peakOf([0])).toThrow(/no positive score/);
    expect(() => scoreAt(Number.NaN, 10)).toThrow(/not a score/);
  });
});
