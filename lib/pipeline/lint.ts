/**
 * Stage 4: the lint. Deterministic code; no model. Blocks publication.
 *
 * Every rule here is one of the content heuristics (H1-H11, listed in the
 * science-content skill) turned
 * into something a machine can check. A heuristic that lives only in a prompt
 * is a wish; these cannot be talked out of it.
 *
 * Isomorphic: runs in Node (content build, pipeline) and in the browser (the
 * approval queue shows the same report).
 */

import { Editorial, LAYERS, LegacyEditorial, OLD_SHAPE_MESSAGE, editorialShape, type Layer } from "./editorial";
import type { ConceptState } from "./concepts";
import type { Validated, ValidatedFact } from "./gate";
import { NON_HUMAN_DISCLAIMER } from "./grade";
import { glossaryCovers, jargonIn } from "./jargon";
import { specProblems } from "../content/figure-kinds";
import { EVIDENCE_KINDS, evidenceKindProblem, figureKey, type EvidenceKind } from "../content/figures";
import { parseMarkup, type Sentence } from "./markup";
import { isContextRef, parseRef } from "./refs";
import { splitSentences, wordCount as countWords } from "./sentences";
import { normalize, numbersIn, sharedShingles, words } from "./text";

export interface LintIssue {
  rule: string;
  where: string;
  message: string;
}

export interface LayerStats {
  words: number;
  sentences: number;
  /** Average words per sentence, one decimal. */
  average: number;
  longest: number;
}

export interface LintReport {
  errors: LintIssue[];
  warnings: LintIssue[];
  wordCount: number;
  /** Three-layer reads only: the size and sentence length of each layer (H10, H11). */
  layers?: Record<Layer, LayerStats>;
  /** The context sources the read cites, and which concepts the owner has not reviewed yet. */
  context?: { studies: string[]; concepts: string[]; unreviewed: string[] };
}

/** One folder of content/context/, after the gate (role "context") and the retraction check. */
export type ContextStudyState =
  | { ok: true; validated: Validated; withdrawn: { nature: string; date: string | null; reason: string } | null }
  | { ok: false; errors: string[] };

/** Everything a read may cite besides its own paper. Built by scripts/context-load.ts. */
export interface LintContext {
  studies: Record<string, ContextStudyState>;
  concepts: Record<string, ConceptState>;
}

export interface LintOptions {
  /**
   * Accept the old flat shape. Only content-build and the paper command pass
   * this, and only for a slug on the temporary allowlist (scripts/legacy-shape.ts).
   */
  allowLegacyShape?: boolean;
  /** The gated context studies and the concept files. Without it, any context reference fails. */
  context?: LintContext;
  /** Every figure the app can draw, as "<slug>/<figure>" (lib/content/figures.ts). Without it, any figure fails. */
  figures?: readonly string[];
}

// H1 ---------------------------------------------------------------------------
export const BANNED_TERMS: [string, RegExp][] = [
  ["biohack", /\bbiohack(s|ed|ing|er|ers)?\b/i],
  ["superfood", /\bsuperfoods?\b/i],
  ["miracle", /\bmiracles?\b|\bmiraculous(ly)?\b/i],
  ["game-changer", /\bgame[- ]chang(er|ers|ing)\b/i],
  ["secret", /\bsecrets?\b/i],
  ["holy grail", /\bholy grail\b/i],
  ["boost", /\bboost(s|ed|ing|er|ers)?\b/i],
  ["skyrocket", /\bskyrocket(s|ed|ing)?\b/i],
  ["shatter", /\bshatter(s|ed|ing)?\b/i],
  ["destroy", /\bdestroy(s|ed|ing)?\b/i],
  ["turbocharge", /\bturbo-?charg(e|es|ed|ing)\b/i],
  ["supercharge", /\bsuper-?charg(e|es|ed|ing)\b/i],
  ["science proves", /\bscience (proves|has proven|proved)\b/i],
  ["proven to", /\bproven to\b/i],
  ["life-changing", /\blife[- ]changing\b/i],
  ["insane", /\binsane(ly)?\b/i],
  ["transform your", /\btransform(s|ed|ing)? your\b/i],
  ["optimize your", /\boptimi[sz](e|es|ed|ing) your\b/i],
];

// H3 ---------------------------------------------------------------------------
/** Inflected verb forms only: "lower risk" is a comparison, "lowers risk" is a causal claim. */
export const CAUSAL_VERB =
  /(?<![-\w])(causes|caused|causing|cures?|cured|prevents?|prevented|preventing|lowers|lowered|reduces|reduced|reducing|raises|raised|increases|increased|decreases|decreased|improves|improved|improving|protects|protected|builds|built|burns|burned|triggers|triggered|leads to|led to)(?![-\w])/i;

