/**
 * Turns a validated extraction + a linted editorial into what the app and the
 * database consume. Everything a model is not trusted to supply is derived here.
 */

import { createHash } from "node:crypto";
import type { BuiltPaper, CarouselArt, CarouselDay, CarouselFigure, CarouselSlide, ContentStep, ContextConcept, ContextStudy, FigureRef, GlossaryEntry, PaperContent, ResolvedFact, ResolvedSketch, Sentence } from "../content/types";
import type { EvidenceGrade } from "../evidence";
import { WEIGHT_TENTHS } from "../evidence";
import { FigureSpec } from "../content/figure-kinds";
import { HOOK_LETTERS, VERDICTS, minutesOf, receiptInterval, slideEvidence, slideMarkup, slideNumbers, slideValues, type SlideArtDef, type SlideDefT } from "./carousel";
import { Editorial, type FigureRef as FigureDef } from "./editorial";
import { formatEstimate } from "./format";
import type { Validated, ValidatedFact } from "./gate";
import { deriveTier } from "./grade";
import { gradeWhy } from "../evidence-words";
import { DESIGN_LABEL } from "../content/source-line";
import type { LintContext } from "./lint";
import { parseMarkup, plain } from "./markup";
import { conceptRef, parseRef } from "./refs";
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

/** "Inoue et al., JAMA Network Open": the slides' cite. No year, so the slide draws no number it cannot source. */
export function deckCite(id: Validated["identifiers"]): string {
  const authors = id.authors.split(",").map((a) => a.trim()).filter(Boolean);
  const surname = (authors[0] ?? id.authors).replace(/\s+[A-Z]{1,3}$/, "");
  return `${surname}${authors.length > 1 ? " et al." : ""}, ${id.journal}`;
}

/** "Inoue et al., JAMA Network Open 2023": enough to recognise a study in one line. */
export function shortCite(id: Validated["identifiers"]): string {
  const authors = id.authors.split(",").map((a) => a.trim()).filter(Boolean);
  const surname = (authors[0] ?? id.authors).replace(/\s+[A-Z]{1,3}$/, "");
  return `${surname}${authors.length > 1 ? " et al." : ""}, ${id.journal} ${id.year}`;
}

/**
 * `context` holds the gated studies and the concept files (the same object the
 * lint was given). The lint has already refused every reference that cannot be
 * used; a bad one here is a bug, so it throws.
 */
