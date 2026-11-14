"use client";

/**
 * The pieces a read is made of, shared by the article page and the feed card,
 * so a figure or a number card is drawn by one piece of code wherever it shows.
 *
 *   Para        one paragraph; a dot after a sourced sentence opens its passage
 *   Pictured    a figure with its caption
 *   PullNumber  the key gated number, its absolute form and its source line
 *   Glossary    underlines the words that have a plain-language entry
 */

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { FigureFor } from "@/components/papers/registry";
import { GradeChip } from "@/components/protocol/primitives";
import { Sheet } from "@/components/shell/Sheet";
import { BACKGROUND, conceptReference, factSourceLine } from "@/lib/content/source-line";
import type { FigureRef, GlossaryEntry, PaperContent, ResolvedFact, Sentence } from "@/lib/content/types";
import { formatEstimate } from "@/lib/pipeline/format";

export type Facts = Record<string, ResolvedFact>;
export type Context = PaperContent["context"];

const GlossaryContext = createContext<{ pattern: RegExp; open: (word: string) => void } | null>(null);

const escaped = (term: string) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Inside this, every Para underlines the glossary's words. Tapping one opens a
 * sheet with the plain text, the picture to hold in mind (for a background
 * concept) and the line saying where the wording comes from.
 */
export function Glossary({ content, children }: { content: Pick<PaperContent, "glossary" | "facts" | "context">; children: ReactNode }) {
  const [word, setWord] = useState<string | null>(null);
  const entries = useMemo(() => content.glossary ?? [], [content.glossary]);
  const value = useMemo(() => {
    if (entries.length === 0) return null;
    const terms = entries.map((e) => escaped(e.term)).sort((a, b) => b.length - a.length);
    return { pattern: new RegExp(`(?<![\\p{L}\\p{N}])(${terms.join("|")})(?![\\p{L}\\p{N}])`, "giu"), open: setWord };
  }, [entries]);
  const entry: GlossaryEntry | undefined = word === null ? undefined : entries.find((e) => e.term.toLowerCase() === word.toLowerCase());
  const concept = entry?.concept ? content.context?.concepts.find((c) => c.slug === entry.concept) : undefined;
  const sources = entry ? entry.refs.map((id) => content.facts[id]).filter(Boolean) : [];

  return (
    <GlossaryContext.Provider value={value}>
      {children}
      <Sheet open={entry !== undefined} onClose={() => setWord(null)} title={entry?.term ?? ""}>
        {entry && (
          <div className="space-y-3" data-glossary-entry>
            <p className="read">{entry.plain}</p>
            {concept && (
              <>
                <p className="rounded-xl bg-surface px-3.5 py-3 text-[0.9375rem] leading-relaxed"><span className="block text-xs font-medium text-muted">The picture to hold in mind</span>{concept.model}</p>
                <p className="text-xs font-medium text-muted">{BACKGROUND}, not from this paper</p>
                <p className="text-xs leading-snug text-muted">{conceptReference(concept)}</p>
              </>
            )}
            {sources.map((fact) => (
              <div key={fact.id} data-passage className="rounded-lg border border-line bg-raised px-3.5 py-3">
                <p className="text-xs font-medium text-muted">{factSourceLine(fact, content)}, word for word</p>
                <p className="mt-0.5 font-serif text-[0.9375rem] italic leading-snug text-muted">&ldquo;{fact.quote}&rdquo;</p>
              </div>
            ))}
          </div>
        )}
      </Sheet>
    </GlossaryContext.Provider>
  );
}

/** Text with its glossary words turned into buttons (inside <Glossary> only). */
function Words({ text }: { text: string }) {
  const glossary = useContext(GlossaryContext);
  if (!glossary) return <>{text}</>;
  // split() with one capturing group: the odd places are the words that matched.
  const parts = text.split(glossary.pattern);
  return (
    <>
      {parts.map((part, i) => (i % 2 === 1
        ? <button key={i} type="button" className="term" onClick={() => glossary.open(part)} aria-label={`${part}: what it means`}>{part}</button>
        : part))}
    </>
  );
}

/**
 * One paragraph. Sentences that rest on a source carry a dot; tap it to see the
 * passage, with a line saying whether it is from the paper or from another study.
 * `plain` leaves the dots out: the feed card is one link, and holds no buttons.
 */