// H5 ---------------------------------------------------------------------------
const RELATIVE_WORDING =
  /\d\s?%\s+(lower|higher|less|more|fewer|greater|reduction|increase|decrease|drop|cut)\b|\brelative risk\b|\bhazard ratio\b|\bodds ratio\b|\b(halves|halved|halving|doubles|doubled|doubling|triples|tripled|tripling)\b|\d\s?(x|times)\s+(as|more|less|higher|lower)\b/i;
const PERCENT_COMPARISON = /\d\s?%\s+(lower|higher|less|more|fewer|greater)\b/i;
const SIGNIFICANCE = /\bp\s?[<=>]\s?0?\.\d+|\b(statistically )?significan(t|tly|ce)\b/i;
const MAGNITUDE_WORD =
  /\b(huge|massive|dramatic|dramatically|powerful|powerfully|strong|strongly|major|large|largely|substantial|substantially|big|striking|strikingly|remarkable|remarkably|profound|profoundly)\b/i;

// Carousel ---------------------------------------------------------------------
export const CAROUSEL_LIMITS = { slides: 10, heading: 90, body: 280, caption: 2200, hashtags: 30 };
/** Conservative: basic Latin plus the punctuation the slide fonts are known to carry. */
const SAFE_GLYPHS = /^[\x20-\x7e -ÿ–—‘’“”−×]*$/;

export const MAX_SHARED_SHINGLES = 2;
export const READ_WORDS = { min: 350, max: 1000 };

// H10 ---------------------------------------------------------------------------
/** The word budget of each layer. Working values; this is the one place they live. */
export const LAYER_WORDS: Record<Layer, number> = { mechanism: 350, protocol: 150, audit: 250 };

/** Caveats belong in the audit. None of these may appear in mechanism text. */
export const CAVEAT_TERMS: [string, RegExp][] = [
  ["limitation", /\blimitations?\b/i],
  ["confound", /\bconfound/i],
  ["self-reported", /\bself[- ]report(ed|s|ing)?\b/i],
  ["p =", /\bp\s?=/i],
  ["p<", /\bp\s?</i],
  ["95%", /\b95\s?%/],
  ["CI", /\bCIs?\b/],
  ["sample size", /\bsample sizes?\b/i],
  ["dropout", /\bdrop-?outs?\b|\bdropped out\b/i],
  ["funded", /\bfund(ed|ing)\b/i],
];

// H11 ---------------------------------------------------------------------------
export const SENTENCE_WORDS = { fail: 30, warn: 22 };

export const THROAT_CLEARING: [string, RegExp][] = [
  ["it is worth noting", /\bit is worth noting\b/i],
  ["it should be noted", /\bit should be noted\b/i],
  ["it is important to note", /\bit is important to note\b/i],
  ["interestingly", /\binterestingly\b/i],
  ["notably", /\bnotably\b/i],
  ["the authors observed that", /\bthe authors observed that\b/i],
  ["the results suggest that it may", /\bthe results suggest that it may\b/i],
];

/**
 * A form of "to be" followed by a past participle. A hint, not a parser: it
 * also fires on "was tired", and a passive is sometimes the honest way to say
 * who did what ("sleep was recorded"). So this only ever warns.
 */
const IRREGULAR_PARTICIPLES =
  "built|done|found|given|made|seen|shown|taken|told|kept|held|put|set|sent|known|drawn|chosen|written|led|left|lost|paid|sold|thought|brought|bought|caught|taught|worn|begun";
export const PASSIVE_VOICE = new RegExp(
  `\\b(am|is|are|was|were|be|been|being)\\s+(?:not\\s+)?(?:\\w+ly\\s+)?((?!(?:need|indeed|bed|hundred|speed|red|tired)\\b)\\w{3,}ed|${IRREGULAR_PARTICIPLES})\\b`, "i");

interface Located {
  where: string;
  sentence: Sentence;
  headline: boolean;
  /** Set for text inside one of the three layers. */
  layer?: Layer;
}

