/**
 * Turns a validated extraction + a linted editorial into what the app and the
 * database consume. Everything a model is not trusted to supply is derived here.
 */

import { createHash } from "node:crypto";
import type { BuiltPaper, ContentStep, FigureRef, PaperContent, ResolvedFact, Sentence } from "../content/types";
import type { EvidenceGrade } from "../evidence";
import { WEIGHT_TENTHS } from "../evidence";
import { Editorial, LegacyEditorial, editorialShape, type FigureRef as FigureDef } from "./editorial";
import { formatEstimate } from "./format";
import type { Validated } from "./gate";
import { parseMarkup, plain } from "./markup";
import { words } from "./text";

const NAMESPACE = "sciencedigest:v1:";

/**
 * A stable UUID from a name. The same slug and step key always give the same
 * id, on every machine, so the bundled app and the database agree without
 * either having to ask the other.
 */
export function stableId(name: string): string {
  const hex = createHash("sha1").update(NAMESPACE + name).digest("hex");
  const variant = ((parseInt(hex.slice(16, 18), 16) & 0x3f) | 0x80).toString(16);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-${variant}${hex.slice(18, 20)}-${hex.slice(20, 32)}`;
}

const WORDS_PER_MINUTE = 200;

export function assemble(validated: Validated, editorialInput: unknown): BuiltPaper {
  // The lint has already decided whether this shape is allowed; assemble only builds.
  const ed = editorialShape(editorialInput) === "legacy" ? LegacyEditorial.parse(editorialInput) : Editorial.parse(editorialInput);
  const paperId = stableId(`paper:${ed.slug}`);
  const stepId = (key: string) => stableId(`step:${ed.slug}:${key}`);

  const used = new Set<string>();
  const sentences = (markup: string): Sentence[] => {
    const parsed = parseMarkup(markup);
    for (const s of parsed) for (const ref of s.refs) used.add(ref);
    return parsed;
  };

  const steps: ContentStep[] = ed.steps.map((def, index) => {
    const evidence = def.evidenceRef ? validated.facts[def.evidenceRef] : undefined;
    const estimate = evidence?.estimate;
    const grade: EvidenceGrade = estimate?.tier ?? evidence?.finding?.tier ?? "none";
    const source = estimate
      ? `${estimate.outcome} ${formatEstimate(estimate)}`
      : evidence?.finding ? `${evidence.finding.outcome}: ${evidence.label}` : null;
    return {
      id: stepId(def.key),
      key: def.key,
      paperId,
      position: index + 1,
      label: def.label,
      detail: def.detail,
      kind: def.kind,
      grade,
      // A step whose evidence is graded "none" keeps no source line: the database
      // CHECK ties the two together, and weight 0 needs no justification.
      sourceEstimate: grade !== "none" ? source : null,
      targetPerWeek: def.targetPerWeek,
      countsStepId: def.countsKey ? stepId(def.countsKey) : null,
      conditionKey: def.conditionKey,
      conditionValue: def.conditionValue,
      appliesWhen: def.appliesWhen,
      retired: def.retired,
    };
  });

  const figure = (def: FigureDef | null): FigureRef | null =>
    def ? { figure: def.figure, caption: sentences(def.caption), alt: plain(sentences(def.alt)) } : null;

  // Key order is kept as it was for the old flat shape, so its generated files do not change.
  const content: Omit<PaperContent, "facts"> = "layers" in ed
    ? {
      hook: sentences(ed.hook),
      populationPanel: sentences(ed.populationPanel),
      sections: [],
      limitations: [],
      layers: {
        mechanism: { paragraphs: ed.layers.mechanism.paragraphs.map(sentences), figure: figure(ed.layers.mechanism.figure) },
        protocol: { paragraphs: ed.layers.protocol.paragraphs.map(sentences), figure: figure(ed.layers.protocol.figure) },
        audit: {
          effect: sentences(ed.layers.audit.effect),
          weakEnd: sentences(ed.layers.audit.weakEnd),
          limitations: ed.layers.audit.limitations.map(sentences),
          missed: sentences(ed.layers.audit.missed),
          more: ed.layers.audit.more.map(sentences),
          figure: figure(ed.layers.audit.figure),
        },
      },
      glossary: ed.glossary,
      primaryEstimate: ed.primaryEstimate,
      simulator: { kind: ed.simulator.kind, params: {} },
    }
    : {
      hook: sentences(ed.hook),
      populationPanel: sentences(ed.populationPanel),
      sections: ed.sections.map((s) => ({ id: s.id, heading: s.heading, paragraphs: s.paragraphs.map(sentences) })),
      limitations: ed.limitations.map(sentences),
      primaryEstimate: ed.primaryEstimate,
      simulator: { kind: ed.simulator.kind, params: {} },
    };
  used.add(ed.primaryEstimate);

  const resolve = (id: string): ResolvedFact => {
    const fact = validated.facts[id];
    if (!fact) throw new Error(`unknown fact "${id}" (the lint should have caught this)`);
    return {
      id, kind: fact.kind, label: fact.label, quote: fact.quote,
      ...(fact.estimate ? {
        estimate: {
          outcome: fact.estimate.outcome, measure: fact.estimate.measure, point: fact.estimate.point,
          ciLow: fact.estimate.ciLow, ciHigh: fact.estimate.ciHigh, unit: fact.estimate.unit,
          absolute: fact.estimate.absolute, tier: fact.estimate.tier,
        },
      } : {}),
      ...(fact.finding ? { finding: fact.finding } : {}),
    };
  };

  // Simulator params: "fact:<id>" strings become the resolved fact.
  const expand = (node: unknown): unknown => {
    if (typeof node === "string" && node.startsWith("fact:")) return resolve(node.slice(5));
    if (Array.isArray(node)) return node.map(expand);
    if (node !== null && typeof node === "object") {
      return Object.fromEntries(Object.entries(node as Record<string, unknown>).map(([k, v]) => [k, expand(v)]));
    }
    return node;
  };
  content.simulator.params = expand(ed.simulator.params) as Record<string, unknown>;

  const takeaways = ed.takeaways.map(sentences);
  const facts: Record<string, ResolvedFact> = {};
  for (const id of [...used].sort()) if (validated.facts[id]) facts[id] = resolve(id);

  const layered = content.layers
    ? [
      ...content.layers.mechanism.paragraphs, ...content.layers.protocol.paragraphs,
      content.layers.audit.effect, content.layers.audit.weakEnd, ...content.layers.audit.limitations,
      content.layers.audit.missed, ...content.layers.audit.more,
    ]
    : [];
  const readWords = words(
    [content.hook, content.populationPanel, ...content.sections.flatMap((s) => s.paragraphs), ...content.limitations, ...layered]
      .map(plain).join(" "),
  ).length;

  const gradeByOutcome = new Map<string, EvidenceGrade>();
  for (const def of ed.steps) {
    const evidence = def.evidenceRef ? validated.facts[def.evidenceRef] : undefined;
    const graded = evidence?.estimate ?? evidence?.finding;
    if (!graded || def.retired) continue;
    const current = gradeByOutcome.get(graded.outcome);
    if (!current || WEIGHT_TENTHS[graded.tier] > WEIGHT_TENTHS[current]) gradeByOutcome.set(graded.outcome, graded.tier);
  }

  const id = validated.identifiers;
  const strip = (markup: string | null) => (markup ? plain(parseMarkup(markup)) : null);

  return {
    meta: {
      id: paperId,
      slug: ed.slug,
      title: plain(parseMarkup(ed.title)),
      teaser: plain(parseMarkup(ed.teaser)),
      category: ed.category,
      accessTier: ed.accessTier,
      publishedAt: ed.publishedAt,
      readMinutes: Math.max(2, Math.round(readWords / WORDS_PER_MINUTE)),
      doi: id.doi,
      pmid: id.pmid,
      pmcid: id.pmcid,
      citation: id.citation,
      authors: id.authors,
      journal: id.journal,
      year: id.year,
      license: validated.license,
      design: validated.design,
      species: validated.species,
      sampleSize: validated.sampleSize,
      grades: [...gradeByOutcome].map(([outcome, tier]) => ({ outcome, tier }))
        .sort((a, b) => WEIGHT_TENTHS[b.tier] - WEIGHT_TENTHS[a.tier]),
      hasBlock: ed.steps.some((s) => s.conditionKey === "block_weeks_gte" && !s.retired),
      simulatorKind: ed.simulator.kind,
    },
    steps,
    choices: ed.choices,
    content: { ...content, facts },
    takeaways,
    carousel: {
      slug: ed.slug,
      slides: ed.carousel.slides.map((s) => ({ kind: s.kind, heading: strip(s.heading)!, body: strip(s.body) })),
      caption: strip(ed.carousel.caption)!,
      hashtags: ed.carousel.hashtags,
      credit: `${id.citation} doi:${id.doi}. Licence: ${validated.license}.`,
    },
  };
}
