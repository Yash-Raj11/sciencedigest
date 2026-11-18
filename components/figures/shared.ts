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
/** This paper's finding, as small bright text or a short mark: never a fill. */
export const SIGNAL_TEXT = "var(--signal-evidence-text)";
export const SURFACE = "var(--surface)";
export const META = "var(--meta)";
/** Pastel peach: the paper's finding as a surface (a band, a range, a result box), never text. */
export const SIGNAL_FILL = "var(--signal-evidence-fill)";
/** A lighter peach (darker in dark themes): a soft band behind an orange line, so the line stays clear. */
export const SIGNAL_PALE = "var(--signal-evidence-pale)";
/** Text drawn on SIGNAL_FILL. */
export const ON_SIGNAL_FILL = "var(--on-signal-evidence-fill)";
export const BG = "var(--bg)";

export const DASH = "5 4";
/** A sketch (shape only, not data): a thin dotted line in monochrome ink, never orange. */
export const DOT = "1 4";
export const FONT = "var(--font-sans)";

/** An element drawn as measured or proposed, with the fact that lets it be drawn that way. */
export interface Evidence {
  kind: EvidenceKind;
  fact: ResolvedFact;
}

/** The stroke of a line or outline of this kind. */
export const strokeOf = (kind: EvidenceKind) => (kind === "measured" ? {} : { strokeDasharray: DASH });
