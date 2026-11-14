/**
 * A small range bar: where a printed range sits against "no difference", with its two ends and
 * zero labelled. The range is a peach surface (--band); the point is a short mark. Used under a
 * simulator's result and on a finding card, where the range replaces the words "95% CI" (owner,
 * 2026-11-14: no confidence intervals outside the Receipts; the bar shows the range instead).
 *
 * `accent` draws the point in the screen's one orange (inside a data-accent-slot only).
 */

import { BAND_FRAME, bandPlace } from "./association-layout";
import { Label } from "./primitives";
import { ACCENT_TEXT, BAND, INK, MUTED } from "./shared";
import type { Band } from "@/lib/models/spread";

export function BandStrip({ band, point, label, accent = false }: { band: Band; point: number; label: string; accent?: boolean }) {
  const place = bandPlace(band, point);
  const { y, thickness, size, labelY, height } = BAND_FRAME;
  return (
    <svg viewBox={`0 0 320 ${height}`} className="block w-full max-w-[360px]" role="img" aria-label={label} data-band>
      <rect x={place.low} y={y} width={Math.max(place.high - place.low, thickness)} height={thickness} rx={7} fill={BAND} />
      <line x1={place.point} x2={place.point} y1={y - 6} y2={y + thickness + 6} stroke={accent ? ACCENT_TEXT : INK} strokeWidth={4} strokeLinecap="round" />
      <line x1={place.zero} x2={place.zero} y1={y - 10} y2={y + thickness + 10} stroke={MUTED} strokeWidth={1.5} />
      <Label x={place.zero} y={size} anchor="end" tone="muted" size={size}>no difference</Label>
      <Label x={place.low} y={labelY} anchor="middle" tone="muted" size={size}>{place.lowWords}</Label>
      <Label x={place.high} y={labelY} anchor="middle" tone="muted" size={size}>{place.highWords}</Label>
      <Label x={place.zero} y={labelY} anchor="middle" tone="muted" size={size}>{place.zeroWords}</Label>
    </svg>
  );
}
