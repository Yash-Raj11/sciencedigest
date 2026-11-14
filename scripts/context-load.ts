/**
 * Reads content/context/ and content/concepts/ into what the lint and the
 * build need. Shared by content-build, the paper command and the retraction
 * check, so all three agree on what counts as a usable source.
 *
 *   content/context/<slug>/source.txt        the other study's text, as retrieved
 *   content/context/<slug>/extraction.json   its facts, gated with role "context"
 *   content/context/<slug>/withdrawn.json    written by `npm run retractions` on a hit
 *   content/context/<slug>/excluded.json     facts the owner ruled out of use: { "<fact_id>": "why" }
 *   content/concepts/<slug>.json             one background concept
 *   content/library.json                     the fact library: context facts the owner approved for simulators
 */

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname } from "node:path";
import { LibraryFile, approvedRefs, libraryProblems, type LibraryStudy } from "../lib/content/fact-library";
import { CONCEPT_SLUG, checkConcept } from "../lib/pipeline/concepts";
import { gate } from "../lib/pipeline/gate";
import { deriveTier } from "../lib/pipeline/grade";
import { BANNED_TERMS, SENTENCE_WORDS, THROAT_CLEARING, type ContextStudyState, type LintContext } from "../lib/pipeline/lint";

export const CONCEPT_RULES = { banned: BANNED_TERMS, throatClearing: THROAT_CLEARING, maxSentenceWords: SENTENCE_WORDS.fail };

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const subfolders = (dir: string) =>
  existsSync(dir) ? readdirSync(dir).filter((name) => statSync(`${dir}/${name}`).isDirectory()).sort() : [];

/** The DOI of every context study, read straight from its extraction (gate passed or not). */
export function contextDois(contextDir: string): { slug: string; doi: string }[] {
  const out: { slug: string; doi: string }[] = [];
  for (const slug of subfolders(contextDir)) {
    const path = `${contextDir}/${slug}/extraction.json`;
    if (!existsSync(path)) continue;
    try {
      const doi = (JSON.parse(readFileSync(path, "utf8")) as { identifiers?: { doi?: unknown } }).identifiers?.doi;
      if (typeof doi === "string") out.push({ slug, doi });
    } catch { /* an unreadable extraction is reported by loadContext */ }
  }
  return out;
}

export function loadStudy(dir: string): ContextStudyState {
  if (existsSync(`${dir}/editorial.json`)) {
    return { ok: false, errors: ["a context study has no editorial.json and no protocol; delete the file, or move the folder to content/papers/"] };
  }
  if (!existsSync(`${dir}/source.txt`) || !existsSync(`${dir}/extraction.json`)) {
    return { ok: false, errors: ["needs source.txt and extraction.json (npm run paper -- fetch <PMCID> <slug> --role context, then extract)"] };
  }
  let extraction: unknown;
  try { extraction = JSON.parse(readFileSync(`${dir}/extraction.json`, "utf8")); }
  catch (error) { return { ok: false, errors: [`extraction.json is not valid JSON: ${(error as Error).message}`] }; }
  const result = gate(extraction, readFileSync(`${dir}/source.txt`, "utf8"), { role: "context" });
  if (!result.ok) return { ok: false, errors: result.errors };
  const withdrawn = existsSync(`${dir}/withdrawn.json`)
    ? JSON.parse(readFileSync(`${dir}/withdrawn.json`, "utf8")) as { nature: string; date: string | null; reason: string }
    : null;
  // Facts the owner ruled out of use, each with the reason (for example an arm that does not apply).
  let excluded: Record<string, string> = {};
  if (existsSync(`${dir}/excluded.json`)) {
    try { excluded = JSON.parse(readFileSync(`${dir}/excluded.json`, "utf8")) as Record<string, string>; }
    catch (error) { return { ok: false, errors: [`excluded.json is not valid JSON: ${(error as Error).message}`] }; }
    const problems = Object.entries(excluded).flatMap(([id, why]) => [
      ...(Object.hasOwn(result.validated.facts, id) ? [] : [`excluded.json names "${id}", which is not a verified fact`]),
      ...(typeof why === "string" && why.trim() ? [] : [`excluded.json: "${id}" needs a reason`]),
    ]);
    if (problems.length > 0) return { ok: false, errors: problems };
  }
  return { ok: true, validated: result.validated, withdrawn, excluded };
}

