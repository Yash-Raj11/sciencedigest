/**
 * The two app fonts, as static .woff files (Satori reads TTF, OTF and WOFF, never WOFF2, and
 * draws only the default instance of a variable font). Same families as the site:
 * Archivo for numbers and plain text, Newsreader for headings. Node only.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { coveredCodePoints } from "./glyphs";
import { SANS, SERIF } from "./tokens";

type Weight = 400 | 500 | 600 | 700 | 800;
export interface SlideFont { name: string; weight: Weight; style: "normal" | "italic"; file: string }

export const FONTS: SlideFont[] = [
  { name: SANS, weight: 400, style: "normal", file: "@fontsource/archivo/files/archivo-latin-400-normal.woff" },
  { name: SANS, weight: 500, style: "normal", file: "@fontsource/archivo/files/archivo-latin-500-normal.woff" },
  { name: SANS, weight: 700, style: "normal", file: "@fontsource/archivo/files/archivo-latin-700-normal.woff" },
  { name: SANS, weight: 800, style: "normal", file: "@fontsource/archivo/files/archivo-latin-800-normal.woff" },
  { name: SERIF, weight: 400, style: "normal", file: "@fontsource/newsreader/files/newsreader-latin-400-normal.woff" },
  { name: SERIF, weight: 500, style: "normal", file: "@fontsource/newsreader/files/newsreader-latin-500-normal.woff" },
  { name: SERIF, weight: 600, style: "normal", file: "@fontsource/newsreader/files/newsreader-latin-600-normal.woff" },
  { name: SERIF, weight: 400, style: "italic", file: "@fontsource/newsreader/files/newsreader-latin-400-italic.woff" },
];

export interface LoadedFont extends SlideFont { data: Buffer; covered: Set<number> }

let cache: LoadedFont[] | null = null;

export function loadFonts(root = process.cwd()): LoadedFont[] {
  if (cache) return cache;
  cache = FONTS.map((f) => {
    if (!f.file.endsWith(".woff")) throw new Error(`fonts: ${f.file} is not a .woff file`);
    const data = readFileSync(path.join(root, "node_modules", f.file));
    return { ...f, data, covered: coveredCodePoints(data) };
  });
  return cache;
}

/** The font Satori will pick for a text run: same family and style, nearest weight. */
export function fontFor(fonts: LoadedFont[], family: string, weight: number, style: string): LoadedFont {
  const same = fonts.filter((f) => f.name === family && f.style === style);
  if (same.length === 0) throw new Error(`fonts: no ${family} ${style} is loaded`);
  return same.reduce((best, f) => (Math.abs(f.weight - weight) < Math.abs(best.weight - weight) ? f : best));
}