export function lint(validated: Validated, editorialInput: unknown, source: string, options: LintOptions = {}): LintReport {
  const errors: LintIssue[] = [];
  const warnings: LintIssue[] = [];
  const fail = (rule: string, where: string, message: string) => errors.push({ rule, where, message });
  const warn = (rule: string, where: string, message: string) => warnings.push({ rule, where, message });

  // Which shape? The old flat one is refused unless the caller vouches for it.
  const shape = editorialShape(editorialInput);
  if (shape === "mixed") {
    fail("schema", "layers", "this read carries both shapes: remove sections and the top-level limitations once layers is written");
    return { errors, warnings, wordCount: 0 };
  }
  if (shape === "legacy" && !options.allowLegacyShape) {
    fail("schema", "layers", OLD_SHAPE_MESSAGE);
    return { errors, warnings, wordCount: 0 };
  }
  const parsed = shape === "legacy" ? LegacyEditorial.safeParse(editorialInput) : Editorial.safeParse(editorialInput);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) fail("schema", issue.path.join("."), issue.message);
    return { errors, warnings, wordCount: 0 };
  }
  const ed = parsed.data;
  const layers = "layers" in ed ? ed.layers : null;
  const facts = validated.facts;

  // Context: other studies and background concepts ------------------------------
  const context: LintContext = options.context ?? { studies: {}, concepts: {} };
  const usedStudies = new Set<string>();
  const usedConcepts = new Set<string>();
  const unreviewed = new Set<string>();
  const complained = new Set<string>();
  const once = (rule: string, where: string, message: string) => {
    const key = `${rule}|${where}|${message}`;
    if (!complained.has(key)) { complained.add(key); fail(rule, where, message); }
  };

  /** The fact a reference points at, from the paper or from a gated context study. Silent. */
  function factOf(ref: string): { fact: ValidatedFact; from: Validated } | null {
    const parsedRef = parseRef(ref);
    if (parsedRef.kind === "paper") return facts[ref] ? { fact: facts[ref], from: validated } : null;
    if (parsedRef.kind !== "study") return null;
    const study = context.studies[parsedRef.source];
    if (!study || !study.ok || study.withdrawn) return null;
    const fact = study.validated.facts[parsedRef.fact];
    return fact ? { fact, from: study.validated } : null;
  }

  /** Checks that a reference can be used here, and says why not. This is the gate on context citations. */
  function checkRef(ref: string, where: string): void {
    const parsedRef = parseRef(ref);
    if (parsedRef.kind === "paper") {
      if (!facts[ref]) once("orphan", where, `refers to "${ref}", which is not in the validated extraction`);
      return;
    }
    if (parsedRef.kind === "study") {
      const study = context.studies[parsedRef.source];
      if (!study) {
        once("context", where, `cites "${ref}", but there is no gated source content/context/${parsedRef.source}/`);
      } else if (!study.ok) {
        once("context", where, `cites "${ref}", but the source "${parsedRef.source}" did not pass the gate (${study.errors[0] ?? "rejected"})`);
      } else if (study.withdrawn) {
        once("context", where, `cites "${ref}", but the source "${parsedRef.source}" has been withdrawn (${study.withdrawn.nature}${study.withdrawn.date ? `, ${study.withdrawn.date}` : ""}); remove the citation`);
      } else if (!study.validated.facts[parsedRef.fact]) {
        once("context", where, `cites "${ref}", but the source "${parsedRef.source}" has no verified fact "${parsedRef.fact}"`);
      } else usedStudies.add(parsedRef.source);
      return;
    }
    const concept = context.concepts[parsedRef.slug];
    if (!concept) {
      once("context", where, `cites "${ref}", but there is no content/concepts/${parsedRef.slug}.json`);
    } else if (!concept.ok) {
      once("context", where, `cites "${ref}", but that concept fails its own checks (${concept.errors[0]})`);
    } else {
      usedConcepts.add(parsedRef.slug);
      if (!concept.reviewed) unreviewed.add(parsedRef.slug);
    }
  }

  // Collect every sentence a reader could see ----------------------------------
  const all: Located[] = [];
  const read: Located[] = [];
  function take(where: string, markup: string, opts: { headline?: boolean; inRead?: boolean; layer?: Layer } = {}): Sentence[] {
    try {
      const sentences = parseMarkup(markup);
      for (const sentence of sentences) {
        const item: Located = { where, sentence, headline: opts.headline ?? false, layer: opts.layer };
        all.push(item);
        if (opts.inRead) read.push(item);
      }
      return sentences;
    } catch (error) {
      fail("markup", where, (error as Error).message);
      return [];
    }
  }

  take("title", ed.title, { headline: true });
  take("teaser", ed.teaser, { headline: true });
  take("hook", ed.hook, { headline: true, inRead: true });
  take("populationPanel", ed.populationPanel, { inRead: true });

  /** Where the weak end of the headline range must be spelled out (H5), and the sentences found there. */
  let weakEndWhere = "sections.lower-bound";
  let weakEnd: Sentence[] = [];
  let limitationSentences: Sentence[][] = [];
  let limitationsWhere = "limitations";
  const bySection = new Map<string, Sentence[]>();

  if (layers) {
    for (const layer of LAYERS) {
      const body = layers[layer];
      if ("paragraphs" in body) {
        body.paragraphs.forEach((p, i) => take(`layers.${layer}[${i}]`, p, { inRead: true, layer }));
      }
      if (body.figure) {
        take(`layers.${layer}.figure.caption`, body.figure.caption, { inRead: true, layer });
        // Alt text is read aloud, not shown: held to every rule, but outside the word budget.
        take(`layers.${layer}.figure.alt`, body.figure.alt);
      }
    }
    const audit = layers.audit;
    const effect = take("layers.audit.effect", audit.effect, { inRead: true, layer: "audit" });
    if (!effect.some((s) => s.refs.includes(ed.primaryEstimate))) {
      fail("H5", "layers.audit.effect", `the raw effect size must cite the headline result "${ed.primaryEstimate}"`);
    }
    weakEndWhere = "layers.audit.weakEnd";
    weakEnd = take(weakEndWhere, audit.weakEnd, { inRead: true, layer: "audit" });
    limitationsWhere = "layers.audit.limitations";
    limitationSentences = audit.limitations.map((l, i) => take(`${limitationsWhere}[${i}]`, l, { inRead: true, layer: "audit" }));
    take("layers.audit.missed", audit.missed, { inRead: true, layer: "audit" });
    audit.more.forEach((p, i) => take(`layers.audit.more[${i}]`, p, { inRead: true, layer: "audit" }));
  } else {
    const legacy = ed as LegacyEditorial;
    for (const section of legacy.sections) {
      const collected: Sentence[] = [];
      section.paragraphs.forEach((p, i) => collected.push(...take(`sections.${section.id}[${i}]`, p, { inRead: true })));
      bySection.set(section.id, collected);
    }
    weakEnd = bySection.get("lower-bound") ?? [];
    limitationSentences = legacy.limitations.map((l, i) => take(`limitations[${i}]`, l, { inRead: true }));
    if (legacy.figure) {
      take("figure.caption", legacy.figure.caption, { inRead: true });
      take("figure.alt", legacy.figure.alt);
    }
  }

  ed.takeaways.forEach((t, i) => take(`takeaways[${i}]`, t));
  ed.carousel.slides.forEach((slide, i) => {
    take(`carousel.slides[${i}].heading`, slide.heading, { headline: true });
    if (slide.body) take(`carousel.slides[${i}].body`, slide.body);
  });
  take("carousel.caption", ed.carousel.caption);

  const allowedNumbers = (refs: string[]): number[] => {
    const out: number[] = [];
    for (const ref of refs) {
      const fact = factOf(ref)?.fact;
      if (!fact) continue;
      out.push(...numbersIn(fact.quote));
      if (fact.estimate) {
        out.push(fact.estimate.point);
        if (fact.estimate.ciLow !== null) out.push(fact.estimate.ciLow);
        if (fact.estimate.ciHigh !== null) out.push(fact.estimate.ciHigh);
      }
    }
    return out;
  };
  const unsupportedNumbers = (text: string, refs: string[]): number[] => {
    const allowed = allowedNumbers(refs).map(Math.abs);
    return numbersIn(text.replace(/95\s?% (CI|confidence interval)/gi, "")).filter((n) => !allowed.includes(Math.abs(n)));
  };

  // Sentence-level rules --------------------------------------------------------
  for (const { where, sentence, headline } of all) {
    const text = sentence.text;

    for (const [term, pattern] of BANNED_TERMS) {
      if (pattern.test(text)) fail("H1", where, `banned term "${term}": "${text}"`);
    }

    for (const ref of sentence.refs) checkRef(ref, where);

    const causal = CAUSAL_VERB.exec(text);
    if (sentence.refs.length === 0) {
      if (/\d/.test(text)) fail("orphan", where, `a sentence with a number must cite a fact: "${text}"`);
      if (causal) fail("orphan", where, `a causal sentence must cite a fact: "${text}"`);
    } else {
      const loose = unsupportedNumbers(text, sentence.refs);
      if (loose.length > 0) {
        fail("orphan", where, `${loose.join(", ")} not found in the cited passage(s) [${sentence.refs.join(", ")}]: "${text}"`);
      }
    }

    if (causal) {
      // A causal verb needs randomized human evidence behind every study the sentence rests on.
      const weakest = sentence.refs.map((r) => factOf(r)?.from).find((from) => from && from !== validated && !from.causalLanguagePermitted);
      if (!validated.causalLanguagePermitted) {
        fail("H3", where, `causal verb "${causal[0]}" in a ${validated.design} study; use "associated with": "${text}"`);
      } else if (weakest) {
        fail("H3", where, `causal verb "${causal[0]}" resting on another study that is a ${weakest.design} study; use "associated with": "${text}"`);
      } else if (!ed.populationTerms.some((term) => normalize(text).includes(normalize(term)))) {
        fail("H3", where, `causal verb "${causal[0]}" without the studied population (${ed.populationTerms.join(" / ")}): "${text}"`);
      }
    }

    const cited = sentence.refs.map((r) => factOf(r)?.fact.estimate).filter((e) => e !== undefined);
    if (RELATIVE_WORDING.test(text) && !cited.some((e) => e.absolute)) {
      fail("H5", where, `relative wording with no absolute figure cited alongside: "${text}"`);
    }
    if (PERCENT_COMPARISON.test(text) && cited.some((e) => e.measure === "aRD" || e.measure === "RD")) {
      fail("H5", where, `an absolute risk difference must be written in "points", not "% lower": "${text}"`);
    }
    if (headline && text.includes("%") && cited.some((e) => !e.absolute) && !/\brelative\b/i.test(text)) {
      fail("H5", where, `a percentage in a headline is absolute or marked "relative": "${text}"`);
    }
    if (SIGNIFICANCE.test(text) && MAGNITUDE_WORD.test(text)) {
      fail("H5", where, `statistical significance described as magnitude: "${text}"`);
    }
  }

  // H4: the rodent trap ----------------------------------------------------------
  if (validated.species !== "human") {
    const headlineText = normalize(all.filter((a) => a.headline).map((a) => a.sentence.text).join(" "));
    const speciesWord = { mouse: "mice", rat: "rats", other_animal: "animal", cell_culture: "cell" }[validated.species];
    if (!headlineText.includes(speciesWord)) fail("H4", "title", `non-human study: the headline must say "${speciesWord}"`);
    const readText = read.map((r) => r.sentence.text).join(" ");
    if (!readText.includes(NON_HUMAN_DISCLAIMER)) fail("H4", "read", `missing the required line: "${NON_HUMAN_DISCLAIMER}"`);
    for (const step of ed.steps) {
      if (!step.retired) fail("H4", `steps.${step.key}`, "a non-human study cannot carry a protocol for people");
    }
  }

  // H5: the interval of the headline result must be spelled out, or its absence stated
  const primaryFact = facts[ed.primaryEstimate];
  const primary = primaryFact?.estimate;
  if (!primaryFact || (!primary && !primaryFact.finding)) {
    fail("H5", "primaryEstimate", `"${ed.primaryEstimate}" is not a verified estimate or finding`);
  } else if (primary && primary.ciLow !== null && primary.ciHigh !== null) {
    const explained = weakEnd.some((s) => {
      const have = numbersIn(s.text).map(Math.abs);
      return s.refs.includes(ed.primaryEstimate)
        && have.includes(Math.abs(primary.ciLow!)) && have.includes(Math.abs(primary.ciHigh!));
    });
    if (!explained) {
      fail("H5", weakEndWhere, `must state both ends of the interval for "${ed.primaryEstimate}" and say what the weaker end means`);
    }
  } else {
    const disclosed = weakEnd.some((s) =>
      s.refs.includes(ed.primaryEstimate) && /\bno\b[^.]*\bconfidence interval\b/i.test(s.text));
    if (!disclosed) {
      fail("H5", weakEndWhere, `"${ed.primaryEstimate}" has no interval: a sentence citing it must say there is "no ... confidence interval"`);
    }
    warn("H5", "primaryEstimate", "the headline result has no confidence interval; check the read says what that leaves unknown");
  }
  if (!layers) {
    for (const id of ["lower-bound", "missed"]) {
      if (!bySection.has(id)) fail("structure", "sections", `a section with id "${id}" is required`);
    }
  }

  // H6: limitations ---------------------------------------------------------------
  limitationSentences.forEach((sentences, i) => {
    const cites = sentences.flatMap((s) => s.refs).some((r) => facts[r]?.kind === "limitation");
    if (!cites) fail("H6", `${limitationsWhere}[${i}]`, "must cite a limitation extracted from the paper");
  });

  // H9, H10, H11: the three-layer read --------------------------------------------
  let layerStats: Record<Layer, LayerStats> | undefined;
  if (layers) {
    const glossary = "glossary" in ed ? ed.glossary : [];

    // H11: voice. Every sentence a reader sees.
    for (const { where, sentence } of all) {
      for (const [phrase, pattern] of THROAT_CLEARING) {
        if (pattern.test(sentence.text)) fail("H11", where, `throat-clearing "${phrase}": say the thing: "${sentence.text}"`);
      }
      for (const one of splitSentences(sentence.text)) {
        const n = countWords(one);
        if (n > SENTENCE_WORDS.fail) fail("H11", where, `a sentence of ${n} words; the limit is ${SENTENCE_WORDS.fail}: "${one}"`);
        else if (n > SENTENCE_WORDS.warn) warn("H11", where, `a sentence of ${n} words; aim for ${SENTENCE_WORDS.warn} or fewer: "${one}"`);
        if (PASSIVE_VOICE.test(one)) warn("H11", where, `possibly passive ("${PASSIVE_VOICE.exec(one)![0]}"); say who did it if you can: "${one}"`);
      }
    }

    // H10: no caveats inside the mechanism layer.
    for (const { where, sentence, layer } of all) {
      if (layer !== "mechanism") continue;
      for (const [term, pattern] of CAVEAT_TERMS) {
        if (pattern.test(sentence.text)) fail("H10", where, `a caveat ("${term}") in the mechanism layer; it belongs in the audit: "${sentence.text}"`);
      }
    }

    // H10: word budget and sentence length of each layer.
    layerStats = {} as Record<Layer, LayerStats>;
    for (const layer of LAYERS) {
      const lengths = all.filter((a) => a.layer === layer).flatMap((a) => splitSentences(a.sentence.text)).map(countWords);
      const total = lengths.reduce((sum, n) => sum + n, 0);
      layerStats[layer] = {
        words: total,
        sentences: lengths.length,
        average: lengths.length === 0 ? 0 : Math.round((total / lengths.length) * 10) / 10,
        longest: Math.max(0, ...lengths),
      };
      if (total > LAYER_WORDS[layer]) fail("H10", `layers.${layer}`, `${total} words; the ${layer} layer has a budget of ${LAYER_WORDS[layer]}`);
    }

    // H9: a technical word needs its glossary entry.
    const plainRead = all.filter((a) => a.layer === "mechanism" || a.layer === "protocol" || a.where === "hook" || a.where === "populationPanel");
    const reported = new Set<string>();
    for (const { where, sentence } of plainRead) {
      for (const term of jargonIn(sentence.text)) {
        if (reported.has(term) || glossary.some((g) => glossaryCovers(g.term, term))) continue;
        reported.add(term);
        fail("H9", where, `"${term}" is used with no glossary entry saying what it physically does: "${sentence.text}"`);
      }
    }
    const seenTerms = new Set<string>();
    const readLower = read.map((r) => r.sentence.text).join(" ").toLowerCase();
    glossary.forEach((entry, i) => {
      const where = `glossary[${i}]`;
      const key = entry.term.toLowerCase();
      if (seenTerms.has(key)) fail("glossary", where, `"${entry.term}" is defined twice`);
      seenTerms.add(key);
      if (!readLower.includes(key)) warn("glossary", where, `"${entry.term}" is defined but never used in the read`);

      // From a concept file: the reviewed wording is used as it stands (its own checks ran when it was loaded).
      if (entry.concept !== null) {
        checkRef(`concept:${entry.concept}`, where);
        return;
      }
      // Written here: it must say which fact(s) it rests on, so the reader can be shown a source line.
      const plainText = entry.plain ?? "";
      if (entry.refs.length === 0) {
        fail("context", where, `the plain text for "${entry.term}" has no source: cite the fact(s) it rests on in "refs", or point "concept" at a concept file`);
      }
      for (const ref of entry.refs) {
        if (parseRef(ref).kind === "concept") fail("context", where, `to take a definition from a concept file, set "concept" on the entry instead of citing "${ref}" in refs`);
        else checkRef(ref, where);
      }
      const inside = jargonIn(plainText);
      if (inside.length > 0) fail("H9", where, `the plain text for "${entry.term}" uses a technical word (${inside.join(", ")}); say what it physically does instead`);
      const loose = unsupportedNumbers(plainText, entry.refs);
      if (loose.length > 0) fail("H7", where, `the plain text for "${entry.term}" carries a number (${loose.join(", ")}) that is not in the fact(s) it cites`);
      for (const [term, pattern] of BANNED_TERMS) {
        if (pattern.test(plainText)) fail("H1", where, `banned term "${term}"`);
      }
      for (const [phrase, pattern] of THROAT_CLEARING) {
        if (pattern.test(plainText)) fail("H11", where, `throat-clearing "${phrase}"`);
      }
      for (const one of splitSentences(plainText)) {
        const n = countWords(one);
        if (n > SENTENCE_WORDS.fail) fail("H11", where, `a sentence of ${n} words; the limit is ${SENTENCE_WORDS.fail}`);
      }
    });
  }

  // Context: an unreviewed concept may sit in a draft, never in a published read.
  for (const slug of unreviewed) {
    const message = `the concept "${slug}" has not been reviewed by the owner (npm run paper -- approve-concept ${slug})`;
    if (ed.publishedAt !== null) fail("context", `concept:${slug}`, `${message}; a published read cannot use it`);
    else warn("context", `concept:${slug}`, `${message}; this draft cannot be approved until it is`);
  }

  // H7 / H8: steps and simulator numbers trace to the paper ---------------------
  const keys = new Map(ed.steps.map((s) => [s.key, s]));
  if (keys.size !== ed.steps.length) fail("steps", "steps", "duplicate step keys");
  for (const step of ed.steps) {
    const where = `steps.${step.key}`;
    for (const [term, pattern] of BANNED_TERMS) {
      if (pattern.test(`${step.label} ${step.detail ?? ""}`)) fail("H1", where, `banned term "${term}"`);
    }
    if (CAUSAL_VERB.test(`${step.label} ${step.detail ?? ""}`)) fail("H3", where, "a step is an action, not a causal claim");
    // Another study or a background concept can sit beside a read. It can never be a reason to do something.
    const outside = [...step.refs, ...(step.evidenceRef ? [step.evidenceRef] : [])].filter(isContextRef);
    if (outside.length > 0) {
      fail("context", where, `a protocol step rests only on the paper itself; "${outside.join('", "')}" is a context source and can never back a step or give it weight`);
      continue;
    }
    if (step.evidenceRef !== null && !facts[step.evidenceRef]?.estimate && !facts[step.evidenceRef]?.finding) {
      fail("H7", where, `evidenceRef "${step.evidenceRef}" is not a verified estimate or finding`);
    }
    const refs = [...step.refs, ...(step.evidenceRef ? [step.evidenceRef] : [])];
    for (const ref of step.refs) if (!facts[ref]) fail("orphan", where, `refers to "${ref}", which is not in the validated extraction`);
    const loose = unsupportedNumbers(`${step.label} ${step.detail ?? ""}`, refs);
    if (loose.length > 0) fail("H7", where, `${loose.join(", ")} not found in the cited passage(s)`);
    if (step.kind === "weekly_target") {
      const counted = step.countsKey ? keys.get(step.countsKey) : undefined;
      if (step.targetPerWeek === null || !counted) fail("steps", where, "a weekly target needs targetPerWeek and a countsKey that exists");
      else if (counted.kind !== "action") fail("steps", where, "a weekly target can only count an action step");
    }
    if (step.kind === "condition" && (step.conditionKey === null || step.conditionValue === null)) {
      fail("steps", where, "a condition needs conditionKey and conditionValue");
    }
    if (step.kind !== "weekly_target" && (step.targetPerWeek !== null || step.countsKey !== null)) {
      fail("steps", where, "only a weekly target may set targetPerWeek / countsKey");
    }
  }

  /**
   * Everything a simulator or a figure shows comes through its params, so no
   * value in them may be loose: a number is { n, ref }, a fact is "fact:<id>".
   * A figure is held tighter still: text with a digit in it must be
   * { text, ref } and appear word for word in the cited passage, and anything
   * drawn as measured or proposed must cite a fact of the right kind.
   */
  function walkParams(node: unknown, path: string, what: "simulator" | "figure"): void {
    if (typeof node === "number") {
      fail("H7", path, `a bare number in ${what} params; use "fact:<id>" or { n, ref } so it traces to the paper`);
    } else if (typeof node === "string" && node.startsWith("fact:")) {
      if (isContextRef(node.slice(5))) fail("context", path, `"${node}" is a context source; a ${what} draws only the paper's own facts`);
      else if (!facts[node.slice(5)]) fail("H7", path, `"${node}" is not in the validated extraction`);
    } else if (typeof node === "string") {
      if (what === "figure" && /\d/.test(node)) {
        fail("H7", path, `"${node}" carries a number; in a figure use { n, ref } or { text, ref } so it traces to the paper`);
      }
    } else if (Array.isArray(node)) {
      node.forEach((child, i) => walkParams(child, `${path}[${i}]`, what));
    } else if (node !== null && typeof node === "object") {
      const record = node as Record<string, unknown>;
      const keys = Object.keys(record);
      if (typeof record.n === "number" && typeof record.ref === "string" && keys.length === 2) {
        const fact = facts[record.ref];
        if (!fact) fail("H7", path, `ref "${record.ref}" is not in the validated extraction`);
        else if (!numbersIn(fact.quote).map(Math.abs).includes(Math.abs(record.n))) {
          fail("H7", path, `${record.n} does not appear in the passage for "${record.ref}"`);
        }
        return;
      }
      if (what === "figure" && typeof record.text === "string" && typeof record.ref === "string" && keys.length === 2) {
        const fact = facts[record.ref];
        if (!fact) fail("H7", path, `ref "${record.ref}" is not in the validated extraction`);
        else if (!normalize(fact.quote).includes(normalize(record.text))) {
          fail("H7", path, `"${record.text}" does not appear in the passage for "${record.ref}"`);
        }
        return;
      }
      if (what === "figure" && "kind" in record) {
        const kind = record.kind;
        if (!(EVIDENCE_KINDS as readonly unknown[]).includes(kind)) {
          fail("figure", path, `kind must be "measured" or "proposed", not ${JSON.stringify(kind)}`);
        } else if (typeof record.fact !== "string" || !record.fact.startsWith("fact:")) {
          fail("figure", path, `a "${kind}" element must cite the fact it rests on, as fact: "fact:<id>"`);
        } else {
          const cited = facts[record.fact.slice(5)];
          const problem = cited ? evidenceKindProblem(kind as EvidenceKind, cited) : null;
          if (problem) fail("figure", path, `drawn as ${kind}, but ${problem}`);
        }
      }
      for (const [key, child] of Object.entries(record)) walkParams(child, `${path}.${key}`, what);
    }
  }
  walkParams(ed.simulator.params, "simulator.params", "simulator");

  // Figures: known to the app, described for people who cannot see them, and drawn only from facts.
  const figureDefs: [string, { figure: string; alt: string; params: Record<string, unknown>; spec?: unknown }][] = layers
    ? LAYERS.flatMap((layer) => (layers[layer].figure ? [[`layers.${layer}.figure`, layers[layer].figure!] as [string, typeof layers.mechanism.figure & object]] : []))
    : ((ed as LegacyEditorial).figure ? [["figure", (ed as LegacyEditorial).figure!]] : []);
  for (const [where, def] of figureDefs) {
    const key = figureKey(ed.slug, def.figure);
    if (def.spec !== undefined) {
      // Drawn by kind: the spec names facts only, the kind must exist, and a simulator needs a range (H12).
      // A fact of a gated context study may feed it (H7 amended): checked like any citation, and listed for the audit.
      for (const group of ["facts", "simulator"] as const) {
        const given = (def.spec as Record<string, unknown> | null)?.[group];
        if (given === null || typeof given !== "object") continue;
        for (const [param, id] of Object.entries(given)) {
          if (typeof id === "string" && parseRef(id).kind === "study") checkRef(id, `${where}.spec.${group}.${param}`);
        }
      }
      const problems = specProblems(def.spec, `${where}.spec`, (id) => {
        const e = factOf(id)?.fact;
        return e ? { kind: e.kind, unit: e.estimate?.unit ?? null, point: e.estimate?.point ?? null, ciLow: e.estimate?.ciLow ?? null, ciHigh: e.estimate?.ciHigh ?? null } : undefined;
      });
      for (const problem of problems) fail(problem.rule, problem.where, problem.message);
    } else if (!(options.figures ?? []).includes(key)) {
      fail("figure", where, `unknown figure "${key}"; it is not listed in lib/content/figures.ts`);
    }
    let altWords = 0;
    try { altWords = countWords(parseMarkup(def.alt).map((s) => s.text).join(" ")); } catch { /* reported as markup above */ }
    if (altWords < 4) fail("figure", `${where}.alt`, "empty alt text: describe in a sentence what the picture shows, for a reader who cannot see it");
    walkParams(def.params, `${where}.params`, "figure");
  }

  // Copying from the source ---------------------------------------------------------
  const readText = read.map((r) => r.sentence.text).join(" ");
  const copied = sharedShingles(readText, source);
  if (copied.length > MAX_SHARED_SHINGLES) {
    fail("copy", "read", `${copied.length} runs of 7 words match the source, e.g. "${copied[0]}"; rewrite in your own words`);
  }
  const wordCount = words(readText).length;
  if (wordCount < READ_WORDS.min) warnings.push({ rule: "length", where: "read", message: `${wordCount} words: under a two-minute read` });
  if (wordCount > READ_WORDS.max) fail("length", "read", `${wordCount} words: over a five-minute read`);

  // Carousel -------------------------------------------------------------------------
  const slides = ed.carousel.slides;
  if (slides.length > CAROUSEL_LIMITS.slides) fail("carousel", "carousel.slides", `Instagram allows ${CAROUSEL_LIMITS.slides} slides; this has ${slides.length}`);
  if (slides[0]?.kind !== "hook") fail("carousel", "carousel.slides[0]", "the first slide is the hook");
  if (slides[slides.length - 1]?.kind !== "cta") fail("carousel", "carousel.slides", "the last slide points to the interactive widget (kind: cta)");
  if (!slides.some((s) => s.kind === "population")) fail("H3", "carousel.slides", "the studied population gets its own slide, not a footnote");
  if (!slides.some((s) => s.kind === "limitation")) fail("H6", "carousel.slides", "at least one slide states a limitation");
  slides.forEach((slide, i) => {
    const strip = (m: string | null) => { try { return m ? parseMarkup(m).map((s) => s.text).join(" ") : ""; } catch { return ""; } };
    const heading = strip(slide.heading);
    const body = strip(slide.body);
    if (heading.length > CAROUSEL_LIMITS.heading) fail("carousel", `carousel.slides[${i}].heading`, `${heading.length} characters; the limit is ${CAROUSEL_LIMITS.heading}`);
    if (body.length > CAROUSEL_LIMITS.body) fail("carousel", `carousel.slides[${i}].body`, `${body.length} characters; the limit is ${CAROUSEL_LIMITS.body}`);
    if (!SAFE_GLYPHS.test(heading + body)) fail("carousel", `carousel.slides[${i}]`, "contains a character the slide fonts may not carry (it would render as an empty box)");
  });
  try {
    const caption = parseMarkup(ed.carousel.caption).map((s) => s.text).join(" ");
    if (caption.length > CAROUSEL_LIMITS.caption) fail("carousel", "carousel.caption", `${caption.length} characters; Instagram allows ${CAROUSEL_LIMITS.caption}`);
  } catch { /* already reported as a markup error */ }

  const cites = usedStudies.size + usedConcepts.size > 0
    ? { context: { studies: [...usedStudies].sort(), concepts: [...usedConcepts].sort(), unreviewed: [...unreviewed].sort() } }
    : {};
  return { errors, warnings, wordCount, ...(layerStats ? { layers: layerStats } : {}), ...cites };
}
