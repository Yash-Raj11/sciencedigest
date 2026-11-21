/**
 * The slide renderer (Phase 11, 4B). Each rule has a case that breaks it and must be refused.
 */

import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { createElement as h } from "react";
import { describe, expect, it } from "vitest";
import { isPublished, loadDecks } from "./decks";
import { fontFor, loadFonts } from "./fonts";
import { coveredCodePoints, missingGlyphs } from "./glyphs";
import { drawnText, numberProblems, tokenProblems, wordProblems } from "./parity";
import { checkSlideTree, renderElement, renderSlide } from "./render";
import { inspectTree } from "./satori-rules";
import { contrast, contrastProblems } from "./contrast";
import { altHookFileName, hookChoices, withHook } from "./hooks";
import { slideElement } from "./Slide";
import { COLOR, COLOR_LIGHT, LOOKS, PALETTES, paletteOf, SANS, SERIF, VIVID_TOKENS } from "./tokens";
import { receiptInterval } from "../pipeline/carousel";
import { intervalLayout, plateauLayout } from "./art-geometry";

const sharp = createRequire(import.meta.url)("sharp") as typeof import("sharp").default;
const BASE = { family: SANS, weight: 400, style: "normal" };
const published = loadDecks().filter((d) => isPublished(d.slug));

describe("Satori rules", () => {
  it("refuses an element with children and no display: flex", () => {
    const tree = h("div", { style: { display: "flex" } }, h("div", { style: {} }, h("span", {}, "a"), h("span", {}, "b")));
    expect(inspectTree(tree, BASE).problems.join("\n")).toMatch(/has children but no display: flex/);
  });
  it("refuses className and tw: inline styles only", () => {
    expect(inspectTree(h("div", { className: "p-4", style: { display: "flex" } }, "x"), BASE).problems.join("\n")).toMatch(/inline styles only/);
    expect(inspectTree(h("div", { tw: "p-4", style: { display: "flex" } }, "x"), BASE).problems.join("\n")).toMatch(/inline styles only/);
  });
  it("refuses a component in the tree: art is called as a function, so the whole tree is checked", () => {
    const Hidden = () => h("div", { className: "nope" }, "x");
    expect(inspectTree(h("div", { style: { display: "flex" } }, h(Hidden)), BASE).problems.join("\n")).toMatch(/a component \(Hidden\)/);
  });
  it("passes a well-formed tree, and leaves svg internals to resvg", () => {
    const tree = h("div", { style: { display: "flex", flexDirection: "column" } },
      h("div", { style: { display: "flex" } }, "text"),
      h("svg", { width: 10, height: 10, viewBox: "0 0 10 10" }, h("g", {}, h("circle", { cx: 5, cy: 5, r: 4 }))));
    expect(inspectTree(tree, BASE).problems).toEqual([]);
  });
});

describe("glyphs: fails closed on any character the font does not carry", () => {
  const fonts = loadFonts();
  it("reads the cmap of the .woff files: the slide fonts carry the text the decks use", () => {
    const archivo = fontFor(fonts, SANS, 400, "normal").covered;
    expect(missingGlyphs("The 8,000-step group: 14.9 points lower, 3 × 150 mg – “quoted” ’", archivo)).toEqual([]);
  });
  it("finds ≤ and ✓ missing (they would draw as empty boxes)", () => {
    for (const f of fonts) expect(missingGlyphs("a ≤ b ✓", f.covered), `${f.name} ${f.weight} ${f.style}`).toEqual(["≤", "✓"]);
  });
  it("refuses a slide tree with a missing glyph, naming the character and the font", () => {
    const tree = h("div", { style: { display: "flex", fontFamily: SERIF, fontWeight: 600 } }, "Risk ≤ before");
    expect(checkSlideTree(tree)).toEqual([expect.stringMatching(/"≤" \(U\+2264\) not in Newsreader 600 normal/)]);
  });
  it("refuses a .woff2 font: Satori cannot read it", () => {
    const woff2 = readFileSync("node_modules/@fontsource-variable/archivo/files/archivo-latin-wght-normal.woff2");
    expect(() => coveredCodePoints(woff2)).toThrow(/woff2/);
  });
});

