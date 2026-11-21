/**
 * The fast days (alternate-day fasting). Pure: where each day's bar goes and how tall it is.
 * Two rows of daily bars on one value scale. In the fasting group, fast days and feed days
 * alternate; in the control group every day is the same. The only quantities here are the
 * frame's; every amount drawn comes from a gated fact handed in by the figure.
 */

export const FAST_DAYS_FRAME = {
  size: 10.5, small: 9.5,
  title: 14,
  left: 0, width: 316,
  /** How many days each row draws, and the gap between two bars. A drawing choice, not data. */
  days: 6, gap: 8,
  /** One group: its name, then its bars (bottom-aligned), then (full view) the amounts under them. */
  row: { first: 40, bars: 8, tall: 64, under: 16, step: 118, glanceTall: 36, glanceStep: 66 },
  foot: 26,
} as const;

const F = FAST_DAYS_FRAME;

/** The days a row draws, in order. */
export const DAY_INDEXES: readonly number[] = Array.from({ length: F.days }, (_, i) => i);

/** The fasting group starts on a fast day, then alternates. */
export const isFastDay = (i: number) => i % 2 === 0;

/** The x and width of one day's bar. */
export function dayBar(i: number): { x: number; width: number } {
  const width = (F.width - F.gap * (F.days - 1)) / F.days;
  return { x: F.left + i * (width + F.gap), width };
}

/** The tallest amount sets the scale for both rows, so the bars can be compared. */
export function peakOf(amounts: number[]): number {
  const peak = Math.max(...amounts);
  if (!(peak > 0)) throw new Error("fast days: no positive amount to scale the bars by");
  return peak;
}

/** A bar's height for an amount, on the shared scale. */
export function barHeight(amount: number, peak: number, full = true): number {
  if (!(amount >= 0)) throw new Error(`fast days: "${amount}" is not an amount to draw`);
  return (amount / peak) * (full ? F.row.tall : F.row.glanceTall);
}

/** The top of a group's row, and the line its bars stand on. */
export const rowTop = (i: number, full = true) => F.row.first + i * (full ? F.row.step : F.row.glanceStep);
export const baselineOf = (i: number, full = true) => rowTop(i, full) + F.row.bars + (full ? F.row.tall : F.row.glanceTall);
export const fastDaysHeight = (rows: number, full: boolean) =>
  baselineOf(rows - 1, full) + (full ? F.row.under : 0) + F.foot;

/** "Fast day 489 kcal". */
export const amountText = (word: string, amount: number, unit: string) => `${word} ${amount} ${unit}`;
/** Two amounts on one line. */
export const pairText = (a: string, b: string) => `${a} · ${b}`;
