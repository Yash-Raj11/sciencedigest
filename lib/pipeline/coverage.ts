/**
 * The "conditions & confounds" pass and the coverage checklist (owner, 2026-11-14).
 *
 * A first extraction reliably finds the results and misses the plain facts a reader needs
 * to judge them: what was eaten with the treatment, the fasting window, one dose or many,
 * a difference between the arms, earlier evidence being animal-only, the authors' own
 * "needs further investigation". A second, narrower request asks for exactly those and
 * says which fact covers which item. The gate still judges every fact it adds.
 *
 * The checklist shows the owner, per paper, which item is covered by a gated fact and
 * which was not found. It decides nothing: the owner confirms it during draft review.
 *
 * Pure: imports only zod and the extraction schema.
 */

import { z } from "zod";
import { RawExtraction } from "./extraction";

export const COVERAGE_ITEMS = ["conditions", "dosing", "confounds", "priorEvidence", "furtherInvestigation", "funding"] as const;
export type CoverageItem = (typeof COVERAGE_ITEMS)[number];

const Ids = z.array(z.string()).default([]);

/** What the coverage pass returns: new facts, limitations to relabel, and which fact covers which item. */
export const CoveragePass = z.object({
  facts: RawExtraction.shape.facts.element.array().default([]),
  /** Ids of facts already extracted that are really limitations (the authors give a non-treatment explanation). */
  relabelAsLimitation: Ids,
  coverage: z.object(Object.fromEntries(COVERAGE_ITEMS.map((item) => [item, Ids])) as Record<CoverageItem, typeof Ids>),
});
export type CoveragePass = z.infer<typeof CoveragePass>;

/** Stored in extraction.json beside the facts. Ids only; the facts are judged by the gate. */
export type Coverage = Record<CoverageItem, string[]>;

/**
 * Adds the pass's facts to an extraction. A new fact whose id is taken is renamed; one whose
 * quote is already extracted under the same kind is dropped. Only statement or context facts
 * may be relabelled, and only to "limitation".
 */
export function mergeCoverage(extraction: RawExtraction, pass: CoveragePass): { extraction: RawExtraction & { coverage: Coverage }; notes: string[] } {
  const notes: string[] = [];
  const facts = extraction.facts.map((fact) => ({ ...fact }));
  const ids = new Set(facts.map((f) => f.id));
  const renamed = new Map<string, string>();

  for (const id of pass.relabelAsLimitation) {
    const fact = facts.find((f) => f.id === id);
    if (!fact) notes.push(`relabel: no fact "${id}"; ignored`);
    else if (fact.kind !== "statement" && fact.kind !== "context") notes.push(`relabel: "${id}" is a ${fact.kind}; only a statement or context becomes a limitation`);
    else { fact.kind = "limitation"; notes.push(`relabel: "${id}" is now a limitation`); }
  }

  for (const fact of pass.facts) {
    if (facts.some((f) => f.quote === fact.quote && f.kind === fact.kind && f.value === fact.value)) {
      notes.push(`"${fact.id}" repeats an extracted fact; kept once`);
      const existing = facts.find((f) => f.quote === fact.quote && f.value === fact.value)!;
      renamed.set(fact.id, existing.id);
      continue;
    }
    let id = fact.id;
    if (ids.has(id)) {
      let n = 2;
      while (ids.has(`${fact.id}_${n}`)) n++;
      id = `${fact.id}_${n}`;
      renamed.set(fact.id, id);
      notes.push(`"${fact.id}" clashes with an extracted fact; renamed "${id}"`);
    }
    ids.add(id);
    facts.push({ ...fact, id });
  }

  const coverage = Object.fromEntries(COVERAGE_ITEMS.map((item) => {
    const listed = pass.coverage[item].map((id) => renamed.get(id) ?? id);
    const known = listed.filter((id) => ids.has(id));
    for (const id of listed) if (!ids.has(id)) notes.push(`coverage.${item}: no fact "${id}"; dropped`);
    return [item, [...new Set(known)]];
  })) as Coverage;

  return { extraction: { ...extraction, facts, coverage }, notes };
}

export const CHECKLIST_LABEL: Record<"design" | "sampleSize" | "limitations" | CoverageItem, string> = {
  design: "Design",
  sampleSize: "Number of people (n)",
  conditions: "Test conditions (what it was taken with, fasting, how it was given)",
  dosing: "One dose or repeated doses",
  confounds: "Differences between the arms, other than the treatment",
  priorEvidence: "Species and earlier evidence",
  furtherInvestigation: "What the authors say still needs investigating",
  limitations: "Limitations",
  funding: "Funding and conflicts of interest",
};

export interface ChecklistRow { item: keyof typeof CHECKLIST_LABEL; label: string; facts: string[]; found: boolean }

/** What the checklist needs from a gate result: the validated design, n and facts, or nothing if it failed. */
export interface GatedSummary { design: string; sampleSize: number | null; facts: Record<string, { kind: string }> }

/**
 * One row per item. A row is ticked only by a fact that passed the gate; a listed fact the
 * gate refused does not count. An extraction with no coverage pass shows every pass item
 * as not found, so a hand-made extraction is never ticked by default.
 */
export function coverageChecklist(coverage: Partial<Coverage> | undefined, gated: GatedSummary | null): ChecklistRow[] {
  const has = (id: string) => gated !== null && Object.hasOwn(gated.facts, id);
  const row = (item: ChecklistRow["item"], facts: string[]): ChecklistRow => ({ item, label: CHECKLIST_LABEL[item], facts, found: facts.length > 0 });
  const listed = (item: CoverageItem) => (coverage?.[item] ?? []).filter(has);
  return [
    row("design", gated ? [`design: ${gated.design}`] : []),
    row("sampleSize", gated?.sampleSize ? [`n = ${gated.sampleSize}`] : []),
    row("conditions", listed("conditions")),
    row("dosing", listed("dosing")),
    row("confounds", listed("confounds")),
    row("priorEvidence", listed("priorEvidence")),
    row("furtherInvestigation", listed("furtherInvestigation")),
    row("limitations", gated ? Object.entries(gated.facts).filter(([, f]) => f.kind === "limitation").map(([id]) => id) : []),
    row("funding", listed("funding")),
  ];
}
