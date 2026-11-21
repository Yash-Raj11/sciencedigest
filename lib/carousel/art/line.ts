/**
 * How the art draws a claim: solid orange when the paper measured it, dashed ink when it is the
 * authors' explanation. Scenery (the bay, the scale, the page) is quiet ink on the slide's own grey.
 * Every helper takes the slide's palette: dark slides and light slides draw the same shapes.
 */

import { paletteOf } from "../palettes";
import { DASH, STROKE, type Palette } from "../tokens";

export type Line = "solid" | "dashed";

export function claim(line: Line, pal: Palette = paletteOf("dark")) {
  return line === "solid"
    ? { stroke: pal["signal-evidence-text"], strokeWidth: STROKE.main, fill: "none" }
    : { stroke: pal.ink, strokeWidth: STROKE.main, strokeDasharray: DASH, fill: "none" };
}

/** A claim's filled shape: orange when measured, outlined (no fill) when proposed. */
export function claimFill(line: Line, pal: Palette = paletteOf("dark")) {
  return line === "solid" ? pal["signal-evidence-fill"] : "none";
}

export const scenery = (pal: Palette = paletteOf("dark")) => ({ stroke: pal.muted, strokeWidth: STROKE.thin, fill: "none" });
export const solidInk = (pal: Palette = paletteOf("dark")) => ({ stroke: pal.ink, strokeWidth: STROKE.thin, fill: pal.raised });
