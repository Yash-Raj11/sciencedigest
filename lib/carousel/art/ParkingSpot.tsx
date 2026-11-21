/**
 * Caffeine's metaphor (the read's mechanism layer): a tiredness signal that parks on brain cells,
 * and caffeine taking its spot. Left, the bay, with caffeine parked in it. Right, the signal,
 * turned away. The signal and its blocked path are the claim, drawn in the claim's line: dashed,
 * because the paper did not measure the blocking.
 */

import { PARKING } from "../art-geometry";
import { paletteOf } from "../palettes";
import { ART, type Palette } from "../tokens";
import { claim, scenery, solidInk, type Line } from "./line";

function Car({ x, y, look, glass }: { x: number; y: number; look: React.SVGProps<SVGRectElement>; glass: string }) {
  return (
    <g>
      <rect x={x} y={y} width={210} height={300} rx={56} {...look} />
      <rect x={x + 34} y={y + 52} width={142} height={70} rx={18} fill="none" stroke={glass} strokeWidth={10} />
      <rect x={x + 34} y={y + 196} width={142} height={56} rx={16} fill="none" stroke={glass} strokeWidth={10} />
    </g>
  );
}

export function ParkingSpot({ line, width = ART.width, pal = paletteOf("dark") }: { line: Line; width?: number; pal?: Palette }) {
  const signal = claim(line, pal);
  return (
    <svg width={width} height={Math.round((width * ART.height) / ART.width)} viewBox={`0 0 ${ART.width} ${ART.height}`}>
      <path d="M 96 70 L 96 560 L 404 560 L 404 70" {...scenery(pal)} />
      {Car({ ...PARKING.parked, look: solidInk(pal), glass: pal.muted })}
      {Car({ ...PARKING.waiting, look: signal, glass: signal.stroke as string })}
      <path d="M 610 330 L 470 330" {...signal} />
      <path d="M 506 290 L 466 330 L 506 370" {...signal} />
      <path d="M 430 280 L 430 380" stroke={pal.ink} strokeWidth={18} strokeLinecap="round" />
    </svg>
  );
}
