/**
 * The crossover design (owner, 2026-11-14) and the excluded arm of a context study.
 *
 * A crossover is graded as randomised only when the paper names the crossover AND says
 * the order was randomised, and no passage says it was not. Built on the caffeine
 * half-life study (content/context/caffeine-saliva-half-life/), which says
 * "cross over design" in one sentence and "Block randomization" in another.
 */

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { loadStudy } from "../../scripts/context-load";
import { gate } from "./gate";
import { causalLanguagePermitted, deriveTier } from "./grade";
import { lint, type ContextStudyState } from "./lint";

const DIR = new URL("../../content/context/caffeine-saliva-half-life/", import.meta.url);
const SLUG = "caffeine-saliva-half-life";
const source = readFileSync(new URL("source.txt", DIR), "utf8");
const extraction = JSON.parse(readFileSync(new URL("extraction.json", DIR), "utf8"));
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const BLOCK = "Block randomization in blocks of four was used to ensure complete counterbalancing of the sequence of study days and to minimize systematic bias.";

function gateWith(mutate: (x: any) => void, text = source) {
  const x = clone(extraction);
  mutate(x);
  return gate(x, text, { role: "context" });
}
const errorsOf = (result: ReturnType<typeof gate>) => (result.ok ? [] : result.errors);

describe("crossover design", () => {
  it("the half-life paper passes as a randomised crossover, graded low (n = 12 is under 50)", () => {
    const result = gateWith(() => {});
    expect(errorsOf(result)).toEqual([]);
    if (!result.ok) return;
    expect(result.validated.design).toBe("crossover");
    expect(deriveTier({ design: "crossover", species: "human", sampleSize: result.validated.sampleSize, reportedGrade: null })).toBe("low");
    expect(deriveTier({ design: "crossover", species: "human", sampleSize: 60, reportedGrade: null })).toBe("moderate");
    expect(causalLanguagePermitted("crossover", "human")).toBe(true);
  });

  it("refuses a crossover whose randomisation is negated", () => {
    const negated = "Randomization was not possible, so every subject had the arms in the same order.";
    const result = gateWith((x) => { x.facts.find((f: any) => f.id === "randomization_blocks").quote = negated; x.facts.find((f: any) => f.id === "randomization_blocks").value = "Randomization was not possible"; }, source.replace(BLOCK, negated));
    expect(errorsOf(result)).toEqual([expect.stringContaining("design: a passage says the crossover was not randomised")]);
  });

  it("refuses a design passage that calls the crossover non-randomised", () => {
    const quote = "The in vivo study was performed in a non-randomised cross over design with four different study arms.";
    const result = gateWith((x) => { x.design.quote = quote; }, `${source}\n${quote}\n`);
    expect(errorsOf(result)).toEqual([expect.stringContaining("design: a passage says the crossover was not randomised")]);
  });

  it("refuses a crossover with no passage about randomisation", () => {
    const result = gateWith((x) => { x.facts = x.facts.filter((f: any) => !/randomi[sz]/i.test(f.quote ?? "")); });
    expect(errorsOf(result)).toEqual([expect.stringContaining("design: a crossover needs a passage saying the order was randomised")]);
  });

  it("refuses a crossover whose design passage does not name the crossover", () => {
    const result = gateWith((x) => { x.design.quote = BLOCK; });
    expect(errorsOf(result)).toEqual([expect.stringContaining('design: the quoted passage does not support "crossover"')]);
  });

  it("leaves rct as it was: block randomisation alone does not make an rct", () => {
    const result = gateWith((x) => { x.design = { value: "rct", quote: BLOCK }; });
    expect(errorsOf(result)).toEqual([expect.stringContaining('design: the quoted passage does not support "rct"')]);
  });
});

describe("rct: a negated randomisation is refused (owner ruling B, 2026-11-14)", () => {
  it.each([
    ["non-randomized", "This was a non-randomized controlled trial in healthy adults."],
    ["not randomised", "Participants were not randomised; they chose their own group."],
    ["quasi-randomized", "We ran a quasi-randomized trial in which allocation followed the day of the week."],
    ["randomization was not possible", "A randomized design was planned, but randomization was not possible at the second site."],
  ])("%s", (_name, quote) => {
    const result = gateWith((x) => { x.design = { value: "rct", quote }; }, `${source}\n${quote}\n`);
    expect(errorsOf(result)).toEqual([expect.stringContaining("design: the quoted passage says the trial was not (truly) randomised")]);
  });

  it("a plain randomized passage still passes as an rct", () => {
    const quote = "Participants were randomized to the four study arms by block randomization.";
    expect(errorsOf(gateWith((x) => { x.design = { value: "rct", quote }; }, `${source}\n${quote}\n`))).toEqual([]);
  });
});

