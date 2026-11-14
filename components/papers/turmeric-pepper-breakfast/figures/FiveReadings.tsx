/**
 * What was measured: five finger-prick readings after each of the four meals.
 * It draws no curve and no height, because the paper prints no glucose values.
 * A dot says a reading was taken; the orange ones are where the paper says a
 * meal differed from the plain one.
 *
 * Design note: INTERACTIVE. The still view already shows the finding (two orange
 * dots in one column, a bracket saying the total did not differ). Tapping a dot
 * adds what a picture cannot: the paper's own sentence for that reading, which
 * is how a reader learns that only the orange ones have a result behind them.
 * Nothing moves: no value changes over time here, so there is no motion.
 */

import { useState } from "react";
import { Figure } from "@/components/figures/Figure";
import { Timeline } from "@/components/figures/primitives";
import { FROM_THE_PAPER } from "@/lib/content/source-line";
import type { FigureProps } from "../../registry";
import { cellName, factAt, isFlagged, type Cell, type Params } from "./readings";

export default function FiveReadings({ params, alt, interactive = true }: FigureProps) {
  const p = params as unknown as Params;
  const [cell, setCell] = useState<Cell | null>(null);
  const times = p.times.map((time) => time.n);
  const fact = cell ? factAt(p, cell) : null;
  return (
    <div>
      <Figure title="Five blood glucose readings after four breakfasts" desc={alt} height={318} interactive={interactive}>
        <Timeline
          x={4} y={62} width={312} labelWidth={0} rowHeight={48} times={times} unit={p.unit}
          rows={p.meals.map((meal) => ({ label: meal.label, flagged: meal.differed.map((time) => time.n) }))}
          span={{ lines: [`total over ${Math.max(...times)} ${p.unit}: no difference`], fact: p.total.fact }}
          flag={{ time: p.early.at.n, lines: ["differed from plain", `(p = ${p.pValue.text})`], fact: p.early.fact }}
          selected={cell} onSelect={interactive ? setCell : undefined} cellLabel={(at) => cellName(p, at)}
        />
      </Figure>
      {interactive ? (
        <div aria-live="polite" data-reading className="mx-3 mt-2 min-h-[7.5rem] rounded-xl bg-surface px-3.5 py-3">
          {cell && fact ? (
            <div key={`${cell.row}-${cell.time}`} data-shown data-fact={fact.id} className="ui-reveal">
              <p className="text-sm font-medium leading-snug">
                {cellName(p, cell)}{isFlagged(p, cell) ? ": differed from the plain meal" : ""}
              </p>
              <p className="mt-1 text-xs font-medium text-muted" data-source-line>{FROM_THE_PAPER}, word for word</p>
              <p className="mt-0.5 font-serif text-[0.9375rem] italic leading-snug text-muted">&ldquo;{fact.quote}&rdquo;</p>
            </div>
          ) : (
            <p className="text-sm leading-snug text-muted">Tap a dot to read what the paper says about that reading.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
