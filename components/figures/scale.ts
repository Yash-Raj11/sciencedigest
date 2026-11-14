/**
 * Where a value sits on a line, worked out from the value itself. Figures place
 * their shapes with these, never by eye: twice the time is twice the distance.
 * Pure, and tested in scripts/figure-states.test.ts.
 */

/** Position of `time` between `left` and `right`, on a clock that starts at zero and ends at the last reading. */
export function timeScale(times: number[], left: number, right: number): (time: number) => number {
  const last = Math.max(...times);
  return (time) => left + (last === 0 ? 0 : time / last) * (right - left);
}

/** The narrowest gap between two neighbouring readings: the widest a touch target can be without overlapping. */
export function narrowestGap(times: number[], at: (time: number) => number): number {
  const xs = [...times].sort((a, b) => a - b).map(at);
  return Math.min(...xs.slice(1).map((x, i) => x - xs[i]));
}
