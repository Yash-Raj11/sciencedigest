/**
 * The draft stage's menu of figure kinds (lib/pipeline/propose.ts) and the prompt that carries it.
 *
 * The menu must offer only what the lint would accept (a spec built from it passes specProblems),
 * must offer everything the real reads use, must keep H12 (no range, no simulator), and must say
 * when a kind rests on another study only. The prompt must carry the menu and a guide per kind.
 */

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { FIGURE_KINDS, specProblems, type FigureKind } from "../content/figure-kinds";
import { HALF_LIFE_STUDY, REAL_LIBRARY, REAL_STUDIES } from "./fixtures/real-context";
import { gate, type ValidatedFact } from "./gate";
import type { LintContext } from "./lint";
import { EDITORIAL_SYSTEM, KIND_GUIDE, editorialPrompt } from "./prompts";
import { kindMenu, proposeKinds, specFactOf, type KindOffer } from "./propose";

const PAPERS = new URL("../../content/papers/", import.meta.url);
const SLUGS = ["daytime-caffeine-sleep", "steps-days-per-week", "hiit-body-composition", "turmeric-pepper-breakfast"];
const REAL: Pick<LintContext, "studies" | "library"> = { studies: REAL_STUDIES, library: REAL_LIBRARY };
const HALF_LIFE = `${HALF_LIFE_STUDY}/half_life_caffeine`;

function paperFacts(slug: string): Record<string, ValidatedFact> {
  const read = (file: string) => readFileSync(new URL(`${slug}/${file}`, PAPERS), "utf8");
  const result = gate(JSON.parse(read("extraction.json")), read("source.txt"), { role: "paper" });
  if (!result.ok) throw new Error(`${slug}: ${result.errors.join("; ")}`);
  return result.validated.facts;
}
const editorial = (slug: string) => JSON.parse(readFileSync(new URL(`${slug}/editorial.json`, PAPERS), "utf8"));

/** The lint's lookup: the paper's own facts, then a context study's ("<slug>/<fact>"). */
function lookupFor(facts: Record<string, ValidatedFact>) {
  return (id: string) => {
    if (!id.includes("/")) return facts[id] ? specFactOf(facts[id]) : undefined;
    const [slug, fact] = id.split("/");
    const study = REAL_STUDIES[slug];
    return study?.ok && study.validated.facts[fact] ? specFactOf(study.validated.facts[fact]) : undefined;
  };
}

const offerOf = (offers: KindOffer[], kind: FigureKind) => offers.find((o) => o.kind === kind)!;
const ids = (offer: KindOffer, group: "facts" | "simulator", param: string) =>
  offer.slots.find((s) => s.group === group && s.param === param)!.candidates.map((c) => c.id);

/** A gated estimate, as the gate returns one. */
function estimate(id: string, unit: string, point: number, extra: Partial<ValidatedFact> = {}, ci: [number, number] | null = null): ValidatedFact {
  return {
    id, kind: "estimate", label: `the ${id}`, value: String(point), quote: "", span: { start: 0, end: 0 },
    estimate: { outcome: id, measure: "mean", point, ciLow: ci?.[0] ?? null, ciHigh: ci?.[1] ?? null, unit, gradeRef: null, absolute: true, tier: "low" },
    ...extra,
  } as ValidatedFact;
}

