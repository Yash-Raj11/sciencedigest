/**
 * A week as seven small boxes. A group of days "from–to" is drawn honestly: the first `from`
 * boxes are ticked solid (every person in the group had at least that many), the boxes up to
 * `to` are ticked faint (some did), the rest are empty. No box is ticked for a day nobody in the
 * group reached. Counts come from the group's printed edges.
 */

import { INK, LINE, META } from "../shared";

export function WeekStrip({ x, y, width, from, to, tone = "ink" }: { x: number; y: number; width: number; from: number; to: number; tone?: "ink" | "dim" }) {
  const days = Array.from({ length: 7 }, (_, i) => i);
  const pitch = width / 7;
  const box = pitch * 0.78;
  const ink = tone === "ink" ? INK : META;
  return (
    <g data-week from={from} to={to} opacity={tone === "ink" ? 1 : 0.45}>
      {days.map((d) => {
        const bx = x + d * pitch + (pitch - box) / 2;
        const state = d < from ? "solid" : d < to ? "faint" : "empty";
        return (
          <g key={d}>
            <rect x={bx} y={y} width={box} height={box} rx={2} fill="none" stroke={state === "empty" ? LINE : ink} strokeWidth={1} opacity={state === "faint" ? 0.55 : 1} />
            {state !== "empty" ? (
              <path d={`M ${bx + box * 0.22} ${y + box * 0.52} L ${bx + box * 0.42} ${y + box * 0.74} L ${bx + box * 0.8} ${y + box * 0.28}`}
                fill="none" stroke={ink} strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" opacity={state === "faint" ? 0.55 : 1} />
            ) : null}
          </g>
        );
      })}
    </g>
  );
}

export const weekStripHeight = (width: number) => (width / 7) * 0.78;
