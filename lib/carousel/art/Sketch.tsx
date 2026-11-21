/**
 * A sketch (CLAUDE.md, sketch rule): a shape only, monochrome and dotted, resting on a reviewed
 * concept. "shrink": two outlines, the second smaller, for "less than before". No axis, no value:
 * the sizes say "smaller", never by how much. The slide tags it "Sketch, not data".
 */

import { SHRINK } from "../art-geometry";
import { COLOR, DOTS, STROKE, type Palette } from "../tokens";

export function Shrink({ second, pal = COLOR }: { second: boolean; pal?: Palette }) {
  const h = second ? SHRINK.small : SHRINK.big;
  return (
    <svg width={SHRINK.width} height={SHRINK.height} viewBox={`0 0 ${SHRINK.width} ${SHRINK.height}`}>
      <rect x={SHRINK.inset} y={SHRINK.height - h - STROKE.thin} width={SHRINK.width - SHRINK.inset * 2} height={h} rx={20}
        fill="none" stroke={second ? pal.ink : pal.muted} strokeWidth={STROKE.thin} strokeDasharray={DOTS} strokeLinecap="round" />
    </svg>
  );
}
