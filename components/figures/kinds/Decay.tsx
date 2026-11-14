"use client";

/**
 * The "decay" kind: something that halves every half-life.
 *
 *   mode "card"  the still view: the halving curve, and around it the band of
 *                half-lives the study's spread gives. This is the point, and it
 *                stands alone on the feed.
 *   mode "full"  one plain sentence (when half is gone), the same chart, and
 *                under it three questions: when, bedtime, and the reader's own
 *                amount. The answer is a range left at bedtime, marked on the
 *                curve, with the study's labels beside it.
 *
 * Design note. Poking it teaches what a still picture cannot: where the
 * reader's own evening sits on the curve. The half-life is a gated estimate,
 * so the line is solid. The personal estimate obeys H12: a range worked out
 * from the fact's own range, under ESTIMATE_LABEL, the band's label and the
 * source line. A fact with no range gives the still view and no questions.
 * No dose presets: a cup's caffeine is not a gated fact, so the amount field
 * starts empty and is called the reader's own. State starts empty; no timers,
 * no motion.
 */

import { useId, useState, type ReactNode } from "react";
import { DECAY_FIELD, DECAY_FRAME, SHARE_TICKS, markAnchor, tickLabelled, decayPaths, decayPlace, estimateAtBed, exactHours, gapWords, halfGoneWords, halfLifeRange, halvings, hoursLabel } from "../decay-layout";
import { Figure } from "../Figure";
import { Label } from "../primitives";
import { ACCENT_TEXT, BAND, INK, LINE } from "../shared";
import { ESTIMATE_LABEL } from "@/lib/content/figure-kinds";
import { assertEvidence } from "@/lib/content/figures";
import type { ResolvedFact } from "@/lib/content/types";

export interface DecayWords {
  /** The question over the fields. */
  ask: string;
  dose: string;
  bed: string;
  amount: string;
  /** The unit of the amount, as the reader types it. */
  unit: string;
}

const WORDS: DecayWords = { ask: "Your evening", dose: "Caffeine at", bed: "Bedtime", amount: "Your amount", unit: "mg" };

