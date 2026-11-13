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
  grades: { outcome: string; tier: EvidenceGrade }[];
  /** True when a step depends on a block start date. */
  hasBlock: boolean;
  simulatorKind: string;
}

export interface ReadSection {
  id: string;
  heading: string;
  paragraphs: Sentence[][];
}

/** A picture drawn in code, named in the paper's figure registry. */
export interface FigureRef {
  figure: string;
  caption: Sentence[];
  alt: string;
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
}

/** Gated: this is what lives in paper_content.content_json. */
export interface PaperContent {
  hook: Sentence[];
  populationPanel: Sentence[];
  /** Old flat shape. Empty for a three-layer read; removed with the allowlist in step 2E. */
  sections: ReadSection[];
  limitations: Sentence[][];
  /** The three-layer read (H10). Absent only on the old flat shape. */
  layers?: ReadLayers;
  glossary?: GlossaryEntry[];
  primaryEstimate: string;
  facts: Record<string, ResolvedFact>;
  simulator: { kind: string; params: Record<string, unknown> };
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
