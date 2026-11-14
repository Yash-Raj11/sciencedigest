import { assertEvidence } from "@/lib/content/figures";
import type { ResolvedFact } from "@/lib/content/types";
import { narrowestGap, timeScale } from "../scale";
import { ACCENT, INK, LINE, MUTED } from "../shared";
import { Bracket } from "./Bracket";
import { Label } from "./Label";

export interface TimelineRow { label: string; flagged: number[] }

/** One reading the reader can pick: which row, and when. */
export interface TimelineCell { row: number; time: number }

/**
 * Readings over time, one row per group, spaced as the clock spaces them
 * (components/figures/scale.ts). Every reading is a filled dot: it was taken. A
 * flagged reading is larger and orange. It draws no curve and no height: a dot
 * says "measured here", nothing about how high.
 *
 * With `onSelect`, each dot is a button (tap, or Tab to it): a target as wide
 * as the narrowest gap between two readings and as tall as its row, so targets
 * never overlap. With `labelWidth` 0 the row names sit above their rows, which
 * leaves the whole width to the clock.
 */
export function Timeline({ x, y, width, labelWidth = 84, rowHeight = 26, times, unit, rows, span, flag, selected = null, onSelect, cellLabel }: {
  x: number; y: number; width: number; labelWidth?: number; rowHeight?: number;
  /** When the readings were taken, in the paper's own unit. */
  times: number[]; unit: string; rows: TimelineRow[];
  /** A bracket over the whole stretch, e.g. the total. A result: it names the finding it states. */
  span?: { lines: string[]; fact: ResolvedFact };
  /** The note under a flagged time. A result too. */
  flag?: { time: number; lines: string[]; fact: ResolvedFact };
  selected?: TimelineCell | null;
  onSelect?: (cell: TimelineCell) => void;
  /** What a screen reader calls one dot. */
  cellLabel?: (cell: TimelineCell) => string;
}) {
  if (span) assertEvidence("measured", span.fact);
  if (flag) assertEvidence("measured", flag.fact);
  const last = Math.max(...times);
  const above = labelWidth === 0;
  const inset = onSelect ? rowHeight / 2 : above ? 8 : 0;
  const left = x + labelWidth + inset;
  const right = x + width - Math.max(14, inset);
  const at = timeScale(times, left, right);
  const rowY = (i: number) => y + i * rowHeight + (above ? 14 : 0);
  const axis = rowY(rows.length) - (above ? rowHeight / 2 - 4 : 4);
  const target = Math.min(narrowestGap(times, at), rowHeight - 2);
  return (
    <g>
      {span ? <g data-evidence="measured" data-fact={span.fact.id}><Bracket x1={at(0)} x2={at(last)} y={y - 20} lines={span.lines} /></g> : null}
      {times.map((time) => <line key={time} x1={at(time)} x2={at(time)} y1={y - 10} y2={axis} stroke={LINE} strokeWidth={1} />)}
      {rows.map((row, i) => (
        <g key={row.label}>
          {above
            ? <Label x={x + 2} y={rowY(i) - rowHeight / 2 + 9} size={11.5} tone="muted">{row.label}</Label>
            : <Label x={x} y={rowY(i) + 4} size={11.5}>{row.label}</Label>}
          {times.map((time) => {
            const dot = row.flagged.includes(time)
              ? <circle cx={at(time)} cy={rowY(i)} r={6.5} fill={ACCENT} data-flagged />
              : <circle cx={at(time)} cy={rowY(i)} r={3.5} fill={MUTED} />;
            if (!onSelect) return <g key={time}>{dot}</g>;
            const cell = { row: i, time };
            const on = selected?.row === i && selected.time === time;
            return (
              <g
                key={time} role="button" tabIndex={0} data-cell aria-pressed={on} aria-label={cellLabel?.(cell)}
                onClick={() => onSelect(cell)} onFocus={() => onSelect(cell)}
                onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelect(cell); } }}
                style={{ cursor: "pointer" }}
              >
                <rect x={at(time) - target / 2} y={rowY(i) - (rowHeight - 2) / 2} width={target} height={rowHeight - 2} fill="transparent" />
                {on ? <circle cx={at(time)} cy={rowY(i)} r={12} fill="none" stroke={INK} strokeWidth={2} data-selected /> : null}
                {dot}
              </g>
            );
          })}
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
