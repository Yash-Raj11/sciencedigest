/**
 * "Same wake time, later bedtime" (sleep restriction and sweet foods), on the real gated draft.
 * Each test fails when its rule is broken. Two measured bars, bound to each schedule's printed
 * hours of sleep, run from the printed time of falling asleep to the printed wake time on one
 * night strip. The only numbers drawn are those printed times and hours. The glance view draws
 * no number. Nothing is dashed.
 *
 * The read is a draft (publishedAt null), so the test gates and assembles it from content/papers/.
 */

import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { hourOf, midnightAt, nightAt } from "../components/figures/bedtimes-layout";
import { FigureFor } from "../components/papers/registry";
import type { FigureRef, ResolvedFact } from "../lib/content/types";
import { assemble } from "../lib/pipeline/assemble";
import { REAL_COMMON, REAL_CONCEPTS, REAL_LIBRARY, REAL_STUDIES } from "../lib/pipeline/fixtures/real-context";
import { gate } from "../lib/pipeline/gate";

const SLUG = "sleep-restriction-sweet-foods";
const dir = `content/papers/${SLUG}`;
const gated = gate(JSON.parse(readFileSync(`${dir}/extraction.json`, "utf8")), readFileSync(`${dir}/source.txt`, "utf8"));
if (!gated.ok) throw new Error("the sleep restriction extraction no longer passes the gate");
const editorial = JSON.parse(readFileSync(`${dir}/editorial.json`, "utf8"));
const paper = assemble(gated.validated, editorial, { studies: REAL_STUDIES, concepts: REAL_CONCEPTS, common: REAL_COMMON, library: REAL_LIBRARY });
const figure = paper.content.layers!.mechanism.figure!;
const render = (params = figure.params, glance?: { x: string | null; y: string | null }) =>
  renderToStaticMarkup(createElement(FigureFor, { slug: SLUG, figure: { ...figure, params } as FigureRef, glance }));
const html = render();
const texts = (markup: string) => [...markup.matchAll(/<text[^>]*>([\s\S]*?)<\/text>/g)].map((m) => m[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
const bars = (markup: string) => [...markup.matchAll(/<g data-evidence="(\w+)" data-fact="(\w+)"><rect x="([^"]+)" y="[^"]+" width="([^"]+)"/g)]
  .map(([, kind, fact, x, width]) => ({ kind, fact, x: Number(x), width: Number(width) }));

describe("the bedtimes", () => {
  it("is the read's mechanism figure and its feed-card figure", () => {
    expect(figure.figure).toBe("bedtimes");
    expect(editorial.glance.figure).toBe("bedtimes");
  });

  it("draws two measured bars, bound to each schedule's hours of sleep", () => {
    expect(bars(html).map((b) => `${b.kind}:${b.fact}`)).toEqual(["measured:sleep_sr", "measured:sleep_hs"]);
  });

  it("runs each bar from the printed time of falling asleep to the printed wake time", () => {
    const [short, long] = bars(html);
    expect(short.x).toBeCloseTo(nightAt(hourOf("0:34")), 5);
    expect(short.x + short.width).toBeCloseTo(nightAt(hourOf("7:12")), 5);
    expect(long.x).toBeCloseTo(nightAt(hourOf("22:06")), 5);
    expect(long.x + long.width).toBeCloseTo(nightAt(hourOf("7:11")), 5);
    expect(long.x).toBeLessThan(midnightAt());
    expect(short.x).toBeGreaterThan(midnightAt());
  });

  it("the only numbers drawn are the printed times and hours", () => {
    expect(texts(html).join(" ").match(/\d+(?:[.:]\d+)?/g)).toEqual(["0:34", "7:12", "6.7", "6.5", "22:06", "7:11", "9.1", "10"]);
  });

  it("the glance view draws the same bars with no number at all", () => {
    const card = render(figure.params, { x: "Night", y: null });
    expect(texts(card).join(" ")).not.toMatch(/\d/);
    expect(bars(card)).toHaveLength(2);
  });

  it("nothing is dashed, no range is drawn, and the orange is the two bars only", () => {
    expect(html).not.toMatch(/stroke-dasharray|data-range/);
    expect(html.match(/fill="var\(--signal-evidence-fill\)"/g)).toHaveLength(2);
  });

  it("refuses to draw a result as proposed, or a limitation as measured", () => {
    const params = figure.params as { rows: { slept: { kind: string; fact: ResolvedFact } }[] };
    const swap = (slept: unknown) => ({ ...figure.params, rows: [{ ...params.rows[0], slept }, ...params.rows.slice(1)] });
    expect(() => render(swap({ ...params.rows[0].slept, kind: "proposed" }))).toThrow(/proposed element cites the sentence/);
    expect(() => render(swap({ kind: "measured", fact: paper.content.facts.limit_small }))).toThrow(/not a result/);
  });

  it("refuses a time that is not a clock time", () => {
    const params = figure.params as { rows: { onset: { text: string; ref: string } }[] };
    const bad = { ...figure.params, rows: [{ ...params.rows[0], onset: { ...params.rows[0].onset, text: "after midnight" } }, ...params.rows.slice(1)] };
    expect(() => render(bad)).toThrow(/not a clock time/);
  });
});

describe("the bedtimes layout", () => {
  it("reads a printed clock time", () => {
    expect(hourOf("0:34")).toBeCloseTo(34 / 60, 5);
    expect(hourOf("22:06")).toBeCloseTo(22.1, 5);
  });

  it("runs the night from the evening, through midnight, to the morning", () => {
    expect(nightAt(21)).toBe(4);
    expect(nightAt(9)).toBe(316);
    expect(midnightAt()).toBeCloseTo(4 + (3 / 12) * 312, 5);
    expect(nightAt(22)).toBeLessThan(nightAt(1));
    expect(nightAt(12)).toBe(316);
  });
});
