/**
 * Step 2B: context sources. Another study a read cites beside its own paper,
 * and background concepts.
 *
 * Same method as the other pipeline tests: start from a read that passes, break
 * one thing, check that the right rule objects. The passing read is the
 * three-layer caffeine fixture; the "other study" is the steps paper's real
 * source and extraction, gated with role "context".
 */

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { contextSourceList, factSourceLine, studySourceLine, BACKGROUND, FROM_THE_PAPER, conceptReference } from "../content/source-line";
import { assemble, shortCite } from "./assemble";
import { approved, checkConcept, conceptFingerprint, isReviewed, type Concept } from "./concepts";
import { gate } from "./gate";
import { BANNED_TERMS, SENTENCE_WORDS, THROAT_CLEARING, lint, type ContextStudyState, type LintContext } from "./lint";
import { parseRef } from "./refs";
import { parseRetractionWatch, screenSources } from "./retractions";

const read = (slug: string, file: string) => readFileSync(new URL(`../../content/papers/${slug}/${file}`, import.meta.url), "utf8");
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const RULES = { banned: BANNED_TERMS, throatClearing: THROAT_CLEARING, maxSentenceWords: SENTENCE_WORDS.fail };

const source = read("daytime-caffeine-sleep", "source.txt");
const gated = gate(JSON.parse(read("daytime-caffeine-sleep", "extraction.json")), source);
if (!gated.ok) throw new Error(gated.errors.join("\n"));
const validated = gated.validated;
const oldShape = JSON.parse(read("daytime-caffeine-sleep", "editorial.json"));
const fixture = JSON.parse(readFileSync(new URL("fixtures/layered-caffeine.json", import.meta.url), "utf8"));

// The other study: the steps paper, as a context source.
const OTHER = "inoue-2023-steps";
const otherSource = read("steps-days-per-week", "source.txt");
const otherExtraction = JSON.parse(read("steps-days-per-week", "extraction.json"));
function study(mutate: (extraction: any) => void = () => {}): ContextStudyState {
  const extraction = clone(otherExtraction);
  mutate(extraction);
  const result = gate(extraction, otherSource, { role: "context" });
  return result.ok ? { ok: true, validated: result.validated, withdrawn: null } : { ok: false, errors: result.errors };
}

const conceptFile: Concept = fixture.concepts["non-rem-sleep"];
const reviewed = (concept: Concept) => checkConcept(approved(concept, "2026-11-13T00:00:00Z"), RULES);

function contextWith(change: Partial<LintContext> = {}): LintContext {
  return { studies: { [OTHER]: study() }, concepts: { "non-rem-sleep": reviewed(conceptFile) }, ...change };
}
function layered(): any {
  const base = Object.fromEntries(Object.entries(clone(oldShape)).filter(([key]) => !["sections", "limitations", "layers", "glossary"].includes(key)));
  return { ...base, layers: clone(fixture.layers), glossary: clone(fixture.glossary) };
}
function run(mutate: (editorial: any) => void = () => {}, context: LintContext = contextWith()) {
  const editorial = layered();
  mutate(editorial);
  const report = lint(validated, editorial, source, { context });
  return {
    editorial,
    report,
    errors: report.errors.map((e) => `${e.rule} ${e.where}: ${e.message}`),
    warnings: report.warnings.map((e) => `${e.rule} ${e.where}: ${e.message}`),
  };
}
/** Adds a sentence to the audit's "Full receipts", where a parallel study belongs. */
const cite = (sentence: string) => (e: any) => { e.layers.audit.more.push(sentence); };
const GOOD = `Another study counted the steps of 3101 adults. [${OTHER}/sample]`;

describe("references", () => {
  it("tells the paper, another study and a concept apart", () => {
    expect(parseRef("sleep_same")).toEqual({ kind: "paper", fact: "sleep_same" });
    expect(parseRef("inoue-2023-steps/ard_1_2")).toEqual({ kind: "study", source: "inoue-2023-steps", fact: "ard_1_2" });
    expect(parseRef("concept:non-rem-sleep")).toEqual({ kind: "concept", slug: "non-rem-sleep" });
  });
});

