"use client";

/**
 * Review screen for Instagram decks. Each deck is written by the same pipeline
 * as the read, from the same checked facts. Nothing posts by itself: you read
 * every slide here and press Approve, or you do not.
 */

import { useCallback, useEffect, useState } from "react";
import { Notice } from "@/components/protocol/primitives";
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

interface Item { deck: CarouselDeck; status: "waiting" | "approved" | "changed"; approvedAt: string | null }

const STATUS_TEXT = {
  waiting: "Waiting for your review",
  approved: "Approved: ready to post",
  changed: "Wording changed since you approved it. Review again.",
};

const KIND_NAME = { hook: "Opening", finding: "Finding", population: "Who it describes", limitation: "Limitation", nuance: "The catch", cta: "Invitation" };

function fullCaption(deck: CarouselDeck): string {
  return `${deck.caption}\n\n${deck.credit}\n\n${deck.hashtags.map((tag) => `#${tag}`).join(" ")}`;
}

function DeckCard({ item, onAct }: { item: Item; onAct: (slug: string, action: "approve" | "withdraw") => void }) {
  const { deck } = item;
  const [copied, setCopied] = useState(false);
  const caption = fullCaption(deck);
  const kinds = new Set(deck.slides.map((s) => s.kind));
  const problems = [
    !kinds.has("population") && "No slide says who was studied.",
    !kinds.has("limitation") && "No slide gives a limitation.",
    deck.slides.length > CAROUSEL_LIMITS.slides && `More than ${CAROUSEL_LIMITS.slides} slides.`,
    caption.length > CAROUSEL_LIMITS.caption && `Caption is over ${CAROUSEL_LIMITS.caption} characters.`,
  ].filter(Boolean) as string[];

  return (
    <section aria-label={deck.slug} className="rounded-2xl border border-line bg-surface p-4">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="headline">{deck.slug}</h2>
          <p className={`text-sm leading-snug ${item.status === "approved" ? "text-ink" : "text-muted"}`}>{STATUS_TEXT[item.status]}</p>
        </div>
        <span className="num shrink-0 text-sm text-muted">{deck.slides.length} slides</span>
      </header>

      <ol className="-mx-4 mt-3 flex snap-x gap-3 overflow-x-auto px-4 pb-2">
        {deck.slides.map((slide, i) => (
          <li key={i} className="flex aspect-[4/5] w-56 shrink-0 snap-start flex-col justify-between rounded-lg bg-black p-4 text-white">
            <p className="text-xs font-medium text-accent-text">{KIND_NAME[slide.kind]}</p>
            <div>
              <p className="headline">{slide.heading}</p>
              {slide.body && <p className="mt-2 text-[0.8125rem] leading-snug text-neutral-300">{slide.body}</p>}
            </div>
            <p className="num flex items-center justify-between text-xs text-neutral-400">
              <span>{i + 1} / {deck.slides.length}</span>
              <span aria-hidden className="h-1.5 w-8 rounded-sm bg-ink" />
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
          <button type="button" onClick={() => onAct(deck.slug, "withdraw")} className="h-11 flex-1 rounded-lg border border-line font-medium">Withdraw approval</button>
        ) : (
          <button type="button" disabled={problems.length > 0} onClick={() => onAct(deck.slug, "approve")} className="h-11 flex-1 rounded-lg bg-ink font-medium text-bg disabled:opacity-40">
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

  const act = async (slug: string, action: "approve" | "withdraw") => {
    await fetch("/api/admin/queue", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ slug, action }) });
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
      {items?.map((item) => <DeckCard key={item.deck.slug} item={item} onAct={act} />)}
      {items && items.length > 0 && (
        <p className="text-sm leading-snug text-muted">
          Approving writes a small file to content/queue/. Commit it: that is your record of what you signed off and when.
        </p>
      )}
    </div>
  );
}
