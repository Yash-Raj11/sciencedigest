/**
 * FIGURE-DESIGN 2B, "the first half hour". Pure: the time scale (bound reading times, to scale),
 * where the curves, the dots, the pastel column, the bracket and the labels go, and the reader's
 * meal from the two switches.
 *
 * The curves are a sketch: their heights are geometry with no meaning (the paper prints no blood
 * sugar values). The rule the shape must keep: the two lines part only inside the pastel column at
 * the 30-minute reading and run together from the 60-minute reading on, so they never show a
 * difference the paper did not find.
 */

import { wrapLines } from "./crowds-layout";

export const HALF_FRAME = {
  size: 10.5, small: 10, line: 12.5, right: 320,
  left: 14, end: 300, column: 36,
  bracket: 22, top: 40, base: 168, ticks: 184, phases: 200, tag: 218, height: 226,
  /** Curve shape at the five readings, as fractions of the chart height: the sketch's geometry, no data. */
  shape: [0, 0.85, 0.55, 0.22, 0.08], samples: 24, dip: 20,
  dot: 2.6, dotLit: 4.2, stroke: 1.75, lit: 500,
} as const;

const F = HALF_FRAME;

/** x for a time in minutes, to scale across the chart: `last` is the final reading. */
export const timeX = (t: number, last: number) => F.left + (t / last) * (F.end - F.left);
const yAt = (share: number) => F.base - share * (F.base - F.top);

/** The shared shape: a smooth curve through the readings' x positions (Catmull-Rom), sampled. */
function sampled(times: number[]): { x: number; y: number }[] {
  const last = times[times.length - 1];
  const pts = times.map((t, i) => ({ x: timeX(t, last), y: yAt(F.shape[i]) }));
  const out: { x: number; y: number }[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let k = 0; k < F.samples; k++) {
      const u = k / F.samples, u2 = u * u, u3 = u2 * u;
      const at = (a: number, b: number, c: number, e: number) => 0.5 * (2 * b + (-a + c) * u + (2 * a - 5 * b + 4 * c - e) * u2 + (-a + 3 * b - 3 * c + e) * u3);
      out.push({ x: at(p0.x, p1.x, p2.x, p3.x), y: Math.min(F.base, at(p0.y, p1.y, p2.y, p3.y)) });
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}

/** How far the lower line sits under the shared shape at x: zero outside the column, by construction. */
export function dipAt(x: number, centre: number): number {
  const off = Math.abs(x - centre);
  if (off >= F.column / 2) return 0;
  const c = Math.cos((Math.PI * off) / F.column);
  return F.dip * c * c;
}

const toPath = (pts: { x: number; y: number }[]) => pts.map((p, i) => `${i ? "L" : "M"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");

/**
 * The two lines. Outside the column they are one line (`shared`, drawn once); inside it the upper
 * line (the plain egg) and the lower line part. The lower line leaves the shared one only there.
 */
export function curves(times: number[], at: number) {
  const pts = sampled(times);
  const centre = timeX(at, times[times.length - 1]);
  const left = centre - F.column / 2, right = centre + F.column / 2;
  const lower = pts.map((p) => ({ x: p.x, y: Math.min(F.base, p.y + dipAt(p.x, centre)) }));
  const inside = (p: { x: number }) => p.x >= left && p.x <= right;
  const before = pts.filter((p) => p.x <= left);
  const after = pts.filter((p) => p.x >= right);
  // Each part runs to the column edge, so the drawn line has no gap.
  const edge = (x: number) => ({ x, y: pts.reduce((a, b) => (Math.abs(b.x - x) < Math.abs(a.x - x) ? b : a)).y });
  const peak = pts.reduce((a, b) => (b.y < a.y ? b : a));
  const lowAtCentre = lower.reduce((a, b) => (Math.abs(b.x - centre) < Math.abs(a.x - centre) ? b : a));
  return {
    whole: toPath(pts),
    shared: [toPath([...before, edge(left)]), toPath([edge(right), ...after])],
    upperIn: toPath([edge(left), ...pts.filter(inside), edge(right)]),
    lowerIn: toPath([edge(left), ...lower.filter(inside), edge(right)]),
    peak, lowAtCentre, centre, lower,
  };
}

export type Meal = "plain" | "pepper" | "both" | "turmeric";
/** The reader's meal from the two switches. */
export const mealOf = (pepper: boolean, turmeric: boolean): Meal => (pepper ? (turmeric ? "both" : "pepper") : turmeric ? "turmeric" : "plain");
/** Pepper meals were the ones that differed (glucose_30, glucose_lower); they draw two curves and the column. */
export const differs = (meal: Meal) => meal === "pepper" || meal === "both";

export const lines = (text: string, width: number, size: number = F.size) => wrapLines(text, width, size);
/** "The clear difference was at 30 minutes." from a number bound to its fact. */
export const withNumber = (lead: string, n: number, rest: string) => `${lead} ${n} ${rest}`;

/** Where the column sits and where the labels beside it go. */
export function labelSpots(centre: number) {
  const colX = centre - F.column / 2;
  const signalX = colX + F.column + F.small;
  const curveX = signalX + F.column * 1.5;
  return { colX, signalX, curveX, curveWidth: F.right - curveX, lowerWidth: F.right - signalX };
}
/** A tick's words: the meal at the start, the minutes after it, the unit on the last one. */
export const tickWords = (times: number[], i: number, unit: string, start: string) =>
  (i === 0 ? start : i === times.length - 1 ? `${times[i]} ${unit}` : `${times[i]}`);
export const lastOf = (times: number[]) => times[times.length - 1];
