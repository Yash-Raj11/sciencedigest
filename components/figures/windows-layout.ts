/**
 * The eating windows (time-restricted eating). Pure: where each strip, window and bar goes.
 * Left: each group's day, midnight to midnight, with its eating window marked. Right: each group's
 * measured change on one shared scale around no change, so twice the change is twice the length.
 * The only quantities here are the clock's own (a day is twenty-four hours); every value drawn
 * comes from a gated fact handed in by the figure.
 */

export const WINDOWS_FRAME = {
  size: 10.5, small: 9.5,
  title: 14, subtitle: 28, head: 50,
  day: { left: 0, right: 150 },
  bars: { left: 176, right: 316 },
  /** One group: its name, then the strip and the bar side by side, then (full view) the labels under them. */
  row: { first: 72, strip: 7, height: 14, under: 33, step: 54 },
  cap: 3,
} as const;

const F = WINDOWS_FRAME;
const HOURS_IN_DAY = 24;

/** An hour of the day (0 to 24) to its place along the day strip. */
export const dayAt = (hour: number) => F.day.left + (Math.min(Math.max(hour, 0), HOURS_IN_DAY) / HOURS_IN_DAY) * (F.day.right - F.day.left);

/** A shared scale for the changes, centred on no change, wide enough for the largest. */
export function changeScale(points: number[]): (value: number) => number {
  const reach = Math.max(...points.map(Math.abs)) || 1;
  const mid = (F.bars.left + F.bars.right) / 2;
  const half = (F.bars.right - F.bars.left) / 2 - 30;
  return (value) => mid + (value / reach) * half;
}

export const rowTop = (i: number) => F.row.first + i * F.row.step;
export const windowsHeight = (rows: number, full: boolean) => rowTop(rows - 1) + F.row.strip + F.row.height + (full ? 28 : 10);

/** "6:00" from the hour the paper prints. */
export const clock = (hour: number) => `${hour}:00`;

/** The top of the last row. */
export const lastRowTop = (rows: number) => rowTop(rows - 1);

/** A bar from no change to the value, whichever side it falls on (at least a hairline wide). */
export function barSpan(at: (value: number) => number, point: number): { x: number; width: number } {
  return { x: Math.min(at(0), at(point)), width: Math.max(Math.abs(at(point) - at(0)), 1) };
}

/** A change's printed value: just beyond the bar's end, on the side the change went, clear of no change. */
export function valueAt(at: (value: number) => number, point: number): { x: number; anchor: "start" | "end" } {
  return point < 0 ? { x: at(point) - 3, anchor: "end" } : { x: at(point) + 3, anchor: "start" };
}
