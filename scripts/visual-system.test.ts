/**
 * The visual system (owner, 2026-11-14), held by tests that fail when it is broken:
 *
 *   - the palette in app/globals.css is the owner's, in both modes;
 *   - every text token reaches 4.5:1 on the page and on a card, both modes;
 *   - no colour is hard-coded outside the theme (a hex value in a component fails);
 *   - weights 400 and 500 only;
 *   - the pastel band is a surface: never a text colour, a button or a border.
 *
 * "Orange once per screen" is a browser test (tests/browser/readability.spec.ts): every
 * orange pixel source must sit inside the screen's one [data-accent-slot].
 */

import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { contrast, contrastTable, solid, themeTokens } from "@/lib/contrast";
import { PAGE_COLOUR } from "@/lib/theme";

const CSS = readFileSync("app/globals.css", "utf8");
const tokens = themeTokens(CSS);

/** The owner's values. Two light text values sit one shade darker for contrast (see globals.css). */
const OWNER = {
  dark: { bg: "#0d0d0c", surface: "#171615", ink: "#edeae4", muted: "#b3aea6", meta: "#8f8a83", line: "#2a2826", accent: "#ff7a2f", band: "rgb(255 185 143 / 0.22)" },
  light: { bg: "#faf7f2", surface: "#ffffff", ink: "#161514", muted: "#55504a", meta: "#77716b", line: "#e4ded6", accent: "#d9561a", "accent-text": "#c04d16", band: "rgb(253 217 196 / 0.7)" },
} as const;

const source = (dirs: string[]) =>
  execFileSync("git", ["ls-files", ...dirs], { encoding: "utf8" })
    .split("\n")
    .filter((f) => /\.(tsx?|css)$/.test(f) && !f.includes("generated") && !f.endsWith(".test.ts"));

describe("palette", () => {
  for (const mode of ["dark", "light"] as const) {
    it(`${mode}: the owner's values`, () => {
      for (const [name, value] of Object.entries(OWNER[mode])) expect(tokens[mode][name], `--${name}`).toBe(value);
    });
  }

  it("the page is never pure black", () => {
    expect(tokens.dark.bg).not.toBe("#000000");
  });

  it("the browser chrome colour is a copy of --bg", () => {
    expect(PAGE_COLOUR.dark).toBe(tokens.dark.bg);
    expect(PAGE_COLOUR.light).toBe(tokens.light.bg);
  });
});

describe("contrast", () => {
  it("reads a hex value and an rgb value over its surface", () => {
    expect(contrast("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(solid("rgb(255 255 255 / 0.5)", "#000000")).toBe("#808080");
  });

  for (const row of contrastTable(CSS)) {
    it(`${row.mode}: ${row.text} on ${row.on} ≥ 4.5`, () => {
      expect(row.ratio).toBeGreaterThanOrEqual(4.5);
    });
  }

  it("fails a token that is too faint (the owner's light meta on the light page)", () => {
    expect(contrast("#7a746d", tokens.light.bg)).toBeLessThan(4.5);
  });
});

describe("no hard-coded colour", () => {
  const HEX = /#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b(?![\w-])/;
  // The theme itself, and the one copy of the page colour the browser chrome needs.
  const allowed = new Set(["app/globals.css", "lib/theme.ts"]);

  it("no hex colour in app/, components/ or lib/ outside the theme", () => {
    const offenders = source(["app", "components", "lib"]).filter((f) => !allowed.has(f) && HEX.test(readFileSync(f, "utf8")));
    expect(offenders).toEqual([]);
  });

  it("the check fails on a hex colour", () => {
    expect(HEX.test('className="text-[#ff8a33]"')).toBe(true);
    expect(HEX.test('fill="var(--ink)"')).toBe(false);
  });
});

describe("weights 400 and 500 only", () => {
  const HEAVY = /\bfont-(semibold|bold|extrabold|black)\b|fontWeight[=:]\s*\{?\s*["']?(6|7|8|9)00|font-weight:\s*(6|7|8|9)\d\d/;

  it("no heavier weight in app/ or components/", () => {
    const offenders = source(["app", "components"]).filter((f) => HEAVY.test(readFileSync(f, "utf8")));
    expect(offenders).toEqual([]);
  });

  it("the check fails on a heavy weight", () => {
    for (const bad of ['className="font-bold"', "fontWeight={700}", "font-weight: 750;"]) expect(HEAVY.test(bad), bad).toBe(true);
    expect(HEAVY.test('className="font-medium"')).toBe(false);
  });
});

describe("the band is a surface", () => {
  const MISUSE = /\b(text|border|stroke|outline|decoration)-band\b|stroke=\{BAND\}|color:\s*var\(--band\)/;

  it("never a text colour, a border or a stroke", () => {
    const offenders = source(["app", "components"]).filter((f) => MISUSE.test(readFileSync(f, "utf8")));
    expect(offenders).toEqual([]);
  });

  it("the check fails on band text", () => {
    expect(MISUSE.test('className="text-band"')).toBe(true);
    expect(MISUSE.test('className="bg-band"')).toBe(false);
  });

  it("the old orange-tinted surface is gone", () => {
    expect(source(["app", "components"]).filter((f) => /accent-soft/.test(readFileSync(f, "utf8")))).toEqual([]);
  });
});

describe("every token used is defined", () => {
  const defined = new Set([...CSS.matchAll(/--([a-z][a-z0-9-]*)\s*:/g)].map((m) => m[1]));
  const used = (text: string) => [...text.matchAll(/var\(--([a-z][a-z0-9-]*)/g)].map((m) => m[1]);

  it("no var(--x) in app/, components/ or lib/ names a token the theme does not define", () => {
    const missing = source(["app", "components", "lib"]).flatMap((f) => used(readFileSync(f, "utf8")).filter((name) => !defined.has(name)).map((name) => `${f}: --${name}`));
    expect([...new Set(missing)]).toEqual([]);
  });

  it("the check fails on an undefined token (the motion tokens, once lost in a rewrite)", () => {
    const without = new Set([...defined].filter((name) => !name.startsWith("motion")));
    expect(used("animation: ui-settle var(--motion-fast) var(--ease-out);").filter((name) => !without.has(name))).toEqual(["motion-fast"]);
  });
});
