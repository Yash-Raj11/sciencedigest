/**
 * H9, H10, H11: the three-layer read.
 *
 * Same method as pipeline.test.ts: start from a read that passes, break exactly
 * one thing, and check that the right rule objects. The passing read is the
 * caffeine paper's editorial with the three-layer fixture laid over it.
 */

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { FIGURE_KEYS } from "../content/figures";
import { assemble } from "./assemble";
import { approved, checkConcept } from "./concepts";
import { Editorial, editorialShape } from "./editorial";
import { gate } from "./gate";
import { REAL_LIBRARY, REAL_STUDIES } from "./fixtures/real-context";
import { JARGON, glossaryCovers, jargonIn } from "./jargon";
import { BANNED_TERMS, CAVEAT_TERMS, LAYER_WORDS, SENTENCE_WORDS, THROAT_CLEARING, lint, type LintContext } from "./lint";
import { splitSentences, wordCount } from "./sentences";

const dir = new URL("../../content/papers/daytime-caffeine-sleep/", import.meta.url);
const source = readFileSync(new URL("source.txt", dir), "utf8");
const gated = gate(JSON.parse(readFileSync(new URL("extraction.json", dir), "utf8")), source);
if (!gated.ok) throw new Error(gated.errors.join("\n"));
const validated = gated.validated;

const oldShape = JSON.parse(readFileSync(new URL("editorial.json", dir), "utf8"));
const fixture = JSON.parse(readFileSync(new URL("fixtures/layered-caffeine.json", import.meta.url), "utf8"));
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
/** A copy of an object without some of its keys. */
const without = (value: Record<string, unknown>, keys: string[]) => Object.fromEntries(Object.entries(clone(value)).filter(([key]) => !keys.includes(key)));

/** The fixture's one concept, reviewed, as the build would hand it to the lint. */
const context: LintContext = {
  // The real half-life study and library: caffeine's simulator draws on them.
  studies: { ...REAL_STUDIES },
  library: REAL_LIBRARY,
  concepts: {
    "non-rem-sleep": checkConcept(approved(fixture.concepts["non-rem-sleep"], "2026-11-13T00:00:00Z"),
      { banned: BANNED_TERMS, throatClearing: THROAT_CLEARING, maxSentenceWords: SENTENCE_WORDS.fail }),
  },
};

/** The passing three-layer read. */
function layered(): any {
  return { ...without(oldShape, ["sections", "limitations", "figure", "layers", "glossary"]), layers: clone(fixture.layers), glossary: clone(fixture.glossary) };
}
function run(mutate: (editorial: any) => void = () => {}) {
  const editorial = layered();
  mutate(editorial);
  // "loan" is a figure name these tests make up; the real list is checked in figures.test.ts.
  const report = lint(validated, editorial, source, { context, figures: [...FIGURE_KEYS, "daytime-caffeine-sleep/loan"] });
  return {
    report,
    errors: report.errors.map((e) => `${e.rule} ${e.where}: ${e.message}`),
    warnings: report.warnings.map((e) => `${e.rule} ${e.where}: ${e.message}`),
  };
}
/** Adds one sentence to the end of the first paragraph of a layer. */
const addTo = (layer: "mechanism" | "protocol", sentence: string) => (e: any) => { e.layers[layer].paragraphs[0] += ` ${sentence}`; };

describe("the three-layer fixture", () => {
  it("passes every rule", () => {
    expect(run().errors).toEqual([]);
  });
});

