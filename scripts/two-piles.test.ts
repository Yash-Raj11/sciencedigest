/**
 * FIGURE-DESIGN 4A (HIIT), "two piles and a session", on the real gated read. Each test fails when
 * its rule is broken: the two piles are a sketch (dotted, monochrome, tagged, on the reviewed
 * concept) and the same size before and after; the orange belongs to the two measured changes
 * only; the authors' recipe is dashed; every number drawn is bound.
 */

import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { FigureFor } from "../components/papers/registry";
import type { PaperContent, ResolvedSketch } from "../lib/content/types";

const gated = JSON.parse(readFileSync("content/generated/gated.json", "utf8")).content as Record<string, PaperContent>;
const read = gated["hiit-body-composition"];
const figure = read.layers!.mechanism.figure!;
const render = (params = figure.params) => renderToStaticMarkup(createElement(FigureFor, { slug: "hiit-body-composition", figure: { ...figure, params } }));
const html = render();
const texts = (markup: string) => [...markup.matchAll(/<text[^>]*>([\s\S]*?)<\/text>/g)].map((m) => m[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());

describe("4A: two piles and a session", () => {
  it("is the read's mechanism figure, and its sketch rests on the reviewed concept", () => {
    expect(figure.figure).toBe("two-piles");
    expect((figure.params.body as ResolvedSketch).concept).toBe("fat-free-mass");
    expect(read.context?.concepts.map((c) => c.slug)).toContain("fat-free-mass");
  });

  it("the piles are dotted, monochrome and the same size in both panels", () => {
    const piles = [...html.matchAll(/<g[^>]*data-sketch="two-piles"[^>]*>([\s\S]*?)<\/g>/g)];
    expect(piles).toHaveLength(4);
    for (const [g] of piles) {
      expect(g).toContain('stroke-dasharray="1 4"');
      expect(g).not.toMatch(/signal-evidence/);
    }
    const sizes = piles.map(([g]) => g.match(/width="([^"]+)" height="([^"]+)"/)!.slice(1).join("x"));
    expect(sizes[0]).toBe(sizes[2]);
    expect(sizes[1]).toBe(sizes[3]);
    expect(html).toContain(">Sketch, not data</text>");
  });

  it("refuses to draw the piles without a declared sketch", () => {
    expect(() => render({ ...figure.params, body: "a shape" })).toThrow(/declared sketch/);
    expect(() => render({ ...figure.params, body: { ...(figure.params.body as ResolvedSketch), tag: "Illustration" } })).toThrow(/Sketch, not data/);
  });

  it("orange only on the two measured changes, each bound to its pooled result", () => {
    const orange = [...html.matchAll(/<text[^>]*fill="var\(--signal-evidence-text\)"[^>]*>([\s\S]*?)<\/text>/g)].map((m) => m[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
    expect(orange).toEqual(["A little more, on average", "Less, on average"]);
    expect(html).toMatch(/data-evidence="measured" data-fact="ffm_all"/);
    expect(html).toMatch(/data-evidence="measured" data-fact="fm_all"/);
    expect(html).not.toMatch(/fill="var\(--signal-evidence-fill\)"/);
  });

  it("the authors' recipe is dashed", () => {
    const recipe = html.match(/<g data-evidence="proposed" data-fact="recipe">([\s\S]*?)<\/g>/)!;
    expect(recipe[1]).toContain('stroke-dasharray="5 4"');
  });

  it("the only numbers drawn are the bound trial length and the two cut-offs", () => {
    const digits = texts(html).join(" ").match(/\d+/g);
    expect(digits).toEqual(["3", "15", "60", "90"]);
    expect(texts(html)).toContain("The trials did not test why.");
  });
});
