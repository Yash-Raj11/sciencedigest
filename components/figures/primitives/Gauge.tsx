import { assertEvidence } from "@/lib/content/figures";
import { ACCENT, INK, LINE, MUTED, strokeOf, type Evidence } from "../shared";
import { Label } from "./Label";

/**
 * One result on a line that runs from `min` to `max`, with the point where
 * nothing changed marked. The thick bar is the 95% range; the dot is the
 * average. A range that crosses the mark is drawn grey: no clear change.
 */
export function Gauge({ x, y, width, min, max, value, low, high, label, text, note, kind, fact }: {
  x: number; y: number; width: number; min: number; max: number;
  value: number; low: number | null; high: number | null;
  label: string; text: string; note?: string | null;
} & Evidence) {
  assertEvidence(kind, fact);
  const at = (v: number) => x + ((Math.min(max, Math.max(min, v)) - min) / (max - min)) * width;
  const clear = low !== null && high !== null && (low > 0 || high < 0);
  const colour = clear ? ACCENT : MUTED;
  return (
    <g data-evidence={kind} data-fact={fact.id}>
      <Label x={x} y={y} size={11.5} tone="muted">{label}</Label>
      {note ? <Label x={x + width} y={y} anchor="end" size={11} tone="muted">{note}</Label> : null}
      <line x1={x} x2={x + width} y1={y + 14} y2={y + 14} stroke={LINE} strokeWidth={2} strokeLinecap="round" />
      <line x1={at(0)} x2={at(0)} y1={y + 6} y2={y + 22} stroke={INK} strokeWidth={1.5} />
      {low !== null && high !== null
        ? <line x1={at(low)} x2={at(high)} y1={y + 14} y2={y + 14} stroke={colour} strokeWidth={6} strokeLinecap="round" {...strokeOf(kind)} />
        : null}
      <circle cx={at(value)} cy={y + 14} r={5} fill={kind === "measured" ? INK : "var(--bg)"} stroke={INK} strokeWidth={1.5} />
      <Label x={x} y={y + 38} bold>{text}</Label>
    </g>
  );
}
