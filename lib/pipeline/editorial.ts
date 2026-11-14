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

/** A full UTC timestamp, the form `new Date().toISOString()` writes. */
export function isTimestamp(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/.test(value) && !Number.isNaN(Date.parse(value));
}

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

/** Fields both shapes share. */
const Base = {
  slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  category: z.string().min(1),
  accessTier: z.enum(["free", "premium"]),
  /**
   * Set by `npm run paper -- approve <slug>`. Null keeps it out of the app.
   * Anything that is not a full date and time is refused: the text "null" or
   * "13/11/2026" is not null, so it would publish the paper, and it goes into
   * the database as a timestamp.
   */
  publishedAt: z.string().refine(isTimestamp, {
    message: "not a date and time such as 2026-11-13T09:30:00.000Z; do not type it, run `npm run paper -- approve <slug>` (or `unpublish`)",
  }).nullable(),
  title: Markup,
  teaser: Markup,
  hook: Markup,
  /** Words that name the studied population. A sentence with a causal verb must use one (H3). */
  populationTerms: z.array(z.string().min(2)).min(1),
  populationPanel: Markup,
  /** The headline result: an estimate or a finding. */
  primaryEstimate: z.string(),
  takeaways: z.array(Markup).default([]),
  choices: z.array(ChoiceDef).default([]),
  steps: z.array(StepDef).min(1),
  simulator: z.object({ kind: z.string().min(1), params: z.record(z.string(), z.unknown()) }),
  carousel: z.object({
    slides: z.array(SlideDef).min(3),
    caption: Markup,
    hashtags: z.array(z.string().regex(/^[a-z0-9]+$/)).max(30).default([]),
  }),
};

/**
 * A picture drawn in code (components/papers/<slug>/figures/), named in
 * lib/content/figures.ts. Caption and alt are markup: a number in either must
 * cite its fact. `params` is everything the picture shows: like a simulator's,
 * it may hold no bare number and no text with a digit, only "fact:<id>",
 * { n, ref } or { text, ref }. An element drawn as measured or proposed is
 * { kind, fact: "fact:<id>" }.
 */
const FigureRef = z.object({
  figure: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  caption: Markup,
  alt: Markup,
  params: z.record(z.string(), z.unknown()).default({}),
});

/**
 * H10, progressive disclosure: three separate layers.
 *
 *   mechanism  why it happens. The mental model first, then the name (H9). No caveats.
 *   protocol   what the data supports: the parameters that were tested.
 *   audit      the receipts: raw effect size, what the weak end of the range means,
 *              the limitations. Design and sample size are added from the gate.
 */
const Layers = z.object({
  mechanism: z.object({
    paragraphs: z.array(Markup).min(1),
    figure: FigureRef.nullable().default(null),
  }),
  protocol: z.object({
    paragraphs: z.array(Markup).min(1),
    figure: FigureRef.nullable().default(null),
  }),
  audit: z.object({
    /** The raw effect size of the headline result. Must cite primaryEstimate. */
    effect: Markup,
    /**
     * Both ends of the 95% range of primaryEstimate and what the weaker end means;
     * or, when the paper reports none, a sentence saying there is no confidence interval (H5).
     */
    weakEnd: Markup,
    /** Each must cite a limitation fact (H6). */
    limitations: z.array(Markup).min(1),
    /** What most summaries of this study leave out. */
    missed: Markup,
    /** The rest, shown behind "Full receipts". */
    more: z.array(Markup).default([]),
    figure: FigureRef.nullable().default(null),
  }),
});

/**
 * A word the reader can tap. Every entry says where its explanation comes from:
 *   { term, plain, refs }   written here, resting on the cited fact(s);
 *   { term, concept }       the reviewed wording of content/concepts/<concept>.json.
 */
const GlossaryEntry = z.object({
  /** The word as it appears in the read. */
  term: z.string().min(1).max(60),
  /** What it physically does, in plain words. No listed jargon. */
  plain: z.string().min(1).max(240).optional(),
  /** The fact(s) the plain text rests on. */
  refs: z.array(z.string().min(1)).default([]),
  /** A background concept, by slug. Its plain text is used; do not also write one here. */
  concept: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/).nullable().default(null),
}).refine((g) => (g.plain === undefined) !== (g.concept === null), {
  path: ["plain"], message: "give plain text with refs, or a concept (one of them)",
});

/** The read every published paper must have. */
export const Editorial = z.object({
  ...Base,
  layers: Layers,
  glossary: z.array(GlossaryEntry),
});

/**
 * The old flat shape. Refused for every paper except the ones named on the
 * temporary allowlist (scripts/legacy-shape.ts), which goes when they are
 * rewritten in step 2E.
 */
export const LegacyEditorial = z.object({
  ...Base,
  /** Must include sections with ids "lower-bound" and "missed". */
  sections: z.array(z.object({
    id: z.string().regex(/^[a-z-]+$/),
    heading: z.string().min(1),
    paragraphs: z.array(Markup).min(1),
  })).min(3),
  limitations: z.array(Markup).min(1),
  /** One figure, shown after the first paragraph. Temporary: it moves into layers.mechanism in step 2E. */
  figure: FigureRef.nullable().default(null),
});

export type Editorial = z.infer<typeof Editorial>;
export type LegacyEditorial = z.infer<typeof LegacyEditorial>;
export type StepDef = z.infer<typeof StepDef>;
export type FigureRef = z.infer<typeof FigureRef>;

export const LAYERS = ["mechanism", "protocol", "audit"] as const;
export type Layer = (typeof LAYERS)[number];

/** Which shape a piece of JSON is written in, judged by its keys alone. */
export function editorialShape(input: unknown): "layered" | "legacy" | "mixed" | "unknown" {
  if (input === null || typeof input !== "object") return "unknown";
  const record = input as Record<string, unknown>;
  const layered = "layers" in record;
  // "figure" at the top level belongs to the old shape too; a layered read keeps its figures in its layers.
  const legacy = "sections" in record || "limitations" in record || "figure" in record;
  if (layered && legacy) return "mixed";
  if (layered) return "layered";
  return legacy ? "legacy" : "unknown";
}

export const OLD_SHAPE_MESSAGE =
  "this read is in the old flat shape (sections, limitations). A read needs layers { mechanism, protocol, audit } and a glossary (H10)";
