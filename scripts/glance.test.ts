/**
 * The feed card at a glance (owner, 2026-11-14). Each check below has a case that must fail.
 *
 *   - the still figure prints no number: no digit in any of its text, on all four papers;
 *     the shape still comes from gated facts (each drawing names its fact), and a range is a band;
 *   - the glance words hold no digit, and the figure is one the read draws (lint rule "glance");
 *   - a members' read lists only the slots everyone can open, and never draws its simulator.
 */

import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AssociationGlance } from "../components/figures/kinds/AssociationCurve";
import { DecayGlance } from "../components/figures/kinds/Decay";
import { FigureFor } from "../components/papers/registry";
import { FIGURE_KEYS } from "../lib/content/figures";
import { glanceView, insideRows, SLOTS } from "../lib/content/glance";
import { FREE_CONTENT, PAPERS } from "../lib/content/generated";
import type { GlanceView, PaperContent, ResolvedFact } from "../lib/content/types";
import type { GroupEdges } from "../components/figures/association-layout";
import { gate } from "../lib/pipeline/gate";
import { lint } from "../lib/pipeline/lint";
import { REAL_LIBRARY, REAL_STUDIES } from "../lib/pipeline/fixtures/real-context";

const gated = JSON.parse(readFileSync("content/generated/gated.json", "utf8")).content as Record<string, PaperContent>;
const one = (v: ResolvedFact | ResolvedFact[] | undefined) => (Array.isArray(v) ? v[0] : v)!;
const many = (v: ResolvedFact | ResolvedFact[] | undefined) => (Array.isArray(v) ? v : v ? [v] : []);

/** The still figure a card draws, as markup. */
function drawGlance(slug: string, view: GlanceView, content?: PaperContent): string {
  if (view.figure) return renderToStaticMarkup(createElement(FigureFor, { slug, figure: view.figure, glance: view.axes }));
  const spec = content!.simulator.spec!;
  const { x, y } = view.axes;
  if (spec.kind === "decay") return renderToStaticMarkup(createElement(DecayGlance, { halfLife: one(spec.simulator.halfLife), alt: view.alt, x, y }));
  return renderToStaticMarkup(createElement(AssociationGlance, {
    adjusted: many(spec.simulator.adjusted), groups: content!.simulator.params.groups as GroupEdges[], alt: view.alt, x, y,
  }));
}

/** Every piece of text drawn inside the SVG (not its <title>/<desc>, which a screen reader reads). */
const drawnText = (html: string) => [...html.matchAll(/<text[^>]*>([\s\S]*?)<\/text>/g)].map((m) => m[1].replace(/<[^>]+>/g, ""));

const CARDS = PAPERS.map((paper) => {
  const content = FREE_CONTENT[paper.slug];
  const view = content ? glanceView(content) : paper.card!.glance!;
  return { slug: paper.slug, members: paper.accessTier === "premium", content, view, html: drawGlance(paper.slug, view, content) };
});

describe("the still figure prints no number, and its shape is the study's", () => {
  it("every paper has a card view", () => {
    expect(CARDS.map((c) => c.slug).sort()).toEqual(["daytime-caffeine-sleep", "hiit-body-composition", "steps-days-per-week", "turmeric-pepper-breakfast"]);
  });
  for (const card of ["daytime-caffeine-sleep", "steps-days-per-week", "turmeric-pepper-breakfast", "hiit-body-composition"]) {
    it(`${card}: words only, drawn from gated facts`, () => {
      const { html, view } = CARDS.find((c) => c.slug === card)!;
      const text = drawnText(html);
      expect(text.length).toBeGreaterThan(0);
      for (const t of text) expect(t, `"${t}"`).not.toMatch(/\p{N}/u);
      expect(text.join(" ")).toContain(view.axes.x);
      expect(html).toMatch(/data-fact="[^"]+"/);
    });
  }
  it("a range is a peach band: caffeine, steps and HIIT draw one; turmeric has no range and draws none", () => {
    const bands = Object.fromEntries(CARDS.map((c) => [c.slug, (c.html.match(/data-band/g) ?? []).length]));
    expect(bands["daytime-caffeine-sleep"]).toBe(1);
    expect(bands["steps-days-per-week"]).toBe(2);
    expect(bands["hiit-body-composition"]).toBe(3);
    expect(bands["turmeric-pepper-breakfast"]).toBe(0);
  });
  it("the full figure does print numbers, so the check is not vacuous", () => {
    const turmeric = CARDS.find((c) => c.slug === "turmeric-pepper-breakfast")!;
    const full = renderToStaticMarkup(createElement(FigureFor, { slug: turmeric.slug, figure: turmeric.view.figure!, interactive: false }));
    expect(drawnText(full).some((t) => /\p{N}/u.test(t))).toBe(true);
  });
});

