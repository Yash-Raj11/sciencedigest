"use client";

/**
 * Review screen for Instagram decks. Each deck is written by the same pipeline
 * as the read, from the same checked facts. Nothing posts by itself: you read
 * every slide here and press Approve, or you do not.
 */

import { useCallback, useEffect, useState } from "react";
import { Notice } from "@/components/protocol/primitives";
import { LOOK_NAME, LOOKS, type Look } from "@/lib/carousel/tokens";
import type { CarouselDeck } from "@/lib/content/types";
import { CAROUSEL_LIMITS } from "@/lib/pipeline/lint";
import type { ChecklistRow } from "@/lib/pipeline/coverage";

interface CoverageCard { slug: string; published: boolean; gateOk: boolean; rows: ChecklistRow[] }

/** Which items of a paper are covered by a gated fact. It decides nothing: you confirm it while reading the draft. */
function CoverageChecklist({ card }: { card: CoverageCard }) {
  const missing = card.rows.filter((row) => !row.found).length;
  return (
    <details className="rounded-2xl border border-line bg-surface p-4" open={missing > 0}>
      <summary className="flex cursor-pointer items-baseline justify-between gap-3">
        <span className="headline">{card.slug}</span>
        <span className="text-sm text-muted">
          {card.published ? "Published" : "Draft"} · {card.gateOk ? (missing === 0 ? "all found" : `${missing} not found`) : "gate refused: fix the extraction first"}
        </span>
      </summary>
      <ul className="mt-3 space-y-1.5">
        {card.rows.map((row) => (
          <li key={row.item} className="flex gap-2 text-sm leading-snug">
            <span aria-hidden className={row.found ? "text-ink" : "text-muted"}>{row.found ? "✓" : "–"}</span>
            <span className="min-w-0">
              {row.label}:{" "}
              {row.found ? <code className="break-words text-muted">{row.facts.join(", ")}</code> : <strong>not found</strong>}
            </span>
          </li>
        ))}
      </ul>
    </details>
  );
}

interface Item { deck: CarouselDeck; status: "waiting" | "approved" | "changed"; approvedAt: string | null; hook: string }

const STATUS_TEXT = {
  waiting: "Waiting for your review",
  approved: "Approved: ready to post",
  changed: "Wording changed since you approved it. Review again.",
};

/** What each slide is for, as the reviewer reads it beside the image. */
const KIND_NAME = { hook: "Hook", finding: "Finding", why: "Why", who: "Who it applies to", receipts: "Receipts", cta: "Invitation" };

function fullCaption(deck: CarouselDeck): string {
  return `${deck.caption}\n\n${deck.credit}\n\n${deck.hashtags.map((tag) => `#${tag}`).join(" ")}`;
}

const slideSrc = (slug: string, slide: number, look: Look, hook: string) =>
  `/api/admin/carousel?slug=${encodeURIComponent(slug)}&slide=${slide}&look=${look}&hook=${hook}`;

