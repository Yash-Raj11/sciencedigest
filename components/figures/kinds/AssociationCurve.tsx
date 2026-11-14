"use client";

/**
 * The "association-curve" kind, drawn as FIGURE-DESIGN 3B, "100 people, ten years on"
 * (owner, 2026-11-15).
 *
 *   mode "card"  the still view (the feed card, R7): the first two groups as dot grids, each
 *                with its exact printed share, and the raw-counts line. No input, nothing that
 *                depends on the reader.
 *   mode "full"  the read: the reader's own week on top, then every group as a week strip and a
 *                dot grid (monochrome: the raw gap is partly age and health, R4), the adjusted
 *                differences as an interval strip (the one pastel zone), the authors' plateau as
 *                a dashed bracket, and the reader's group in words, then who was studied (H3).
 *
 * Design note. Poking it teaches what a still picture cannot: which group of the study the
 * reader would have been counted in, and that its numbers belong to that group, not to the
 * reader (no "your risk", no dot marked "you"). An observational study, so nothing points from
 * one group to another: no arrow, no line joining start to end. Every value is printed in the
 * paper; nothing is interpolated. State starts empty and holds only the days the reader ticks;
 * no timers, no motion.
 */

import { useState, type ReactNode } from "react";
import {
  CARD_GROUPS, GRID_FRAME, NO_ANSWER, WEEK_DAYS, cardSlice, emptyWeek, figureN, gridColumns, gridFigureHeight,
  gridResult, groupLabel, groupOfAdjusted, isComparison, stripLabel, weekGroup, type Cited, type GridWords, type GroupEdges,
} from "../association-layout";
import { Figure } from "../Figure";
import { perWords, startWords } from "../frequency-layout";
import { FrequencyGrid, IntervalPlot, Label, WeekStrip, intervalPlotHeight } from "../primitives";
import { DASH, INK, META, MUTED } from "../shared";
import { assertEvidence } from "@/lib/content/figures";
import type { ResolvedFact } from "@/lib/content/types";

type Group = GroupEdges & { died?: Cited; total?: Cited };

/** The dot key, named once: a filled dot and a hollow dot. */
function DotKey({ x, y, words, size }: { x: number; y: number; words: GridWords; size: number }) {
  return (
    <g data-dot-key>
      <circle cx={x + size * 0.4} cy={y - size * 0.35} r={size * 0.32} fill={INK} />
      <Label x={x + size * 1.1} y={y} tone="muted" size={size}>{words.kept}</Label>
      <circle cx={x + size * 0.4 + words.kept.length * size * 0.5 + size * 1.8} cy={y - size * 0.35} r={size * 0.28} fill="none" stroke={META} strokeWidth={1.1} />
      <Label x={x + words.kept.length * size * 0.5 + size * 2.9} y={y} tone="muted" size={size}>{words.happened}</Label>
    </g>
  );
}

export type { GridWords };

