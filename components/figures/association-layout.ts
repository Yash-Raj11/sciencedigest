/**
 * Where the association-curve figure puts things, and the words behind what it
 * says. Kind files hold no number of their own (the figure guard), so the frame,
 * the sums and the formatting live here. Pure.
 *
 * Every value shown is printed in the paper: a group's raw share, and a later
 * group's adjusted difference from the first group with its 95% CI. Nothing is
 * interpolated between groups, and nothing is shown outside them.
 */

import type { PaperContent, ResolvedFact } from "@/lib/content/types";
import { simulatorBand, type Band } from "@/lib/models/spread";
import { eventDots, gridHeight, gridSize } from "./frequency-layout";

export interface Cited { n: number; ref: string }
export interface GroupEdges { from: Cited; to: Cited; meanAge?: Cited }

/** The drawing area inside the 320-unit frame. Labels are 15 units, at least 14 px at phone width. */
export const CURVE_FRAME = { left: 6, top: 34, width: 308, height: 120, figureHeight: 222, gap: 4, size: 15, valueGap: 8, axisGap: 22, titleGap: 46 };

/** One answer button: 48 px tall, so it is a full touch target. */
export const DAY_BUTTON = "flex h-12 min-w-0 cursor-pointer items-center justify-center rounded-lg border text-lg font-medium";

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
    point: fact?.estimate?.point ?? 0,
    meanAge: groups[at].meanAge?.n ?? null,
  };
}

/** The raw caption's outcome: "deaths from any cause within 10 years". */
export const rawOutcome = (raw: ResolvedFact[]): string => (raw[0]?.estimate?.outcome ?? "").replace(/, unadjusted$/, "").toLowerCase();

// ---------------------------------------------------------------------------------------------
// FIGURE-DESIGN 3B, "100 people, ten years on": the kind drawn as frequency grids (owner,
// 2026-11-15). One grid per group of the raw shares (monochrome, R4), the adjusted differences
// as an interval strip (the one pastel zone), the reader's week as their own strip above.


/** Days of the reader's week: the toggles above the chart. Words only, so no digit is typed. */
export const WEEK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

/** Text sizes and positions in the 320-unit frame. */
export const GRID_FRAME = {
  size: 13, small: 12,
  full: { left: 3, col: 96, gap: 14, start: 14, title: 36, strip: 44, later: 80, bracket: 78, grid: 88 },
  card: { left: 15, col: 130, gap: 30, axis: 12, title: 32, strip: 40, grid: 66 },
};

/** N for the whole figure: from the base rate, the comparison group's printed share. */
export const figureN = (raw: ResolvedFact[]): number | null => gridSize(raw[0]?.estimate?.point ?? 0);

/** Where each column sits, for the full view (every group) or the card (the first two). */
export function gridColumns(count: number, mode: "full" | "card") {
  const f = mode === "full" ? GRID_FRAME.full : GRID_FRAME.card;
  return Array.from({ length: count }, (_, i) => {
    const x = f.left + i * (f.col + f.gap);
    return { x, width: f.col, mid: x + f.col / 2 };
  });
}

/** The full view's height: titles, strips, grids, two label lines, the key. */
export function gridFigureHeight(n: number, mode: "full" | "card"): number {
  if (mode === "full") return GRID_FRAME.full.grid + gridHeight(n, GRID_FRAME.full.col) + 64;
  return GRID_FRAME.card.grid + gridHeight(n, GRID_FRAME.card.col) + 62;
}

/** The people in a group the event did not happen to, out of N, as the grid draws them (a half dot counts as half). */
export function keptOf(rate: number, n: number): number {
  const { whole, half } = eventDots(rate, n);
  return n - whole - (half ? 0.5 : 0);
}

/** "40.7%". */
const percent = (fact: ResolvedFact | undefined) => (fact?.estimate ? `${number(fact.estimate.point)}%` : "");

/** The count behind a group's share, as printed ("75 of 532"), when the read gave it. */
const countWords = (group: GroupEdges & { died?: Cited; total?: Cited }) =>
  group.died && group.total ? ` (${number(group.died.n)} of ${number(group.total.n)})` : "";

export interface GridResult {
  raw: string;
  /** Null for the comparison group, which has no adjusted difference of its own. */
  adjusted: string | null;
  range: string | null;
}

/**
 * The reader's group in words (FIGURE-DESIGN 3B): the raw shares with their printed counts,
 * labelled raw; then the adjusted difference with its range. Every number is printed in the
 * paper. "People in this group of the study", never "your risk".
 */
