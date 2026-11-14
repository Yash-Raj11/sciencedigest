/**
 * FIGURE-DESIGN 4B, "the order flips": the three pooled results of a meta-analysis, surest
 * evidence first, beside the order the thing is usually sold in; in the read, a reader picks a
 * routine and the subgroup results the paper printed for it appear under each pooled row.
 * Pure: the order, the words, the matching and the frame. No React.
 *
 * The rules this file keeps (FIGURE-DESIGN 4B):
 *
 *   - Rows are ordered by the evidence grade derived for each result, never by hand.
 *   - Each outcome is its own plot with its own scale; outcomes never share a value axis. An
 *     outcome's subgroups share its scale, set from every subgroup it could show, so a row
 *     already drawn never moves when a pick adds another.
 *   - A subgroup whose range crosses "no change" says so in words and prints no point number.
 *   - Subgroups overlap in trials: no combined number, ever. The result sentence counts them
 *     and says they cannot be added together.
 */

import type { ResolvedEstimate, ResolvedFact } from "@/lib/content/types";
import { GRADE_BARS, GRADE_WORDS } from "@/lib/evidence-words";
import { change } from "./format";

/** The 320-unit frame: a margin for the pitch, a gap the connectors cross, then the rows. */
export const ORDER_FRAME = {
  title: 15, phase: 34, key: 52, rows: 66,
  pitchLeft: 6, pitchRight: 60, rowsLeft: 92, rowsWidth: 222,
  size: 12.5, small: 11, gap: 12, swatch: 18,
} as const;

export type OutcomeId = string;

/** A pooled row as the figure's params give it. */
export interface PooledRow { outcome: OutcomeId; label: string; fact: ResolvedFact }

/** The simulator params of a compare-bars read (editorial simulator.params, resolved). */
export interface CompareSettings {
  settings: {
    id: string; label: string;
    options: ({ id: string; label: string; subgroup?: string } & Record<string, unknown>)[];
  }[];
  leaveOneOut?: ResolvedFact;
}

const estimateOf = (fact: ResolvedFact): ResolvedEstimate => fact.estimate!;

/** Surest first: by the derived grade, strongest at the top; ties keep the editorial's order. */
export function surestFirst<T extends { fact: ResolvedFact }>(rows: T[]): T[] {
  return rows.map((row, i) => ({ row, i }))
    .sort((a, b) => GRADE_BARS[estimateOf(b.row.fact).tier] - GRADE_BARS[estimateOf(a.row.fact).tier] || a.i - b.i)
    .map(({ row }) => row);
}

/** "strong evidence": the grade in the reader's words, lower case inside a figure. */
export const gradeWords = (fact: ResolvedFact) => GRADE_WORDS[estimateOf(fact).tier].toLowerCase();

/** The point and its unit as one phrase, so it can be the row's bright orange: "+0.51 kg". */
export const pointWords = (fact: ResolvedFact) => change(estimateOf(fact));

/** Whether the printed range includes no change (a difference crossing 0). */
export function crossesNoChange(fact: ResolvedFact): boolean {
  const e = estimateOf(fact);
  return e.ciLow !== null && e.ciHigh !== null && e.ciLow <= 0 && e.ciHigh >= 0;
}

/** The phase line's right end: "After 3 to 15 weeks of training". */
export const afterWords = (span: string) => `After ${span} of training`;

export type Picks = Record<string, string | undefined>;

export interface SubgroupRow { setting: string; option: string; words: string; fact: ResolvedFact; clear: boolean }

/**
 * The subgroups the paper printed for one outcome under the reader's picks, in the order of the
 * settings, and the picks it printed nothing for.
 */
export function subgroupsFor(sim: CompareSettings, picks: Picks, outcome: OutcomeId): { rows: SubgroupRow[]; missing: string[] } {
  const rows: SubgroupRow[] = [];
  const missing: string[] = [];
  for (const setting of sim.settings) {
    const option = setting.options.find((o) => o.id === picks[setting.id]);
    if (!option) continue;
    const words = option.subgroup ?? option.label.toLowerCase();
    const fact = option[outcome] as ResolvedFact | null | undefined;
    if (fact?.estimate) rows.push({ setting: setting.id, option: option.id, words, fact, clear: !crossesNoChange(fact) });
    else missing.push(words);
  }
  return { rows, missing };
}

/** Every subgroup an outcome could show, whatever is picked: they set the outcome's scale. */
export function allSubgroups(sim: CompareSettings, outcome: OutcomeId): ResolvedFact[] {
  return sim.settings.flatMap((s) => s.options.map((o) => o[outcome] as ResolvedFact | null | undefined))
    .filter((f): f is ResolvedFact => Boolean(f?.estimate));
}

/** "Not reported for this outcome: overground running, 8 weeks or less." */
export const missingWords = (missing: string[]) => `Not reported for this outcome: ${missing.join(", ").replace(/(\d) /g, "$1\u00a0")}.`;

/** The subgroup row's words: its setting, then its point, or that its range includes no change. */
export const subgroupValue = (row: SubgroupRow) => (row.clear ? pointWords(row.fact) : "no clear change in this subgroup");

/**
 * The result sentences. Counted per outcome, never summed into one effect: "Your routine matches
 * 6 tested subgroups for fat." A routine that matches none is "Not tested".
 */
export function matchSentences(counts: { label: string; n: number }[], picked: boolean): string[] {
  if (!picked) return [];
  const matched = counts.filter((c) => c.n > 0);
  if (!matched.length) return ["Not tested: the paper printed no subgroup for this routine. The rows above are the pooled results."];
  return [
    ...matched.map((c) => `Your routine matches ${c.n} tested ${c.n === 1 ? "subgroup" : "subgroups"} for ${c.label.toLowerCase()}.`),
    "Each is shown separately. They cannot be added together.",
  ];
}

/**
 * The connector from a pitch word to its row: out from the word, across the gap, into the row.
 * No arrowhead: it shows a ranking, not a cause.
 */
export function pitchPath(from: { x: number; y: number }, to: { x: number; y: number }): string {
  const elbow = (to.x - from.x) * 0.25;
  return `M ${from.x} ${from.y} H ${from.x + elbow} L ${to.x - elbow} ${to.y} H ${to.x}`;
}

/** Where pitch word i sits: one per pooled row slot in the untouched view, so the lines cross. */
export const pitchY = (i: number, rowTop: (i: number) => number, size: number) => rowTop(i) + size;

/** The figure's own labels (FIGURE-DESIGN 4B, "Labels, exact"); the paper's words come from params. */
export const ORDER_WORDS = {
  band: "Range for the study average",
  baseline: "No change",
  subgroups: "Subgroup results for your routine",
  start: "Start",
  pick: "Pick any part of your routine. The paper's subgroup results for it appear under each row.",
} as const;

/** Tops of blocks stacked down the frame, each `gap` below the one above. */
export function stackTops(heights: number[], start: number, gap: number): number[] {
  const tops: number[] = [];
  heights.reduce((top, h) => { tops.push(top); return top + h + gap; }, start);
  return tops;
}

/** The frame's height under the last block. */
export const stackBottom = (tops: number[], heights: number[], pad: number) =>
  (tops.length ? tops[tops.length - 1] + heights[heights.length - 1] : 0) + pad;

/** The baseline of a pooled row's label in a block at `top`; the first block carries the "No change" header. */
export const pooledLabelY = (top: number, first: boolean) => top + (first ? ORDER_FRAME.small * 1.5 : 0) + ORDER_FRAME.size;
