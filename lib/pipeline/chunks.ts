/**
 * Reading a paper that does not fit in the model's context window: split the
 * text into parts at paragraph breaks (never dropping a character), extract
 * each part, then merge. The merged extraction goes through the same gate, so
 * every quote is still checked against the whole source.
 *
 * Pure: no imports from supabase, react or next.
 */

import type { RawExtraction } from "./extraction";

/** A rough, deliberately high estimate: about 3.5 characters per token for English prose. */
export const tokensOf = (text: string): number => Math.ceil(text.length / 3.5);

/**
 * Splits `source` into parts of at most `maxChars`, at paragraph breaks where
 * possible, else at a sentence end, else hard. Joining the parts gives the
 * source back exactly.
 */
export function splitSource(source: string, maxChars: number): string[] {
  if (maxChars < 1000) throw new Error("A chunk under 1,000 characters cannot hold a passage with its context.");
  const parts: string[] = [];
  let rest = source;
  while (rest.length > maxChars) {
    const window = rest.slice(0, maxChars);
    let cut = window.lastIndexOf("\n\n");
    if (cut < maxChars / 2) cut = window.lastIndexOf("\n");
    if (cut < maxChars / 2) cut = window.lastIndexOf(". ") + 1;
    if (cut < maxChars / 2) cut = maxChars;
    parts.push(rest.slice(0, cut));
    rest = rest.slice(cut);
  }
  if (rest.length > 0) parts.push(rest);
  return parts;
}

/**
 * Merges the extractions of the parts. Identifiers, licence and the study-level
 * fields come from the first part that quotes them; facts are joined, a fact
 * repeated with the same quote is kept once, and a clashing id is renamed
 * (with its gradeRefs in the same part). Returns what it did, for the log.
 */
export function mergeExtractions(parts: RawExtraction[]): { merged: RawExtraction; notes: string[] } {
  if (parts.length === 0) throw new Error("Nothing to merge.");
  const notes: string[] = [];
  const first = parts[0];
  const leaf = (key: "design" | "species" | "population" | "sampleSize") =>
    parts.find((p) => p[key].quote !== null)?.[key] ?? first[key];
  const facts: RawExtraction["facts"] = [];
  const seen = new Map<string, string | null>();
  parts.forEach((part, index) => {
    const renamed = new Map<string, string>();
    for (const fact of part.facts) {
      if (seen.has(fact.id)) {
        if (seen.get(fact.id) === fact.quote) { notes.push(`part ${index + 1}: "${fact.id}" repeated with the same quote; kept once`); continue; }
        let n = 2;
        while (seen.has(`${fact.id}_${n}`)) n++;
        renamed.set(fact.id, `${fact.id}_${n}`);
        notes.push(`part ${index + 1}: "${fact.id}" clashes with an earlier fact; renamed "${fact.id}_${n}"`);
      }
    }
    for (const fact of part.facts) {
      if (seen.has(fact.id) && !renamed.has(fact.id)) continue;
      const id = renamed.get(fact.id) ?? fact.id;
      const gradeRef = fact.estimate?.gradeRef;
      const out = { ...fact, id, ...(fact.estimate ? { estimate: { ...fact.estimate, gradeRef: gradeRef ? (renamed.get(gradeRef) ?? gradeRef) : gradeRef ?? null } } : {}) };
      seen.set(id, fact.quote);
      facts.push(out);
    }
  });
  return {
    merged: { ...first, design: leaf("design"), species: leaf("species"), population: leaf("population"), sampleSize: leaf("sampleSize"), facts },
    notes,
  };
}
