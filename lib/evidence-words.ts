/**
 * How an evidence grade is shown to a reader (owner, 2026-11-14): words and a three-bar
 * meter, never the weight. Tapping the meter gives one plain sentence on why the result
 * earned its grade, written from the same rules that derived it (lib/pipeline/grade.ts).
 *
 * Pure: no React, Next or Supabase.
 */

import type { EvidenceGrade } from "./evidence";
import { RANDOMIZED_DESIGNS, SMALL_TRIAL, type Design } from "./pipeline/grade";

export const GRADE_WORDS: Record<EvidenceGrade, string> = {
  high: "Strong evidence",
  moderate: "Decent evidence",
  low: "Early evidence",
  none: "No evidence grade",
};

/** Bars filled out of three. */
export const GRADE_BARS: Record<EvidenceGrade, number> = { high: 3, moderate: 2, low: 1, none: 0 };

export interface GradeBasis {
  tier: EvidenceGrade;
  design: string;
  species: string;
  sampleSize: number | null;
  /** True when the paper rated the certainty itself (a GRADE rating it reports). */
  reported: boolean;
}

const RATED: Record<EvidenceGrade, string> = { high: "high", moderate: "moderate", low: "low", none: "no" };

/**
 * One plain sentence on why. Follows deriveTier's order: not in people; the paper's own
 * rating; a randomized design (small or not); otherwise an observational one.
 */
export function gradeWhy(b: GradeBasis): string {
  if (b.tier === "none" || b.species !== "human" || b.design === "animal" || b.design === "in_vitro") {
    return "It was tested in animals or cells, not in people, so it does not count in your Life Game.";
  }
  if (b.reported) {
    return `The authors rated how sure they are of this pooled result with a standard checklist, and rated it ${RATED[b.tier]}.`;
  }
  if (RANDOMIZED_DESIGNS.has(b.design as Design)) {
    if (b.sampleSize !== null && b.sampleSize < SMALL_TRIAL) {
      return `People were assigned at random, but only ${b.sampleSize} took part, so a bigger trial could change the picture.`;
    }
    return b.design === "meta_analysis_rct"
      ? "It pools trials that assigned people at random, which rules out most other explanations."
      : "People were assigned at random, which rules out most other explanations, in one study.";
  }
  return "The study watched people without assigning anything, so other differences between them could explain the result.";
}
