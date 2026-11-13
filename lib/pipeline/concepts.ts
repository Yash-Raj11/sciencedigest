/**
 * Background concepts: textbook knowledge a read needs but the paper does not
 * state ("what adenosine does"). One file each, content/concepts/<slug>.json.
 *
 * Three rules keep them from becoming a back door for unsourced claims:
 *
 *   1. No numbers. Any digit in the term, the plain text or the model fails.
 *      A number needs a gated fact with a verbatim quote; a concept has none.
 *   2. A reference: a DOI or an ISBN, and the title of the work.
 *   3. The owner reviews each one. A published read may only use a concept
 *      whose review matches its present wording: change a word after the
 *      review and it counts as unreviewed again.
 *
 * A concept never becomes a protocol step and never carries evidence weight.
 * Node only (it hashes); the lint takes the result, not this module.
 */

import { createHash } from "node:crypto";
import { z } from "zod";
import { jargonIn } from "./jargon";
import { splitSentences, wordCount } from "./sentences";

export const CONCEPT_SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export const Concept = z.object({
  /** The word as a read uses it. */
  term: z.string().min(1).max(60),
  /** What it physically does, in plain words. */
  plain: z.string().min(1).max(240),
  /** The mental model: the picture a reader can hold (H9). */
  model: z.string().min(1).max(240),
  reference: z.object({
    doi: z.string().regex(/^10\.\d{4,9}\/\S+$/, "not a DOI").optional(),
    isbn: z.string().refine((v) => /^(97[89])?\d{9}[\dX]$/.test(v.replace(/[- ]/g, "")), "not an ISBN (10 or 13 digits)").optional(),
    title: z.string().min(1),
  }).refine((r) => (r.doi === undefined) !== (r.isbn === undefined), "give a doi or an isbn (one of them)"),
  /** Set only by `npm run paper -- approve-concept <slug>`, run by the owner. */
  reviewed_by_owner: z.boolean(),
  /** Written with the approval: when, and a fingerprint of the wording that was approved. */
  reviewed: z.object({ at: z.string().min(1), fingerprint: z.string().min(1) }).optional(),
});
export type Concept = z.infer<typeof Concept>;

/** What the lint and the build need to know about one concept file. */
export type ConceptState =
  | { ok: true; concept: Concept; reviewed: boolean }
  | { ok: false; errors: string[] };

/** The wording a review covers. Changing any of it voids the review. */
export function conceptFingerprint(concept: Pick<Concept, "term" | "plain" | "model" | "reference">): string {
  const { term, plain, model, reference } = concept;
  const text = JSON.stringify([term, plain, model, reference.doi ?? null, reference.isbn ?? null, reference.title]);
  return createHash("sha1").update(text).digest("hex").slice(0, 12);
}

export function isReviewed(concept: Concept): boolean {
  return concept.reviewed_by_owner === true && concept.reviewed?.fingerprint === conceptFingerprint(concept);
}

/** The same concept, marked as reviewed in its present wording. Only the approve-concept command calls this. */
export function approved(concept: Concept, at: string): Concept {
  return { ...concept, reviewed_by_owner: true, reviewed: { at, fingerprint: conceptFingerprint(concept) } };
}

/**
 * The lint for one concept file. Words only: the banned terms (H1) and
 * throat-clearing (H11) are passed in by the caller so this module does not
 * depend on the read's lint.
 */
export function checkConcept(
  input: unknown,
  rules: { banned: [string, RegExp][]; throatClearing: [string, RegExp][]; maxSentenceWords: number },
): ConceptState {
  const parsed = Concept.safeParse(input);
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.issues.map((i) => `schema: ${i.path.join(".") || "concept"}: ${i.message}`) };
  }
  const concept = parsed.data;
  const errors: string[] = [];
  for (const field of ["term", "plain", "model"] as const) {
    const text = concept[field];
    if (/\d/.test(text)) errors.push(`${field}: a concept carries no numbers; a number needs a gated fact: "${text}"`);
    for (const [term, pattern] of rules.banned) if (pattern.test(text)) errors.push(`${field}: banned term "${term}" (H1)`);
    for (const [phrase, pattern] of rules.throatClearing) if (pattern.test(text)) errors.push(`${field}: throat-clearing "${phrase}" (H11)`);
  }
  for (const field of ["plain", "model"] as const) {
    const inside = jargonIn(concept[field]).filter((term) => !new RegExp(`\\b${term}\\b`, "i").test(concept.term));
    if (inside.length > 0) errors.push(`${field}: uses a technical word (${inside.join(", ")}); say what it physically does instead (H9)`);
    for (const sentence of splitSentences(concept[field])) {
      const n = wordCount(sentence);
      if (n > rules.maxSentenceWords) errors.push(`${field}: a sentence of ${n} words; the limit is ${rules.maxSentenceWords} (H11)`);
    }
  }
  // reviewed_by_owner with a stale fingerprint is not an error: the wording changed
  // after the review, so the concept simply counts as unreviewed again.
  return errors.length > 0 ? { ok: false, errors } : { ok: true, concept, reviewed: isReviewed(concept) };
}
