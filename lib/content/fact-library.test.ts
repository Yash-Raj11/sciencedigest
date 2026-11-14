/**
 * The fact library (lib/content/fact-library.ts): what may enter it, and the lookup order a
 * simulator input follows. Each bad entry breaks one rule and must be refused by name.
 */

import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { loadContext } from "../../scripts/context-load";
import { libraryFor, libraryProblems, LibraryFile, simulatorSource, type LibraryStudy } from "./fact-library";

const entry = (over: Record<string, unknown> = {}) => ({
  ref: "half-life-study/half_life", quantity: "caffeine-half-life",
  approved: { by: "owner", on: "2026-11-14" }, note: "Arm A only.", ...over,
});
const sdFact = { kind: "estimate", estimate: { point: 5.15, ciLow: null, ciHigh: null }, spread: { kind: "sd" as const, value: 1.21 } };
const study = (over: Partial<Extract<LibraryStudy, { ok: true }>> = {}): LibraryStudy => ({
  ok: true, withdrawn: null, excluded: {},
  facts: {
    half_life: sdFact,
    point_only: { kind: "estimate", estimate: { point: 5, ciLow: null, ciHigh: null } },
    said_so: { kind: "statement" },
    arm_d: sdFact,
  },
  ...over,
});
const problems = (facts: unknown[], studies: Record<string, LibraryStudy> = { "half-life-study": study() }) => libraryProblems({ facts }, studies);

describe("the fact library", () => {
  it("accepts an owner-approved estimate of a gated context study that prints a spread", () => {
    expect(problems([entry()])).toEqual([]);
  });

  it("refuses an entry that is not a context fact, or is not approved by the owner, or has no note", () => {
    expect(problems([entry({ ref: "half_life" })])).toEqual([expect.stringMatching(/ref: a context fact/)]);
    expect(problems([entry({ approved: { by: "assistant", on: "2026-11-14" } })])).toHaveLength(1);
    expect(problems([entry({ note: " " })])).toEqual([expect.stringMatching(/note: say what the fact covers/)]);
    expect(problems([entry({ point: 5.15 })])).toHaveLength(1); // no number of its own
  });

  it("refuses a fact of a missing, gate-failed or withdrawn study", () => {
    expect(problems([entry()], {})).toEqual([expect.stringMatching(/no context study "half-life-study"/)]);
    expect(problems([entry()], { "half-life-study": { ok: false } })).toEqual([expect.stringMatching(/failed the gate/)]);
    expect(problems([entry()], { "half-life-study": study({ withdrawn: { nature: "Retraction" } }) })).toEqual([expect.stringMatching(/withdrawn/)]);
  });

  it("refuses an excluded fact, an unknown fact, a fact with no number and a number with no spread (H12)", () => {
    expect(problems([entry({ ref: "half-life-study/arm_d" })], { "half-life-study": study({ excluded: { arm_d: "Arm D" } }) }))
      .toEqual([expect.stringMatching(/the owner excluded this fact \(Arm D\)/)]);
    expect(problems([entry({ ref: "half-life-study/nope" })])).toEqual([expect.stringMatching(/"nope" is not a verified fact/)]);
    expect(problems([entry({ ref: "half-life-study/said_so" })])).toEqual([expect.stringMatching(/a statement; a library fact is an estimate/)]);
    expect(problems([entry({ ref: "half-life-study/point_only" })])).toEqual([expect.stringMatching(/no printed spread/)]);
  });

  it("refuses the same fact twice, and two facts for one quantity", () => {
    expect(problems([entry(), entry()])).toEqual(expect.arrayContaining([expect.stringMatching(/listed twice/)]));
    expect(problems([entry(), entry({ ref: "half-life-study/arm_d" })])).toEqual([expect.stringMatching(/already in the library/)]);
  });

  it("finds a fact by its quantity", () => {
    const file = LibraryFile.parse({ facts: [entry()] });
    expect(libraryFor(file, "caffeine-half-life")?.ref).toBe("half-life-study/half_life");
    expect(libraryFor(file, "melatonin-half-life")).toBeUndefined();
  });
});

describe("where a simulator input comes from", () => {
  const paper = { half_life: {} };
  const library = ["half-life-study/half_life"];
  it("the paper's own fact first, then the approved library, otherwise missing", () => {
    expect(simulatorSource("half_life", paper, library)).toBe("paper");
    expect(simulatorSource("half-life-study/half_life", paper, library)).toBe("library");
    expect(simulatorSource("half-life-study/other", paper, library)).toBe("missing");
    expect(simulatorSource("half-life-study/half_life", paper, [])).toBe("missing");
    expect(simulatorSource("not_in_paper", paper, library)).toBe("missing");
  });
});

describe("the real library", () => {
  it("content/library.json passes against content/context/, and holds the caffeine half-life", () => {
    const root = fileURLToPath(new URL("../../content/", import.meta.url));
    const loaded = loadContext(`${root}context`, `${root}concepts`);
    expect(loaded.libraryErrors).toEqual([]);
    expect(loaded.context.library).toEqual(["caffeine-saliva-half-life/half_life_caffeine"]);
  });
});
