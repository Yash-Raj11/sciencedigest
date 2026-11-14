/**
 * FIGURE-DESIGN 2A, "from the tongue to the blood": two rows (the plain meal, the meal with the
 * spice), each a chain of four drawn objects. Pure: where each object, link and label goes.
 * Nothing here is a quantity: the objects are pictures, and every number a label shows comes
 * from params, bound to a gated fact.
 */

import { wrapLines } from "./crowds-layout";

export const CHAIN_FRAME = {
  titleX: 9, left: 22, box: 62, link: 14, icon: 46,
  header: 12, top: 66, stateAbove: 126, bottom: 156, arrow: 216, under: 234,
  size: 10.5, line: 12.5, gap: 10, right: 320,
} as const;

const F = CHAIN_FRAME;

/** The left edge of object i (0 to 3). */
export const colX = (i: number) => F.left + i * (F.box + F.link);
/** The centre of object i. */
export const colMid = (i: number) => colX(i) + F.box / 2;
/** A link from object i to object i + 1, at height y: from one box's right edge to the next box's left edge. */
export const linkX = (i: number) => ({ x1: colX(i) + F.box + 2, x2: colX(i + 1) - 2 });
/** Where a row of icons is vertically centred. */
export const rowMid = (top: number) => top + F.icon / 2;
/** Lines of a label that may use the object's width and the link beside it. */
export const labelLines = (text: string, width: number = F.box + F.link) => wrapLines(text, width, F.size);
/** The baseline of line n of a block that starts at y. */
export const lineY = (y: number, n: number) => y + n * F.line;
/** The last object's labels may run to the frame's right edge. */
export const lastWidth = () => F.right - colX(3) + F.link / 2;
/** "at 30 minutes" from a number bound to its fact. */
export const atWords = (lead: string, n: number, unit: string) => `${lead} ${n} ${unit}`;
/** The frame's height under the lowest block of lines. */
export const chainHeight = (blocks: { y: number; lines: number }[]) =>
  Math.max(...blocks.map((b) => lineY(b.y, b.lines - 1))) + F.gap;
/** The note under the dashed part of the chain spans the first three objects. */
export const ideaWidth = () => colX(3) - colX(0) - F.link;
