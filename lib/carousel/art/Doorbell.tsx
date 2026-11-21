/**
 * The turmeric read's metaphor: a doorbell in the mouth that food presses, so the body hears a
 * meal is coming. The authors propose that pepper presses it; the trial measured no such thing,
 * so the press and the ring are drawn as the claim's line (dashed when proposed).
 */

import { paletteOf } from "../palettes";
import { ART, type Palette } from "../tokens";
import { claim, scenery, solidInk, type Line } from "./line";

export function Doorbell({ line, width = ART.width, pal = paletteOf("dark") }: { line: Line; width?: number; pal?: Palette }) {
  return (
    <svg width={width} height={Math.round((width * ART.height) / ART.width)} viewBox={`0 0 ${ART.width} ${ART.height}`}>
      <rect x={300} y={70} width={240} height={480} rx={60} {...solidInk(pal)} fill={pal.surface} />
      <circle cx={420} cy={250} r={84} {...solidInk(pal)} />
      <circle cx={420} cy={250} r={44} fill={pal.muted} />
      <rect x={380} y={420} width={80} height={36} rx={10} {...scenery(pal)} />
      <circle cx={130} cy={210} r={30} fill={pal.ink} />
      <circle cx={170} cy={262} r={26} fill={pal.ink} />
      <circle cx={116} cy={284} r={22} fill={pal.ink} />
      <path d="M 200 250 L 318 250 M 286 216 L 320 250 L 286 284" {...claim(line, pal)} />
      <path d="M 610 180 C 650 220, 650 280, 610 320" {...claim(line, pal)} />
      <path d="M 680 130 C 750 200, 750 300, 680 370" {...claim(line, pal)} />
      <path d="M 750 80 C 850 180, 850 320, 750 420" {...claim(line, pal)} />
    </svg>
  );
}