describe("parallel studies: the gate, role context", () => {
  it("runs the same gate and marks the result as context", () => {
    const state = study();
    expect(state.ok && state.validated.role).toBe("context");
    expect(gated.ok && gated.validated.role).toBe("paper");
  });
  it("applies the same licence rule", () => {
    const state = study((x) => { x.license = "CC BY-NC 4.0"; });
    expect(!state.ok && state.errors[0]).toContain("NC (non-commercial) bars use behind a paid tier");
  });
  it("applies the same verbatim-quote rule", () => {
    const state = study((x) => { x.facts.find((f: any) => f.id === "sample").quote = "We enrolled 3101 adults across the country."; });
    expect(!state.ok && state.errors[0]).toContain("fact sample: quote not found in the source");
  });
});

describe("a read cites { source, fact }", () => {
  it("passes when the source is gated and the fact exists", () => {
    const { errors, report } = run(cite(GOOD));
    expect(errors).toEqual([]);
    expect(report.context).toEqual({ studies: [OTHER], concepts: ["non-rem-sleep"], unreviewed: [] });
  });
  it("GATE: fails on a missing fact", () => {
    expect(run(cite(`Another study counted steps. [${OTHER}/no_such_fact]`)).errors)
      .toEqual([expect.stringContaining(`context layers.audit.more[2]: cites "${OTHER}/no_such_fact", but the source "${OTHER}" has no verified fact "no_such_fact"`)]);
  });
  it("GATE: fails on a source that is not in content/context/", () => {
    expect(run(cite("Another study counted steps. [some-other-study/sample]")).errors)
      .toEqual([expect.stringContaining('context layers.audit.more[2]: cites "some-other-study/sample", but there is no gated source content/context/some-other-study/')]);
  });
  it("GATE: fails on a source that did not pass the gate", () => {
    const broken = study((x) => { x.facts.find((f: any) => f.id === "plateau").quote = "the benefit kept rising with every extra day"; });
    // Two errors, both right: the citation is refused, and so its number has nothing left to rest on.
    expect(run(cite(GOOD), contextWith({ studies: { [OTHER]: broken } })).errors).toEqual([
      expect.stringContaining(`the source "${OTHER}" did not pass the gate (fact plateau: quote not found in the source`),
      expect.stringContaining("orphan layers.audit.more[2]: 3101 not found in the cited passage(s)"),
    ]);
  });
  it("GATE: fails with no context at all (a caller that forgets to load it cannot let a citation through)", () => {
    const errors = lint(validated, run(cite(GOOD)).editorial, source).errors.map((e) => e.rule);
    expect(errors).toContain("context");
  });
  it("holds a number to the cited passage of the other study", () => {
    expect(run(cite(`Another study counted the steps of 9999 adults. [${OTHER}/sample]`)).errors)
      .toEqual([expect.stringContaining(`orphan layers.audit.more[2]: 9999 not found in the cited passage(s) [${OTHER}/sample]`)]);
  });
  it("H3: no causal verb on the strength of an observational context study, even in a trial's read", () => {
    expect(validated.causalLanguagePermitted).toBe(true);
    expect(run(cite(`Walking lowered the death rate in men by 14.9 points. [${OTHER}/ard_1_2]`)).errors)
      .toEqual([expect.stringContaining('H3 layers.audit.more[2]: causal verb "lowered" resting on another study that is a cohort study')]);
  });
  it("a retracted context study is withdrawn: every citation of it fails", () => {
    const state = study();
    if (!state.ok) throw new Error("fixture");
    const withdrawn: ContextStudyState = { ...state, withdrawn: { nature: "Retraction", date: "2026-11-01", reason: "+Data concerns" } };
    expect(run(cite(GOOD), contextWith({ studies: { [OTHER]: withdrawn } })).errors).toEqual([
      expect.stringContaining(`the source "${OTHER}" has been withdrawn (Retraction, 2026-11-01); remove the citation`),
      expect.stringContaining("orphan layers.audit.more[2]: 3101 not found in the cited passage(s)"),
    ]);
  });
});

