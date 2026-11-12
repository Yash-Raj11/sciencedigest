/**
 * The retraction check. Run it nightly.
 *
 *   npm run retractions
 *
 * 1. Gets the Retraction Watch data (one CSV in a git repository that Crossref
 *    updates every working day, CC0) into .cache/. Never one API call per paper.
 * 2. THE BACKWARD JOIN: checks every paper this app has published against it,
 *    so a paper retracted AFTER you wrote about it is caught.
 * 3. If SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set, withdraws any hit in
 *    the database: the read is hidden and its steps drop to weight 0. Scores
 *    are derived, so everyone's history recalculates by itself.
 *
 * Exit code 1 if a published paper has been retracted, so a scheduled job can
 * alert you. Then run `npm run paper -- unpublish <slug>` and rebuild.
 */

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { PAPERS } from "../lib/content/generated";
import { findRetracted, parseRetractionWatch } from "../lib/pipeline/retractions";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const REPO = "https://gitlab.com/crossref/retraction-watch-data.git";
const DIR = `${ROOT}.cache/retraction-watch-data`;
const CSV = `${DIR}/retraction_watch.csv`;

if (existsSync(`${ROOT}.env.local`)) process.loadEnvFile(`${ROOT}.env.local`);

if (existsSync(`${DIR}/.git`)) {
  execFileSync("git", ["-C", DIR, "pull", "--ff-only", "--quiet"], { stdio: "inherit" });
} else {
  mkdirSync(`${ROOT}.cache`, { recursive: true });
  execFileSync("git", ["clone", "--depth", "1", "--quiet", REPO, DIR], { stdio: "inherit" });
}
if (!existsSync(CSV)) {
  console.error(`Expected ${CSV} after cloning. The repository layout has changed; open ${DIR} and update CSV in this script.`);
  process.exit(2);
}

const retractions = parseRetractionWatch(readFileSync(CSV, "utf8"));
const hits = findRetracted(PAPERS.map((paper) => paper.doi), retractions);
console.log(`${retractions.length.toLocaleString("en")} retraction records checked against ${PAPERS.length} published papers.`);

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const db = url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;

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
  console.log("No published paper has been retracted.");
  process.exit(0);
}

for (const hit of hits) {
  const paper = PAPERS.find((p) => p.doi.toLowerCase() === hit.doi)!;
  console.error(`\nRETRACTED: ${paper.slug} (${hit.doi})\n  ${hit.nature}, ${hit.date ?? "date unknown"}: ${hit.reason}`);
  if (db) {
    const { error } = await db.rpc("withdraw_paper", { p_doi: hit.doi, p_reason: `${hit.nature}: ${hit.reason}`.slice(0, 500) });
    console.error(error ? `  could not withdraw it in the database: ${error.message}` : "  withdrawn in the database: read hidden, weight set to 0.");
  }
  console.error(`  now run: npm run paper -- unpublish ${paper.slug} && npm run content:build`);
}
process.exit(1);
