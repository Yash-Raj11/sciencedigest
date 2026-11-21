/**
 * Step 3B, "the energy ledger" (sleep extension and energy intake), on the real gated draft.
 * Each test fails when its rule is broken. The four bars are measured and bound to the
 * within-group changes in Table 2, on one scale, on the side the change went. The only numbers
 * drawn are those values and the two weight changes. The glance view draws no number at all.
 * Nothing is dashed, and the orange belongs to the four bars only.
 *
 * The read is a draft (publishedAt null), so it is not in content/generated: the test gates and
 * assembles it from content/papers/ the way the content build does.
 */

import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ledgerScale } from "../components/figures/ledger-layout";
import { FigureFor } from "../components/papers/registry";
import type { FigureRef, ResolvedFact } from "../lib/content/types";
import { assemble } from "../lib/pipeline/assemble";
import { REAL_COMMON, REAL_CONCEPTS, REAL_LIBRARY, REAL_STUDIES } from "../lib/pipeline/fixtures/real-context";
import { gate } from "../lib/pipeline/gate";

const SLUG = "sleep-extension-energy-intake";
const dir = `content/papers/${SLUG}`;
const gated = gate(JSON.parse(readFileSync(`${dir}/extraction.json`, "utf8")), readFileSync(`${dir}/source.txt`, "utf8"));
if (!gated.ok) throw new Error("the sleep extraction no longer passes the gate");
const editorial = JSON.parse(readFileSync(`${dir}/editorial.json`, "utf8"));
const paper = assemble(gated.validated, editorial, { studies: REAL_STUDIES, concepts: REAL_CONCEPTS, common: REAL_COMMON, library: REAL_LIBRARY });
const figure = paper.content.layers!.mechanism.figure!;
const render = (params = figure.params, glance?: { x: string | null; y: string | null }) =>
  renderToStaticMarkup(createElement(FigureFor, { slug: SLUG, figure: { ...figure, params } as FigureRef, glance }));
