/**
 * The feed card, the key idea at a glance (owner, 2026-11-14), in this order:
 *
 *   meta (topic · read time)
 *   a serif headline with the key finding ("−14.9 points lower 10-year risk of death ...")
 *   one plain sentence
 *   the still figure: axis labels only, no numeric ticks or values, the gated range as a peach band
 *   "What's inside": 3–4 rows that open the read at a slot; the "Try it" row is the card's focal orange
 *   the source line and the grade
 *
 * A members' read lists only the slots everyone can open. Pure: no React, Next or Supabase.
 */

import { formatEstimate } from "../pipeline/format";
import type { GlanceView, PaperContent, Sentence } from "./types";

const plain = (sentences: Sentence[]) => sentences.map((s) => s.text).join(" ");

/** An old-shape read's sections that are receipts (until step 2E moves them into the audit layer). */
export const LEGACY_RECEIPTS = new Set(["lower-bound", "missed"]);

/** The places in a read a card row can open, as element ids on the read's page. */
export const SLOTS = { why: "why", try: "try", protocol: "protocol", receipts: "receipts", evidence: "evidence" } as const;
export type Slot = (typeof SLOTS)[keyof typeof SLOTS];

/** The heading of a read's "why" slot: the mechanism layer, or an old-shape read's first section. */
export function whyHeading(content: Pick<PaperContent, "layers" | "sections">): string | null {
  if (content.layers) return "Why it happens";
  return content.sections.find((s) => !LEGACY_RECEIPTS.has(s.id))?.heading ?? null;
}

export function glanceView(content: PaperContent): GlanceView {
  const fact = content.facts[content.primaryEstimate];
  const e = fact?.estimate;
  const words = plain(content.finding.headline);
  return {
    headline: e ? `${formatEstimate({ ...e, ciLow: null, ciHigh: null })} ${words}` : words,
    support: plain(content.finding.support),
    figure: content.glance.figure,
    axes: { x: plain(content.glance.x), y: content.glance.y.length ? plain(content.glance.y) : null },
    alt: plain(content.glance.alt),
    note: plain(content.glance.note),
    tryIt: plain(content.glance.tryIt),
    tier: e?.tier ?? fact?.finding?.tier ?? null,
  };
}

export interface InsideRow { label: string; slot: Slot; focal: boolean }

/**
 * The card's "What's inside" rows. A free read: why it happens, the simulator (the focal orange
 * row), the protocol, the receipts. A members' read: only what everyone can open on its page,
 * the protocol and how sure the evidence is.
 */
export function insideRows(input: { members: boolean; why?: string | null; tryIt?: string }): InsideRow[] {
  if (input.members) {
    return [
      { label: "Put it in your Life Game", slot: SLOTS.protocol, focal: false },
      { label: "How sure the evidence is", slot: SLOTS.evidence, focal: false },
    ];
  }
  return [
    ...(input.why ? [{ label: input.why, slot: SLOTS.why, focal: false }] : []),
    ...(input.tryIt ? [{ label: `Try it: ${input.tryIt}`, slot: SLOTS.try, focal: true }] : []),
    { label: "Put it in your Life Game", slot: SLOTS.protocol, focal: false },
    { label: "The receipts", slot: SLOTS.receipts, focal: false },
  ];
}
