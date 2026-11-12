/**
 * Evidence grades and their weights.
 *
 * This is the TypeScript copy of public.evidence_weight() in
 * supabase/migrations/20261112000100_core.sql. Nothing else in the app may
 * hardcode these numbers; the parity test fails if the two copies disagree.
 *
 * Weights are stored in tenths so that sums stay whole numbers. 0.7 + 0.4 in
 * floating point is 1.1 on a good day and 1.0999999999999999 on a bad one.
 */

export const EVIDENCE_GRADES = ["high", "moderate", "low", "none"] as const;
export type EvidenceGrade = (typeof EVIDENCE_GRADES)[number];

export const WEIGHT_TENTHS: Record<EvidenceGrade, number> = {
  high: 10,
  moderate: 7,
  low: 4,
  none: 0,
};

export function weightOf(grade: EvidenceGrade): number {
  return WEIGHT_TENTHS[grade] / 10;
}

/** "×1.0", "×0.7", "×0.4", "×0" as shown next to every graded step. */
export function weightLabel(grade: EvidenceGrade): string {
  const tenths = WEIGHT_TENTHS[grade];
  return tenths === 0 ? "×0" : `×${(tenths / 10).toFixed(1)}`;
}

export const GRADE_NAME: Record<EvidenceGrade, string> = {
  high: "High certainty",
  moderate: "Moderate certainty",
  low: "Low certainty",
  none: "No evidence weight",
};

/**
 * Half rounds up, computed in whole numbers. Postgres does the same sum in
 * private.pct(); keeping both sides integer is what makes parity exact.
 */
export function pct(numerator: number, denominator: number): number {
  if (denominator === 0) return 0;
  return Math.floor((200 * numerator + denominator) / (2 * denominator));
}
