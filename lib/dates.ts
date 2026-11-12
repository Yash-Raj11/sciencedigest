/**
 * Calendar-date arithmetic on "YYYY-MM-DD" strings.
 *
 * A tick belongs to the user's local calendar day, not to a moment in time.
 * Everything here therefore works on plain date strings and never touches a
 * time zone, except localToday(), which reads the device's own calendar.
 */

const DAY_MS = 86_400_000;

function toEpochDay(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / DAY_MS);
}

function fromEpochDay(day: number): string {
  return new Date(day * DAY_MS).toISOString().slice(0, 10);
}

export function addDays(date: string, days: number): string {
  return fromEpochDay(toEpochDay(date) + days);
}

/** Whole days from `earlier` to `later`. Negative if `later` is before. */
export function diffDays(later: string, earlier: string): number {
  return toEpochDay(later) - toEpochDay(earlier);
}

/** Monday of the ISO week containing `date`. Matches date_trunc('week') in Postgres. */
export function isoWeekStart(date: string): string {
  const day = toEpochDay(date);
  // 1970-01-01 was a Thursday, so epoch day 0 is weekday index 3 when Monday is 0.
  const weekday = (((day + 3) % 7) + 7) % 7;
  return fromEpochDay(day - weekday);
}

/** 0 = Monday ... 6 = Sunday. */
export function isoWeekday(date: string): number {
  return (((toEpochDay(date) + 3) % 7) + 7) % 7;
}

/** The device's local calendar date. The only function here that reads a clock. */
export function localToday(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function isDateString(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && fromEpochDay(toEpochDay(value)) === value;
}
