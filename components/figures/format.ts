/**
 * Turning a gated number into the words a figure shows. Figures may hold no
 * numeric literal of their own (the figure guard in eslint.config.mjs), so the
 * sums and the sign handling live here.
 */

import type { ResolvedEstimate } from "@/lib/content/types";
import { signed } from "@/lib/pipeline/format";

type Sized = Pick<ResolvedEstimate, "point" | "ciLow" | "ciHigh" | "unit">;

const unitOf = (e: Sized) => (e.unit === "%" ? "%" : ` ${e.unit}`);

/** "+0.51 kg", "−1.86 kg". */
export function change(e: Sized): string {
  return `${e.point > 0 ? "+" : ""}${signed(e.point)}${unitOf(e)}`;
}

/** "14.9 points lower", "0.51 kg higher". */
export function gap(e: Sized): string {
  return `${Math.abs(e.point)}${unitOf(e)} ${e.point < 0 ? "lower" : "higher"}`;
}

/** The 95% range as the reader meets it: "0.06 to 0.95". Smaller size first for a "lower" gap. */
export function range(e: Sized, asSize = false): string | null {
  if (e.ciLow === null || e.ciHigh === null) return null;
  if (!asSize) return `${signed(e.ciLow)} to ${signed(e.ciHigh)}`;
  const sizes = [Math.abs(e.ciLow), Math.abs(e.ciHigh)].sort((a, b) => a - b);
  return `${sizes[0]} to ${sizes[1]}`;
}

export const size = (e: Sized) => Math.abs(e.point);
export const thousands = (n: number) => n.toLocaleString("en");
