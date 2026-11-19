/**
 * The energy ledger (sleep extension and energy intake). Pure: where each bar, range and label
 * goes. All four bars share one scale, running from the lowest to the highest end of the printed
 * 95% ranges, so twice the change is twice the length. Nothing here is a quantity of its own:
 * every value placed comes from a gated estimate handed in by the figure.
 */

import type { ResolvedEstimate } from "@/lib/content/types";
import { textWidth } from "./interval-layout";

export const LEDGER_FRAME = {
  right: 320, size: 10.5, small: 9.5,
  title: 14, subtitle: 28, axis: 46,
  /** The bars' scale. Room is left on either side for the printed value beyond a range's end. */
  plot: { left: 46, right: 274 },
  /** One group: its name, then two rows (a word above a bar), then, in the full view, its weight line. */
  group: { first: 70, rowLabel: 17, bar: 22, row: 34, barHeight: 13, weightBelow: 18, gap: 26 },
  valueGap: 5, cap: 3,
} as const;

const F = LEDGER_FRAME;
const G = F.group;

type Sized = Pick<ResolvedEstimate, "point" | "ciLow" | "ciHigh">;

const lowOf = (e: Sized) => Math.min(e.point, e.ciLow ?? e.point);
const highOf = (e: Sized) => Math.max(e.point, e.ciHigh ?? e.point);

/** A value's place on the shared scale. The scale always includes no change. */
export function ledgerScale(estimates: Sized[]): (value: number) => number {
  const low = Math.min(0, ...estimates.map(lowOf));
  const high = Math.max(0, ...estimates.map(highOf));
  const span = high - low || 1;
  return (value) => F.plot.left + ((value - low) / span) * (F.plot.right - F.plot.left);
}

/** The bottom of a group's two bars. */
export const barsBottom = (top: number) => top + G.bar + G.row + G.barHeight;
/** The weight line's baseline, under the bars. The glance view has none: it shows no numbers. */
export const weightY = (top: number) => barsBottom(top) + G.weightBelow;
/** The lowest mark of a group: its weight line in the full view, its bars in the glance view. */
export const contentBottom = (top: number, full: boolean) => (full ? weightY(top) + F.size * 0.3 : barsBottom(top));
const groupHeight = (full: boolean) => contentBottom(0, full) + G.gap;
export const groupTop = (i: number, full: boolean) => G.first + i * groupHeight(full);
/** The rule between two groups, midway between the last mark above and the next group's name. */
export const dividerY = (i: number, full: boolean) => (contentBottom(groupTop(i - 1, full), full) + groupTop(i, full) - F.size * 0.75) / 2;
export const ledgerHeight = (groups: number, full: boolean) => contentBottom(groupTop(groups - 1, full), full) + F.small;

/** The two rows of a group, top to bottom. */
export const ROWS = { food: 0, burned: 1 } as const;
export type Row = (typeof ROWS)[keyof typeof ROWS];
export const lastGroupTop = (groups: number, full: boolean) => groupTop(groups - 1, full);

export const rowLabelY = (top: number, row: number) => top + G.rowLabel + row * G.row;
export const barY = (top: number, row: number) => top + G.bar + row * G.row;
export const barMid = (top: number, row: number) => barY(top, row) + G.barHeight / 2;

/** The bar from no change to the point estimate, never thinner than a hairline. */
export function barRect(e: Sized, at: (v: number) => number, top: number, row: number) {
  const zero = at(0);
  const end = at(e.point);
  return { x: Math.min(zero, end), y: barY(top, row), width: Math.max(Math.abs(end - zero), 1), height: G.barHeight };
}

/** The printed 95% range as a thin line with end caps, through the middle of the bar. */
export function rangeLine(e: Sized, at: (v: number) => number, top: number, row: number) {
  if (e.ciLow === null || e.ciHigh === null) return null;
  const y = barMid(top, row);
  return { x1: at(e.ciLow), x2: at(e.ciHigh), y, cap: F.cap };
}

/** The value sits just past the far end of the bar or its range, on the side the change went. */
export function valuePlace(e: Sized, at: (v: number) => number, top: number, row: number, text: string) {
  const up = e.point >= 0;
  const x = up ? at(highOf(e)) + F.valueGap : at(lowOf(e)) - F.valueGap;
  return { x, y: barMid(top, row) + F.size / 3, anchor: up ? ("start" as const) : ("end" as const), fits: up ? x + textWidth(text, F.size) <= F.right : x - textWidth(text, F.size) >= 0 };
}

