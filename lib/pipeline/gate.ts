/**
 * Stage 2: the gate. Deterministic code; no model.
 *
 *   schema  ->  licence  ->  span verification  ->  derived tiers  ->  heuristics
 *
 * A failure rejects the extraction outright. There is no blind retry: an
 * extraction that points at text which is not in the paper is not "nearly
 * right", it is wrong in a way that says the rest cannot be trusted either.
 */

import type { EvidenceGrade } from "../evidence";
import { ABSOLUTE_MEASURES, NOT_REPORTED, RawExtraction, type Estimate, type RawFact } from "./extraction";
import {
  DESIGNS, DESIGN_EVIDENCE, GRADE_WORDS, SPECIES, SPECIES_EVIDENCE,
  causalLanguagePermitted, deriveTier, type Design, type Species,
} from "./grade";
import { checkLicense, type AllowedLicense } from "./license";
import { containsNumbers, normalize, wordNumbersIn } from "./text";

export type Span = [number, number];

export interface ValidatedEstimate extends Estimate {
  absolute: boolean;
  /** Derived here. Never supplied by a model. */
  tier: EvidenceGrade;
}

export interface ValidatedFact {
  id: string;
  kind: RawFact["kind"];
  label: string;
  value: string;
  quote: string;
  span: Span;
  estimate?: ValidatedEstimate;
  /** For a finding: the measured endpoint and the tier its design earns. */
  finding?: { outcome: string; tier: EvidenceGrade };
}

export interface Validated {
  identifiers: RawExtraction["identifiers"];
  license: AllowedLicense;
  design: Design;
  species: Species;
  sampleSize: number | null;
  population: { value: string; quote: string; span: Span };
  causalLanguagePermitted: boolean;
  facts: Record<string, ValidatedFact>;
  /** Fields the extraction marked "not_reported". Kept so an editor can see what is missing. */
  notReported: string[];
}

export type GateResult =
  | { ok: true; validated: Validated; warnings: string[] }
  | { ok: false; errors: string[] };

/**
 * Finds the quote in the source and returns its character span.
 *
 * Exact first. Then tolerant of the things that differ between a PDF, a web
 * page and a keyboard without changing meaning: runs of whitespace, the kind of
 * dash or quote mark, and letter case. normalize() swaps characters one for
 * one, so an offset found in the normalized text is the same offset in the
 * original.
 */
export function locate(source: string, quote: string): Span | null {
  const exact = source.indexOf(quote);
  if (exact >= 0) return [exact, exact + quote.length];
  const escaped = normalize(quote).trim().split(/\s+/).map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  if (escaped.length === 0 || escaped[0] === "") return null;
  const found = new RegExp(escaped.join("\\s+")).exec(normalize(source));
  return found ? [found.index, found.index + found[0].length] : null;
}

const hasAny = (haystack: string, needles: string[]) =>
  needles.some((n) => new RegExp(`(^|[^a-z])${n.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}([^a-z]|$)`).test(haystack));

