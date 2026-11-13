import { assertEvidence } from "@/lib/content/figures";
import type { ResolvedFact } from "@/lib/content/types";
import { ACCENT, LINE, MUTED } from "../shared";
import { Bracket } from "./Bracket";
import { Label } from "./Label";

export interface TimelineRow { label: string; flagged: number[] }

/**
 * Readings over time, one row per group, spaced as the clock spaces them.
 * Every reading is a filled dot: it was taken. A flagged reading is larger and
 * orange. It draws no curve and no height: a dot says "measured here", nothing
 * about how high.
 */
export function Timeline({ x, y, width, labelWidth = 84, rowHeight = 26, times, unit, rows, span, flag }: {
  x: number; y: number; width: number; labelWidth?: number; rowHeight?: number;
  /** When the readings were taken, in the paper's own unit. */
  times: number[]; unit: string; rows: TimelineRow[];
  /** A bracket over the whole stretch, e.g. the total. A result: it names the finding it states. */
  span?: { lines: string[]; fact: ResolvedFact };
  /** The note under a flagged time. A result too. */
  flag?: { time: number; lines: string[]; fact: ResolvedFact };
}) {
  if (span) assertEvidence("measured", span.fact);
  if (flag) assertEvidence("measured", flag.fact);
  const last = Math.max(...times);
  const left = x + labelWidth;
  const right = x + width - 14;
  const at = (time: number) => left + (time / last) * (right - left);
  const rowY = (i: number) => y + i * rowHeight;
  const axis = rowY(rows.length) - 4;
  return (
    <g>
      {span ? <g data-evidence="measured" data-fact={span.fact.id}><Bracket x1={at(0)} x2={at(last)} y={y - 20} lines={span.lines} /></g> : null}
      {times.map((time) => <line key={time} x1={at(time)} x2={at(time)} y1={y - 10} y2={axis} stroke={LINE} strokeWidth={1} />)}
      {rows.map((row, i) => (
        <g key={row.label}>
          <Label x={x} y={rowY(i) + 4} size={11.5}>{row.label}</Label>
          {times.map((time) => (row.flagged.includes(time)
            ? <circle key={time} cx={at(time)} cy={rowY(i)} r={6.5} fill={ACCENT} data-flagged />
            : <circle key={time} cx={at(time)} cy={rowY(i)} r={3.5} fill={MUTED} />))}
        </g>
      ))}
      {times.map((time) => (
        <Label key={time} x={at(time)} y={axis + 14} anchor="middle" tone="muted" size={11}>{time === last ? `${time} ${unit}` : time}</Label>
      ))}
      {flag ? (
        <g data-evidence="measured" data-fact={flag.fact.id}>
          <line x1={at(flag.time)} x2={at(flag.time)} y1={axis + 20} y2={axis + 30} stroke={ACCENT} strokeWidth={1.75} />
          <Label x={at(flag.time) - 10} y={axis + 44} tone="accent" size={11.5} bold lines={flag.lines} />
        </g>
      ) : null}
    </g>
  );
}
