/**
 * "CRP: the first sugar minus the second" (sugar and inflammation markers).
 *
 * The read's point is that neither pooled comparison could be told from no difference. Each row
 * is one comparison the review pooled: its point as a mark and its printed 95% range as a band,
 * on one scale around the "no difference" line (a mean difference in mg/L, so the line is at 0).
 * Both bands cross it. The headline comparison (fructose against glucose) is the one pastel band;
 * the other is an outline. Under each row's name: how many trials and people it pooled.
 *
 * The glance view (the feed card) draws the same bands and line with no numbers.
 *
 * Not interactive: there is nothing for a reader to put in.
 */

import { Figure } from "@/components/figures/Figure";
import { change } from "@/components/figures/format";
import { IntervalPlot, Label, intervalPlotHeight } from "@/components/figures/primitives";
import { intervalLayout, scaleOf } from "@/components/figures/interval-layout";
import { LINE, MUTED, SIGNAL_FILL } from "@/components/figures/shared";
import { CRP_FRAME as F, crpHeight, glanceRowTop, isHeadline, lastGlanceRowTop, measureOf, sizeText } from "@/components/figures/crp-gaps-layout";
import { assertEvidence } from "@/lib/content/figures";
import type { ResolvedFact } from "@/lib/content/types";
import type { FigureProps } from "../../registry";

interface Cited { n: number; ref: string }
interface Row { lead: string; fact: ResolvedFact; trials: Cited; people: Cited }
interface Params {
  title: string; baseline: string; unitWords: string; trialsWord: string; peopleWord: string;
  rows: Row[];
}

export default function CrpGaps({ params, alt, glance }: FigureProps) {
  const p = params as unknown as Params;
  const full = !glance;
  for (const r of p.rows) {
    assertEvidence("measured", r.fact);
    if (!r.fact.estimate) throw new Error(`figure: "${r.fact.id}" has no estimate to draw`);
  }
  const plotHeight = intervalPlotHeight(p.rows.length, F.size, F.row);

  if (!full) {
    const estimates = p.rows.map((r) => r.fact.estimate!);
    const { baseline, rows } = intervalLayout(estimates, scaleOf(measureOf(estimates)), { left: F.left, width: F.width, size: F.size });
    const bottom = lastGlanceRowTop(p.rows.length) + F.glance.band + F.glance.height;
    return (
      <Figure title={p.title} desc={alt} height={crpHeight(p.rows.length, false, plotHeight)}>
        <Label x={0} y={F.title} size={F.size} bold>{p.title}</Label>
        <Label x={0} y={F.plot + F.small} tone="muted" size={F.small}>{glance?.x ?? p.unitWords}</Label>
        <line x1={baseline} x2={baseline} y1={glanceRowTop(0)} y2={bottom + F.small / 2} stroke={MUTED} strokeWidth={1} data-baseline />
        {p.rows.map((r, i) => {
          const top = glanceRowTop(i);
          const placed = rows[i];
          return (
            <g key={r.fact.id} data-evidence="measured" data-fact={r.fact.id}>
              <Label x={0} y={top} size={F.small}>{r.lead}</Label>
              {placed.low !== null && placed.high !== null ? (
                <rect x={placed.low} y={top + F.glance.band} width={placed.high - placed.low} height={F.glance.height} rx={F.glance.height / 2}
                  fill={isHeadline(i) ? SIGNAL_FILL : "none"} stroke={isHeadline(i) ? "none" : LINE} strokeWidth={1} data-band />
              ) : null}
            </g>
          );
        })}
      </Figure>
    );
  }

  return (
    <Figure title={p.title} desc={alt} height={crpHeight(p.rows.length, true, plotHeight)}>
      <Label x={0} y={F.title} size={F.size} bold>{p.title}</Label>
      <g transform={`translate(0 ${F.plot})`}>
        <IntervalPlot
          x={F.left} y={0} width={F.width} size={F.size} rowHeight={F.row} baselineLabel={p.baseline}
          rows={p.rows.map((r, i) => ({
            fact: r.fact,
            label: { lead: `${r.lead}: `, number: change(r.fact.estimate!), tail: ` · ${sizeText(r.trials.n, p.trialsWord, r.people.n, p.peopleWord)}` },
            emphasis: isHeadline(i) ? "signal" : "outline",
          }))}
        />
      </g>
      <Label x={0} y={F.plot + plotHeight + F.small} tone="muted" size={F.small}>{p.unitWords}</Label>
    </Figure>
  );
}
