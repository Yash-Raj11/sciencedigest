"use client";

/**
 * The five-minute read for one paper: hook, who was studied, the sections,
 * what to hold loosely, then the simulator and the protocol widget.
 *
 * Free reads are bundled with the app and render straight away. A members'
 * read is fetched after the page loads, and the server decides whether this
 * viewer may have it (lib/content/gated.ts).
 */

import Link from "next/link";
import { useEffect, useState } from "react";
import { SimulatorFor, WidgetFor } from "@/components/papers/registry";
import { GradeChip, Notice } from "@/components/protocol/primitives";
import { DESIGN_LABEL, freeContent } from "@/lib/content";
import { loadRead, type Gated } from "@/lib/content/gated";
import { factSourceLine } from "@/lib/content/source-line";
import type { PaperContent, PaperMeta, ResolvedFact, Sentence } from "@/lib/content/types";
import { formatEstimate } from "@/lib/pipeline/format";
import { useStore } from "@/lib/store";
import { isDemo } from "@/lib/supabase/client";
import { MemberExtras } from "./MemberExtras";

type Facts = Record<string, ResolvedFact>;
type Context = PaperContent["context"];

/**
 * One paragraph. Sentences that rest on a source carry a dot; tap it to see the
 * passage, with a line saying whether it is from the paper or from another study.
 */
function Para({ sentences, facts, context, className = "read" }: { sentences: Sentence[]; facts: Facts; context?: Context; className?: string }) {
  const [open, setOpen] = useState<number | null>(null);
  const shown = open === null ? [] : sentences[open].refs.map((id) => facts[id]).filter(Boolean);

  return (
    <div>
      <p className={className}>
        {sentences.map((sentence, i) => {
          if (sentence.refs.length === 0) return <span key={i}>{sentence.text} </span>;
          // The dot stays glued to the sentence's last word, so it never starts a line alone.
          const cut = sentence.text.lastIndexOf(" ") + 1;
          return (
            <span key={i}>
              {sentence.text.slice(0, cut)}
              <span className="whitespace-nowrap">
                {sentence.text.slice(cut)}
                <button
                  type="button"
                  onClick={() => setOpen((v) => (v === i ? null : i))}
                  aria-expanded={open === i}
                  aria-label="Show the passage in the paper this sentence rests on"
                  className="ml-0.5 inline-flex h-6 w-6 translate-y-[3px] items-center justify-center rounded-full align-baseline"
                >
                  <span aria-hidden className={`h-2.5 w-2.5 rounded-full border-2 border-accent ${open === i ? "bg-accent" : ""}`} />
                </button>
              </span>{" "}
            </span>
          );
        })}
      </p>
      {shown.length > 0 && (
        <aside className="mt-2 space-y-3 rounded-lg border-l-4 border-accent bg-surface px-3.5 py-3">
          {shown.map((fact) => (
            <div key={fact.id}>
              <p className="text-xs font-semibold text-muted">{factSourceLine(fact, { context })}, word for word</p>
              <p className="mt-1 text-sm font-semibold leading-snug">{fact.label}</p>
              <p className="mt-0.5 font-serif text-[0.9375rem] italic leading-snug text-muted">&ldquo;{fact.quote}&rdquo;</p>
              {fact.estimate && (
                <p className="num mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                  <span>{formatEstimate(fact.estimate)}</span>
                  <GradeChip grade={fact.estimate.tier} />
                </p>
              )}
            </div>
          ))}
        </aside>
      )}
    </div>
  );
}

function ReadBody({ paper, content }: { paper: PaperMeta; content: PaperContent }) {
  const { facts } = content;
  const observational = !["rct", "meta_analysis_rct"].includes(paper.design);

  return (
    <>
      <Para sentences={content.hook} facts={facts} context={content.context} className="read text-[1.3125rem] leading-[1.45]" />

      <p className="flex items-center gap-2 text-sm text-muted">
        <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-full border-2 border-accent" />
        Tap a dot to see the exact passage in the paper.
      </p>

      <section aria-label="Who was studied" className="rounded-2xl border-2 border-ink p-4">
        <h2 className="display text-xl">Who this describes</h2>
        <div className="mt-2">
          <Para sentences={content.populationPanel} facts={facts} context={content.context} className="text-base leading-relaxed" />
        </div>
        <p className="mt-2 text-sm leading-snug text-muted">
          {observational
            ? "This study watched people; it did not assign them to anything. It can show that two things go together, not that one causes the other."
            : "The result holds for people like these. Nobody outside that group was tested."}
        </p>
      </section>

      {content.sections.map((section) => (
        <section key={section.id} aria-label={section.heading} className="space-y-3">
          <h2 className="read-title text-[1.625rem]">{section.heading}</h2>
          {section.paragraphs.map((paragraph, i) => <Para key={i} sentences={paragraph} facts={facts} context={content.context} />)}
        </section>
      ))}

      <section aria-label="Limitations" className="rounded-2xl border border-accent bg-accent-soft p-4">
        <h2 className="display text-xl">What to hold loosely</h2>
        <p className="mt-1 text-sm leading-snug text-muted">One study never settles a question. These are the weak points of this one.</p>
        <ul className="mt-3 space-y-3">
          {content.limitations.map((limitation, i) => (
            <li key={i} className="flex gap-3">
              <span aria-hidden className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-ink" />
              <div className="min-w-0 flex-1"><Para sentences={limitation} facts={facts} context={content.context} className="text-base leading-relaxed" /></div>
            </li>
          ))}
        </ul>
      </section>

      <details className="rounded-2xl border border-line p-4">
        <summary className="cursor-pointer font-semibold">New to reading studies? Three terms</summary>
        <dl className="mt-3 space-y-3 text-[0.9375rem] leading-relaxed">
          <div>
            <dt className="font-semibold">95% CI (confidence interval)</dt>
            <dd className="text-muted">The range the true average plausibly sits in. A range that includes zero means the study cannot tell an effect from no effect.</dd>
          </div>
          <div>
            <dt className="font-semibold">Certainty: high, moderate, low</dt>
            <dd className="text-muted">How far a result can be trusted, judged from how the study was done. It is about trust, not size: a high-certainty effect can still be tiny.</dd>
          </div>
          <div>
            <dt className="font-semibold">Points</dt>
            <dd className="text-muted">Percentage points: the plain gap between two percentages. Going from 20% to 15% is 5 points.</dd>
          </div>
        </dl>
      </details>

      <section aria-label="Simulator" className="space-y-3">
        <h2 className="display text-2xl">Try it</h2>
        <SimulatorFor kind={content.simulator.kind} params={content.simulator.params} />
      </section>
    </>
  );
}

