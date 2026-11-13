/**
 * The paper pipeline, one command per stage. A paper lives in content/papers/<slug>/.
 *
 *   npm run paper -- fetch PMC1234567 my-slug    stage 0: download, licence + retraction check
 *   npm run paper -- extract my-slug             stage 1 + 2: model reads the paper, gate verifies it
 *   npm run paper -- draft my-slug               stage 3 + 4: model writes the read, lint checks it
 *   npm run paper -- approve my-slug             stage 5: YOU publish it (sets publishedAt)
 *   npm run paper -- unpublish my-slug           take it back out of the app
 *
 * After approve or unpublish, run `npm run content:build`.
 *
 * The two model stages need AI_API_KEY in .env.local. Nothing here publishes on
 * its own: a draft stays out of the app until you run `approve`, and `approve`
 * refuses a paper that fails the gate or the lint.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { complete, parseJsonReply } from "../lib/ai/provider";
import { readSearchRecord, xmlToText } from "../lib/pipeline/europepmc";
import { gate } from "../lib/pipeline/gate";
import { checkLicense } from "../lib/pipeline/license";
import { lint } from "../lib/pipeline/lint";
import { EDITORIAL_SYSTEM, EXTRACT_SYSTEM, editorialPrompt, extractPrompt } from "../lib/pipeline/prompts";
import { findRetracted, parseRetractionWatch } from "../lib/pipeline/retractions";
import { LEGACY_SHAPE_ALLOWLIST } from "./legacy-shape";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const PAPERS = `${ROOT}content/papers`;
const EXAMPLE = `${PAPERS}/steps-days-per-week`;
export const RETRACTIONS_CSV = `${ROOT}.cache/retraction-watch-data/retraction_watch.csv`;
const EUROPE_PMC = "https://www.ebi.ac.uk/europepmc/webservices/rest";

if (existsSync(`${ROOT}.env.local`)) process.loadEnvFile(`${ROOT}.env.local`);

const [command, ...args] = process.argv.slice(2);
const die = (message: string): never => { console.error(`\n${message}\n`); process.exit(1); };
const dirOf = (slug: string) => `${PAPERS}/${slug}`;
const readJson = (path: string) => JSON.parse(readFileSync(path, "utf8"));
const writeJson = (path: string, value: unknown) => writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);

function needSlug(slug: string | undefined, file: string): string {
  if (!slug || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) die("Give a slug in lower-case-with-hyphens, e.g. magnesium-sleep-latency.");
  if (!existsSync(`${dirOf(slug!)}/${file}`)) die(`content/papers/${slug}/${file} does not exist yet. Run the earlier stage first.`);
  return slug!;
}

/** Runs the gate and prints the verdict. Returns the validated facts, or null. */
function runGate(slug: string) {
  const result = gate(readJson(`${dirOf(slug)}/extraction.json`), readFileSync(`${dirOf(slug)}/source.txt`, "utf8"));
  if (!result.ok) {
    console.log(`GATE REJECTED (${result.errors.length})`);
    for (const error of result.errors) console.log(`  - ${error}`);
    return null;
  }
  console.log(`gate ok: ${Object.keys(result.validated.facts).length} facts verified against the source`);
  for (const warning of result.warnings) console.log(`  warning: ${warning}`);
  return result.validated;
}

function runLint(slug: string, validated: NonNullable<ReturnType<typeof runGate>>): boolean {
  const report = lint(validated, readJson(`${dirOf(slug)}/editorial.json`), readFileSync(`${dirOf(slug)}/source.txt`, "utf8"),
    { allowLegacyShape: LEGACY_SHAPE_ALLOWLIST.includes(slug) });
  for (const issue of report.errors) console.log(`  - [${issue.rule}] ${issue.where}: ${issue.message}`);
  for (const issue of report.warnings) console.log(`  warning: [${issue.rule}] ${issue.where}: ${issue.message}`);
  console.log(report.errors.length === 0 ? `lint ok: ${report.wordCount} words` : `LINT FAILED (${report.errors.length})`);
  return report.errors.length === 0;
}