export function Para({ sentences, facts, context, className = "read", as: Tag = "p", plain = false }: {
  sentences: Sentence[]; facts: Facts; context?: Context; className?: string; as?: "p" | "h2"; plain?: boolean;
}) {
  const [open, setOpen] = useState<number | null>(null);
  if (plain) return <Tag className={className}>{sentences.map((s) => s.text).join(" ")}</Tag>;

  const shown = open === null ? [] : sentences[open].refs.map((id) => facts[id]).filter(Boolean);
  // A sentence may also rest on a background concept, cited as "concept:<slug>".
  const background = open === null ? [] : sentences[open].refs
    .filter((id) => id.startsWith("concept:"))
    .map((id) => context?.concepts.find((c) => c.slug === id.slice(8)))
    .filter((c) => c !== undefined);

  return (
    <div>
      <Tag className={className}>
        {sentences.map((sentence, i) => {
          if (sentence.refs.length === 0) return <span key={i}><Words text={sentence.text} /> </span>;
          // The dot stays glued to the sentence's last word, so it never starts a line alone.
          const cut = sentence.text.lastIndexOf(" ") + 1;
          return (
            <span key={i}>
              <Words text={sentence.text.slice(0, cut)} />
              <span className="whitespace-nowrap">
                <Words text={sentence.text.slice(cut)} />
                <button
                  type="button"
                  onClick={() => setOpen((v) => (v === i ? null : i))}
                  aria-expanded={open === i}
                  aria-label="Show the passage in the paper this sentence rests on"
                  className="relative ml-0.5 inline-flex h-6 w-6 translate-y-[3px] items-center justify-center rounded-full align-baseline after:absolute after:-inset-2.5 after:content-['']"
                >
                  <span aria-hidden className={`h-2.5 w-2.5 rounded-full border-[1.5px] border-meta ${open === i ? "bg-ink border-ink" : ""}`} />
                </button>
              </span>{" "}
            </span>
          );
        })}
      </Tag>
      {shown.length + background.length > 0 && (
        <aside data-shown className="ui-reveal mt-2 space-y-3 rounded-lg border border-line bg-raised px-3.5 py-3">
          {background.map((concept) => (
            <div key={concept.slug}>
              <p className="text-xs font-medium text-muted">{BACKGROUND}, not from this paper</p>
              <p className="mt-1 text-sm font-medium leading-snug">{concept.term}</p>
              <p className="mt-0.5 text-[0.9375rem] leading-snug text-muted">{concept.plain}</p>
              <p className="mt-1 text-xs leading-snug text-muted">{conceptReference(concept)}</p>
            </div>
          ))}
          {shown.map((fact) => (
            <div key={fact.id}>
              <p className="text-xs font-medium text-muted">{factSourceLine(fact, { context })}, word for word</p>
              <p className="mt-1 text-sm font-medium leading-snug">{fact.label}</p>
              <p className="mt-0.5 font-serif text-[0.9375rem] italic leading-snug text-muted">&ldquo;{fact.quote}&rdquo;</p>
              {fact.estimate && (
                <p className="mt-1.5">
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

/**
 * A figure, edge to edge in its column, with its caption under it. `still`
 * draws an interactive figure in its first view and leaves the caption out
 * (the feed card).
 */
export function Pictured({ slug, figure, facts, context, still = false }: {
  slug: string; figure: FigureRef | null | undefined; facts?: Facts; context?: Context; still?: boolean;
}) {
  if (!figure) return null;
  return (
    <figure className="rounded-2xl border border-line bg-bg py-3">
      <FigureFor slug={slug} figure={figure} interactive={!still} />
      {!still && facts && (
        <figcaption className="mx-3 mt-2 border-t border-line pt-2">
          <Para sentences={figure.caption} facts={facts} context={context} className="text-sm leading-snug text-muted" />
        </figcaption>
      )}
    </figure>
  );
}

const sentenceCase = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/**
 * The one number to take away: the headline result, in its absolute form when
 * the paper gives a size, with the line saying where it comes from. When the
 * paper gives no size (a finding), the card says what was found instead of
 * inventing a figure.
 */
export function PullNumber({ fact, context }: { fact: ResolvedFact | undefined; context?: Context }) {
  if (!fact) return null;
  const e = fact.estimate;
  const tier = e?.tier ?? fact.finding?.tier;
  return (
    <aside aria-label="The key number" data-pull-number className="rounded-2xl border-2 border-line bg-surface p-4">
      {e ? (
        <>
          <p className="headline leading-none">{formatEstimate({ ...e, ciLow: null, ciHigh: null })}</p>
          <p className="mt-2 font-medium leading-snug">{e.outcome}</p>
          <p className="num mt-1 text-sm leading-snug text-muted">
            {e.absolute ? "An absolute difference" : "A relative figure"}
            {e.ciLow !== null && e.ciHigh !== null ? <>: {formatEstimate(e)}</> : null}.
          </p>
        </>
      ) : (
        <>
          <p className="headline">{sentenceCase(fact.label)}.</p>
          {fact.finding && <p className="mt-2 text-sm font-medium leading-snug text-muted">{fact.finding.outcome}</p>}
        </>
      )}
      <p className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-line pt-2 text-xs font-medium text-muted">
        <span data-source-line>{factSourceLine(fact, { context })}</span>
        {tier ? <GradeChip grade={tier} /> : null}
      </p>
    </aside>
  );
}