describe("check 1, schema: layers { mechanism, protocol, audit } and a glossary", () => {
  it("refuses the old flat shape", () => {
    const errors = lint(validated, oldShape, source).errors.map((e) => `${e.rule} ${e.where}: ${e.message}`);
    expect(errors).toEqual([expect.stringContaining("schema layers: this read is in the old flat shape")]);
  });
  it("accepts the old flat shape only when the caller vouches for it (the temporary allowlist)", () => {
    // After step 2E this paper is itself three-layer, and this option is deleted with the allowlist.
    if (editorialShape(oldShape) !== "legacy") return;
    expect(lint(validated, oldShape, source, { allowLegacyShape: true, context, figures: FIGURE_KEYS }).errors).toEqual([]);
  });
  it("zod rejects the old flat shape outright", () => {
    const parsed = Editorial.safeParse({ ...without(layered(), ["layers", "glossary"]), sections: [], limitations: [] });
    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues.map((i) => i.path.join("."))).toEqual(expect.arrayContaining(["layers", "glossary"]));
  });
  it("refuses a read that carries both shapes", () => {
    expect(run((e) => { e.sections = []; }).errors).toEqual([expect.stringContaining("schema layers: this read carries both shapes")]);
  });
  it.each(["mechanism", "protocol", "audit"])("refuses a read with no %s layer", (layer) => {
    expect(run((e) => { delete e.layers[layer]; }).errors).toEqual([expect.stringContaining(`schema layers.${layer}`)]);
  });
  it("refuses a read with no glossary, and a glossary entry with no plain text", () => {
    expect(run((e) => { delete e.glossary; }).errors).toEqual([expect.stringContaining("schema glossary")]);
    expect(run((e) => { e.glossary[2] = { term: "placebo" }; }).errors)
      .toEqual([expect.stringContaining("schema glossary.2.plain: give plain text with refs, or a concept (one of them)")]);
    expect(run((e) => { e.glossary[0].plain = "Sleep without dreams."; }).errors).toEqual([expect.stringContaining("schema glossary.0.plain")]);
  });
  it("keeps the audit's own rules: the effect cites the headline result (H5), limitations cite a limitation (H6)", () => {
    expect(run((e) => { e.layers.audit.effect = "Sleep looked the same. [quality_same]"; }).errors)
      .toEqual([expect.stringContaining('H5 layers.audit.effect: the raw effect size must cite the headline result "sleep_same"')]);
    expect(run((e) => { e.layers.audit.weakEnd = "Sleep was the same on both kinds of night. [sleep_same]"; }).errors)
      .toEqual([expect.stringContaining('H5 layers.audit.weakEnd: "sleep_same" has no interval')]);
    expect(run((e) => { e.layers.audit.limitations = ["More research is needed. [-]"]; }).errors)
      .toEqual([expect.stringContaining("H6 layers.audit.limitations[0]")]);
  });
});

describe("check 2, jargon (H9)", () => {
  it("has the list the owner gave, word for word", () => {
    expect(JARGON.map((j) => j.term)).toEqual([
      "adenosine", "receptor", "antagonist", "upregulate", "downregulate", "attenuate", "modulate", "AMPK", "mTOR",
      "cortisol", "circadian", "REM", "hypertrophy", "VO2max", "insulin sensitivity", "all-cause mortality",
      "hazard ratio", "confidence interval", "meta-analysis", "cohort", "randomized",
    ]);
  });
  it("finds every listed word in the forms a writer would use", () => {
    expect(jargonIn("Caffeine is an adenosine receptor antagonist.")).toEqual(["adenosine", "receptor", "antagonist"]);
    expect(jargonIn("It up-regulates AMPK, downregulated mTORC1, attenuates and modulates cortisol.")).toEqual(
      ["upregulate", "downregulate", "attenuate", "modulate", "AMPK", "mTOR", "cortisol"]);
    expect(jargonIn("Circadian timing, non-REM sleep, muscle hypertrophy, VO2 max and VO₂max.")).toEqual(
      ["circadian", "REM", "hypertrophy", "VO2max"]);
    expect(jargonIn("Insulin sensitivity, all-cause mortality, a hazard ratio and its confidence intervals.")).toEqual(
      ["insulin sensitivity", "all-cause mortality", "hazard ratio", "confidence interval"]);
    expect(jargonIn("A meta-analysis of randomised trials and one cohort.")).toEqual(["meta-analysis", "cohort", "randomized"]);
    expect(jargonIn("They went through the conditions in random order and remembered their dreams.")).toEqual([]);
  });
  it("fails a listed word in the mechanism that has no glossary entry", () => {
    const { errors } = run(addTo("mechanism", "The lock has a name: the adenosine receptor. [-]"));
    expect(errors).toEqual([
      expect.stringContaining('H9 layers.mechanism[0]: "adenosine" is used with no glossary entry'),
      expect.stringContaining('H9 layers.mechanism[0]: "receptor" is used with no glossary entry'),
    ]);
  });
  it("fails a listed word in the protocol that has no glossary entry", () => {
    expect(run(addTo("protocol", "The order was randomized. [blind]")).errors)
      .toEqual([expect.stringContaining('H9 layers.protocol[0]: "randomized" is used with no glossary entry')]);
  });
  it("fails when the entry that was covering a word is removed", () => {
    expect(run((e) => { e.glossary = e.glossary.filter((g: any) => g.term !== "non-REM sleep"); }).errors)
      .toEqual([expect.stringContaining('H9 layers.mechanism[1]: "REM" is used with no glossary entry')]);
  });
  it("passes once the glossary says what the thing does", () => {
    expect(run((e) => {
      addTo("mechanism", "The lock has a name: the adenosine receptor. [-]")(e);
      e.glossary.push({ term: "adenosine receptor", plain: "The lock on a brain cell that the sleepiness chemical fits.", refs: ["tolerance"] });
    }).errors).toEqual([]);
    expect(glossaryCovers("adenosine receptor", "adenosine")).toBe(true);
    expect(glossaryCovers("adenosine receptor", "receptor")).toBe(true);
    expect(glossaryCovers("sigma band", "receptor")).toBe(false);
  });
  it("fails a glossary entry whose plain text uses a listed word", () => {
    expect(run((e) => { e.glossary[1].plain = "Brain waves outside REM, set by the circadian clock."; }).errors)
      .toEqual([expect.stringContaining('H9 glossary[1]: the plain text for "sigma band" uses a technical word (circadian, REM)')]);
  });
  it("fails a glossary entry with a number, a banned word or a duplicate", () => {
    expect(run((e) => { e.glossary[1].plain = "Brain waves of 12 to 15 cycles a second."; }).errors)
      .toEqual([expect.stringContaining('H7 glossary[1]: the plain text for "sigma band" carries a number (12, 15) that is not in the fact(s) it cites')]);
    expect(run((e) => { e.glossary[1].plain = "The secret rhythm of sleep."; }).errors).toEqual([expect.stringContaining('H1 glossary[1]: banned term "secret"')]);
    expect(run((e) => { e.glossary.push({ term: "Placebo", plain: "A dummy capsule.", refs: ["dose"] }); }).errors)
      .toEqual([expect.stringContaining('glossary glossary[3]: "Placebo" is defined twice')]);
  });
});

