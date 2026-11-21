/**
 * "CRP: the first sugar minus the second" (sugar and inflammation markers), on the real gated
 * draft. Each test fails when its rule is broken. Two measured rows, bound to the review's two
 * pooled mean differences, each band at its printed 95% ends on one scale around no difference;
 * both cross it. One pastel band (the headline comparison). The only numbers drawn are the
 * printed differences, their ends, and each row's trials and people. The glance view draws none.
 *
 * The read is a draft (publishedAt null), so the test gates and assembles it from content/papers/.
 */

import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { sizeText } from "../components/figures/crp-gaps-layout";
import { FigureFor } from "../components/papers/registry";
import type { FigureRef } from "../lib/content/types";
import { assemble } from "../lib/pipeline/assemble";
import { REAL_COMMON, REAL_CONCEPTS, REAL_LIBRARY, REAL_STUDIES } from "../lib/pipeline/fixtures/real-context";
import { gate } from "../lib/pipeline/gate";

const SLUG = "sugar-inflammation-markers";
const dir = `content/papers/${SLUG}`;
const gated = gate(JSON.parse(readFileSync(`${dir}/extraction.json`, "utf8")), readFileSync(`${dir}/source.txt`, "utf8"));
if (!gated.ok) throw new Error("the sugar and inflammation extraction no longer passes the gate");
const editorial = JSON.parse(readFileSync(`${dir}/editorial.json`, "utf8"));
const paper = assemble(gated.validated, editorial, { studies: REAL_STUDIES, concepts: REAL_CONCEPTS, common: REAL_COMMON, library: REAL_LIBRARY });
const figure = paper.content.layers!.audit.figure!;
const render = (params = figure.params, glance?: { x: string | null; y: string | null }) =>
  renderToStaticMarkup(createElement(FigureFor, { slug: SLUG, figure: { ...figure, params } as FigureRef, glance }));
const html = render();
const card = render(figure.params, { x: "Difference in CRP", y: null });
const texts = (markup: string) => [...markup.matchAll(/<text[^>]*>([\s\S]*?)<\/text>/g)].map((m) => m[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim());
const rows = (markup: string) => [...markup.matchAll(/data-evidence="(\w+)" data-fact="(\w+)"/g)].map(([, kind, fact]) => `${kind}:${fact}`);
/** Each row's band: the first rect inside its fact group. */
const bands = (markup: string) => [...markup.matchAll(/data-fact="\w+"[^]*?<rect x="([^"]+)" y="[^"]+" width="([^"]+)"/g)].map(([, x, w]) => ({ low: Number(x), high: Number(x) + Number(w) }));
const baselines = (markup: string) => [...markup.matchAll(/<line x1="([^"]+)"[^>]*data-baseline/g)].map(([, x]) => Number(x));

describe("the CRP gaps", () => {
  it("is the read's audit figure and its feed-card figure", () => {
    expect(figure.figure).toBe("crp-gaps");
    expect(editorial.glance.figure).toBe("crp-gaps");
  });

  it("draws two measured rows, bound to the two pooled mean differences", () => {
    expect(rows(html)).toEqual(["measured:md_fru_glu", "measured:md_hfcs_suc"]);
    expect(rows(card)).toEqual(["measured:md_fru_glu", "measured:md_hfcs_suc"]);
  });

  it("every band crosses the no-difference line, as both printed ranges do", () => {
    for (const markup of [html, card]) {
      const zero = baselines(markup)[0];
      const drawn = bands(markup);
      expect(drawn).toHaveLength(2);
      for (const b of drawn) {
        expect(b.low).toBeLessThan(zero);
        expect(b.high).toBeGreaterThan(zero);
      }
    }
  });

  it("puts both rows on one scale: the wider printed range is the wider band", () => {
    const [fg, hs] = bands(card);
    expect((fg.high - fg.low) / (hs.high - hs.low)).toBeCloseTo((0.46 + 0.52) / (0.53 + 0.11), 2);
  });

  it("the only numbers drawn are the printed differences, ends, trials and people", () => {
    expect(texts(html).join(" ").match(/[+−-]?\d+(?:\.\d+)?/g)).toEqual(["−0.03", "6", "403", "−0.52", "0.46", "+0.21", "3", "677", "−0.11", "0.53"]);
    expect(sizeText(6, "trials", 403, "people")).toBe("6 trials, 403 people");
  });

  it("the glance view draws the same bands with no number at all", () => {
    expect(texts(card).join(" ")).not.toMatch(/\d/);
  });

  it("nothing is dashed, and the one pastel band is the headline comparison", () => {
    expect(html).not.toMatch(/stroke-dasharray/);
    expect(card).not.toMatch(/stroke-dasharray/);
    expect(card.match(/fill="var\(--signal-evidence-fill\)"/g)).toHaveLength(1);
    expect(card.indexOf("var(--signal-evidence-fill)")).toBeLessThan(card.indexOf('data-fact="md_hfcs_suc"'));
  });

  it("refuses to draw a limitation as a measured result", () => {
    const params = figure.params as { rows: Record<string, unknown>[] };
    const bad = { ...figure.params, rows: [{ ...params.rows[0], fact: paper.content.facts.limit_crp_only }, ...params.rows.slice(1)] };
    expect(() => render(bad)).toThrow(/not a result/);
  });
});
