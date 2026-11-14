/**
 * An interval plot in SVG (components/figures/interval-layout.ts holds the rules): one row per
 * printed estimate, its 95% range as a band, its point as a short mark, one "no difference"
 * line from the measure (0 for a difference, 1 for a ratio, log scale). End labels are the
 * fact's own ends; when they would overlap, the range is written under the row instead.
 *
 * `emphasis` "signal": the paper's key result, a pastel band (the one pastel zone of the
 * figure); "outline": the same band as an outline, for a row that is not the reader's group.
 * Each row's label comes in three parts so its number can be the figure's bright orange.
 */

import { assertEvidence } from "@/lib/content/figures";
import type { ResolvedFact } from "@/lib/content/types";
import { intervalLayout, scaleOf } from "../interval-layout";
import { FONT, INK, LINE, META, MUTED, SIGNAL_FILL, SIGNAL_TEXT } from "../shared";

export interface IntervalRowSpec {
  fact: ResolvedFact;
  label: { lead: string; number: string; tail: string };
  emphasis: "signal" | "outline";
}

export function IntervalPlot({ x, y, width, rows, mirror = false, baselineLabel, size = 13, rowHeight = 58 }: {
  x: number; y: number; width: number; rows: IntervalRowSpec[]; mirror?: boolean; baselineLabel: string; size?: number; rowHeight?: number;
}) {
  for (const row of rows) assertEvidence("measured", row.fact);
  const estimates = rows.map((r) => r.fact.estimate!);
  const scale = scaleOf(estimates[0]?.measure ?? "");
  const { baseline, rows: placed } = intervalLayout(estimates, scale, { left: x, width, size }, { mirror, baselineLabel });
  const band = size * 0.95;
  const top = y + size * 1.6;
  return (
    <g data-interval-plot>
      <text x={baseline} y={y + size} textAnchor={baseline > x + width / 2 ? "end" : "start"} fill={MUTED} fontSize={size} fontFamily={FONT}>{baselineLabel}</text>
      {rows.map((row, i) => {
        const p = placed[i];
        const rowTop = top + i * rowHeight;
        const bandY = rowTop + size * 1.5;
        const signal = row.emphasis === "signal";
        return (
          <g key={row.fact.id} data-evidence="measured" data-fact={row.fact.id} data-emphasis={row.emphasis}>
            <text x={x} y={rowTop + size} fill={INK} fontSize={size} fontFamily={FONT} fontWeight={500}>
              <tspan>{row.label.lead}</tspan>
              <tspan fill={signal ? SIGNAL_TEXT : INK}>{row.label.number}</tspan>
              <tspan>{row.label.tail}</tspan>
            </text>
            <line x1={baseline} x2={baseline} y1={bandY - 9} y2={bandY + band + 9} stroke={MUTED} strokeWidth={1.5} data-baseline />
            {p.low !== null && p.high !== null ? (
              <rect x={p.low} y={bandY} width={Math.max(p.high - p.low, band)} height={band} rx={band / 2}
                fill={signal ? SIGNAL_FILL : "none"} stroke={signal ? "none" : LINE} strokeWidth={1.5} data-band={signal ? "" : undefined} />
            ) : null}
            <line x1={p.point} x2={p.point} y1={bandY - 5} y2={bandY + band + 5} stroke={INK} strokeWidth={3} strokeLinecap="round" />
            {p.endsFit && p.lowText && p.highText ? (
              <>
                <text x={p.low!} y={bandY + band + size + 4} textAnchor="middle" fill={META} fontSize={size} fontFamily={FONT}>{p.lowText}</text>
                <text x={p.high!} y={bandY + band + size + 4} textAnchor="middle" fill={META} fontSize={size} fontFamily={FONT}>{p.highText}</text>
              </>
            ) : p.rangeText ? (
              <text x={(p.low! + p.high!) / 2} y={bandY + band + size + 4} textAnchor="middle" fill={META} fontSize={size} fontFamily={FONT} data-range-fallback>{p.rangeText}</text>
            ) : null}
          </g>
        );
      })}
    </g>
  );
}

export const intervalPlotHeight = (rows: number, size = 13, rowHeight = 58) => size * 1.6 + rows * rowHeight;
