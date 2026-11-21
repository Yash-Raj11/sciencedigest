/** The slide palettes come from app/globals.css itself, so there is no copy to drift. */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { themeTokens } from "./css-tokens";
import { paletteFrom, palettes } from "./palettes";
import { COLOR_KEYS, LOOKS, VIVID_TOKENS } from "./tokens";

const css = readFileSync("app/globals.css", "utf8");

describe("the slide palettes", () => {
  it("read every key from its theme block, value for value", () => {
    for (const { theme, names, colors } of palettes()) {
      const site = themeTokens(css, theme);
      for (const key of COLOR_KEYS) expect(colors[key]).toBe(site[(names as Record<string, string>)[key] ?? key]);
    }
  });

  it("give every look a palette, the bright looks reading the deck-only tokens", () => {
    expect(palettes().map((p) => p.look)).toEqual([...LOOKS]);
    const vivid = palettes().find((p) => p.look === "dark-vivid")!;
    expect(vivid.colors["signal-evidence-fill"]).toBe(themeTokens(css, "dark")[VIVID_TOKENS["signal-evidence-fill"]]);
  });

  it("stop the render when a token is missing from its theme block", () => {
    const broken = css.replace(/(\[data-theme="dark"\]\s*\{[^}]*?)--muted:[^;]+;/, "$1");
    expect(() => paletteFrom(broken, "dark")).toThrow(/--muted is not a dark token/);
  });
});
