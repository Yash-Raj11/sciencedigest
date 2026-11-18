/**
 * The draft stage's menu of figure kinds (docs/SIMULATORS.md, sections b, c and g).
 *
 * Before the editorial model writes a read, code works out which kinds this paper's gated facts
 * can feed, and with which facts. The model then picks one kind and names facts from the menu;
 * it never invents a kind or a fact, and never writes a number into a spec. The lint checks the
 * spec it writes with the same rules (specProblems), so the menu only saves a wasted draft: it
 * cannot let anything through that the lint would refuse.
 *
 * A slot's candidates follow the build check order (SIMULATORS.md g):
 *   1. the paper's own gated facts;
 *   2. the owner-approved fact library (content/library.json);
 *   3. otherwise none: the kind's simulator is not offered (H12), and no number is filled in.
 *
 * Pure: no imports from supabase, react or next.
 */

import { FIGURE_KINDS, hasRange, type FigureKind, type Slot, type SpecFact } from "../content/figure-kinds";
import { simulatorBand } from "../models/spread";
import type { ValidatedFact } from "./gate";
import type { LintContext } from "./lint";

/** What the spec check knows of a fact, from a gated one (the same mapping the lint uses). */
export const specFactOf = (fact: ValidatedFact): SpecFact => ({
  kind: fact.kind,
  unit: fact.estimate?.unit ?? null,
  point: fact.estimate?.point ?? null,
  ciLow: fact.estimate?.ciLow ?? null,
  ciHigh: fact.estimate?.ciHigh ?? null,
  spread: fact.spread ?? null,
});

export interface Candidate {
  /** "<fact>" for the paper's own, "<study>/<fact>" for a library fact. */
  id: string;
  source: "paper" | "library";
  label: string;
  unit: string;
  /** For a simulator input: the band's label (SIMULATORS.md h), which says what the range means. */
  band?: string;
}

export interface SlotOffer { group: "facts" | "simulator"; param: string; many: boolean; candidates: Candidate[] }

export interface KindOffer {
  kind: FigureKind;
  /** Every still-view slot has at least one candidate. */
  still: boolean;
  /** Every simulator slot has at least one candidate (and so a range, where the slot needs one). */
  simulator: boolean;
  /**
   * Some slot this kind needs can be filled only from the library, that is from another study.
   * Such a fact fits any paper by its unit, so the menu says to use it only when the read is about
   * what that fact measures (a caffeine half-life is no use to a read on walking).
   */
  anotherStudyOnly: boolean;
  slots: SlotOffer[];
}

function fits(fact: SpecFact, slot: Slot, group: "facts" | "simulator"): boolean {
  if (fact.kind !== "estimate" || fact.point === null) return false;
  if (slot.unit && !slot.unit.test(fact.unit ?? "")) return false;
  if (group === "simulator" && slot.band && !hasRange(fact)) return false;
  return true;
}

/** The library facts the lint would accept in a simulator: gated, not withdrawn, not excluded. */
function libraryFacts(context: Pick<LintContext, "studies" | "library"> | undefined): [string, ValidatedFact][] {
  const out: [string, ValidatedFact][] = [];
  for (const ref of context?.library ?? []) {
    const [slug, id] = ref.split("/");
    const study = context?.studies[slug];
    if (!study?.ok || study.withdrawn || (study.excluded && Object.hasOwn(study.excluded, id))) continue;
    const fact = study.validated.facts[id];
    if (fact) out.push([ref, fact]);
  }
  return out;
}

/**
 * Every figure kind, with the facts that could fill each of its slots. A kind whose still view
 * cannot be filled is still listed (with `still: false`), so the draft log says why it was not
 * offered.
 */
export function proposeKinds(paperFacts: Readonly<Record<string, ValidatedFact>>, context?: Pick<LintContext, "studies" | "library">): KindOffer[] {
  const library = libraryFacts(context);
  return (Object.keys(FIGURE_KINDS) as FigureKind[]).map((kind) => {
    const needs = FIGURE_KINDS[kind];
    const slots: SlotOffer[] = [];
    for (const group of ["facts", "simulator"] as const) {
      const wanted: Record<string, Slot> = needs[group];
      for (const [param, slot] of Object.entries(wanted)) {
        const candidates: Candidate[] = [];
        const consider = (id: string, fact: ValidatedFact, source: Candidate["source"]) => {
          const spec = specFactOf(fact);
          if (!fits(spec, slot, group)) return;
          const band = group === "simulator" && slot.band ? simulatorBand(spec)?.label : undefined;
          candidates.push({ id, source, label: fact.label, unit: spec.unit ?? "", ...(band ? { band } : {}) });
        };
        for (const [id, fact] of Object.entries(paperFacts)) consider(id, fact, "paper");
        // The library comes after the paper's own facts (SIMULATORS.md g). It feeds the still view
        // too: the caffeine read draws its half-life curve and its simulator from the same library fact.
        for (const [ref, fact] of library) consider(ref, fact, "library");
        slots.push({ group, param, many: Boolean(slot.many), candidates });
      }
    }
    const full = (group: SlotOffer["group"]) => slots.filter((s) => s.group === group).every((s) => s.candidates.length > 0);
    const simulator = full("facts") && full("simulator");
    const needed = slots.filter((s) => s.group === "facts" || simulator);
    const anotherStudyOnly = needed.some((s) => s.candidates.length > 0 && s.candidates.every((c) => c.source === "library"));
    return { kind, still: full("facts"), simulator, anotherStudyOnly, slots };
  });
}

/**
 * The menu as the prompt shows it: fact ids, labels and units, never a fact's value. A kind that
 * cannot be drawn is named with the slot it is missing, so the model does not try it.
 */
export function kindMenu(offers: readonly KindOffer[]): string {
  const lines: string[] = [];
  // The kinds this paper fills itself come first (SIMULATORS.md g: the paper's own facts before the library).
  const usable = offers.filter((o) => o.still).sort((a, b) => Number(a.anotherStudyOnly) - Number(b.anotherStudyOnly));
  if (usable.length === 0) lines.push("No figure kind can be drawn from this paper's facts. Use the estimate-explorer simulator.");
  for (const offer of usable) {
    const what = offer.simulator ? "still view and simulator" : "still view only (no simulator: a simulator input has no gated fact with a range)";
    const only = offer.anotherStudyOnly ? "; ANOTHER STUDY ONLY: this paper has no fact for it, so use it only if this read is about what the library fact below measures" : "";
    lines.push(`- ${offer.kind}: ${what}${only}`);
    for (const slot of offer.slots) {
      if (slot.group === "simulator" && !offer.simulator) continue;
      lines.push(`  ${slot.group}.${slot.param}${slot.many ? " (a list of fact ids, in order)" : " (one fact id)"}:`);
      if (slot.candidates.length === 0) lines.push("    none");
      for (const c of slot.candidates) {
        lines.push(`    ${c.id}: ${c.label} (${c.unit}${c.source === "library" ? ", from the owner-approved library" : ""}${c.band ? `; band: ${c.band}` : ""})`);
      }
    }
  }
  for (const offer of offers.filter((o) => !o.still)) {
    const missing = offer.slots.filter((s) => s.group === "facts" && s.candidates.length === 0).map((s) => s.param);
    lines.push(`- ${offer.kind}: not available (no gated fact fits ${missing.join(", ")})`);
  }
  return lines.join("\n");
}
