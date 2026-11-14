/**
 * The "association-curve" figure kind: its spec slots, the params it needs, its sums and
 * its first view. The reader's pick is tested in the browser (tests/browser/simulators.spec.ts).
 */

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { choices, differenceWords, gridResult, groupLabel, groupOf, pickedGroup, weekGroup, type GroupEdges } from "../components/figures/association-layout";
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

describe("its first view (FIGURE-DESIGN 3B)", () => {
  const words = { event: "died", events: "deaths", years: 10, kept: "Alive at ten years", happened: "Died", later: "Ten years later" };
  const counted = groups.map((g, i) => ({ ...g, died: { n: [257, 75, 107][i], ref: "r" }, total: { n: [632, 532, 1937][i], ref: "r" } }));
  const draw = (mode: "card" | "full") => renderToStaticMarkup(createElement(AssociationCurve, {
    mode, raw, adjusted, groups: counted, alt: "Three grids of dots, one for each group.", sourceLine: "From the paper", observational: true,
    who: createElement("p", null, "Who was studied"), words,
  }));

  it("card: the first two groups as grids of 100 with their exact printed shares; no input, no adjusted strip", () => {
    const html = draw("card");
    expect(html.match(/data-grid="100"/g)).toHaveLength(2);
    expect(html).toContain("40.7 died per 100");
    expect(html).toContain("14.1 died per 100");
    expect(html).not.toContain("5.5 died per 100");
    expect(html).not.toContain("<button");
    expect(html).not.toContain("data-adjusted-strip");
    expect(html).not.toContain("data-band");
  });

  it("card: a dot is never rounded up (40.7 → 40 hollow and a half dot; 14.1 → 14 hollow)", () => {
    const html = draw("card");
    const grids = html.split("data-grid=").slice(1);
    expect(grids[0].match(/data-event/g)).toHaveLength(40);
    expect(grids[0].match(/data-half/g)).toHaveLength(1);
    expect(grids[1].match(/data-event/g)).toHaveLength(14);
    expect(grids[1].match(/data-half/g)).toBeNull();
  });

  it("full: three grids (5.5 → 5 hollow and a half dot, R5), the adjusted strip in pastel, nothing picked, who was studied", () => {
    const html = draw("full");
    expect(html.match(/data-grid="100"/g)).toHaveLength(3);
    expect(html).toContain("5.5 died per 100");
    expect(html.match(/data-band/g)).toHaveLength(2);
    expect(html).toContain("14.9");
    expect(html).not.toMatch(/−14\.9/);
    expect(html.match(/aria-pressed="true"/g)).toBeNull();
    expect(html).not.toContain("data-adjusted=");
    expect(html).toContain("data-who");
    expect(html).toContain("it did not assign them to anything");
    expect(html).not.toMatch(/your risk/i);
    expect(html).not.toContain("<marker");
  });
});

describe("the reader's group in words", () => {
  const words = { event: "died", events: "deaths", years: 10 };
  const counted = groups.map((g, i) => ({ ...g, died: { n: [257, 75, 107][i], ref: "r" }, total: { n: [632, 532, 1937][i], ref: "r" } }));
  it("two days: raw shares with their counts, labelled raw; then the adjusted difference in words with its range", () => {
    const r = gridResult(counted, raw, adjusted, groupOf(groups, 2), words)!;
    expect(r.raw).toBe("In the 1–2 days group, 14.1% died within 10 years (75 of 532), against 40.7% in the 0 days group (257 of 632). Raw.");
    expect(r.adjusted).toBe("Adjusted difference: 14.9 fewer deaths per 100 (10.9 to 18.8).");
    expect(r.range).toBe("Range for the study average.");
  });
  it("no days: the comparison group, with no adjusted difference of its own", () => {
    const r = gridResult(counted, raw, adjusted, 0, words)!;
    expect(r.adjusted).toBeNull();
    expect(r.raw).toMatch(/This is the group the others were compared with\.$/);
  });
  it("the week maps to a group by the days ticked; untouched is no answer", () => {
    expect(weekGroup(groups, null)).toBe(-1);
    expect(weekGroup(groups, [false, false, false, false, false, false, false])).toBe(0);
    expect(weekGroup(groups, [true, false, true, false, false, false, false])).toBe(1);
    expect(weekGroup(groups, [true, true, true, true, true, false, false])).toBe(2);
  });
});