describe("check 3, caveat leakage: no caveats in the mechanism layer (H10)", () => {
  const leaks: [string, string][] = [
    ["limitation", "That is one limitation of the idea. [-]"],
    ["confound", "Late dinners could confound the picture. [-]"],
    ["self-reported", "Bedtimes at home were self-reported. [later_bed]"],
    ["p =", "The gap had p = 0.04. [sigma]"],
    ["p<", "The gap had p<0.05. [sigma]"],
    ["95%", "The 95% range was wide. [sigma]"],
    ["CI", "The CI was wide. [-]"],
    ["sample size", "The sample size was small. [-]"],
    ["dropout", "There was one dropout. [-]"],
    ["funded", "A coffee company funded none of it. [-]"],
  ];
  it("covers every term on the list", () => {
    expect(leaks.map(([term]) => term)).toEqual(CAVEAT_TERMS.map(([term]) => term));
  });
  it.each(leaks)('fails "%s" in mechanism text', (term, sentence) => {
    const { errors } = run(addTo("mechanism", sentence));
    expect(errors.filter((e) => e.startsWith("H10"))).toEqual([expect.stringContaining(`H10 layers.mechanism[0]: a caveat ("${term}") in the mechanism layer`)]);
  });
  it("allows the same sentence in the audit, where caveats belong", () => {
    expect(run((e) => { e.layers.audit.more.push("The sample size was small. [-]"); }).errors).toEqual([]);
  });
  it("also reads the caption of a mechanism figure", () => {
    expect(run((e) => {
      e.layers.mechanism.figure = { figure: "loan", caption: "One limitation of the picture. [-]", alt: "A loan coming due each night. [-]" };
    }).errors).toEqual([expect.stringContaining('H10 layers.mechanism.figure.caption: a caveat ("limitation")')]);
  });
});

describe("check 4, throat-clearing (H11)", () => {
  const sentences: Record<string, string> = {
    "it is worth noting": "It is worth noting that the men slept in a laboratory. [recording]",
    "it should be noted": "It should be noted that the men slept in a laboratory. [recording]",
    "it is important to note": "It is important to note that the men slept in a laboratory. [recording]",
    "interestingly": "Interestingly, the men slept in a laboratory. [recording]",
    "notably": "The men, notably, slept in a laboratory. [recording]",
    "the authors observed that": "The authors observed that the men slept in a laboratory. [recording]",
    "the results suggest that it may": "The results suggest that it may come down to habit. [tolerance]",
  };
  it("covers every phrase on the list", () => {
    expect(Object.keys(sentences)).toEqual(THROAT_CLEARING.map(([phrase]) => phrase));
  });
  it.each(Object.entries(sentences))('fails "%s"', (phrase, sentence) => {
    expect(run(addTo("protocol", sentence)).errors).toEqual([expect.stringContaining(`H11 layers.protocol[0]: throat-clearing "${phrase}"`)]);
  });
  it("is checked outside the layers too: hook, audit, carousel", () => {
    expect(run((e) => { e.hook = `Interestingly, sleep held up. [-] ${e.hook}`; }).errors).toEqual([expect.stringContaining('H11 hook: throat-clearing "interestingly"')]);
    expect(run((e) => { e.layers.audit.more.push("Notably, the trial was small. [lim_n]"); }).errors).toEqual([expect.stringContaining("H11 layers.audit.more[2]")]);
    expect(run((e) => { e.carousel.slides[1].body = `Interestingly, nothing moved. [-] ${e.carousel.slides[1].body}`; }).errors)
      .toEqual([expect.stringContaining("H11 carousel.slides[1].body")]);
  });
});

