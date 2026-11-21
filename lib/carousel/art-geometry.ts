/**
 * Where the art kit's repeated shapes sit, in each motif's own viewBox units. Positions only:
 * nothing here is a value a reader sees. Kept outside lib/carousel/art/ so the art files hold
 * no number outside a geometry prop (the figure guard, eslint.config.mjs).
 */

export const PARKING = { parked: { x: 145, y: 190 }, waiting: { x: 640, y: 180 } } as const;

export const LEDGER_ROWS = [0, 1, 2, 3].map((i) => ({ key: `row-${i}`, y: 230 + i * 78, top: i === 0 }));

/**
 * Where a picture's labels sit, in order, in the art box's units (lib/carousel/tokens.ts ART):
 * beside the part each one names, so the reader never looks away to a legend (spatial contiguity).
 * x and y are the label box's top-left corner; w its width; the text is centred in it.
 */
export interface LabelSlot { x: number; y: number; w: number }
export const PICTURE_LABEL_SLOTS: Record<"parking-spot" | "two-piles" | "ledger" | "ramp" | "doorbell", readonly LabelSlot[]> = {
  // the parked car's bay, the turned-away car, the blocked arrow
  "parking-spot": [{ x: 96, y: 14, w: 308 }, { x: 600, y: 120, w: 290 }, { x: 440, y: 392, w: 200 }],
  // inside the fat pile, inside the stacked pile, between the two arrows
  "two-piles": [{ x: 160, y: 412, w: 230 }, { x: 514, y: 412, w: 230 }, { x: 330, y: 100, w: 250 }],
  // the food-in column's head, the energy-out column's head, the foot of the page
  ledger: [{ x: 112, y: 180, w: 300 }, { x: 492, y: 180, w: 300 }, { x: 112, y: 536, w: 680 }],
  // beside the steep drop, above the level stretch, under the floor
  ramp: [{ x: 230, y: 170, w: 300 }, { x: 560, y: 420, w: 270 }, { x: 80, y: 574, w: 750 }],
  // under what presses, under the bell, under the ring
  doorbell: [{ x: 30, y: 320, w: 240 }, { x: 300, y: 560, w: 240 }, { x: 600, y: 440, w: 270 }],
};

/**
 * The receipts range bar, placed by calculation: the scale runs from the lowest to the highest of
 * the interval's ends and "no difference", with a margin, so the reader sees on which side of
 * "no difference" the whole range falls. Returns x positions in a box `width` wide.
 */
export function intervalLayout(iv: { low: number; point: number; high: number; none: number }, width: number) {
  const pad = 90;
  const lo = Math.min(iv.low, iv.none);
  const hi = Math.max(iv.high, iv.none);
  const span = hi - lo || 1;
  const x = (v: number) => pad + ((v - lo) / span) * (width - 2 * pad);
  const low = x(iv.low), high = x(iv.high), mid = (low + high) / 2;
  const label = 180;
  return {
    low, point: x(iv.point), high, none: x(iv.none),
    /** Left edges of the end labels, pushed apart when the range is too narrow to hold both. */
    lowLabel: Math.min(low - label / 2, mid - label - 8),
    highLabel: Math.max(high - label / 2, mid + 8),
    label,
    track: { from: pad / 2, to: width - pad / 2 },
  };
}

/**
 * A waking day as one line (the hook's "day" art): marks placed by their minutes after waking,
 * the day ending `tail` minutes after the last mark. x positions in a box `width` wide.
 */
export function dayLayout(day: { marks: { minutes: number }[]; tail: { minutes: number } }, width: number) {
  const pad = 24;
  const last = Math.max(...day.marks.map((m) => m.minutes));
  const total = last + day.tail.minutes;
  const x = (minutes: number) => pad + (minutes / total) * (width - 2 * pad);
  return { marks: day.marks.map((m) => x(m.minutes)), last: x(last), end: x(total), start: x(0), label: 220 };
}

/** The shrink sketch: two outlines side by side, the second smaller. Shape only, never a value. */
export const SHRINK = { width: 360, height: 280, big: 250, small: 90, inset: 60 } as const;

/** The verdict marks beside a finding row, in a 64-unit box: an arrow down, an arrow up, "=". */
export const VERDICT_MARK = {
  box: 64,
  lower: "M 32 16 L 32 48 M 20 36 L 32 48 L 44 36",
  higher: "M 32 48 L 32 16 M 20 28 L 32 16 L 44 28",
  same: "M 18 25 L 46 25 M 18 39 L 46 39",
} as const;

/**
 * The plateau chart (why slide): the paper's axis from `from` to `to` in whole steps, the stretch
 * where the curve levels off, and the curve itself. Its height is shape only (the slide says so):
 * a steep fall from the top to the floor, reaching the floor inside the levelling stretch, then flat.
 * Returns positions in a box `width` × PLATEAU.height.
 */
export const PLATEAU = { top: 64, drop: 236, gap: 50, tick: 14, numbers: 18, label: 50, foot: 52, pad: 28, numberBox: 80, compact: 0.45 } as const;

/** `k` scales the chart's own height (1 on the why slide; PLATEAU.compact on an opening slide, under its big heading). */
export function plateauLayout(p: { from: number; to: number; levels: { from: number; to: number } }, width: number, k = 1) {
  const { pad, top } = PLATEAU;
  const floor = top + PLATEAU.drop * k;
  const axis = floor + PLATEAU.gap * k;
  const numbers = axis + PLATEAU.numbers;
  const label = numbers + PLATEAU.label;
  const height = label + PLATEAU.foot;
  const x = (v: number) => pad + ((v - p.from) / (p.to - p.from)) * (width - 2 * pad);
  const x0 = x(p.from), end = x(p.to);
  const bandFrom = x(p.levels.from), bandTo = x(p.levels.to);
  const land = (bandFrom + bandTo) / 2;
  const run = land - x0;
  const curve = `M ${x0} ${top} C ${x0 + run * 0.18} ${top + (floor - top) * 0.72}, ${x0 + run * 0.5} ${floor}, ${land} ${floor} L ${end} ${floor}`;
  const ticks = Array.from({ length: Math.round(p.to - p.from) + 1 }, (_, n) => x(p.from + n));
  const numbersAt = [...new Set([p.from, p.levels.from, p.levels.to, p.to])].map((n) => ({ n, x: x(n) }));
  return { x0, end, axis, band: { from: bandFrom, to: bandTo, top: top - 24 }, curve, ticks, numbers: numbersAt, y: { numbers, label, height } };
}
