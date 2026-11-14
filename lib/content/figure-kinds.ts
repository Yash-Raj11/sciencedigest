/**
 * Figure kinds: one drawing per kind of finding, shared by every paper, in
 * place of one hand-drawn component per paper. A read asks for one with a spec
 * in its editorial.json:
 *
 *   { "kind": "decay", "facts": { "halfLife": "half_life" }, "simulator": { "halfLife": "half_life" } }
 *
 * A param names one fact, or (a slot with `many`) a list of facts in order.
 *
 * A spec holds names of facts and nothing else: no number, no text to show.
 * Every value the figure draws is looked up from the gated fact: one of the
 * paper's, or one of a gated context study's ("<slug>/<fact>"), never a
 * background concept. A context fact is drawn with its source line,
 * "From another study: <cite>, <grade>", and the audit lists the study.
 *
 * H12: a personal estimate (the simulator) is shown only as a range worked out
 * from the gated fact's own range, under ESTIMATE_LABEL, with its source line.
 * A fact with no range means no simulator; nothing is filled in from general
 * knowledge.
 *
 * Pure: no imports from supabase, react or next.
 */

import { z } from "zod";
import { simulatorBand, type Spread } from "../models/spread";

/** A fact of the paper ("half_life") or of a gated context study ("<slug>/half_life"). */
const FactName = z.string().regex(/^([a-z0-9]+(-[a-z0-9]+)*\/)?[a-z][a-z0-9_]*$/, "a fact id, not a value");

/** A param names one fact, or a list of facts in order (one per group, for example). */
const FactNames = z.union([FactName, z.array(FactName).min(1)]);

export const FigureSpec = z.strictObject({
  kind: z.string().min(1),
  facts: z.record(z.string(), FactNames),
  simulator: z.record(z.string(), FactNames).optional(),
});
export type FigureSpec = z.infer<typeof FigureSpec>;

/**
 * One param of a kind.
 *   unit   the fact must be in this unit (the kind does not convert)
 *   band   the personal estimate is worked out from this fact, so it needs a printed range (H12)
 *   many   a list of facts, in order
 */
export interface Slot { unit?: RegExp; band?: boolean; many?: boolean }

const HOURS = /^(h|hours?)$/;
const PERCENT = /^%$/;
const POINTS = /^(points?|percentage points)$/;

/** What each kind needs: the facts its still view draws, and the facts its simulator works from. */
export const FIGURE_KINDS = {
  decay: {
    facts: { halfLife: { unit: HOURS } },
    simulator: { halfLife: { unit: HOURS, band: true } },
  },
  /**
   * Groups of a cohort, in order, the first the comparison group. `raw` is each group's printed
   * share (unadjusted); `adjusted` is each later group's printed adjusted difference from the
   * first, with its CI (the band). The groups' edges come from params.groups ({ n, ref }).
   */
  "association-curve": {
    facts: { raw: { unit: PERCENT, many: true } },
    simulator: { raw: { unit: PERCENT, many: true }, adjusted: { unit: POINTS, many: true, band: true } },
  },
} as const satisfies Record<string, { facts: Record<string, Slot>; simulator: Record<string, Slot> }>;

export type FigureKind = keyof typeof FIGURE_KINDS;
export const isFigureKind = (kind: string): kind is FigureKind => Object.hasOwn(FIGURE_KINDS, kind);

export const ESTIMATE_LABEL = "Estimate from the study's numbers, not medical advice";

/** What the lint needs to know of a fact to judge a spec. */
export interface SpecFact { kind: string; unit: string | null; point: number | null; ciLow: number | null; ciHigh: number | null; spread?: Spread | null }

export interface SpecProblem { rule: "figure-spec" | "H7" | "H12" | "context"; where: string; message: string }

/** A fact the simulator may work from: an estimate whose printed spread (SD, CI, range, IQR) gives a band. */
export const hasRange = (fact: SpecFact | undefined): fact is SpecFact & { point: number } =>
  fact !== undefined && fact.point !== null && simulatorBand(fact) !== null;

/**
 * Everything wrong with a spec as written in editorial.json (the raw JSON, so a
 * literal number is seen before any schema can coerce or drop it).
 */
