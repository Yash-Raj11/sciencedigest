/**
 * Figures: what the content build refuses (2C).
 *
 * Same method as the other pipeline tests: start from a read that passes,
 * break exactly one thing, and check that the right rule objects. The read is
 * the three-layer caffeine fixture with one figure in its mechanism layer.
 */

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { EVIDENCE_KEY, FIGURE_KEYS, assertEvidence, evidenceKindProblem, evidenceKindsIn } from "../content/figures";
import { assemble } from "./assemble";
import { approved, checkConcept } from "./concepts";
import { gate } from "./gate";
import { BANNED_TERMS, SENTENCE_WORDS, THROAT_CLEARING, lint, type LintContext } from "./lint";

const dir = new URL("../../content/papers/daytime-caffeine-sleep/", import.meta.url);
const source = readFileSync(new URL("source.txt", dir), "utf8");
const gated = gate(JSON.parse(readFileSync(new URL("extraction.json", dir), "utf8")), source);
if (!gated.ok) throw new Error(gated.errors.join("\n"));
const validated = gated.validated;

const oldShape = JSON.parse(readFileSync(new URL("editorial.json", dir), "utf8"));
const fixture = JSON.parse(readFileSync(new URL("fixtures/layered-caffeine.json", import.meta.url), "utf8"));
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

const context: LintContext = {
  studies: {},
  concepts: {
    "non-rem-sleep": checkConcept(approved(fixture.concepts["non-rem-sleep"], "2026-11-13T00:00:00Z"),
      { banned: BANNED_TERMS, throatClearing: THROAT_CLEARING, maxSentenceWords: SENTENCE_WORDS.fail }),
  },
};

const FIGURE = {
  figure: "lock-and-key",
  caption: "How caffeine acts, as the paper describes it. [adenosine_block]",
  alt: "A lock holding a blank key, with the real key left outside. [-]",
  params: {
    lock: { kind: "proposed", fact: "fact:adenosine_block" },
    found: { kind: "measured", fact: "fact:sleep_same" },
    gap: { n: 8, ref: "recording" },
  },
};

function read(): any {
  const base = Object.fromEntries(Object.entries(clone(oldShape)).filter(([key]) => !["sections", "limitations", "figure", "layers", "glossary"].includes(key)));
  const layers = clone(fixture.layers);
  layers.mechanism.figure = clone(FIGURE);
  return { ...base, layers, glossary: clone(fixture.glossary) };
}
function run(mutate: (editorial: any) => void = () => {}, figures: readonly string[] | null = FIGURE_KEYS) {
  const editorial = read();
  mutate(editorial);
  const report = lint(validated, editorial, source, { context, figures: figures ?? undefined });
  return report.errors.map((e) => `${e.rule} ${e.where}: ${e.message}`);
}
const params = (e: any) => e.layers.mechanism.figure.params;