export function AssociationCurve({ mode, raw, adjusted, groups, alt, sourceLine, ask, headline, who, observational, words, notes, plateau, axis, unit = "days" }: {
  mode: "card" | "full"; raw: ResolvedFact[]; adjusted: ResolvedFact[]; groups: Group[]; alt: string; sourceLine: string;
  /** The question over the reader's week, as the read wrote it. */
  ask?: ReactNode;
  /** The figure's takeaway headline. */
  headline?: ReactNode;
  /** Who was studied: shown straight under the result (H3). */
  who?: ReactNode;
  observational: boolean;
  words: GridWords;
  /** The read's own lines under the chart: the raw-counts line, the strip's title, under the strip. */
  notes?: { raw?: ReactNode; stripTitle?: ReactNode; stripUnder?: ReactNode };
  /** The authors' plateau statement (drawn dashed: proposed, not measured). */
  plateau?: { fact: ResolvedFact; words: ReactNode; label: string };
  /** The card's one axis label, in words (the glance view): over the group titles. */
  axis?: string | null;
  unit?: string;
}) {
  const [week, setWeek] = useState<boolean[] | null>(null);
  const n = figureN(raw);
  if (n === null || raw.length !== groups.length) return null;
  for (const fact of [...raw, ...adjusted]) assertEvidence("measured", fact);
  if (plateau) assertEvidence("proposed", plateau.fact);

  const at = mode === "full" ? weekGroup(groups, week) : NO_ANSWER;
  const answered = at !== NO_ANSWER;
  const shown = mode === "full" ? groups : cardSlice(groups);
  const columns = gridColumns(shown.length, mode);
  const f = mode === "full" ? GRID_FRAME.full : GRID_FRAME.card;
  const { size, small } = GRID_FRAME;
  const gridBottom = f.grid + f.col;
  const result = answered ? gridResult(groups, raw, adjusted, at, words) : null;

  return (
    <div data-figure-kind="association-curve" data-mode={mode} data-picked-group={answered ? at : undefined}>
      {headline ? <div data-headline>{headline}</div> : null}

      {mode === "full" ? (
        <fieldset className="mt-4" data-simulator>
          <legend className="sr-only">{typeof ask === "string" ? ask : "Your week"}</legend>
          {ask ? <div aria-hidden className="font-medium leading-snug">{ask}</div> : null}
          <p className="label mt-2">Your week: tap the days</p>
          <div className="mt-1.5 grid grid-cols-7 gap-1.5" data-your-week>
            {WEEK_DAYS.map((day, i) => {
              const on = week?.[i] ?? false;
              return (
                <button
                  key={day} type="button" aria-pressed={on}
                  onClick={() => setWeek((w) => (w ?? emptyWeek()).map((v, j) => (j === i ? !v : v)))}
                  className={`flex h-12 min-w-0 items-center justify-center rounded-lg border text-sm font-medium ${on ? "border-ink bg-ink text-bg" : "border-line bg-bg text-ink"}`}
                >
                  {day}
                </button>
              );
            })}
          </div>
          <button type="button" onClick={() => setWeek(emptyWeek())} aria-pressed={answered && isComparison(at)}
            className={`mt-2 min-h-11 rounded-lg border px-3 text-sm font-medium ${answered && isComparison(at) ? "border-ink text-ink" : "border-line text-muted"}`}>
            No days
          </button>
        </fieldset>
      ) : null}

      <div className="mt-3">
        <Figure title={alt} desc={alt} height={gridFigureHeight(n, mode)}>
          {mode === "card" && axis ? <Label x={GRID_FRAME.card.left} y={GRID_FRAME.card.axis} tone="muted" size={small}>{axis}</Label> : null}
          {mode === "full" ? (
            <>
              <Label x={f.left} y={GRID_FRAME.full.start} tone="muted" size={small}>{startWords(n)}</Label>
              <Label x={f.left} y={GRID_FRAME.full.later} tone="muted" size={small}>{words.later}</Label>
            </>
          ) : null}
          {shown.map((group, i) => {
            const c = columns[i];
            const mine = answered && at === i;
            const tone = !answered || mine ? "ink" : "dim";
            const rate = raw[i].estimate!.point;
            return (
              <g key={raw[i].id} data-group={i} data-picked={mine ? "" : undefined}>
                <Label x={c.mid} y={f.title} anchor="middle" size={size} bold tone={tone === "ink" ? "ink" : "muted"}>{groupLabel(group, unit)}</Label>
                <WeekStrip x={c.x} y={f.strip} width={c.width} from={group.from.n} to={group.to.n} tone={tone} />
                <FrequencyGrid x={c.x} y={f.grid} size={c.width} n={n} fact={raw[i]} tone={tone} />
                <Label x={c.mid} y={gridBottom + size * 1.4} anchor="middle" size={small} tone={tone === "ink" ? "ink" : "muted"}>{perWords(rate, n, words.event)}</Label>
                {mine ? <Label x={c.mid} y={gridBottom + size * 2.7} anchor="middle" size={small} bold>your group</Label> : null}
              </g>
            );
          })}
          {mode === "full" && plateau ? (
            <g data-evidence="proposed" data-fact={plateau.fact.id}>
              <path d={`M ${columns[columns.length - 1].x} ${GRID_FRAME.full.bracket + 5} V ${GRID_FRAME.full.bracket} H ${columns[columns.length - 1].x + columns[columns.length - 1].width} V ${GRID_FRAME.full.bracket + 5}`}
                fill="none" stroke={MUTED} strokeWidth={1.5} strokeDasharray={DASH} />
              <Label x={columns[columns.length - 1].x + columns[columns.length - 1].width - 2} y={GRID_FRAME.full.bracket - 6} anchor="end" tone="muted" size={small - 1}>{plateau.label}</Label>
            </g>
          ) : null}
          <DotKey x={f.left} y={gridBottom + size * (mode === "full" ? 3.9 : 2.9)} words={words} size={small} />
        </Figure>
      </div>

      {notes?.raw ? <div className="mx-1 mt-1" data-raw-note>{notes.raw}</div> : null}

      {mode === "full" ? (
        <>
          {plateau ? <div className="mx-1 mt-1 flex gap-2" data-plateau><span aria-hidden className="mt-2.5 h-0 w-5 shrink-0 border-t-[1.5px] border-dashed border-muted" />{plateau.words}</div> : null}

          <section className="mt-4 border-t border-line pt-3" aria-label="After the study's adjustments" data-adjusted-strip>
            <div className="font-medium">{answered && isComparison(at) ? "Compared with your group" : notes?.stripTitle}</div>
            <Figure title={alt} desc={alt} height={intervalPlotHeight(adjusted.length)}>
              <IntervalPlot
                x={GRID_FRAME.full.left} y={0} width={GRID_FRAME.full.col * 3 + GRID_FRAME.full.gap * 2} mirror baselineLabel="no difference"
                rows={adjusted.map((fact, i) => ({
                  fact, label: stripLabel(groups[groupOfAdjusted(i)], fact, words.events, unit),
                  emphasis: !answered || at === groupOfAdjusted(i) ? "signal" : "outline",
                }))}
              />
            </Figure>
            {notes?.stripUnder ? <div className="mt-1">{notes.stripUnder}</div> : null}
          </section>

          <div aria-live="polite" className="mt-4 min-h-[3rem]" data-estimate>
            {!result ? (
              <p className="text-base leading-snug text-muted">Tap the days you reach the goal, or No days, to find the group of the study you would have been counted in.</p>
            ) : (
              <>
                <p className="text-base leading-snug" data-raw>{result.raw}</p>
                {result.adjusted ? <p className="mt-2 text-base font-medium leading-snug" data-adjusted>{result.adjusted}</p> : null}
                {result.range ? <p className="mt-1 text-sm leading-snug text-muted" data-spread-label>{result.range}</p> : null}
                <p className="mt-2 text-sm leading-snug text-muted">People in this group of the study, not a prediction for you. <span data-source-line>{sourceLine}.</span></p>
              </>
            )}
          </div>

          {who ? (
            <section aria-label="Who this was tested in" className="mt-4 rounded-xl border border-line bg-surface p-3.5" data-who>
              <h3 className="text-base font-medium">Who this was tested in</h3>
              <div className="mt-1">{who}</div>
              {answered && groups[at]?.meanAge ? (
                <p className="mt-1 text-base leading-snug">Average age in the {groupLabel(groups[at], unit)} group: <span className="num font-medium">{groups[at].meanAge!.n}</span> years.</p>
              ) : null}
              <p className="mt-1 text-sm leading-snug text-muted">
                {observational
                  ? "This study watched people; it did not assign them to anything. It shows what went together, not what one thing did to the other."
                  : "The result holds for people like these. Nobody outside that group was tested."}
              </p>
            </section>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

/**
 * The glance view (R7): the feed card draws figure 3B's still view. The card mode above, with the
 * read's words as plain text. Nothing in it depends on the reader.
 */
export function AssociationGlance({ raw, groups, alt, words, rawNote, x }: { raw: ResolvedFact[]; groups: Group[]; alt: string; words: GridWords; rawNote?: string; x?: string | null }) {
  if (raw.length < CARD_GROUPS) return null;
  return (
    <AssociationCurve
      mode="card" raw={raw} adjusted={[]} groups={groups} alt={alt} sourceLine="" observational words={words} axis={x}
      notes={rawNote ? { raw: <p className="text-sm leading-snug text-muted">{rawNote}</p> } : undefined}
    />
  );
}
