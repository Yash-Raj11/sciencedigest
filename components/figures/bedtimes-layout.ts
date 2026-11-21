/**
 * The bedtimes (sleep restriction and sweet foods). Pure: where each night's sleep goes.
 * One strip runs from evening to morning; each schedule's sleep is a bar from the time the teens
 * fell asleep to the time they woke, as the paper prints them ("0:34", "22:06"). The only
 * quantities here are the clock's own and the frame's; every time drawn comes from a gated fact
 * handed in by the figure.
 */

export const BEDTIMES_FRAME = {
  size: 10.5, small: 9.5,
  title: 14, head: 36,
  night: { left: 4, right: 316 },
  /** One schedule: its name, then the bar, then (full view) the times under it and the hours. */
  row: { first: 58, bar: 6, height: 16, under: 34, hours: 48, step: 74, glanceStep: 40 },
  cap: 3,
} as const;

const F = BEDTIMES_FRAME;
const HOURS_IN_DAY = 24;
const MINUTES_IN_HOUR = 60;
/** The strip runs from this hour in the evening ... */
const NIGHT_STARTS = 21;
/** ... for this many hours, to the next morning. */
const NIGHT_HOURS = 12;

/** "0:34" or "22:06", as the paper prints a clock time, to hours after midnight. */
export function hourOf(text: string): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec(text.trim());
  if (!m) throw new Error(`bedtimes: "${text}" is not a clock time`);
  return Number(m[1]) + Number(m[2]) / MINUTES_IN_HOUR;
}

/** A clock time to its place along the night strip; the evening wraps before midnight. */
export function nightAt(hour: number): number {
  const sinceStart = (((hour - NIGHT_STARTS) % HOURS_IN_DAY) + HOURS_IN_DAY) % HOURS_IN_DAY;
  return F.night.left + (Math.min(sinceStart, NIGHT_HOURS) / NIGHT_HOURS) * (F.night.right - F.night.left);
}

/** Where midnight falls on the strip. */
export const midnightAt = () => nightAt(0);

/** A night's sleep, from falling asleep to waking, as an x and a width. */
export function sleepSpan(onset: string, wake: string): { x: number; width: number } {
  const x = nightAt(hourOf(onset));
  return { x, width: Math.max(nightAt(hourOf(wake)) - x, 1) };
}

/** The full view leaves room under each bar for its times and hours; the glance view does not. */
export const rowTop = (i: number, full = true) => F.row.first + i * (full ? F.row.step : F.row.glanceStep);
export const lastRowBottom = (rows: number, full = true) => rowTop(rows - 1, full) + F.row.bar + F.row.height;
export const bedtimesHeight = (rows: number, full: boolean) => lastRowBottom(rows, full) + (full ? 40 : 10);

/** "Fell asleep 0:34": a printed time with the words before it. */
export const timeText = (words: string, time: string) => `${words} ${time}`;

/** "6.7 hours slept · 6.5 hours in bed allowed". */
export const hoursText = (slept: number, sleptWords: string, inBed: number, inBedWords: string) =>
  `${slept} ${sleptWords} · ${inBed} ${inBedWords}`;
