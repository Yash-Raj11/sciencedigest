/**
 * Which passage of the paper stands behind each dot of the readings grid.
 * Every state the figure can reach is listed by `allCells`, and each one
 * resolves to a fact the content build tied to the paper, so there is no state
 * that shows words of our own. Tested in scripts/figure-states.test.ts.
 */

import type { Evidence } from "@/components/figures/shared";
import type { ResolvedFact } from "@/lib/content/types";

export interface Num { n: number; ref: string }
export interface Meal { label: string; differed: Num[]; reading: ResolvedFact }
export interface Params {
  times: Num[];
  unit: string;
  meals: Meal[];
  pValue: { text: string; ref: string };
  early: Evidence & { at: Num };
  total: Evidence;
}
export interface Cell { row: number; time: number }

export const allCells = (p: Params): Cell[] => p.meals.flatMap((_, row) => p.times.map((time) => ({ row, time: time.n })));

export const isFlagged = (p: Params, cell: Cell): boolean => p.meals[cell.row].differed.some((time) => time.n === cell.time);

/** A flagged reading quotes the result that flags it; any other quotes what the paper says of that meal's readings. */
export const factAt = (p: Params, cell: Cell): ResolvedFact => (isFlagged(p, cell) ? p.early.fact : p.meals[cell.row].reading);

export const cellName = (p: Params, cell: Cell): string => `${p.meals[cell.row].label} meal, ${cell.time} ${p.unit}`;
