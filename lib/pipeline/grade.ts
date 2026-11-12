/**
 * Stage 2 lookup tables. A model is never asked to grade the study it has
 * just read: it flatters. These derive from the extracted design instead.
 *
 * Working values. They live here and nowhere else.
 */

import type { EvidenceGrade } from "../evidence";

export const DESIGNS = [
  "meta_analysis_rct", "rct", "cohort", "case_control", "cross_sectional", "animal", "in_vitro",
] as const;
export type Design = (typeof DESIGNS)[number];

export const SPECIES = ["human", "mouse", "rat", "other_animal", "cell_culture"] as const;
export type Species = (typeof SPECIES)[number];

/** Words that must appear in the passage the extraction points at for each design. */
export const DESIGN_EVIDENCE: Record<Design, string[][]> = {
  meta_analysis_rct: [["meta-analysis", "meta-analyses"], ["randomized", "randomised", "rcts"]],
  rct: [["randomized", "randomised"]],
  cohort: [["cohort"]],
  case_control: [["case-control", "case control"]],
  cross_sectional: [["cross-sectional", "cross sectional"]],
  animal: [["mice", "mouse", "rats", "rat", "animal", "rodent"]],
  in_vitro: [["in vitro", "cell line", "cultured cells", "cell culture"]],
};

export const SPECIES_EVIDENCE: Record<Species, string[]> = {
  human: ["participants", "adults", "men", "women", "volunteers", "patients", "individuals", "people"],
  mouse: ["mice", "mouse"],
  rat: ["rats", "rat"],
  other_animal: ["animal", "animals"],
  cell_culture: ["cells", "in vitro"],
};

/** H3: causal verbs are only ever available to randomized human evidence. */
export function causalLanguagePermitted(design: Design, species: Species): boolean {
  return species === "human" && (design === "rct" || design === "meta_analysis_rct");
}

export const SMALL_TRIAL = 50;

/**
 * The evidence tier of one estimate.
 *   1. Non-human evidence never earns weight (H4).
 *   2. A GRADE rating reported by the paper itself wins.
 *   3. Otherwise by design: randomized -> moderate (low if fewer than 50
 *      participants), observational -> low.
 */
export function deriveTier(input: {
  design: Design;
  species: Species;
  sampleSize: number | null;
  reportedGrade: EvidenceGrade | null;
}): EvidenceGrade {
  if (input.species !== "human" || input.design === "animal" || input.design === "in_vitro") return "none";
  if (input.reportedGrade) return input.reportedGrade;
  if (input.design === "rct" || input.design === "meta_analysis_rct") {
    return input.sampleSize !== null && input.sampleSize < SMALL_TRIAL ? "low" : "moderate";
  }
  return "low";
}

export const GRADE_WORDS: Record<Exclude<EvidenceGrade, "none">, string[]> = {
  high: ["high"],
  moderate: ["moderate", "medium"],
  low: ["low"],
};

export const NON_HUMAN_DISCLAIMER =
  "Mechanistic proof-of-concept only. Has not been directly validated in human clinical trials.";
