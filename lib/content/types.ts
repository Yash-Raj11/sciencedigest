/**
 * The shapes the app reads. Everything here is produced by
 * `npm run content:build` from content/papers/<slug>/ and is never typed by hand.
 */

import type { EvidenceGrade } from "../evidence";
import type { Step } from "../score";

export interface Sentence {
  text: string;
  /** Ids of the facts this sentence rests on. Empty for a framing sentence. */
  refs: string[];
}

export interface ResolvedEstimate {
  outcome: string;
  measure: string;
  point: number;
  ciLow: number | null;
  ciHigh: number | null;
  unit: string;
  absolute: boolean;
  tier: EvidenceGrade;
}

export interface ResolvedFact {
  id: string;
  kind: "estimate" | "finding" | "grade" | "statement" | "limitation" | "context";
  label: string;
  /** The passage in the paper this was read from, verbatim. */
  quote: string;
  estimate?: ResolvedEstimate;
  finding?: { outcome: string; tier: EvidenceGrade };
  /** Set when the fact comes from another study: the slug of a ContextStudy. Absent: the paper itself. */
  source?: string;
  /** For a graded fact: one plain sentence on why it earned its grade (lib/evidence-words.ts). */
  why?: string;
  /** The spread printed with the estimate (lib/models/spread.ts). Absent: only the estimate's own CI, if any. */
  spread?: { kind: "sd" | "ci95" | "range" | "iqr"; value?: number | null; low?: number | null; high?: number | null };
}

/** Another study a read cites beside its own paper. It never carries weight in the tracker. */
export interface ContextStudy {
  slug: string;
  citation: string;
  /** "Inoue et al., JAMA Netw Open 2023" */
  shortCite: string;
  doi: string;
  design: string;
  sampleSize: number | null;
  license: string;
  /** Derived from the study's own design by lib/pipeline/grade.ts. Shown, never scored. */
  tier: EvidenceGrade;
  /** Why it earned that grade, in one plain sentence. */
  why: string;
}

/** Background knowledge the owner has reviewed. Carries no numbers. */
export interface ContextConcept {
  slug: string;
  term: string;
  plain: string;
  model: string;
  reference: { doi?: string; isbn?: string; title: string };
}

export interface ContentStep extends Step {
  key: string;
  position: number;
  label: string;
  detail: string | null;
  /** e.g. "Fat-free mass +0.63 kg (95% CI 0.17 to 1.09)". Null when ungraded. */
  sourceEstimate: string | null;
  retired: boolean;
}

export interface Choice {
  key: string;
  label: string;
  help: string | null;
  /** single: pick exactly one option. toggle: on or off. */
  kind: "single" | "toggle";
  default: string | null;
  options: { value: string; label: string }[];
}

/** Public: safe to show for every paper, premium included. */
export interface PaperMeta {
  id: string;
  slug: string;
  title: string;
  teaser: string;
  category: string;
  accessTier: "free" | "premium";
  publishedAt: string | null;
  readMinutes: number;
  doi: string;
  pmid: string | null;
  pmcid: string | null;
  citation: string;
  authors: string;
  journal: string;
  year: number;
  license: string;
  design: string;
  species: string;
  sampleSize: number | null;
  /** Distinct outcomes that carry weight in this paper's protocol, strongest first. */
  grades: { outcome: string; tier: EvidenceGrade; why: string }[];
  /** "20 healthy adults · randomized crossover trial · four breakfasts each": who, design, how many or how long. */
  sourceLine: string;
  /** True when a step depends on a block start date. */
  hasBlock: boolean;
  simulatorKind: string;
  /**
   * A members' read only: the part of it the feed shows to everyone (amendment A, widened by
   * the owner 2026-11-15): the question it answers, its finding headline, one supporting
   * sentence and one figure in its glance view. Everything else stays behind row level security.
   */
  card?: { question: string; finding: string; support: string; figure: FigureRef | null };
}

/** What the feed card shows at a glance: plain words, one still figure (lib/content/glance.ts). */
export interface GlanceView {
  /** The question the paper answers: the card's and the read's headline (owner, 2026-11-15). */
  question: string;
  /** The key finding, with its number first for an estimate ("−14.9 points lower ..."). */
  headline: string;
  support: string;
  /** null: the read's figure kind, drawn still. */
  figure: FigureRef | null;
  axes: { x: string | null; y: string | null };
  alt: string;
  note: string;
  tryIt: string;
  /** The grade of the headline result. */
  tier: EvidenceGrade | null;
}

