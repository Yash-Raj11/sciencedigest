"use client";

/**
 * The feed: every published paper as a whole post, readable without a tap
 * (amendment A to step 2D). A card shows the hook, the reading time, the
 * mechanism figure in its first view, the number card with its source line and
 * the grade. It is built from the article's own pieces (./parts), so nothing is
 * drawn twice.
 *
 * A members' read shows its hook and figure only: that is all the public bundle
 * holds of it (PaperMeta.card, written by the content build).
 *
 * No endless scroll: the published papers, twenty at a time.
 */

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { GradeChip } from "@/components/protocol/primitives";
import { freeContent } from "@/lib/content";
import type { PaperMeta } from "@/lib/content/types";
import { Pictured, PullNumber } from "./parts";

export const FEED_PAGE = 20;

export function PostCard({ paper }: { paper: PaperMeta }) {
  const read = paper.accessTier === "free" ? freeContent(paper.slug) : undefined;
  const hook = read ? read.hook.map((sentence) => sentence.text).join(" ") : paper.card?.hook ?? paper.teaser;
  const figure = read ? read.layers?.mechanism.figure ?? read.figure : paper.card?.figure;
  const grade = paper.grades[0];

  return (
    <article data-post={paper.slug}>
      <Link href={`/papers/${paper.slug}`} className="block space-y-4 rounded-3xl border border-line bg-surface p-4">
        <p className="flex items-center justify-between gap-3 text-sm text-muted">
          <span className="min-w-0 truncate">{paper.category}</span>
          <span className="flex shrink-0 items-center gap-2">
            {paper.accessTier === "premium" && (
              <span className="rounded-full border border-accent px-2.5 py-0.5 text-xs font-bold text-accent-text">Members</span>
            )}
            <span className="num">{paper.readMinutes} min read</span>
          </span>
        </p>
        <h2 className="read-title text-[1.625rem]">{hook}</h2>
        <Pictured slug={paper.slug} figure={figure} still />
        {read && <PullNumber fact={read.facts[read.primaryEstimate]} context={read.context} />}
        <p className="flex items-center justify-between gap-3 border-t border-line pt-3 text-sm">
          <span className="min-w-0 leading-snug text-muted">{grade ? grade.outcome : paper.title}</span>
          {grade ? <GradeChip grade={grade.tier} /> : null}
        </p>
        <p className="font-semibold text-accent-text">
          {paper.accessTier === "premium" ? "Open it: the full read is for members" : "Read it"} <span aria-hidden>→</span>
        </p>
      </Link>
    </article>
  );
}

/** `top` is a slot drawn above the posts (the Life Game summary today). */
export function Feed({ papers, top }: { papers: PaperMeta[]; top?: ReactNode }) {
  const [shown, setShown] = useState(FEED_PAGE);
  return (
    <div className="space-y-5">
      {top}
      {papers.slice(0, shown).map((paper) => <PostCard key={paper.id} paper={paper} />)}
      {papers.length > shown && (
        <button type="button" onClick={() => setShown((n) => n + FEED_PAGE)} className="flex h-12 w-full items-center justify-center rounded-xl border border-line font-semibold">
          Show {Math.min(FEED_PAGE, papers.length - shown)} more
        </button>
      )}
    </div>
  );
}
