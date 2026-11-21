/**
 * "Food eaten per day" (alternate-day fasting).
 *
 * The read's point is that the free days did not refill the gap the fast days left. Two rows of
 * daily bars share one value scale. The fasting group's row alternates a short fast-day bar with
 * a tall feed-day bar; the control group's row is the same tall bar every day. Each bar's height
 * is the group's average food for that kind of day at the end of the trial, as the paper prints
 * it in its food-record table. The feed-day bar and the control bar come out close; the fast-day
 * bar is a fraction of either. Under each row (full view): the printed amounts.
 *
 * How many days are drawn is a drawing choice (the layout's), not data. The paper prints its ±
 * figures as standard errors, so no range is drawn.
 *
 * The glance view (the feed card) draws the same bars with no numbers.
 *
 * Not interactive: there is nothing for a reader to put in.
 */

import { Figure } from "@/components/figures/Figure";
import { Label } from "@/components/figures/primitives";
import { LINE, MUTED, SIGNAL_FILL, SIGNAL_TEXT, type Evidence } from "@/components/figures/shared";
import {
  DAY_INDEXES, FAST_DAYS_FRAME as F, amountText, barHeight, baselineOf, dayBar, fastDaysHeight, isFastDay, pairText, peakOf, rowTop,
} from "@/components/figures/fast-days-layout";
import { assertEvidence } from "@/lib/content/figures";
import type { FigureProps } from "../../registry";

interface Params {
  title: string; unit: string; fastWord: string; feedWord: string; everyWord: string; daysWord: string;
  fasting: { label: string; fast: Evidence; feed: Evidence };
  control: { label: string; day: Evidence };
}

function amountOf(e: Evidence): number {
  assertEvidence(e.kind, e.fact);
  if (!e.fact.estimate) throw new Error(`figure: "${e.fact.id}" has no estimate to draw`);
  return e.fact.estimate.point;
}

export default function FastDays({ params, alt, glance }: FigureProps) {
  const p = params as unknown as Params;
  const full = !glance;
  const fast = amountOf(p.fasting.fast);
  const feed = amountOf(p.fasting.feed);
  const every = amountOf(p.control.day);
  const peak = peakOf([fast, feed, every]);

  const groups = [
    { label: p.fasting.label, dayOf: (i: number) => (isFastDay(i) ? p.fasting.fast : p.fasting.feed), signal: true,
      under: pairText(amountText(p.fastWord, fast, p.unit), amountText(p.feedWord, feed, p.unit)) },
    { label: p.control.label, dayOf: () => p.control.day, signal: false,
      under: amountText(p.everyWord, every, p.unit) },
  ];

  return (
    <Figure title={p.title} desc={alt} height={fastDaysHeight(groups.length, full)}>
      <Label x={0} y={F.title} size={F.size} bold>{p.title}</Label>
      {groups.map((g, row) => {
        const top = rowTop(row, full);
        const base = baselineOf(row, full);
        return (
          <g key={g.label} data-row={row}>
            <Label x={0} y={top} size={F.size} bold>{g.label}</Label>
            {DAY_INDEXES.map((i) => {
              const e = g.dayOf(i);
              const h = barHeight(e.fact.estimate!.point, peak, full);
              const { x, width } = dayBar(i);
              return (
                <g key={i} data-evidence={e.kind} data-fact={e.fact.id}>
                  <rect x={x} y={base - h} width={width} height={h} rx={2}
                    fill={g.signal ? SIGNAL_FILL : LINE} stroke={g.signal ? SIGNAL_TEXT : MUTED} strokeWidth={1} data-bar />
                </g>
              );
            })}
            <line x1={F.left} x2={F.left + F.width} y1={base} y2={base} stroke={MUTED} strokeWidth={1} data-baseline />
            {full ? <Label x={0} y={base + F.row.under} size={F.small}>{g.under}</Label> : null}
          </g>
        );
      })}
      <Label x={0} y={fastDaysHeight(groups.length, full) - F.small / 2} tone="muted" size={F.small}>{glance?.x ?? p.daysWord}</Label>
    </Figure>
  );
}