export function Decay({ mode, halfLife, alt, sourceLine, note, beside, words = WORDS }: {
  mode: "card" | "full"; halfLife: ResolvedFact; alt: string; sourceLine: string;
  /** Where the half-life comes from, in a sentence (full mode, under the source line). */
  note?: ReactNode;
  /** The paper's own finding, shown beside the result and never joined to it. */
  beside?: ReactNode;
  words?: DecayWords;
}) {
  const id = useId();
  const [dose, setDose] = useState("");
  const [bed, setBed] = useState("");
  const [amount, setAmount] = useState("");
  const point = halfLife.estimate?.point;
  // No gated number, no figure: nothing is drawn from general knowledge.
  if (point === undefined) return null;
  assertEvidence("measured", halfLife);

  const band = halfLifeRange(halfLife);
  const range = mode === "full" ? band : null;
  const estimate = range ? estimateAtBed(amount, dose, bed, range) : null;
  const { times } = halvings(point);
  const place = decayPlace(point);
  const paths = decayPaths(point, band);
  const markX = estimate ? place.x(estimate.hours) : null;
  const { left, top, width, height, figureHeight, labelGap, size, tick } = DECAY_FRAME;
  const bottom = top + height;

  return (
    <div data-figure-kind="decay" data-mode={mode}>
      {range ? <p className="headline" data-half-gone>{halfGoneWords(range)}</p> : null}

      <div className={range ? "mt-3" : undefined}>
        <Figure title={halfLife.label} desc={alt} height={figureHeight} interactive={false}>
          <g data-evidence="measured" data-fact={halfLife.id}>
            {SHARE_TICKS.map(({ share, word }) => (
              <g key={word}>
                <line x1={left} x2={left + width} y1={place.y(share)} y2={place.y(share)} stroke={LINE} strokeWidth={1} />
                <Label x={left - tick * 2} y={place.y(share) + size / 3} anchor="end" tone="muted" size={size}>{word}</Label>
              </g>
            ))}
            <line x1={left} x2={left + width} y1={bottom} y2={bottom} stroke={INK} strokeWidth={1.5} />
            {paths.area ? <path d={paths.area} fill={BAND} data-band /> : null}
            <path d={paths.line} fill="none" stroke={INK} strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />
          </g>
          {times.map((time, i) => (
            <g key={time}>
              <line x1={place.x(time) ?? left} x2={place.x(time) ?? left} y1={bottom} y2={bottom + tick} stroke={INK} strokeWidth={1.5} />
              {tickLabelled(i, times.length) ? <Label x={place.x(time) ?? left} y={bottom + labelGap} anchor="middle" tone="muted" size={size}>{hoursLabel(time)}</Label> : null}
            </g>
          ))}
          {estimate && markX !== null ? (
            <g data-marker>
              <line x1={markX} x2={markX} y1={top - tick} y2={bottom} stroke={INK} strokeWidth={1.5} />
              <line x1={markX} x2={markX} y1={place.y(estimate.share.high)} y2={place.y(estimate.share.low)} stroke={ACCENT_TEXT} strokeWidth={10} strokeLinecap="round" />
              <Label x={markX} y={top - tick * 2} anchor={markAnchor(markX)} size={size} bold>{words.bed}</Label>
              <Label x={markX + (markAnchor(markX) === "start" ? tick * 2 : -tick * 2)} y={place.y(estimate.share.high) - tick} anchor={markAnchor(markX)} tone="accent" size={size} bold>
                {estimate.amountWords ? `${estimate.amountWords} ${words.unit}` : estimate.percentWords}
              </Label>
            </g>
          ) : null}
        </Figure>
      </div>

      {range ? (
        <fieldset className="mt-4 border-t border-line pt-4" data-simulator>
          <legend className="sr-only">{words.ask}</legend>
          <div className="grid grid-cols-2 gap-3">
            <label htmlFor={`${id}-dose`} className="text-sm font-medium text-muted">
              {words.dose}
              <input id={`${id}-dose`} type="time" value={dose} onChange={(e) => setDose(e.target.value)} className={DECAY_FIELD} />
            </label>
            <label htmlFor={`${id}-bed`} className="text-sm font-medium text-muted">
              {words.bed}
              <input id={`${id}-bed`} type="time" value={bed} onChange={(e) => setBed(e.target.value)} className={DECAY_FIELD} />
            </label>
            <label htmlFor={`${id}-amount`} className="col-span-2 text-sm font-medium text-muted">
              {words.amount} ({words.unit})
              <input id={`${id}-amount`} type="number" inputMode="decimal" min={0} step="any" value={amount} onChange={(e) => setAmount(e.target.value)} className={DECAY_FIELD} />
            </label>
          </div>

          <div aria-live="polite" className="num mt-4 min-h-[4.5rem]" data-estimate>
            {estimate ? (
              <>
                <p className="figure text-[2rem] text-accent-text">
                  {estimate.amountWords ? `About ${estimate.amountWords} ${words.unit}` : `About ${estimate.percentWords} of it`}
                  <span className="mt-1 block font-sans text-base font-normal tracking-normal text-muted">left at bedtime</span>
                </p>
                <p className="mt-2 text-base leading-snug">
                  {estimate.amountWords
                    ? `That is ${estimate.percentWords} of your ${estimate.amount?.toLocaleString("en")} ${words.unit}, ${gapWords(estimate.hours)} after you had it.`
                    : `Bed is ${gapWords(estimate.hours)} after your caffeine. Type your amount to see it in ${words.unit}.`}
                </p>
                {markX === null ? <p className="mt-1 text-sm text-muted">Bedtime is past the right edge of the chart.</p> : null}
              </>
            ) : (
              <p className="text-base leading-snug text-muted">Enter when you had caffeine and when you go to bed.</p>
            )}
          </div>

          <div className="mt-3 space-y-1.5 text-sm leading-snug text-muted">
            <p className="font-medium" data-estimate-label>{ESTIMATE_LABEL}.</p>
            <p><span data-spread-label>Half-life used: {exactHours(range.low)} to {exactHours(range.high)}, the {range.label}.</span> <span data-source-line>{sourceLine}.</span></p>
            {note ? <div>{note}</div> : null}
          </div>

          {beside ? <div className="mt-4 rounded-xl border border-line bg-surface p-3.5" data-beside>{beside}</div> : null}
        </fieldset>
      ) : null}
    </div>
  );
}
