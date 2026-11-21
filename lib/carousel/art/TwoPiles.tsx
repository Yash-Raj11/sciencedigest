/**
 * Interval training's metaphor (the fat-free-mass concept): weight as two piles on one scale.
 * Left, the fat pile; right, everything else, stacked. The arrows are the measured result:
 * fat mass down, fat-free mass up. The piles are drawn the same size: the art shows the
 * direction only, never an amount.
 */

import { paletteOf } from "../palettes";
import { ART, type Palette } from "../tokens";
import { claim, scenery, solidInk, type Line } from "./line";

export function TwoPiles({ line, width = ART.width, pal = paletteOf("dark") }: { line: Line; width?: number; pal?: Palette }) {
  return (
    <svg width={width} height={Math.round((width * ART.height) / ART.width)} viewBox={`0 0 ${ART.width} ${ART.height}`}>
      <rect x={92} y={470} width={720} height={64} rx={22} {...solidInk(pal)} />
      <rect x={392} y={486} width={120} height={32} rx={8} fill={pal.bg} />
      <path d="M 140 548 L 140 590 M 764 548 L 764 590" {...scenery(pal)} />
      <path d="M 150 470 C 150 300, 400 300, 400 470 Z" {...solidInk(pal)} fill={pal.surface} />
      <rect x={504} y={392} width={250} height={78} rx={12} {...solidInk(pal)} />
      <rect x={504} y={314} width={250} height={78} rx={12} {...solidInk(pal)} />
      <rect x={504} y={236} width={250} height={78} rx={12} {...solidInk(pal)} />
      <path d="M 275 70 L 275 250 M 225 200 L 275 250 L 325 200" {...claim(line, pal)} />
      <path d="M 629 210 L 629 40 M 579 90 L 629 40 L 679 90" {...claim(line, pal)} />
    </svg>
  );
}