describe("a context source never becomes a protocol step or changes a weight", () => {
  it("fails a step that cites another study", () => {
    expect(run((e) => { e.steps[0].refs = [`${OTHER}/threshold`]; }).errors)
      .toEqual([expect.stringContaining(`context steps.last-caffeine-8h: a protocol step rests only on the paper itself; "${OTHER}/threshold" is a context source`)]);
  });
  it("fails a step whose weight would come from another study, or from a concept", () => {
    expect(run((e) => { e.steps[1].evidenceRef = `${OTHER}/ard_1_2`; }).errors)
      .toEqual([expect.stringContaining("context steps.regular-bedtime: a protocol step rests only on the paper itself")]);
    expect(run((e) => { e.steps[1].refs = ["concept:non-rem-sleep"]; }).errors)
      .toEqual([expect.stringContaining('"concept:non-rem-sleep" is a context source and can never back a step or give it weight')]);
  });
  it("fails a simulator that draws a context fact, and a headline result that is one", () => {
    expect(run((e) => { e.simulator.params.outside = `fact:${OTHER}/ard_1_2`; }).errors)
      .toEqual([expect.stringContaining("context simulator.params.outside")]);
    expect(run((e) => { e.simulator.params.doseMg = { n: 3101, ref: `${OTHER}/sample` }; }).errors)
      .toEqual([expect.stringContaining("H7 simulator.params.doseMg")]);
    expect(run((e) => { e.primaryEstimate = `${OTHER}/ard_1_2`; }).errors.some((e) => e.startsWith("H5 primaryEstimate"))).toBe(true);
  });
  it("fails a limitation that rests only on the other study's limitation (H6 is about this paper)", () => {
    expect(run((e) => { e.layers.audit.limitations = [`Steps were counted for one week. [${OTHER}/one_week]`]; }).errors)
      .toEqual([expect.stringContaining("H6 layers.audit.limitations[0]")]);
  });
  it("leaves every step's grade and the paper's grades exactly as they were", () => {
    const plain = assemble(validated, layered(), contextWith());
    const withContext = assemble(validated, run(cite(GOOD)).editorial, contextWith());
    expect(withContext.steps).toEqual(plain.steps);
    expect(withContext.meta.grades).toEqual(plain.meta.grades);
    expect(withContext.steps.map((s) => s.grade)).toEqual(["low", "none"]);
  });
});

describe("what reaches the page", () => {
  const paper = assemble(validated, run(cite(`${GOOD} Reaching the target on one or two days went with a death rate 14.9 points lower. [${OTHER}/ard_1_2]`)).editorial, contextWith());
  it("carries the context fact with its source, and the study with its DOI and its own grade", () => {
    expect(paper.content.facts[`${OTHER}/sample`]).toMatchObject({ source: OTHER, kind: "context" });
    expect(paper.content.facts.sleep_same.source).toBeUndefined();
    expect(paper.content.context?.studies).toEqual([{
      slug: OTHER,
      citation: "Inoue K, Tsugawa Y, Mayeda ER, Ritz B. Association of Daily Step Patterns With Mortality in US Adults. JAMA Netw Open. 2023;6(3):e235174.",
      shortCite: "Inoue et al., JAMA Network Open 2023",
      doi: "10.1001/jamanetworkopen.2023.5174",
      design: "cohort",
      sampleSize: 3101,
      license: "CC-BY",
      tier: "low",
    }]);
    expect(shortCite({ ...otherExtraction.identifiers, authors: "Weibel J" })).toBe("Weibel, JAMA Network Open 2023");
  });
  it("carries the concept a glossary entry uses, with its reference", () => {
    expect(paper.content.context?.concepts).toEqual([{
      slug: "non-rem-sleep", term: "non-REM sleep", plain: conceptFile.plain, model: conceptFile.model, reference: conceptFile.reference,
    }]);
  });
  it('says where each thing comes from: "From the paper", "From another study: <cite>, <grade>", "Background"', () => {
    expect(factSourceLine(paper.content.facts.sleep_same, paper.content)).toBe(FROM_THE_PAPER);
    expect(FROM_THE_PAPER).toBe("From the paper");
    expect(factSourceLine(paper.content.facts[`${OTHER}/ard_1_2`], paper.content)).toBe("From another study: Inoue et al., JAMA Network Open 2023, low certainty");
    expect(studySourceLine(paper.content.context!.studies[0])).toBe("From another study: Inoue et al., JAMA Network Open 2023, low certainty");
    expect(BACKGROUND).toBe("Background");
    expect(conceptReference(paper.content.context!.concepts[0])).toBe("The impact of daily caffeine intake on nighttime sleep in young adult men (doi:10.1038/s41598-021-84088-x)");
  });
  it("refuses to make up a source line for a fact whose study the read does not carry", () => {
    expect(() => factSourceLine({ ...paper.content.facts[`${OTHER}/sample`], source: "somewhere-else" }, paper.content)).toThrow("which this read does not carry");
  });
  it("lists every context source for the audit, each with its DOI", () => {
    expect(contextSourceList(paper.content)).toEqual([
      { label: "Another study", citation: expect.stringContaining("Inoue K, Tsugawa Y"), id: "doi:10.1001/jamanetworkopen.2023.5174", grade: "Low certainty" },
      { label: "Background", citation: "non-REM sleep: The impact of daily caffeine intake on nighttime sleep in young adult men", id: "doi:10.1038/s41598-021-84088-x", grade: null },
    ]);
    expect(contextSourceList(assemble(validated, oldShape).content)).toEqual([]);
  });
  it("adds nothing to a read that cites no context (the old papers' files do not change)", () => {
    const untouched = assemble(validated, oldShape);
    expect("context" in untouched.content).toBe(false);
    expect(Object.values(untouched.content.facts).some((f) => "source" in f)).toBe(false);
  });
});

