/**
 * The steps read's metaphor: a ramp that drops steeply, then levels off (the paper's plateau).
 * The curve is the measured shape only: no axis, no values, no tick, and no dots (a dot on a
 * curve reads as a data point).
 */

import { paletteOf } from "../palettes";
import { ART, type Palette } from "../tokens";
import { claim, scenery, type Line } from "./line";

export function Ramp({ line, width = ART.width, pal = paletteOf("dark") }: { line: Line; width?: number; pal?: Palette }) {
  return (
    <svg width={width} height={Math.round((width * ART.height) / ART.width)} viewBox={`0 0 ${ART.width} ${ART.height}`}>
      <path d="M 80 560 L 830 560" {...scenery(pal)} />
      <path d="M 90 60 C 200 360, 300 440, 470 480 S 720 500, 830 500" {...claim(line, pal)} />
    </svg>
  );
}
