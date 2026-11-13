/**
 * What a `[reference]` in editorial markup can point at.
 *
 *   [sleep_same]              a fact from the paper itself
 *   [inoue-2023/ard_1_2]      a fact from another study: { source, fact }, where the
 *                             source is a gated folder in content/context/
 *   [concept:adenosine]       a background concept in content/concepts/ (no numbers)
 *
 * Fact ids are lower_snake_case and slugs are lower-kebab-case, so the three
 * forms cannot be mistaken for one another.
 * Pure: no imports from supabase, react or next.
 */

export type Ref =
  | { kind: "paper"; fact: string }
  | { kind: "study"; source: string; fact: string }
  | { kind: "concept"; slug: string };

const SLUG = "[a-z0-9]+(?:-[a-z0-9]+)*";
const STUDY = new RegExp(`^(${SLUG})/(.+)$`);
const CONCEPT = /^concept:(.*)$/;

export function parseRef(ref: string): Ref {
  const concept = CONCEPT.exec(ref);
  if (concept) return { kind: "concept", slug: concept[1] };
  const study = STUDY.exec(ref);
  if (study) return { kind: "study", source: study[1], fact: study[2] };
  return { kind: "paper", fact: ref };
}

/** True for a reference to anything other than the paper itself. */
export function isContextRef(ref: string): boolean {
  return parseRef(ref).kind !== "paper";
}

export const studyRef = (source: string, fact: string) => `${source}/${fact}`;
export const conceptRef = (slug: string) => `concept:${slug}`;
