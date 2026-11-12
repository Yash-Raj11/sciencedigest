/**
 * Stage 4: the lint. Deterministic code; no model. Blocks publication.
 *
 * Every rule here is one of the content heuristics (H1-H8 in the brief) turned
 * into something a machine can check. A heuristic that lives only in a prompt
 * is a wish; these cannot be talked out of it.
 *
 * Isomorphic: runs in Node (content build, pipeline) and in the browser (the
 * approval queue shows the same report).
 */

import { Editorial } from "./editorial";
import type { Validated } from "./gate";
import { NON_HUMAN_DISCLAIMER } from "./grade";
import { parseMarkup, type Sentence } from "./markup";
import { normalize, numbersIn, sharedShingles, words } from "./text";

export interface LintIssue {
  rule: string;
  where: string;
  message: string;
}

export interface LintReport {
  errors: LintIssue[];
  warnings: LintIssue[];
  wordCount: number;
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

interface Located {
  where: string;
  sentence: Sentence;
  headline: boolean;
}

export function lint(validated: Validated, editorialInput: unknown, source: string): LintReport {
  const errors: LintIssue[] = [];
  const warnings: LintIssue[] = [];
  const fail = (rule: string, where: string, message: string) => errors.push({ rule, where, message });

  const parsed = Editorial.safeParse(editorialInput);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) fail("schema", issue.path.join("."), issue.message);
    return { errors, warnings, wordCount: 0 };
  }
  const ed = parsed.data;
  const facts = validated.facts;

  // Collect every sentence a reader could see ----------------------------------
  const all: Located[] = [];
  const read: Located[] = [];
  function take(where: string, markup: string, opts: { headline?: boolean; inRead?: boolean } = {}): Sentence[] {
    try {
      const sentences = parseMarkup(markup);
      for (const sentence of sentences) {
        const item = { where, sentence, headline: opts.headline ?? false };
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
  const bySection = new Map<string, Sentence[]>();
  for (const section of ed.sections) {
    const collected: Sentence[] = [];
    section.paragraphs.forEach((p, i) => collected.push(...take(`sections.${section.id}[${i}]`, p, { inRead: true })));
    bySection.set(section.id, collected);
  }
  const limitationSentences = ed.limitations.map((l, i) => take(`limitations[${i}]`, l, { inRead: true }));
  ed.takeaways.forEach((t, i) => take(`takeaways[${i}]`, t));
  ed.carousel.slides.forEach((slide, i) => {
    take(`carousel.slides[${i}].heading`, slide.heading, { headline: true });
    if (slide.body) take(`carousel.slides[${i}].body`, slide.body);
  });
  take("carousel.caption", ed.carousel.caption);

  const allowedNumbers = (refs: string[]): number[] => {
    const out: number[] = [];
    for (const ref of refs) {
      const fact = facts[ref];
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

    for (const ref of sentence.refs) {
      if (!facts[ref]) fail("orphan", where, `refers to "${ref}", which is not in the validated extraction`);
    }

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
      if (!validated.causalLanguagePermitted) {
        fail("H3", where, `causal verb "${causal[0]}" in a ${validated.design} study; use "associated with": "${text}"`);
      } else if (!ed.populationTerms.some((term) => normalize(text).includes(normalize(term)))) {
        fail("H3", where, `causal verb "${causal[0]}" without the studied population (${ed.populationTerms.join(" / ")}): "${text}"`);
      }
    }

    const cited = sentence.refs.map((r) => facts[r]?.estimate).filter((e) => e !== undefined);
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
  const lowerBound = bySection.get("lower-bound") ?? [];
  if (!primaryFact || (!primary && !primaryFact.finding)) {
    fail("H5", "primaryEstimate", `"${ed.primaryEstimate}" is not a verified estimate or finding`);
  } else if (primary && primary.ciLow !== null && primary.ciHigh !== null) {
    const explained = lowerBound.some((s) => {
      const have = numbersIn(s.text).map(Math.abs);
      return s.refs.includes(ed.primaryEstimate)
        && have.includes(Math.abs(primary.ciLow!)) && have.includes(Math.abs(primary.ciHigh!));
    });
    if (!explained) {
      fail("H5", "sections.lower-bound", `must state both ends of the interval for "${ed.primaryEstimate}" and say what the weaker end means`);
    }
  } else {
    const disclosed = lowerBound.some((s) =>
      s.refs.includes(ed.primaryEstimate) && /\bno\b[^.]*\bconfidence interval\b/i.test(s.text));
    if (!disclosed) {
      fail("H5", "sections.lower-bound", `"${ed.primaryEstimate}" has no interval: a sentence citing it must say there is "no ... confidence interval"`);
    }
    warnings.push({ rule: "H5", where: "primaryEstimate", message: "the headline result has no confidence interval; check the read says what that leaves unknown" });
  }
  for (const id of ["lower-bound", "missed"]) {
    if (!bySection.has(id)) fail("structure", "sections", `a section with id "${id}" is required`);
  }

  // H6: limitations ---------------------------------------------------------------
  limitationSentences.forEach((sentences, i) => {
    const cites = sentences.flatMap((s) => s.refs).some((r) => facts[r]?.kind === "limitation");
    if (!cites) fail("H6", `limitations[${i}]`, "must cite a limitation extracted from the paper");
  });

  // H7 / H8: steps and simulator numbers trace to the paper ---------------------
  const keys = new Map(ed.steps.map((s) => [s.key, s]));
  if (keys.size !== ed.steps.length) fail("steps", "steps", "duplicate step keys");
  for (const step of ed.steps) {
    const where = `steps.${step.key}`;
    for (const [term, pattern] of BANNED_TERMS) {
      if (pattern.test(`${step.label} ${step.detail ?? ""}`)) fail("H1", where, `banned term "${term}"`);
    }
    if (CAUSAL_VERB.test(`${step.label} ${step.detail ?? ""}`)) fail("H3", where, "a step is an action, not a causal claim");
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

  (function walk(node: unknown, path: string) {
    if (typeof node === "number") {
      fail("H7", path, "a bare number in simulator params; use \"fact:<id>\" or { n, ref } so it traces to the paper");
    } else if (typeof node === "string" && node.startsWith("fact:")) {
      if (!facts[node.slice(5)]) fail("H7", path, `"${node}" is not in the validated extraction`);
    } else if (Array.isArray(node)) {
      node.forEach((child, i) => walk(child, `${path}[${i}]`));
    } else if (node !== null && typeof node === "object") {
      const record = node as Record<string, unknown>;
      if (typeof record.n === "number" && typeof record.ref === "string" && Object.keys(record).length === 2) {
        const fact = facts[record.ref];
        if (!fact) fail("H7", path, `ref "${record.ref}" is not in the validated extraction`);
        else if (!numbersIn(fact.quote).map(Math.abs).includes(Math.abs(record.n))) {
          fail("H7", path, `${record.n} does not appear in the passage for "${record.ref}"`);
        }
        return;
      }
      for (const [key, child] of Object.entries(record)) walk(child, `${path}.${key}`);
    }
  })(ed.simulator.params, "simulator.params");

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

  return { errors, warnings, wordCount };
}
