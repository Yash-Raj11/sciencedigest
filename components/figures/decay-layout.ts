/**
 * Where the decay figure puts things, and the sums behind what it says. Kind
 * files hold no number of their own (the figure guard), so the frame and the
 * arithmetic live here. Pure.
 */

import type { ResolvedFact } from "@/lib/content/types";
import { amountLeftRange, decayCurve, fractionLeft, type Range } from "@/lib/models/decay";
import { simulatorBand, type Band } from "@/lib/models/spread";

/**
 * The drawing area inside the 320-unit frame, and the height of the whole figure.
 * `left` leaves room for the share words ("all", "half", "quarter"); `size` is the label
 * size, so a label is at least 14 px when the 320 units are drawn 300 px wide.
 */
export const DECAY_FRAME = { left: 70, top: 30, width: 240, height: 132, figureHeight: 200, labelGap: 22, size: 15, tick: 5 };

/** One answer field: 48 px tall, so it is a full touch target. */
export const DECAY_FIELD = "mt-1 block h-12 w-full min-w-0 rounded-lg border border-line bg-bg px-3 text-base text-ink";

/** How many halvings the chart spans: whole, a half, a quarter, an eighth, a sixteenth. */
const HALVINGS = 4;
/** Points per curve: enough that the bend looks smooth at phone width. */
const CURVE_STEPS = 64;

/** The shares named on the left of the chart, in words (no digits in a figure's text). */
export const SHARE_TICKS = [
  { share: 1, word: "all" },
  { share: 0.5, word: "half" },
  { share: 0.25, word: "quarter" },
];

/** The times of each halving of the middle half-life: the ticks under the chart. */
export function halvings(halfLife: number): { times: number[]; levels: number[] } {
  const times = Array.from({ length: HALVINGS + 1 }, (_, i) => i * halfLife);
  return { times, levels: times.map((time) => fractionLeft(time, halfLife)) };
}

/** Position of a time and a share inside the frame; `x` is null past the end of the chart. */
export function decayPlace(halfLife: number) {
  const last = HALVINGS * halfLife;
  const { left, top, width, height } = DECAY_FRAME;
  return {
    last,
    x: (hours: number): number | null => (hours > last ? null : left + (hours / last) * width),
    y: (share: number): number => top + height - share * height,
  };
}

/**
 * The middle curve and, when there is a band, the shaded area between its two ends:
 * the slow end of the half-life leaves more at every hour, the fast end less.
 */
export function decayPaths(point: number, band: Range | null): { line: string; area: string | null } {
  const place = decayPlace(point);
  const toXY = (curve: { hour: number; share: number }[]) => curve.map((p) => `${(place.x(p.hour) ?? 0).toFixed(1)},${place.y(p.share).toFixed(1)}`);
  const line = `M${toXY(decayCurve(point, place.last, CURVE_STEPS)).join("L")}`;
  if (!band) return { line, area: null };
  const slow = toXY(decayCurve(band.high, place.last, CURVE_STEPS));
  const fast = toXY(decayCurve(band.low, place.last, CURVE_STEPS)).reverse();
  return { line, area: `M${slow.join("L")}L${fast.join("L")}Z` };
}

/** A tick label is centred on its tick. The last tick has none: at phone width it would run into its neighbour. */
export const tickLabelled = (i: number, count: number): boolean => i < count - 1;

/** The bedtime label sits on the side of its line that has room. */
export const markAnchor = (x: number): "start" | "end" => (x > DECAY_FRAME.left + DECAY_FRAME.width / 2 ? "end" : "start");

/** A band end exactly as worked out from the printed numbers (3.94 h), not rounded for the axis. */
export const exactHours = (hours: number): string => `${hours.toLocaleString("en", { maximumFractionDigits: 6 })} h`;

export const hoursLabel = (hours: number): string => `${Number(hours.toFixed(1)).toLocaleString("en")} h`;

/** The plain sentence over the chart: when half is gone, as the band. */
export const halfGoneWords = (band: Range): string => `Half of it is gone ${exactHours(band.low).replace(" h", "")} to ${exactHours(band.high)} after you take it.`;

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
const percent = (share: number): string => `${Math.round(share * 100)}%`;
const MINUTES_PER_DAY = 1440;

/** Minutes after midnight for "HH:MM", or null for anything else (an empty field). */
export function clockMinutes(text: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(text.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  return hours < 24 && minutes < 60 ? hours * 60 + minutes : null;
}

/** Hours from the dose to bed. A bedtime at or before the dose is the next day. */
export function hoursUntil(fromText: string, toText: string): number | null {
  const from = clockMinutes(fromText);
  const to = clockMinutes(toText);
  if (from === null || to === null) return null;
  const gap = (to - from + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  return (gap === 0 ? MINUTES_PER_DAY : gap) / 60;
}

export function gapWords(hours: number): string {
  const total = Math.round(hours * 60);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

export interface BedtimeEstimate {
  hours: number;
  /** The share left at bedtime: the fast end of the half-life leaves `low`, the slow end `high`. */
  share: Range;
  /** "29% to 47%" */
  percentWords: string;
  /** "28 to 44", or null until the reader types an amount. */
  amountWords: string | null;
  amount: number | null;
}

/**
 * The personal estimate at bedtime, always a range (H12). Null until both times are
 * given: nothing is assumed for an answer the reader has not given. The amount is
 * optional; without it the range is a share of the dose.
 */
export function estimateAtBed(amountText: string, doseText: string, bedText: string, halfLife: Range): BedtimeEstimate | null {
  const hours = hoursUntil(doseText, bedText);
  if (hours === null) return null;
  const share = { low: fractionLeft(hours, halfLife.low), high: fractionLeft(hours, halfLife.high) };
  const amount = amountText.trim() === "" ? Number.NaN : Number(amountText);
  const usable = Number.isFinite(amount) && amount > 0;
  const left = usable ? amountLeftRange(amount, hours, halfLife) : null;
  return {
    hours,
    share,
    percentWords: `${percent(share.low)} to ${percent(share.high)}`,
    amountWords: left ? `${round(left.low)} to ${round(left.high)}` : null,
    amount: usable ? amount : null,
  };
}
