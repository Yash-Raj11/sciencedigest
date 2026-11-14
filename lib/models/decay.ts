/**
 * First-order decay: an amount that halves every half-life.
 *
 * The half-life is never written here. It comes from a gated fact, and a
 * personal estimate is only ever a range, worked out from that fact's own
 * range (rule H12). Pure: no imports.
 */

export interface Range { low: number; high: number }

function check(hours: number, halfLife: number): void {
  if (!Number.isFinite(hours) || hours < 0) throw new Error("decay: hours must be zero or more");
  if (!Number.isFinite(halfLife) || halfLife <= 0) throw new Error("decay: a half-life must be above zero");
}

/** The share still there after `hours`: one half-life leaves a half, two leave a quarter. */
export function fractionLeft(hours: number, halfLife: number): number {
  check(hours, halfLife);
  return 0.5 ** (hours / halfLife);
}

export function amountLeft(amount: number, hours: number, halfLife: number): number {
  if (!Number.isFinite(amount) || amount < 0) throw new Error("decay: an amount must be zero or more");
  return amount * fractionLeft(hours, halfLife);
}

/** What is left, as a range: the short end of the half-life leaves the least, the long end the most. */
export function amountLeftRange(amount: number, hours: number, halfLife: Range): Range {
  if (halfLife.low > halfLife.high) throw new Error("decay: the half-life range is reversed");
  return { low: amountLeft(amount, hours, halfLife.low), high: amountLeft(amount, hours, halfLife.high) };
}

/** Points of the curve from zero to `lastHour`, evenly spaced, as shares of the starting amount. */
export function decayCurve(halfLife: number, lastHour: number, steps: number): { hour: number; share: number }[] {
  if (!Number.isInteger(steps) || steps < 1) throw new Error("decay: a curve needs at least one step");
  return Array.from({ length: steps + 1 }, (_, i) => {
    const hour = (lastHour * i) / steps;
    return { hour, share: fractionLeft(hour, halfLife) };
  });
}
