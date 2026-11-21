/**
 * The built decks (content/generated/carousels.json) and which of them belong to a published
 * read. Read from disk at call time, so a fresh `npm run content:build` shows up at once. Node only.
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { CarouselDeck } from "../content/types";

export function loadDecks(root = process.cwd()): CarouselDeck[] {
  return (JSON.parse(readFileSync(path.join(root, "content", "generated", "carousels.json"), "utf8")) as { decks: CarouselDeck[] }).decks;
}

export function isPublished(slug: string, root = process.cwd()): boolean {
  const file = path.join(root, "content", "papers", slug, "editorial.json");
  return existsSync(file) && Boolean((JSON.parse(readFileSync(file, "utf8")) as { publishedAt?: string | null }).publishedAt);
}

/** "03-finding.png": the order and the kind, so a folder of PNGs reads as the deck. */
export const slideFileName = (index: number, kind: string) => `${String(index + 1).padStart(2, "0")}-${kind}.png`;