export function specProblems(raw: unknown, where: string, lookup: (id: string) => SpecFact | undefined): SpecProblem[] {
  const out: SpecProblem[] = [];
  const fail = (rule: SpecProblem["rule"], at: string, message: string) => out.push({ rule, where: at, message });

  (function walk(node: unknown, path: string) {
    if (typeof node === "number") fail("H7", path, `a literal number (${node}) in a figure spec; a spec names facts, and the number is read from the fact`);
    else if (typeof node === "string" && path !== `${where}.kind` && /^[\d.,\s-]+$/.test(node)) fail("H7", path, `a literal number ("${node}") in a figure spec; a spec names facts, and the number is read from the fact`);
    else if (Array.isArray(node)) node.forEach((child, i) => walk(child, `${path}[${i}]`));
    else if (node !== null && typeof node === "object") for (const [key, child] of Object.entries(node)) walk(child, `${path}.${key}`);
  })(raw, where);
  if (out.length > 0) return out;

  // A background concept carries no number (any digit fails its own checks), so it can never feed a figure.
  for (const group of ["facts", "simulator"] as const) {
    const given = (raw as Record<string, unknown> | null)?.[group];
    if (given === null || typeof given !== "object") continue;
    for (const [param, named] of Object.entries(given)) {
      for (const id of Array.isArray(named) ? named : [named]) {
        if (typeof id === "string" && id.startsWith("concept:")) {
          fail("context", `${where}.${group}.${param}`, `"${id}" is a background concept; a figure and a simulator draw only gated facts, from the paper or a gated context study`);
        }
      }
    }
  }
  if (out.length > 0) return out;

  const parsed = FigureSpec.safeParse(raw);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) fail("figure-spec", [where, ...issue.path].join("."), issue.message);
    return out;
  }
  const spec = parsed.data;
  if (!isFigureKind(spec.kind)) {
    fail("figure-spec", `${where}.kind`, `unknown kind "${spec.kind}"; the kinds are: ${Object.keys(FIGURE_KINDS).join(", ")}`);
    return out;
  }
  const needs = FIGURE_KINDS[spec.kind];

  for (const [group, wanted, given] of [["facts", needs.facts, spec.facts], ["simulator", needs.simulator, spec.simulator]] as const) {
    if (given === undefined) continue;
    const slots: Record<string, Slot> = wanted;
    for (const param of Object.keys(slots)) if (!(param in given)) fail("figure-spec", `${where}.${group}`, `a ${spec.kind} figure needs "${param}"`);
    for (const [param, named] of Object.entries(given)) {
      const slot = Object.hasOwn(slots, param) ? slots[param] : undefined;
      if (!slot) { fail("figure-spec", `${where}.${group}.${param}`, `a ${spec.kind} figure has no "${param}"`); continue; }
      if (Array.isArray(named) !== Boolean(slot.many)) {
        fail("figure-spec", `${where}.${group}.${param}`, slot.many ? `"${param}" is a list of facts, in order` : `"${param}" names one fact`);
        continue;
      }
      const ids = Array.isArray(named) ? named : [named];
      ids.forEach((id, i) => {
        const at = `${where}.${group}.${param}${Array.isArray(named) ? `[${i}]` : ""}`;
        const fact = lookup(id);
        if (!fact) fail("figure-spec", at, `"${id}" is not a gated fact of this read; without the fact the figure is not drawn, and nothing is filled in`);
        else if (fact.kind !== "estimate" || fact.point === null) fail("figure-spec", at, `"${id}" is a ${fact.kind} with no number; a ${spec.kind} figure draws an estimate`);
        else if (slot.unit && !slot.unit.test(fact.unit ?? "")) fail("figure-spec", at, `"${id}" is in "${fact.unit}"; a ${spec.kind} figure works in ${slot.unit === HOURS ? "hours" : String(slot.unit)}, and does not convert`);
        else if (group === "simulator" && slot.band && !hasRange(fact)) fail("H12", at, `"${id}" has no range, so there is no simulator: a personal estimate is shown only as a range from the fact's own range`);
      });
    }
  }
  return out;
}

/** A number the read cites: { n, ref } (checked against its passage by the lint's params walk). */
const Cited = z.object({ n: z.number(), ref: z.string() });
const Group = z.object({ from: Cited, to: Cited, meanAge: Cited.optional() });

/**
 * What a kind needs beyond its spec, in the simulator's params, and how the two line up.
 * association-curve: one group per raw share, each with its edges; one adjusted difference
 * for every group after the first; edges in order, with no gap and no overlap.
 */
export function kindParamsProblems(spec: unknown, params: unknown, where: string): SpecProblem[] {
  const parsed = FigureSpec.safeParse(spec);
  if (!parsed.success || parsed.data.kind !== "association-curve") return [];
  const out: SpecProblem[] = [];
  const fail = (at: string, message: string) => out.push({ rule: "figure-spec", where: at, message });
  const raw = parsed.data.simulator?.raw;
  const adjusted = parsed.data.simulator?.adjusted;
  const groups = z.array(Group).safeParse((params as Record<string, unknown> | null)?.groups);
  if (!groups.success) { fail(`${where}.params.groups`, "an association-curve needs params.groups: [{ from: { n, ref }, to: { n, ref } }], one per group, in order"); return out; }
  if (Array.isArray(raw) && groups.data.length !== raw.length) fail(`${where}.params.groups`, `${groups.data.length} groups, but ${raw.length} raw shares in the spec`);
  if (Array.isArray(raw) && Array.isArray(adjusted) && adjusted.length !== raw.length - 1) {
    fail(`${where}.spec.simulator.adjusted`, `one adjusted difference per group after the first (the comparison group): expected ${raw.length - 1}, got ${adjusted.length}`);
  }
  groups.data.forEach((group, i) => {
    if (group.from.n > group.to.n) fail(`${where}.params.groups[${i}]`, "a group's edges are reversed");
    const before = groups.data[i - 1];
    if (before && group.from.n !== before.to.n + 1) fail(`${where}.params.groups[${i}]`, "groups must follow on from each other, with no gap and no overlap");
  });
  return out;
}
