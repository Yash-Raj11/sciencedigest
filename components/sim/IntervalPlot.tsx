/**
 * A row-per-estimate plot: a dot for the average, a bar for its 95% range, a
 * vertical rule at zero. A range that reaches the zero rule is drawn grey,
 * because the study cannot tell that result from "no change".
 *
 * Shared by the simulators. It only draws numbers it is handed; every number
 * comes from a fact extracted from the paper (rule H7: no invented metrics).
 */

import type { ResolvedEstimate } from "@/lib/content/types";
import { formatEstimate, signed } from "@/lib/pipeline/format";

export interface PlotRow {
  key: string;
  label: string;
  /** null: the paper's text does not report this combination. */
  estimate: ResolvedEstimate | null;
  strong?: boolean;
}

export function crossesZero(e: ResolvedEstimate): boolean {
  return e.ciLow !== null && e.ciHigh !== null && e.ciLow <= 0 && e.ciHigh >= 0;
}

/** The end of the range nearest zero: the smallest change the data support. */
export function weakEnd(e: ResolvedEstimate): number | null {
  if (e.ciLow === null || e.ciHigh === null || crossesZero(e)) return null;
  return Math.abs(e.ciLow) < Math.abs(e.ciHigh) ? e.ciLow : e.ciHigh;
}

/** Decimal places to print, so 0.5 next to 0.06 reads 0.50. */
export function digitsOf(e: ResolvedEstimate): number {
  const places = (v: number | null) => (v === null || Number.isInteger(v) ? 0 : String(v).split(".")[1].length);
  return Math.max(places(e.point), places(e.ciLow), places(e.ciHigh));
}

export function IntervalPlot({ rows, lowLabel, highLabel }: { rows: PlotRow[]; lowLabel: string; highLabel: string }) {
  const values = rows.flatMap((r) => (r.estimate ? [r.estimate.point, r.estimate.ciLow ?? r.estimate.point, r.estimate.ciHigh ?? r.estimate.point] : []));
  const lo = Math.min(0, ...values);
  const hi = Math.max(0, ...values);
  const pad = (hi - lo || 1) * 0.08;
  const min = lo - pad;
  const max = hi + pad;
  const at = (v: number) => `${((v - min) / (max - min)) * 100}%`;
  const unit = rows.find((r) => r.estimate)?.estimate?.unit ?? "";

  return (
    <div>
      <ul className="space-y-3">
        {rows.map((row) => {
          const e = row.estimate;
          const grey = e ? crossesZero(e) : true;
          const d = e ? digitsOf(e) : 0;
          return (
            <li key={row.key}>
              <p className="flex items-baseline justify-between gap-3">
                <span className={`min-w-0 leading-snug ${row.strong ? "font-medium text-ink" : "text-muted"}`}>{row.label}</span>
                <span className="num shrink-0 text-sm font-medium">{e ? `${e.point > 0 ? "+" : ""}${signed(e.point, d)} ${unit}` : ""}</span>
              </p>
              {e ? (
                <div
                  className="relative mt-1 h-6"
                  role="img"
                  aria-label={`${row.label}: ${formatEstimate(e)}${grey ? ". The range includes zero." : ""}`}
                >
                  <span aria-hidden className="absolute inset-x-0 top-1/2 h-px bg-line" />
                  <span aria-hidden className="absolute inset-y-0 w-0.5 bg-ink" style={{ left: at(0) }} />
                  {e.ciLow !== null && e.ciHigh !== null && (
                    <span
                      aria-hidden
                      className={`absolute top-1/2 h-2.5 -translate-y-1/2 rounded-full ${grey ? "bg-muted/50" : "bg-band"}`}
                      style={{ left: at(e.ciLow), width: `calc(${at(e.ciHigh)} - ${at(e.ciLow)})`, transition: "left 240ms, width 240ms" }}
                    />
                  )}
                  <span
                    aria-hidden
                    className={`absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-bg ${grey ? "bg-muted" : "bg-ink"}`}
                    style={{ left: at(e.point), transition: "left 240ms" }}
                  />
                </div>
              ) : (
                <p className="mt-1 rounded-md border border-dashed border-line px-2.5 py-1 text-sm text-muted">
                  Not reported in the paper&apos;s text. Nothing is filled in.
                </p>
              )}
              {e && e.ciLow !== null && e.ciHigh !== null && (
                <p className="num text-xs text-muted">
                  95% range {signed(e.ciLow, d)} to {signed(e.ciHigh, d)}{grey ? ": includes zero" : ""}
                </p>
              )}
            </li>
          );
        })}
      </ul>
      <p className="mt-3 flex justify-between border-t border-line pt-2 text-xs text-muted" aria-hidden>
        <span>{lowLabel}</span>
        <span>black rule = no change</span>
        <span>{highLabel}</span>
      </p>
    </div>
  );
}
