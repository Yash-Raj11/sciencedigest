/**
 * FIGURE-DESIGN 1B, "the hidden tiredness day", panel 2 and the result box. Pure: the waking day
 * (from the study's dose times and the recording gap, all bound), the two sketch lines, the gap
 * between them, the phases and the box.
 *
 * The lines are a sketch: their heights mean nothing. The shape keeps three rules so it never
 * contradicts the finding (no clear difference in sleep): the gap opens only after the first dose,
 * it narrows as caffeine fades but never closes, and nothing is drawn after bed.
 */

import { wrapLines } from "./crowds-layout";
import { textWidth } from "./interval-layout";

export const TIRED_FRAME = {
  size: 10.5, small: 10, line: 12.5, right: 320,
  left: 8, end: 300, title: 12, top: 30, low: 112, axis: 122, tick: 4,
  marks: 136, doses: 150, bracket: 158, phases: 172, recording: 190, tag: 208, box: 220, boxPad: 10, boxGap: 14,
  /** The gap's depth as a share of the chart, at its widest and at bed: sketch geometry, no data. */
  gap: 0.3, gapAtBed: 0.1, opens: 1.5, start: 0.36, rise: 0.96,
  samples: 64, hatch: 12, stroke: 1.75, minutesPerHour: 60, strong: 500, regular: 400,
} as const;

const F = TIRED_FRAME;

/** The waking day in minutes: wake at 0, the doses, and bed (the last dose plus the recording gap). */
export function day(doses: number[], hoursToBed: number) {
  const last = doses[doses.length - 1];
  const bed = last + hoursToBed * F.minutesPerHour;
  const x = (minutes: number) => F.left + (minutes / bed) * (F.end - F.left);
  return { bed, last, first: doses[0], x };
}

const height = F.low - F.top;
/** Sleep pressure: rises steadily from wake to bed. */
const pressureY = (u: number) => F.low - (F.start + (F.rise - F.start) * u) * height;

/** How far the felt line sits under the pressure line at minute m: zero before the first dose. */
export function gapAt(m: number, first: number, last: number, bed: number): number {
  if (m <= first) return 0;
  const opening = Math.min(1, (m - first) / (F.opens * F.minutesPerHour));
  const fading = m <= last ? 0 : (m - last) / (bed - last);
  const depth = F.gap - (F.gap - F.gapAtBed) * fading;
  return opening * depth * height;
}

/** Both lines and the hatch between them, wake to bed and no further. */
export function tirednessLines(doses: number[], hoursToBed: number, clear: { x: number; half: number } | null = null) {
  const d = day(doses, hoursToBed);
  const pts = Array.from({ length: F.samples + 1 }, (_, i) => {
    const m = (i / F.samples) * d.bed;
    const y = pressureY(m / d.bed);
    return { m, x: d.x(m), y, felt: Math.min(F.low, y + gapAt(m, d.first, d.last, d.bed)) };
  });
  const path = (key: "y" | "felt") => pts.map((p, i) => `${i ? "L" : "M"} ${p.x.toFixed(1)} ${p[key].toFixed(1)}`).join(" ");
  const hatch = pts.filter((_, i) => i % Math.round(F.samples / F.hatch) === 0 && i > 0 && i < F.samples)
    .filter((p) => p.felt - p.y > F.tick)
    .filter((p) => !clear || Math.abs(p.x - clear.x) > clear.half)
    .map((p) => `M ${p.x.toFixed(1)} ${(p.y + 2).toFixed(1)} V ${(p.felt - 2).toFixed(1)}`).join(" ");
  const at = (m: number) => pts.reduce((a, b) => (Math.abs(b.m - m) < Math.abs(a.m - m) ? b : a));
  return { day: d, pressure: path("y"), felt: path("felt"), hatch, at };
}

/** The three phases along the day: the first dose, while the doses are in effect, fading to bed. */
export function phaseSpans(doses: number[], hoursToBed: number) {
  const d = day(doses, hoursToBed);
  const mid = (a: number, b: number) => (d.x(a) + d.x(b)) / 2;
  return [
    { x1: d.x(0), x2: d.x(d.first + (doses[1] - d.first) / 2), mid: mid(0, d.first + (doses[1] - d.first) / 2) },
    { x1: d.x(d.first + (doses[1] - d.first) / 2), x2: d.x(d.last), mid: mid(d.first + (doses[1] - d.first) / 2, d.last) },
    { x1: d.x(d.last), x2: d.x(d.bed), mid: mid(d.last, d.bed) },
  ];
}

export const wrap = (text: string, width: number = F.right, size: number = F.size) => wrapLines(text, width, size);
/** "Sleep recording began 8 hours after the last dose", from a number bound to its fact. */
export const withNumber = (lead: string, n: number, rest: string) => `${lead} ${n} ${rest}`;
/** The box's height for its lines. */
export const boxHeight = (lines: number) => F.boxPad * 2 + lines * F.line;

/** Where the line labels sit: the pressure line's name above it near bed, the felt line's and the gap's mid-day, "narrows" under the felt line near bed. */
export function labelSpots(t: ReturnType<typeof tirednessLines>) {
  const { day: d } = t;
  const bedX = d.x(d.bed);
  const nearBed = t.at(d.last + (d.bed - d.last) * 0.8);
  const middle = t.at((d.first + d.last) / 2);
  return {
    pressure: { x: bedX - F.small, y: nearBed.y - F.small },
    felt: { x: middle.x, y: middle.felt + F.line },
    gap: gapSpot(t),
    narrows: { x: bedX - F.small, y: t.at(d.last).felt + F.line },
    narrowsWidth: (bedX - d.x(d.last)) * 0.9,
  };
}
/**
 * "Hidden tiredness" sits in the gap where it is widest (between the first dose taking hold and the
 * last dose), turned to the lines' slope so it touches neither. The hatch leaves room for it.
 */
export function gapSpot(t: Pick<ReturnType<typeof tirednessLines>, "day" | "at">) {
  const { day: d } = t;
  const open = d.first + F.opens * F.minutesPerHour;
  const centre = t.at((open + d.last) / 2);
  const a = t.at(open), b = t.at(d.last);
  const angle = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
  const y = (centre.y + centre.felt) / 2;
  return { x: centre.x, y, baseline: y + F.size / 3, rotate: `rotate(${angle.toFixed(2)} ${centre.x.toFixed(1)} ${y.toFixed(1)})` };
}
/** The hatch's clear stretch around the gap label. */
export function gapClear(doses: number[], hoursToBed: number, label: string) {
  const spot = gapSpot(tirednessLines(doses, hoursToBed));
  return { x: spot.x, half: textWidth(label, F.size) / 2 + F.tick };
}
/** A phase's bracket: a line under the doses row with short ends pointing down to its name. */
export const bracketPath = (x1: number, x2: number) => `M ${x1 + 2} ${F.bracket + 3} v -3 H ${x2 - 2} v 3`;

export const ends = (d: ReturnType<typeof day>) => ({ wakeX: d.x(0), bedX: d.x(d.bed) });
export const boxWidth = () => F.right - F.boxPad * 2;