export function Article({ paper }: { paper: PaperMeta }) {
  const free = paper.accessTier === "free";
  const hydrated = useStore((s) => s.hydrated);
  const tier = useStore((s) => (isDemo ? s.demoTier : s.session.tier));
  const userId = useStore((s) => s.session.userId);
  const [fetched, setFetched] = useState<Gated<PaperContent> | null>(null);

  useEffect(() => {
    if (free || !hydrated) return;
    let cancelled = false;
    void loadRead(paper, tier).then((result) => { if (!cancelled) setFetched(result); });
    return () => { cancelled = true; };
  }, [free, hydrated, paper, tier, userId]);

  const bundled = free ? freeContent(paper.slug) : undefined;
  const read: Gated<PaperContent> | null = bundled ? { state: "ok", value: bundled } : fetched;

  return (
    <article className="space-y-6">
      <header className="pt-2">
        <Link href="/library" className="text-sm font-semibold text-muted underline underline-offset-4">Library</Link>
        <p className="mt-4 flex items-center justify-between gap-3 text-sm text-muted">
          <span>{paper.category}, {(DESIGN_LABEL[paper.design] ?? paper.design).toLowerCase()}</span>
          <span className="num shrink-0">{paper.readMinutes} min read</span>
        </p>
        <h1 className="read-title mt-2 text-[2.125rem]">{paper.title}</h1>
        <dl className="mt-4 space-y-1.5">
          {paper.grades.map((g) => (
            <div key={g.outcome} className="flex items-center justify-between gap-3 border-t border-line pt-1.5">
              <dt className="min-w-0 text-sm leading-snug">{g.outcome}</dt>
              <dd><GradeChip grade={g.tier} /></dd>
            </div>
          ))}
        </dl>
      </header>

      {read?.state === "ok" && <ReadBody paper={paper} content={read.value} />}

      {read === null && (
        <div aria-busy className="space-y-3">
          <p className="read text-muted">{paper.teaser}</p>
          <div className="h-40 rounded-2xl bg-surface" />
        </div>
      )}

      {read?.state === "locked" && (
        <>
          <p className="read">{paper.teaser}</p>
          <Notice tone="warn">
            <strong>This read is for members.</strong> The summary above and the protocol below are open to everyone; the full read, its simulator and the implementation notes come with membership.
            <Link href="/upgrade" className="mt-3 flex h-11 items-center justify-center rounded-lg bg-accent font-bold text-accent-ink">See what membership adds</Link>
          </Notice>
        </>
      )}

      {read?.state === "error" && (
        <Notice tone="warn">
          <strong>The read did not load.</strong> {read.message}. Check your connection and open the page again.
        </Notice>
      )}

      <section aria-label="Protocol" className="space-y-3">
        <h2 className="display text-2xl">Put it in your Life Game</h2>
        <WidgetFor slug={paper.slug} variant="article" />
      </section>

      <MemberExtras paper={paper} />

      <footer className="space-y-2 border-t border-line pt-4 text-sm leading-snug text-muted">
        <p>{paper.citation}</p>
        <p>
          <a href={`https://doi.org/${paper.doi}`} target="_blank" rel="noreferrer" className="font-semibold text-accent-text underline underline-offset-4">
            Read the original paper
          </a>
          {paper.pmcid && (
            <>
              {" or the "}
              <a href={`https://pmc.ncbi.nlm.nih.gov/articles/${paper.pmcid}/`} target="_blank" rel="noreferrer" className="font-semibold text-accent-text underline underline-offset-4">
                free full text
              </a>
            </>
          )}
          .
        </p>
        <p>
          The paper is published under a {paper.license.replace("-", " ")} licence. Passages in quotation marks are the authors&apos; words; the rest is our summary of them. This is not medical advice.
        </p>
      </footer>
    </article>
  );
}