describe("the menu of figure kinds, on the real papers", () => {
  it("offers what each real read draws by kind, with the facts it names", () => {
    for (const slug of ["daytime-caffeine-sleep", "steps-days-per-week"]) {
      const spec = editorial(slug).simulator.spec as { kind: FigureKind; facts: Record<string, string | string[]>; simulator: Record<string, string | string[]> };
      const offer = offerOf(proposeKinds(paperFacts(slug), REAL), spec.kind);
      expect(offer.simulator, `${slug}: ${spec.kind} simulator`).toBe(true);
      for (const group of ["facts", "simulator"] as const) {
        for (const [param, named] of Object.entries(spec[group])) {
          for (const id of [named].flat()) expect(ids(offer, group, param), `${slug} ${group}.${param}`).toContain(id);
        }
      }
    }
  });

  it("offers nothing the lint would refuse: a spec built from any offer passes specProblems", () => {
    for (const slug of SLUGS) {
      const facts = paperFacts(slug);
      for (const offer of proposeKinds(facts, REAL).filter((o) => o.still)) {
        for (const group of ["facts", ...(offer.simulator ? ["simulator"] as const : [])] as const) {
          for (const slot of offer.slots.filter((s) => s.group === group)) {
            for (const candidate of slot.candidates) {
              // Every candidate in turn, the other slots filled with their first.
              const spec: Record<string, unknown> = { kind: offer.kind, facts: {}, ...(group === "simulator" ? { simulator: {} } : {}) };
              for (const g of group === "simulator" ? ["facts", "simulator"] as const : ["facts"] as const) {
                for (const s of offer.slots.filter((x) => x.group === g)) {
                  const id = s === slot ? candidate.id : s.candidates[0].id;
                  (spec[g] as Record<string, unknown>)[s.param] = s.many ? [id] : id;
                }
              }
              expect(specProblems(spec, "spec", lookupFor(facts)), `${slug} ${offer.kind} ${group}.${slot.param} = ${candidate.id}`).toEqual([]);
            }
          }
        }
      }
    }
  });

  it("puts the paper's own kind first, and marks a kind that only the library can fill", () => {
    const steps = proposeKinds(paperFacts("steps-days-per-week"), REAL);
    expect(offerOf(steps, "association-curve").anotherStudyOnly).toBe(false);
    expect(offerOf(steps, "decay").anotherStudyOnly).toBe(true);
    const menu = kindMenu(steps);
    expect(menu.indexOf("- association-curve:")).toBeLessThan(menu.indexOf("- decay:"));
    expect(menu).toMatch(/- decay: still view and simulator; ANOTHER STUDY ONLY/);

    const caffeine = proposeKinds(paperFacts("daytime-caffeine-sleep"), REAL);
    expect(offerOf(caffeine, "decay")).toMatchObject({ still: true, simulator: true, anotherStudyOnly: true });
    expect(offerOf(caffeine, "association-curve").still).toBe(false);
    expect(kindMenu(caffeine)).toMatch(/- association-curve: not available \(no gated fact fits raw\)/);
  });

  it("shows ids, labels and units, never a fact's value", () => {
    for (const slug of SLUGS) {
      const facts = paperFacts(slug);
      const offers = proposeKinds(facts, REAL);
      const menu = kindMenu(offers);
      for (const candidate of offers.flatMap((o) => o.slots.flatMap((s) => s.candidates))) {
        const value = candidate.source === "paper" ? facts[candidate.id].value : "5.15 ± 1.21 h";
        expect(menu, `${slug}: ${candidate.id}`).not.toContain(value);
      }
    }
  });
});