describe("a read with a figure", () => {
  it("passes when the figure is listed and everything it shows is bound to a fact", () => {
    expect(run()).toEqual([]);
  });

  it("is refused when the figure is not in lib/content/figures.ts", () => {
    expect(run((e) => { e.layers.mechanism.figure.figure = "no-such-figure"; }).join("\n"))
      .toContain('figure layers.mechanism.figure: unknown figure "daytime-caffeine-sleep/no-such-figure"');
  });

  it("is refused when the build is given no figure list at all", () => {
    expect(run(() => {}, null).join("\n")).toContain("unknown figure");
  });

  it("is refused when the alt text is empty", () => {
    for (const alt of [" [-]", "Figure. [-]"]) {
      expect(run((e) => { e.layers.mechanism.figure.alt = alt; }).join("\n")).toContain("figure layers.mechanism.figure.alt: empty alt text");
    }
  });

  it("holds the caption and the alt text to the number rule", () => {
    expect(run((e) => { e.layers.mechanism.figure.caption = "Sleep came 40 minutes later. [adenosine_block]"; }).join("\n"))
      .toMatch(/orphan layers\.mechanism\.figure\.caption: 40 not found/);
    expect(run((e) => { e.layers.mechanism.figure.alt = "A lock, and a clock that reads 40 minutes. [-]"; }).join("\n"))
      .toMatch(/orphan layers\.mechanism\.figure\.alt: a sentence with a number must cite a fact/);
  });

  it("refuses a bare number in the params", () => {
    expect(run((e) => { params(e).gap = 8; }).join("\n")).toMatch(/H7 layers\.mechanism\.figure\.params\.gap: a bare number in figure params/);
  });

  it("refuses a number that is not in the cited passage", () => {
    expect(run((e) => { params(e).gap = { n: 7, ref: "recording" }; }).join("\n")).toMatch(/H7 .*params\.gap: 7 does not appear in the passage for "recording"/);
  });

  it("refuses text with a digit unless it is { text, ref } found in the passage", () => {
    expect(run((e) => { params(e).note = "p > 0.05"; }).join("\n")).toMatch(/H7 .*params\.note: "p > 0\.05" carries a number/);
    expect(run((e) => { params(e).note = { text: "> 0.05", ref: "sleep_same" }; })).toEqual([]);
    expect(run((e) => { params(e).note = { text: "> 0.01", ref: "sleep_same" }; }).join("\n")).toMatch(/H7 .*params\.note: "> 0\.01" does not appear in the passage/);
  });

  it("refuses a context source inside a figure", () => {
    expect(run((e) => { params(e).other = "fact:inoue-2023-steps/ard"; }).join("\n")).toMatch(/context .*params\.other: .*a figure draws only the paper's own facts/);
  });

  it("refuses something drawn as measured that cites a discussion sentence", () => {
    // sigma_meaning is the authors' interpretation, not a result.
    expect(run((e) => { params(e).found = { kind: "measured", fact: "fact:sigma_meaning" }; }).join("\n"))
      .toMatch(/figure .*params\.found: drawn as measured, but "sigma_meaning" is a statement, not a result/);
  });

  it("refuses something drawn as proposed that cites a result", () => {
    expect(run((e) => { params(e).lock = { kind: "proposed", fact: "fact:sleep_same" }; }).join("\n"))
      .toMatch(/figure .*params\.lock: drawn as proposed, but "sleep_same" is a result/);
  });

  it("refuses a measured or proposed element with no fact, and any other kind", () => {
    expect(run((e) => { params(e).lock = { kind: "proposed" }; }).join("\n")).toMatch(/figure .*params\.lock: a "proposed" element must cite the fact/);
    expect(run((e) => { params(e).lock = { kind: "likely", fact: "fact:adenosine_block" }; }).join("\n")).toMatch(/figure .*kind must be "measured" or "proposed"/);
  });

  it("hands the figure its facts resolved, never as bare ids", () => {
    const built = assemble(validated, read(), context);
    const figure = built.content.layers!.mechanism.figure!;
    expect((figure.params.found as any).fact).toMatchObject({ id: "sleep_same", kind: "finding" });
    expect((figure.params.lock as any).fact.quote).toContain("adenosine receptor antagonist");
    expect(figure.alt).toBe("A lock holding a blank key, with the real key left outside.");
  });
});

describe("the old flat shape", () => {
  it("may carry one figure, held to the same rules", () => {
    const legacy = clone(oldShape);
    expect(lint(validated, legacy, source, { allowLegacyShape: true, figures: FIGURE_KEYS }).errors).toEqual([]);
    legacy.figure.params.found = { kind: "measured", fact: "fact:no_depth_change" };
    expect(lint(validated, legacy, source, { allowLegacyShape: true, figures: FIGURE_KEYS }).errors.map((e) => e.message).join("\n"))
      .toContain('drawn as measured, but "no_depth_change" is a statement, not a result');
  });
});

describe("measured and proposed", () => {
  const result = { id: "sleep_same", kind: "finding" };
  const sentence = { id: "sigma_meaning", kind: "statement" };

  it("measured needs a result; proposed needs anything but one", () => {
    expect(evidenceKindProblem("measured", result)).toBeNull();
    expect(evidenceKindProblem("measured", { id: "ard", kind: "estimate" })).toBeNull();
    expect(evidenceKindProblem("proposed", sentence)).toBeNull();
    expect(evidenceKindProblem("measured", sentence)).toContain("not a result");
    expect(evidenceKindProblem("measured", { id: "lim", kind: "limitation" })).toContain("not a result");
    expect(evidenceKindProblem("proposed", result)).toContain("is a result");
    expect(evidenceKindProblem("measured", undefined)).toContain("must cite a fact");
  });

  it("a primitive refuses to draw a mismatch", () => {
    expect(() => assertEvidence("measured", sentence)).toThrow(/not a result/);
    expect(() => assertEvidence("proposed", sentence)).not.toThrow();
  });

  it("knows when a figure uses both, so the key is shown", () => {
    expect(evidenceKindsIn({ a: { kind: "measured", fact: { id: "x", kind: "finding" } } })).toEqual(["measured"]);
    expect(evidenceKindsIn({ a: [{ kind: "proposed", fact: { id: "y", kind: "statement" } }], b: { kind: "measured", fact: { id: "x", kind: "finding" } } }))
      .toEqual(["measured", "proposed"]);
    // A resolved fact's own kind ("finding") is never mistaken for an evidence kind.
    expect(evidenceKindsIn({ a: { fact: { id: "x", kind: "measured" } } })).toEqual([]);
    expect(EVIDENCE_KEY).toBe("solid: measured · dashed: proposed");
  });
});
