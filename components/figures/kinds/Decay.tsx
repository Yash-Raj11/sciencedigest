"use client";

/**
 * The "decay" kind: something that halves every half-life.
 *
 *   mode "card"  the still view: whole at the start, then one dot at each
 *                halving. This is the point, and it stands alone on the feed.
 *   mode "full"  the same chart, and under it two questions (when, and how
 *                much). The answer is a range left now, marked on the curve.
 *
 * Design note. Poking it teaches what a still picture cannot: where the
 * reader's own afternoon sits on the curve. The half-life is a gated estimate,
 * so the line is solid and the dots sit only where a halving is. The personal
 * estimate obeys H12: it is a range worked out from the fact's own range,
 * under ESTIMATE_LABEL, with the source line. A fact with no range gives the
 * still view and no questions. State starts empty; no timers, no motion.
 */

import { useId, useState } from "react";
import { DECAY_FIELD, DECAY_FRAME, decayPlace, estimateLeft, halfLifeRange, halvings, hoursLabel } from "../decay-layout";
import { Figure } from "../Figure";
import { DoseCurve, Label } from "../primitives";
import { ACCENT_TEXT } from "../shared";
import { ESTIMATE_LABEL } from "@/lib/content/figure-kinds";
import type { ResolvedFact } from "@/lib/content/types";

export interface DecayWords {
  /** The question over the two fields. */
  ask: string;
  when: string;
  amount: string;
  /** The unit of the amount, as the reader types it. */
  unit: string;
}

const WORDS: DecayWords = { ask: "When was your last dose, and how much?", when: "Hours ago", amount: "Amount", unit: "mg" };

export function Decay({ mode, halfLife, alt, sourceLine, words = WORDS }: {
  mode: "card" | "full"; halfLife: ResolvedFact; alt: string; sourceLine: string; words?: DecayWords;
}) {
  const id = useId();
  const [hoursAgo, setHoursAgo] = useState("");
  const [amount, setAmount] = useState("");
  const point = halfLife.estimate?.point;
  // No gated number, no figure: nothing is drawn from general knowledge.
  if (point === undefined) return null;

  const range = mode === "full" ? halfLifeRange(halfLife) : null;
  const estimate = range ? estimateLeft(amount, hoursAgo, range) : null;
  const { times, levels } = halvings(point);
  const place = decayPlace(point);
  const markX = estimate ? place.x(estimate.hours) : null;
  const { left, top, width, height, figureHeight, labelGap } = DECAY_FRAME;

  return (
    <div data-figure-kind="decay" data-mode={mode}>
      <Figure title={halfLife.label} desc={alt} height={figureHeight} interactive={false}>
        <DoseCurve x={left} y={top} width={width} height={height} times={times} levels={levels} kind="measured" fact={halfLife} />
        {times.map((time) => (
          <Label key={time} x={place.x(time) ?? left} y={top + height + labelGap} anchor="middle" tone="muted">{hoursLabel(time)}</Label>
        ))}
        {estimate && markX !== null ? (
          <g data-marker>
            <line x1={markX} x2={markX} y1={top} y2={top + height} stroke={ACCENT_TEXT} strokeWidth={1.5} />
            <line x1={markX} x2={markX} y1={place.y(estimate.share.high)} y2={place.y(estimate.share.low)} stroke={ACCENT_TEXT} strokeWidth={7} strokeLinecap="round" />
          </g>
        ) : null}
      </Figure>

      {range ? (
        <fieldset className="mx-3 mt-3 border-t border-line pt-3" data-simulator>
          <legend className="sr-only">{words.ask}</legend>
          <p aria-hidden className="font-semibold leading-snug">{words.ask}</p>
          <div className="mt-2 grid grid-cols-2 gap-3">
            <label htmlFor={`${id}-when`} className="text-sm font-semibold text-muted">
              {words.when}
              <input id={`${id}-when`} type="number" inputMode="decimal" min={0} step="any" value={hoursAgo} onChange={(e) => setHoursAgo(e.target.value)} className={DECAY_FIELD} />
            </label>
            <label htmlFor={`${id}-amount`} className="text-sm font-semibold text-muted">
              {words.amount} ({words.unit})
              <input id={`${id}-amount`} type="number" inputMode="decimal" min={0} step="any" value={amount} onChange={(e) => setAmount(e.target.value)} className={DECAY_FIELD} />
            </label>
          </div>
          <div aria-live="polite" className="num mt-3 min-h-[3.25rem]" data-estimate>
            {estimate ? (
              <p className="text-lg font-bold leading-snug">
                About {estimate.words} {words.unit} left now
                {markX === null ? <span className="block text-sm font-medium text-muted">Past the end of the curve drawn above.</span> : null}
              </p>
            ) : (
              <p className="text-sm leading-snug text-muted">Answer both and the range left now appears here.</p>
            )}
          </div>
          <p className="mt-1 text-xs font-semibold leading-snug text-muted" data-estimate-label>{ESTIMATE_LABEL}</p>
          <p className="text-xs leading-snug text-muted" data-source-line>{sourceLine}: {halfLife.label}</p>
        </fieldset>
      ) : null}
    </div>
  );
}