export interface ReadSection {
  id: string;
  heading: string;
  paragraphs: Sentence[][];
}

/** A picture drawn in code, named in the paper's figure registry. */
export interface FigureRef {
  figure: string;
  /** The takeaway headline above the drawing (FIGURE-DESIGN 0.3), when the read wrote one. */
  headline?: Sentence[];
  caption: Sentence[];
  alt: string;
  /** What the picture shows. Every "fact:<id>" has been replaced by the resolved fact. */
  params: Record<string, unknown>;
}

/** H10: the three layers of a read. */
export interface ReadLayers {
  /** Why it happens. */
  mechanism: { paragraphs: Sentence[][]; figure: FigureRef | null };
  /** What the data supports. */
  protocol: { paragraphs: Sentence[][]; figure: FigureRef | null };
  /** The receipts. Design and sample size come from PaperMeta. */
  audit: {
    effect: Sentence[];
    weakEnd: Sentence[];
    limitations: Sentence[][];
    missed: Sentence[];
    more: Sentence[][];
    figure: FigureRef | null;
  };
}

export interface GlossaryEntry {
  term: string;
  plain: string;
  /** The facts the plain text rests on; empty when it comes from a concept. */
  refs: string[];
  /** The slug of a ContextConcept, or null. */
  concept: string | null;
}

/** Gated: this is what lives in paper_content.content_json. */
export interface PaperContent {
  hook: Sentence[];
  populationPanel: Sentence[];
  /** Old flat shape. Empty for a three-layer read; removed with the allowlist in step 2E. */
  sections: ReadSection[];
  limitations: Sentence[][];
  /** Old flat shape only: its one figure. Moves into layers.mechanism in step 2E. */
  figure?: FigureRef;
  /** Old flat shape only: a figure at the top of the receipts, under its title. Moves into layers.audit.figure in step 2E. */
  auditFigure?: { title: Sentence[]; figure: FigureRef };
  /** The three-layer read (H10). Absent only on the old flat shape. */
  layers?: ReadLayers;
  glossary?: GlossaryEntry[];
  /** Every source the read uses besides its own paper. Absent when there is none. */
  context?: { studies: ContextStudy[]; concepts: ContextConcept[] };
  primaryEstimate: string;
  /** The paper's source line (as on PaperMeta): what "from the paper" means for this read. */
  sourceLine: string;
  /**
   * The finding card: the question the paper answers (the headline of the card and the read),
   * the plain finding beneath it, and one supporting line (the source line is derived).
   */
  finding: { question: Sentence[]; headline: Sentence[]; support: Sentence[] };
  /** The feed card's still figure and its words (lib/content/glance.ts). */
  glance: {
    /** null: the read's figure kind (content.simulator.spec), drawn still. */
    figure: FigureRef | null;
    x: Sentence[]; y: Sentence[]; alt: Sentence[]; note: Sentence[]; tryIt: Sentence[];
  };
  facts: Record<string, ResolvedFact>;
  simulator: {
    kind: string;
    params: Record<string, unknown>;
    /** Drawn by kind: each param of the spec, resolved to its gated fact (or facts). */
    spec?: ResolvedSpec;
    /** Drawn by kind: the sentences it shows, by name ("alt", "finding"). */
    words?: Record<string, Sentence[]>;
  };
}

/** A figure spec with every fact id replaced by the resolved fact. */
export interface ResolvedSpec {
  kind: string;
  facts: Record<string, ResolvedFact | ResolvedFact[]>;
  simulator: Record<string, ResolvedFact | ResolvedFact[]>;
}

export interface CarouselSlide {
  kind: "hook" | "finding" | "population" | "limitation" | "nuance" | "cta";
  heading: string;
  body: string | null;
}

export interface CarouselDeck {
  slug: string;
  slides: CarouselSlide[];
  caption: string;
  hashtags: string[];
  credit: string;
}

export interface BuiltPaper {
  meta: PaperMeta;
  steps: ContentStep[];
  choices: Choice[];
  content: PaperContent;
  /** Premium "implementation notes", served through paper_feature_content. */
  takeaways: Sentence[][];
  carousel: CarouselDeck;
}
