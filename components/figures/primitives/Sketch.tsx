/**
 * The sketch (owner, 2026-11-15; FIGURE-DESIGN 0.1): a shape only, resting on a background concept
 * the owner has reviewed. This file is the only place a dotted line is drawn
 * (`scripts/visual-system.test.ts`), so every dotted mark in a figure comes through here and
 * carries the sketch it belongs to.
 *
 * A sketch is monochrome (its ink comes from the checked spec, never orange), thin, dotted, has
 * no fill of its own, no ticks and no values. The tag "Sketch, not data" is drawn on the figure.
 * Each component refuses to draw without a resolved sketch whose tag is right, so a figure cannot
 * pass a dotted line off as anything else.
 */

import type { ReactNode } from "react";
import { SKETCH_TAG } from "@/lib/content/sketch";
import type { ResolvedSketch } from "@/lib/content/types";
import { DOT, FONT, INK, LINE, META, MUTED } from "../shared";

const INKS: Record<ResolvedSketch["ink"], string> = { ink: INK, muted: MUTED, meta: META, line: LINE };

/** Throws unless this is a resolved, correctly tagged sketch. */
export function assertSketch(sketch: ResolvedSketch | undefined): asserts sketch is ResolvedSketch {
  if (!sketch || typeof sketch.sketch !== "string" || !sketch.concept) throw new Error("figure: a dotted mark must come from a declared sketch (\"sketch:<id>\" in params)");
  if (sketch.tag !== SKETCH_TAG) throw new Error(`figure: the sketch "${sketch.sketch}" must be tagged "${SKETCH_TAG}"`);
  if (!(sketch.ink in INKS)) throw new Error(`figure: the sketch "${sketch.sketch}" is monochrome`);
}

/** A sketch's label by name. A missing label is an error, so a sketch cannot draw an unchecked word. */
export function sketchLabel(sketch: ResolvedSketch, name: string): string {
  const text = sketch.labels[name];
  if (typeof text !== "string") throw new Error(`figure: the sketch "${sketch.sketch}" has no label "${name}" in its words`);
  return text;
}

/** A dotted path in the sketch's ink. `ink` may only lighten it to another monochrome ink. */
export function SketchPath({ sketch, d, ink, width = 1.5 }: { sketch: ResolvedSketch; d: string; ink?: ResolvedSketch["ink"]; width?: number }) {
  assertSketch(sketch);
  return (
    <path
      d={d} fill="none" stroke={INKS[ink ?? sketch.ink]} strokeWidth={width} strokeDasharray={DOT} strokeLinecap="round"
      data-sketch={sketch.sketch} data-concept={sketch.concept}
    />
  );
}

/** A dotted outline (a shape drawn as a sketch: a token, a block). No fill: a sketch has none of its own. */
export function SketchShape({ sketch, children }: { sketch: ResolvedSketch; children: ReactNode }) {
  assertSketch(sketch);
  return (
    <g fill="none" stroke={INKS[sketch.ink]} strokeWidth={1.25} strokeDasharray={DOT} strokeLinecap="round" data-sketch={sketch.sketch} data-concept={sketch.concept}>
      {children}
    </g>
  );
}

/** The tag, on the figure itself. */
export function SketchTag({ sketch, x, y, anchor = "start", size = 10.5 }: { sketch: ResolvedSketch; x: number; y: number; anchor?: "start" | "middle" | "end"; size?: number }) {
  assertSketch(sketch);
  return (
    <text x={x} y={y} textAnchor={anchor} fill={MUTED} fontSize={size} fontStyle="italic" fontFamily={FONT} data-sketch-tag={sketch.sketch}>
      {sketch.tag}
    </text>
  );
}
