/**
 * Stage 3 contract: what the editorial model must return.
 *
 * The editorial model never sees the paper, only the validated JSON from the
 * gate, so it cannot reuse the authors' prose and cannot introduce a claim
 * that was not extracted. Three things it is NOT allowed to supply, because
 * they are derived by code in lib/pipeline/assemble.ts:
 *
 *   - an evidence grade for a step     (comes from the estimate it cites)
 *   - a "source estimate" string       (formatted from the estimate it cites)
 *   - a bare number in a simulator     (must name the fact it comes from)
 */

import { z } from "zod";

/** A string in editorial markup: sentences each followed by [fact ids] or [-]. */
const Markup = z.string().min(1);

const StepDef = z.object({
  /** Stable handle. The step's database id is derived from slug + key, so never rename it. */
  key: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  label: z.string().min(1).max(120),
  detail: z.string().nullable().default(null),
  kind: z.enum(["action", "weekly_target", "condition"]).default("action"),
  /** Facts that back any number in the label or detail. */
  refs: z.array(z.string()).default([]),
  /** The estimate or finding that gives this step its weight. Null means ungraded (weight 0). */
  evidenceRef: z.string().nullable().default(null),
  targetPerWeek: z.number().int().min(1).max(7).nullable().default(null),
  countsKey: z.string().nullable().default(null),
  conditionKey: z.enum(["block_weeks_gte", "modality_is"]).nullable().default(null),
  conditionValue: z.record(z.string(), z.union([z.string(), z.number()])).nullable().default(null),
  appliesWhen: z.record(z.string(), z.string()).nullable().default(null),
  /** Steps are retired, never deleted: people's history points at them. */
  retired: z.boolean().default(false),
});

const ChoiceDef = z.object({
  key: z.string().regex(/^[a-z_]+$/),
  label: z.string().min(1),
  help: z.string().nullable().default(null),
  kind: z.enum(["single", "toggle"]),
  /** The option value selected when someone first adds the protocol. Null means off / unset. */
  default: z.string().nullable().default(null),
  options: z.array(z.object({ value: z.string().min(1), label: z.string().min(1) })).min(1),
});

const SlideDef = z.object({
  kind: z.enum(["hook", "finding", "population", "limitation", "nuance", "cta"]),
  heading: Markup,
  body: Markup.nullable().default(null),
});

export const Editorial = z.object({
  slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  category: z.string().min(1),
  accessTier: z.enum(["free", "premium"]),
  /** Set when you approve the paper. Null keeps it out of the app. */
  publishedAt: z.string().nullable(),
  title: Markup,
  teaser: Markup,
  hook: Markup,
  /** Words that name the studied population. A sentence with a causal verb must use one (H3). */
  populationTerms: z.array(z.string().min(2)).min(1),
  populationPanel: Markup,
  /**
   * The headline result: an estimate or a finding. The "lower-bound" section must
   * spell out both ends of its interval, or, when the paper reports none, say
   * in so many words that there is no confidence interval (H5).
   */
  primaryEstimate: z.string(),
  /** Must include sections with ids "lower-bound" and "missed". */
  sections: z.array(z.object({
    id: z.string().regex(/^[a-z-]+$/),
    heading: z.string().min(1),
    paragraphs: z.array(Markup).min(1),
  })).min(3),
  limitations: z.array(Markup).min(1),
  takeaways: z.array(Markup).default([]),
  choices: z.array(ChoiceDef).default([]),
  steps: z.array(StepDef).min(1),
  simulator: z.object({ kind: z.string().min(1), params: z.record(z.string(), z.unknown()) }),
  carousel: z.object({
    slides: z.array(SlideDef).min(3),
    caption: Markup,
    hashtags: z.array(z.string().regex(/^[a-z0-9]+$/)).max(30).default([]),
  }),
});

export type Editorial = z.infer<typeof Editorial>;
export type StepDef = z.infer<typeof StepDef>;
