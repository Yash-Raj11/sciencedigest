/**
 * "Believed clean, found clean" (best-possible toothbrushing), on the real gated draft. Each test
 * fails when its rule is broken. Both bars are measured and bound to the two findings, on one
 * scale (the whole gumline). The dentists' share is printed only as an upper bound, so its bar
 * ends in a bound line and its words say "less than". The glance view draws no number.
 *
 * The read is a draft (publishedAt null), so the test gates and assembles it from content/papers/.
 */

import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { shareScale } from "../components/figures/gap-layout";
import { FigureFor } from "../components/papers/registry";
import type { FigureRef, ResolvedFact } from "../lib/content/types";
import { assemble } from "../lib/pipeline/assemble";
import { REAL_COMMON, REAL_CONCEPTS, REAL_LIBRARY, REAL_STUDIES } from "../lib/pipeline/fixtures/real-context";
import { gate } from "../lib/pipeline/gate";

const SLUG = "best-possible-toothbrushing";
const dir = `content/papers/${SLUG}`;
const gated = gate(JSON.parse(readFileSync(`${dir}/extraction.json`, "utf8")), readFileSync(`${dir}/source.txt`, "utf8"));
if (!gated.ok) throw new Error("the toothbrushing extraction no longer passes the gate");
const editorial = JSON.parse(readFileSync(`${dir}/editorial.json`, "utf8"));
const paper = assemble(gated.validated, editorial, { studies: REAL_STUDIES, concepts: REAL_CONCEPTS, common: REAL_COMMON, library: REAL_LIBRARY });
const figure = paper.content.layers!.mechanism.figure!;
const render = (params = figure.params, glance?: { x: string | null; y: string | null }) =>
  renderToStaticMarkup(createElement(FigureFor, { slug: SLUG, figure: { ...figure, params } as FigureRef, glance }));
const html = render();
const texts = (markup: string) => [...markup.matchAll(/<text[^>]*>([\s\S]*?)<\/text>/g)].map((m) => m[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
const bars = (markup: string) => [...markup.matchAll(/<g data-evidence="(\w+)" data-fact="(\w+)" data-row="\d">[\s\S]*?<rect x="([^"]+)" y="[^"]+" width="([^"]+)"[^>]*data-bar/g)]
  .map(([, kind, fact, x, width]) => ({ kind, fact, x: Number(x), width: Number(width) }));

describe("the clean gap", () => {
  it("is the read's mechanism figure and its feed-card figure", () => {
    expect(figure.figure).toBe("clean-gap");
    expect(editorial.glance.figure).toBe("clean-gap");
  });

  it("draws two measured bars, bound to the belief and the dentists' finding", () => {
    expect(bars(html).map((b) => `${b.kind}:${b.fact}`)).toEqual(["measured:bp_thought_70", "measured:under_40_clean"]);
  });

  it("puts both on one scale, the whole gumline: the lengths keep the printed ratio", () => {
    const [believed, found] = bars(html);
    expect(believed.x).toBe(found.x);
    expect(believed.width / found.width).toBeCloseTo(70 / 40, 5);
  });

  it("marks the dentists' share as an upper bound, in the drawing and in the words", () => {
    expect(html.match(/data-bound/g)).toHaveLength(1);
    expect(texts(html)).toContain("less than 40%");
    expect(texts(html)).toContain("70%");
  });

  it("the only numbers drawn are the two bound shares", () => {
    expect(texts(html).join(" ").match(/\d+(?:\.\d+)?/g)).toEqual(["70", "40"]);
  });

  it("the glance view draws the same bars with no number at all", () => {
    const card = render(figure.params, { x: "Share of the gumline free of plaque", y: null });
    expect(texts(card).join(" ")).not.toMatch(/\d/);
    expect(bars(card)).toHaveLength(2);
  });

  it("nothing is dashed, and the orange fill is the two bars only", () => {
    expect(html).not.toMatch(/stroke-dasharray/);
    expect(html.match(/fill="var\(--signal-evidence-fill\)"/g)).toHaveLength(2);
  });

  it("refuses to draw a result as proposed, or a limitation as measured", () => {
    const params = figure.params as { found: { kind: string; fact: ResolvedFact } };
    expect(() => render({ ...figure.params, found: { ...params.found, kind: "proposed" } })).toThrow(/proposed element cites the sentence/);
    const limitation = paper.content.facts.limit_students;
    expect(() => render({ ...figure.params, found: { ...params.found, kind: "measured", fact: limitation } })).toThrow(/not a result/);
  });
});

describe("shareScale", () => {
  it("runs from none of the gumline to all of it, and keeps a share inside the bar", () => {
    const at = shareScale(0, 200);
    expect(at(0)).toBe(0);
    expect(at(100)).toBe(200);
    expect(at(50)).toBe(100);
    expect(at(140)).toBe(200);
    expect(at(-5)).toBe(0);
  });
});
