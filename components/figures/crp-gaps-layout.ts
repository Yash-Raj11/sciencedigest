/**
 * The pooled CRP gaps (sugar and inflammation markers). Pure: the frame, and the words under
 * each row. The bands themselves are placed by interval-layout.ts, so this figure follows the
 * owner's interval rules (baseline 0 for a difference, end labels bound to the fact). Every value
 * drawn comes from a gated fact handed in by the figure.
 */

export const CRP_FRAME = {
  size: 10.5, small: 9.5,
  title: 14, plot: 26,
  left: 0, width: 316,
  /** Full view: one interval row is this tall. */
  row: 58,
  /** Glance view: a row's name, then its band. */
  glance: { first: 52, band: 8, height: 10, step: 34 },
} as const;

const F = CRP_FRAME;

/** "6 trials, 403 people". */
export const sizeText = (trials: number, trialsWord: string, people: number, peopleWord: string) =>
  `${trials} ${trialsWord}, ${people} ${peopleWord}`;

/** The top of a glance row. */
export const glanceRowTop = (i: number) => F.glance.first + i * F.glance.step;

/** Full view: the title, the plot, then a line for the unit. Glance: the rows only. */
export const crpHeight = (rows: number, full: boolean, plotHeight: number) =>
  full ? F.plot + plotHeight + F.small * 2 : glanceRowTop(rows - 1) + F.glance.band + F.glance.height + F.small;

/** The headline comparison comes first and is the one pastel band. */
export const isHeadline = (i: number) => i === 0;

/** The top of the last glance row. */
export const lastGlanceRowTop = (rows: number) => glanceRowTop(rows - 1);

/** All rows of one plot share a measure: the first row's. */
export const measureOf = (estimates: { measure: string }[]) => estimates[0].measure;
