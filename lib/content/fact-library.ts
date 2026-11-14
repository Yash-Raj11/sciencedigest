/**
 * The fact library (docs/SIMULATORS.md, section g): context facts the owner has
 * approved for simulators. Once a fact is here, any paper's simulator may use
 * it without approving it again.
 *
 *   content/library.json
 *   { "facts": [ { "ref": "<study>/<fact>", "quantity": "caffeine-half-life",
 *                  "approved": { "by": "owner", "on": "2026-11-14" }, "note": "why, and what it covers" } ] }
 *
 * The library never holds a number: an entry names a gated fact of a context
 * study, and the number is read from that fact. A simulator input is looked up
 * in this order (simulatorSource):
 *   1. the paper's own gated facts;
 *   2. the approved library;
 *   3. otherwise missing: no simulator (the read publishes with its still figure).
 *
 * Pure: no imports from supabase, react or next.
 */

import { z } from "zod";
import { simulatorBand, type Spread } from "../models/spread";

const SLUG = "[a-z0-9]+(-[a-z0-9]+)*";
const StudyRef = z.string().regex(new RegExp(`^${SLUG}/[a-z][a-z0-9_]*$`), 'a context fact, written "<study>/<fact>"');

export const LibraryEntry = z.strictObject({
  ref: StudyRef,
  /** What the number is, so a later paper can find it: "caffeine-half-life". */
  quantity: z.string().regex(new RegExp(`^${SLUG}$`), "lower-case-with-hyphens"),
  /** Only the owner approves a library fact. */
  approved: z.strictObject({ by: z.literal("owner"), on: z.iso.date() }),
  note: z.string().trim().min(1, "say what the fact covers and why it was approved"),
});
export type LibraryEntry = z.infer<typeof LibraryEntry>;

export const LibraryFile = z.strictObject({ facts: z.array(LibraryEntry) });
export type LibraryFile = z.infer<typeof LibraryFile>;

/** What the library check needs to know of a context study (scripts/context-load.ts gives it). */
export type LibraryStudy =
  | {
    ok: true; withdrawn: unknown | null; excluded?: Record<string, string>;
    facts: Record<string, { kind: string; estimate?: { point: number; ciLow: number | null; ciHigh: number | null } | null; spread?: Spread | null }>;
  }
  | { ok: false };

/**
 * Everything wrong with the library file. An entry must name a fact of a context study
 * that passed the gate, is not withdrawn and is not excluded, and that is an estimate
 * with a printed spread: a library fact exists to feed a simulator, and H12 needs the range.
 */
export function libraryProblems(raw: unknown, studies: Record<string, LibraryStudy>): string[] {
  const parsed = LibraryFile.safeParse(raw);
  if (!parsed.success) return parsed.error.issues.map((issue) => `library ${issue.path.join(".") || "file"}: ${issue.message}`);
  const out: string[] = [];
  const seenRef = new Set<string>();
  const seenQuantity = new Set<string>();
  for (const entry of parsed.data.facts) {
    const at = `library ${entry.ref}`;
    if (seenRef.has(entry.ref)) out.push(`${at}: listed twice`);
    if (seenQuantity.has(entry.quantity)) out.push(`${at}: the quantity "${entry.quantity}" is already in the library; one approved fact per quantity`);
    seenRef.add(entry.ref);
    seenQuantity.add(entry.quantity);
    const [slug, id] = entry.ref.split("/");
    const study = studies[slug];
    if (!study) { out.push(`${at}: there is no context study "${slug}" (content/context/)`); continue; }
    if (!study.ok) { out.push(`${at}: the study "${slug}" failed the gate`); continue; }
    if (study.withdrawn) { out.push(`${at}: the study "${slug}" has been withdrawn`); continue; }
    if (study.excluded && Object.hasOwn(study.excluded, id)) { out.push(`${at}: the owner excluded this fact (${study.excluded[id]})`); continue; }
    const fact = study.facts[id];
    if (!fact) { out.push(`${at}: "${id}" is not a verified fact of "${slug}"`); continue; }
    if (fact.kind !== "estimate" || !fact.estimate) { out.push(`${at}: a ${fact.kind}; a library fact is an estimate`); continue; }
    const band = simulatorBand({ point: fact.estimate.point, ciLow: fact.estimate.ciLow, ciHigh: fact.estimate.ciHigh, spread: fact.spread ?? null });
    if (!band) out.push(`${at}: no printed spread, so it cannot feed a simulator (H12)`);
  }
  return out;
}

/** The approved refs, for the lint (only call after libraryProblems found nothing). */
export const approvedRefs = (file: LibraryFile): string[] => file.facts.map((entry) => entry.ref).sort();

/** The approved fact for a quantity, if the library has one. */
export const libraryFor = (file: LibraryFile, quantity: string): LibraryEntry | undefined =>
  file.facts.find((entry) => entry.quantity === quantity);

export type SimulatorSource = "paper" | "library" | "missing";

/**
 * Where a simulator input comes from: the paper's own gated fact first, then the approved
 * library. Anything else is missing, and the simulator is not built from it.
 */
export function simulatorSource(id: string, paperFacts: Readonly<Record<string, unknown>>, library: readonly string[]): SimulatorSource {
  if (!id.includes("/")) return Object.hasOwn(paperFacts, id) ? "paper" : "missing";
  return library.includes(id) ? "library" : "missing";
}
