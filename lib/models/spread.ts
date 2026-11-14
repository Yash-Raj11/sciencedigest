/**
 * What range a personal simulator may use, and what it must call it (owner ruling C, 2026-11-14).
 *
 * A gated number can carry one spread, copied from the paper as printed:
 *   sd     mean ± 1 SD      "typical spread between people in this study"
 *   ci95   a 95% CI         "range for the study average"
 *   range  min to max       "range in this study"
 *   iqr    25th to 75th     "middle half of people in this study"
 *
 * An SD is never turned into a CI, nor the reverse: they answer different questions.
 * An SD says how much people differ; a CI says how sure the study is of its average.
 * A personal simulator is about one person, so an SD is the right spread when there is one.
 * An estimate's own ciLow/ciHigh are a 95% CI and are labelled as one.
 *
 * Pure: no imports.
 */

export type SpreadKind = "sd" | "ci95" | "range" | "iqr";

export interface Spread { kind: SpreadKind; value?: number | null; low?: number | null; high?: number | null }

export const SPREAD_LABEL: Record<SpreadKind, string> = {
  sd: "typical spread between people in this study",
  ci95: "range for the study average",
  range: "range in this study",
  iqr: "middle half of people in this study",
};

export interface Band { low: number; high: number; kind: SpreadKind; label: string }

const places = (n: number) => (String(n).split(".")[1] ?? "").length;
/** Removes float noise (5.15 - 1.21 = 3.9400000000000004) without inventing precision. */
const tidy = (n: number, digits: number) => Number(n.toFixed(digits));

/**
 * The band a simulator works from, or null (then there is no simulator: H12).
 * The fact's spread wins; otherwise an estimate's printed 95% CI.
 */
export function simulatorBand(fact: { point: number | null; ciLow: number | null; ciHigh: number | null; spread?: Spread | null }): Band | null {
  const { spread } = fact;
  if (spread) {
    if (spread.kind === "sd") {
      if (fact.point === null || spread.value == null || !(spread.value > 0)) return null;
      const digits = Math.max(places(fact.point), places(spread.value));
      return { low: tidy(fact.point - spread.value, digits), high: tidy(fact.point + spread.value, digits), kind: "sd", label: SPREAD_LABEL.sd };
    }
    if (spread.low == null || spread.high == null || spread.low > spread.high) return null;
    return { low: spread.low, high: spread.high, kind: spread.kind, label: SPREAD_LABEL[spread.kind] };
  }
  if (fact.ciLow === null || fact.ciHigh === null) return null;
  return { low: fact.ciLow, high: fact.ciHigh, kind: "ci95", label: SPREAD_LABEL.ci95 };
}