export function assemble(validated: Validated, editorialInput: unknown, context: LintContext = { studies: {}, concepts: {} }): BuiltPaper {
  // The lint has already refused the old flat shape and anything else wrong; assemble only builds.
  const ed = Editorial.parse(editorialInput);
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

  // Params are filled in further down, once `expand` exists.
  const drawn: { ref: FigureRef; def: FigureDef }[] = [];
  const figure = (def: FigureDef | null): FigureRef | null => {
    if (!def) return null;
    const ref: FigureRef = { figure: def.figure, ...(def.headline ? { headline: sentences(def.headline) } : {}), caption: sentences(def.caption), alt: plain(sentences(def.alt)), params: {} };
    drawn.push({ ref, def });
    return ref;
  };

  // `sections` and `limitations` stay as empty lists: the page also reads old-shape rows from the
  // hosted database until its seed is pushed (lib/content/types.ts, PaperContent).
  const auditFigure = ed.layers.audit.figure;
  const content: Omit<PaperContent, "facts" | "sourceLine" | "glance"> = {
    hook: sentences(ed.hook),
    populationPanel: sentences(ed.populationPanel),
    sections: [],
    limitations: [],
    layers: {
      mechanism: { paragraphs: ed.layers.mechanism.paragraphs.map(sentences), figure: figure(ed.layers.mechanism.figure) },
      protocol: {
        paragraphs: ed.layers.protocol.paragraphs.map(sentences),
        figure: figure(ed.layers.protocol.figure),
        ...(ed.layers.protocol.figureSlot === "try" ? { figureSlot: "try" as const } : {}),
      },
      audit: {
        effect: sentences(ed.layers.audit.effect),
        weakEnd: sentences(ed.layers.audit.weakEnd),
        limitations: ed.layers.audit.limitations.map(sentences),
        missed: sentences(ed.layers.audit.missed),
        more: ed.layers.audit.more.map(sentences),
        // Object.assign, not a copy: `drawn` keeps this same object and fills its params below.
        figure: auditFigure ? Object.assign(figure(auditFigure)!, auditFigure.title ? { title: sentences(auditFigure.title) } : {}) : null,
      },
    },
    glossary: ed.glossary.map((entry): GlossaryEntry => {
      if (entry.concept === null) {
        for (const ref of entry.refs) used.add(ref);
        return { term: entry.term, plain: entry.plain ?? "", refs: entry.refs, concept: null };
      }
      used.add(conceptRef(entry.concept));
      const concept = context.concepts[entry.concept];
      if (!concept?.ok) throw new Error(`unknown concept "${entry.concept}" (the lint should have caught this)`);
      return { term: entry.term, plain: concept.concept.plain, refs: [], concept: entry.concept };
    }),
    primaryEstimate: ed.primaryEstimate,
    finding: { question: sentences(ed.card.question), headline: sentences(ed.card.headline), support: sentences(ed.card.support) },
    simulator: { kind: ed.simulator.kind, params: {} },
  };
  used.add(ed.primaryEstimate);

  /** The study a context reference points into. Throws on anything the lint would have refused. */
  const studyOf = (source: string): Validated => {
    const study = context.studies[source];
    if (!study?.ok || study.withdrawn) throw new Error(`context source "${source}" is not usable (the lint should have caught this)`);
    return study.validated;
  };

  /** Why a graded fact earned its grade, from the study it belongs to. */
  const whyOf = (fact: ValidatedFact, from: Validated): string | undefined => {
    const tier = fact.estimate?.tier ?? fact.finding?.tier;
    if (!tier) return undefined;
    return gradeWhy({ tier, design: from.design, species: from.species, sampleSize: from.sampleSize, reported: Boolean(fact.estimate?.gradeRef) });
  };

  const resolve = (id: string): ResolvedFact => {
    const ref = parseRef(id);
    const fact: ValidatedFact | undefined = ref.kind === "study" ? studyOf(ref.source).facts[ref.fact] : validated.facts[id];
    if (!fact) throw new Error(`unknown fact "${id}" (the lint should have caught this)`);
    const why = whyOf(fact, ref.kind === "study" ? studyOf(ref.source) : validated);
    return {
      id, kind: fact.kind, label: fact.label, quote: fact.quote,
      ...(ref.kind === "study" ? { source: ref.source } : {}),
      ...(why ? { why } : {}),
      ...(fact.estimate ? {
        estimate: {
          outcome: fact.estimate.outcome, measure: fact.estimate.measure, point: fact.estimate.point,
          ciLow: fact.estimate.ciLow, ciHigh: fact.estimate.ciHigh, unit: fact.estimate.unit,
          absolute: fact.estimate.absolute, tier: fact.estimate.tier,
        },
      } : {}),
      ...(fact.finding ? { finding: fact.finding } : {}),
      ...(fact.spread ? { spread: fact.spread } : {}),
    };
  };

  // A sketch: "sketch:<id>" becomes its checked spec, and its concept is listed as Background.
  const sketchOf = (id: string): ResolvedSketch => {
    const spec = (ed.sketches ?? []).find((sk) => (sk as { id?: unknown } | null)?.id === id) as
      { id: string; concept: string; tag: string; ink: ResolvedSketch["ink"]; words: { alt: string; labels?: Record<string, string> } } | undefined;
    if (!spec) throw new Error(`unknown sketch "${id}" (the lint should have caught this)`);
    used.add(conceptRef(spec.concept));
    return { sketch: spec.id, concept: spec.concept, tag: spec.tag, ink: spec.ink, labels: spec.words.labels ?? {}, alt: spec.words.alt };
  };

  // Simulator params: "fact:<id>" strings become the resolved fact.
  const expand = (node: unknown): unknown => {
    if (typeof node === "string" && node.startsWith("fact:")) return resolve(node.slice(5));
    if (typeof node === "string" && node.startsWith("sketch:")) return sketchOf(node.slice(7));
    if (Array.isArray(node)) return node.map(expand);
    if (node !== null && typeof node === "object") {
      return Object.fromEntries(Object.entries(node as Record<string, unknown>).map(([k, v]) => [k, expand(v)]));
    }
    return node;
  };
  content.simulator.params = expand(ed.simulator.params) as Record<string, unknown>;
  // A simulator drawn by kind: every id of its spec becomes the resolved fact, and counts as used,
  // so a context study it draws on is listed for the audit (H7 amended).
  if (ed.simulator.spec !== undefined) {
    const spec = FigureSpec.parse(ed.simulator.spec);
    const resolveAll = (group: Record<string, string | string[]> | undefined) => Object.fromEntries(Object.entries(group ?? {}).map(([param, named]) => {
      for (const id of Array.isArray(named) ? named : [named]) used.add(id);
      return [param, Array.isArray(named) ? named.map(resolve) : resolve(named)];
    }));
    content.simulator.spec = { kind: spec.kind, facts: resolveAll(spec.facts), simulator: resolveAll(spec.simulator) };
  }
  if (ed.simulator.words) {
    content.simulator.words = Object.fromEntries(Object.entries(ed.simulator.words).map(([name, markup]) => [name, sentences(markup)]));
  }
  for (const { ref, def } of drawn) ref.params = expand(def.params) as Record<string, unknown>;

  // The feed card's still figure: the read's figure kind, or one of its own figures in its glance view.
  const glanceSource = ed.glance.figure === "simulator" ? null : drawn.find((d) => d.ref.figure === ed.glance.figure)?.ref;
  if (glanceSource === undefined) throw new Error(`glance.figure "${ed.glance.figure}" is not one of the read's figures (the lint should have caught this)`);
  const glance: PaperContent["glance"] = {
    figure: glanceSource ? { ...glanceSource, caption: [], alt: plain(sentences(ed.glance.alt)) } : null,
    x: sentences(ed.glance.x), y: ed.glance.y ? sentences(ed.glance.y) : [], alt: sentences(ed.glance.alt),
    note: sentences(ed.glance.note), tryIt: sentences(ed.glance.tryIt),
  };

  const takeaways = ed.takeaways.map(sentences);
  const facts: Record<string, ResolvedFact> = {};
  const studies = new Map<string, ContextStudy>();
  const concepts = new Map<string, ContextConcept>();
  for (const id of [...used].sort()) {
    const ref = parseRef(id);
    if (ref.kind === "paper") {
      if (validated.facts[id]) facts[id] = resolve(id);
    } else if (ref.kind === "study") {
      facts[id] = resolve(id);
      const study = studyOf(ref.source);
      studies.set(ref.source, {
        slug: ref.source,
        citation: study.identifiers.citation,
        shortCite: shortCite(study.identifiers),
        doi: study.identifiers.doi,
        design: study.design,
        sampleSize: study.sampleSize,
        license: study.license,
        // The study's own grade, from its own design. Shown beside what it says; never scored.
        ...(() => {
          const tier = deriveTier({ design: study.design, species: study.species, sampleSize: study.sampleSize, reportedGrade: null });
          return { tier, why: gradeWhy({ tier, design: study.design, species: study.species, sampleSize: study.sampleSize, reported: false }) };
        })(),
      });
    } else {
      const concept = context.concepts[ref.slug];
      if (!concept?.ok) throw new Error(`unknown concept "${ref.slug}" (the lint should have caught this)`);
      const { term, plain: plainText, model, reference } = concept.concept;
      concepts.set(ref.slug, { slug: ref.slug, term, plain: plainText, model, reference });
    }
  }
  const usedContext = studies.size + concepts.size > 0
    ? { context: { studies: [...studies.values()], concepts: [...concepts.values()] } }
    : {};

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

  const gradeByOutcome = new Map<string, { tier: EvidenceGrade; why: string }>();
  for (const def of ed.steps) {
    const evidence = def.evidenceRef ? validated.facts[def.evidenceRef] : undefined;
    const graded = evidence?.estimate ?? evidence?.finding;
    if (!evidence || !graded || def.retired) continue;
    const current = gradeByOutcome.get(graded.outcome);
    if (!current || WEIGHT_TENTHS[graded.tier] > WEIGHT_TENTHS[current.tier]) {
      gradeByOutcome.set(graded.outcome, { tier: graded.tier, why: whyOf(evidence, validated)! });
    }
  }
  // Who · design · how many or how long. The design is the gate's; the words are the editorial's.
  const sourceLine = [plain(parseMarkup(ed.source.who)), (DESIGN_LABEL[validated.design] ?? validated.design).toLowerCase(), plain(parseMarkup(ed.source.span))].join(" · ");

  const id = validated.identifiers;
  const strip = (markup: string | null) => (markup ? plain(parseMarkup(markup)) : null);

  // The deck. Receipts print the design (from the gate), who (the source line) and the range bar.
  const design = DESIGN_LABEL[validated.design] ?? validated.design;
  const who = plain(parseMarkup(ed.source.who));
  const lineOf = (art: { kind: "measured" | "proposed" }) => (art.kind === "measured" ? "solid" as const : "dashed" as const);
  const dayOf = (a: Extract<SlideArtDef, { motif: "day" }>): CarouselDay => ({
    start: strip(a.start)!, end: strip(a.end)!,
    marks: a.marks.map((m) => ({ minutes: minutesOf({ n: m.at.n, unit: m.at.unit }), label: strip(m.label)! })),
    tail: { minutes: minutesOf({ n: a.tail.length.n, unit: a.tail.length.unit }), label: strip(a.tail.label)! },
  });
  const hookArt = ed.carousel.slides.find((s) => s.kind === "hook")?.art;
  const pending = new Set<string>();
  const deckSlide = (s: SlideDefT, i: number, base = `carousel.slides[${i}]`): CarouselSlide => {
    const refs = new Set<string>();
    for (const { markup } of slideMarkup(s, i, base)) for (const sentence of parseMarkup(markup)) for (const ref of sentence.refs) refs.add(ref);
    for (const { value } of slideValues(s, i, base)) refs.add(value.ref);
    for (const { num } of slideNumbers(s, i, base)) refs.add(num.ref);
    for (const { fact } of slideEvidence(s, i, base)) refs.add(fact);
    const figure = (side: { value: { text: string; ref: string }; unit?: string; label: string }): CarouselFigure => ({
      value: side.value.text, unit: side.unit ? strip(side.unit) : null, label: strip(side.label)!,
      interval: receiptInterval(validated.facts[side.value.ref]?.estimate),
    });
    const a = s.art;
    let art: CarouselArt;
    // The hook's chip prints the source line's who and span: their refs ride along.
    if (s.kind === "hook") for (const mk of [ed.source.who, ed.source.span]) for (const sentence of parseMarkup(mk)) for (const ref of sentence.refs) refs.add(ref);
    if (s.kind === "cta") {
      art = { motif: "cta", day: hookArt?.motif === "day" ? dayOf(hookArt) : null };
      // The closing slide redraws the hook's day, so it rests on the same facts.
      if (hookArt?.motif === "day") for (const m of [...hookArt.marks.map((k) => k.at), hookArt.tail.length]) refs.add(m.ref);
    }
    else if (!a) art = { motif: "cta", day: null };
    else if (a.motif === "number") art = { motif: "number", figure: figure(a) };
    else if (a.motif === "pair") art = { motif: "pair", a: figure(a.a), b: figure(a.b) };
    else if (a.motif === "day") art = { motif: "day", ...dayOf(a) };
    else if (a.motif === "verdicts") art = { motif: "verdicts", rows: a.rows.map((r) => ({ label: strip(r.label)!, verdict: VERDICTS[r.verdict] })) };
    else if (a.motif === "plateau") {
      art = {
        motif: "plateau", line: lineOf(a), axis: strip(a.axis)!, y: strip(a.y)!, from: a.from.n, to: a.to.n,
        levels: { from: a.levels.from.n, to: a.levels.to.n, label: strip(a.levels.label)! },
      };
    } else if (a.motif === "sketch") {
      art = { motif: "sketch", shape: a.shape, a: strip(a.a)!, b: strip(a.b)!, caption: strip(a.caption)! };
      refs.add(conceptRef(a.concept));
    } else if (a.motif === "who") art = { motif: "who", tested: a.tested.map((m) => strip(m)!), notTested: a.notTested.map((m) => strip(m)!) };
    else if (a.motif === "checks") {
      const interval = receiptInterval(validated.facts[ed.primaryEstimate]?.estimate);
      art = { motif: "receipt", strong: strip(a.strong)!, weak: strip(a.weak)!, missing: strip(a.missing), design, who, interval };
      // The range bar rests on the headline estimate; the who line on the source line's own refs.
      if (interval) refs.add(ed.primaryEstimate);
      for (const sentence of parseMarkup(ed.source.who)) for (const ref of sentence.refs) refs.add(ref);
    } else art = { motif: a.motif, line: lineOf(a), labels: (a.labels ?? []).map((m) => strip(m)!) };
    for (const ref of refs) {
      const r = parseRef(ref);
      if (r.kind === "paper" && !validated.facts[ref]) throw new Error(`assemble: slide ${i} cites "${ref}", which is not a gated fact`);
      if (r.kind === "concept" && !(context.concepts[r.slug]?.ok && (context.concepts[r.slug] as { reviewed: boolean }).reviewed)) pending.add(ref);
      if (r.kind === "common" && !(context.common?.[r.slug]?.ok && (context.common[r.slug] as { reviewed: boolean }).reviewed)) pending.add(ref);
    }
    return { kind: s.kind, heading: strip(s.heading)!, body: strip(s.body), art, refs: [...refs].sort() };
  };
  const deckSlides = ed.carousel.slides.map((s, i) => deckSlide(s, i));
  // Other openings for the owner to choose from: B, C, D. Built like the hook, so they trace the same way.
  const altHooks = ed.carousel.altHooks.map((h, j) => ({ letter: HOOK_LETTERS[j + 1], name: h.name, slide: deckSlide(h, j, `carousel.altHooks[${j}]`) }));

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
      sourceLine,
      grades: [...gradeByOutcome].map(([outcome, g]) => ({ outcome, tier: g.tier, why: g.why }))
        .sort((a, b) => WEIGHT_TENTHS[b.tier] - WEIGHT_TENTHS[a.tier]),
      hasBlock: ed.steps.some((s) => s.conditionKey === "block_weeks_gte" && !s.retired),
      simulatorKind: ed.simulator.kind,
    },
    steps,
    choices: ed.choices,
    content: { ...content, glance, sourceLine, facts, ...usedContext },
    takeaways,
    carousel: {
      slug: ed.slug,
      title: plain(parseMarkup(ed.title)),
      slides: deckSlides,
      altHooks,
      caption: strip(ed.carousel.caption)!,
      hashtags: ed.carousel.hashtags,
      credit: `${id.citation} doi:${id.doi}. Licence: ${validated.license}.`,
      study: { design, who, span: plain(parseMarkup(ed.source.span)), cite: deckCite(id), licence: validated.license },
      pending: [...pending].sort(),
    },
  };
}