describe("the menu keeps the rules", () => {
  const library = (excluded?: Record<string, string>, withdrawn: unknown = null): Pick<LintContext, "studies" | "library"> => {
    const study = REAL_STUDIES[HALF_LIFE_STUDY];
    if (!study.ok) throw new Error("the half-life study must pass the gate");
    return { studies: { [HALF_LIFE_STUDY]: { ...study, excluded, withdrawn } as LintContext["studies"][string] }, library: [HALF_LIFE] };
  };

  it("H12: a fact with no range draws the still view, never a simulator", () => {
    const offers = proposeKinds({ half_life: estimate("half_life", "h", 5) });
    expect(offerOf(offers, "decay")).toMatchObject({ still: true, simulator: false });
    expect(ids(offerOf(offers, "decay"), "simulator", "halfLife")).toEqual([]);
    expect(kindMenu(offers)).toMatch(/- decay: still view only \(no simulator/);
    expect(kindMenu(offers)).not.toMatch(/simulator\.halfLife/);
  });

  it("a fact with a printed spread or CI feeds the simulator, with its band's label", () => {
    const sd = proposeKinds({ half_life: estimate("half_life", "h", 5, { spread: { kind: "sd", value: 1 } as ValidatedFact["spread"] }) });
    expect(offerOf(sd, "decay").slots.find((s) => s.group === "simulator")!.candidates).toEqual([
      expect.objectContaining({ id: "half_life", source: "paper", band: "typical spread between people in this study" }),
    ]);
    const ci = proposeKinds({ half_life: estimate("half_life", "h", 5, {}, [4, 6]) });
    expect(offerOf(ci, "decay").simulator).toBe(true);
  });

  it("refuses the wrong unit and a fact with no number", () => {
    const offers = proposeKinds({
      minutes: estimate("minutes", "min", 300, {}, [200, 400]),
      said: { ...estimate("said", "h", 5), kind: "statement", estimate: undefined },
    });
    expect(offerOf(offers, "decay").still).toBe(false);
    expect(kindMenu(offers)).toMatch(/^No figure kind can be drawn/);
  });

  it("takes a library fact only when it is approved, gated, not excluded and not withdrawn", () => {
    expect(offerOf(proposeKinds({}, library()), "decay")).toMatchObject({ still: true, simulator: true, anotherStudyOnly: true });
    expect(offerOf(proposeKinds({}, { ...library(), library: [] }), "decay").still).toBe(false);
    expect(offerOf(proposeKinds({}, library({ half_life_caffeine: "owner's ruling" })), "decay").still).toBe(false);
    expect(offerOf(proposeKinds({}, library(undefined, { nature: "Retraction", date: null, reason: "" })), "decay").still).toBe(false);
    expect(offerOf(proposeKinds({}, { studies: {}, library: [HALF_LIFE] }), "decay").still).toBe(false);
  });

  it("lists the paper's own fact before the library's", () => {
    const own = estimate("half_life", "h", 5, {}, [4, 6]);
    const offer = offerOf(proposeKinds({ half_life: own }, library()), "decay");
    expect(ids(offer, "simulator", "halfLife")).toEqual(["half_life", HALF_LIFE]);
    expect(offer.anotherStudyOnly).toBe(false);
  });
});

describe("the draft prompt", () => {
  it("has a guide for every figure kind, in the system prompt", () => {
    expect(Object.keys(KIND_GUIDE).sort()).toEqual(Object.keys(FIGURE_KINDS).sort());
    for (const [kind, guide] of Object.entries(KIND_GUIDE)) {
      expect(guide.startsWith(`${kind}:`)).toBe(true);
      expect(EDITORIAL_SYSTEM).toContain(guide);
      expect(guide).not.toMatch(/\d/);
    }
  });

  it("tells the model to pick from the menu and to write ids, never numbers, into a spec", () => {
    expect(EDITORIAL_SYSTEM).toMatch(/choose it from FIGURE KINDS AVAILABLE/);
    expect(EDITORIAL_SYSTEM).toMatch(/Every value in "spec" is a fact id copied from that kind's list/);
    expect(EDITORIAL_SYSTEM).toMatch(/ANOTHER STUDY ONLY/);
    expect(EDITORIAL_SYSTEM).toMatch(/estimate-explorer/);
  });

  it("carries the menu worked out from the same facts", () => {
    const facts = paperFacts("steps-days-per-week");
    const kinds = kindMenu(proposeKinds(facts, REAL));
    const prompt = editorialPrompt({ slug: "x", validated: { facts }, exampleEditorial: "{}", kinds });
    expect(prompt.endsWith(`FIGURE KINDS AVAILABLE (worked out from these facts; pick the simulator from this list only):\n${kinds}`)).toBe(true);
  });
});
