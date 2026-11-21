/**
 * The slide palettes, read from app/globals.css itself: Satori has no CSS variables, so each
 * colour is looked up in the theme block it belongs to and handed to the slide as a value. There
 * is no second copy of the palette to drift (CLAUDE.md: all colours come from the tokens in
 * app/globals.css). A token missing from its theme block stops the render. Node only.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { themeTokens } from "./css-tokens";
import { COLOR_KEYS, VIVID_TOKENS, type ColorKey, type Look, type Palette } from "./tokens";

/** The theme the default (black) look reads. */
export const COLOR_THEME = "dark";

type Names = Partial<Record<ColorKey, string>>;

/** Which theme block each look reads, and which token a key reads there when it differs (the bright orange). */
export const PALETTE_SPECS: { look: Look; theme: "dark" | "light"; names: Names }[] = [
  { look: "dark", theme: "dark", names: {} },
  { look: "light", theme: "light", names: {} },
  { look: "dark-vivid", theme: "dark", names: VIVID_TOKENS },
  { look: "light-vivid", theme: "light", names: VIVID_TOKENS },
];

/** One palette from a stylesheet's text. */
export function paletteFrom(css: string, theme: string, names: Names = {}): Palette {
  const site = themeTokens(css, theme);
  const out = {} as Record<ColorKey, string>;
  for (const key of COLOR_KEYS) {
    const name = names[key] ?? key;
    if (site[name] === undefined) throw new Error(`palettes: --${name} is not a ${theme} token in app/globals.css`);
    out[key] = site[name];
  }
  return out;
}

let cache: { look: Look; theme: "dark" | "light"; names: Names; colors: Palette }[] | null = null;

/** Every look's palette, read once from app/globals.css. */
export function palettes(root = process.cwd()) {
  if (cache) return cache;
  const css = readFileSync(path.join(root, "app", "globals.css"), "utf8");
  cache = PALETTE_SPECS.map((spec) => ({ ...spec, colors: paletteFrom(css, spec.theme, spec.names) }));
  return cache;
}

export const paletteOf = (look: Look): Palette => palettes().find((p) => p.look === look)!.colors;
