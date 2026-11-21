/**
 * Common knowledge (owner, 2026-11-19): everyday facts a reader needs to make sense of a number
 * ("a regular cup of brewed coffee holds roughly 100 mg of caffeine"), which no paper in the
 * repository states. One file each, content/common/<slug>.json.
 *
 * What keeps them from becoming a back door for unsourced claims:
 *
 *   1. The owner approves each one, once, in a terminal (`npm run paper -- approve-common <slug>`).
 *      Changing a word after the approval voids it, exactly as for a concept.
 *   2. One plain statement, at most 30 words. It may carry numbers: a slide that cites it may
 *      print only the numbers in it (H7, amended for common knowledge).
 *   3. For now it may be cited on the deck only, never in the read, and never by a protocol step,
 *      a simulator or an evidence weight. An unreviewed one blocks the deck's approval in the queue.
 *
 * Node only (it hashes); the lint takes the result, not this module.
 */

import { createHash } from "node:crypto";
import { z } from "zod";
import { splitSentences, wordCount } from "./sentences";

export const COMMON_SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export const Common = z.object({
  /** The fact, said plainly, as a reader would be told it. */
  statement: z.string().min(1).max(220),
  /** Set only by `npm run paper -- approve-common <slug>`, run by the owner. */
  reviewed_by_owner: z.boolean(),
  reviewed: z.object({ at: z.string().min(1), fingerprint: z.string().min(1) }).optional(),
}).strict();
export type Common = z.infer<typeof Common>;

export type CommonState = { ok: true; common: Common; reviewed: boolean } | { ok: false; errors: string[] };

export function commonFingerprint(common: Pick<Common, "statement">): string {
  return createHash("sha1").update(JSON.stringify([common.statement])).digest("hex").slice(0, 12);
}

export function isCommonReviewed(common: Common): boolean {
  return common.reviewed_by_owner === true && common.reviewed?.fingerprint === commonFingerprint(common);
}

/** The same fact, marked as reviewed in its present wording. Only the approve-common command calls this. */
export function approvedCommon(common: Common, at: string): Common {
  return { ...common, reviewed_by_owner: true, reviewed: { at, fingerprint: commonFingerprint(common) } };
}

export function checkCommon(input: unknown, rules: { banned: [string, RegExp][]; throatClearing: [string, RegExp][]; maxSentenceWords: number }): CommonState {
  const parsed = Common.safeParse(input);
  if (!parsed.success) return { ok: false, errors: parsed.error.issues.map((i) => `schema: ${i.path.join(".") || "common"}: ${i.message}`) };
  const common = parsed.data;
  const errors: string[] = [];
  for (const [term, pattern] of rules.banned) if (pattern.test(common.statement)) errors.push(`banned term "${term}" (H1)`);
  for (const [phrase, pattern] of rules.throatClearing) if (pattern.test(common.statement)) errors.push(`throat-clearing "${phrase}" (H11)`);
  for (const sentence of splitSentences(common.statement)) {
    const n = wordCount(sentence);
    if (n > rules.maxSentenceWords) errors.push(`a sentence of ${n} words; the limit is ${rules.maxSentenceWords} (H11)`);
  }
  return errors.length > 0 ? { ok: false, errors } : { ok: true, common, reviewed: isCommonReviewed(common) };
}