export function gridResult(
  groups: (GroupEdges & { died?: Cited; total?: Cited })[], raw: ResolvedFact[], adjusted: ResolvedFact[], at: number,
  words: { event: string; events: string; years: number | null; unit?: string },
): GridResult | null {
  if (at < 0 || at >= groups.length) return null;
  const unit = words.unit ?? "days";
  const within = words.years !== null ? ` within ${number(words.years)} years` : "";
  const here = `In the ${groupLabel(groups[at], unit)} group, ${percent(raw[at])} ${words.event}${within}${countWords(groups[at])}`;
  if (at === 0) return { raw: `${here}. This is the group the others were compared with.`, adjusted: null, range: null };
  const rawText = `${here}, against ${percent(raw[0])} in the ${groupLabel(groups[0], unit)} group${countWords(groups[0])}. Raw.`;
  const e = adjusted[at - 1]?.estimate;
  if (!e) return { raw: rawText, adjusted: null, range: null };
  const per = /^(points?|percentage points)$/.test(e.unit) ? " per 100" : ` ${e.unit}`;
  const direction = e.point < 0 ? "fewer" : "more";
  const ends = e.ciLow !== null && e.ciHigh !== null ? [Math.abs(e.ciLow), Math.abs(e.ciHigh)].sort((a, b) => a - b) : null;
  const crosses = e.ciLow !== null && e.ciHigh !== null && e.ciLow < 0 && e.ciHigh > 0;
  return {
    raw: rawText,
    adjusted: `Adjusted difference: ${number(Math.abs(e.point))} ${direction} ${words.events}${per}${ends && !crosses ? ` (${number(ends[0])} to ${number(ends[1])})` : ""}.`,
    range: crosses ? "The range crosses no difference, so the study cannot tell which way it goes." : "Range for the study average.",
  };
}

/** A strip row's label in three parts: "1–2 days: " · "14.9" · " fewer deaths per 100". */
export function stripLabel(group: GroupEdges, fact: ResolvedFact, events: string, unit = "days") {
  const e = fact.estimate!;
  const per = /^(points?|percentage points)$/.test(e.unit) ? " per 100" : ` ${e.unit}`;
  return { lead: `${groupLabel(group, unit)}: `, number: number(Math.abs(e.point)), tail: ` ${e.point < 0 ? "fewer" : "more"} ${events}${per}` };
}

/** The group a reader's week falls in, from the days they ticked (null before any answer). */
export const weekGroup = (groups: GroupEdges[], ticked: readonly boolean[] | null): number =>
  ticked === null ? -1 : groupOf(groups, ticked.filter(Boolean).length);

/** The card draws the comparison group and the next one only (FIGURE-DESIGN 3B, card view). */
export const CARD_GROUPS = 2;
export const cardSlice = <T,>(items: T[]): T[] => items.slice(0, CARD_GROUPS);
/** The first group is the one every other group is compared with. */
export const isComparison = (at: number) => at === 0;
/** A reader who has not answered yet. */
export const NO_ANSWER = -1;
/** The reader's week before they touch it, and after "No days". */
export const emptyWeek = (): boolean[] => WEEK_DAYS.map(() => false);
/** The group an adjusted row belongs to: the comparison group has none, so row i is group i + 1. */
export const groupOfAdjusted = (row: number) => row + 1;

/** The words a grid figure draws, besides its facts. */
export interface GridWords {
  /** "died": the event, in "40.7 died per 100". */
  event: string;
  /** "deaths": the event as a noun, in "14.9 fewer deaths per 100". */
  events: string;
  /** The follow-up in years, from its fact, or null. */
  years: number | null;
  /** "Alive at 10 years", "Died": the two kinds of dot, each named once. */
  kept: string;
  happened: string;
  /** "10 years later": over the grids. */
  later: string;
}

const text = (sentences: { text: string }[] | undefined) => (sentences ?? []).map((s) => s.text).join(" ");

/** The association-curve's own words: the event and its noun from params, the dot names from the read. */
export function gridWordsOf(content: Pick<PaperContent, "simulator">): GridWords {
  const params = content.simulator.params;
  const words = content.simulator.words ?? {};
  return {
    event: String(params.event ?? ""), events: String(params.events ?? ""),
    years: (params.years as { n: number } | undefined)?.n ?? null,
    kept: text(words.kept), happened: text(words.happened), later: text(words.later),
  };
}

