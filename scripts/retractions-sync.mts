/**
 * The retraction check. Run it nightly.
 *
 *   npm run retractions
 *
 * 1. Gets the Retraction Watch data (one CSV in a git repository that Crossref
 *    updates every working day, CC0) into .cache/. Never one API call per paper.
 * 2. THE BACKWARD JOIN: checks every paper this app has published, AND every
 *    context study in content/context/, against it, so a study retracted AFTER
 *    you wrote about it is caught.
 * 3. A retracted PAPER: if SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set,
 *    it is withdrawn in the database: the read is hidden and its steps drop to
 *    weight 0. Scores are derived, so everyone's history recalculates by itself.
 * 4. A retracted CONTEXT STUDY: content/context/<slug>/withdrawn.json is
 *    written. From then on no read may cite it: `npm run content:build` fails on
 *    every read that still does, naming the sentence. (A context study has no
 *    row in the database and carries no weight, so there is nothing to change there.)
 *
 * Exit code 1 if anything was retracted, so a scheduled job can alert you.
 *
 * For tests only: `--csv <file>` reads that file instead of fetching, and never
 * touches the database; `--context <dir>` and `--papers <dir>` read other folders.
 */

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { PAPERS } from "../lib/content/generated";
import { parseRetractionWatch, screenSources, type ScreenedSource } from "../lib/pipeline/retractions";
import { contextDois } from "./context-load";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const REPO = "https://gitlab.com/crossref/retraction-watch-data.git";
const DIR = `${ROOT}.cache/retraction-watch-data`;

const flag = (name: string) => {
  const at = process.argv.indexOf(name);
  return at > 0 ? process.argv[at + 1] : null;
};
const offlineCsv = flag("--csv");
const CSV = offlineCsv ?? `${DIR}/retraction_watch.csv`;
const CONTEXT_DIR = flag("--context") ?? `${ROOT}content/context`;
const PAPERS_DIR = flag("--papers") ?? `${ROOT}content/papers`;

if (!offlineCsv) {
  if (existsSync(`${ROOT}.env.local`)) process.loadEnvFile(`${ROOT}.env.local`);
  if (existsSync(`${DIR}/.git`)) {
    execFileSync("git", ["-C", DIR, "pull", "--ff-only", "--quiet"], { stdio: "inherit" });
  } else {
    mkdirSync(`${ROOT}.cache`, { recursive: true });
    execFileSync("git", ["clone", "--depth", "1", "--quiet", REPO, DIR], { stdio: "inherit" });
  }
}
if (!existsSync(CSV)) {
  console.error(`Expected ${CSV} after cloning. The repository layout has changed; open ${DIR} and update CSV in this script.`);
  process.exit(2);
}

const retractions = parseRetractionWatch(readFileSync(CSV, "utf8"));
const context = contextDois(CONTEXT_DIR);
const sources: ScreenedSource[] = [
  ...PAPERS.map((paper) => ({ slug: paper.slug, doi: paper.doi, role: "paper" as const })),
  ...context.map((study) => ({ ...study, role: "context" as const })),
];
const hits = screenSources(sources, retractions);
console.log(`${retractions.length.toLocaleString("en")} retraction records checked against ${PAPERS.length} published papers and ${context.length} context ${context.length === 1 ? "study" : "studies"}.`);

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const db = !offlineCsv && url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;

if (db) {
  const rows = retractions.map((r) => ({ doi: r.doi, retraction_nature: r.nature, retraction_date: r.date, reason: r.reason, synced_at: new Date().toISOString() }));
  const unique = [...new Map(rows.map((row) => [row.doi, row])).values()];
  for (let i = 0; i < unique.length; i += 1000) {
    const { error } = await db.from("retractions").upsert(unique.slice(i, i + 1000));
    if (error) { console.error(`could not save retractions: ${error.message}`); process.exit(2); }
  }
  console.log(`retractions table updated (${unique.length.toLocaleString("en")} rows).`);
}

if (hits.length === 0) {
  console.log("No published paper and no context study has been retracted.");
  process.exit(0);
}

/** The reads that cite a context study, found by its "<slug>/" reference prefix. */
function readsCiting(slug: string): string[] {
  if (!existsSync(PAPERS_DIR)) return [];
  return readdirSync(PAPERS_DIR).sort().filter((paper) => {
    const path = `${PAPERS_DIR}/${paper}/editorial.json`;
    return existsSync(path) && new RegExp(`[\\[",\\s]${slug}/[a-z]`).test(readFileSync(path, "utf8"));
  });
}

for (const { source, retraction } of hits) {
  const what = `${retraction.nature}, ${retraction.date ?? "date unknown"}: ${retraction.reason}`;
  if (source.role === "paper") {
    console.error(`\nRETRACTED: ${source.slug} (${retraction.doi})\n  ${what}`);
    if (db) {
      const { error } = await db.rpc("withdraw_paper", { p_doi: retraction.doi, p_reason: `${retraction.nature}: ${retraction.reason}`.slice(0, 500) });
      console.error(error ? `  could not withdraw it in the database: ${error.message}` : "  withdrawn in the database: read hidden, weight set to 0.");
    }
    console.error(`  now run: npm run paper -- unpublish ${source.slug} && npm run content:build`);
  } else {
    const file = `${CONTEXT_DIR}/${source.slug}/withdrawn.json`;
    writeFileSync(file, `${JSON.stringify({ doi: retraction.doi, nature: retraction.nature, date: retraction.date, reason: retraction.reason }, null, 2)}\n`);
    const citing = readsCiting(source.slug);
    console.error(`\nRETRACTED CONTEXT STUDY: ${source.slug} (${retraction.doi})\n  ${what}`);
    console.error(`  withdrawn: wrote ${file.replace(ROOT, "")}. No read may cite it from now on.`);
    console.error(citing.length > 0
      ? `  cited by: ${citing.join(", ")}. Remove those citations, then run: npm run content:build`
      : "  no read cites it. Commit the withdrawn.json file.");
  }
}
process.exit(1);
