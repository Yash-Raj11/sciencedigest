/**
 * The eczema scores (ceramide cream and cleanser). Pure: where each group's start and end go.
 * One shared scale runs from 0 (the score's floor, clear skin) at the left to the highest score
 * drawn at the right, so the two groups' lines can be compared. The only quantities here are the
 * frame's; every score drawn comes from a gated fact handed in by the figure.
 */

export const ECZEMA_FRAME = {
  size: 10.5, small: 9.5,
  title: 14,
  left: 0, width: 316,
  /** A dot's radius, and the room kept at each end of the scale so a dot is never cut off. */
  dot: 5,
  /** The start dot is smaller, so the eye reads the line from it to the larger end dot. */
  startDot: 3.5,
  /** The words over the first row's dots sit this far above the line. */
  over: 9,
  /** One group: its name, then its line, then (full view) the scores under it. */
  row: { first: 44, line: 14, under: 34, step: 62, glanceStep: 36 },
  foot: 30,
} as const;

const F = ECZEMA_FRAME;

/** The highest score drawn sets the right end of the scale. */
export function peakOf(scores: number[]): number {
  const peak = Math.max(...scores);
  if (!(peak > 0)) throw new Error("eczema scores: no positive score to scale by");
  return peak;
}

/** A score's place along the scale. */
export function scoreAt(score: number, peak: number): number {
  if (!(score >= 0)) throw new Error(`eczema scores: "${score}" is not a score to draw`);
  return F.left + F.dot + (score / peak) * (F.width - F.dot * 2);
}

/** The top of a group's row, and the height its line sits at. */
export const rowTop = (i: number, full = true) => F.row.first + i * (full ? F.row.step : F.row.glanceStep);
export const lineY = (i: number, full = true) => rowTop(i, full) + F.row.line;
export const eczemaHeight = (rows: number, full: boolean) =>
  lineY(rows - 1, full) + (full ? F.row.under - F.row.line : F.dot) + F.foot;

/** Where the scale's floor sits. */
export const floorAt = () => F.left + F.dot;

/** "14.7 at the start · 8.25 at day 28". */
export const endsText = (start: number, startWord: string, end: number, endWord: string) =>
  `${start} at the ${startWord} · ${end} at ${endWord}`;

/** The tested set comes first and is the one drawn in orange. */
export const isTested = (i: number) => i === 0;

/** Only the first row names its dots ("start", "day 28"); the others line up under it. */
export const namesDots = (i: number) => i === 0;