describe("rendering", () => {
  it("this Satori draws inline <svg> (test render: an orange circle on black)", async () => {
    const element = h("div", { style: { display: "flex", width: 200, height: 200, background: COLOR.bg } },
      h("svg", { width: 200, height: 200, viewBox: "0 0 200 200" }, h("circle", { cx: 100, cy: 100, r: 60, fill: COLOR["signal-evidence-fill"] })));
    const png = await renderElement(element, 200, 200);
    const { data, info } = await sharp(png).raw().toBuffer({ resolveWithObject: true });
    const at = (x: number, y: number) => [...data.subarray((y * info.width + x) * info.channels, (y * info.width + x) * info.channels + 3)];
    expect(at(100, 100)).toEqual([0xff, 0xb3, 0x8a]); // inside the circle: the svg was drawn
    expect(at(10, 10)).toEqual([0x0a, 0x0a, 0x0a]);   // outside: the slide background
  });
  it("draws a published slide at 1080×1350", async () => {
    const png = await renderSlide(published[0], 2);
    const meta = await sharp(png).metadata();
    expect([meta.format, meta.width, meta.height]).toEqual(["png", 1080, 1350]);
  }, 30000);
  it("every slide of every published deck passes the tree and glyph checks", () => {
    expect(published.length).toBeGreaterThanOrEqual(5);
    for (const deck of published) deck.slides.forEach((_, i) => expect(checkSlideTree(slideElement(deck, i)), `${deck.slug} ${i + 1}`).toEqual([]));
  });
});

