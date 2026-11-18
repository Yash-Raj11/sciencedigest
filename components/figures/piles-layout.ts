/**
 * FIGURE-DESIGN 4A, "two piles and a session". Pure: where each drawn object and label goes.
 * Nothing here is a quantity. The two piles are the same size before and after, because the
 * paper prints no block sizes; the change is carried by the labels, bound to fm_all and ffm_all.
 * The session strips are a picture of two patterns, not a count of intervals.
 */

import { wrapLines } from "./crowds-layout";

export const PILES_FRAME = {
  size: 10.5, line: 12.5, right: 320, mid: 172,
  /** Top band: the body as two piles. */
  title: 14, person: { cx: 17, top: 34, height: 84 },
  block: { dx: 38, width: 30, freeTop: 28, freeHeight: 58, fatHeight: 34, gap: 4 },
  labelGap: { name: 8, change: 18 }, chevronGap: 8, why: 146,
  /** Text at either edge sits this far in, so an italic tag is not clipped by the card. */
  inset: 4,
  /** Bottom band: a session as a strip. */
  rule: 158, strip: { height: 26, low: 8, x: 10 },
  shortTitle: 180, shortTop: 190, longTitle: 248, longTop: 258, after: 304,
  short: { burst: 10, rest: 10, count: 4 },
  long: { burst: 44, rest: 40, count: 2 },
  stripLabelGap: 14,
} as const;

const F = PILES_FRAME;
const B = F.block;

export type Side = "before" | "after";
/** The left edge of a panel. */
export const panelX = (i: Side) => (i === "before" ? 0 : F.mid + 8);
export const panelMid = (i: Side) => panelX(i) + (F.mid - 8) / 2;
/** The upper block (fat-free mass) and the lower block (fat), the same in both panels. */
export const freeBlock = (i: Side) => ({ x: panelX(i) + B.dx, y: B.freeTop, width: B.width, height: B.freeHeight });
export const fatBlock = (i: Side) => ({ x: panelX(i) + B.dx, y: B.freeTop + B.freeHeight + B.gap, width: B.width, height: B.fatHeight });
export const blockMid = (b: { y: number; height: number }) => b.y + b.height / 2;
/** Labels to the right of the blocks, inside the panel: names before, the measured change after. */
export const labelX = (i: Side) => panelX(i) + B.dx + B.width + (i === "before" ? F.labelGap.name : F.labelGap.change);
export const chevronX = (i: Side) => panelX(i) + B.dx + B.width + F.chevronGap;
export const personX = (i: Side) => panelX(i) + F.person.cx;
export const labelWidth = (i: Side) => (i === "before" ? F.mid - 8 : F.right) - labelX(i);
export const pileLines = (text: string, i: Side) => wrapLines(text, labelWidth(i), F.size);
/** A block of lines centred on y. */
export const centredFrom = (y: number, lines: number) => y - ((lines - 1) * F.line) / 2 + F.size / 3;

/** A small chevron beside a block: down for less, up for more. A tick, never a long line. */
export function chevron(x: number, y: number, down: boolean): string {
  const w = 4;
  const h = down ? 3 : -3;
  return `M ${x - w} ${y - h} L ${x} ${y + h} L ${x + w} ${y - h}`;
}

/** One strip of a session: tall blocks (hard effort) with low blocks or flat gaps (rest) between. */
export function stripBlocks(top: number, pattern: { burst: number; rest: number; count: number }, activeRest: boolean) {
  const S = F.strip;
  const base = top + S.height;
  const bursts: { x: number; y: number; width: number; height: number }[] = [];
  const rests: { x: number; y: number; width: number; height: number }[] = [];
  let x = S.x;
  for (let i = 0; i < pattern.count; i++) {
    bursts.push({ x, y: top, width: pattern.burst, height: S.height });
    x += pattern.burst;
    rests.push({ x, y: activeRest ? base - S.low : base, width: pattern.rest, height: activeRest ? S.low : 0 });
    x += pattern.rest;
  }
  return { bursts, rests, base, end: x, lastBurst: bursts[bursts.length - 1], lastRest: rests[rests.length - 1] };
}

/** "Hard effort, 60 seconds or less", from a number bound to its fact. */
export const cutWords = (lead: string, n: number, unit: string) => `${lead} ${n} ${unit}`;
/** The strip's labels sit right of the short strip, inside the dashed outline. */
export const stripLabelX = (end: number) => end + F.stripLabelGap;
export const stripLines = (text: string, end: number) => wrapLines(text, F.right - F.strip.x - stripLabelX(end), F.size);
