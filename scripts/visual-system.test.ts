/**
 * The visual system (owner, 2026-11-14; themes 2026-11-15), held by tests that fail when it is broken:
 *
 *   - the palette in app/globals.css is the owner's, in all three themes (dark, light, bedtime);
 *   - every text token reaches 4.5:1 on every surface it sits on, all three themes;
 *   - tokens are named by meaning: no hue-named token, no orange in a habit widget;
 *   - no bar is sized by evidence grade;
 *   - no colour is hard-coded outside the theme (a hex value in a component fails);
 *   - weights 400 and 500 only;
 *   - the pastel band is a surface: never a text colour, a button or a border.
 *
 * The orange budget (one focal item per 390 px screen, at most three) is a browser test
 * (tests/browser/readability.spec.ts).
 */

import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { MODES, contrast, contrastTable, solid, themeTokens } from "@/lib/contrast";
import { PAGE_COLOUR } from "@/lib/theme";

const CSS = readFileSync("app/globals.css", "utf8");
const tokens = themeTokens(CSS);

/**
 * The owner's values (2026-11-15). Bedtime keeps the 2026-11-14 dark tokens. The light finding
 * text is #E84E0F darkened until it reaches 4.5:1 on white, a card and the tint (#C8430D).
 */
const OWNER = {
  dark: { bg: "#090909", surface: "#141414", ink: "#f4f4f2", muted: "#9a9a95", line: "#262626", "signal-evidence-text": "#ff6b2b" },
  light: { bg: "#ffffff", surface: "#f7f7f5", ink: "#111111", muted: "#5c5c58", line: "#e2e2df", "signal-evidence-text": "#c8430d" },
  bedtime: { bg: "#0d0d0c", surface: "#171615", ink: "#edeae4", muted: "#b3aea6", meta: "#8f8a83", line: "#2a2826", "signal-evidence-text": "#ff7a2f" },
} as const;

/** Every theme defines every token, so a component never meets an undefined colour. */
const ROLES = ["bg", "surface", "raised", "line", "ink", "muted", "meta", "ink-routine", "signal-evidence-text", "signal-evidence-fill", "on-signal-evidence-fill", "signal-evidence-soft"];

const source = (dirs: string[]) =>
  execFileSync("git", ["ls-files", ...dirs], { encoding: "utf8" })
    .split("\n")
    .filter((f) => /\.(tsx?|css)$/.test(f) && !f.includes("generated") && !f.endsWith(".test.ts"));

describe("palette", () => {
  for (const mode of MODES) {
    it(`${mode}: the owner's values`, () => {
      for (const [name, value] of Object.entries(OWNER[mode])) expect(tokens[mode][name], `--${name}`).toBe(value);
    });

    it(`${mode}: every role is defined`, () => {
      expect(ROLES.filter((role) => !tokens[mode][role])).toEqual([]);
    });
  }

  it("the light finding text is the owner's orange, darkened just enough", () => {
    expect(contrast("#e84e0f", "#ffffff")).toBeLessThan(4.5);
    expect(contrast(tokens.light["signal-evidence-text"], "#ffffff")).toBeGreaterThanOrEqual(4.5);
  });

  it("the page is never pure black", () => {
    expect(tokens.dark.bg).not.toBe("#000000");
  });

  it("the browser chrome colour is a copy of --bg", () => {
    for (const mode of MODES) expect(PAGE_COLOUR[mode], mode).toBe(tokens[mode].bg);
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

  it("fails a token that is too faint (the owner's undarkened orange on white)", () => {
    expect(contrast("#e84e0f", tokens.light.bg)).toBeLessThan(4.5);
  });

  it("covers all three themes and every surface", () => {
    const rows = contrastTable(CSS);
    expect(new Set(rows.map((r) => r.mode))).toEqual(new Set(MODES));
    expect(rows.some((r) => r.on === "finding tint")).toBe(true);
    expect(rows.some((r) => r.text === "text on the finding fill")).toBe(true);
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

describe("the pastel fill is a surface", () => {
  const MISUSE = /\b(text|border|stroke|outline|decoration)-signal-evidence-fill\b|stroke=\{SIGNAL_FILL\}|color:\s*var\(--signal-evidence-fill\)/;

  it("never a text colour or a stroke (a selected chip may take it as its own border)", () => {
    const offenders = source(["app", "components"]).filter((f) => MISUSE.test(readFileSync(f, "utf8").replace(/border-signal-evidence-fill bg-signal-evidence-fill/g, "")));
    expect(offenders).toEqual([]);
  });

  it("the check fails on fill used as text", () => {
    expect(MISUSE.test('className="text-signal-evidence-fill"')).toBe(true);
    expect(MISUSE.test('className="bg-signal-evidence-fill"')).toBe(false);
  });
});

describe("tokens named by meaning", () => {
  const OLD_OR_HUE = /--(orange|peach|apricot|sage|accent|accent-text|accent-ink|band)\b|\b(text|bg|border|fill|stroke)-(orange|peach|sage|accent|accent-text|band)\b|var\(--(accent|band|sage)/;

  it("no hue-named or retired token in app/, components/ or lib/", () => {
    const offenders = source(["app", "components", "lib"]).filter((f) => OLD_OR_HUE.test(readFileSync(f, "utf8")));
    expect(offenders).toEqual([]);
  });

  it("the check fails on a hue name and on a retired token", () => {
    for (const bad of ["var(--orange)", 'className="bg-band"', "text-accent-text", "--sage: #fff;"]) expect(OLD_OR_HUE.test(bad), bad).toBe(true);
    expect(OLD_OR_HUE.test("text-signal-evidence-text")).toBe(false);
  });
});

describe("habits and the Life Game are monochrome", () => {
  const ORANGE = /signal-evidence|SIGNAL_(TEXT|FILL)/;
  const habitFiles = () => source(["components/game", "app/today"]);

  it("no orange token in a habit or Life Game widget", () => {
    expect(habitFiles().length).toBeGreaterThan(3);
    expect(habitFiles().filter((f) => ORANGE.test(readFileSync(f, "utf8")))).toEqual([]);
  });

  it("the check fails on an orange number in the Life Game", () => {
    expect(ORANGE.test('<p className="figure text-signal-evidence-text">')).toBe(true);
  });
});

describe("no bar sized by evidence grade", () => {
  const SIZED = /flexGrow:\s*\w*\.?(tenths|weight|grade)|width:\s*`?\$?\{?\w*\.?(tenths|weight)/;

  it("the Life Game bar gives every block the same width", () => {
    const offenders = source(["components"]).filter((f) => SIZED.test(readFileSync(f, "utf8")));
    expect(offenders).toEqual([]);
  });

  it("the check fails on a block as wide as its weight", () => {
    expect(SIZED.test("style={{ flexGrow: s.tenths, flexBasis: 0 }}")).toBe(true);
    expect(SIZED.test("style={{ flexGrow: 1 }}")).toBe(false);
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