/** The openings to choose from: the deck's own hook (A) and its alternates. Each is the full first slide. */
function OpeningPicker({ deck, look, hook, locked, onPick }: { deck: CarouselDeck; look: Look; hook: string; locked: boolean; onPick: (hook: string) => void }) {
  const options = [{ letter: "a", name: "As drafted", slide: deck.slides[0] }, ...(deck.altHooks ?? [])];
  return (
    <fieldset className="mt-3">
      <legend className="text-sm font-medium">Opening slide <span className="font-normal text-muted">· choose one; the rest of the deck stays the same</span></legend>
      <ol className="-mx-4 mt-2 flex snap-x gap-3 overflow-x-auto px-4 pb-2">
        {options.map((o) => (
          <li key={o.letter} className="w-40 shrink-0 snap-start">
            <button
              type="button"
              aria-pressed={hook === o.letter}
              disabled={locked}
              onClick={() => onPick(o.letter)}
              className={`block w-full rounded-lg border-2 p-0.5 text-left disabled:cursor-not-allowed ${hook === o.letter ? "border-signal-evidence-text" : "border-transparent"}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- a local, uncached PNG; next/image would re-encode it */}
              <img src={slideSrc(deck.slug, 1, look, o.letter)} alt={[o.slide.heading, o.slide.body].filter(Boolean).join(" ")} width={1080} height={1350} loading="lazy" className="aspect-[4/5] w-full rounded-md bg-black" />
              <span className="mt-1 block text-xs leading-snug"><span className="num font-medium uppercase">{o.letter}</span> · {o.name}</span>
            </button>
          </li>
        ))}
      </ol>
    </fieldset>
  );
}

function DeckCard({ item, look, onAct }: { item: Item; look: Look; onAct: (slug: string, action: "approve" | "withdraw", hook: string) => void }) {
  const { deck } = item;
  const [copied, setCopied] = useState(false);
  const [hook, setHook] = useState(item.hook);
  const approved = item.status === "approved";
  const shown = approved ? item.hook : hook;
  const caption = fullCaption(deck);
  // The slide rules (order, kinds, words, receipts) are refused by the content build; only the
  // full caption, with credit and hashtags added, is new here.
  const problems = [
    caption.length > CAROUSEL_LIMITS.caption && `Caption is over ${CAROUSEL_LIMITS.caption} characters.`,
    // Background concepts and common facts only this deck uses must be reviewed first (npm run paper -- approve-concept / approve-common).
    (deck.pending ?? []).length > 0 && `It uses ${(deck.pending ?? []).join(", ")}, which you have not reviewed yet: run npm run paper -- approve-concept or approve-common in a terminal.`,
  ].filter(Boolean) as string[];

  return (
    <section aria-label={deck.slug} className="rounded-2xl border border-line bg-surface p-4">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="headline">{deck.slug}</h2>
          <p className={`text-sm leading-snug ${approved ? "text-ink" : "text-muted"}`}>
            {STATUS_TEXT[item.status]}{approved && (deck.altHooks ?? []).length > 0 ? `, opening ${item.hook.toUpperCase()}` : ""}
          </p>
        </div>
        <span className="num shrink-0 text-sm text-muted">{deck.slides.length} slides</span>
      </header>

      {(deck.altHooks ?? []).length > 0 && <OpeningPicker deck={deck} look={look} hook={shown} locked={approved} onPick={setHook} />}

      <ol className="-mx-4 mt-3 flex snap-x gap-3 overflow-x-auto px-4 pb-2">
        {deck.slides.map((s, i) => (i === 0 ? (deck.altHooks ?? []).find((h) => h.letter === shown)?.slide ?? s : s)).map((slide, i) => (
          <li key={i} className="w-64 shrink-0 snap-start">
            {/* The exact PNG that would be posted, drawn by /api/admin/carousel (local only). */}
            {/* eslint-disable-next-line @next/next/no-img-element -- a local, uncached PNG; next/image would re-encode it */}
            <img
              src={slideSrc(deck.slug, i + 1, look, shown)}
              alt={[slide.heading, slide.body].filter(Boolean).join(" ")}
              width={1080}
              height={1350}
              loading="lazy"
              className="aspect-[4/5] w-full rounded-lg bg-black"
            />
            <p className="num mt-1.5 flex justify-between text-xs text-muted">
              <span>{KIND_NAME[slide.kind]}</span>
              <span>{i + 1} of {deck.slides.length}</span>
            </p>
          </li>
        ))}
      </ol>

      <div className="mt-3 rounded-xl border border-line bg-bg p-3.5">
        <p className="flex items-baseline justify-between gap-3 text-sm font-medium">
          Caption
          <span className="num font-normal text-muted">{caption.length} of {CAROUSEL_LIMITS.caption} characters</span>
        </p>
        <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-muted">{caption}</p>
      </div>

      {problems.length > 0 && (
        <div className="mt-3"><Notice tone="warn"><strong>Do not approve yet.</strong> {problems.join(" ")}</Notice></div>
      )}

      <footer className="mt-3 flex gap-2">
        {item.status === "approved" ? (
          <button type="button" onClick={() => onAct(deck.slug, "withdraw", hook)} className="h-11 flex-1 rounded-lg border border-line font-medium">Withdraw approval</button>
        ) : (
          <button type="button" disabled={problems.length > 0} onClick={() => onAct(deck.slug, "approve", hook)} className="h-11 flex-1 rounded-lg bg-ink font-medium text-bg disabled:opacity-40">
            I have read every slide: approve
          </button>
        )}
        <button
          type="button"
          onClick={() => { void navigator.clipboard.writeText(caption).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }); }}
          className="h-11 rounded-lg border border-line px-4 font-medium"
        >
          {copied ? "Copied" : "Copy caption"}
        </button>
      </footer>
    </section>
  );
}

export function QueueBoard() {
  const [items, setItems] = useState<Item[] | null>(null);
  const [coverage, setCoverage] = useState<CoverageCard[]>([]);
  const [unavailable, setUnavailable] = useState(false);
  const [look, setLook] = useState<Look>("dark");

  const load = useCallback(async () => {
    const response = await fetch("/api/admin/queue", { cache: "no-store" });
    if (!response.ok) { setUnavailable(true); return; }
    const data = (await response.json()) as { items: Item[]; coverage?: CoverageCard[] };
    setItems(data.items);
    setCoverage(data.coverage ?? []);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/admin/queue", { cache: "no-store" }).then(async (response) => {
      if (cancelled) return;
      if (!response.ok) setUnavailable(true);
      else {
        const data = (await response.json()) as { items: Item[]; coverage?: CoverageCard[] };
        setItems(data.items);
        setCoverage(data.coverage ?? []);
      }
    });
    return () => { cancelled = true; };
  }, []);

  const act = async (slug: string, action: "approve" | "withdraw", hook: string) => {
    await fetch("/api/admin/queue", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ slug, action, hook }) });
    await load();
  };

  return (
    <div className="space-y-4 pb-8">
      <header className="pt-2">
        <h1 className="headline">Instagram queue</h1>
        <p className="text-muted">One deck per published paper, written from the same checked facts as the read. Nothing is posted from here.</p>
      </header>
      {unavailable && (
        <Notice tone="warn">
          <strong>This page only works on your own machine.</strong> Run <code>npm run dev</code> and open it at localhost. It does not exist on the deployed site.
        </Notice>
      )}
      {coverage.length > 0 && (
        <section aria-label="Coverage checklist" className="space-y-2">
          <h2 className="headline">Coverage checklist</h2>
          <p className="text-sm leading-snug text-muted">Each item is ticked only by a fact that passed the gate. Check each one against the paper while you review the draft.</p>
          {coverage.map((card) => <CoverageChecklist key={card.slug} card={card} />)}
        </section>
      )}
      {items?.length === 0 && <Notice>No decks yet. Publish a paper, then run <code>npm run content:build</code>.</Notice>}
      {items && items.length > 0 && (
        // Every deck is exported in each look (docs/evidence/carousel/<slug>/<look>/); you post one.
        <label className="flex items-center justify-between gap-3 text-sm font-medium">
          Show the slides in
          <select value={look} onChange={(e) => setLook(e.target.value as Look)} className="h-11 rounded-lg border border-line bg-surface px-3 font-normal">
            {LOOKS.map((l) => <option key={l} value={l}>{LOOK_NAME[l]}</option>)}
          </select>
        </label>
      )}
      {items?.map((item) => <DeckCard key={item.deck.slug} item={item} look={look} onAct={act} />)}
      {items && items.length > 0 && (
        <p className="text-sm leading-snug text-muted">
          Approving writes a small file to content/queue/. Commit it: that is your record of what you signed off and when.
        </p>
      )}
    </div>
  );
}