/**
 * The fact library, checked against the context studies just loaded. Any problem fails the
 * whole build (`libraryErrors`): an approved fact that stopped being usable must be seen.
 */
export function loadLibrary(path: string, studies: LintContext["studies"]): { library: string[]; errors: string[]; report: string[] } {
  if (!existsSync(path)) return { library: [], errors: [], report: [] };
  let raw: unknown;
  try { raw = JSON.parse(readFileSync(path, "utf8")); }
  catch (error) { return { library: [], errors: [`library.json is not valid JSON: ${(error as Error).message}`], report: [] }; }
  const view: Record<string, LibraryStudy> = Object.fromEntries(Object.entries(studies).map(([slug, state]) => [slug, state.ok
    ? { ok: true, withdrawn: state.withdrawn, excluded: state.excluded, facts: state.validated.facts as never }
    : { ok: false }]));
  const errors = libraryProblems(raw, view);
  if (errors.length > 0) return { library: [], errors, report: [] };
  const file = LibraryFile.parse(raw);
  return {
    library: approvedRefs(file), errors: [],
    report: ["\nfact library (content/library.json)", ...file.facts.map((e) => `  ${e.quantity}: ${e.ref}, approved by the ${e.approved.by} on ${e.approved.on}`)],
  };
}

export function loadContext(contextDir: string, conceptsDir: string, libraryPath = `${dirname(contextDir)}/library.json`): { context: LintContext; report: string[]; libraryErrors: string[] } {
  const context: LintContext = { studies: {}, concepts: {} };
  const report: string[] = [];

  for (const slug of subfolders(contextDir)) {
    const state: ContextStudyState = SLUG.test(slug)
      ? loadStudy(`${contextDir}/${slug}`)
      : { ok: false, errors: ["the folder name must be lower-case-with-hyphens"] };
    context.studies[slug] = state;
    if (!state.ok) {
      report.push(`  ${slug}: GATE REJECTED (${state.errors.length}); no read may cite it`);
      for (const error of state.errors) report.push(`    - ${error}`);
    } else if (state.withdrawn) {
      report.push(`  ${slug}: WITHDRAWN (${state.withdrawn.nature}${state.withdrawn.date ? `, ${state.withdrawn.date}` : ""}); no read may cite it`);
    } else {
      const v = state.validated;
      const tier = deriveTier({ design: v.design, species: v.species, sampleSize: v.sampleSize, reportedGrade: null });
      const out = Object.keys(state.excluded ?? {}).length;
      report.push(`  ${slug}: gate ok (role context): ${Object.keys(v.facts).length} facts${out ? ` (${out} excluded from use)` : ""}, licence ${v.license}, design ${v.design}, grade ${tier}`);
    }
  }
  if (report.length > 0) report.unshift("\ncontext studies (content/context/)");

  const conceptLines: string[] = [];
  const files = existsSync(conceptsDir) ? readdirSync(conceptsDir).filter((name) => name.endsWith(".json")).sort() : [];
  for (const file of files) {
    const slug = file.slice(0, -5);
    let state;
    if (!CONCEPT_SLUG.test(slug)) state = { ok: false as const, errors: ["the file name must be lower-case-with-hyphens.json"] };
    else {
      try { state = checkConcept(JSON.parse(readFileSync(`${conceptsDir}/${file}`, "utf8")), CONCEPT_RULES); }
      catch (error) { state = { ok: false as const, errors: [`not valid JSON: ${(error as Error).message}`] }; }
    }
    context.concepts[slug] = state;
    if (!state.ok) {
      conceptLines.push(`  ${slug}: FAILED (${state.errors.length}); no read may use it`);
      for (const error of state.errors) conceptLines.push(`    - ${error}`);
    } else {
      conceptLines.push(`  ${slug}: ok, ${state.reviewed ? "reviewed by the owner" : "NOT REVIEWED (drafts only; npm run paper -- approve-concept " + slug + ")"}`);
    }
  }
  if (conceptLines.length > 0) report.push("\nbackground concepts (content/concepts/)", ...conceptLines);

  const library = loadLibrary(libraryPath, context.studies);
  context.library = library.library;
  report.push(...library.report);
  if (library.errors.length > 0) report.push("\nfact library (content/library.json): FAILED", ...library.errors.map((e) => `    - ${e}`));
  return { context, report, libraryErrors: library.errors };
}