describe("the card's words", () => {
  it("the headline leads with the number for an estimate, and is the finding otherwise", () => {
    const by = Object.fromEntries(CARDS.map((c) => [c.slug, c.view]));
    expect(by["steps-days-per-week"].headline).toBe("−14.9 points lower 10-year risk of death, compared with 0 days a week.");
    expect(by["daytime-caffeine-sleep"].headline).toBe("Sleep showed no clear difference from placebo nights.");
    expect(by["daytime-caffeine-sleep"].note).toBe("Curve shape from another study. Try it with your own coffee inside.");
    expect(by["hiit-body-composition"].headline).toMatch(/^\+0\.51 kg /);
  });
});

describe("What's inside", () => {
  it("a free read: why, Try it (the one orange row), the protocol, the receipts", () => {
    const rows = insideRows({ members: false, why: "Why it happens", tryIt: "pick a breakfast" });
    expect(rows.map((r) => [r.label, r.slot])).toEqual([
      ["Why it happens", "why"], ["Try it: pick a breakfast", "try"], ["Put it in your Life Game", "protocol"], ["The receipts", "receipts"],
    ]);
    expect(rows.filter((r) => r.accent).map((r) => r.slot)).toEqual(["try"]);
  });
  it("a members' read: only what everyone can open", () => {
    const rows = insideRows({ members: true, why: "Why it happens", tryIt: "pick your training" });
    expect(rows.map((r) => r.slot)).toEqual([SLOTS.protocol, SLOTS.evidence]);
    expect(rows.some((r) => r.accent)).toBe(false);
  });
  it("the members' card in the public bundle draws one of its figures, never its simulator", () => {
    const hiit = CARDS.find((c) => c.members)!;
    expect(hiit.view.figure?.figure).toBe("what-was-measured");
    expect(FREE_CONTENT[hiit.slug]).toBeUndefined();
    expect(gated[hiit.slug].glance.figure?.figure).toBe("what-was-measured");
  });
});

describe('lint rule "glance"', () => {
  const read = (slug: string) => {
    const dir = `content/papers/${slug}/`;
    const source = readFileSync(`${dir}source.txt`, "utf8");
    const result = gate(JSON.parse(readFileSync(`${dir}extraction.json`, "utf8")), source);
    if (!result.ok) throw new Error(result.errors.join("\n"));
    return { source, validated: result.validated, editorial: JSON.parse(readFileSync(`${dir}editorial.json`, "utf8")) };
  };
  const errors = (slug: string, mutate: (e: any) => void, legacy = false) => {
    const r = read(slug);
    mutate(r.editorial);
    return lint(r.validated, r.editorial, r.source, { context: { studies: { ...REAL_STUDIES }, library: REAL_LIBRARY, concepts: {} }, figures: FIGURE_KEYS, allowLegacyShape: legacy })
      .errors.filter((e) => e.rule === "glance").map((e) => `${e.where}: ${e.message}`);
  };
  it("the four reads pass", () => {
    expect(errors("turmeric-pepper-breakfast", () => {})).toEqual([]);
    expect(errors("daytime-caffeine-sleep", () => {}, true)).toEqual([]);
    expect(errors("steps-days-per-week", () => {}, true)).toEqual([]);
    expect(errors("hiit-body-composition", () => {}, true)).toEqual([]);
  });
  it("fails a digit in an axis label, the note or the Try-it words", () => {
    expect(errors("turmeric-pepper-breakfast", (e) => { e.glance.x = "Minutes after breakfast, 0 to 180 [timepoints]"; }).join()).toMatch(/^glance\.x: the feed card's figure shows no number/);
    expect(errors("daytime-caffeine-sleep", (e) => { e.glance.note = "Half-life of 5.15 hours. [caffeine-saliva-half-life/half_life_caffeine]"; }, true)).toHaveLength(1);
    expect(errors("steps-days-per-week", (e) => { e.glance.tryIt = "pick 0 to 7 days [threshold]"; }, true)).toHaveLength(1);
  });
  it('fails "simulator" on a read with a hand-built simulator, and a figure the read does not draw', () => {
    expect(errors("turmeric-pepper-breakfast", (e) => { e.glance.figure = "simulator"; }).join()).toMatch(/needs a simulator drawn by kind/);
    expect(errors("turmeric-pepper-breakfast", (e) => { e.glance.figure = "lock-and-key"; }).join()).toMatch(/not one of the read's figures/);
  });
  it("fails a members' read whose card would draw its simulator", () => {
    expect(errors("daytime-caffeine-sleep", (e) => { e.accessTier = "premium"; }, true).join()).toMatch(/members' read's card is public/);
  });
});
