/**
 * The "association-curve" figure kind: its spec slots, the params it needs, its sums and
 * its first view. The reader's pick is tested in the browser (tests/browser/simulators.spec.ts).
 */

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { choices, differenceWords, groupLabel, groupOf, pickedGroup, type GroupEdges } from "../components/figures/association-layout";
import { AssociationCurve } from "../components/figures/kinds/AssociationCurve";
import { kindParamsProblems, specProblems, type SpecFact } from "../lib/content/figure-kinds";
import type { ResolvedFact } from "../lib/content/types";

// Made-up facts for the test only, shaped like the steps paper's.
const share = (id: string, point: number): ResolvedFact => ({
  id, kind: "estimate", label: id, quote: "a test passage",
  estimate: { outcome: "Deaths within 10 years, unadjusted", measure: "proportion", point, ciLow: null, ciHigh: null, unit: "%", absolute: true, tier: "low" },
});
const diff = (id: string, point: number, ciLow: number | null, ciHigh: number | null): ResolvedFact => ({
  id, kind: "estimate", label: id, quote: "a test passage",
  estimate: { outcome: "10-year risk of death", measure: "aRD", point, ciLow, ciHigh, unit: "points", absolute: true, tier: "low" },
});
const raw = [share("r0", 40.7), share("r1", 14.1), share("r2", 5.5)];
const adjusted = [diff("a1", -14.9, -18.8, -10.9), diff("a2", -16.5, -20.4, -12.5)];
const cite = (n: number) => ({ n, ref: "threshold" });
const groups: GroupEdges[] = [
  { from: cite(0), to: cite(0), meanAge: { n: 63.7, ref: "ages" } },
  { from: cite(1), to: cite(2), meanAge: { n: 51.5, ref: "ages" } },
  { from: cite(3), to: cite(7) },
];

const FACTS: Record<string, SpecFact> = {
  r0: { kind: "estimate", unit: "%", point: 40.7, ciLow: null, ciHigh: null },
  r1: { kind: "estimate", unit: "%", point: 14.1, ciLow: null, ciHigh: null },
  r2: { kind: "estimate", unit: "%", point: 5.5, ciLow: null, ciHigh: null },
  a1: { kind: "estimate", unit: "points", point: -14.9, ciLow: -18.8, ciHigh: -10.9 },
  a2: { kind: "estimate", unit: "points", point: -16.5, ciLow: -20.4, ciHigh: -12.5 },
  a_no_ci: { kind: "estimate", unit: "points", point: -16.5, ciLow: null, ciHigh: null },
};
const good = { kind: "association-curve", facts: { raw: ["r0", "r1", "r2"] }, simulator: { raw: ["r0", "r1", "r2"], adjusted: ["a1", "a2"] } };
const check = (spec: unknown) => specProblems(spec, "spec", (id) => FACTS[id]).map((p) => `${p.rule} ${p.where}: ${p.message}`);
const shape = (spec: unknown, params: unknown) => kindParamsProblems(spec, params, "simulator").map((p) => `${p.where}: ${p.message}`);

describe("an association-curve spec", () => {
  it("passes with raw shares (no band needed: printed group values) and adjusted differences with their CIs", () => {
    expect(check(good)).toEqual([]);
    expect(shape(good, { groups })).toEqual([]);
  });

  it("H12: an adjusted difference with no range fails; the raw share without one passes", () => {
    expect(check({ ...good, simulator: { ...good.simulator, adjusted: ["a1", "a_no_ci"] } }))
      .toEqual([expect.stringMatching(/^H12 spec\.simulator\.adjusted\[1\]: "a_no_ci" has no range/)]);
  });

  it("refuses the wrong unit (it does not convert), and one fact where a list belongs", () => {
    expect(check({ ...good, facts: { raw: ["r0", "a1", "r2"] } })).toEqual([expect.stringMatching(/raw\[1\]: "a1" is in "points"/)]);
    expect(check({ ...good, facts: { raw: "r0" } })).toEqual([expect.stringMatching(/"raw" is a list of facts/)]);
  });

  it("needs one group per raw share, one adjusted difference per later group, and groups that follow on", () => {
    expect(shape(good, {})).toEqual([expect.stringMatching(/needs params\.groups/)]);
    expect(shape(good, { groups: groups.slice(0, 2) })).toEqual([expect.stringMatching(/2 groups, but 3 raw shares/)]);
    expect(shape({ ...good, simulator: { ...good.simulator, adjusted: ["a1"] } }, { groups })).toEqual([expect.stringMatching(/expected 2, got 1/)]);
    expect(shape(good, { groups: [groups[0], { from: cite(2), to: cite(2) }, groups[2]] })).toEqual([expect.stringMatching(/no gap and no overlap/)]);
    expect(shape(good, { groups: [groups[0], groups[1], { from: cite(7), to: cite(3) }] })).toEqual(expect.arrayContaining([expect.stringMatching(/reversed/)]));
  });
});

