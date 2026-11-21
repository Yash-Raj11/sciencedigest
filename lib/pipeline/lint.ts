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

import { DECK_LIMITS, HOOK_HEDGES, VERDICTS, altHookProblems, deckShapeProblems, receiptInterval, slideEvidence, slideMarkup, slideNumbers, slideValues, type Verdict } from "./carousel";
import type { CommonState } from "./common";
import { DESIGN_LABEL } from "../content/source-line";
import { Editorial, LAYERS, MIXED_SHAPE_MESSAGE, OLD_SHAPE_MESSAGE, editorialShape, type Layer } from "./editorial";
import type { ConceptState } from "./concepts";
import type { Validated, ValidatedFact } from "./gate";
import { NON_HUMAN_DISCLAIMER } from "./grade";
import { headlineStatesNumber } from "./format";
import { glossaryCovers, jargonIn } from "./jargon";
import { simulatorSource } from "../content/fact-library";
import { isFigureKind, kindParamsProblems, specProblems } from "../content/figure-kinds";
import { sketchProblems } from "../content/sketch";
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
  /** The size and sentence length of each layer (H10, H11). Absent when the read failed its schema. */
  layers?: Record<Layer, LayerStats>;
  /** The context sources the read cites, and which concepts the owner has not reviewed yet. */
  context?: { studies: string[]; concepts: string[]; unreviewed: string[] };
  /**
   * What only the deck uses and the owner has not reviewed yet ("concept:<slug>", "common:<slug>").
   * Not an error (the read may be published), but the queue refuses to approve the deck until it is empty.
   */
  deckPending?: string[];
}

/** One folder of content/context/, after the gate (role "context") and the retraction check. */
export type ContextStudyState =
  | {
      ok: true; validated: Validated; withdrawn: { nature: string; date: string | null; reason: string } | null;
      /** Facts the owner ruled out of use (content/context/<slug>/excluded.json): id -> why. A read may not cite them. */
      excluded?: Record<string, string>;
    }
  | { ok: false; errors: string[] };

/** Everything a read may cite besides its own paper. Built by scripts/context-load.ts. */
export interface LintContext {
  studies: Record<string, ContextStudyState>;
  concepts: Record<string, ConceptState>;
  /** Common knowledge the owner approves once (content/common/, lib/pipeline/common.ts). The deck only. */
  common?: Record<string, CommonState>;
  /**
   * The fact library (content/library.json, lib/content/fact-library.ts): context facts the
   * owner approved for simulators, as "<study>/<fact>". A simulator may draw a context fact
   * only from here. Absent: empty, so no context fact can feed a simulator.
   */
  library?: readonly string[];
}

