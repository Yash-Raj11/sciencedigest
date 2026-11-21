/**
 * The receipts slide's range bar: the headline result's 95% interval as a solid orange bar (the
 * paper measured it), its point as a dot, and "no difference" as a quiet upright line. Positions
 * come from intervalLayout (lib/carousel/art-geometry.ts); the numbers are printed beside it by
 * the slide, from the gated estimate.
 */

import type { intervalLayout } from "../art-geometry";
import { COLOR, STROKE, type Palette } from "../tokens";
import { scenery } from "./line";

export function Interval({ at, width, height, pal = COLOR }: { at: ReturnType<typeof intervalLayout>; width: number; height: number; pal?: Palette }) {
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <path d={`M ${at.track.from} ${height / 2} L ${at.track.to} ${height / 2}`} stroke={pal.line} strokeWidth={STROKE.thin} />
      <path d={`M ${at.none} 0 L ${at.none} ${height}`} {...scenery(pal)} />
      <path d={`M ${at.low} ${height / 2} L ${at.high} ${height / 2}`} stroke={pal["signal-evidence-fill"]} strokeWidth={STROKE.main * 2} strokeLinecap="round" />
      <circle cx={at.point} cy={height / 2} r={STROKE.main * 1.6} fill={pal.ink} stroke={pal.bg} strokeWidth={STROKE.thin} />
    </svg>
  );
}