export function gate(input: unknown, source: string): GateResult {
  const parsed = RawExtraction.safeParse(input);
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.issues.map((i) => `schema: ${i.path.join(".")}: ${i.message}`) };
  }
  const raw = parsed.data;
  const errors: string[] = [];
  const warnings: string[] = [];
  const notReported: string[] = [];

  const license = checkLicense(raw.license);
  if (!license.ok) errors.push(`licence: ${license.reason}`);

  /** Resolves a leaf to its passage, or records why it is void. */
  function resolve(name: string, value: string, quote: string | null): { quote: string; span: Span; text: string } | null {
    if (value === NOT_REPORTED) {
      if (quote !== null) errors.push(`${name}: marked not_reported but carries a quote`);
      notReported.push(name);
      return null;
    }
    if (quote === null || quote.trim() === "") {
      errors.push(`${name}: has a value but no quote; a value the model cannot point at is void`);
      return null;
    }
    const span = locate(source, quote);
    if (span === null) {
      errors.push(`${name}: quote not found in the source: "${quote.slice(0, 70)}"`);
      return null;
    }
    return { quote: source.slice(span[0], span[1]), span, text: normalize(source.slice(span[0], span[1])) };
  }

  // Design, species, sample size, population -----------------------------------
  let design: Design | null = null;
  const designAt = resolve("design", raw.design.value, raw.design.quote);
  if (!(DESIGNS as readonly string[]).includes(raw.design.value)) {
    errors.push(`design: "${raw.design.value}" is not one of ${DESIGNS.join(", ")}`);
  } else if (designAt) {
    const groups = DESIGN_EVIDENCE[raw.design.value as Design];
    if (groups.every((g) => hasAny(designAt.text, g))) design = raw.design.value as Design;
    else errors.push(`design: the quoted passage does not support "${raw.design.value}"`);
  }

  let species: Species | null = null;
  const speciesAt = resolve("species", raw.species.value, raw.species.quote);
  if (!(SPECIES as readonly string[]).includes(raw.species.value)) {
    errors.push(`species: "${raw.species.value}" is not one of ${SPECIES.join(", ")} (species is required: H4)`);
  } else if (speciesAt) {
    if (hasAny(speciesAt.text, SPECIES_EVIDENCE[raw.species.value as Species])) species = raw.species.value as Species;
    else errors.push(`species: the quoted passage does not support "${raw.species.value}"`);
  }

  let sampleSize: number | null = null;
  const sizeAt = resolve("sampleSize", raw.sampleSize.value, raw.sampleSize.quote);
  if (sizeAt) {
    const n = Number(raw.sampleSize.value.replace(/[, ]/g, ""));
    if (!Number.isInteger(n) || n <= 0) errors.push(`sampleSize: "${raw.sampleSize.value}" is not a whole number`);
    else if (!containsNumbers(sizeAt.text, [n]) && !wordNumbersIn(sizeAt.text).includes(n)) {
      errors.push(`sampleSize: ${n} does not appear in the quoted passage`);
    }
    else sampleSize = n;
  }

  const populationAt = resolve("population", raw.population.value, raw.population.quote);
  if (!populationAt && raw.population.value === NOT_REPORTED) {
    errors.push("population: not reported; H3 needs the studied population to license any claim");
  }

  // Facts ----------------------------------------------------------------------
  const seen = new Set<string>();
  const located = new Map<string, { fact: RawFact; quote: string; span: Span; text: string }>();
  for (const fact of raw.facts) {
    if (seen.has(fact.id)) { errors.push(`fact ${fact.id}: duplicate id`); continue; }
    seen.add(fact.id);
    const at = resolve(`fact ${fact.id}`, fact.value, fact.quote);
    if (!at) continue;

    if (fact.kind === "estimate") {
      if (!fact.estimate) { errors.push(`fact ${fact.id}: an estimate needs its numbers`); continue; }
      const e = fact.estimate;
      const wanted = [e.point, e.ciLow, e.ciHigh].filter((n): n is number => n !== null);
      if (!containsNumbers(at.text, wanted)) {
        errors.push(`fact ${fact.id}: ${wanted.join(", ")} do not all appear in the quoted passage`);
        continue;
      }
      if ((e.ciLow === null) !== (e.ciHigh === null)) errors.push(`fact ${fact.id}: half a confidence interval`);
      if (e.ciLow !== null && e.ciHigh !== null && e.ciLow > e.ciHigh) errors.push(`fact ${fact.id}: interval bounds are reversed`);
      if (e.ciLow !== null && e.ciHigh !== null && (e.point < e.ciLow || e.point > e.ciHigh)) {
        warnings.push(`fact ${fact.id}: the point estimate lies outside its own interval as printed; check the paper`);
      }
    } else if (fact.kind === "grade") {
      const words = GRADE_WORDS[fact.value as keyof typeof GRADE_WORDS];
      if (!words) { errors.push(`fact ${fact.id}: grade must be high, moderate or low`); continue; }
      if (!hasAny(at.text, words)) { errors.push(`fact ${fact.id}: the quoted passage does not say "${fact.value}"`); continue; }
    } else {
      if (!at.text.includes(normalize(fact.value))) {
        errors.push(`fact ${fact.id}: "${fact.value}" does not appear inside its quote`);
        continue;
      }
      if (fact.kind === "finding" && !fact.outcome) {
        errors.push(`fact ${fact.id}: a finding must name the endpoint that was measured (outcome)`);
        continue;
      }
    }
    located.set(fact.id, { fact, ...at });
  }

  if (![...located.values()].some((l) => l.fact.kind === "limitation")) {
    errors.push("no verified limitation: H6 requires at least one methodological limitation from the paper");
  }
  const results = [...located.values()].filter((l) => l.fact.kind === "estimate" || l.fact.kind === "finding");
  if (results.length === 0) {
    errors.push("no verified estimate or finding: there is no result to report");
  } else if (!results.some((l) => l.fact.kind === "estimate" && l.fact.estimate?.ciLow != null)) {
    warnings.push("no estimate with a confidence interval was extracted; the read must say the paper reports none (H5)");
  }

  if (errors.length > 0 || !license.ok || design === null || species === null || !populationAt) {
    return { ok: false, errors: errors.length > 0 ? errors : ["extraction rejected"] };
  }

  // Derive tiers ---------------------------------------------------------------
  const facts: Record<string, ValidatedFact> = {};
  for (const [id, { fact, quote, span }] of located) {
    const out: ValidatedFact = { id, kind: fact.kind, label: fact.label, value: fact.value, quote, span };
    if (fact.kind === "estimate" && fact.estimate) {
      let reportedGrade: EvidenceGrade | null = null;
      if (fact.estimate.gradeRef !== null) {
        const ref = located.get(fact.estimate.gradeRef);
        if (!ref || ref.fact.kind !== "grade") {
          errors.push(`fact ${id}: gradeRef "${fact.estimate.gradeRef}" is not a verified grade fact`);
        } else reportedGrade = ref.fact.value as EvidenceGrade;
      }
      out.estimate = {
        ...fact.estimate,
        absolute: ABSOLUTE_MEASURES.has(fact.estimate.measure),
        tier: deriveTier({ design, species, sampleSize, reportedGrade }),
      };
    }
    if (fact.kind === "finding" && fact.outcome) {
      out.finding = { outcome: fact.outcome, tier: deriveTier({ design, species, sampleSize, reportedGrade: null }) };
    }
    facts[id] = out;
  }
  if (errors.length > 0) return { ok: false, errors };

  return {
    ok: true,
    warnings,
    validated: {
      identifiers: raw.identifiers,
      license: license.license,
      design,
      species,
      sampleSize,
      population: { value: raw.population.value, quote: populationAt.quote, span: populationAt.span },
      causalLanguagePermitted: causalLanguagePermitted(design, species),
      facts,
      notReported,
    },
  };
}
