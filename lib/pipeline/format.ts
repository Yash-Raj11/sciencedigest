import type { ResolvedEstimate } from "../content/types";

const MINUS = "−";

export function signed(value: number, digits?: number): string {
  const body = digits === undefined ? String(Math.abs(value)) : Math.abs(value).toFixed(digits);
  return value < 0 ? `${MINUS}${body}` : body;
}

function decimals(value: number): number {
  const text = String(value);
  return text.includes(".") ? text.split(".")[1].length : 0;
}

/** "+0.63 kg (95% CI 0.17 to 1.09)", "−14.9 points (95% CI −18.8 to −10.9)", "40.7%". */
import { numbersIn } from "./text";
export function formatEstimate(e: Pick<ResolvedEstimate, "point" | "ciLow" | "ciHigh" | "unit" | "measure">): string {
  const digits = Math.max(decimals(e.point), e.ciLow === null ? 0 : decimals(e.ciLow), e.ciHigh === null ? 0 : decimals(e.ciHigh));
  const unit = e.unit === "%" ? "%" : ` ${e.unit}`;
  // A proportion or a group average is a level, not a difference: no "+".
  const isDifference = e.measure !== "proportion" && e.measure !== "mean";
  const point = `${isDifference && e.point > 0 ? "+" : ""}${signed(e.point, digits)}${unit}`;
  if (e.ciLow === null || e.ciHigh === null) return point;
  return `${point} (95% CI ${signed(e.ciLow, digits)} to ${signed(e.ciHigh, digits)})`;
}

/**
 * A formatted estimate without its interval, for a line outside the Receipts (owner,
 * 2026-11-14: no CIs outside the Receipts). "Fat-free mass +0.63 kg (95% CI 0.17 to 1.09)"
 * becomes "Fat-free mass +0.63 kg". The Receipts keep the full form.
 */
export const withoutInterval = (text: string): string => text.replace(/\s*\(95% CI [^)]*\)/g, "");

/**
 * Whether a finding headline states the headline result's own number (sign aside), so the card
 * prints no number in front of it (owner, 2026-11-15). "10-year" is not the result's number.
 */
export function headlineStatesNumber(sentences: { text: string }[], point: number): boolean {
  return sentences.some((s) => numbersIn(s.text).some((n) => Math.abs(n) === Math.abs(point)));
}
