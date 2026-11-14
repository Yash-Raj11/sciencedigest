/**
 * Where the decay figure puts things, and the sums behind what it says. Kind
 * files hold no number of their own (the figure guard), so the frame and the
 * arithmetic live here. Pure.
 */

import type { ResolvedFact } from "@/lib/content/types";
import { amountLeftRange, fractionLeft, type Range } from "@/lib/models/decay";
import { simulatorBand, type Band } from "@/lib/models/spread";

/** The drawing area inside the 320-unit frame, and the height of the whole figure. */
export const DECAY_FRAME = { left: 24, top: 18, width: 272, height: 96, figureHeight: 150, labelGap: 16 };

/** One answer field: 48 px tall, so it is a full touch target. */
export const DECAY_FIELD = "mt-1 block h-12 w-full rounded-lg border border-line bg-bg px-3 text-base";

/** How many halvings the still view shows: whole, a half, a quarter, an eighth, a sixteenth. */
const HALVINGS = 4;

/** The times and levels of the still curve: one point at each halving, and no others. */
export function halvings(halfLife: number): { times: number[]; levels: number[] } {
  const times = Array.from({ length: HALVINGS + 1 }, (_, i) => i * halfLife);
  return { times, levels: times.map((time) => fractionLeft(time, halfLife)) };
}

/** Position of a time and a share inside the frame; `x` is null past the last halving drawn. */
export function decayPlace(halfLife: number) {
  const last = HALVINGS * halfLife;
  const { left, top, width, height } = DECAY_FRAME;
  return {
    x: (hours: number): number | null => (hours > last ? null : left + (hours / last) * width),
    y: (share: number): number => top + height - share * height,
  };
}

/** A band end exactly as worked out from the printed numbers (3.94 h), not rounded for the axis. */
export const exactHours = (hours: number): string => `${hours.toLocaleString("en", { maximumFractionDigits: 6 })} h`;

export const hoursLabel = (hours: number): string => `${Number(hours.toFixed(1)).toLocaleString("en")} h`;

/**
 * The half-life band and what to call it: mean ± 1 SD, or a CI, range or IQR as printed, never
 * converted (lib/models/spread.ts). Null when the fact prints no spread: no simulator (H12).
 */
export function halfLifeRange(fact: ResolvedFact): Band | null {
  const e = fact.estimate;
  if (!e) return null;
  return simulatorBand({ point: e.point, ciLow: e.ciLow, ciHigh: e.ciHigh, spread: fact.spread ?? null });
}

const round = (n: number): string => (n < 10 ? Number(n.toFixed(1)) : Math.round(n)).toLocaleString("en");

/**
 * The personal estimate, always a range (H12). Null until both answers are
 * usable numbers: nothing is assumed for an answer the reader has not given.
 */
export function estimateLeft(amountText: string, hoursText: string, halfLife: Range): { hours: number; share: Range; words: string } | null {
  const amount = amountText.trim() === "" ? Number.NaN : Number(amountText);
  const hours = hoursText.trim() === "" ? Number.NaN : Number(hoursText);
  if (!Number.isFinite(amount) || !Number.isFinite(hours) || amount <= 0 || hours < 0) return null;
  const left = amountLeftRange(amount, hours, halfLife);
  return {
    hours,
    share: { low: left.low / amount, high: left.high / amount },
    words: `${round(left.low)} to ${round(left.high)}`,
  };
}