describe("check 5, sentence length (H11)", () => {
  const filler = (n: number) => `Very ${Array.from({ length: n - 5 }, () => "very").join(" ")} long sentences tire readers.`;
  it("splits sentences without tripping on abbreviations, initials or decimals", () => {
    expect(splitSentences("Some drinks, e.g. coffee and tea, carry caffeine. Others do not.")).toEqual(
      ["Some drinks, e.g. coffee and tea, carry caffeine.", "Others do not."]);
    expect(splitSentences("Weibel et al. tested twenty men. They slept in a laboratory.")).toEqual(
      ["Weibel et al. tested twenty men.", "They slept in a laboratory."]);
    expect(splitSentences("Caffeine vs. placebo showed no gap. Sleep held.")).toEqual(["Caffeine vs. placebo showed no gap.", "Sleep held."]);
    // The abbreviation rule itself: a capital, a digit or a bracket right after the stop.
    expect(splitSentences("Stimulants, e.g. Ritalin, were excluded. So was alcohol.")).toEqual(["Stimulants, e.g. Ritalin, were excluded.", "So was alcohol."]);
    expect(splitSentences("Weibel et al. (2021) tested twenty men.")).toEqual(["Weibel et al. (2021) tested twenty men."]);
    expect(splitSentences("Caffeine vs. Placebo was the comparison.")).toEqual(["Caffeine vs. Placebo was the comparison."]);
    expect(splitSentences("Fat-free mass rose 0.63 kg. Body fat fell 2.80 points.")).toEqual(["Fat-free mass rose 0.63 kg.", "Body fat fell 2.80 points."]);
    expect(splitSentences("The gap was 14.9 points (10.9 to 18.8). It held.")).toEqual(["The gap was 14.9 points (10.9 to 18.8).", "It held."]);
    expect(splitSentences("J. Weibel ran the trial. It took 10 days.")).toEqual(["J. Weibel ran the trial.", "It took 10 days."]);
    expect(splitSentences('Did it change sleep? No. "Not here," they wrote. So what did?')).toEqual(
      ["Did it change sleep?", "No.", '"Not here," they wrote.', "So what did?"]);
    expect(splitSentences("One sentence with no full stop")).toEqual(["One sentence with no full stop"]);
  });
  it("counts words the way a reader would", () => {
    expect(wordCount("An 8-hour night - give or take 0.5 hours.")).toBe(8);
    expect(wordCount(filler(31))).toBe(31);
  });
  it(`fails a sentence over ${SENTENCE_WORDS.fail} words`, () => {
    expect(run(addTo("protocol", `${filler(31)} [-]`)).errors)
      .toEqual([expect.stringContaining("H11 layers.protocol[0]: a sentence of 31 words; the limit is 30")]);
  });
  it("counts two sentences behind one marker separately", () => {
    expect(run(addTo("protocol", `${filler(16)} ${filler(16)} [-]`)).errors).toEqual([]);
  });
  it(`passes at ${SENTENCE_WORDS.fail} words and warns over ${SENTENCE_WORDS.warn}`, () => {
    const { errors, warnings } = run(addTo("protocol", `${filler(30)} [-]`));
    expect(errors).toEqual([]);
    expect(warnings).toEqual(expect.arrayContaining([expect.stringContaining("H11 layers.protocol[0]: a sentence of 30 words; aim for 22 or fewer")]));
    expect(run(addTo("protocol", `${filler(22)} [-]`)).warnings.filter((w) => w.includes("layers.protocol"))).toEqual([]);
  });
  it("reports words, sentences, the average and the longest sentence for each layer", () => {
    expect(run().report.layers).toEqual({
      mechanism: { words: 116, sentences: 8, average: 14.5, longest: 22 },
      protocol: { words: 59, sentences: 5, average: 11.8, longest: 17 },
      audit: { words: 174, sentences: 13, average: 13.4, longest: 21 },
    });
  });
});