export interface LintOptions {
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
/**
 * Direction said twice (owner, 2026-11-15): a minus sign and "lower", "fewer" or "less" in one
 * sentence read as a double negative ("−14.9 points lower"). Say the direction once, in words.
 * A minus sign here is one in front of a digit, after a space, bracket or the start: "1–2 days"
 * and "10-year" are not minus signs.
 */
const NEGATIVE_NUMBER = /(?:^|[\s(\[:])[−-]\s?\d/;
const DOWN_WORD = /\b(lower|fewer|less)\b/i;
export function directionTwice(text: string): boolean {
  return NEGATIVE_NUMBER.test(text) && DOWN_WORD.test(text);
}

const SIGNIFICANCE = /\bp\s?[<=>]\s?0?\.\d+|\b(statistically )?significan(t|tly|ce)\b/i;
const MAGNITUDE_WORD =
  /\b(huge|massive|dramatic|dramatically|powerful|powerfully|strong|strongly|major|large|largely|substantial|substantially|big|striking|strikingly|remarkable|remarkably|profound|profoundly)\b/i;

// Plain language (owner, 2026-11-14) ---------------------------------------------
/**
 * Research words a reader outside a statistics class misreads. Outside the Receipts (the
 * audit layer) a read says "a clear difference" or "no clear difference" instead.
 */
export const PLAIN_SIGNIFICANT = /\b(?:statistically\s+)?(?:non-?\s?|in)?significan(?:t|tly|ce)\b/i;
export const PLAIN_STATS: [string, RegExp][] = [
  ["a p-value", /\bp\s?[<=>≤≥]\s?0?\.\d|\bp-?values?\b/i],
  ["a confidence interval", /\bconfidence intervals?\b|\b95\s?%\s?(?:CI|range|interval)/i],
  ["a confidence interval", /\bCIs?\b/],
  ["\"effect size\"", /\beffect sizes?\b/i],
];
/**
 * A result the study could not tell from zero is not "no effect": it is "no clear difference".
 * These words claim the thing was shown to do nothing, which no study of this size can show.
 */
export const NULL_OVERCLAIM =
  /\b(?:did\s?n[o']?t|didn['’]t|does\s?n[o']?t|doesn['’]t)\s+(?:change|affect|alter|matter|work)\b|\b(?:no|zero)\s+(?!clear\b)(?:[a-z]+\s+)?(?:effect|impact)\b(?!\s+sizes?)|\bunchanged\b|\bmade no difference\b|\b(?:showed|did) nothing\b/i;
/**
 * Words that say which way a result went. A sentence may use one only when a fact it cites
 * states the direction: a difference whose range excludes "no difference", two printed levels
 * that differ, or the paper's own words saying lower, higher, more or less. Otherwise neutral
 * wording ("differed"). Background sentences in the mechanism layer are not results.
 */
export const DIRECTION_WORD =
  /\b(?:lower|higher|rose|risen|rises|fell|fallen|falls|dropped|drops|declined|increased|decreased|reduced|elevated|smaller|larger|worse|better)\b/i;
const QUOTE_DIRECTION =
  /\b(?:lower|higher|less|more|fewer|greater|decreas\w*|increas\w*|reduc\w*|rose|fell|declin\w*|elevat\w*|improv\w*|wors\w*|better|drop\w*|rais\w*|shorter|longer|smaller|larger)\b/i;
const RATIO_MEASURES: ReadonlySet<string> = new Set(["RR", "HR", "OR"]);
const LEVEL_MEASURES: ReadonlySet<string> = new Set(["proportion", "mean"]);

/** Does this fact, on its own, say which way a result went? */
export function statesDirection(fact: ValidatedFact): boolean {
  const e = fact.estimate;
  if (e && !LEVEL_MEASURES.has(e.measure)) {
    const none = RATIO_MEASURES.has(e.measure) ? 1 : 0;
    if (e.point === none) return false;
    if (e.ciLow !== null && e.ciHigh !== null) return e.ciLow > none || e.ciHigh < none;
    return true;
  }
  if (e) return false;
  return QUOTE_DIRECTION.test(fact.quote) && !/\bno\b[^.;]*\b(?:significant|difference)\b|\bnon-?significant\b|\bnot (?:statistically )?significant\b/i.test(fact.quote);
}

// Carousel ---------------------------------------------------------------------
/** Instagram's own limits on the caption. The slide limits live in ./carousel.ts (DECK_LIMITS). */
export const CAROUSEL_LIMITS = { caption: 2200, hashtags: 30 };
/** Conservative: basic Latin plus the punctuation the slide fonts are known to carry. */
export const SAFE_GLYPHS = /^[\x20-\x7e -ÿ–—‘’“”−×]*$/;

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
  /** In the Receipts: the audit layer. */
  receipts: boolean;
}

/**
 * The question headline (owner, 2026-11-15). A read's headline is the question its paper
 * answers, with the plain finding directly beneath it. The question must:
 *   - be exactly one sentence, ending in "?";
 *   - not presuppose an answer: it opens as a yes/no question (Does, Do, Is, Can ...), never
 *     "Why does ...", "How much ...", "How does ..." (each assumes the effect exists), and it
 *     carries none of "still", "really", "even", "actually";
 * and the finding line under it must exist and must not be a question itself.
 * Pure: words in, problems out.
 */
const YES_NO = /^(does|do|did|is|are|was|were|can|could|will|would|should|has|have|had)\b/i;
const PRESUPPOSES = /\b(why|how (much|many|does|do|did|can|long|far)|by how much|what makes|still|really|even|actually)\b/i;

export function questionProblems(question: string[], finding: string[]): string[] {
  const problems: string[] = [];
  if (question.length !== 1) problems.push(`the headline is one question, one sentence; found ${question.length}`);
  const q = (question[0] ?? "").trim();
  if (q && !q.endsWith("?")) problems.push(`the headline must be the question the paper answers, ending in "?": "${q}"`);
  const presupposed = PRESUPPOSES.exec(q);
  if (presupposed) problems.push(`"${presupposed[0]}" presupposes an answer; ask a yes/no question the finding answers: "${q}"`);
  else if (q && !YES_NO.test(q)) problems.push(`open with Does, Do, Is, Can or similar, so the question does not presuppose an answer: "${q}"`);
  const line = finding.join(" ").trim();
  if (!line) problems.push("a question headline needs the plain finding directly under it (card.headline)");
  else if (line.endsWith("?")) problems.push(`the line under the question is the finding, not another question: "${line}"`);
  return problems;
}

export function lint(validated: Validated, editorialInput: unknown, source: string, options: LintOptions = {}): LintReport {
  const errors: LintIssue[] = [];
  const warnings: LintIssue[] = [];
  const fail = (rule: string, where: string, message: string) => errors.push({ rule, where, message });
  const warn = (rule: string, where: string, message: string) => warnings.push({ rule, where, message });

  // Which shape? The old flat one is refused, for every paper (step 2E removed its allowlist).
  const shape = editorialShape(editorialInput);
  if (shape === "mixed") {
    fail("schema", "layers", MIXED_SHAPE_MESSAGE);
    return { errors, warnings, wordCount: 0 };
  }
  if (shape === "legacy") {
    fail("schema", "layers", OLD_SHAPE_MESSAGE);
    return { errors, warnings, wordCount: 0 };
  }
  const parsed = Editorial.safeParse(editorialInput);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) fail("schema", issue.path.join("."), issue.message);
    return { errors, warnings, wordCount: 0 };
  }
  const ed = parsed.data;
  const layers = ed.layers;
  const facts = validated.facts;