describe("its sums", () => {
  it("offers the measured range and nothing outside it; each value falls in one group", () => {
    expect(choices(groups)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    expect(choices(groups).map((v) => groupOf(groups, v))).toEqual([0, 1, 1, 2, 2, 2, 2, 2]);
    expect(groupOf(groups, 8)).toBe(-1);
    expect(groups.map((g) => groupLabel(g))).toEqual(["0 days", "1–2 days", "3–7 days"]);
  });

  it("words the difference as printed: lower, its CI as the study-average range, and a band across zero says so", () => {
    const words = differenceWords(adjusted[0])!;
    expect(words.headline).toBe("14.9 points lower");
    expect(words.bandWords).toBe("−18.8 to −10.9 points");
    expect(words.band.label).toBe("range for the study average");
    expect(words.crossesZero).toBe(false);
    expect(differenceWords(diff("x", 2, -1, 5))!.crossesZero).toBe(true);
    expect(differenceWords(diff("x", -2, null, null))).toBeNull();
  });

  it("a pick in the first group is the comparison; a later pick shows its own difference, raw beside it, and its age", () => {
    expect(pickedGroup(groups, raw, adjusted, null)).toBeNull();
    const zero = pickedGroup(groups, raw, adjusted, 0)!;
    expect(zero).toMatchObject({ comparison: true, label: "0 days", raw: "40.7%", difference: null, meanAge: 63.7 });
    const two = pickedGroup(groups, raw, adjusted, 2)!;
    expect(two).toMatchObject({ comparison: false, label: "1–2 days", raw: "14.1%", firstRaw: "40.7%", meanAge: 51.5 });
    expect(two.difference?.headline).toBe("14.9 points lower");
    expect(pickedGroup(groups, raw, adjusted, 5)!.difference?.headline).toBe("16.5 points lower");
    expect(pickedGroup(groups, raw, adjusted, 5)!.meanAge).toBeNull();
  });
});

describe("its first view", () => {
  const draw = (mode: "card" | "full") => renderToStaticMarkup(createElement(AssociationCurve, {
    mode, raw, adjusted, groups, alt: "Three bars, one for each group.", sourceLine: "From the paper", observational: true,
    who: createElement("p", null, "Who was studied"),
  }));

  it("card: one measured block per group with its printed raw share, labelled raw, and no question", () => {
    const html = draw("card");
    expect(html.match(/data-evidence="measured"/g)).toHaveLength(3);
    expect(html).toContain("40.7%");
    expect(html).toContain("5.5%");
    expect(html).toContain(">Raw</span>");
    expect(html).not.toContain("<input");
  });

  it("full: the same chart, one choice per measured value, nothing picked, no result, and who was studied", () => {
    const html = draw("full");
    expect(html.match(/type="radio"/g)).toHaveLength(8);
    expect(html).not.toContain("checked");
    expect(html).not.toContain("data-adjusted");
    expect(html).toContain("Pick a number");
    expect(html).toContain("data-who");
    expect(html).toContain("it did not assign them to anything");
    expect(html).not.toMatch(/your risk/i);
  });
});
