/**
 * "Believed clean, found clean" (best-possible toothbrushing).
 *
 * The mechanism layer's point is a gap people cannot see: told to brush as thoroughly as they
 * could, students believed 70% of their gumline was clean, and the dentists found less than 40%
 * free of plaque. This draws both shares on one scale, the whole gumline, as solid bars: both are
 * measured (the belief on the paper's rating scale, the plaque by the dentists' score).
 *
 * The dentists' share is printed only as an upper bound ("less than 40%"), so its bar stops at
 * that bound and ends in a short upright line, and its words say "less than". Nothing is
 * proposed, nothing is a sketch.
 *
 * The glance view (the feed card) draws the same two bars with no numbers.
 *
 * Not interactive: there is nothing for a reader to put in.
 */

import { Figure } from "@/components/figures/Figure";
import { GAP_FRAME as F, gapHeight, rowTop, shareScale, shareText } from "@/components/figures/gap-layout";
import { Label } from "@/components/figures/primitives";
import { INK, LINE, SIGNAL_FILL, SIGNAL_TEXT, type Evidence } from "@/components/figures/shared";
import { assertEvidence } from "@/lib/content/figures";
import type { FigureProps } from "../../registry";

interface Share extends Evidence { label: string; value: { n: number; ref: string }; below?: boolean }
interface Params { title: string; unit: string; none: string; all: string; lessThan: string; believed: Share; found: Share }

export default function CleanGap({ params, alt, glance }: FigureProps) {
  const p = params as unknown as Params;
  const full = !glance;
  const rows = [p.believed, p.found];
  for (const r of rows) assertEvidence(r.kind, r.fact);
  const at = shareScale();

  return (
    <Figure title={p.title} desc={alt} height={gapHeight(rows.length, full)}>
      <Label x={0} y={F.title} size={F.size} bold>{p.title}</Label>
      <Label x={0} y={F.subtitle} tone="muted" size={F.small}>{glance?.x ?? p.unit}</Label>
      <Label x={at(0)} y={F.axis} tone="muted" size={F.small}>{p.none}</Label>
      <Label x={F.plot.right} y={F.axis} anchor="end" tone="muted" size={F.small}>{p.all}</Label>
      {rows.map((r, i) => {
        const top = rowTop(i);
        const end = at(r.value.n);
        return (
          <g key={r.fact.id} data-evidence={r.kind} data-fact={r.fact.id} data-row={i}>
            <Label x={0} y={top} size={F.size} bold>{r.label}</Label>
            <rect x={at(0)} y={top + F.row.bar} width={F.plot.right - at(0)} height={F.row.barHeight} rx={2} fill="none" stroke={LINE} strokeWidth={1} data-track />
            <rect x={at(0)} y={top + F.row.bar} width={end - at(0)} height={F.row.barHeight} rx={2} fill={SIGNAL_FILL} stroke={SIGNAL_TEXT} strokeWidth={1} data-bar />
            {r.below ? (
              <line x1={end} x2={end} y1={top + F.row.bar - F.cap} y2={top + F.row.bar + F.row.barHeight + F.cap} stroke={INK} strokeWidth={1.5} data-bound />
            ) : null}
            {full ? <Label x={0} y={top + F.row.value} size={F.size} bold>{shareText(r.value.n, Boolean(r.below), p.lessThan)}</Label> : null}
          </g>
        );
      })}
    </Figure>
  );
}