describe("check 6, passive voice (H11): a warning, never an error", () => {
  it("warns and still passes", () => {
    const { errors, warnings } = run(addTo("protocol", "Sleep was recorded in a laboratory. [recording]"));
    expect(errors).toEqual([]);
    expect(warnings).toEqual(expect.arrayContaining([expect.stringContaining('H11 layers.protocol[0]: possibly passive ("was recorded")')]));
  });
  it("does not warn on an active sentence", () => {
    expect(run(addTo("protocol", "The team recorded sleep in a laboratory. [recording]")).warnings.filter((w) => w.includes("layers.protocol"))).toEqual([]);
  });
});

describe("check 7, word budget (H10)", () => {
  it("is one constant", () => {
    expect(LAYER_WORDS).toEqual({ mechanism: 350, protocol: 150, audit: 250 });
  });
  const pad = (words: number) => Array.from({ length: Math.ceil(words / 7) }, () => "The body gets used to the dose. [-]").join(" ");
  it.each([["mechanism", 350], ["protocol", 150]] as const)("fails a %s layer over %i words", (layer, budget) => {
    const { errors, report } = run((e) => { e.layers[layer].paragraphs.push(pad(budget)); });
    expect(errors).toEqual([expect.stringContaining(`H10 layers.${layer}: ${report.layers![layer].words} words; the ${layer} layer has a budget of ${budget}`)]);
    expect(report.layers![layer].words).toBeGreaterThan(budget);
  });
  it("fails an audit layer over 250 words", () => {
    const { errors } = run((e) => { e.layers.audit.more.push(pad(250)); });
    expect(errors).toEqual([expect.stringContaining("the audit layer has a budget of 250")]);
  });
  it("passes a layer filled exactly to its budget", () => {
    const room = LAYER_WORDS.protocol - run().report.layers!.protocol.words;
    // One long run of filler would break the sentence rule, so spend the room seven words at a time.
    const sentences = Array.from({ length: Math.floor(room / 7) }, () => "The body gets used to the dose. [-]");
    const rest = room % 7;
    if (rest > 0) sentences.push(`${Array.from({ length: rest }, () => "So").join(" ")}. [-]`);
    const { errors, report } = run((e) => { e.layers.protocol.paragraphs.push(sentences.join(" ")); });
    expect(report.layers!.protocol.words).toBe(LAYER_WORDS.protocol);
    expect(errors).toEqual([]);
  });
});

describe("assemble: the three-layer read reaches the app", () => {
  it("carries the layers and the glossary, with every cited fact", () => {
    const paper = assemble(validated, layered(), context);
    expect(Object.keys(paper.content.layers!)).toEqual(["mechanism", "protocol", "audit"]);
    expect(paper.content.layers!.mechanism.paragraphs[1][1]).toEqual({
      text: "During non-REM sleep, brain activity in the sigma band was lower on caffeine nights than on placebo nights.", refs: ["sigma"],
    });
    expect(paper.content.layers!.audit.limitations).toHaveLength(3);
    expect(paper.content.glossary).toEqual([
      { term: "non-REM sleep", plain: "The stages of sleep without vivid dreams, deep sleep included.", refs: [], concept: "non-rem-sleep" },
      { term: "sigma band", plain: "A range of brain-wave speeds that shows up during sleep.", refs: ["sigma"], concept: null },
      { term: "placebo", plain: "A capsule with nothing active in it, used for comparison.", refs: ["dose"], concept: null },
    ]);
    expect(paper.content.sections).toEqual([]);
    expect(Object.keys(paper.content.facts)).toEqual(expect.arrayContaining(["sigma", "tolerance", "lim_male", "not_after_abstinence"]));
    expect(paper.meta.readMinutes).toBe(2);
  });
  it("resolves a figure's caption and alt text", () => {
    const editorial = layered();
    editorial.layers.mechanism.figure = { figure: "loan", caption: "The loan comes due 8 hours after the last dose. [sigma_meaning]", alt: "A loan coming due each night. [-]" };
    const paper = assemble(validated, editorial, context);
    expect(paper.content.layers!.mechanism.figure).toEqual({
      figure: "loan",
      caption: [{ text: "The loan comes due 8 hours after the last dose.", refs: ["sigma_meaning"] }],
      alt: "A loan coming due each night.",
      params: {},
    });
  });
});
