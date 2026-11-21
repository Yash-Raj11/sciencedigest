/**
 * The hook's day: waking to bed as one line, a cup at each time the study set, and a bracket over
 * the stretch from the last cup to bed. Positions come from dayLayout (lib/carousel/art-geometry.ts),
 * fed by the paper's own times; the words are drawn by the slide.
 */

import type { dayLayout } from "../art-geometry";
import { COLOR, STROKE, type Palette } from "../tokens";

function Cup({ cx, pal }: { cx: number; pal: Palette }) {
  return (
    <g>
      <path d={`M ${cx - 26} 40 L ${cx + 26} 40 L ${cx + 20} 100 L ${cx - 20} 100 Z`} fill={pal["signal-evidence-fill"]} />
      <path d={`M ${cx + 24} 54 C ${cx + 50} 54, ${cx + 50} 86, ${cx + 22} 86`} stroke={pal["signal-evidence-fill"]} strokeWidth={STROKE.thin} fill="none" />
      <path d={`M ${cx - 8} 8 C ${cx - 18} 18, ${cx + 2} 24, ${cx - 8} 34 M ${cx + 10} 8 C ${cx} 18, ${cx + 20} 24, ${cx + 10} 34`} stroke={pal.muted} strokeWidth={STROKE.thin / 2} fill="none" />
    </g>
  );
}

export function Day({ at, width, height, pal = COLOR }: { at: ReturnType<typeof dayLayout>; width: number; height: number; pal?: Palette }) {
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <path d={`M ${at.start} 140 L ${at.end} 140`} stroke={pal.line} strokeWidth={STROKE.thin + 2} strokeLinecap="round" />
      {at.marks.map((x) => <g key={x}>{Cup({ cx: x, pal })}</g>)}
      <path d={`M ${at.last} 214 L ${at.last} 240 L ${at.end} 240 L ${at.end} 214`} stroke={pal.ink} strokeWidth={STROKE.thin / 2 + 1} fill="none" />
      <circle cx={at.start} cy={140} r={14} fill={pal.ink} />
      <circle cx={at.end} cy={140} r={14} fill={pal.ink} />
    </svg>
  );
}
