/**
 * Draws one slide of a deck as PNG, for the review queue. LOCAL ONLY, like /api/admin/queue:
 * it reads the built decks and the font files from this repository, so it exists only while you
 * run `npm run dev`. On a deployed site it answers 404, so it is never a free image renderer on
 * the internet. Nothing is posted from here.
 *
 *   GET /api/admin/carousel?slug=<slug>&slide=<1-based number>[&look=<dark|light|dark-vivid|light-vivid>][&hook=<a|b|c|d>]
 *
 * `hook` draws the deck with that opening as slide 1 (lib/carousel/hooks.ts).
 */

import { loadDecks } from "@/lib/carousel/decks";
import { hookChoices, withHook } from "@/lib/carousel/hooks";
import { renderSlide, SlideProblems } from "@/lib/carousel/render";
import { isLook, LOOKS } from "@/lib/carousel/tokens";

/** Read at each request, not at load: nothing can cache a "yes". */
const local = () => process.env.NODE_ENV === "development";

export async function GET(request: Request) {
  if (!local()) return new Response("Not found", { status: 404 });
  const url = new URL(request.url);
  const deck = loadDecks().find((d) => d.slug === url.searchParams.get("slug"));
  if (!deck) return Response.json({ error: "No deck with that slug." }, { status: 400 });
  const n = Number(url.searchParams.get("slide"));
  if (!Number.isInteger(n) || n < 1 || n > deck.slides.length) {
    return Response.json({ error: `slide must be a whole number from 1 to ${deck.slides.length}.` }, { status: 400 });
  }
  const look = url.searchParams.get("look") ?? "dark";
  if (!isLook(look)) return Response.json({ error: `look must be one of ${LOOKS.join(", ")}.` }, { status: 400 });
  const hook = url.searchParams.get("hook") ?? "a";
  if (!hookChoices(deck).includes(hook)) return Response.json({ error: `hook must be one of ${hookChoices(deck).join(", ")}.` }, { status: 400 });
  try {
    const png = await renderSlide(withHook(deck, hook), n - 1, look);
    return new Response(new Uint8Array(png), { headers: { "content-type": "image/png", "cache-control": "no-store" } });
  } catch (error) {
    if (error instanceof SlideProblems) return Response.json({ error: "This slide cannot be drawn.", problems: error.problems }, { status: 422 });
    throw error;
  }
}
