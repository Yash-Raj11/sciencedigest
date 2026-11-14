/**
 * Layout for the glance view (owner, 2026-11-14): the feed card's still figure. Axis labels
 * only, no numeric ticks or values; the gated range as a peach band. Shapes are placed from the
 * gated facts, so the shape is the study's even though no number is printed.
 *
 * Pure: positions only. The drawings live in components/figures/kinds/ and the papers' figures.
 */

import type { ResolvedFact } from "@/lib/content/types";
import { simulatorBand } from "@/lib/models/spread";
import type { GroupEdges } from "./association-layout";
import type { Frame } from "./decay-layout";

/** The glance chart: room above for the y label, below for the x label. */
export const GLANCE_FRAME = { left: 14, top: 36, width: 292, height: 118, figureHeight: 192, size: 13, labelGap: 26 };

export const glanceChart: Frame = GLANCE_FRAME;

/** Where the axis labels go: the y label over the left axis, the x label under the right end. */
export function glanceAxes(frame: Frame = GLANCE_FRAME) {
  const bottom = frame.top + frame.height;
  return {
    left: frame.left, right: frame.left + frame.width, top: frame.top, bottom,
    yLabel: { x: frame.left, y: frame.top - GLANCE_FRAME.size },
    xLabel: { x: frame.left + frame.width, y: bottom + GLANCE_FRAME.labelGap },
  };
}

/** The comparison group has no adjusted difference of its own; every other group has one. */
export const glanceDrawable = (groups: GroupEdges[], adjusted: ResolvedFact[]): boolean => groups.length > 0 && adjusted.length === groups.length - 1;

export interface GlanceColumn {
  /** The fact this column draws: the group's adjusted difference (none for the comparison group). */
  fact: ResolvedFact | null;
  mid: number;
  width: number;
  /** The peach band's top and bottom, when the fact has a range. */
  band: { top: number; bottom: number } | null;
  /** The point estimate, or the zero line for the comparison group. */
  pointY: number;
}

/**
 * The association glance: one column per group, as wide as the values it covers. The first
 * group is the comparison and sits on the line of no difference; every other group shows its
 * adjusted difference from it as a band with its point. The scale runs from the far end of the
 * widest band to zero, so the line of no difference is always inside the chart.
 */
export function associationGlance(groups: GroupEdges[], adjusted: ResolvedFact[], frame: Frame = GLANCE_FRAME) {
  const values = groups.flatMap((g) => [g.from.n, g.to.n]);
  const first = Math.min(...values);
  const count = Math.max(...values) - first + 1;
  const column = frame.width / Math.max(count, 1);
  const gap = column * 0.3;
  const bands = adjusted.map((fact) => {
    const e = fact.estimate;
    return e ? simulatorBand({ point: e.point, ciLow: e.ciLow, ciHigh: e.ciHigh, spread: fact.spread ?? null }) : null;
  });
  const ends = [0, ...bands.flatMap((b) => (b ? [b.low, b.high] : [])), ...adjusted.map((f) => f.estimate?.point ?? 0)];
  const low = Math.min(...ends);
  const high = Math.max(...ends);
  const span = high - low || 1;
  const pad = frame.height * 0.08;
  const y = (n: number) => frame.top + pad + ((high - n) / span) * (frame.height - 2 * pad);
  const columns: GlanceColumn[] = groups.map((group, i) => {
    const x = frame.left + (group.from.n - first) * column + gap / 2;
    const width = (group.to.n - group.from.n + 1) * column - gap;
    const fact = i === 0 ? null : adjusted[i - 1] ?? null;
    const band = i === 0 ? null : bands[i - 1];
    return {
      fact, mid: x + width / 2, width,
      band: band ? { top: y(band.high), bottom: y(band.low) } : null,
      pointY: fact?.estimate ? y(fact.estimate.point) : y(0),
    };
  });
  return { zeroY: y(0), columns };
}