describe("spread (ruling C): copied as printed, never converted", () => {
  const withSpread = (spread: unknown, patch: (f: any) => void = () => {}) => gateWith((x) => {
    const f = x.facts.find((g: any) => g.id === "half_life_caffeine");
    f.spread = spread;
    patch(f);
  });

  it("the half-life is a mean with an SD, and the validated fact carries it", () => {
    const result = gateWith(() => {});
    expect(result.ok && result.validated.facts.half_life_caffeine).toMatchObject({
      kind: "estimate", estimate: { measure: "mean", point: 5.15, ciLow: null, ciHigh: null, unit: "h" }, spread: { kind: "sd", value: 1.21 },
    });
  });
  it("refuses an SD that is not printed in the quote", () => {
    expect(errorsOf(withSpread({ kind: "sd", value: 1.31 }))).toEqual([expect.stringContaining("the sd 1.31 does not appear in the quoted passage")]);
  });
  it("refuses an SD written as two ends (that would be a conversion)", () => {
    expect(errorsOf(withSpread({ kind: "sd", value: 1.21, low: 3.94, high: 6.36 }))).toEqual([expect.stringContaining("an sd spread has a value, not low and high")]);
  });
  it("refuses a CI made up from the SD (its ends are not printed)", () => {
    expect(errorsOf(withSpread({ kind: "ci95", low: 4.47, high: 5.83 }))).toEqual([expect.stringContaining("4.47, 5.83 (ci95) do not both appear")]);
  });
  it("refuses reversed ends and a spread on a fact that is not an estimate", () => {
    expect(errorsOf(withSpread({ kind: "range", low: 6.36, high: 3.94 }))).toEqual([expect.stringContaining("the range ends are reversed")]);
    const result = gateWith((x) => { x.facts.find((g: any) => g.id === "funding").spread = { kind: "sd", value: 1 }; });
    expect(errorsOf(result)).toEqual([expect.stringContaining("fact funding: a spread belongs to an estimate")]);
  });
});

describe("the excluded arm: only caffeine alone (arm A) is usable", () => {
  const loaded = loadStudy(DIR.pathname.replace(/\/$/, ""));
  const paper = new URL("../../content/papers/daytime-caffeine-sleep/", import.meta.url);
  const paperSource = readFileSync(new URL("source.txt", paper), "utf8");
  const gated = gate(JSON.parse(readFileSync(new URL("extraction.json", paper), "utf8")), paperSource);
  if (!gated.ok) throw new Error(gated.errors.join("\n"));
  const editorial = JSON.parse(readFileSync(new URL("editorial.json", paper), "utf8"));
  const contextErrors = (sentence: string, state: ContextStudyState = loaded) => {
    const ed = clone(editorial);
    ed.sections.find((x: { id: string }) => x.id === "parallel").paragraphs.push(sentence);
    return lint(gated.validated, ed, paperSource, { allowLegacyShape: true, context: { studies: { [SLUG]: state }, concepts: {} } })
      .errors.filter((e) => e.rule === "context").map((e) => e.message);
  };

  it("loads with the co-administration arm excluded and arm A kept", () => {
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    expect(Object.keys(loaded.excluded ?? {})).toContain("t12_caffeine_d");
    expect(loaded.excluded).not.toHaveProperty("half_life_caffeine");
    expect(loaded.excluded).not.toHaveProperty("t12_caffeine_a");
    expect(loaded.validated.facts.half_life_caffeine.value).toBe("5.15 ± 1.21 h");
  });

  it("accepts a citation of arm A's half-life (and the check is live: an unknown fact is refused)", () => {
    expect(contextErrors(`Another study measured a caffeine half-life of 5.15 hours. [${SLUG}/half_life_caffeine]`)).toEqual([]);
    expect(contextErrors(`Another study measured a caffeine half-life of 5.15 hours. [${SLUG}/no_such_fact]`)).toEqual([expect.stringContaining("no verified fact")]);
  });

  it("refuses a citation of the co-administration arm (15.33 ± 10.75 h)", () => {
    expect(contextErrors(`With other compounds the half-life was 15.33 hours. [${SLUG}/t12_caffeine_d]`))
      .toEqual([expect.stringContaining(`cites "${SLUG}/t12_caffeine_d", which is excluded from use: Arm D`)]);
  });

  it("an exclusion list that names an unknown fact, or gives no reason, fails the source", async () => {
    const { mkdtempSync, writeFileSync, copyFileSync } = await import("node:fs");
    const { tmpdir } = await import("node:os");
    const scratch = mkdtempSync(`${tmpdir()}/excluded-`);
    copyFileSync(new URL("source.txt", DIR), `${scratch}/source.txt`);
    copyFileSync(new URL("extraction.json", DIR), `${scratch}/extraction.json`);
    writeFileSync(`${scratch}/excluded.json`, JSON.stringify({ made_up: "a reason", t12_caffeine_d: "" }));
    const state = loadStudy(scratch);
    expect(!state.ok && state.errors).toEqual([
      'excluded.json names "made_up", which is not a verified fact',
      'excluded.json: "t12_caffeine_d" needs a reason',
    ]);
  });
});
