"use client";

/**
 * The five-minute read for one paper, in the order of step 2D:
 *
 *   1. the hook, with the reading time
 *   2. why it happens: short paragraphs, the figure after the first, glossary
 *      words underlined (tap one for its plain meaning)
 *   3. one number card: the headline result and where it comes from
 *   4. what was tested, who it was tested in, the simulator, then the protocol
 *   5. the receipts, always visible: design, n, the raw effect, the weak end of
 *      the range and the limitation in bold; "Full receipts" holds the rest
 *   6. members' extras
 *
 * Free reads are bundled with the app and render straight away. A members'
 * read is fetched after the page loads, and the server decides whether this
 * viewer may have it (lib/content/gated.ts).
 */

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { SimulatorFor, WidgetFor } from "@/components/papers/registry";
import { GradeChip, Notice } from "@/components/protocol/primitives";
import { DESIGN_LABEL, freeContent } from "@/lib/content";
import { RANDOMIZED_DESIGNS, type Design } from "@/lib/pipeline/grade";
import { loadRead, type Gated } from "@/lib/content/gated";
import { contextSourceList } from "@/lib/content/source-line";
import type { PaperContent, PaperMeta, Sentence } from "@/lib/content/types";
import { useStore } from "@/lib/store";
import { isDemo } from "@/lib/supabase/client";
import { KindSimulator } from "./KindSimulator";
import { MemberExtras } from "./MemberExtras";
import { Glossary, Para, Pictured, PullNumber, type Context, type Facts } from "./parts";

const LAYER = "read-title text-[1.625rem]";
const AUDIT = "text-base leading-relaxed";

/** Paragraphs with the layer's figure after the first one. */
function Paragraphs({ slug, paragraphs, figure, facts, context }: { slug: string; paragraphs: Sentence[][]; figure?: PaperContent["figure"] | null; facts: Facts; context?: Context }) {
  return (
    <>
      {paragraphs.map((paragraph, i) => (
        <div key={i} className="space-y-4">
          <Para sentences={paragraph} facts={facts} context={context} />
          {i === 0 ? <Pictured slug={slug} figure={figure} facts={facts} context={context} /> : null}
        </div>
      ))}
    </>
  );
}

/** H3: who the result describes, and what kind of claim the design allows. */
function WhoWasTested({ paper, content }: { paper: PaperMeta; content: PaperContent }) {
  const observational = !RANDOMIZED_DESIGNS.has(paper.design as Design);
  return (
    <section aria-label="Who was studied" className="rounded-2xl border-2 border-ink p-4">
      <h3 className="display text-xl">Who this was tested in</h3>
      <div className="mt-2">
        <Para sentences={content.populationPanel} facts={content.facts} context={content.context} className={AUDIT} />
      </div>
      <p className="mt-2 text-sm leading-snug text-muted">
        {observational
          ? "This study watched people; it did not assign them to anything. It can show that two things go together, not that one causes the other."
          : "The result holds for people like these. Nobody outside that group was tested."}
      </p>
    </section>
  );
}

/** Everything above the protocol widget: hook, mechanism, number, what was tested, simulator. */
function ReadTop({ paper, content }: { paper: PaperMeta; content: PaperContent }) {
  const { facts, context, layers } = content;
  const hasGlossary = (content.glossary ?? []).length > 0;
  // An old-shape read (until step 2E): its first section stands where the mechanism will.
  const [first, ...rest] = content.sections;

  return (
    <Glossary content={content}>
      <div>
        <Para as="h2" sentences={content.hook} facts={facts} context={context} className="read-title text-[1.875rem]" />
        <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
          <span className="num font-semibold" data-read-minutes>{paper.readMinutes} min read</span>
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-full border-2 border-accent" />
            Tap a dot for the passage in the paper{hasGlossary ? "; tap an underlined word for what it means" : ""}.
          </span>
        </p>
      </div>

      {layers ? (
        <section aria-label="Why it happens" className="space-y-4">
          <h2 className={LAYER}>Why it happens</h2>
          <Paragraphs slug={paper.slug} paragraphs={layers.mechanism.paragraphs} figure={layers.mechanism.figure} facts={facts} context={context} />
        </section>
      ) : first ? (
        <section aria-label={first.heading} className="space-y-4">
          <h2 className={LAYER}>{first.heading}</h2>
          <Paragraphs slug={paper.slug} paragraphs={first.paragraphs} figure={content.figure} facts={facts} context={context} />
        </section>
      ) : null}

      <PullNumber fact={facts[content.primaryEstimate]} context={context} />

      {rest.map((section) => (
        <section key={section.id} aria-label={section.heading} className="space-y-4">
          <h2 className={LAYER}>{section.heading}</h2>
          <Paragraphs slug={paper.slug} paragraphs={section.paragraphs} facts={facts} context={context} />
        </section>
      ))}

      <section aria-label="What was tested" className="space-y-4">
        {layers ? (
          <>
            <h2 className={LAYER}>What was tested</h2>
            <Paragraphs slug={paper.slug} paragraphs={layers.protocol.paragraphs} figure={layers.protocol.figure} facts={facts} context={context} />
          </>
        ) : null}
        <WhoWasTested paper={paper} content={content} />
      </section>

      <section aria-label="Simulator" className="space-y-3">
        <h2 className="display text-2xl">Try it</h2>
        {content.simulator.spec
          ? <KindSimulator content={content} />
          : <SimulatorFor kind={content.simulator.kind} params={content.simulator.params} />}
      </section>
    </Glossary>
  );
}

