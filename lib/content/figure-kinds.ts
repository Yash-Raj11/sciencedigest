/**
 * Figure kinds: one drawing per kind of finding, shared by every paper, in
 * place of one hand-drawn component per paper. A read asks for one with a spec
 * in its editorial.json:
 *
 *   { "kind": "decay", "facts": { "halfLife": "half_life" }, "simulator": { "halfLife": "half_life" } }
 *
 * A spec holds names of facts and nothing else: no number, no text to show.
 * Every value the figure draws is looked up from the gated fact.
 *
 * H12: a personal estimate (the simulator) is shown only as a range worked out
 * from the gated fact's own range, under ESTIMATE_LABEL, with its source line.
 * A fact with no range means no simulator; nothing is filled in from general
 * knowledge.
 *
 * Pure: no imports from supabase, react or next.
 */

import { z } from "zod";

/** A fact of the paper ("half_life") or of a gated context study ("<slug>/half_life"). */
const FactName = z.string().regex(/^([a-z0-9]+(-[a-z0-9]+)*\/)?[a-z][a-z0-9_]*$/, "a fact id, not a value");

export const FigureSpec = z.strictObject({
  kind: z.string().min(1),
  facts: z.record(z.string(), FactName),
  simulator: z.record(z.string(), FactName).optional(),
});
export type FigureSpec = z.infer<typeof FigureSpec>;

/** What each kind needs: the facts its still view draws, and the facts its simulator works from. */
export const FIGURE_KINDS = {
  decay: { facts: ["halfLife"], simulator: ["halfLife"] },
} as const satisfies Record<string, { facts: readonly string[]; simulator: readonly string[] }>;

export type FigureKind = keyof typeof FIGURE_KINDS;
export const isFigureKind = (kind: string): kind is FigureKind => Object.hasOwn(FIGURE_KINDS, kind);

export const ESTIMATE_LABEL = "Estimate from the study's numbers, not medical advice";

/** What the lint needs to know of a fact to judge a spec. */
export interface SpecFact { kind: string; unit: string | null; point: number | null; ciLow: number | null; ciHigh: number | null }

export interface SpecProblem { rule: "figure-spec" | "H7" | "H12"; where: string; message: string }

/** A fact the simulator may work from: an estimate with both ends of its range. */
export const hasRange = (fact: SpecFact | undefined): fact is SpecFact & { point: number; ciLow: number; ciHigh: number } =>
  fact !== undefined && fact.point !== null && fact.ciLow !== null && fact.ciHigh !== null;

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
    for (const param of wanted) if (!(param in given)) fail("figure-spec", `${where}.${group}`, `a ${spec.kind} figure needs "${param}"`);
    for (const [param, id] of Object.entries(given)) {
      const fact = lookup(id);
      if (!(wanted as readonly string[]).includes(param)) fail("figure-spec", `${where}.${group}.${param}`, `a ${spec.kind} figure has no "${param}"`);
      else if (!fact) fail("figure-spec", `${where}.${group}.${param}`, `"${id}" is not a gated fact of this read; without the fact the figure is not drawn, and nothing is filled in`);
      else if (fact.kind !== "estimate" || fact.point === null) fail("figure-spec", `${where}.${group}.${param}`, `"${id}" is a ${fact.kind} with no number; a ${spec.kind} figure draws an estimate`);
      else if (spec.kind === "decay" && !/^(h|hours?)$/.test(fact.unit ?? "")) fail("figure-spec", `${where}.${group}.${param}`, `"${id}" is in "${fact.unit}"; a decay figure works in hours, and does not convert`)
      else if (group === "simulator" && !hasRange(fact)) fail("H12", `${where}.simulator.${param}`, `"${id}" has no range, so there is no simulator: a personal estimate is shown only as a range from the fact's own range`);
    }
  }
  return out;
}
