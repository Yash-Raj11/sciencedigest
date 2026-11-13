import { assertEvidence } from "@/lib/content/figures";
import { ACCENT, BG, INK, strokeOf, type Evidence } from "../shared";
import { Label } from "./Label";

export interface Bar extends Evidence { label: string; value: number; text: string; note?: string | null }

/** Two sizes side by side on one scale. `max` is the value a full-width bar stands for. */
export function BarPair({ x, y, width, max, gap = 58, bars }: { x: number; y: number; width: number; max: number; gap?: number; bars: [Bar, Bar] }) {
  return (
    <g>
      {bars.map((bar, i) => {
        assertEvidence(bar.kind, bar.fact);
        const top = y + i * gap;
        const measured = bar.kind === "measured";
        return (
          <g key={i} data-evidence={bar.kind} data-fact={bar.fact.id}>
            <Label x={x} y={top} size={11.5} tone="muted">{bar.label}</Label>
            <rect
              x={x} y={top + 7} width={Math.max(2, (bar.value / max) * width)} height={14} rx={3}
              fill={measured ? ACCENT : BG} stroke={measured ? ACCENT : INK} strokeWidth={1.5} {...strokeOf(bar.kind)}
            />
            <Label x={x} y={top + 37} bold>{bar.text}</Label>
            {bar.note ? <Label x={x + width} y={top + 37} anchor="end" tone="muted" size={11}>{bar.note}</Label> : null}
          </g>
        );
      })}
    </g>
  );
}
