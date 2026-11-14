"use client";

/**
 * The "association-curve" kind: how an outcome went with a habit, across the
 * groups a cohort was split into. One block per group, as wide as the values it
 * covers and as tall as its printed share.
 *
 *   mode "card"  the still view: the blocks, each with its printed raw share.
 *   mode "full"  the same chart, a question (the reader's own value), and the
 *                group it falls in: that group's adjusted difference from the
 *                first group, as a band, with one plain sentence; the raw shares
 *                under it, labelled raw; then who was studied, straight after.
 *
 * Design note. Poking it teaches what a still picture cannot: which group the
 * reader would have been counted in, and that its number is a group's, after
 * adjustment, not the reader's own risk (H3: no causal verb, no "your risk").
 * Every value is printed in the paper; nothing is interpolated between groups
 * and nothing is offered outside them. Solid fills: measured. State starts
 * empty; no timers, no motion.
 */

import { useId, useState, type ReactNode } from "react";
import { CURVE_FRAME, DAY_BUTTON, blocks, choices, drawable, groupSpan, pickedGroup, rawOutcome, shareWords, type GroupEdges } from "../association-layout";
import { BandStrip } from "../BandStrip";
import { Figure } from "../Figure";
import { Label } from "../primitives";
import { INK, MUTED } from "../shared";
import { assertEvidence } from "@/lib/content/figures";
import type { ResolvedFact } from "@/lib/content/types";

export function AssociationCurve({ mode, raw, adjusted, groups, alt, sourceLine, ask, headline, who, observational, unit = "days" }: {
  mode: "card" | "full"; raw: ResolvedFact[]; adjusted: ResolvedFact[]; groups: GroupEdges[]; alt: string; sourceLine: string;
  /** The question, as the read wrote it (it may carry a cited number). */
  ask?: ReactNode;
  /** The one plain sentence over the chart. */
  headline?: ReactNode;
  /** Who was studied: shown straight under the result (H3). */
  who?: ReactNode;
  observational: boolean;
  unit?: string;
}) {
  const id = useId();
  const [picked, setPicked] = useState<number | null>(null);
  if (!drawable(raw, groups)) return null;
  for (const fact of [...raw, ...adjusted]) assertEvidence("measured", fact);

  const shapes = blocks(groups, raw);
  const view = pickedGroup(groups, raw, adjusted, picked, unit);
  const { top, height, figureHeight, size, valueGap, axisGap, titleGap } = CURVE_FRAME;
  const bottom = top + height;

  return (
    <div data-figure-kind="association-curve" data-mode={mode}>
      {mode === "full" && headline ? <div data-headline>{headline}</div> : null}
      <p className="mt-3 text-sm leading-snug text-muted" data-raw-caption>
        <span className="font-medium text-ink">Raw</span>, before any adjustment: {rawOutcome(raw)}.
      </p>

      <div className="mt-2">
        <Figure title={rawOutcome(raw)} desc={alt} height={figureHeight} interactive={false}>
          <line x1={CURVE_FRAME.left} x2={CURVE_FRAME.left + CURVE_FRAME.width} y1={bottom} y2={bottom} stroke={INK} strokeWidth={1.5} />
          {shapes.map((shape, i) => {
            const mine = view?.at === i;
            const on = !view || mine;
            return (
              <g key={raw[i].id} data-evidence="measured" data-fact={raw[i].id} data-picked={mine ? "" : undefined}>
                <rect x={shape.x} y={shape.y} width={shape.w} height={shape.h} rx={4} fill={on ? INK : MUTED} opacity={on ? 1 : 0.35} />
                <Label x={shape.mid} y={shape.y - valueGap} anchor="middle" tone={on ? "ink" : "muted"} size={size} bold>{shareWords(raw[i])}</Label>
                <Label x={shape.mid} y={bottom + axisGap} anchor="middle" tone={mine ? "ink" : "muted"} size={size} bold={mine}>{groupSpan(groups[i])}</Label>
              </g>
            );
          })}
          <Label x={CURVE_FRAME.left + CURVE_FRAME.width / 2} y={bottom + titleGap} anchor="middle" tone="muted" size={size}>{`${unit} a week`}</Label>
        </Figure>
      </div>

      {mode === "full" ? (
        <fieldset className="mt-4 border-t border-line pt-4" data-simulator>
          <legend className="sr-only">{typeof ask === "string" ? ask : "Your own value"}</legend>
          {ask ? <div aria-hidden className="font-medium leading-snug">{ask}</div> : null}
          <div className="mt-3 grid grid-cols-4 gap-2" role="radiogroup">
            {choices(groups).map((value) => (
              <label key={value} className={`${DAY_BUTTON} ${picked === value ? "border-ink bg-ink text-bg" : "border-line bg-bg text-ink"}`}>
                <input type="radio" name={`${id}-value`} value={value} checked={picked === value} onChange={() => setPicked(value)} className="sr-only" aria-label={`${value} ${unit}`} />
                <span aria-hidden className="num">{value}</span>
              </label>
            ))}
          </div>

          <div aria-live="polite" className="num mt-4 min-h-[3rem]" data-estimate>
            {!view ? (
              <p className="text-base leading-snug text-muted">Pick a number and the group it falls in appears here.</p>
            ) : (
              <>
                <p className="text-sm font-medium text-muted">People with {view.heading}</p>
                {view.comparison ? (
                  <p className="headline mt-1">The group the others were compared with</p>
                ) : view.difference && view.place ? (
                  <>
                    <p className="figure mt-1 text-[2rem] text-accent-text" data-adjusted>
                      {view.difference.headline}
                      <span className="mt-1 block font-sans text-base font-normal tracking-normal text-muted">adjusted, compared with {view.first}</span>
                    </p>
                    <div className="mt-3">
                      <BandStrip band={view.difference.band} point={view.point} label={`Range for the study average: ${view.difference.bandWords}`} accent />
                    </div>
                    <p className="mt-1 text-base leading-snug">
                      After the study&apos;s adjustments, {view.outcome} was {view.difference.headline} than at {view.first}.
                    </p>
                    <p className="mt-1 text-sm leading-snug text-muted" data-spread-label>
                      Range for the study average: {view.difference.bandWords}{view.difference.crossesZero ? ". It includes no difference, so the study cannot tell which way it goes" : ""}.
                    </p>
                  </>
                ) : null}
                <p className="mt-3 text-base leading-snug" data-raw>
                  <span className="font-medium">Raw:</span> {view.raw} of this group{view.comparison ? "" : `, against ${view.firstRaw} at ${view.first}`}. The groups differ in age and health, so the raw gap is not the adjusted one.
                </p>
                <p className="mt-2 text-sm leading-snug text-muted">People in this group of the study, not a prediction for you. <span data-source-line>{sourceLine}.</span></p>
              </>
            )}
          </div>

          {who ? (
            <section aria-label="Who this was tested in" className="mt-4 rounded-xl border border-line bg-surface p-3.5" data-who>
              <h3 className="text-base font-medium">Who this was tested in</h3>
              <div className="mt-1">{who}</div>
              {view?.meanAge != null ? (
                <p className="mt-1 text-base leading-snug">Average age at {view.label}: <span className="num font-medium">{view.meanAge}</span> years.</p>
              ) : null}
              <p className="mt-1 text-sm leading-snug text-muted">
                {observational
                  ? "This study watched people; it did not assign them to anything. It shows what went together, not what one thing did to the other."
                  : "The result holds for people like these. Nobody outside that group was tested."}
              </p>
            </section>
          ) : null}
        </fieldset>
      ) : null}
    </div>
  );
}