function Receipt({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-muted">{title}</h3>
      {children}
    </div>
  );
}

/** How to read the numbers. Lives inside "Full receipts". */
function Primer() {
  return (
    <dl className="space-y-3 border-t border-line pt-3 text-[0.9375rem] leading-relaxed">
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
  );
}

/**
 * The receipts (H10's audit layer). Design, sample size, the raw effect, the
 * weak end of the range and the limitations are on the page without a tap, the
 * limitations in bold (H6). The expander holds the rest.
 */
function Receipts({ paper, content }: { paper: PaperMeta; content: PaperContent }) {
  const { facts, context } = content;
  const audit = content.layers?.audit;
  const limitations = audit ? audit.limitations : content.limitations;
  const sources = contextSourceList(content);

  return (
    <section aria-label="The receipts" className="space-y-4 rounded-2xl border border-accent bg-accent-soft p-4">
      <h2 className="display text-xl">The receipts</h2>
      <dl className="grid grid-cols-2 gap-3 text-sm leading-snug">
        <div>
          <dt className="font-semibold text-muted">Design</dt>
          <dd className="font-semibold">{DESIGN_LABEL[paper.design] ?? paper.design}</dd>
        </div>
        {paper.sampleSize !== null && (
          <div>
            <dt className="font-semibold text-muted">Participants</dt>
            <dd className="num font-semibold">{paper.sampleSize.toLocaleString("en")}</dd>
          </div>
        )}
      </dl>
      {audit && (
        <>
          <Receipt title="The size of the effect">
            <Para sentences={audit.effect} facts={facts} context={context} className={AUDIT} />
            <div className="mt-3"><Pictured slug={paper.slug} figure={audit.figure} facts={facts} context={context} /></div>
          </Receipt>
          <Receipt title="How weak it could be">
            <Para sentences={audit.weakEnd} facts={facts} context={context} className={AUDIT} />
          </Receipt>
        </>
      )}
      <Receipt title="What to hold loosely">
        <ul className="mt-1 space-y-3">
          {limitations.map((limitation, i) => (
            <li key={i} className="flex gap-3">
              <span aria-hidden className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-ink" />
              <div className="min-w-0 flex-1"><Para sentences={limitation} facts={facts} context={context} className={`${AUDIT} font-bold`} /></div>
            </li>
          ))}
        </ul>
      </Receipt>
      <details className="border-t border-accent pt-3">
        <summary className="flex min-h-11 cursor-pointer items-center font-semibold">Full receipts</summary>
        <div className="ui-reveal mt-2 space-y-4">
          {audit && (
            <Receipt title="What summaries leave out">
              <Para sentences={audit.missed} facts={facts} context={context} className={AUDIT} />
            </Receipt>
          )}
          {audit?.more.map((paragraph, i) => <Para key={i} sentences={paragraph} facts={facts} context={context} className={AUDIT} />)}
          {sources.length > 0 && (
            <Receipt title="Other sources this read uses">
              {sources.map((source) => (
                <p key={source.id} className="mt-1 text-sm leading-snug text-muted">
                  <span className="font-semibold">{source.label}.</span> {source.citation} ({source.id}){source.grade ? `, ${source.grade.toLowerCase()}` : ""}
                </p>
              ))}
            </Receipt>
          )}
          <Primer />
        </div>
      </details>
    </section>
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
    <article className="space-y-7">
      <header className="pt-2">
        <Link href="/" className="text-sm font-semibold text-muted underline underline-offset-4">All reads</Link>
        <p className="mt-4 flex items-center justify-between gap-3 text-sm text-muted">
          <span>{paper.category}, {(DESIGN_LABEL[paper.design] ?? paper.design).toLowerCase()}</span>
        </p>
        <h1 className="mt-2 text-[1.0625rem] font-semibold leading-snug text-muted">{paper.title}</h1>
        <dl className="mt-4 space-y-1.5">
          {paper.grades.map((g) => (
            <div key={g.outcome} className="flex items-center justify-between gap-3 border-t border-line pt-1.5">
              <dt className="min-w-0 text-sm leading-snug">{g.outcome}</dt>
              <dd><GradeChip grade={g.tier} /></dd>
            </div>
          ))}
        </dl>
      </header>

      {read?.state === "ok" && <ReadTop paper={paper} content={read.value} />}

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

      {read?.state === "ok" && <Receipts paper={paper} content={read.value} />}

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
