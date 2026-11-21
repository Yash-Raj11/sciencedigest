/**
 * Draws a slide to PNG with Satori (bundled in Next as `next/og`, Satori 0.29: no extra
 * dependency). Before a pixel is drawn, the slide tree is checked (satori-rules.ts) and every
 * character is checked against the font it is set in (glyphs.ts). Any problem stops the render:
 * it fails closed. Node only (it reads the font files).
 */

import { ImageResponse } from "next/og";
import type { CarouselDeck } from "../content/types";
import { fontFor, loadFonts } from "./fonts";
import { missingGlyphs } from "./glyphs";
import { inspectTree } from "./satori-rules";
import { slideElement } from "./Slide";
import { SANS, SLIDE, type Look } from "./tokens";

export class SlideProblems extends Error {
  constructor(readonly where: string, readonly problems: string[]) {
    super(`${where}: ${problems.length} problem(s)\n  - ${problems.join("\n  - ")}`);
  }
}

/** Every rule problem and missing glyph of one slide's tree. Empty means it may be drawn. */
export function checkSlideTree(element: unknown): string[] {
  const fonts = loadFonts();
  const { problems, runs } = inspectTree(element, { family: SANS, weight: 400, style: "normal" });
  for (const run of runs) {
    const font = fontFor(fonts, run.family, run.weight, run.style);
    const missing = missingGlyphs(run.text, font.covered);
    if (missing.length) {
      problems.push(`"${run.text}": ${missing.map((c) => `"${c}" (U+${c.codePointAt(0)!.toString(16).toUpperCase().padStart(4, "0")})`).join(", ")} not in ${font.name} ${font.weight} ${font.style}; it would draw as an empty box`);
    }
  }
  return problems;
}

/** One slide as PNG bytes, in one look. `index` is 0-based. Throws SlideProblems rather than draw a bad slide. */
export async function renderSlide(deck: CarouselDeck, index: number, look: Look = "dark"): Promise<Buffer> {
  const element = slideElement(deck, index, look);
  const problems = checkSlideTree(element);
  if (problems.length) throw new SlideProblems(`${deck.slug} slide ${index + 1}`, problems);
  return renderElement(element, SLIDE.width, SLIDE.height);
}

/** Draws any checked element. Exported for the test render of inline svg. */
export async function renderElement(element: React.ReactElement, width: number, height: number): Promise<Buffer> {
  const fonts = loadFonts().map((f) => ({ name: f.name, data: f.data, weight: f.weight, style: f.style }));
  const response = new ImageResponse(element, { width, height, fonts });
  return Buffer.from(await response.arrayBuffer());
}
