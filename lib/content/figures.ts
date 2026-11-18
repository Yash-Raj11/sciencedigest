/**
 * Every figure the app can draw, as "<paper slug>/<figure id>".
 *
 * This list is the one place a figure is named. The build refuses a read that
 * references a figure not listed here (lib/pipeline/lint.ts), and
 * components/papers/registry.tsx must supply a component for every entry, or
 * the typecheck fails. To add a figure: draw it in
 * components/papers/<slug>/figures/, add its key here, register it there.
 *
 * Also here: the one rule every figure obeys about what is drawn solid and
 * what is drawn dashed.
 *
 *   measured   solid lines, filled shapes: something this paper measured.
 *              It must cite a result (an estimate or a finding).
 *   proposed   dashed lines, outlined shapes: the authors' explanation.
 *              It must cite the sentence where they propose it, which is
 *              never a result.
 *
 * Pure: no imports from supabase, react or next.
 */

export const FIGURE_KEYS = [
  "daytime-caffeine-sleep/parking-spot",
  "steps-days-per-week/three-crowds",
  "hiit-body-composition/order-flips",
  "hiit-body-composition/two-piles",
  "turmeric-pepper-breakfast/tongue-to-blood",
  "turmeric-pepper-breakfast/five-readings",
  "turmeric-pepper-breakfast/first-half-hour",
] as const;

export type FigureKey = (typeof FIGURE_KEYS)[number];

export const figureKey = (slug: string, figure: string): string => `${slug}/${figure}`;
export const isFigureKey = (key: string): key is FigureKey => (FIGURE_KEYS as readonly string[]).includes(key);

export const EVIDENCE_KINDS = ["measured", "proposed"] as const;
export type EvidenceKind = (typeof EVIDENCE_KINDS)[number];

export const EVIDENCE_KEY = "solid: measured · dashed: proposed";

const RESULT_KINDS: readonly string[] = ["estimate", "finding"];

/**
 * A descriptive fact (who was studied, measured at the start: owner, 2026-11-15) may be drawn as
 * measured, never as proposed, and the figure says so with this label.
 */
export const DESCRIPTIVE_LABEL = "Measured at the start";
const MEASURED_KINDS: readonly string[] = [...RESULT_KINDS, "descriptive"];

/** Why this fact cannot stand behind an element of this kind, or null when it can. */
export function evidenceKindProblem(kind: EvidenceKind, fact: { id: string; kind: string } | null | undefined): string | null {
  if (!fact) return `a "${kind}" element must cite a fact`;
  if (kind === "measured" && !MEASURED_KINDS.includes(fact.kind)) {
    return `"${fact.id}" is a ${fact.kind}, not a result; only an estimate, a finding or a descriptive fact may be drawn as measured`;
  }
  if (kind === "proposed" && MEASURED_KINDS.includes(fact.kind)) {
    return `"${fact.id}" is ${fact.kind === "descriptive" ? "a measurement at the start" : `a result (${fact.kind})`}; a proposed element cites the sentence where the authors propose it`;
  }
  return null;
}

/** Throws on a mismatch. The primitives call this, so a wrong figure cannot render at all. */
export function assertEvidence(kind: EvidenceKind, fact: { id: string; kind: string } | null | undefined): void {
  const problem = evidenceKindProblem(kind, fact);
  if (problem) throw new Error(`figure: ${problem}`);
}

/** Which kinds a figure's params use, so the page knows whether to show the key. */
export function evidenceKindsIn(params: unknown): EvidenceKind[] {
  const found = new Set<EvidenceKind>();
  (function walk(node: unknown) {
    if (Array.isArray(node)) { node.forEach(walk); return; }
    if (node === null || typeof node !== "object") return;
    const record = node as Record<string, unknown>;
    if (record.kind === "measured" || record.kind === "proposed") found.add(record.kind);
    // A resolved fact is a leaf: its own "kind" (estimate, finding...) is not an evidence kind.
    for (const [key, child] of Object.entries(record)) if (key !== "fact") walk(child);
  })(params);
  return EVIDENCE_KINDS.filter((kind) => found.has(kind));
}