const html = render();
const texts = (markup: string) => [...markup.matchAll(/<text[^>]*>([\s\S]*?)<\/text>/g)].map((m) => m[1].replace(/<[^>]+>/g, " ").replace(/&#x27;|&#39;/g, "'").replace(/\s+/g, " ").trim());
const bars = (markup: string) => [...markup.matchAll(/<g data-evidence="(\w+)" data-fact="(\w+)" data-row="(\w+)">[\s\S]*?<rect x="([^"]+)" y="[^"]+" width="([^"]+)"/g)]
  .map(([, kind, fact, row, x, width]) => ({ kind, fact, row, x: Number(x), width: Number(width) }));
const zeroX = (markup: string) => Number(markup.match(/<line x1="([^"]+)"[^>]*data-no-change/)![1]);

describe("the energy ledger", () => {
  it("is the read's mechanism figure and its feed-card figure", () => {
    expect(figure.figure).toBe("energy-ledger");
    expect(editorial.glance.figure).toBe("energy-ledger");
  });

  it("draws four measured bars, each bound to a within-group change from Table 2", () => {
    expect(bars(html).map((b) => `${b.kind}:${b.fact}:${b.row}`)).toEqual([
      "measured:ei_ext_change:food", "measured:tee_ext_change:burned",
      "measured:ei_ctrl_change:food", "measured:tee_ctrl_change:burned",
    ]);
    expect(html).toMatch(/data-evidence="measured" data-fact="wt_ext_change" data-weight/);
    expect(html).toMatch(/data-evidence="measured" data-fact="wt_ctrl_change" data-weight/);
  });

  it("puts every bar on one scale, on the side its change went", () => {
    const zero = zeroX(html);
    const [extFood, extBurned, ctrlFood, ctrlBurned] = bars(html);
    // Less to the left of no change, more to the right.
    expect(extFood.x + extFood.width).toBeCloseTo(zero, 5);
    expect(extBurned.x + extBurned.width).toBeCloseTo(zero, 5);
    expect(ctrlFood.x).toBeCloseTo(zero, 5);
    expect(ctrlBurned.x).toBeCloseTo(zero, 5);
    // Twice the change is twice the length: 155.5 against 114.9, 46.7 against 7.2.
    expect(extFood.width / ctrlFood.width).toBeCloseTo(155.5 / 114.9, 3);
    expect(extBurned.width / ctrlBurned.width).toBeCloseTo(46.7 / 7.2, 3);
  });

  it("the only numbers drawn are the four bound changes and the two weight changes", () => {
    expect(texts(html).join(" ").match(/[+−]?\d+(?:\.\d+)?/g)).toEqual(["−155.5", "−46.7", "−0.48", "+114.9", "+7.2", "+0.39"]);
  });

  it("the glance view draws the same bars with no number at all", () => {
    const card = render(figure.params, { x: "Change from their usual weeks", y: null });
    expect(texts(card).join(" ")).not.toMatch(/\d/);
    expect(texts(card)).toContain("Change from their usual weeks");
    expect(bars(card)).toHaveLength(4);
    expect(card).not.toMatch(/data-weight/);
  });

  it("the rule between the groups clears every bar and the next group's name, in both views", () => {
    for (const markup of [html, render(figure.params, { x: "Change from their usual weeks", y: null })]) {
      const rule = Number(markup.match(/<line x1="0" x2="320" y1="([^"]+)"/)![1]);
      const rects = [...markup.matchAll(/<rect x="[^"]+" y="([^"]+)" width="[^"]+" height="([^"]+)"/g)].map(([, y, h]) => [Number(y), Number(y) + Number(h)]);
      expect(rects).toHaveLength(4);
      for (const [top, bottom] of rects) expect(rule < top - 2 || rule > bottom + 2).toBe(true);
      const name = Number(markup.match(/<text x="0" y="([^"]+)"[^>]*>Usual sleep/)![1]);
      expect(rule).toBeLessThan(name - 10.5 * 0.75 - 2);
    }
  });

  it("nothing is dashed, and the orange is the four bars only", () => {
    expect(html).not.toMatch(/stroke-dasharray/);
    expect(html.match(/fill="var\(--signal-evidence-fill\)"/g)).toHaveLength(4);
    expect(html).not.toMatch(/<text[^>]*fill="var\(--signal-evidence-text\)"/);
  });

  it("refuses to draw a result as proposed, or a limitation as measured", () => {
    const params = figure.params as { groups: { burned: { kind: string; fact: ResolvedFact } }[] };
    const swap = (burned: unknown) => ({ ...figure.params, groups: [{ ...params.groups[0], burned }, params.groups[1]] });
    expect(() => render(swap({ ...params.groups[0].burned, kind: "proposed" }))).toThrow(/proposed element cites the sentence/);
    const limitation = paper.content.facts.limit_dlw_precision;
    expect(() => render(swap({ kind: "measured", fact: limitation }))).toThrow(/not a result/);
  });
});

describe("ledgerScale", () => {
  const e = (point: number, ciLow: number | null, ciHigh: number | null) => ({ point, ciLow, ciHigh });

  it("runs from the lowest to the highest printed end, and always includes no change", () => {
    const at = ledgerScale([e(-155.5, -244.1, -66.9), e(114.9, 29.6, 200.2)]);
    expect(at(-244.1)).toBeCloseTo(46, 5);
    expect(at(200.2)).toBeCloseTo(274, 5);
    const allBelow = ledgerScale([e(-10, -20, -5)]);
    expect(allBelow(0)).toBeCloseTo(274, 5);
  });

  it("places twice the change at twice the distance from no change", () => {
    const at = ledgerScale([e(-100, null, null), e(100, null, null)]);
    expect(at(50) - at(0)).toBeCloseTo((at(100) - at(0)) / 2, 5);
  });
});
