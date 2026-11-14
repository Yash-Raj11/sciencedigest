/**
 * One outcome of a compare-bars figure (FIGURE-DESIGN 4B), on its own scale: the pooled result
 * as a pastel band with its grade under the label, then, when given, the sensitivity result as a
 * hollow band, the subgroup results as half-height muted outlines, and plain lines of text.
 * The scale and the end labels follow the interval rules (components/figures/interval-layout.ts):
 * the baseline from the measure, the ends the fact's own, a range under the row when they clash.
 */

import { assertEvidence } from "@/lib/content/figures";
import type { ResolvedFact } from "@/lib/content/types";
import { intervalLayout, scaleOf, textWidth } from "../interval-layout";
import { FONT, INK, LINE, META, MUTED, SIGNAL_FILL, SIGNAL_TEXT } from "../shared";

export type CompareRow =
  | { kind: "pooled" | "sensitivity"; fact: ResolvedFact; lead: string; number: string; tail?: string; note: string }
  | { kind: "subgroup"; fact: ResolvedFact; lead: string; value: string; clear: boolean }
  | { kind: "line"; text: string };

interface Sizes { size: number; small: number }

/** A subgroup's value goes on its own line when it would not fit beside its setting. */
const stacked = (row: { lead: string; value: string }, width: number, small: number) =>
  textWidth(`${row.lead}  ${row.value}`, small) > width;

/** The height each kind of row takes. A subgroup row is half a pooled row (FIGURE-DESIGN 4B). */
function rowHeight(row: CompareRow, { size, small }: Sizes, width: number): number {
  if (row.kind === "line") return small * 1.6;
  const full = size + small * 1.4 + size * 0.95 + small * 2.7;
  if (row.kind === "subgroup") return full / 2 + (stacked(row, width, small) ? small * 1.3 : 0);
  return full;
}

export const compareRowsHeight = (rows: CompareRow[], sizes: Sizes, width: number, header = false) =>
  (header ? sizes.small * 1.5 : 0) + rows.reduce((h, row) => h + rowHeight(row, sizes, width), 0);

export function CompareRows({ x, y, width, rows, extent = [], baselineLabel, size = 12.5, small = 11 }: {
  x: number; y: number; width: number; rows: CompareRow[];
  /** Results that may be shown later: they widen the scale now, so nothing moves. */
  extent?: ResolvedFact[];
  /** Name the no-change line here (once per figure). */
  baselineLabel?: string;
  size?: number; small?: number;
}) {
  const drawn = rows.filter((r): r is Exclude<CompareRow, { kind: "line" }> => r.kind !== "line");
  for (const row of drawn) assertEvidence("measured", row.fact);
  const estimates = drawn.map((r) => r.fact.estimate!);
  const scale = scaleOf(estimates[0]?.measure ?? "");
  const { baseline, rows: placed } = intervalLayout(estimates, scale, { left: x, width, size: small }, {
    baselineLabel, extent: extent.map((f) => f.estimate!),
  });
  const header = baselineLabel ? small * 1.5 : 0;
  const tops = rows.reduce<number[]>((acc, row, i) => [...acc, i ? acc[i - 1] + rowHeight(rows[i - 1], { size, small }, width) : y + header], []);
  const drawnIndex = rows.map((row, i) => rows.slice(0, i).filter((r) => r.kind !== "line").length);
  return (
    <g data-compare-rows>
      {baselineLabel ? (
        <text x={baseline} y={y + small} textAnchor={baseline > x + width / 2 ? "end" : "middle"} fill={MUTED} fontSize={small} fontFamily={FONT}>{baselineLabel}</text>
      ) : null}
      {rows.map((row, i) => {
        const rowTop = tops[i];
        if (row.kind === "line") {
          return <text key={`line-${i}`} x={x} y={rowTop + small * 1.1} fill={META} fontSize={small} fontFamily={FONT} data-compare-line>{row.text}</text>;
        }
        const p = placed[drawnIndex[i]];
        if (row.kind === "subgroup") {
          const twoLines = stacked(row, width, small);
          const bandY = rowTop + small * 1.45 + (twoLines ? small * 1.3 : 0);
          const band = small * 0.55;
          return (
            <g key={row.fact.id} data-evidence="measured" data-fact={row.fact.id} data-subgroup data-clear={row.clear ? "" : undefined}>
              <title>{p.rangeText ? `${row.lead}: ${row.value}, range ${p.rangeText}` : `${row.lead}: ${row.value}`}</title>
              <text x={x} y={rowTop + small} fill={MUTED} fontSize={small} fontFamily={FONT}>{row.lead}</text>
              <text x={twoLines ? x : x + width} y={rowTop + small * (twoLines ? 2.3 : 1)} textAnchor={twoLines ? "start" : "end"} fill={row.clear ? INK : MUTED} fontSize={small} fontFamily={FONT} data-value>{row.value}</text>
              <line x1={baseline} x2={baseline} y1={bandY - 3} y2={bandY + band + 3} stroke={MUTED} strokeWidth={1} data-baseline />
              {p.low !== null && p.high !== null ? (
                <rect x={p.low} y={bandY} width={Math.max(p.high - p.low, band)} height={band} rx={band / 2} fill="none" stroke={MUTED} strokeWidth={1} />
              ) : null}
              <line x1={p.point} x2={p.point} y1={bandY - 2} y2={bandY + band + 2} stroke={INK} strokeWidth={2} strokeLinecap="round" />
            </g>
          );
        }
        const pooled = row.kind === "pooled";
        const noteY = rowTop + size + small * 1.3;
        const bandY = noteY + small * 0.7;
        const band = size * 0.95;
        return (
          <g key={row.fact.id} data-evidence="measured" data-fact={row.fact.id} data-row={row.kind}>
            <text x={x} y={rowTop + size} fill={INK} fontSize={size} fontFamily={FONT} fontWeight={500}>
              <tspan>{row.lead}</tspan>
              <tspan fill={pooled ? SIGNAL_TEXT : INK} data-point>{row.number}</tspan>
              {row.tail ? <tspan>{row.tail}</tspan> : null}
            </text>
            <text x={x} y={noteY} fill={META} fontSize={small} fontFamily={FONT} data-note>{row.note}</text>
            <line x1={baseline} x2={baseline} y1={bandY - 4} y2={bandY + band + 4} stroke={MUTED} strokeWidth={1.5} data-baseline />
            {p.low !== null && p.high !== null ? (
              <rect x={p.low} y={bandY} width={Math.max(p.high - p.low, band)} height={band} rx={band / 2}
                fill={pooled ? SIGNAL_FILL : "none"} stroke={pooled ? "none" : LINE} strokeWidth={1.5} data-band={pooled ? "" : undefined} />
            ) : null}
            <line x1={p.point} x2={p.point} y1={bandY - 5} y2={bandY + band + 5} stroke={INK} strokeWidth={3} strokeLinecap="round" />
            {p.endsFit && p.lowText && p.highText ? (
              <>
                <text x={p.low!} y={bandY + band + small + 6} textAnchor="middle" fill={META} fontSize={small} fontFamily={FONT}>{p.lowText}</text>
                <text x={p.high!} y={bandY + band + small + 6} textAnchor="middle" fill={META} fontSize={small} fontFamily={FONT}>{p.highText}</text>
              </>
            ) : p.rangeText ? (
              <text x={(p.low! + p.high!) / 2} y={bandY + band + small + 6} textAnchor="middle" fill={META} fontSize={small} fontFamily={FONT} data-range-fallback>{p.rangeText}</text>
            ) : null}
          </g>
        );
      })}
    </g>
  );
}
