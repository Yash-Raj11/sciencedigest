/**
 * FIGURE-DESIGN 1A, "the parking spot". Pure: where each drawn object and label goes in the two
 * panels ("Without caffeine", "With caffeine"). Nothing here is a quantity: how many tokens are
 * drawn is a picture, and the alt text says so.
 */

import { wrapLines } from "./crowds-layout";

export const PARKING_FRAME = {
  size: 10.5, line: 12.5, right: 320, mid: 160, pad: 6, stroke: 1.5, strong: 500,
  title: 14, topLabel: 32,
  /** The surface of a brain cell: a band along the bottom of the drawing. */
  cell: { y: 150, height: 14 },
  dock: { width: 34, depth: 22 },
  token: 7,
  under: 194, tags: 232,
} as const;

const F = PARKING_FRAME;

export type Side = "without" | "with";
export const panelX = (side: Side) => (side === "without" ? 0 : F.mid + F.pad);
export const panelWidth = () => F.mid - F.pad;
export const panelMid = (side: Side) => panelX(side) + panelWidth() / 2;
/** The dock sits in the middle of the panel, rising from the cell surface. */
export const dockMid = (side: Side) => panelMid(side);

/** A cup-shaped dock: open at the top, its floor on the cell surface. */
export function dockPath(side: Side): string {
  const cx = dockMid(side);
  const w = F.dock.width / 2;
  const top = F.cell.y - F.dock.depth;
  return `M ${cx - w} ${top} V ${F.cell.y - 4} Q ${cx - w} ${F.cell.y} ${cx - w + 4} ${F.cell.y} H ${cx + w - 4} Q ${cx + w} ${F.cell.y} ${cx + w} ${F.cell.y - 4} V ${top}`;
}
/** The token parked in the dock. */
export const parked = (side: Side) => ({ cx: dockMid(side), cy: F.cell.y - F.token - 3 });

/** A hexagon of radius r centred at (cx, cy): caffeine's token. */
export function hexagon(cx: number, cy: number, r: number): string {
  const pts = Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i;
    return `${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`;
  });
  return pts.join(" ");
}

/** Without caffeine: tokens drift down towards the dock, spread out. */
export function drifting(side: Side) {
  const x = panelX(side);
  const w = panelWidth();
  return [
    { cx: x + w * 0.18, cy: 74 }, { cx: x + w * 0.42, cy: 92 }, { cx: x + w * 0.78, cy: 80 }, { cx: x + w * 0.66, cy: 108 },
  ];
}

/** With caffeine: the same tokens, crowded just above the occupied dock, unable to land. */
export function crowded(side: Side) {
  const cx = dockMid(side);
  const top = F.cell.y - F.dock.depth - F.token - 4;
  const step = F.token * 2 + 3;
  return [
    { cx: cx - step * 1.5, cy: top }, { cx: cx - step * 0.5, cy: top - 2 }, { cx: cx + step * 0.5, cy: top }, { cx: cx + step * 1.5, cy: top - 2 },
    { cx: cx - step, cy: top - step - 1 }, { cx, cy: top - step - 3 }, { cx: cx + step, cy: top - step - 1 },
  ];
}

/** The glow under the dock when the signal lands: short rays below the cell surface. */
export function glow(side: Side): string {
  const cx = dockMid(side);
  const y = F.cell.y + F.cell.height + 3;
  return [-12, 0, 12].map((dx) => `M ${cx + dx} ${y} L ${cx + dx * 1.4} ${y + 7}`).join(" ");
}

export const panelLines = (text: string, width: number = panelWidth()) => wrapLines(text, width, F.size);
/** The baseline of line n of a block that starts at y. */
export const lineY = (y: number, n: number) => y + n * F.line;
