/**
 * A frequency grid: "out of every N people, this many". Each dot is one person; a dot drawn
 * hollow is a person the event happened to. Pure: the sums and the words, no React.
 *
 * The owner's rules (2026-11-15):
 *
 *   - N comes from the base rate (the comparison group's printed share): 100 people, or 1,000
 *     when fewer than one person in 100 had the event, so every grid shows at least one event.
 *     All grids in one figure use the same N, so they compare dot for dot.
 *   - A dot is never rounded up. The events are the whole people in rate × N / 100; a remainder
 *     of a half or more is drawn as one half-filled dot (R5: 5.5 → 5 hollow and one half), a
 *     smaller remainder is not drawn. The picture never shows more events than were printed.
 *   - The exact printed rate is in the label ("5.5 died per 100"), whatever the dots show.
 *   - Ordered fill: events fill from the bottom right, a whole row before the next, so each
 *     grid reads as two blocks at a glance.
 */

/** The largest grid drawn. Below one event per 1,000 a grid of dots stops being readable. */
const GRIDS = [100, 1000] as const;
/** Columns per grid size: 10 × 10, and 40 × 25. */
const COLUMNS: Record<number, number> = { 100: 10, 1000: 40 };

/** Rates are printed with one or two decimals; this keeps 5.5 × 100 / 100 from reading 5.499999. */
const tidy = (n: number) => Math.round(n * 1e6) / 1e6;

/** N for a figure, from its base rate (a percentage), or null when even 1,000 dots show no event. */
export function gridSize(baseRate: number): number | null {
  if (!(baseRate > 0) || baseRate > 100) return null;
  return GRIDS.find((n) => tidy((baseRate * n) / 100) >= 1) ?? null;
}

/** How many events a grid of N draws for a rate: whole dots, and whether a half dot follows. Never rounded up. */
export function eventDots(rate: number, n: number): { whole: number; half: boolean } {
  const exact = tidy((rate * n) / 100);
  const whole = Math.floor(exact);
  return { whole, half: tidy(exact - whole) >= 0.5 };
}

export type DotState = "kept" | "event" | "half";
export interface GridDot { x: number; y: number; state: DotState }

/**
 * Every dot of one grid, placed in a square of `size` units at (x, y). Events take the last
 * places in reading order, so they fill the bottom row from the right, then the row above.
 */
export function gridDots(rate: number, n: number, place: { x: number; y: number; size: number }): GridDot[] {
  const columns = columnsOf(n);
  const pitch = place.size / columns;
  const { whole, half } = eventDots(rate, n);
  return Array.from({ length: n }, (_, i) => {
    const fromEnd = n - 1 - i;
    const state: DotState = fromEnd < whole ? "event" : fromEnd === whole && half ? "half" : "kept";
    return {
      x: place.x + pitch * ((i % columns) + 0.5),
      y: place.y + pitch * (Math.floor(i / columns) + 0.5),
      state,
    };
  });
}

const columnsOf = (n: number) => COLUMNS[n] ?? Math.round(Math.sqrt(n));

/** The radius of a dot in a grid of this size, leaving a gap between neighbours. */
export const dotRadius = (n: number, size: number) => (size / columnsOf(n)) * 0.36;

/** The height of a grid drawn `size` wide. */
export const gridHeight = (n: number, size: number) => (size / columnsOf(n)) * Math.ceil(n / columnsOf(n));

const printed = (n: number) => n.toLocaleString("en", { maximumFractionDigits: 6 });

/** "40.7 died per 100": the exact printed rate, in the same words for every grid. */
export const perWords = (rate: number, n: number, event: string) => `${printed(rate)} ${event} per ${printed(n)}`;

/** "Start: 100 people in each group". */
export const startWords = (n: number) => `Start: ${printed(n)} people in each group`;
