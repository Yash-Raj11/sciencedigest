/**
 * An interval plot: one row per estimate, a band for its printed 95% range, a mark for its
 * point, and one vertical "no difference" line. Pure: where things go and what the labels say.
 *
 * The owner's rules (2026-11-15):
 *
 *   - The baseline comes from the measure. A difference (mean difference, risk difference ...)
 *     has no difference at 0; a ratio (hazard, odds, risk ratio) at 1, on a log scale, so a
 *     halving and a doubling sit the same distance from the line.
 *   - The end labels are bound to the fact: they are the fact's own printed ends, never typed.
 *   - When the end labels would overlap at phone width, they are not drawn at the ends; the
 *     range is written under the row instead ("10.9 to 18.8"), so no label sits on another.
 *
 * `mirror` draws a row of negative differences as sizes to the right of the line, for a figure
 * whose words carry the direction ("fewer deaths per 100"): the labels drop the minus sign,
 * because the words already say which way (rule "direction").
 */

export type Scale = "difference" | "ratio";

const RATIOS = /^(a?HR|a?OR|a?RR|IRR|RoM|ratio|hazard ratio|odds ratio|risk ratio)$/i;

/** Whether a measure is a ratio or a difference, from the extraction's `measure`. */
export const scaleOf = (measure: string): Scale => (RATIOS.test(measure.trim()) ? "ratio" : "difference");

/** Where "no difference" sits on that scale. */
export const baselineOf = (scale: Scale): number => (scale === "ratio" ? 1 : 0);

export interface Interval { point: number; ciLow: number | null; ciHigh: number | null }

export interface IntervalFrame { left: number; width: number; size: number }

/** Width of a label in figure units: a sans face averages a little over half its size per character. */
export const textWidth = (text: string, size: number) => text.length * size * 0.56;

const decimals = (v: number | null) => (v === null || Number.isInteger(v) ? 0 : String(v).split(".")[1].length);
const printed = (v: number, places: number) => v.toLocaleString("en", { minimumFractionDigits: places, maximumFractionDigits: places });
const MINUS = "−";
const signedWords = (v: number, places: number) => (v < 0 ? `${MINUS}${printed(-v, places)}` : printed(v, places));

export interface PlacedRow {
  low: number | null; high: number | null; point: number;
  lowText: string | null; highText: string | null; pointText: string;
  /** The range in words, for under the row when the end labels do not fit. */
  rangeText: string | null;
  /** False: the end labels would overlap each other, the baseline label or the frame edge. */
  endsFit: boolean;
}

/**
 * Place every row on one shared scale. All rows of one plot share a unit and a measure; rows
 * of different units are separate plots (FIGURE-DESIGN 4B: rows never share a value axis).
 */
export function intervalLayout(rows: Interval[], scale: Scale, frame: IntervalFrame, options: { mirror?: boolean; baselineLabel?: string } = {}) {
  const base = baselineOf(scale);
  const flip = options.mirror ? -1 : 1;
  const t = (v: number) => (scale === "ratio" ? Math.log(v) : v) * flip;
  const tb = scale === "ratio" ? 0 : base;
  const values = rows.flatMap((r) => [r.point, r.ciLow ?? r.point, r.ciHigh ?? r.point]).filter((v) => scale !== "ratio" || v > 0);
  const ts = [tb, ...values.map(t)];
  let lo = Math.min(...ts);
  let hi = Math.max(...ts);
  const pad = (hi - lo || 1) * 0.04;
  lo -= pad; hi += pad;
  // Inset the scale by half the widest end label, so a label centred on an end stays in the frame.
  const allPlaces = Math.max(...rows.flatMap((r) => [decimals(r.point), decimals(r.ciLow), decimals(r.ciHigh)]), 0);
  const widest = Math.max(0, ...values.map((v) => textWidth(options.mirror ? printed(Math.abs(v), allPlaces) : signedWords(v, allPlaces), frame.size)));
  const inset = widest / 2 + 1;
  const x = (v: number) => frame.left + inset + ((t(v) - lo) / (hi - lo)) * (frame.width - 2 * inset);
  const baseline = frame.left + inset + ((tb - lo) / (hi - lo)) * (frame.width - 2 * inset);
  const baselineHalf = options.baselineLabel ? textWidth(options.baselineLabel, frame.size) / 2 : 0;

  const placed: PlacedRow[] = rows.map((r) => {
    const places = Math.max(decimals(r.point), decimals(r.ciLow), decimals(r.ciHigh));
    const words = (v: number) => (options.mirror ? printed(Math.abs(v), places) : signedWords(v, places));
    const hasRange = r.ciLow !== null && r.ciHigh !== null;
    // On a mirrored row the printed low end (−18.8) is drawn on the right: order the ends by where they sit.
    const ends = hasRange ? [r.ciLow!, r.ciHigh!].sort((a, b) => x(a) - x(b)) : [];
    const low = hasRange ? x(ends[0]) : null;
    const high = hasRange ? x(ends[1]) : null;
    const lowText = hasRange ? words(ends[0]) : null;
    const highText = hasRange ? words(ends[1]) : null;
    let endsFit = hasRange;
    if (hasRange) {
      const lw = textWidth(lowText!, frame.size);
      const hw = textWidth(highText!, frame.size);
      const gap = frame.size * 0.5;
      // Centred under each end: they must not touch each other, the frame, or the baseline label.
      if (low! + lw / 2 + gap > high! - hw / 2) endsFit = false;
      if (low! - lw / 2 < frame.left - 1 || high! + hw / 2 > frame.left + frame.width + 1) endsFit = false;
      if (baselineHalf > 0) {
        for (const [c, w] of [[low!, lw], [high!, hw]] as const) {
          if (Math.abs(c - baseline) < w / 2 + baselineHalf + gap) endsFit = false;
        }
      }
    }
    return {
      low, high, point: x(r.point), lowText, highText, pointText: words(r.point),
      rangeText: hasRange ? `${lowText} to ${highText}` : null,
      endsFit,
    };
  });
  return { baseline, rows: placed };
}
