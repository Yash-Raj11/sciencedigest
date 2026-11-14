/**
 * H7 (amended): the page says where each thing it shows comes from.
 *
 *   "20 healthy adults · randomized crossover trial · four breakfasts each"  (the paper itself)
 *   "From another study: Inoue et al., JAMA Network Open 2023, early evidence"
 *   "Background"
 *
 * Pure: no imports from supabase, react or next.
 */

import { GRADE_WORDS } from "../evidence-words";
import type { ContextConcept, ContextStudy, PaperContent, ResolvedFact } from "./types";

/** How each design is named to a reader. */
export const DESIGN_LABEL: Record<string, string> = {
  meta_analysis_rct: "Pooled randomized trials",
  rct: "Randomized trial",
  crossover: "Randomized crossover trial",
  cohort: "Observational cohort",
  case_control: "Case-control study",
  cross_sectional: "Cross-sectional survey",
  animal: "Animal study",
  in_vitro: "Cell study",
};

export const FROM_THE_PAPER = "From the paper";
export const BACKGROUND = "Background";

/** The chip beside anything that comes from a context study. It names a grade and never a weight. */
export const ANOTHER_STUDY = "Another study";

export function studySourceLine(study: ContextStudy, fact?: ResolvedFact): string {
  // The fact's own tier when it has one (an estimate the study graded itself), else the study's.
  const tier = fact?.estimate?.tier ?? fact?.finding?.tier ?? study.tier;
  return `From another study: ${study.shortCite}, ${GRADE_WORDS[tier].toLowerCase()}`;
}

/**
 * The source line for one fact of a read. The paper's own facts: who · design · how many or
 * how long (owner, 2026-11-14), or "From the paper" where the read carries no source line.
 */
export function factSourceLine(fact: ResolvedFact, content: Pick<PaperContent, "context"> & { sourceLine?: string }): string {
  if (fact.source === undefined) return content.sourceLine || FROM_THE_PAPER;
  const study = content.context?.studies.find((s) => s.slug === fact.source);
  // Never guess: a fact that claims another study must be able to name it.
  if (!study) throw new Error(`fact "${fact.id}" names the source "${fact.source}", which this read does not carry`);
  return studySourceLine(study, fact);
}

/** A concept is background knowledge: no study behind it, so no grade. Its reference goes beside the line. */
export function conceptReference(concept: ContextConcept): string {
  return `${concept.reference.title} (${concept.reference.doi ? `doi:${concept.reference.doi}` : `ISBN ${concept.reference.isbn}`})`;
}

/** Every context source of a read, for the audit: what it is, its DOI (or ISBN), and its grade if it is a study. */
export function contextSourceList(content: Pick<PaperContent, "context">): { label: string; citation: string; id: string; grade: string | null }[] {
  const context = content.context;
  if (!context) return [];
  return [
    ...context.studies.map((s) => ({ label: ANOTHER_STUDY, citation: s.citation, id: `doi:${s.doi}`, grade: GRADE_WORDS[s.tier] })),
    ...context.concepts.map((c) => ({
      label: BACKGROUND, citation: `${c.term}: ${c.reference.title}`,
      id: c.reference.doi ? `doi:${c.reference.doi}` : `ISBN ${c.reference.isbn}`, grade: null,
    })),
  ];
}
