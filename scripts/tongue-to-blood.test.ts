/**
 * FIGURE-DESIGN 2A (turmeric), "from the tongue to the blood", on the real gated read. Each test
 * fails when its rule is broken: the authors' chain must be dashed and the trial's result solid;
 * the pastel and the bright orange belong to the measured result only; every number drawn is a
 * bound one (the dose and the 30-minute reading).
 */

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { FigureFor } from "../components/papers/registry";
import { FREE_CONTENT } from "../lib/content/generated";

const read = FREE_CONTENT["turmeric-pepper-breakfast"]!;
const figure = read.layers!.mechanism.figure!;
const html = renderToStaticMarkup(createElement(FigureFor, { slug: "turmeric-pepper-breakfast", figure }));
const groups = [...html.matchAll(/<g data-evidence="(measured|proposed)" data-fact="([^"]+)">([\s\S]*?)<\/g>/g)];

describe("2A: from the tongue to the blood", () => {
  it("is the read's mechanism figure", () => expect(figure.figure).toBe("tongue-to-blood"));
  it("the authors' chain is dashed; the trial's result is solid, with one solid arrow", () => {
    const proposed = groups.filter((g) => g[1] === "proposed");
    const measured = groups.filter((g) => g[1] === "measured");
    expect(new Set(proposed.map((g) => g[2]))).toEqual(new Set(["trpv1_mouth", "glp1", "trpv1"]));
    for (const g of proposed) expect(g[3], g[2]).toContain("stroke-dasharray");
    expect(new Set(measured.map((g) => g[2]))).toEqual(new Set(["glucose_lower", "glucose_30"]));
    for (const g of measured) expect(g[3], g[2]).not.toContain("stroke-dasharray");
    expect(measured.filter((g) => g[3].includes("<polygon"))).toHaveLength(1);
  });
  it("orange budget: one pastel area behind the pepper row's blood; bright orange only on the direction words", () => {
    expect(html.match(/fill="var\(--signal-evidence-fill\)"/g)).toHaveLength(1);
    const orange = [...html.matchAll(/<text[^>]*fill="var\(--signal-evidence-text\)"[^>]*>([\s\S]*?)<\/text>/g)].map((m) => m[1].replace(/<[^>]+>/g, " "));
    expect(orange.join(" ").replace(/\s+/g, " ").trim()).toBe("lower than after the plain egg");
  });
  it("the only numbers drawn are the bound dose and the 30-minute reading", () => {
    const text = [...html.matchAll(/<text[^>]*>([\s\S]*?)<\/text>/g)].map((m) => m[1].replace(/<[^>]+>/g, " ")).join(" ").replace(/&#x?[0-9a-f]+;/gi, "'").replace(/\s+/g, " ");
    expect([...text.matchAll(/\d+/g)].map((m) => m[0])).toEqual(["1", "30"]);
    expect(text).toContain("What the trial showed");
    expect(text).toContain("No hormones were measured.");
  });
});
