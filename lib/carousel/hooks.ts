/**
 * Choosing the opening slide (owner, 2026-11-20). A deck carries its own hook (A) and up to three
 * alternates (B, C, D), each linted like the hook. Pure: the export, the parity check, the route
 * and the queue all draw an alternate the same way, as the deck with its first slide swapped.
 */

import type { CarouselDeck } from "../content/types";

export const OWN_HOOK = "a";

/** Every opening the owner may choose, A first. */
export const hookChoices = (deck: CarouselDeck) => [OWN_HOOK, ...(deck.altHooks ?? []).map((h) => h.letter)];

/** The deck with opening `letter` as its first slide. Throws on a letter the deck does not have. */
export function withHook(deck: CarouselDeck, letter: string = OWN_HOOK): CarouselDeck {
  if (letter === OWN_HOOK) return deck;
  const alt = (deck.altHooks ?? []).find((h) => h.letter === letter);
  if (!alt) throw new Error(`carousel: ${deck.slug} has no opening "${letter}" (it has ${hookChoices(deck).join(", ")})`);
  return { ...deck, slides: [alt.slide, ...deck.slides.slice(1)] };
}

/** "01-hook-b.png": an alternate opening's file, beside the deck's own 01-hook.png. */
export const altHookFileName = (letter: string) => `01-hook-${letter}.png`;
