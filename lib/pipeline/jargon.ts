/**
 * H9, the Feynman layer: the technical words a reader should never meet cold.
 *
 * A word on this list may appear in the mechanism or protocol text only when
 * the read's glossary says, in plain words, what the thing physically does.
 * The plain text of a glossary entry may not lean on another listed word:
 * explaining "adenosine" with "receptor" explains nothing.
 *
 * To add a word, add a line here. Never remove one to get a read through.
 * Pure: no imports from supabase, react or next.
 */

export interface JargonTerm {
  /** The word as the list names it. */
  term: string;
  /** Every written form that counts as that word. */
  pattern: RegExp;
}

export const JARGON: JargonTerm[] = [
  { term: "adenosine", pattern: /\badenosine\b/i },
  { term: "receptor", pattern: /\breceptors?\b/i },
  { term: "antagonist", pattern: /\bantagoni(st|sts|sm|se|ses|sed|ze|zes|zed|sing|zing)\b/i },
  { term: "upregulate", pattern: /\bup-?regulat(e|es|ed|ing|ion)\b/i },
  { term: "downregulate", pattern: /\bdown-?regulat(e|es|ed|ing|ion)\b/i },
  { term: "attenuate", pattern: /\battenuat(e|es|ed|ing|ion)\b/i },
  { term: "modulate", pattern: /\bmodulat(e|es|ed|ing|ion|or|ors)\b/i },
  { term: "AMPK", pattern: /\bAMPK\b/i },
  { term: "mTOR", pattern: /\bmTOR(C[12])?\b/i },
  { term: "cortisol", pattern: /\bcortisol\b/i },
  { term: "circadian", pattern: /\bcircadian\b/i },
  // Capitals only: "REM" and "non-REM" are sleep stages; "rem" is not a word a read uses.
  { term: "REM", pattern: /\bREM\b/ },
  { term: "hypertrophy", pattern: /\bhypertroph(y|ic|ied)\b/i },
  { term: "VO2max", pattern: /\bVO[2₂][ -]?max\b/i },
  { term: "insulin sensitivity", pattern: /\binsulin[- ]sensitiv(ity|e)\b/i },
  { term: "all-cause mortality", pattern: /\ball[- ]cause mortality\b/i },
  { term: "hazard ratio", pattern: /\bhazard ratios?\b/i },
  { term: "confidence interval", pattern: /\bconfidence intervals?\b/i },
  { term: "meta-analysis", pattern: /\bmeta-?analy(sis|ses|tic)\b/i },
  { term: "cohort", pattern: /\bcohorts?\b/i },
  { term: "randomized", pattern: /\brandomi[sz](e|ed|ation)\b/i },
];

/** The listed words found in a piece of text, each once, in list order. */
export function jargonIn(text: string): string[] {
  return JARGON.filter((j) => j.pattern.test(text)).map((j) => j.term);
}

/** True when a glossary entry named `entryTerm` is the entry for the listed word `term`. */
export function glossaryCovers(entryTerm: string, term: string): boolean {
  const listed = JARGON.find((j) => j.term === term);
  return listed ? listed.pattern.test(entryTerm) : false;
}
