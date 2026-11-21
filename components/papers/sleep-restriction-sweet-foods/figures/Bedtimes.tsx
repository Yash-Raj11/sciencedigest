/**
 * "Same wake time, later bedtime" (sleep restriction and sweet foods).
 *
 * The read's point is that the two schedules differed only in when sleep began. One strip runs
 * from evening to morning; each schedule's measured night is a solid bar from the average time
 * the teens fell asleep to the average time they woke, as the paper prints them. The bars end
 * together because the wake time was held fixed. A short muted tick marks midnight on each strip,
 * kept clear of the words under it. Under each bar: the printed times, then the
 * measured hours slept beside the hours in bed the schedule allowed (the rule, in words only).
 *
 * The paper prints each time with a ± spread but no range for the bar's ends, so no range is drawn.
 *
 * The glance view (the feed card) draws the same strip and bars with no numbers.
 *
 * Not interactive: there is nothing for a reader to put in.
 */

import { Figure } from "@/components/figures/Figure";
import { Label } from "@/components/figures/primitives";
import { MUTED, LINE, SIGNAL_FILL, SIGNAL_TEXT, type Evidence } from "@/components/figures/shared";
import { BEDTIMES_FRAME as F, bedtimesHeight, hoursText, midnightAt, rowTop, sleepSpan, timeText } from "@/components/figures/bedtimes-layout";
import { assertEvidence } from "@/lib/content/figures";
import type { FigureProps } from "../../registry";

interface Time { text: string; ref: string }
interface Row { label: string; inBed: { n: number; ref: string }; onset: Time; wake: Time; slept: Evidence }
interface Params {
  title: string; night: string; midnight: string; asleep: string; awake: string;
  inBedWords: string; sleptWords: string;
  rows: Row[];
}

export default function Bedtimes({ params, alt, glance }: FigureProps) {
  const p = params as unknown as Params;
  const full = !glance;
  for (const r of p.rows) {
    assertEvidence(r.slept.kind, r.slept.fact);
    if (!r.slept.fact.estimate) throw new Error(`figure: "${r.slept.fact.id}" has no estimate to draw`);
  }
  const midnight = midnightAt();

  return (
    <Figure title={p.title} desc={alt} height={bedtimesHeight(p.rows.length, full)}>
      <Label x={0} y={F.title} size={F.size} bold>{p.title}</Label>
      <Label x={F.night.left} y={F.head} tone="muted" size={F.small}>{glance?.x ?? p.night}</Label>
      <Label x={midnight} y={F.head} anchor="middle" tone="muted" size={F.small}>{p.midnight}</Label>

      {p.rows.map((r, i) => {
        const top = rowTop(i, full);
        const y = top + F.row.bar;
        const span = sleepSpan(r.onset.text, r.wake.text);
        return (
          <g key={r.slept.fact.id} data-row={i}>
            <Label x={0} y={top} size={F.size} bold>{r.label}</Label>
            <rect x={F.night.left} y={y} width={F.night.right - F.night.left} height={F.row.height} rx={2} fill="none" stroke={LINE} strokeWidth={1} data-night />
            <g data-evidence={r.slept.kind} data-fact={r.slept.fact.id}>
              <rect x={span.x} y={y} width={span.width} height={F.row.height} rx={2} fill={SIGNAL_FILL} stroke={SIGNAL_TEXT} strokeWidth={1} data-bar />
            </g>
            <line x1={midnight} x2={midnight} y1={y - F.cap} y2={y + F.row.height + F.cap} stroke={MUTED} strokeWidth={1} data-midnight />
            {full ? (
              <>
                <Label x={span.x} y={top + F.row.under} tone="muted" size={F.small}>{timeText(p.asleep, r.onset.text)}</Label>
                <Label x={span.x + span.width} y={top + F.row.under} anchor="end" tone="muted" size={F.small}>{timeText(p.awake, r.wake.text)}</Label>
                <Label x={0} y={top + F.row.hours} size={F.small}>{hoursText(r.slept.fact.estimate!.point, p.sleptWords, r.inBed.n, p.inBedWords)}</Label>
              </>
            ) : null}
          </g>
        );
      })}
    </Figure>
  );
}
