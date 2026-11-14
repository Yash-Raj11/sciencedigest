"use client";

/**
 * The feed: every published paper as a card that gives the key idea at a glance (owner,
 * 2026-11-14); the details stay in the read. A card, top to bottom:
 *
 *   meta (topic · read time), the question the paper answers as a serif headline with the plain
 *   finding directly beneath it (owner, 2026-11-15), one plain sentence,
 *   the still figure (axis labels only, no numeric ticks or values, the gated range as a peach
 *   band) with its note, "What's inside" (rows that open the read at a slot; the "Try it" row is
 *   the card's focal orange), and the source line with the grade.
 *
 * A members' read shows only what amendment A makes public (widened 2026-11-15): its question,
 * finding headline and one sentence, and one figure (PaperMeta.card), here in its glance view,
 * and lists only the slots everyone can open.
 * The words come from lib/content/glance.ts.
 *
 * No endless scroll: the published papers, twenty at a time.
 */

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { FigureFor } from "@/components/papers/registry";
import { GradeChip } from "@/components/protocol/primitives";
import { AssociationGlance } from "@/components/figures/kinds/AssociationCurve";
import { DecayGlance } from "@/components/figures/kinds/Decay";
import { freeContent } from "@/lib/content";
import { glanceView, insideRows, whyHeading } from "@/lib/content/glance";
import { factSourceLine } from "@/lib/content/source-line";
import type { GlanceView, PaperContent, PaperMeta, ResolvedFact } from "@/lib/content/types";
import type { GroupEdges } from "@/components/figures/association-layout";

export const FEED_PAGE = 20;

const one = (value: ResolvedFact | ResolvedFact[] | undefined) => (Array.isArray(value) ? value[0] : value);
const many = (value: ResolvedFact | ResolvedFact[] | undefined) => (Array.isArray(value) ? value : value ? [value] : []);

/**
 * A free read whose figure is its simulator kind, drawn still. A fact from another study says
 * so under the chart (H7 amended).
 */
function KindGlance({ content, view }: { content: PaperContent; view: GlanceView }) {
  const spec = content.simulator.spec;
  if (!spec) return null;
  const { x, y } = view.axes;
  if (spec.kind === "decay") {
    const halfLife = one(spec.simulator.halfLife) ?? one(spec.facts.halfLife);
    if (!halfLife) return null;
    return (
      <>
        <DecayGlance halfLife={halfLife} alt={view.alt} x={x} y={y} />
        {halfLife.source ? <p className="label mx-3 mt-1" data-glance-source>{factSourceLine(halfLife, content)}</p> : null}
      </>
    );
  }
  if (spec.kind === "association-curve") {
    const groups = content.simulator.params.groups as GroupEdges[] | undefined;
    return groups ? <AssociationGlance adjusted={many(spec.simulator.adjusted)} groups={groups} alt={view.alt} x={x} y={y} /> : null;
  }
  return null;
}

export function PostCard({ paper }: { paper: PaperMeta }) {
  const members = paper.accessTier === "premium";
  const read = members ? undefined : freeContent(paper.slug);
  // A members' read makes public its hook and one figure, nothing else (amendment A).
  const view = read ? glanceView(read) : null;
  const still = paper.card?.figure ?? null;
  const tier = view ? view.tier : paper.grades[0]?.tier ?? null;
  const rows = insideRows({ members, why: read ? whyHeading(read) : null, tryIt: view?.tryIt });
  const href = `/papers/${paper.slug}`;

  return (
    <article data-post={paper.slug} className="rounded-3xl border border-line bg-surface">
      <Link href={href} className="block space-y-3 p-4 pb-3" data-glance-link>
        <p className="label flex items-center justify-between gap-3">
          <span className="min-w-0 truncate">{paper.category} · <span className="num">{paper.readMinutes} min read</span></span>
          {members ? <span className="rounded-full border border-line px-2.5 py-0.5 text-ink">Members</span> : null}
        </p>
        {view ? (
          <hgroup className="space-y-1.5">
            <h2 className="headline" data-glance-question>{view.question}</h2>
            <p className="text-[1.0625rem] font-medium leading-snug text-ink" data-glance-headline>{view.headline}</p>
          </hgroup>
        ) : paper.card ? (
          // A members' read: its question, finding headline and one sentence (amendment A, 2026-11-15).
          <>
            <hgroup className="space-y-1.5">
              <h2 className="headline" data-glance-question>{paper.card.question}</h2>
              <p className="text-[1.0625rem] font-medium leading-snug text-ink" data-glance-headline>{paper.card.finding}</p>
            </hgroup>
            <p className="text-[0.9375rem] leading-relaxed text-muted" data-glance-support>{paper.card.support}</p>
          </>
        ) : <h2 className="headline">{paper.teaser}</h2>}
        {view ? <p className="text-[0.9375rem] leading-relaxed text-muted" data-glance-support>{view.support}</p> : null}
        {view ? (
          <figure className="rounded-2xl bg-bg py-3" data-glance>
            {view.figure
              ? <FigureFor slug={paper.slug} figure={view.figure} glance={view.axes} />
              : read ? <KindGlance content={read} view={view} /> : null}
            <figcaption className="label mx-3 mt-2" data-glance-note>* {view.note}</figcaption>
          </figure>
        ) : still ? (
          <figure className="rounded-2xl bg-bg py-3" data-glance>
            <FigureFor slug={paper.slug} figure={still} glance={{ x: null, y: null }} />
          </figure>
        ) : null}
      </Link>

      <nav aria-label={`What's inside: ${paper.title}`} className="px-4">
        <h3 className="label">What&apos;s inside</h3>
        <ul className="mt-1 divide-y divide-line border-y border-line">
          {rows.map((row) => (
            <li key={row.slot}>
              <Link
                href={`${href}#${row.slot}`} data-inside-row={row.slot}
                {...(row.focal ? { "data-signal-focal": "", "data-signal-item": "" } : {})}
                className={`flex min-h-12 items-center justify-between gap-3 py-2 text-[0.9375rem] ${row.focal ? "font-medium text-signal-evidence-text" : "text-ink"}`}
              >
                <span>{row.label}</span>
                <span aria-hidden>→</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <p className="label flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-4 py-3">
        <span data-source-line>{read?.sourceLine ?? paper.sourceLine}</span>
        {tier ? <GradeChip grade={tier} /> : null}
      </p>
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
        <button type="button" onClick={() => setShown((n) => n + FEED_PAGE)} className="flex h-12 w-full items-center justify-center rounded-xl border border-line font-medium">
          Show {Math.min(FEED_PAGE, papers.length - shown)} more
        </button>
      )}
    </div>
  );
}