async function fetchPaper(pmcid: string | undefined, slug: string | undefined) {
  if (!pmcid || !/^PMC\d+$/.test(pmcid)) die("Give a PubMed Central id, e.g. PMC10054577.");
  if (!slug || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) die("Give a slug in lower-case-with-hyphens after the id.");
  if (existsSync(`${dirOf(slug!)}/source.txt`)) die(`content/papers/${slug} already has a source.txt. Pick another slug or delete the folder.`);

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
  console.log(`saved content/papers/${slug}/source.txt (${source.length.toLocaleString("en")} characters), licence ${meta.license}`);
  console.log(`next: npm run paper -- extract ${slug}`);
}

async function extract(slugArg: string | undefined) {
  const slug = needSlug(slugArg, "source.txt");
  const reply = await complete({
    stage: "extract",
    system: EXTRACT_SYSTEM,
    prompt: extractPrompt({
      meta: existsSync(`${dirOf(slug)}/meta.json`) ? readJson(`${dirOf(slug)}/meta.json`) : {},
      source: readFileSync(`${dirOf(slug)}/source.txt`, "utf8"),
      exampleExtraction: readFileSync(`${EXAMPLE}/extraction.json`, "utf8"),
    }),
  });
  writeJson(`${dirOf(slug)}/extraction.json`, parseJsonReply(reply));
  console.log(`saved content/papers/${slug}/extraction.json`);
  if (runGate(slug)) console.log(`next: npm run paper -- draft ${slug}`);
  else console.log("Fix extraction.json by hand against source.txt, or run extract again. The gate must pass before drafting.");
}

async function draft(slugArg: string | undefined) {
  const slug = needSlug(slugArg, "extraction.json");
  const validated = runGate(slug);
  if (!validated) die("The gate must pass before a draft is written.");
  // The editorial model is handed the validated facts and nothing else. It never sees the paper.
  const reply = await complete({
    stage: "editorial",
    system: EDITORIAL_SYSTEM,
    prompt: editorialPrompt({ slug, validated, exampleEditorial: readFileSync(`${EXAMPLE}/editorial.json`, "utf8") }),
  });
  const editorial = parseJsonReply(reply) as Record<string, unknown>;
  writeJson(`${dirOf(slug)}/editorial.json`, { ...editorial, slug, publishedAt: null });
  console.log(`saved content/papers/${slug}/editorial.json (a draft: not in the app)`);
  if (runLint(slug, validated!)) console.log(`next: read the draft, then npm run paper -- approve ${slug}`);
  else console.log("Edit editorial.json until the lint passes, or run draft again.");
}

function setPublished(slugArg: string | undefined, publish: boolean) {
  const slug = needSlug(slugArg, "editorial.json");
  if (publish) {
    const validated = runGate(slug);
    if (!validated || !runLint(slug, validated)) die("Not approved: the paper must pass the gate and the lint first.");
  }
  const editorial = readJson(`${dirOf(slug)}/editorial.json`);
  writeJson(`${dirOf(slug)}/editorial.json`, { ...editorial, publishedAt: publish ? (editorial.publishedAt ?? new Date().toISOString()) : null });
  console.log(publish ? `approved ${slug}.` : `unpublished ${slug}.`);
  console.log("next: npm run content:build");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  switch (command) {
    case "fetch": await fetchPaper(args[0], args[1]); break;
    case "extract": await extract(args[0]); break;
    case "draft": await draft(args[0]); break;
    case "approve": setPublished(args[0], true); break;
    case "unpublish": setPublished(args[0], false); break;
    default: die("Usage: npm run paper -- <fetch|extract|draft|approve|unpublish> ...   (see the top of scripts/paper.mts)");
  }
}
