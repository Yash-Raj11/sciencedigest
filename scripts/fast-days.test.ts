/**
 * "Food eaten per day" (alternate-day fasting), on the real gated draft.
 * Each test fails when its rule is broken. The fasting group's row alternates measured fast-day
 * and feed-day bars; the control group's row repeats one measured bar. All bars share one scale,
 * so each height is its printed amount over the largest. The only numbers drawn are the printed
 * amounts. The glance view draws no number. Nothing is dashed, and no range is drawn.
 *
 * The read is a draft (publishedAt null), so the test gates and assembles it from content/papers/.
 */

import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { FAST_DAYS_FRAME, barHeight, dayBar, isFastDay, peakOf } from "../components/figures/fast-days-layout";
import { FigureFor } from "../components/papers/registry";
import type { FigureRef, ResolvedFact } from "../lib/content/types";
import { assemble } from "../lib/pipeline/assemble";
import { REAL_COMMON, REAL_CONCEPTS, REAL_LIBRARY, REAL_STUDIES } from "../lib/pipeline/fixtures/real-context";
import { gate } from "../lib/pipeline/gate";

const SLUG = "alternate-day-fasting-weight";
const dir = `content/papers/${SLUG}`;
const gated = gate(JSON.parse(readFileSync(`${dir}/extraction.json`, "utf8")), readFileSync(`${dir}/source.txt`, "utf8"));
if (!gated.ok) throw new Error("the alternate-day fasting extraction no longer passes the gate");
const editorial = JSON.parse(readFileSync(`${dir}/editorial.json`, "utf8"));
const paper = assemble(gated.validated, editorial, { studies: REAL_STUDIES, concepts: REAL_CONCEPTS, common: REAL_COMMON, library: REAL_LIBRARY });
const figure = paper.content.layers!.mechanism.figure!;
const render = (params = figure.params, glance?: { x: string | null; y: string | null }) =>
  renderToStaticMarkup(createElement(FigureFor, { slug: SLUG, figure: { ...figure, params } as FigureRef, glance }));
const html = render();
const texts = (markup: string) => [...markup.matchAll(/<text[^>]*>([\s\S]*?)<\/text>/g)].map((m) => m[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
const bars = (markup: string) => [...markup.matchAll(/<g data-evidence="(\w+)" data-fact="(\w+)"><rect x="([^"]+)" y="[^"]+" width="[^"]+" height="([^"]+)"/g)]
  .map(([, kind, fact, x, height]) => ({ kind, fact, x: Number(x), height: Number(height) }));
const DAYS = FAST_DAYS_FRAME.days;

describe("the fast days", () => {
  it("is the read's mechanism figure and its feed-card figure", () => {
    expect(figure.figure).toBe("fast-days");
    expect(editorial.glance.figure).toBe("fast-days");
  });

  it("alternates measured fast-day and feed-day bars, then repeats the control bar", () => {
    const drawn = bars(html).map((b) => `${b.kind}:${b.fact}`);
    const fasting = Array.from({ length: DAYS }, (_, i) => (i % 2 === 0 ? "measured:fast_w12" : "measured:feed_w12"));
    expect(drawn).toEqual([...fasting, ...Array(DAYS).fill("measured:ctrl_w12")]);
  });

  it("draws every bar on one scale: its printed amount over the largest", () => {
    const tall = FAST_DAYS_FRAME.row.tall;
    const byFact = Object.fromEntries(bars(html).map((b) => [b.fact, b.height]));
    expect(byFact.feed_w12).toBeCloseTo(tall, 5);
    expect(byFact.fast_w12).toBeCloseTo((489 / 1856) * tall, 5);
    expect(byFact.ctrl_w12).toBeCloseTo((1790 / 1856) * tall, 5);
  });

  it("the only numbers drawn are the printed amounts", () => {
    expect(texts(html).join(" ").match(/\d+(?:\.\d+)?/g)).toEqual(["489", "1856", "1790"]);
  });

  it("the glance view draws the same bars with no number at all", () => {
    const card = render(figure.params, { x: "Days", y: null });
    expect(texts(card).join(" ")).not.toMatch(/\d/);
    expect(bars(card)).toHaveLength(DAYS * 2);
  });

  it("nothing is dashed, no range is drawn, and the orange is the fasting group only", () => {
    expect(html).not.toMatch(/stroke-dasharray|data-range/);
    expect(html.match(/fill="var\(--signal-evidence-fill\)"/g)).toHaveLength(DAYS);
  });

  it("refuses to draw a result as proposed, or a limitation as measured", () => {
    const params = figure.params as { fasting: { fast: { kind: string; fact: ResolvedFact } } };
    const swap = (fast: unknown) => ({ ...figure.params, fasting: { ...params.fasting, fast } });
    expect(() => render(swap({ ...params.fasting.fast, kind: "proposed" }))).toThrow(/proposed element cites the sentence/);
    expect(() => render(swap({ kind: "measured", fact: paper.content.facts.limit_small }))).toThrow(/not a result/);
  });
});

describe("the fast days layout", () => {
  it("starts on a fast day and alternates", () => {
    expect([0, 1, 2, 3].map(isFastDay)).toEqual([true, false, true, false]);
  });

  it("fills the width with equal bars", () => {
    const last = dayBar(DAYS - 1);
    expect(dayBar(0).x).toBe(FAST_DAYS_FRAME.left);
    expect(last.x + last.width).toBeCloseTo(FAST_DAYS_FRAME.left + FAST_DAYS_FRAME.width, 5);
  });

  it("refuses nothing to scale by, and an amount that is not one", () => {
    expect(() => peakOf([0, 0])).toThrow(/no positive amount/);
    expect(() => barHeight(Number.NaN, 10)).toThrow(/not an amount/);
    expect(barHeight(5, 10)).toBeCloseTo(FAST_DAYS_FRAME.row.tall / 2, 5);
  });
});
