/**
 * "Eczema score, start and end" (ceramide cream and cleanser).
 *
 * The read's point is that the eczema score improved about as much with the placebo set as with
 * the ceramide set. Each group is one row on a shared scale that starts at the score's floor
 * (clear skin): a dot at the group's average score at the start, a dot at day 28, and a solid line
 * between them; over the first row, the dots are named. The two lines come out nearly the same length, in nearly the same place. Under
 * each row (full view): the printed scores.
 *
 * The paper prints each score with a ± standard error but no range, so no range is drawn.
 *
 * The glance view (the feed card) draws the same rows with no numbers.
 *
 * Not interactive: there is nothing for a reader to put in.
 */

import { Figure } from "@/components/figures/Figure";
import { Label } from "@/components/figures/primitives";
import { INK, LINE, MUTED, SIGNAL_FILL, SIGNAL_TEXT, type Evidence } from "@/components/figures/shared";
import { ECZEMA_FRAME as F, eczemaHeight, endsText, floorAt, isTested, lineY, namesDots, peakOf, rowTop, scoreAt } from "@/components/figures/eczema-scores-layout";
import { assertEvidence } from "@/lib/content/figures";
import type { FigureProps } from "../../registry";

interface Row { label: string; start: Evidence; end: Evidence }
interface Params {
  title: string; scaleWord: string; startWord: string; endWord: { text: string; ref: string };
  rows: Row[];
}

function scoreOf(e: Evidence): number {
  assertEvidence(e.kind, e.fact);
  if (!e.fact.estimate) throw new Error(`figure: "${e.fact.id}" has no estimate to draw`);
  return e.fact.estimate.point;
}

export default function EczemaScores({ params, alt, glance }: FigureProps) {
  const p = params as unknown as Params;
  const full = !glance;
  const rows = p.rows.map((r, i) => ({ ...r, from: scoreOf(r.start), to: scoreOf(r.end), signal: isTested(i) }));
  const peak = peakOf(rows.flatMap((r) => [r.from, r.to]));
  const height = eczemaHeight(rows.length, full);

  return (
    <Figure title={p.title} desc={alt} height={height}>
      <Label x={0} y={F.title} size={F.size} bold>{p.title}</Label>
      {rows.map((r, i) => {
        const y = lineY(i, full);
        const x1 = scoreAt(r.from, peak);
        const x2 = scoreAt(r.to, peak);
        const ink = r.signal ? SIGNAL_TEXT : MUTED;
        return (
          <g key={r.label} data-row={i}>
            <Label x={0} y={rowTop(i, full)} size={F.size} bold>{r.label}</Label>
            <line x1={floorAt()} x2={scoreAt(peak, peak)} y1={y} y2={y} stroke={LINE} strokeWidth={1} data-track />
            <line x1={x2} x2={x1} y1={y} y2={y} stroke={ink} strokeWidth={2} data-span />
            <g data-evidence={r.start.kind} data-fact={r.start.fact.id}>
              <circle cx={x1} cy={y} r={F.startDot} fill={MUTED} data-dot="start" />
            </g>
            <g data-evidence={r.end.kind} data-fact={r.end.fact.id}>
              <circle cx={x2} cy={y} r={F.dot} fill={r.signal ? SIGNAL_FILL : INK} stroke={ink} strokeWidth={1} data-dot="end" />
            </g>
            {full && namesDots(i) ? (
              <>
                <Label x={x1 + F.startDot} y={y - F.over} anchor="end" tone="muted" size={F.small}>{p.startWord}</Label>
                <Label x={x2} y={y - F.over} anchor="middle" tone="muted" size={F.small}>{p.endWord.text}</Label>
              </>
            ) : null}
            {full ? <Label x={0} y={rowTop(i, full) + F.row.under} size={F.small}>{endsText(r.from, p.startWord, r.to, p.endWord.text)}</Label> : null}
          </g>
        );
      })}
      <Label x={0} y={height - F.small / 2} tone="muted" size={F.small}>{glance?.x ?? p.scaleWord}</Label>
    </Figure>
  );
}
