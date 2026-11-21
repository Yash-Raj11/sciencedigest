/**
 * The plateau chart: a curve that falls steeply, then levels off, over the paper's own axis.
 * The stretch where it levels off is a pale band; the axis carries a tick for every whole step.
 * Numbers and words sit outside this file (Satori draws no SVG text): the slide places them.
 * Solid orange when measured, dashed ink when proposed. No dots: a dot on a curve reads as data.
 */

import { paletteOf } from "../palettes";
import { STROKE, type Palette } from "../tokens";
import { PLATEAU, type plateauLayout } from "../art-geometry";
import { claim, scenery, type Line } from "./line";

export function Plateau({ at, line, width, pal = paletteOf("dark") }: { at: ReturnType<typeof plateauLayout>; line: Line; width: number; pal?: Palette }) {
  return (
    <svg width={width} height={at.y.height} viewBox={`0 0 ${width} ${at.y.height}`}>
      <rect x={at.band.from} y={at.band.top} width={Math.max(at.band.to - at.band.from, STROKE.main)} height={at.axis - at.band.top} fill={pal["signal-evidence-pale"]} />
      <path d={`M ${at.x0} ${at.axis} L ${at.end} ${at.axis}`} {...scenery(pal)} strokeLinecap="round" />
      {at.ticks.map((t) => (
        <path key={t} d={`M ${t} ${at.axis} L ${t} ${at.axis + PLATEAU.tick}`} stroke={pal.muted} strokeWidth={STROKE.thin / 2} strokeLinecap="round" />
      ))}
      <path d={at.curve} {...claim(line, pal)} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
