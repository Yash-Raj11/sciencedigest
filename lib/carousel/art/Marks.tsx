/** The small marks beside a finding row: "=" for no clear difference, an arrow for lower or higher. */

import { VERDICT_MARK } from "../art-geometry";
import { COLOR, STROKE, type Palette } from "../tokens";

export function VerdictMark({ verdict, size, pal = COLOR }: { verdict: string; size: number; pal?: Palette }) {
  const ink = pal["signal-evidence-text"];
  const path = verdict === "lower" ? VERDICT_MARK.lower : verdict === "higher" ? VERDICT_MARK.higher : VERDICT_MARK.same;
  const box = VERDICT_MARK.box;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${box} ${box}`}>
      <circle cx={box / 2} cy={box / 2} r={box / 2 - 2} fill={pal["signal-evidence-soft"]} />
      <path d={path} stroke={ink} strokeWidth={STROKE.thin - 2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}
