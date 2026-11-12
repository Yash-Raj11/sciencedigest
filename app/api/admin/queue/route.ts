/**
 * The Instagram approval queue. LOCAL ONLY.
 *
 * It reads and writes files in this repository (content/queue/), so it only
 * exists while you run `npm run dev` on your own machine. On a deployed site it
 * answers 404: there is no admin surface on the internet to protect.
 *
 * Nothing is ever posted from here. Approving a deck records that YOU read it;
 * the record is a small file you commit, which makes git the audit trail.
 * A deck whose wording changes after approval drops back to "changed".
 */

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { CarouselDeck } from "@/lib/content/types";

const LOCAL = process.env.NODE_ENV === "development";
const ROOT = process.cwd();
const QUEUE = path.join(ROOT, "content", "queue");

const fingerprint = (deck: CarouselDeck) => createHash("sha1").update(JSON.stringify(deck)).digest("hex").slice(0, 12);

function decks(): CarouselDeck[] {
  // Read at request time so a fresh `npm run content:build` shows up without a restart.
  return JSON.parse(readFileSync(path.join(ROOT, "content", "generated", "carousels.json"), "utf8")).decks;
}

export async function GET() {
  if (!LOCAL) return new Response("Not found", { status: 404 });
  const items = decks().map((deck) => {
    const file = path.join(QUEUE, `${deck.slug}.json`);
    const record = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) as { fingerprint: string; approvedAt: string } : null;
    const status = !record ? "waiting" : record.fingerprint === fingerprint(deck) ? "approved" : "changed";
    return { deck, status, approvedAt: record?.approvedAt ?? null };
  });
  return Response.json({ items });
}

export async function POST(request: Request) {
  if (!LOCAL) return new Response("Not found", { status: 404 });
  const { slug, action } = (await request.json()) as { slug?: string; action?: string };
  const deck = decks().find((d) => d.slug === slug);
  if (!deck) return Response.json({ error: "No deck with that slug." }, { status: 400 });
  const file = path.join(QUEUE, `${deck.slug}.json`);
  if (action === "approve") {
    mkdirSync(QUEUE, { recursive: true });
    writeFileSync(file, `${JSON.stringify({ slug: deck.slug, fingerprint: fingerprint(deck), approvedAt: new Date().toISOString() }, null, 2)}\n`);
  } else if (action === "withdraw") {
    rmSync(file, { force: true });
  } else {
    return Response.json({ error: "action must be approve or withdraw." }, { status: 400 });
  }
  return Response.json({ ok: true });
}
