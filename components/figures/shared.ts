/**
 * What every figure primitive shares: the colour tokens (never a hex value),
 * and the one visual rule about evidence.
 *
 *   measured   solid line, filled shape
 *   proposed   dashed line, outlined shape
 *
 * A primitive that takes `kind` also takes the fact it rests on and refuses to
 * draw when the two disagree (lib/content/figures.ts).
 */

import type { EvidenceKind } from "@/lib/content/figures";
import type { ResolvedFact } from "@/lib/content/types";

export const INK = "var(--ink)";
export const MUTED = "var(--muted)";
export const LINE = "var(--line)";
export const ACCENT = "var(--accent)";
export const ACCENT_TEXT = "var(--accent-text)";
export const SURFACE = "var(--surface)";
export const META = "var(--meta)";
/** Peach: a surface for a range or an uncertainty band, never text. */
export const BAND = "var(--band)";
/** Soft sage: reserved for concept sketches (shape only, not data). */
export const SAGE = "var(--sage)";
export const BG = "var(--bg)";

export const DASH = "5 4";
export const FONT = "var(--font-sans)";

/** An element drawn as measured or proposed, with the fact that lets it be drawn that way. */
export interface Evidence {
  kind: EvidenceKind;
  fact: ResolvedFact;
}

/** The stroke of a line or outline of this kind. */
export const strokeOf = (kind: EvidenceKind) => (kind === "measured" ? {} : { strokeDasharray: DASH });
