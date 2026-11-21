/**
 * "When they ate, and what happened to insulin resistance" (time-restricted eating), on the real
 * gated draft. Each test fails when its rule is broken. Three measured bars, bound to each group's
 * printed HOMA-IR change, on one scale around no change, on the side the change went. The windows
 * are the trial's rule, drawn plain (never orange), at the hours the paper prints. No range is
 * drawn: the paper prints none. The glance view draws no number.
 *
 * The read is a draft (publishedAt null), so the test gates and assembles it from content/papers/.
 */

import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { changeScale, dayAt } from "../components/figures/windows-layout";
import { FigureFor } from "../components/papers/registry";
import type { FigureRef, ResolvedFact } from "../lib/content/types";
import { assemble } from "../lib/pipeline/assemble";
import { REAL_COMMON, REAL_CONCEPTS, REAL_LIBRARY, REAL_STUDIES } from "../lib/pipeline/fixtures/real-context";
import { gate } from "../lib/pipeline/gate";

const SLUG = "time-restricted-eating-healthy";
const dir = `content/papers/${SLUG}`;
const gated = gate(JSON.parse(readFileSync(`${dir}/extraction.json`, "utf8")), readFileSync(`${dir}/source.txt`, "utf8"));
if (!gated.ok) throw new Error("the time-restricted eating extraction no longer passes the gate");
const editorial = JSON.parse(readFileSync(`${dir}/editorial.json`, "utf8"));
const paper = assemble(gated.validated, editorial, { studies: REAL_STUDIES, concepts: REAL_CONCEPTS, common: REAL_COMMON, library: REAL_LIBRARY });
const figure = paper.content.layers!.mechanism.figure!;
const render = (params = figure.params, glance?: { x: string | null; y: string | null }) =>
  renderToStaticMarkup(createElement(FigureFor, { slug: SLUG, figure: { ...figure, params } as FigureRef, glance }));
const html = render();
const texts = (markup: string) => [...markup.matchAll(/<text[^>]*>([\s\S]*?)<\/text>/g)].map((m) => m[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
const bars = (markup: string) => [...markup.matchAll(/<g data-evidence="(\w+)" data-fact="(\w+)"><rect x="([^"]+)" y="[^"]+" width="([^"]+)"/g)]
  .map(([, kind, fact, x, width]) => ({ kind, fact, x: Number(x), width: Number(width) }));
const windows = (markup: string) => [...markup.matchAll(/<g data-window="[^"]*"><rect x="([^"]+)" y="[^"]+" width="([^"]+)"/g)].map(([, x, w]) => ({ x: Number(x), width: Number(w) }));
const zeroX = (markup: string) => Number(markup.match(/<line x1="([^"]+)"[^>]*data-no-change/)![1]);

describe("the eating windows", () => {
  it("is the read's mechanism figure and its feed-card figure", () => {
    expect(figure.figure).toBe("eating-windows");
    expect(editorial.glance.figure).toBe("eating-windows");
  });

  it("draws three measured bars, bound to each group's HOMA-IR change", () => {
    expect(bars(html).map((b) => `${b.kind}:${b.fact}`)).toEqual(["measured:homa_etrf", "measured:homa_mtrf", "measured:homa_ctrl"]);
  });

  it("puts every bar on one scale, on the side its change went, twice the change twice the length", () => {
    const zero = zeroX(html);
    const [early, mid, control] = bars(html);
    expect(early.x + early.width).toBeCloseTo(zero, 5);
    expect(mid.x).toBeCloseTo(zero, 5);
    expect(control.x + control.width).toBeCloseTo(zero, 5);
    expect(early.width / mid.width).toBeCloseTo(1.08 / 0.39, 3);
  });

  it("marks the two windows at the printed hours, and none for the control group", () => {
    expect(windows(html)).toEqual([
      { x: dayAt(6), width: dayAt(15) - dayAt(6) },
      { x: dayAt(11), width: dayAt(20) - dayAt(11) },
    ]);
    expect(texts(html)).toContain("No window: ate as usual");
  });

  it("the only numbers drawn are the printed hours and the three changes", () => {
    expect(texts(html).join(" ").match(/[+−-]?\d+(?:[.:]\d+)?/g)).toEqual(["6:00", "15:00", "−1.08", "11:00", "20:00", "+0.39", "−0.05"]);
  });

  it("the glance view draws the same strips and bars with no number at all", () => {
    const card = render(figure.params, { x: "Time of day", y: null });
    expect(texts(card).join(" ")).not.toMatch(/\d/);
    expect(bars(card)).toHaveLength(3);
    expect(windows(card)).toHaveLength(2);
  });

  it("nothing is dashed, no range is drawn, and the orange is the three bars only", () => {
    expect(html).not.toMatch(/stroke-dasharray|data-range/);
    expect(html.match(/fill="var\(--signal-evidence-fill\)"/g)).toHaveLength(3);
  });

  it("refuses to draw a result as proposed, or a limitation as measured", () => {
    const params = figure.params as { groups: { change: { kind: string; fact: ResolvedFact } }[] };
    const swap = (change: unknown) => ({ ...figure.params, groups: [{ ...params.groups[0], change }, ...params.groups.slice(1)] });
    expect(() => render(swap({ ...params.groups[0].change, kind: "proposed" }))).toThrow(/proposed element cites the sentence/);
    expect(() => render(swap({ kind: "measured", fact: paper.content.facts.limit_small }))).toThrow(/not a result/);
  });
});

describe("the windows layout", () => {
  it("places the day from midnight to midnight and keeps an hour inside it", () => {
    expect(dayAt(0)).toBe(0);
    expect(dayAt(24)).toBe(150);
    expect(dayAt(12)).toBe(75);
    expect(dayAt(30)).toBe(150);
  });

  it("centres no change and places twice the change at twice the distance", () => {
    const at = changeScale([-2, 1]);
    expect(at(1) - at(0)).toBeCloseTo((at(2) - at(0)) / 2, 5);
    expect(at(-2) - at(0)).toBeCloseTo(-(at(2) - at(0)), 5);
  });
});