describe("parity", () => {
  const deck = published.find((d) => d.slug === "steps-days-per-week")!;
  it("refuses a drawn number that is in none of the slide's cited passages", () => {
    const drawn = drawnText(slideElement(deck, 0));
    const quotes = { threshold: "8000 steps or more (0 days, 1-2 days, and 3-7 days)", sample: "Among 3101 participants (mean [SD] age, 50.5 [18.4] years" , followup: "Over the 10-year follow-up, all-cause and cardiovascular deaths occurred in 439 (14.2%) and 148 (5.3%) participants, respectively." };
    expect(numberProblems(deck, 0, drawn, quotes)).toEqual([]);
    const tampered = { ...deck, slides: deck.slides.map((s, i) => (i === 0 && s.art.motif === "number" ? { ...s, art: { ...s.art, figure: { ...s.art.figure, value: "9000" } } } : s)) };
    expect(numberProblems(tampered, 0, drawnText(slideElement(tampered, 0)), quotes)).toEqual([expect.stringMatching(/draws 9000, which is in none of the passages/)]);
  });
  it("refuses a deck word the layout dropped", () => {
    expect(wordProblems(deck, 4, "How sure? Observational cohort")).toContainEqual(expect.stringMatching(/is in the deck but not drawn/));
    expect(wordProblems(deck, 4, drawnText(slideElement(deck, 4)))).toEqual([]);
  });
  it("refuses a slide colour that drifted from the site's dark theme", () => {
    const css = readFileSync("app/globals.css", "utf8");
    expect(tokenProblems(css)).toEqual([]);
    expect(tokenProblems(css, { ...COLOR, bg: "#000000" })).toEqual([expect.stringMatching(/--bg: the slides use #000000, the site's dark theme uses #0a0a0a/)]);
    // The light slides (finding, why, who) come from the light theme, held to it the same way.
    expect(tokenProblems(css, COLOR_LIGHT, "light")).toEqual([]);
    expect(tokenProblems(css, { ...COLOR_LIGHT, "signal-evidence-text": "#ff6a00" }, "light"))
      .toEqual([expect.stringMatching(/--signal-evidence-text: the slides use #ff6a00, the site's light theme uses #ad5428/)]);
  });
  it("holds the bright orange to the deck-only tokens, never to the site's own orange", () => {
    const css = readFileSync("app/globals.css", "utf8");
    for (const { theme, colors, names } of PALETTES) expect(tokenProblems(css, colors, theme, names)).toEqual([]);
    const vivid = PALETTES.find((p) => p.look === "dark-vivid")!;
    expect(tokenProblems(css, { ...vivid.colors, "signal-evidence-text": "#ff0000" }, "dark", vivid.names))
      .toEqual([expect.stringMatching(/--deck-vivid-text: the slides use #ff0000, the site's dark theme uses #ff7a1a/)]);
    // Read against the site's own token, the bright orange is a drift: it never stands in for it.
    expect(tokenProblems(css, vivid.colors, "dark").join("\n")).toMatch(/--signal-evidence-text: the slides use #ff7a1a/);
    expect(Object.keys(VIVID_TOKENS).every((k) => k.includes("signal-evidence"))).toBe(true);
  });
});

describe("alternate openings", () => {
  const deck = published.find((d) => d.slug === "steps-days-per-week")!;
  it("swaps only the first slide, and refuses an opening the deck does not have", () => {
    expect(hookChoices(deck)).toEqual(["a", "b", "c", "d"]);
    expect(withHook(deck, "a")).toBe(deck);
    const c = withHook(deck, "c");
    expect(c.slides[0]).toBe(deck.altHooks[1].slide);
    expect(c.slides.slice(1)).toEqual(deck.slides.slice(1));
    expect(() => withHook(deck, "e")).toThrow(/has no opening "e" \(it has a, b, c, d\)/);
    expect(altHookFileName("b")).toBe("01-hook-b.png");
  });
  it("draws each opening as the deck's first slide, every number traced to a passage it cites", () => {
    const quotes = {
      threshold: "8000 steps or more (0 days, 1-2 days, and 3-7 days)",
      plateau: "plateaued at 3 to 4 days",
      sample: "Among 3101 participants",
      followup: "Over the 10-year follow-up",
      ard_1_2: "8000 steps or more 1 to 2 days per week (aRD, \u221214.9%; 95% CI \u221218.8% to \u221210.9%)",
      thresholds: "Different thresholds for the number of daily steps between 6000 and 10 000 yielded similar results.",
    };
    for (const letter of ["b", "c", "d"]) {
      const alt = withHook(deck, letter);
      const drawn = drawnText(slideElement(alt, 0));
      expect(alt.slides[0].kind).toBe("hook");
      expect(numberProblems(alt, 0, drawn, quotes), letter).toEqual([]);
      expect(wordProblems(alt, 0, drawn), letter).toEqual([]);
      expect(checkSlideTree(slideElement(alt, 0, "light-vivid")), letter).toEqual([]);
    }
    // The opening's name is for the owner: it is never drawn.
    expect(drawnText(slideElement(withHook(deck, "b"), 0))).not.toContain(deck.altHooks[0].name);
    const tampered = { ...deck, altHooks: deck.altHooks.map((h, j) => (j === 0 && h.slide.art.motif === "number" ? { ...h, slide: { ...h.slide, art: { ...h.slide.art, figure: { ...h.slide.art.figure, value: "19.4" } } } } : h)) };
    const alt = withHook(tampered, "b");
    expect(numberProblems(alt, 0, drawnText(slideElement(alt, 0)), quotes)).toEqual([expect.stringMatching(/draws 19\.4, which is in none of the passages/)]);
  });
});

describe("contrast as drawn", () => {
  it("measures WCAG contrast: black on white is 21:1, a colour on itself 1:1", () => {
    expect(contrast("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(contrast("#ffb38a", "#ffb38a")).toBe(1);
  });
  it("passes every look, and refuses grey text or a button label too faint to read", () => {
    for (const { look, colors } of PALETTES) expect(contrastProblems(colors, look)).toEqual([]);
    expect(contrastProblems({ ...COLOR_LIGHT, muted: "#b5b0a8" }, "light"))
      .toEqual([expect.stringMatching(/light: muted labels and the source line \(--muted #b5b0a8 on --bg #f6f3ee\) is \d\.\d\d:1; it needs 4\.5:1/)]);
    // The site's pastel orange as text on white fails: the light look must use the darker text orange.
    expect(contrastProblems({ ...COLOR_LIGHT, "signal-evidence-text": COLOR_LIGHT["signal-evidence-fill"] }, "light").join("\n")).toMatch(/orange words/);
    expect(contrastProblems({ ...COLOR, "on-signal-evidence-fill": "#ffffff" }, "dark").join("\n")).toMatch(/button label/);
  });
});

describe("the owner's design (2026-11-20)", () => {
  const deck = published.find((d) => d.slug === "steps-days-per-week")!;
  it("draws the finding's two results as ranges on one scale, from the estimates' own numbers", () => {
    const i = deck.slides.findIndex((s) => s.kind === "finding");
    const drawn = drawnText(slideElement(deck, i));
    for (const n of ["\u221218.8", "\u221210.9", "\u221220.4", "\u221212.5", "No difference"]) expect(drawn).toContain(n);
    // Without an interval on either side, the pair falls back to two big numbers and draws no range.
    const bare = { ...deck, slides: deck.slides.map((s, j) => (j === i && s.art.motif === "pair" ? { ...s, art: { ...s.art, a: { ...s.art.a, interval: null } } } : s)) } as typeof deck;
    expect(drawnText(slideElement(bare, i))).not.toContain("Likely range");
  });
  it("draws a whole deck in one look: every slide on black, or every slide on white", () => {
    const bgOf = (el: unknown) => ((el as { props: { style: { background: string } } }).props.style.background);
    for (const look of LOOKS) {
      const bgs = new Set(deck.slides.map((_, i) => bgOf(slideElement(deck, i, look))));
      expect([...bgs], look).toEqual([paletteOf(look).bg]);
    }
    expect(paletteOf("dark").bg).toBe(COLOR.bg);
    expect(paletteOf("light").bg).toBe(COLOR_LIGHT.bg);
    // Every look draws the same words: only the colours change.
    const words = deck.slides.map((_, i) => drawnText(slideElement(deck, i, "dark")));
    for (const look of LOOKS) expect(deck.slides.map((_, i) => drawnText(slideElement(deck, i, look)))).toEqual(words);
  });
  it("draws the plateau on the paper's own axis: its numbers only, the levelling stretch inside it, the shape flagged", () => {
    const i = deck.slides.findIndex((s) => s.kind === "why");
    const art = deck.slides[i].art;
    expect(art.motif).toBe("plateau");
    const drawn = drawnText(slideElement(deck, i));
    for (const w of ["Levels off here", "Days a week with 8,000 steps", "Shape only, not plotted data"]) expect(drawn).toContain(w);
    // Only the axis ends and the levelling stretch are labelled; the days between are bare ticks.
    const at = plateauLayout({ from: 0, to: 7, levels: { from: 3, to: 4 } }, 920);
    expect(at.numbers.map((n) => n.n)).toEqual([0, 3, 4, 7]);
    expect(plateauLayout({ from: 0, to: 7, levels: { from: 3, to: 4 } }, 920, 0.45).y.height).toBeLessThan(at.y.height);
    expect(at.ticks).toHaveLength(8);
    expect(at.band.from).toBeLessThan(at.band.to);
    // A number not in the cited passages is refused by the parity check.
    const tampered = { ...deck, slides: deck.slides.map((s, j) => (j === i && s.art.motif === "plateau" ? { ...s, art: { ...s.art, to: 6 } } : s)) } as typeof deck;
    const quotes = {
      threshold: "8000 steps or more (0 days, 1-2 days, and 3-7 days)",
      plateau: "plateaued at 3 to 4 days",
      ard_1_2: "8000 steps or more 1 to 2 days per week (aRD, \u221214.9%; 95% CI \u221218.8% to \u221210.9%)",
    };
    expect(numberProblems(deck, i, drawn, quotes)).toEqual([]);
    expect(numberProblems(tampered, i, drawnText(slideElement(tampered, i)), quotes)).toEqual([expect.stringMatching(/draws 6, which is in none of the passages/)]);
  });
  it("prints the study chip and a cite with no year (the slides draw no number they cannot source)", () => {
    const drawn = drawnText(slideElement(deck, 0));
    expect(drawn).toContain("Observational cohort · 3,101 US adults · followed for 10 years");
    expect(deck.study.cite).toBe("Inoue et al., JAMA Network Open");
  });
});

describe("receipts range bar", () => {
  const est = { measure: "aRD", point: -14.9, ciLow: -18.8, ciHigh: -10.9, unit: "points" };
  it("draws from the estimate's own numbers, with the papers' minus sign, and none without an interval", () => {
    expect(receiptInterval(est)?.text).toEqual({ low: "\u221218.8", point: "\u221214.9", high: "\u221210.9" });
    expect(receiptInterval({ ...est, ciLow: null })).toBeNull();
    expect(receiptInterval(null)).toBeNull();
  });
  it("puts 'no difference' at 1 for a ratio and 0 for a difference", () => {
    expect(receiptInterval(est)?.none).toBe(0);
    expect(receiptInterval({ measure: "HR", point: 0.8, ciLow: 0.7, ciHigh: 0.9, unit: null })?.none).toBe(1);
  });
  it("keeps 'no difference' on the scale and the ends in order", () => {
    const at = intervalLayout({ low: -18.8, point: -14.9, high: -10.9, none: 0 }, 776);
    expect(at.low).toBeLessThan(at.point);
    expect(at.point).toBeLessThan(at.high);
    expect(at.high).toBeLessThan(at.none);
    expect(at.none).toBeLessThanOrEqual(at.track.to);
    const narrow = intervalLayout({ low: 1.0, point: 1.01, high: 1.02, none: 0 }, 776);
    expect(narrow.highLabel - narrow.lowLabel).toBeGreaterThanOrEqual(narrow.label);
  });
  it("a published receipts slide with an interval draws all three numbers", () => {
    const deck = published.find((d) => d.slug === "steps-days-per-week")!;
    const i = deck.slides.findIndex((s) => s.kind === "receipts");
    const drawn = drawnText(slideElement(deck, i));
    for (const n of ["18.8", "14.9", "10.9"]) expect(drawn).toContain(n);
    const art = deck.slides[i].art as { interval: unknown };
    const without = { ...deck, slides: deck.slides.map((s, j) => (j === i ? { ...s, art: { ...s.art, interval: null } } : s)) } as typeof deck;
    expect(wordProblems({ ...deck }, i, drawnText(slideElement(without, i))).join("\n")).toMatch(/not drawn/);
    expect(art.interval).not.toBeNull();
  });
});
