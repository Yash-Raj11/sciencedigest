/**
 * Where the association-curve figure puts things, and the words behind what it
 * says. Kind files hold no number of their own (the figure guard), so the frame,
 * the sums and the formatting live here. Pure.
 *
 * Every value shown is printed in the paper: a group's raw share, and a later
 * group's adjusted difference from the first group with its 95% CI. Nothing is
 * interpolated between groups, and nothing is shown outside them.
 */

import type { ResolvedFact } from "@/lib/content/types";
import { simulatorBand, type Band } from "@/lib/models/spread";

export interface Cited { n: number; ref: string }
export interface GroupEdges { from: Cited; to: Cited; meanAge?: Cited }

/** The drawing area inside the 320-unit frame. Labels are 15 units, at least 14 px at phone width. */
export const CURVE_FRAME = { left: 6, top: 34, width: 308, height: 120, figureHeight: 222, gap: 4, size: 15, valueGap: 8, axisGap: 22, titleGap: 46 };

/** One answer button: 48 px tall, so it is a full touch target. */
export const DAY_BUTTON = "flex h-12 min-w-0 cursor-pointer items-center justify-center rounded-lg border text-lg font-bold";

const DASH = "–";
const MINUS = "−";

/** "0", "1–2", "3–7": the chart's labels, under the axis title. */
export const groupSpan = (group: GroupEdges): string => (group.from.n === group.to.n ? `${group.from.n}` : `${group.from.n}${DASH}${group.to.n}`);

/** "0 days", "1–2 days", "3–7 days". */
export const groupLabel = (group: GroupEdges, unit = "days"): string => `${groupSpan(group)} ${unit}`;

/** Every value a reader may pick: the measured range, edge to edge, and nothing outside it. */
export function choices(groups: GroupEdges[]): number[] {
  if (groups.length === 0) return [];
  const first = groups[0].from.n;
  const last = groups[groups.length - 1].to.n;
  return Array.from({ length: last - first + 1 }, (_, i) => first + i);
}

/** The group a value falls in, or -1 outside the measured range. */
export const groupOf = (groups: GroupEdges[], value: number): number => groups.findIndex((g) => value >= g.from.n && value <= g.to.n);

/**
 * Each group as a block: as wide as the values it covers, as tall as its printed share.
 * Heights are scaled to the largest share, so the tallest block fills the frame.
 */
export function blocks(groups: GroupEdges[], raw: ResolvedFact[]) {
  const values = choices(groups);
  const { left, top, width, height, gap } = CURVE_FRAME;
  const column = width / Math.max(values.length, 1);
  const tallest = Math.max(...raw.map((f) => f.estimate?.point ?? 0), 0);
  return groups.map((group, i) => {
    const share = raw[i]?.estimate?.point ?? 0;
    const x = left + (group.from.n - values[0]) * column + gap / 2;
    const w = (group.to.n - group.from.n + 1) * column - gap;
    const h = tallest > 0 ? (share / tallest) * height : 0;
    return { x, w, y: top + height - h, h, mid: x + w / 2 };
  });
}

/** The centre of each value's column, for the labels under the blocks. */
export function columnCentres(groups: GroupEdges[]): { value: number; x: number }[] {
  const values = choices(groups);
  const { left, width } = CURVE_FRAME;
  const column = width / Math.max(values.length, 1);
  return values.map((value, i) => ({ value, x: left + column * (i + 0.5) }));
}

const number = (n: number) => n.toLocaleString("en", { maximumFractionDigits: 6 });

/** A printed share as printed: "40.7%". */
export const shareWords = (fact: ResolvedFact | undefined): string => (fact?.estimate ? `${number(fact.estimate.point)}%` : "");

/**
 * The adjusted difference in words, with its band. A difference below zero is "lower", above
 * zero "higher": a band that crosses zero says so, since then the study cannot tell which.
 */
export function differenceWords(fact: ResolvedFact | undefined): { headline: string; band: Band; bandWords: string; crossesZero: boolean } | null {
  const e = fact?.estimate;
  if (!fact || !e) return null;
  const band = simulatorBand({ point: e.point, ciLow: e.ciLow, ciHigh: e.ciHigh, spread: fact.spread ?? null });
  if (!band) return null;
  const unit = e.unit;
  const direction = e.point < 0 ? "lower" : "higher";
  const crossesZero = band.low < 0 && band.high > 0;
  const signed = (n: number) => (n < 0 ? `${MINUS}${number(-n)}` : number(n));
  return {
    headline: `${number(Math.abs(e.point))} ${unit} ${direction}`,
    band,
    bandWords: `${signed(band.low)} to ${signed(band.high)} ${unit}`,
    crossesZero,
  };
}

/** Where the band and its point sit on a small axis from the far end of the band to zero. */
export function bandPlace(band: Band, point: number) {
  const { left, width } = CURVE_FRAME;
  // Inset so the end labels stay inside the frame.
  const inset = BAND_FRAME.inset;
  const far = Math.min(band.low, 0);
  const near = Math.max(band.high, 0);
  const span = near - far || 1;
  const x = (n: number) => left + inset + ((n - far) / span) * (width - 2 * inset);
  const signed = (n: number) => (n < 0 ? `${MINUS}${number(-n)}` : n === 0 ? "0" : number(n));
  return { low: x(band.low), high: x(band.high), point: x(point), zero: x(0), lowWords: signed(band.low), highWords: signed(band.high), zeroWords: signed(0) };
}

/** The band strip's own frame: short, under the result, with the band's ends and zero labelled. */
export const BAND_FRAME = { height: 84, y: 26, thickness: 14, size: 15, inset: 22, labelY: 70 };

/** The kind can draw these: one edge pair per raw share, and at least one group. */
export const drawable = (raw: ResolvedFact[], groups: GroupEdges[]): boolean => raw.length > 0 && raw.length === groups.length;

/**
 * What the reader's pick shows: its group, and for any group after the first, that group's
 * adjusted difference from the first (the comparison group) with its band. Null before a pick.
 */
export function pickedGroup(groups: GroupEdges[], raw: ResolvedFact[], adjusted: ResolvedFact[], picked: number | null, unit = "days") {
  const at = picked === null ? -1 : groupOf(groups, picked);
  if (at < 0) return null;
  const comparison = at === 0;
  const fact = comparison ? undefined : adjusted[at - 1];
  const difference = differenceWords(fact);
  return {
    at,
    comparison,
    label: groupLabel(groups[at], unit),
    first: groupLabel(groups[0], unit),
    /** "1–2 days a week", for the result's heading. */
    heading: `${groupLabel(groups[at], unit)} a week`,
    raw: shareWords(raw[at]),
    firstRaw: shareWords(raw[0]),
    outcome: fact?.estimate?.outcome.toLowerCase() ?? "",
    difference,
    place: difference && fact?.estimate ? bandPlace(difference.band, fact.estimate.point) : null,
    meanAge: groups[at].meanAge?.n ?? null,
  };
}

/** The raw caption's outcome: "deaths from any cause within 10 years". */
export const rawOutcome = (raw: ResolvedFact[]): string => (raw[0]?.estimate?.outcome ?? "").replace(/, unadjusted$/, "").toLowerCase();
