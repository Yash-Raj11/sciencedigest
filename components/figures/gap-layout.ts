/**
 * The clean gap (best-possible toothbrushing). Pure: where each bar and label goes. Both bars
 * share one scale, the whole gumline, from none of it to all of it, so a share twice as large is
 * a bar twice as long. Nothing here is a quantity of its own: the values come from gated facts.
 */

export const GAP_FRAME = {
  right: 320, size: 10.5, small: 9.5,
  title: 14, subtitle: 28, axis: 50,
  plot: { left: 0, right: 316 },
  /** One bar: its words above, the bar, then (full view) its value below. */
  row: { first: 66, bar: 8, barHeight: 16, value: 38, step: 62 },
  cap: 4,
} as const;

/** The whole gumline is one hundred per cent: a share's place along the bar. */
export function shareScale(left: number = GAP_FRAME.plot.left, right: number = GAP_FRAME.plot.right): (share: number) => number {
  return (share) => left + (Math.min(Math.max(share, 0), 100) / 100) * (right - left);
}

export const rowTop = (i: number) => GAP_FRAME.row.first + i * GAP_FRAME.row.step;
export const gapHeight = (rows: number, full: boolean) => rowTop(rows - 1) + GAP_FRAME.row.bar + GAP_FRAME.row.barHeight + (full ? 28 : 12);

/** "70%", or "less than 40%" for a value the paper prints only as an upper bound. */
export const shareText = (n: number, below: boolean, lessThan: string) => (below ? `${lessThan} ${n}%` : `${n}%`);
