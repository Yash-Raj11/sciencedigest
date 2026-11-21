/**
 * "When they ate, and what happened to insulin resistance" (time-restricted eating).
 *
 * The read's point is that two windows of the same length, placed at different times of day,
 * went with different results. Each row is one group: on the left its day, midnight to midnight,
 * with the hours it could eat marked (the trial's rule, drawn plain, not as a result); on the
 * right its measured change in insulin resistance (HOMA-IR) as a solid bar on one shared scale.
 * The control group had no window, so its day is unmarked and says so.
 *
 * The paper prints each change with a ± figure it does not name, and no confidence interval, so
 * no range is drawn: a bar ends at the printed change.
 *
 * The glance view (the feed card) draws the same strips and bars with no numbers.
 *
 * Not interactive: there is nothing for a reader to put in.
 */

import { Figure } from "@/components/figures/Figure";
import { signedPoint } from "@/components/figures/format";
import { Label } from "@/components/figures/primitives";
import { INK, LINE, MUTED, SIGNAL_FILL, SIGNAL_TEXT, SURFACE, type Evidence } from "@/components/figures/shared";
import { WINDOWS_FRAME as F, barSpan, changeScale, clock, dayAt, lastRowTop, rowTop, valueAt, windowsHeight } from "@/components/figures/windows-layout";
import { assertEvidence } from "@/lib/content/figures";
import type { FigureProps } from "../../registry";

interface Cited { n: number; ref: string }
interface Group { label: string; from?: Cited; to?: Cited; change: Evidence }
interface Params {
  title: string; day: string; change: string;
  less: string; noChange: string; more: string; anyTime: string;
  groups: Group[];
}

export default function EatingWindows({ params, alt, glance }: FigureProps) {
  const p = params as unknown as Params;
  const full = !glance;
  for (const g of p.groups) {
    assertEvidence(g.change.kind, g.change.fact);
    if (!g.change.fact.estimate) throw new Error(`figure: "${g.change.fact.id}" has no estimate to draw`);
  }
  const at = changeScale(p.groups.map((g) => g.change.fact.estimate!.point));
  const last = lastRowTop(p.groups.length);

  return (
    <Figure title={p.title} desc={alt} height={windowsHeight(p.groups.length, full)}>
      <Label x={0} y={F.title} size={F.size} bold>{p.title}</Label>
      <Label x={F.day.left} y={F.head} tone="muted" size={F.small}>{glance?.x ?? p.day}</Label>
      <Label x={F.bars.right} y={F.subtitle} anchor="end" tone="muted" size={F.small}>{p.change}</Label>
      <Label x={F.bars.left} y={F.head} tone="muted" size={F.small}>{p.less}</Label>
      <Label x={F.bars.right} y={F.head} anchor="end" tone="muted" size={F.small}>{p.more}</Label>
      <Label x={at(0)} y={F.head} anchor="middle" tone="muted" size={F.small}>{p.noChange}</Label>
      <line x1={at(0)} x2={at(0)} y1={F.head + F.cap * 2} y2={last + F.row.strip + F.row.height + F.cap} stroke={MUTED} strokeWidth={1} data-no-change />

      {p.groups.map((g, i) => {
        const top = rowTop(i);
        const y = top + F.row.strip;
        const est = g.change.fact.estimate!;
        const bar = barSpan(at, est.point);
        return (
          <g key={g.change.fact.id} data-group={i}>
            <Label x={0} y={top} size={F.size} bold>{g.label}</Label>
            <rect x={dayAt(0)} y={y} width={F.day.right - F.day.left} height={F.row.height} rx={2} fill="none" stroke={LINE} strokeWidth={1} data-day />
            {g.from && g.to ? (
              <g data-window>
                <rect x={dayAt(g.from.n)} y={y} width={dayAt(g.to.n) - dayAt(g.from.n)} height={F.row.height} rx={2} fill={SURFACE} stroke={INK} strokeWidth={1} />
                {full ? (
                  <>
                    <Label x={dayAt(g.from.n)} y={top + F.row.under} anchor="middle" tone="muted" size={F.small}>{clock(g.from.n)}</Label>
                    <Label x={dayAt(g.to.n)} y={top + F.row.under} anchor="middle" tone="muted" size={F.small}>{clock(g.to.n)}</Label>
                  </>
                ) : null}
              </g>
            ) : (
              <Label x={dayAt(0)} y={top + F.row.under} tone="muted" size={F.small}>{p.anyTime}</Label>
            )}
            <g data-evidence={g.change.kind} data-fact={g.change.fact.id}>
              <rect x={bar.x} y={y} width={bar.width} height={F.row.height} rx={2} fill={SIGNAL_FILL} stroke={SIGNAL_TEXT} strokeWidth={1} data-bar />
              {full ? <Label x={valueAt(at, est.point).x} y={y + F.row.height - F.cap} anchor={valueAt(at, est.point).anchor} size={F.size} bold>{signedPoint(est)}</Label> : null}
            </g>
          </g>
        );
      })}
    </Figure>
  );
}