  // Context: other studies and background concepts ------------------------------
  const context: LintContext = options.context ?? { studies: {}, concepts: {} };
  const usedStudies = new Set<string>();
  const usedConcepts = new Set<string>();
  const unreviewed = new Set<string>();
  const deckPending = new Set<string>();
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
      } else if (study.excluded && Object.hasOwn(study.excluded, parsedRef.fact)) {
        once("context", where, `cites "${ref}", which is excluded from use: ${study.excluded[parsedRef.fact]}`);
      } else usedStudies.add(parsedRef.source);
      return;
    }
    const onDeck = where.startsWith("carousel.");
    if (parsedRef.kind === "common") {
      const common = context.common?.[parsedRef.slug];
      if (!onDeck) once("context", where, `cites "${ref}": common knowledge may be cited on the deck only, not in the read`);
      else if (!common) once("context", where, `cites "${ref}", but there is no content/common/${parsedRef.slug}.json`);
      else if (!common.ok) once("context", where, `cites "${ref}", but that fact fails its own checks (${common.errors[0]})`);
      else if (!common.reviewed) deckPending.add(ref);
      return;
    }
    const concept = context.concepts[parsedRef.slug];
    if (!concept) {
      once("context", where, `cites "${ref}", but there is no content/concepts/${parsedRef.slug}.json`);
    } else if (!concept.ok) {
      once("context", where, `cites "${ref}", but that concept fails its own checks (${concept.errors[0]})`);
    } else {
      usedConcepts.add(parsedRef.slug);
      // Used on the deck alone, an unreviewed concept holds up the deck's approval, not the read.
      if (!concept.reviewed) {
        if (onDeck) deckPending.add(ref);
        else unreviewed.add(parsedRef.slug);
      }
    }
  }

  // Collect every sentence a reader could see ----------------------------------
  const all: Located[] = [];
  const read: Located[] = [];
  function take(where: string, markup: string, opts: { headline?: boolean; inRead?: boolean; layer?: Layer } = {}): Sentence[] {
    try {
      const sentences = parseMarkup(markup);
      for (const sentence of sentences) {
        const receipts = opts.layer === "audit";
        const item: Located = { where, sentence, headline: opts.headline ?? false, layer: opts.layer, receipts };
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
  // The source line's own words (who, how many or how long): every rule, outside the word budget.
  take("source.who", ed.source.who);
  take("source.span", ed.source.span);
  // The finding card: the key result at a glance. Its headline rests on the headline result.
  const question = take("card.question", ed.card.question, { headline: true, inRead: true });
  const cardHeadline = take("card.headline", ed.card.headline, { headline: true, inRead: true });
  for (const problem of questionProblems(question.map((s) => s.text), cardHeadline.map((s) => s.text))) fail("headline", "card.question", problem);
  take("card.support", ed.card.support, { inRead: true });
  // The card prints the headline result's number in front of a headline that states none
  // ("−14.9 points" + "lower 10-year risk ..."): the same double direction, made on the screen.
  {
    const point = facts[ed.primaryEstimate]?.estimate?.point;
    const words = cardHeadline.map((s) => s.text).join(" ");
    if (point !== undefined && point < 0 && !headlineStatesNumber(cardHeadline, point) && DOWN_WORD.test(words)) {
      fail("direction", "card.headline", `the card prints the minus number in front of this line, so "lower/fewer/less" says the direction twice; state the number in the line, in words: "${words}"`);
    }
  }
  if (!cardHeadline.some((s) => s.refs.includes(ed.primaryEstimate))) {
    fail("card", "card.headline", `the finding card's headline must cite the headline result "${ed.primaryEstimate}"`);
  }
  // The feed card's still figure (owner, 2026-11-14): axis labels only, no numeric ticks or values.
  // Its words take every rule, and none may hold a digit; the figure must be one the read draws.
  for (const [name, markup] of Object.entries(ed.glance)) {
    if (name === "figure" || markup === undefined) continue;
    const where = `glance.${name}`;
    if (take(where, markup).some((sentence) => /\p{N}/u.test(sentence.text))) fail("glance", where, "the feed card's figure shows no number: no digit in its axis labels, alt text, note or Try-it words");
  }
  {
    const own = [layers.mechanism.figure, layers.protocol.figure, layers.audit.figure];
    const ids = own.filter((f) => f != null).map((f) => f!.figure);
    if (ed.glance.figure === "simulator") {
      if (ed.simulator.spec === undefined) fail("glance", "glance.figure", `"simulator" needs a simulator drawn by kind (simulator.spec); name one of the read's figures instead: ${ids.join(", ") || "none"}`);
      if (ed.accessTier === "premium") fail("glance", "glance.figure", "a members' read's card is public: name one of its figures, not its simulator");
    } else if (!ids.includes(ed.glance.figure)) {
      fail("glance", "glance.figure", `"${ed.glance.figure}" is not one of the read's figures (${ids.join(", ") || "none"})`);
    }
  }
  // A simulator's own sentences (drawn by kind): every rule, outside the word budget, like alt text.
  for (const [name, markup] of Object.entries(ed.simulator.words ?? {})) take(`simulator.words.${name}`, markup);

  for (const layer of LAYERS) {
    const body = layers[layer];
    if ("paragraphs" in body) body.paragraphs.forEach((p, i) => take(`layers.${layer}[${i}]`, p, { inRead: true, layer }));
    if (body.figure) {
      // An audit figure with a title is its own receipt; the title is read like any receipt text.
      if ("title" in body.figure && body.figure.title) take(`layers.${layer}.figure.title`, body.figure.title, { inRead: true, layer });
      if (body.figure.headline) take(`layers.${layer}.figure.headline`, body.figure.headline, { inRead: true, layer });
      take(`layers.${layer}.figure.caption`, body.figure.caption, { inRead: true, layer });
      // Alt text is read aloud, not shown: held to every rule, but outside the word budget.
      take(`layers.${layer}.figure.alt`, body.figure.alt);
    }
  }
  if (layers.protocol.figureSlot === "try" && !layers.protocol.figure) {
    fail("figure", "layers.protocol.figureSlot", "\"try\" places the protocol layer's figure in the Try it slot, but the layer has no figure");
  }
  const audit = layers.audit;
  const effect = take("layers.audit.effect", audit.effect, { inRead: true, layer: "audit" });
  if (!effect.some((s) => s.refs.includes(ed.primaryEstimate))) {
    fail("H5", "layers.audit.effect", `the raw effect size must cite the headline result "${ed.primaryEstimate}"`);
  }
  /** Where the weak end of the headline range must be spelled out (H5), and the sentences found there. */
  const weakEndWhere = "layers.audit.weakEnd";
  const weakEnd = take(weakEndWhere, audit.weakEnd, { inRead: true, layer: "audit" });
  const limitationsWhere = "layers.audit.limitations";
  const limitationSentences = audit.limitations.map((l, i) => take(`${limitationsWhere}[${i}]`, l, { inRead: true, layer: "audit" }));
  take("layers.audit.missed", audit.missed, { inRead: true, layer: "audit" });
  audit.more.forEach((p, i) => take(`layers.audit.more[${i}]`, p, { inRead: true, layer: "audit" }));

  ed.takeaways.forEach((t, i) => take(`takeaways[${i}]`, t));
  /** Each slide's sentences, kept per slide for the deck rules below; `art` marks the art's own words. */
  // The deck's slides, then its alternate opening slides: every one held to the same slide rules.
  const deckEntries = [
    ...ed.carousel.slides.map((slide, i) => ({ slide, i, at: `carousel.slides[${i}]` })),
    ...ed.carousel.altHooks.map((slide, i) => ({ slide: slide as typeof ed.carousel.slides[number], i, at: `carousel.altHooks[${i}]` })),
  ];
  const slideSentences = deckEntries.map(({ slide, i, at }) =>
    slideMarkup(slide, i, at).flatMap(({ where, markup, art }) => take(where, markup, { headline: where.endsWith(".heading") }).map((s) => ({ ...s, where, art }))));
  take("carousel.caption", ed.carousel.caption);

  const allowedNumbers = (refs: string[]): number[] => {
    const out: number[] = [];
    for (const ref of refs) {
      const common = parseRef(ref).kind === "common" ? context.common?.[ref.slice(7)] : undefined;
      if (common?.ok) out.push(...numbersIn(common.common.statement));
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
    // One claim per clause (owner, 2026-11-15): a headline or finding clause rests on one result.
    // Two results under one marker would let a time from one fact and a direction from another
    // merge into a claim neither makes ("lower at 30 minutes"). Context facts may come along.
    if (headline) {
      const results = sentence.refs.filter((r) => { const k = factOf(r)?.fact.kind; return k === "estimate" || k === "finding"; });
      if (results.length > 1) {
        fail("one-claim", where, `one clause cites ${results.length} results (${results.join(", ")}); give each its own clause and marker, so no claim joins two facts: "${text}"`);
      }
    }
    // A descriptive fact (who was studied, at the start) is never a headline (owner, 2026-11-15).
    if (headline) {
      const described = sentence.refs.filter((r) => factOf(r)?.fact.kind === "descriptive");
      if (described.length > 0) fail("descriptive", where, `"${described.join(", ")}" describes who was studied at the start; it may be drawn, never put in a headline: "${text}"`);
    }
    if (directionTwice(text)) {
      fail("direction", where, `a minus sign and "lower/fewer/less" say the direction twice; keep the words and drop the sign: "${text}"`);
    }
  }

  // Plain language (owner, 2026-11-14): every sentence a reader sees -----------------
  for (const { where, sentence, layer, receipts } of all) {
    // The mechanism layer, its figure caption and alt text included, explains; it reports no result.
    const mechanism = layer === "mechanism" || where.startsWith("layers.mechanism.");
    const text = sentence.text;
    if (!receipts) {
      if (PLAIN_SIGNIFICANT.test(text)) {
        fail("plain", where, `"significant" outside the Receipts; say "a clear difference" or "no clear difference": "${text}"`);
      }
      const stat = PLAIN_STATS.find(([, pattern]) => pattern.test(text));
      if (stat) fail("plain", where, `${stat[0]} outside the Receipts; keep it there and say it in plain words here: "${text}"`);
    }
    if (NULL_OVERCLAIM.test(text)) {
      fail("plain", where, `"${NULL_OVERCLAIM.exec(text)![0]}" claims the study showed nothing happens; a result it could not tell from zero is "no clear difference": "${text}"`);
    }
    const direction = DIRECTION_WORD.exec(text);
    if (direction && !mechanism) {
      const cited = sentence.refs.map((r) => factOf(r)?.fact).filter((f) => f !== undefined);
      const background = sentence.refs.some((r) => parseRef(r).kind === "concept");
      const levels = cited.map((f) => f.estimate).filter((e) => e && LEVEL_MEASURES.has(e.measure)).map((e) => `${e!.unit}:${e!.point}`);
      const stated = background || cited.some(statesDirection) || new Set(levels).size >= 2;
      if (!stated) {
        fail("plain", where, `"${direction[0]}" says which way it went, but no cited fact states a direction; say "differed", or cite the fact that says it: "${text}"`);
      }
    }
  }

  // A fact's label is our wording, not the paper's, and the app shows it outside the Receipts
  // (a protocol step's source line, the passage panel). Held to the same plain-language rules.
  const labelled = new Map<string, ValidatedFact>(Object.entries(facts));
  for (const { sentence } of all) {
    for (const ref of sentence.refs) {
      const hit = parseRef(ref).kind === "study" ? factOf(ref)?.fact : undefined;
      if (hit) labelled.set(ref, hit);
    }
  }
  for (const [id, fact] of labelled) {
    const where = `facts.${id}.label`;
    if (PLAIN_SIGNIFICANT.test(fact.label)) fail("plain", where, `"significant" in a fact's label, which shows outside the Receipts; say "a clear difference" or "no clear difference": "${fact.label}"`);
    const stat = PLAIN_STATS.find(([, pattern]) => pattern.test(fact.label));
    if (stat) fail("plain", where, `${stat[0]} in a fact's label, which shows outside the Receipts: "${fact.label}"`);
    if (NULL_OVERCLAIM.test(fact.label)) fail("plain", where, `"${NULL_OVERCLAIM.exec(fact.label)![0]}" in a fact's label; say "no clear difference": "${fact.label}"`);
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

  // H6: limitations ---------------------------------------------------------------
  limitationSentences.forEach((sentences, i) => {
    const cites = sentences.flatMap((s) => s.refs).some((r) => facts[r]?.kind === "limitation");
    if (!cites) fail("H6", `${limitationsWhere}[${i}]`, "must cite a limitation extracted from the paper");
  });

  // H9, H10, H11: the three-layer read --------------------------------------------
  let layerStats: Record<Layer, LayerStats>;
  {
    const glossary = ed.glossary;

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
  const declaredSketches = new Set((ed.sketches ?? []).map((sk) => (sk as { id?: unknown } | null)?.id).filter((id): id is string => typeof id === "string"));
  const drawnSketches = new Set<string>();
  function walkParams(node: unknown, path: string, what: "simulator" | "figure"): void {
    if (typeof node === "number") {
      fail("H7", path, `a bare number in ${what} params; use "fact:<id>" or { n, ref } so it traces to the paper`);
    } else if (typeof node === "string" && node.startsWith("sketch:")) {
      // A sketch drawn by a figure or a simulator: declared in `sketches`, checked there.
      const id = node.slice(7);
      if (!declaredSketches.has(id)) fail("sketch", path, `"${node}" is not declared in sketches; a sketch is drawn only from its declared, checked spec`);
      else drawnSketches.add(id);
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

  // Sketches: a shape only, on a reviewed concept, monochrome and dotted (lib/content/sketch.ts).
  (ed.sketches ?? []).forEach((sketch, i) => {
    for (const problem of sketchProblems(sketch, `sketches[${i}]`, context.concepts)) fail(problem.rule, problem.where, problem.message);
    const slug = (sketch as { concept?: unknown } | null)?.concept;
    if (typeof slug === "string" && context.concepts[slug]?.ok) usedConcepts.add(slug);
  });

  // Figures: known to the app, described for people who cannot see them, and drawn only from facts.
  const figureDefs: [string, { figure: string; alt: string; params: Record<string, unknown>; spec?: unknown }][] =
    LAYERS.flatMap((layer) => (layers[layer].figure ? [[`layers.${layer}.figure`, layers[layer].figure!] as [string, typeof layers.mechanism.figure & object]] : []));
  /**
   * A figure drawn by kind: the spec names facts only, the kind must exist, and a simulator needs a
   * range (H12). A fact of a gated context study may feed it (H7 amended): checked like any citation,
   * and listed for the audit. Its simulator group draws a context fact only from the fact library.
   */
  function checkSpec(spec: unknown, where: string): void {
    for (const group of ["facts", "simulator"] as const) {
      const given = (spec as Record<string, unknown> | null)?.[group];
      if (given === null || typeof given !== "object") continue;
      for (const [param, named] of Object.entries(given)) {
        for (const id of Array.isArray(named) ? named : [named]) {
          if (typeof id !== "string" || parseRef(id).kind !== "study") continue;
          checkRef(id, `${where}.${group}.${param}`);
          // A simulator input: the paper's own fact, or one the owner approved into the library (SIMULATORS.md g).
          if (group === "simulator" && simulatorSource(id, facts, context.library ?? []) === "missing") {
            fail("context", `${where}.simulator.${param}`, `"${id}" is not in the fact library (content/library.json); a simulator draws on the paper's own facts or an owner-approved library fact. Queue it as a simulator upgrade for the owner`);
          }
        }
      }
    }
    const problems = specProblems(spec, where, (id) => {
      const e = factOf(id)?.fact;
      return e ? { kind: e.kind, unit: e.estimate?.unit ?? null, point: e.estimate?.point ?? null, spread: e.spread ?? null, ciLow: e.estimate?.ciLow ?? null, ciHigh: e.estimate?.ciHigh ?? null } : undefined;
    });
    for (const problem of problems) fail(problem.rule, problem.where, problem.message);
  }

  // A simulator drawn by kind: the spec is checked like a figure's, its kind is the simulator's,
  // and it carries alt text. Its words are held to every rule (outside the word budget, like alt).
  const sim = ed.simulator;
  if (sim.spec !== undefined) {
    const specKind = (sim.spec as { kind?: unknown } | null)?.kind;
    if (specKind !== sim.kind) fail("figure-spec", "simulator.spec.kind", `the spec is a "${String(specKind)}" but the simulator is a "${sim.kind}"; they must match`);
    checkSpec(sim.spec, "simulator.spec");
    for (const problem of kindParamsProblems(sim.spec, sim.params, "simulator")) fail(problem.rule, problem.where, problem.message);
    let altWords = 0;
    try { altWords = countWords(parseMarkup(sim.words?.alt ?? "").map((x) => x.text).join(" ")); } catch { /* reported as markup above */ }
    if (altWords < 4) fail("figure", "simulator.words.alt", "empty alt text: describe in a sentence what the chart shows, for a reader who cannot see it");
  } else if (isFigureKind(sim.kind)) {
    fail("figure-spec", "simulator.spec", `a "${sim.kind}" simulator is drawn by kind and needs a spec naming its facts`);
  }

  for (const [where, def] of figureDefs) {
    const key = figureKey(ed.slug, def.figure);
    if (def.spec !== undefined) {
      checkSpec(def.spec, `${where}.spec`);
    } else if (!(options.figures ?? []).includes(key)) {
      fail("figure", where, `unknown figure "${key}"; it is not listed in lib/content/figures.ts`);
    }
    let altWords = 0;
    try { altWords = countWords(parseMarkup(def.alt).map((s) => s.text).join(" ")); } catch { /* reported as markup above */ }
    if (altWords < 4) fail("figure", `${where}.alt`, "empty alt text: describe in a sentence what the picture shows, for a reader who cannot see it");
    walkParams(def.params, `${where}.params`, "figure");
  }
  // A declared sketch that no figure draws is a sketch nobody can check against the finding.
  for (const id of declaredSketches) {
    if (!drawnSketches.has(id)) fail("sketch", "sketches", `"${id}" is declared but no figure or simulator draws it ("sketch:${id}")`);
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

  // Carousel (second shape, owner 2026-11-19: lib/pipeline/carousel.ts) -----------------------
  const slides = ed.carousel.slides;
  for (const [where, message] of [...deckShapeProblems(slides), ...altHookProblems(ed.carousel.altHooks)]) fail("carousel", where, message);
  // The receipts slide prints the range bar's numbers: they count as its art's words. Its small footer
  // (the design and the source line's who, both already checked) does not, but its glyphs are checked.
  const interval = receiptInterval(facts[ed.primaryEstimate]?.estimate);
  const receiptWords = interval ? [interval.text.low, interval.text.point, interval.text.high, interval.unit ?? ""] : [];
  const receiptFooter = [DESIGN_LABEL[validated.design] ?? validated.design, ...[ed.source.who].map((m) => { try { return parseMarkup(m).map((x) => x.text).join(" "); } catch { return ""; } })];
  const quoteOf = (ref: string) => factOf(ref)?.fact.quote ?? null;
  deckEntries.forEach(({ slide, i, at }, k) => {
    const sentences = slideSentences[k];
    const main = sentences.filter((x) => !x.art).map((x) => x.text);
    const artText = sentences.filter((x) => x.art).map((x) => x.text);
    const values = slideValues(slide, i, at);
    for (const { where, value } of values) {
      const quote = quoteOf(value.ref);
      if (quote === null) fail("H7", where, `ref "${value.ref}" is not a gated fact`);
      else if (!normalize(quote).includes(normalize(value.text))) fail("H7", where, `"${value.text}" does not appear in the passage for "${value.ref}"`);
    }
    for (const { where, num } of slideNumbers(slide, i, at)) {
      const quote = quoteOf(num.ref);
      if (quote === null) fail("H7", where, `ref "${num.ref}" is not a gated fact`);
      else if (!numbersIn(quote).map(Math.abs).includes(Math.abs(num.n))) fail("H7", where, `${num.n} is not in the passage for "${num.ref}"`);
    }
    for (const { where, fact: id, kind } of slideEvidence(slide, i, at)) {
      const cited = facts[id];
      if (!cited) { fail("figure", where, `"fact:${id}" is not in the validated extraction`); continue; }
      if (kind !== "verdict") {
        const problem = evidenceKindProblem(kind, cited);
        if (problem) fail("figure", where, `drawn as ${kind}, but ${problem}`);
        continue;
      }
      const verdict = (slide.art as { rows: { verdict: Verdict }[] }).rows[Number(/\[(\d+)\]$/.exec(where)![1])].verdict;
      const problem = verdictProblem(verdict, cited);
      if (problem) fail("H5", where, `"${VERDICTS[verdict]}": ${problem}`);
    }
    // Words: heading and body together, then the art's own words, each label short.
    const n = main.reduce((sum, t) => sum + countWords(t), 0);
    if (n > DECK_LIMITS.wordsPerSlide) fail("carousel", at, `${n} words in the heading and body; the limit is ${DECK_LIMITS.wordsPerSlide} (one idea per slide)`);
    const artShown = [...artText, ...values.map((v) => v.value.text), ...(slide.kind === "receipts" ? receiptWords : [])];
    const m = artShown.reduce((sum, t) => sum + countWords(t), 0);
    if (m > DECK_LIMITS.artWords) fail("carousel", `${at}.art`, `${m} words drawn in the art; the limit is ${DECK_LIMITS.artWords}`);
    for (const x of sentences.filter((y) => y.art)) {
      const k = countWords(x.text);
      if (k > DECK_LIMITS.labelWords && !/\.(strong|weak|missing)$/.test(x.where)) fail("carousel", x.where, `${k} words; a label, row or list entry holds at most ${DECK_LIMITS.labelWords}`);
    }
    const strip = (mk: string | null) => { try { return mk ? parseMarkup(mk).map((x) => x.text).join(" ") : ""; } catch { return ""; } };
    if (strip(slide.heading).length > DECK_LIMITS.heading) fail("carousel", `${at}.heading`, `${strip(slide.heading).length} characters; the limit is ${DECK_LIMITS.heading}`);
    if (strip(slide.body).length > DECK_LIMITS.body) fail("carousel", `${at}.body`, `${strip(slide.body).length} characters; the limit is ${DECK_LIMITS.body}`);
    const shown = [...main, ...artShown, ...(slide.kind === "receipts" ? receiptFooter : [])];
    if (!SAFE_GLYPHS.test(shown.join(" "))) fail("carousel", at, "contains a character the slide fonts may not carry (it would render as an empty box)");
    if (slide.kind === "hook") {
      for (const [term, pattern] of [...CAVEAT_TERMS, ...HOOK_HEDGES]) {
        const hit = shown.find((t) => pattern.test(t));
        if (hit) fail("H2", at, `a caveat ("${term}") on the hook slide; open with the question and what the study did, and put the caveat on the receipts slide: "${hit}"`);
      }
    }
    // H10: the why slide is the deck's mechanism layer. Same caveat words as the read's mechanism.
    if (slide.kind === "why") {
      for (const [term, pattern] of CAVEAT_TERMS) {
        const hit = shown.find((t) => pattern.test(t));
        if (hit) fail("H10", at, `a caveat ("${term}") on the why slide, the deck's mechanism; it belongs on the receipts slide: "${hit}"`);
      }
    }
    // H9: a slide has no glossary, so a technical word comes after its plain picture, in brackets:
    // "sleepiness locks (adenosine receptors)". Outside brackets, or in brackets that open the sentence, it fails.
    for (const t of [...main, ...artText]) {
      const bare = t.replace(/\([^()]*\)/g, " ");
      const opener = /^\s*\(([^()]*)\)/.exec(t)?.[1] ?? "";
      for (const term of new Set([...jargonIn(bare), ...jargonIn(opener)])) {
        fail("H9", at, `"${term}" on a slide with no plain words before it; write the plain picture first and the term after it in brackets, e.g. "sleepiness locks (adenosine receptors)": "${t}"`);
      }
    }
    const art = slide.art;
    if (art && "labels" in art && art.labels) art.labels.forEach((mk, j) => {
      const len = strip(mk).length;
      if (len > DECK_LIMITS.pictureLabel) fail("carousel", `${at}.art.labels[${j}]`, `${len} characters; a label on the picture holds at most ${DECK_LIMITS.pictureLabel}`);
    });
    if (art?.motif === "sketch") {
      // A sketch: a shape only, on a reviewed concept, no numbers (CLAUDE.md, sketch rule).
      checkRef(`concept:${art.concept}`, `${at}.art.concept`);
      for (const x of sentences.filter((y) => y.art)) if (/\d/.test(x.text)) fail("sketch", x.where, `a sketch holds no number: "${x.text}"`);
    }
    if (art?.motif === "who") {
      for (const x of sentences.filter((y) => /\.art\.(tested|notTested)\[/.test(y.where))) {
        if (!x.refs.some((r) => facts[r])) fail("H3", x.where, `who was or was not tested must cite the paper's own words: "${x.text}"`);
      }
    }
    if (slide.kind === "receipts" && !sentences.some((x) => x.where.endsWith(".weak") && x.refs.some((r) => facts[r]?.kind === "limitation"))) {
      fail("H6", at, "the receipts slide's weak point states a limitation and cites it (a limitation fact from the paper)");
    }
  });
  try {
    const caption = parseMarkup(ed.carousel.caption).map((s) => s.text).join(" ");
    if (caption.length > CAROUSEL_LIMITS.caption) fail("carousel", "carousel.caption", `${caption.length} characters; Instagram allows ${CAROUSEL_LIMITS.caption}`);
  } catch { /* already reported as a markup error */ }

  const cites = usedStudies.size + usedConcepts.size > 0
    ? { context: { studies: [...usedStudies].sort(), concepts: [...usedConcepts].sort(), unreviewed: [...unreviewed].sort() } }
    : {};
  for (const ref of deckPending) warn("carousel", ref, `the deck uses ${ref}, which the owner has not reviewed; the queue will not approve the deck until it is`);
  return { errors, warnings, wordCount, layers: layerStats, ...cites, ...(deckPending.size > 0 ? { deckPending: [...deckPending].sort() } : {}) };
}

/**
 * Whether a finding row's verdict says what its fact says (H5). "No clear difference" needs an
 * interval that holds "no difference", or the paper's own words that no difference was clear.
 * "Lower" and "higher" need an interval wholly on that side, or the paper's own direction word.
 */
export function verdictProblem(verdict: Verdict, fact: ValidatedFact): string | null {
  if (fact.kind !== "finding" && fact.kind !== "estimate") return `cites a ${fact.kind}; a verdict rests on a measured result (a finding or an estimate)`;
  const est = fact.estimate;
  if (est && est.ciLow !== null && est.ciHigh !== null) {
    const none = ["RR", "HR", "OR"].includes(est.measure) ? 1 : 0;
    const crosses = est.ciLow <= none && est.ciHigh >= none;
    if (verdict === "no-clear-difference") return crosses ? null : "its 95% interval does not include no difference";
    if (crosses) return "its 95% interval includes no difference; say \"no clear difference\"";
    return (verdict === "lower") === (est.ciHigh < none) ? null : `its interval is on the other side of no difference`;
  }
  const q = fact.quote.toLowerCase();
  if (verdict === "no-clear-difference") {
    return /\b(no|not) (?:\w+ ){0,3}(significant|significantly|differ|different|difference|remarkable)|non.?significant|did not (reveal|differ|change|show)|>\s?0\.05|\bn\.?s\b/.test(q) ? null : "the cited passage does not say no difference was clear";
  }
  const word = verdict === "lower" ? /\b(lower|reduc|decreas|fell|less|fewer|declin)/ : /\b(higher|increas|rose|greater|more|elevat)/;
  return word.test(q) ? null : `the cited passage does not say "${VERDICTS[verdict]}"`;
}
