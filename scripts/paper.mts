/**
 * The paper pipeline, one command per stage. A paper lives in content/papers/<slug>/.
 *
 *   npm run paper -- fetch PMC1234567 my-slug    stage 0: download, licence + retraction check
 *   npm run paper -- extract my-slug             stage 1 + 2: model reads the paper, gate verifies it
 *   npm run paper -- draft my-slug               stage 3 + 4: model writes the read, lint checks it
 *   npm run paper -- approve my-slug             stage 5: YOU publish it (sets publishedAt)
 *   npm run paper -- unpublish my-slug           take it back out of the app
 *
 * Another study a read may cite beside its own paper lives in content/context/<slug>/.
 * It goes through the same fetch (licence, retraction check) and the same gate,
 * and stops there: no draft, no protocol, no weight.
 *
 *   npm run paper -- fetch PMC1234567 other-slug --role context
 *   npm run paper -- extract other-slug --role context
 *
 * A background concept is one file, content/concepts/<slug>.json. Only the owner
 * approves one, and only at a keyboard:
 *
 *   npm run paper -- approve-concept adenosine
 *
 * The conditions & confounds pass alone, on a paper whose facts were checked by hand
 * (owner, 2026-11-19). It runs only on a scratch copy, never on content/papers/:
 *
 *   SD_PAPERS_DIR=/some/scratch npm run paper -- extract my-slug --coverage-only
 *
 * The scratch folder holds my-slug/source.txt and the hand-checked extraction.json. The run
 * adds the pass's facts and coverage map to that copy, saves the model's answer as
 * coverage-pass.json and the review as coverage-review.txt, and runs the gate.
 *
 * After approve, unpublish or approve-concept, run `npm run content:build`.
 *
 * The two model stages need AI_API_KEY in .env.local. Nothing here publishes on
 * its own: a draft stays out of the app until you run `approve`, and `approve`
 * refuses a paper that fails the gate or the lint.
 */

import { existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { relative, resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "node:url";
import { completeJson, contextTokens, replyTokens, zodCheck } from "../lib/ai/provider";
import { mergeExtractions, splitSource, tokensOf } from "../lib/pipeline/chunks";
import { Editorial, LegacyEditorial } from "../lib/pipeline/editorial";
import { RawExtraction } from "../lib/pipeline/extraction";
import { CONCEPT_SLUG, approved } from "../lib/pipeline/concepts";
import { readSearchRecord, xmlToText } from "../lib/pipeline/europepmc";
import { FIGURE_KEYS } from "../lib/content/figures";
import { gate } from "../lib/pipeline/gate";
import { checkLicense } from "../lib/pipeline/license";
import { lint } from "../lib/pipeline/lint";
import { COVERAGE_SYSTEM, EDITORIAL_SYSTEM, EXTRACT_SYSTEM, coveragePrompt, editorialPrompt, extractPrompt } from "../lib/pipeline/prompts";
import { COVERAGE_ITEMS, CoveragePass, mergeCoverage, reviewCoverage } from "../lib/pipeline/coverage";
import type { Coverage, CoverageReview } from "../lib/pipeline/coverage";
import { findRetracted, parseRetractionWatch } from "../lib/pipeline/retractions";
import type { GateRole } from "../lib/pipeline/gate";
import { loadContext } from "./context-load";
import { kindMenu, proposeKinds } from "../lib/pipeline/propose";
import { LEGACY_SHAPE_ALLOWLIST } from "./legacy-shape";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
// For benchmarks and tests only: SD_PAPERS_DIR points extract and draft at a scratch folder.
const PAPERS = process.env.SD_PAPERS_DIR ?? `${ROOT}content/papers`;
const CONTEXT = `${ROOT}content/context`;
// For tests only: SD_CONCEPTS_DIR points approve-concept at a scratch folder.
const CONCEPTS = process.env.SD_CONCEPTS_DIR ?? `${ROOT}content/concepts`;
const EXAMPLE = `${ROOT}content/papers/steps-days-per-week`;
export const RETRACTIONS_CSV = `${ROOT}.cache/retraction-watch-data/retraction_watch.csv`;
const EUROPE_PMC = "https://www.ebi.ac.uk/europepmc/webservices/rest";

if (existsSync(`${ROOT}.env.local`)) process.loadEnvFile(`${ROOT}.env.local`);

const [command, ...rawArgs] = process.argv.slice(2);
const die = (message: string): never => { console.error(`\n${message}\n`); process.exit(1); };

// `--role context` anywhere after the command sends fetch and extract to content/context/.
const roleAt = rawArgs.indexOf("--role");
const roleArg = roleAt >= 0 ? rawArgs[roleAt + 1] : "paper";
const coverageOnly = rawArgs.includes("--coverage-only");
const args = (roleAt >= 0 ? rawArgs.filter((_, i) => i !== roleAt && i !== roleAt + 1) : rawArgs).filter((a) => a !== "--coverage-only");
const role = (roleArg === "paper" || roleArg === "context" ? roleArg : "invalid") as GateRole;
const dirOf = (slug: string) => `${role === "context" ? CONTEXT : PAPERS}/${slug}`;
const folder = () => (role === "context" ? "content/context" : "content/papers");
const readJson = (path: string) => JSON.parse(readFileSync(path, "utf8"));
const writeJson = (path: string, value: unknown) => writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);

function needSlug(slug: string | undefined, file: string): string {
  if (!slug || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) die("Give a slug in lower-case-with-hyphens, e.g. magnesium-sleep-latency.");
  if (!existsSync(`${dirOf(slug!)}/${file}`)) die(`${folder()}/${slug}/${file} does not exist yet. Run the earlier stage first.`);
  return slug!;
}

/** Runs the gate and prints the verdict. Returns the validated facts, or null. */
function runGate(slug: string) {
  const result = gate(readJson(`${dirOf(slug)}/extraction.json`), readFileSync(`${dirOf(slug)}/source.txt`, "utf8"), { role });
  if (!result.ok) {
    console.log(`GATE REJECTED (${result.errors.length})`);
    for (const error of result.errors) console.log(`  - ${error}`);
    return null;
  }
  console.log(`gate ok: ${Object.keys(result.validated.facts).length} facts verified against the source`);
  for (const warning of result.warnings) console.log(`  warning: ${warning}`);
  return result.validated;
}

/** Runs the lint and prints the verdict. `unreviewed` lists the concepts the owner has still to approve. */
function runLint(slug: string, validated: NonNullable<ReturnType<typeof runGate>>): { ok: boolean; unreviewed: string[] } {
  const { context } = loadContext(CONTEXT, CONCEPTS);
  const report = lint(validated, readJson(`${dirOf(slug)}/editorial.json`), readFileSync(`${dirOf(slug)}/source.txt`, "utf8"),
    { allowLegacyShape: LEGACY_SHAPE_ALLOWLIST.includes(slug), context, figures: FIGURE_KEYS });
  for (const issue of report.errors) console.log(`  - [${issue.rule}] ${issue.where}: ${issue.message}`);
  for (const issue of report.warnings) console.log(`  warning: [${issue.rule}] ${issue.where}: ${issue.message}`);
  console.log(report.errors.length === 0 ? `lint ok: ${report.wordCount} words` : `LINT FAILED (${report.errors.length})`);
  return { ok: report.errors.length === 0, unreviewed: report.context?.unreviewed ?? [] };
}

async function fetchPaper(pmcid: string | undefined, slug: string | undefined) {
  if (!pmcid || !/^PMC\d+$/.test(pmcid)) die("Give a PubMed Central id, e.g. PMC10054577.");
  if (!slug || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) die("Give a slug in lower-case-with-hyphens after the id.");
  if (existsSync(`${dirOf(slug!)}/source.txt`)) die(`${folder()}/${slug} already has a source.txt. Pick another slug or delete the folder.`);
  if (existsSync(`${PAPERS}/${slug}`) || existsSync(`${CONTEXT}/${slug}`)) die(`"${slug}" is already used in content/papers or content/context. A slug names one study.`);

  const search = await fetch(`${EUROPE_PMC}/search?query=PMCID:${pmcid}&resultType=core&format=json`);
  if (!search.ok) die(`Europe PMC search failed (${search.status}).`);
  const record = ((await search.json()) as { resultList?: { result?: Record<string, unknown>[] } }).resultList?.result?.[0];
  if (!record) die(`Europe PMC has no record for ${pmcid}.`);
  const meta = readSearchRecord(record!);

  const licence = checkLicense(meta.license);
  if (!licence.ok) die(`REJECTED on licence: ${licence.reason}.\nOnly CC-BY, CC-BY-SA and CC0 papers may be used.`);

  if (!existsSync(RETRACTIONS_CSV)) {
    console.log("warning: no retraction data on this machine. Run `npm run retractions` and fetch again before publishing.");
  } else if (meta.doi && findRetracted([meta.doi], parseRetractionWatch(readFileSync(RETRACTIONS_CSV, "utf8"))).length > 0) {
    die(`REJECTED: ${meta.doi} is listed in the Retraction Watch data.`);
  }

  const full = await fetch(`${EUROPE_PMC}/${pmcid}/fullTextXML`);
  if (!full.ok) die(`No open full text for ${pmcid} (${full.status}).`);
  const source = xmlToText(await full.text());
  if (source.length < 5000) die("The full text came back suspiciously short. Open the paper and check it is really open access.");

  mkdirSync(dirOf(slug!), { recursive: true });
  writeFileSync(`${dirOf(slug!)}/source.txt`, `${source}\n`);
  writeJson(`${dirOf(slug!)}/meta.json`, { ...meta, license: licence.ok ? licence.license : meta.license });
  console.log(`saved ${folder()}/${slug}/source.txt (${source.length.toLocaleString("en")} characters), licence ${meta.license}`);
  console.log(`next: npm run paper -- extract ${slug}${role === "context" ? " --role context" : ""}`);
}

/** Does the whole paper fit beside the instructions? If not, it is read in parts. Never cut short. */
function partsOf(source: string, instructionTokens: number): string[] {
  const room = contextTokens() - replyTokens() - instructionTokens - 500;
  if (room < 2000) die("The model's context window is too small for the instructions and the example. Use a model with a larger window (AI_CONTEXT_TOKENS).");
  const parts = tokensOf(source) <= room ? [source] : splitSource(source, Math.floor(room * 3.5));
  if (parts.length > 1) {
    console.warn(`warning: the paper (~${tokensOf(source).toLocaleString("en")} tokens) does not fit the model's window; reading it in ${parts.length} parts and merging.`);
  }
  return parts;
}

/** The conditions & confounds pass: one narrower request per part (lib/pipeline/coverage.ts). */
async function runCoveragePass(start: RawExtraction, parts: string[]) {
  let extraction = start as RawExtraction & { coverage?: Coverage };
  let retries = 0;
  const answers: CoveragePass[] = [];
  const coverageCheck = zodCheck(CoveragePass);
  for (const part of parts) {
    const result = await completeJson({ stage: "extract", system: COVERAGE_SYSTEM, prompt: coveragePrompt({ source: part, facts: extraction.facts }) }, coverageCheck);
    retries += result.retries;
    const answer = CoveragePass.parse(result.value);
    answers.push(answer);
    const { extraction: next, notes } = mergeCoverage(extraction, answer);
    const earlier = extraction.coverage;
    if (earlier) for (const item of COVERAGE_ITEMS) next.coverage[item] = [...new Set([...(earlier[item] ?? []), ...next.coverage[item]])];
    for (const line of notes) console.log(`coverage: ${line}`);
    extraction = next;
  }
  return { extraction: extraction as RawExtraction & { coverage: Coverage }, answers, retries };
}

/**
 * A coverage-only run writes to a scratch copy and never over content/ (owner, 2026-11-19):
 * SD_PAPERS_DIR must be set and must lie outside the repository's content folder.
 */
export function coverageOnlyRefusal(env: { SD_PAPERS_DIR?: string }, role: GateRole, root: string): string | null {
  if (role !== "paper") return "--coverage-only runs on a paper, not on a context study.";
  if (!env.SD_PAPERS_DIR) return "--coverage-only writes to a scratch copy only. Set SD_PAPERS_DIR to a folder that holds <slug>/source.txt and a copy of the hand-checked <slug>/extraction.json.";
  const real = (p: string) => (existsSync(p) ? realpathSync(p) : resolve(p));
  const inside = relative(real(`${root}content`), real(env.SD_PAPERS_DIR));
  if (!inside.startsWith("..") && !inside.startsWith("/")) return `SD_PAPERS_DIR is inside content/ (${env.SD_PAPERS_DIR}). A coverage-only run never writes there; point it at a scratch copy.`;
  return null;
}

function formatReview(slug: string, review: CoverageReview, gateOk: boolean): string {
  const lines = [`${slug}: coverage-only run`, `gate on the scratch copy: ${gateOk ? "ok" : "REJECTED (see above)"}`, ""];
  lines.push(`New facts (${review.added.length}):`);
  for (const f of review.added) {
    lines.push(`  ${f.id}  [${f.kind}]  value: ${JSON.stringify(f.value)}`);
    lines.push(`    label: ${f.label}`);
    lines.push(`    quote: ${JSON.stringify(f.quote)}`);
    if (f.estimate) lines.push(`    estimate: ${JSON.stringify(f.estimate)}`);
    if (f.spread) lines.push(`    spread: ${JSON.stringify(f.spread)}`);
  }
  lines.push("", `Hand-checked facts relabelled as limitations (${review.relabelled.length}): ${review.relabelled.join(", ") || "none"}`);
  lines.push("", "Coverage map (item: facts that cover it):");
  for (const item of COVERAGE_ITEMS) lines.push(`  ${item}: ${review.coverage[item].join(", ") || "not found"}`);
  lines.push("", `Problems (must be none before a merge): ${review.problems.join("; ") || "none"}`);
  return `${lines.join("\n")}\n`;
}

async function extractCoverageOnly(slugArg: string | undefined) {
  const refusal = coverageOnlyRefusal({ SD_PAPERS_DIR: process.env.SD_PAPERS_DIR }, role, ROOT);
  if (refusal) die(refusal);
  const slug = needSlug(slugArg, "extraction.json");
  needSlug(slug, "source.txt");
  const started = Date.now();
  const handChecked = readJson(`${dirOf(slug)}/extraction.json`);
  if (handChecked.coverage) die(`${PAPERS}/${slug}/extraction.json already has a coverage map. Copy the hand-checked extraction.json in again first.`);
  const valid = RawExtraction.safeParse(handChecked);
  if (!valid.success) die(`The hand-checked extraction.json does not match the schema: ${valid.error.message}`);
  console.log("the hand-checked extraction, before the pass:");
  if (!runGate(slug)) die("The hand-checked extraction fails the gate. Fix that first.");

  const source = readFileSync(`${dirOf(slug)}/source.txt`, "utf8");
  const parts = partsOf(source, tokensOf(COVERAGE_SYSTEM + coveragePrompt({ source: "", facts: handChecked.facts })));
  // The raw file, not the parsed one, so every hand-checked fact stays exactly as written.
  const { extraction, answers, retries } = await runCoveragePass(handChecked as RawExtraction, parts);
  writeJson(`${dirOf(slug)}/coverage-pass.json`, answers);
  writeJson(`${dirOf(slug)}/extraction.json`, extraction);
  console.log(`saved ${PAPERS}/${slug}/extraction.json and coverage-pass.json (parts: ${parts.length}, JSON retries: ${retries}, ${((Date.now() - started) / 1000).toFixed(1)} s)`);

  console.log("\nafter the pass:");
  const gateOk = runGate(slug) !== null;
  const review = reviewCoverage(handChecked as RawExtraction, extraction);
  const text = formatReview(slug, review, gateOk);
  writeFileSync(`${dirOf(slug)}/coverage-review.txt`, text);
  console.log(`\n${text}`);
  if (review.problems.length > 0) die("The run changed the hand-checked facts. Do not merge it.");
}

async function extract(slugArg: string | undefined) {
  const slug = needSlug(slugArg, "source.txt");
  const started = Date.now();
  const meta = existsSync(`${dirOf(slug)}/meta.json`) ? readJson(`${dirOf(slug)}/meta.json`) : {};
  const source = readFileSync(`${dirOf(slug)}/source.txt`, "utf8");
  const exampleExtraction = readFileSync(`${EXAMPLE}/extraction.json`, "utf8");
  const check = zodCheck(RawExtraction);

  const parts = partsOf(source, tokensOf(EXTRACT_SYSTEM + extractPrompt({ meta, source: "", exampleExtraction })));

  let retries = 0;
  const extractions = [];
  for (const [i, part] of parts.entries()) {
    const note = parts.length > 1
      ? `\n\nNOTE: this is part ${i + 1} of ${parts.length} of the paper. Extract only facts whose quote is in this part. Fill identifiers, license, design, species, population and sampleSize from what this part and the metadata show.`
      : "";
    const result = await completeJson({ stage: "extract", system: EXTRACT_SYSTEM, prompt: extractPrompt({ meta, source: part, exampleExtraction }) + note }, check);
    retries += result.retries;
    extractions.push(RawExtraction.parse(result.value));
  }
  const { merged, notes } = parts.length > 1 ? mergeExtractions(extractions) : { merged: extractions[0], notes: [] };
  for (const line of notes) console.warn(`warning: merge: ${line}`);

  // Saved before the second request, so a server failure there does not lose the first pass.
  writeJson(`${dirOf(slug)}/extraction.json`, merged);
  const pass = await runCoveragePass(merged, parts);
  retries += pass.retries;
  const extraction = pass.extraction;
  const added = extraction.facts.length - merged.facts.length;
  // Saved as the model wrote it (parsed to the schema's shape); the gate judges it next.
  writeJson(`${dirOf(slug)}/extraction.json`, extraction);
  console.log(`saved ${folder()}/${slug}/extraction.json (parts: ${parts.length}, coverage pass added ${added} facts, JSON retries: ${retries}, ${((Date.now() - started) / 1000).toFixed(1)} s)`);
  if (!runGate(slug)) console.log("Fix extraction.json by hand against source.txt, or run extract again. The gate must pass before anything cites it.");
  else if (role === "context") console.log(`A context study stops here: no draft, no protocol. A read cites its facts as [${slug}/<fact_id>].`);
  else console.log(`next: npm run paper -- draft ${slug}`);
}

async function draft(slugArg: string | undefined) {
  if (role === "context") die("A context study never gets a draft, a protocol or a weight. It is only cited by another paper's read.");
  const slug = needSlug(slugArg, "extraction.json");
  const validated = runGate(slug);
  if (!validated) die("The gate must pass before a draft is written.");
  // The editorial model is handed the validated facts and nothing else. It never sees the paper.
  // Code works out which figure kinds those facts can feed (and with which facts); the model picks from that menu.
  const { context } = loadContext(CONTEXT, CONCEPTS);
  const kinds = kindMenu(proposeKinds(validated!.facts, context));
  console.log(`figure kinds offered:\n${kinds}`);
  const started = Date.now();
  // The JSON check is the schema only (either shape, so the lint can name a wrong one); the lint judges the content.
  const shape = zodCheck(Editorial.or(LegacyEditorial));
  const { value, retries } = await completeJson({
    stage: "editorial",
    system: EDITORIAL_SYSTEM,
    prompt: editorialPrompt({ slug, validated: validated!, exampleEditorial: readFileSync(`${EXAMPLE}/editorial.json`, "utf8"), kinds }),
  }, (reply) => shape({ ...(reply as object), slug, publishedAt: null }));
  const editorial = value as Record<string, unknown>;
  console.log(`JSON retries: ${retries}, ${((Date.now() - started) / 1000).toFixed(1)} s`);
  writeJson(`${dirOf(slug)}/editorial.json`, { ...editorial, slug, publishedAt: null });
  console.log(`saved content/papers/${slug}/editorial.json (a draft: not in the app)`);
  if (runLint(slug, validated!).ok) console.log(`next: read the draft, then npm run paper -- approve ${slug}`);
  else console.log("Edit editorial.json until the lint passes, or run draft again.");
}

function setPublished(slugArg: string | undefined, publish: boolean) {
  if (role === "context") die("A context study is never published on its own. It is only cited by another paper's read.");
  const slug = needSlug(slugArg, "editorial.json");
  if (publish) {
    const validated = runGate(slug);
    const linted = validated ? runLint(slug, validated) : null;
    if (!linted?.ok) die("Not approved: the paper must pass the gate and the lint first.");
    if (linted!.unreviewed.length > 0) {
      die(`Not approved: this read uses background concepts you have not reviewed: ${linted!.unreviewed.join(", ")}.\nRead each one, then: npm run paper -- approve-concept <slug>`);
    }
  }
  const editorial = readJson(`${dirOf(slug)}/editorial.json`);
  writeJson(`${dirOf(slug)}/editorial.json`, { ...editorial, publishedAt: publish ? (editorial.publishedAt ?? new Date().toISOString()) : null });
  console.log(publish ? `approved ${slug}.` : `unpublished ${slug}.`);
  console.log("next: npm run content:build");
}

/**
 * The owner's review of one background concept. A person at a keyboard, never
 * a script: it refuses to run unless both ends are a terminal, shows the whole
 * concept, and asks for the slug to be typed back.
 */
async function approveConcept(slug: string | undefined) {
  if (!slug || !CONCEPT_SLUG.test(slug)) die("Give the concept's slug, e.g. npm run paper -- approve-concept adenosine");
  const path = `${CONCEPTS}/${slug}.json`;
  if (!existsSync(path)) die(`content/concepts/${slug}.json does not exist.`);
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    die("approve-concept is the owner's review and has to be run by a person in a terminal.\nIt cannot be run by a script, a pipe or an assistant session.");
  }
  const state = loadContext(CONTEXT, CONCEPTS).context.concepts[slug!];
  if (!state.ok) die(`Not approved: the concept fails its own checks.\n${state.errors.map((e) => `  - ${e}`).join("\n")}`);
  if (!state.ok) return;
  const { concept } = state;
  if (state.reviewed) { console.log(`${slug} is already reviewed in its present wording (${concept.reviewed?.at}).`); return; }
  const ref = concept.reference;
  console.log(`\nConcept: ${slug}\n`);
  console.log(`  term       ${concept.term}`);
  console.log(`  plain      ${concept.plain}`);
  console.log(`  model      ${concept.model}`);
  console.log(`  reference  ${ref.title}  (${ref.doi ? `doi:${ref.doi}` : `ISBN ${ref.isbn}`})\n`);
  console.log("Approving says: I have read this, it is correct, and the reference supports it.");
  const ask = createInterface({ input: process.stdin, output: process.stdout });
  const typed = (await ask.question(`Type the slug (${slug}) to approve, or anything else to cancel: `)).trim();
  ask.close();
  if (typed !== slug) { console.log("Cancelled. Nothing was changed."); return; }
  writeJson(path, approved(concept, new Date().toISOString()));
  console.log(`approved ${slug}. If you change its wording later it will need approving again.`);
  console.log("next: npm run content:build");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if ((role as string) === "invalid") die('--role is "paper" or "context".');
  switch (command) {
    case "fetch": await fetchPaper(args[0], args[1]); break;
    case "extract": await (coverageOnly ? extractCoverageOnly(args[0]) : extract(args[0])); break;
    case "draft": await draft(args[0]); break;
    case "approve": setPublished(args[0], true); break;
    case "unpublish": setPublished(args[0], false); break;
    case "approve-concept": await approveConcept(args[0]); break;
    default: die("Usage: npm run paper -- <fetch|extract|draft|approve|unpublish|approve-concept> ...   (see the top of scripts/paper.mts)");
  }
}
