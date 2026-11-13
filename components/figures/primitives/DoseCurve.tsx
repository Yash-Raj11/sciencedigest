import { assertEvidence } from "@/lib/content/figures";
import { ACCENT, LINE, strokeOf, type Evidence } from "../shared";

/**
 * A level over time, through the points the paper reports and no others.
 * `times` and `levels` are the paper's numbers; the frame scales them. Use it
 * only when the paper prints the values: a curve with invented points is a
 * claim, however smooth it looks.
 */
export function DoseCurve({ x, y, width, height, times, levels, kind, fact }: {
  x: number; y: number; width: number; height: number; times: number[]; levels: number[];
} & Evidence) {
  assertEvidence(kind, fact);
  const lastTime = Math.max(...times);
  const top = Math.max(...levels);
  const points = times.map((time, i) => `${x + (time / lastTime) * width},${y + height - (levels[i] / top) * height}`);
  return (
    <g data-evidence={kind} data-fact={fact.id}>
      <line x1={x} x2={x + width} y1={y + height} y2={y + height} stroke={LINE} strokeWidth={1.5} />
      <polyline points={points.join(" ")} fill="none" stroke={ACCENT} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" {...strokeOf(kind)} />
      {kind === "measured" ? points.map((point) => {
        const [cx, cy] = point.split(",").map(Number);
        return <circle key={point} cx={cx} cy={cy} r={3.5} fill={ACCENT} />;
      }) : null}
    </g>
  );
}
