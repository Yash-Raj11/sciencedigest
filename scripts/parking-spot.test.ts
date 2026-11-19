/**
 * FIGURE-DESIGN 1A (caffeine), "the parking spot", on the real read. Each test fails when its rule
 * is broken: the dock and the tokens in it are the authors' description (dashed, adenosine_block);
 * the tiredness tokens building up are a sketch (dotted, monochrome, tagged, on the reviewed
 * concept adenosine); the figure holds no result, so no pastel fill and no number; the orange is
 * the two feeling words only.
 */

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { FigureFor } from "../components/papers/registry";
import { FREE_CONTENT } from "../lib/content/generated";
import type { ResolvedSketch } from "../lib/content/types";

const read = FREE_CONTENT["daytime-caffeine-sleep"]!;
const figure = read.layers!.mechanism.figure!;
const render = (params = figure.params) => renderToStaticMarkup(createElement(FigureFor, { slug: "daytime-caffeine-sleep", figure: { ...figure, params } }));
const html = render();
const texts = [...html.matchAll(/<text[^>]*>([\s\S]*?)<\/text>/g)].map((m) => m[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim());

describe("1A: the parking spot", () => {
  it("is the read's mechanism figure; its sketch rests on the reviewed concept adenosine", () => {
    expect(figure.figure).toBe("parking-spot");
    expect((figure.params.tokens as ResolvedSketch).concept).toBe("adenosine");
    expect(read.context?.concepts.map((c) => c.slug)).toContain("adenosine");
  });

  it("the dock, the parked token and caffeine are dashed: the authors' description, not measured", () => {
    const proposed = [...html.matchAll(/<g data-evidence="(\w+)" data-fact="([^"]+)">([\s\S]*?)<\/g>/g)];
    expect(proposed.map((g) => `${g[1]} ${g[2]}`)).toEqual(["proposed adenosine_block", "proposed adenosine_block"]);
    for (const g of proposed) {
      expect(g[3]).not.toContain("stroke-dasharray=\"1 4\"");
      expect(g[3].match(/stroke-dasharray="5 4"/g)!.length).toBeGreaterThanOrEqual(2);
    }
    expect(html).toContain(">How the authors describe it, not measured in this study</text>");
  });

  it("the tiredness tokens are a dotted, monochrome sketch, tagged on the figure", () => {
    const sketch = [...html.matchAll(/<g[^>]*data-sketch="tiredness-tokens"[^>]*>([\s\S]*?)<\/g>/g)];
    expect(sketch).toHaveLength(2);
    for (const [g] of sketch) {
      expect(g).toContain('stroke-dasharray="1 4"');
      expect(g).toContain('stroke="var(--muted)"');
      expect(g).not.toMatch(/signal-evidence|fill="var/);
    }
    expect(texts).toContain("Sketch, not data");
  });

  it("refuses to draw the tokens without their sketch", () => {
    expect(() => render({ ...figure.params, tokens: "tokens" })).toThrow(/declared sketch/);
  });

  it("holds no result: no pastel fill, no number; orange only on the two feeling words", () => {
    expect(html).not.toContain("var(--signal-evidence-fill)");
    expect(texts.join(" ")).not.toMatch(/\d/);
    const orange = [...html.matchAll(/<tspan[^>]*fill="var\(--signal-evidence-text\)"[^>]*>([^<]*)<\/tspan>/g)].map((m) => m[1]);
    expect(orange).toEqual(["sleepy", "alert"]);
    expect(html.match(/signal-evidence-text/g)).toHaveLength(2);
  });
});
