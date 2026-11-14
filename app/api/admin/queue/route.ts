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
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { CarouselDeck } from "@/lib/content/types";
import { coverageChecklist, type ChecklistRow } from "@/lib/pipeline/coverage";
import { gate } from "@/lib/pipeline/gate";

const LOCAL = process.env.NODE_ENV === "development";
const ROOT = process.cwd();
const QUEUE = path.join(ROOT, "content", "queue");

const fingerprint = (deck: CarouselDeck) => createHash("sha1").update(JSON.stringify(deck)).digest("hex").slice(0, 12);

function decks(): CarouselDeck[] {
  // Read at request time so a fresh `npm run content:build` shows up without a restart.
  return JSON.parse(readFileSync(path.join(ROOT, "content", "generated", "carousels.json"), "utf8")).decks;
}

export interface CoverageCard { slug: string; published: boolean; gateOk: boolean; rows: ChecklistRow[] }

/** The coverage checklist for every paper with an extraction, drafts included: the owner checks it during draft review. */
function coverage(): CoverageCard[] {
  const dir = path.join(ROOT, "content", "papers");
  return readdirSync(dir).filter((slug) => existsSync(path.join(dir, slug, "extraction.json")) && existsSync(path.join(dir, slug, "source.txt"))).sort().map((slug) => {
    const raw = JSON.parse(readFileSync(path.join(dir, slug, "extraction.json"), "utf8")) as { coverage?: Record<string, string[]> };
    const result = gate(raw, readFileSync(path.join(dir, slug, "source.txt"), "utf8"));
    const editorial = path.join(dir, slug, "editorial.json");
    const published = existsSync(editorial) && Boolean((JSON.parse(readFileSync(editorial, "utf8")) as { publishedAt?: string | null }).publishedAt);
    const gated = result.ok ? { design: result.validated.design, sampleSize: result.validated.sampleSize, facts: result.validated.facts } : null;
    return { slug, published, gateOk: result.ok, rows: coverageChecklist(raw.coverage, gated) };
  });
}

export async function GET() {
  if (!LOCAL) return new Response("Not found", { status: 404 });
  const items = decks().map((deck) => {
    const file = path.join(QUEUE, `${deck.slug}.json`);
    const record = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) as { fingerprint: string; approvedAt: string } : null;
    const status = !record ? "waiting" : record.fingerprint === fingerprint(deck) ? "approved" : "changed";
    return { deck, status, approvedAt: record?.approvedAt ?? null };
  });
  return Response.json({ items, coverage: coverage() });
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
