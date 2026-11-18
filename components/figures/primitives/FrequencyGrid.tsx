/**
 * A frequency grid: one dot per person, out of N (components/figures/frequency-layout.ts holds
 * the rules: N from the base rate, never round a dot up, half dot, ordered fill). A filled dot is
 * a person the event did not happen to; a hollow dot is one it did; a half-filled dot is the
 * printed remainder of a half or more. Drawn as measured: it must rest on a printed share.
 *
 * `tone` "dim" greys the whole grid (another group than the reader's); it never changes a count.
 */

import { assertEvidence } from "@/lib/content/figures";
import type { ResolvedFact } from "@/lib/content/types";
import { dotRadius, gridDots } from "../frequency-layout";
import { META, SIGNAL_TEXT } from "../shared";

export function FrequencyGrid({ x, y, size, n, fact, tone = "ink" }: {
  x: number; y: number; size: number; n: number; fact: ResolvedFact; tone?: "ink" | "dim";
}) {
  assertEvidence("measured", fact);
  const rate = fact.estimate?.point;
  if (rate === undefined) return null;
  const r = dotRadius(n, size);
  const fill = tone === "ink" ? SIGNAL_TEXT : META;
  const opacity = tone === "ink" ? 1 : 0.45;
  return (
    <g data-evidence="measured" data-fact={fact.id} data-grid={n} opacity={opacity}>
      {gridDots(rate, n, { x, y, size }).map((dot, i) =>
        dot.state === "kept" ? <circle key={i} cx={dot.x} cy={dot.y} r={r} fill={fill} />
        : dot.state === "event" ? <circle key={i} cx={dot.x} cy={dot.y} r={r * 0.82} fill="none" stroke={META} strokeWidth={1.1} data-event />
        : (
          <g key={i} data-half>
            <circle cx={dot.x} cy={dot.y} r={r * 0.82} fill="none" stroke={META} strokeWidth={1.1} />
            <path d={`M ${dot.x} ${dot.y - r} A ${r} ${r} 0 0 0 ${dot.x} ${dot.y + r} Z`} fill={fill} />
          </g>
        ),
      )}
    </g>
  );
}
