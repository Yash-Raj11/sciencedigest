/**
 * Read-only access to the bundled content. Everything here is public: paper
 * metadata, protocol steps and the reads of FREE papers. Premium reads are
 * fetched at run time (lib/content/gated.ts) and never bundled.
 */

import { CHOICES, FREE_CONTENT, PAPERS, STEPS } from "./generated";
import type { Choice, ContentStep, PaperContent, PaperMeta } from "./types";

export const papers: PaperMeta[] = [...PAPERS].sort((a, b) =>
  Number(a.accessTier === "premium") - Number(b.accessTier === "premium") || a.title.localeCompare(b.title));

const bySlug = new Map(PAPERS.map((p) => [p.slug, p]));
const byId = new Map(PAPERS.map((p) => [p.id, p]));
const stepById = new Map(STEPS.map((s) => [s.id, s]));

export const getPaper = (slug: string): PaperMeta | undefined => bySlug.get(slug);
export const getPaperById = (id: string): PaperMeta | undefined => byId.get(id);
export const getStep = (id: string): ContentStep | undefined => stepById.get(id);

/** Live (non-retired) steps of one paper, in display order. */
export function stepsFor(paperId: string): ContentStep[] {
  return STEPS.filter((s) => s.paperId === paperId && !s.retired).sort((a, b) => a.position - b.position);
}

export const choicesFor = (slug: string): Choice[] => CHOICES[slug] ?? [];
export const freeContent = (slug: string): PaperContent | undefined => FREE_CONTENT[slug];

/** The choices a protocol starts with when someone first adds it. */
export function defaultChoices(slug: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const choice of choicesFor(slug)) if (choice.default !== null) out[choice.key] = choice.default;
  return out;
}

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
