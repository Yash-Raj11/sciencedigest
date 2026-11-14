/**
 * Stage 1 contract: what the extraction model must return.
 *
 * Two rules do most of the work:
 *
 *   1. "not_reported" is legal everywhere. A model invents hardest when a
 *      required field has no answer in the source, so absence is expressible.
 *   2. Every value comes with the exact passage it was read from (`quote`).
 *      Stage 2 finds that passage in the source and turns it into a character
 *      span. A quote that is not in the source voids the field.
 *
 * Absent by design: no evidence tier, no "causal language allowed", no key
 * takeaway. Those are derived in stage 2 from the design (lib/pipeline/grade.ts).
 */

import { z } from "zod";

export const NOT_REPORTED = "not_reported";

const Leaf = z.object({
  value: z.string().min(1),
  quote: z.string().nullable(),
});

export const MEASURES = ["WMD", "MD", "aRD", "RD", "proportion", "RR", "HR", "OR"] as const;
/** Measures on an absolute scale. Anything else is relative and may not stand alone (H5). */
export const ABSOLUTE_MEASURES: ReadonlySet<string> = new Set(["WMD", "MD", "aRD", "RD", "proportion"]);

const Estimate = z.object({
  outcome: z.string().min(1),
  measure: z.enum(MEASURES),
  point: z.number(),
  ciLow: z.number().nullable(),
  ciHigh: z.number().nullable(),
  /** "kg", "points" (percentage points) or "%" (a proportion). */
  unit: z.string().min(1),
  /** Id of a `grade` fact, when the paper itself rates the certainty of this outcome. */
  gradeRef: z.string().nullable().default(null),
});

const Fact = z.object({
  id: z.string().regex(/^[a-z][a-z0-9_]*$/, "fact ids are lower_snake_case"),
  /**
   * estimate    a number with (ideally) a confidence interval
   * finding     a result on a measured endpoint that the paper reports WITHOUT an
   *             effect size, e.g. "no significant difference in total sleep time"
   * grade       the paper's own certainty rating for an outcome
   * statement / limitation / context   everything else worth citing
   */
  kind: z.enum(["estimate", "finding", "grade", "statement", "limitation", "context"]),
  /** What this is, in the extractor's own words. Editors read it; readers never do. */
  label: z.string().min(1),
  /** A short verbatim phrase (or the printed figures) that appears inside the quote. */
  value: z.string().min(1),
  quote: z.string().nullable(),
  estimate: Estimate.optional(),
  /** For a finding: the endpoint that was measured, in plain words. */
  outcome: z.string().min(1).optional(),
});

export const RawExtraction = z.object({
  identifiers: z.object({
    doi: z.string().regex(/^10\.\d{4,9}\/\S+$/, "not a DOI"),
    pmid: z.string().nullable(),
    pmcid: z.string().nullable(),
    title: z.string().min(1),
    authors: z.string().min(1),
    journal: z.string().min(1),
    year: z.number().int().min(1900).max(2100),
    citation: z.string().min(1),
  }),
  /** As stated by the repository's metadata, e.g. "CC BY 4.0". Checked against the allowlist. */
  license: z.string().min(1),
  design: Leaf,
  species: Leaf,
  population: Leaf,
  sampleSize: Leaf,
  facts: z.array(Fact).min(1),
  /** Written by the coverage pass (lib/pipeline/coverage.ts): which fact covers which checklist item. Ids only. */
  coverage: z.record(z.string(), z.array(z.string())).optional(),
});

export type RawExtraction = z.infer<typeof RawExtraction>;
export type RawFact = z.infer<typeof Fact>;
export type Estimate = z.infer<typeof Estimate>;
