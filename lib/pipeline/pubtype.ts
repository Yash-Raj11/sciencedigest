/**
 * Stage 0, before any model reads the paper: is it the kind of publication the gate can accept?
 *
 * The gate only accepts the designs in grade.ts (a trial, a meta-analysis of trials, a cohort,
 * case-control, cross-sectional, animal or cell study). A narrative review, an editorial or a
 * letter has none of them, so extracting one pays for a reply the gate must refuse (2026-11-20:
 * the sugar narrative review would have cost a full extract). This reads the publication types
 * Europe PMC prints for the record and refuses those early. Anything it is unsure of passes:
 * the gate still judges the design from the paper's own words.
 */

/** Publication types that never hold a design the gate accepts. Lower case. */
const NEVER = ["editorial", "comment", "letter", "news", "published erratum", "retracted publication", "retraction of publication", "case reports"];

/** A review passes only when it says it pooled studies systematically. */
const SYSTEMATIC = ["systematic review", "meta-analysis", "systematic-review", "meta analysis"];

export function screenPublicationType(types: readonly string[]):
  | { ok: true }
  | { ok: false; reason: string } {
  const lower = types.map((t) => t.toLowerCase().trim());
  const never = lower.find((t) => NEVER.includes(t));
  if (never) return { ok: false, reason: `the record is a "${never}", which holds no study design the gate accepts` };
  const review = lower.some((t) => t === "review" || t === "review-article" || t === "review article");
  if (review && !lower.some((t) => SYSTEMATIC.includes(t))) {
    return { ok: false, reason: "the record is a review that does not say it is systematic or a meta-analysis (a narrative review has no design the gate accepts)" };
  }
  return { ok: true };
}

/** The publication types in a Europe PMC search record (`pubTypeList.pubType`), or none. */
export function publicationTypes(record: Record<string, unknown>): string[] {
  const list = (record.pubTypeList as { pubType?: unknown } | undefined)?.pubType;
  if (Array.isArray(list)) return list.filter((t): t is string => typeof t === "string");
  return typeof list === "string" ? [list] : [];
}