describe("background concepts", () => {
  const errorsOf = (change: Record<string, unknown>) => {
    const state = checkConcept({ ...conceptFile, ...change }, RULES);
    return state.ok ? [] : state.errors;
  };
  it("accepts the fixture concept", () => {
    expect(errorsOf({})).toEqual([]);
  });
  it.each(["term", "plain", "model"])("LINT: any digit in the %s fails", (field) => {
    expect(errorsOf({ [field]: "Stage 3 of the night" })).toEqual([expect.stringContaining(`${field}: a concept carries no numbers`)]);
  });
  it("allows digits only where they belong: the DOI or ISBN of the reference", () => {
    expect(errorsOf({ reference: { isbn: "978-0-323-24288-2", title: "A sleep medicine textbook" } })).toEqual([]);
  });
  it("needs a reference with a title and exactly one of doi or isbn", () => {
    expect(errorsOf({ reference: { title: "A book" } })).toEqual([expect.stringContaining("schema: reference: give a doi or an isbn")]);
    expect(errorsOf({ reference: { doi: "10.1000/x", isbn: "9780323242882", title: "A book" } })).toEqual([expect.stringContaining("give a doi or an isbn")]);
    expect(errorsOf({ reference: { doi: "not-a-doi", title: "A book" } })).toEqual([expect.stringContaining("schema: reference.doi: not a DOI")]);
    expect(errorsOf({ reference: { isbn: "12345", title: "A book" } })).toEqual([expect.stringContaining("schema: reference.isbn: not an ISBN")]);
    expect(errorsOf({ reference: { doi: "10.1000/x" } })).toEqual([expect.stringContaining("schema: reference.title")]);
  });
  it("holds the wording to H1, H9 and H11", () => {
    expect(errorsOf({ model: "The secret half of the night." })).toEqual([expect.stringContaining('model: banned term "secret" (H1)')]);
    expect(errorsOf({ plain: "Sleep set by the circadian clock." })).toEqual([expect.stringContaining("plain: uses a technical word (circadian)")]);
    expect(errorsOf({ plain: "Interestingly, the stages of sleep without vivid dreams." })).toEqual([expect.stringContaining('plain: throat-clearing "interestingly" (H11)')]);
    expect(errorsOf({ model: `${Array.from({ length: 31 }, () => "slow").join(" ")}.` })).toEqual([expect.stringContaining("model: a sentence of 31 words")]);
  });
  it("lets a concept's own name appear in its text, but no other listed word", () => {
    expect(errorsOf({ term: "REM sleep", plain: "REM sleep is the stage with vivid dreams." })).toEqual([]);
  });
  it("needs reviewed_by_owner to be stated", () => {
    const { reviewed_by_owner: _omit, ...rest } = conceptFile;
    void _omit;
    expect(checkConcept(rest, RULES)).toMatchObject({ ok: false, errors: [expect.stringContaining("schema: reviewed_by_owner")] });
  });

  it("GATE: a read cannot cite a concept that does not exist or fails its checks", () => {
    expect(run((e) => { e.glossary[0].concept = "no-such-concept"; }).errors)
      .toEqual(expect.arrayContaining([expect.stringContaining('context glossary[0]: cites "concept:no-such-concept", but there is no content/concepts/no-such-concept.json')]));
    const failing = checkConcept({ ...conceptFile, plain: "Stages N1 to N3 of sleep." }, RULES);
    expect(run(() => {}, contextWith({ concepts: { "non-rem-sleep": failing } })).errors)
      .toEqual(expect.arrayContaining([expect.stringContaining('context glossary[0]: cites "concept:non-rem-sleep", but that concept fails its own checks (plain: a concept carries no numbers')]));
  });
  it("GATE: a glossary entry written in the read must say which fact it rests on", () => {
    expect(run((e) => { e.glossary[1].refs = []; }).errors)
      .toEqual([expect.stringContaining('context glossary[1]: the plain text for "sigma band" has no source')]);
    expect(run((e) => { e.glossary[1].refs = ["no_such_fact"]; }).errors).toEqual([expect.stringContaining('orphan glossary[1]: refers to "no_such_fact"')]);
    expect(run((e) => { e.glossary[1].refs = ["concept:non-rem-sleep"]; }).errors).toEqual([expect.stringContaining('set "concept" on the entry instead')]);
  });
  it("a sentence may rest on a concept, but a concept backs no number", () => {
    const sentence = (text: string) => (e: any) => { e.layers.mechanism.paragraphs[1] += ` ${text}`; };
    expect(run(sentence("That stage is the quiet stretch of the night. [concept:non-rem-sleep]")).errors).toEqual([]);
    expect(run(sentence("That stage fills 75 percent of the night. [concept:non-rem-sleep]")).errors)
      .toEqual([expect.stringContaining("orphan layers.mechanism[1]: 75 not found in the cited passage(s) [concept:non-rem-sleep]")]);
  });

  describe("the owner's review", () => {
    const unreviewed = contextWith({ concepts: { "non-rem-sleep": checkConcept(conceptFile, RULES) } });
    it("BUILD: a published read that uses an unreviewed concept is refused", () => {
      const { errors } = run((e) => { e.publishedAt = "2026-11-13T00:00:00Z"; }, unreviewed);
      expect(errors).toEqual([expect.stringContaining('context concept:non-rem-sleep: the concept "non-rem-sleep" has not been reviewed by the owner (npm run paper -- approve-concept non-rem-sleep); a published read cannot use it')]);
    });
    it("a draft may use it, with a warning, so the owner can read the two together", () => {
      const { errors, warnings, report } = run((e) => { e.publishedAt = null; }, unreviewed);
      expect(errors).toEqual([]);
      expect(warnings).toEqual(expect.arrayContaining([expect.stringContaining("this draft cannot be approved until it is")]));
      expect(report.context?.unreviewed).toEqual(["non-rem-sleep"]);
    });
    it("passes once the owner has approved it", () => {
      expect(run((e) => { e.publishedAt = "2026-11-13T00:00:00Z"; }).errors).toEqual([]);
    });
    it("setting reviewed_by_owner by hand is not a review: it needs the fingerprint the command writes", () => {
      expect(isReviewed({ ...conceptFile, reviewed_by_owner: true })).toBe(false);
      expect(isReviewed({ ...conceptFile, reviewed_by_owner: true, reviewed: { at: "2026-11-13", fingerprint: "0123456789ab" } })).toBe(false);
      expect(isReviewed(approved(conceptFile, "2026-11-13"))).toBe(true);
    });
    it("a concept reworded after the review counts as unreviewed again", () => {
      const reworded = { ...approved(conceptFile, "2026-11-13"), plain: "The dreamless stages of sleep." };
      expect(isReviewed(reworded)).toBe(false);
      expect(conceptFingerprint(reworded)).not.toBe(conceptFingerprint(conceptFile));
      const { errors } = run((e) => { e.publishedAt = "2026-11-13T00:00:00Z"; }, contextWith({ concepts: { "non-rem-sleep": checkConcept(reworded, RULES) } }));
      expect(errors).toEqual([expect.stringContaining("has not been reviewed by the owner")]);
    });
  });
});

describe("retractions cover context studies", () => {
  const csv = [
    "Record ID,Title,OriginalPaperDOI,RetractionDate,RetractionNature,Reason",
    "1,A context study,10.1001/JAMANETWORKOPEN.2023.5174,11/01/2026 0:00,Retraction,+Data concerns",
    "2,A corrected one,10.1000/def.2,1/02/2023 0:00,Correction,+Error in text",
  ].join("\n");
  it("screens papers and context studies in one pass, and only a retraction or a concern counts", () => {
    const hits = screenSources([
      { slug: "daytime-caffeine-sleep", doi: "10.1038/s41598-021-84088-x", role: "paper" },
      { slug: OTHER, doi: "10.1001/jamanetworkopen.2023.5174", role: "context" },
      { slug: "corrected", doi: "10.1000/def.2", role: "context" },
    ], parseRetractionWatch(csv));
    expect(hits).toEqual([{
      source: { slug: OTHER, doi: "10.1001/jamanetworkopen.2023.5174", role: "context" },
      retraction: { doi: "10.1001/jamanetworkopen.2023.5174", nature: "Retraction", date: "2026-11-01", reason: "+Data concerns" },
    }]);
  });
});
