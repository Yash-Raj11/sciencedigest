/**
 * FIGURE-DESIGN 4B, "the order flips" (HIIT): the rules of components/figures/order-layout.ts and
 * the figure's two views, on the real gated read. Each test fails when its rule is broken: rows
 * typed in the wrong order still come out surest first; a subgroup whose range crosses no change
 * prints no point; the result sentence never adds subgroups together; the public card holds no
 * members' fact.
 */

import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  allSubgroups, crossesNoChange, matchSentences, missingWords, subgroupValue, subgroupsFor, summaryWords, surestFirst, type CompareSettings,
} from "../components/figures/order-layout";
import { FigureFor } from "../components/papers/registry";
import type { PaperContent, ResolvedFact } from "../lib/content/types";

const gated = JSON.parse(readFileSync("content/generated/gated.json", "utf8")).content as Record<string, PaperContent>;
const hiit = gated["hiit-body-composition"];
const figure = hiit.layers!.protocol.figure!;
const sim = hiit.simulator.params as unknown as CompareSettings;
const rows = figure.params.rows as { outcome: string; label: string; fact: ResolvedFact }[];
const fact = (id: string) => hiit.facts[id];

describe("4B order and words", () => {
  it("rows come out surest first from the derived grades, whatever order they are typed in", () => {
    expect(surestFirst(rows).map((r) => r.outcome)).toEqual(["ffm", "fm", "bf"]);
    expect(surestFirst([...rows].reverse()).map((r) => r.outcome)).toEqual(["ffm", "fm", "bf"]);
    expect(rows.map((r) => r.fact.estimate!.tier)).toEqual(["high", "moderate", "low"]);
  });
  it("the pitch order is the reverse of the evidence order for the end rows, so the connectors cross", () => {
    const pitch = figure.params.pitch as string[];
    const order = surestFirst(rows).map((r) => r.outcome);
    expect(pitch[0]).not.toBe(order[0]);
    expect(pitch.at(-1)).toBe(order[0]);
  });
  it("a range that crosses no change is said in words, with no point number", () => {
    expect(crossesNoChange(fact("fm_treadmill"))).toBe(true);
    expect(crossesNoChange(fact("fm_all"))).toBe(false);
    const found = subgroupsFor(sim, { modality: "treadmill" }, "fm");
    expect(found.rows).toHaveLength(1);
    expect(subgroupValue(found.rows[0])).toBe("no clear change in this subgroup");
    const cycling = subgroupsFor(sim, { modality: "cycling" }, "fm").rows[0];
    expect(subgroupValue(cycling)).toMatch(/^[−+]\d/);
  });
  it("a pick the paper printed nothing for is listed as not reported, never filled", () => {
    const found = subgroupsFor(sim, { modality: "overground", weeks: "upto8" }, "ffm");
    expect(found.rows).toEqual([]);
    expect(missingWords(found.missing)).toBe("Not reported for this outcome: overground running, 8\u00a0weeks or less.");
  });
  it("no combined number: the sentence counts subgroups per outcome and says they cannot be added", () => {
    const picks = { modality: "cycling", weeks: "over8", frequency: "three", work: "short", rest: "short", restType: "active" };
    const counts = surestFirst(rows).map((r) => ({ label: r.label, n: subgroupsFor(sim, picks, r.outcome).rows.length }));
    const words = matchSentences(counts, true).join(" ");
    expect(words).toContain("Your routine matches 6 tested subgroups for fat.");
    expect(words).toContain("They cannot be added together.");
    // The only numbers in the sentence are the counts: no subgroup estimate, and no sum of them.
    const numbers = [...words.matchAll(/\d+(?:\.\d+)?/g)].map((m) => Number(m[0]));
    expect(numbers).toEqual(counts.filter((c) => c.n).map((c) => c.n));
  });
  it("a routine the paper printed no subgroup for is 'Not tested'; an untouched one says nothing", () => {
    expect(matchSentences([{ label: "Fat", n: 0 }], true)[0]).toMatch(/^Not tested/);
    expect(matchSentences([{ label: "Fat", n: 3 }], false)).toEqual([]);
  });
  it("the collapsed summary counts one outcome's matches, singular and plural", () => {
    expect(summaryWords(6)).toBe("6 subgroup results match your routine");
    expect(summaryWords(1)).toBe("1 subgroup result matches your routine");
    expect(summaryWords(0)).toBe("No subgroup result matches your routine");
  });
  it("an outcome's scale is set from every subgroup it could show", () => {
    expect(allSubgroups(sim, "fm").map((f) => f.id)).toContain("fm_treadmill");
    expect(allSubgroups(sim, "bf").map((f) => f.id)).not.toContain("fm_treadmill");
  });
});

describe("4B views", () => {
  const draw = (props: Record<string, unknown>) =>
    renderToStaticMarkup(createElement(FigureFor, { slug: "hiit-body-composition", figure, ...props }));

  it("the read (simulator params given): the inputs and, under fat-free mass, the hollow leave-one-out row", () => {
    const html = draw({ simulator: hiit.simulator.params });
    expect(html).toContain('data-mode="full"');
    expect(html).toContain('data-row="sensitivity"');
    expect(html).toContain('data-fact="ffm_loo"');
    expect(html).toContain("and the range crosses no change.");
    expect(html.match(/data-pick=/g)?.length).toBe(13);
    expect(html).not.toContain("data-subgroup"); // untouched: no picks, no subgroup rows
    expect(html).not.toContain("data-toggle");
    expect(html).toContain('role="group"'); // a figure with buttons in it is a group, not an image
    expect(html).not.toMatch(/<title>(?!What thirty-six)/); // no tooltip but the frame's own name
  });
  it("the card (glance): the pooled rows only, no inputs, and the simulator is never drawn even if passed", () => {
    const html = draw({ glance: { x: null, y: null }, simulator: hiit.simulator.params });
    expect(html).toContain('data-mode="card"');
    expect(html.match(/data-row="pooled"/g)).toHaveLength(3);
    expect(html).not.toContain("<button");
    expect(html).not.toContain("ffm_loo");
  });
  it("orange budget: pastel on the three pooled bands only, bright orange on the three point numbers only", () => {
    const html = draw({ simulator: hiit.simulator.params });
    expect(html.match(/fill="var\(--signal-evidence-fill\)"/g)).toHaveLength(4); // three bands and the key's swatch
    expect(html.match(/fill="var\(--signal-evidence-text\)"/g)).toHaveLength(3);
  });
});
