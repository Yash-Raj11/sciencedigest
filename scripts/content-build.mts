/**
 * Turns content/papers/<slug>/ into everything the app and the database read.
 *
 *   npm run content:build      validate every paper, then write the generated files
 *   npm run content:check      validate, and fail if the generated files are stale
 *
 * A read may also cite other gated studies (content/context/<slug>/) and
 * background concepts (content/concepts/<slug>.json). Neither ever becomes a
 * protocol step or changes a weight. A published read that cites a source which
 * failed the gate, was withdrawn, or is an unreviewed concept stops the build.
 *
 * For tests only: `--papers <dir>`, `--context <dir>` and `--concepts <dir>`
 * read other folders, and `--report-only` validates and prints, writing and
 * comparing nothing.
 *
 * Each paper folder holds three files:
 *   source.txt        the paper's text, as retrieved (what every quote is checked against)
 *   extraction.json   stage 1 output: facts, each with the passage it was read from
 *   editorial.json    stage 3 output: the read, the protocol steps, the carousel
 *
 * Every paper goes through the gate (stage 2) and the lint (stage 4) on every
 * build. A paper that fails either stops the build: nothing unverified ships.
 *
 * Written:
 *   lib/content/generated.ts          bundled with the app: public metadata, steps, free reads
 *   content/generated/gated.json      premium reads + implementation notes (server only)
 *   content/generated/carousels.json  one Instagram deck per paper, for the approval queue
 *   supabase/seed.sql                 the same content as database rows
 */

import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { BuiltPaper, PaperMeta } from "../lib/content/types";
import { assemble } from "../lib/pipeline/assemble";
import { editorialShape } from "../lib/pipeline/editorial";
import { FIGURE_KEYS } from "../lib/content/figures";
import { gate } from "../lib/pipeline/gate";
import { lint } from "../lib/pipeline/lint";
import { loadContext } from "./context-load";
import { LEGACY_SHAPE_ALLOWLIST } from "./legacy-shape";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const flag = (name: string, fallback: string) => {
  const at = process.argv.indexOf(name);
  return at > 0 ? process.argv[at + 1] : fallback;
};
const PAPERS_DIR = flag("--papers", `${ROOT}content/papers`);
const CONTEXT_DIR = flag("--context", `${ROOT}content/context`);
const CONCEPTS_DIR = flag("--concepts", `${ROOT}content/concepts`);
const check = process.argv.includes("--check");
const quiet = process.argv.includes("--quiet");
const reportOnly = process.argv.includes("--report-only");

const built: BuiltPaper[] = [];
let failed = false;
const reportLines: string[] = [];
const say = (line: string) => { reportLines.push(line); if (!quiet) console.log(line); };

// Context sources are gated first: a read can only cite what passed.
const loaded = loadContext(CONTEXT_DIR, CONCEPTS_DIR);
for (const line of loaded.report) say(line);

for (const slug of readdirSync(PAPERS_DIR).sort()) {
  const dir = `${PAPERS_DIR}/${slug}`;
  if (!existsSync(`${dir}/editorial.json`)) continue;
  const source = readFileSync(`${dir}/source.txt`, "utf8");
  const extraction = JSON.parse(readFileSync(`${dir}/extraction.json`, "utf8"));
  const editorial = JSON.parse(readFileSync(`${dir}/editorial.json`, "utf8"));

  // A draft (publishedAt null) is work in progress: its problems are reported
  // but do not stop the build. A published paper that fails stops everything.
  const isDraft = editorial.publishedAt == null;
  say(`\n${slug}${isDraft ? " (draft, not in the app)" : ""}`);
  const gated = gate(extraction, source);
  if (!gated.ok) {
    if (!isDraft) failed = true;
    say(`  GATE REJECTED (${gated.errors.length})`);
    for (const e of gated.errors) say(`    - ${e}`);
    continue;
  }
  const factCount = Object.keys(gated.validated.facts).length;
  say(`  gate   ok: ${factCount} facts verified against the source, licence ${gated.validated.license}, design ${gated.validated.design}`);
  for (const w of gated.warnings) say(`    warning: ${w}`);

  if (editorial.slug !== slug) { failed = true; say(`  editorial.slug is "${editorial.slug}" but the folder is "${slug}"`); continue; }
  // Old flat shape: built only for the slugs on the temporary allowlist. Any
  // other paper in that shape is refused; a draft is reported and not built.
  const oldShape = editorialShape(editorial) === "legacy";
  const allowLegacyShape = oldShape && LEGACY_SHAPE_ALLOWLIST.includes(slug);
  if (allowLegacyShape) say("  shape  old flat shape, on the temporary allowlist (scripts/legacy-shape.ts): rewrite in step 2E");
  const report = lint(gated.validated, editorial, source, { allowLegacyShape, context: loaded.context, figures: FIGURE_KEYS });
  if (report.errors.length > 0) {
    if (!isDraft) failed = true;
    say(`  LINT FAILED (${report.errors.length})${isDraft ? ": reported, not built" : ""}`);
    for (const e of report.errors) say(`    - [${e.rule}] ${e.where}: ${e.message}`);
    continue;
  }
  say(`  lint   ok: ${report.wordCount} words`);
  if (report.layers) {
    for (const [layer, stats] of Object.entries(report.layers)) {
      say(`    ${layer.padEnd(9)} ${String(stats.words).padStart(3)} words, ${stats.sentences} sentences, average ${stats.average}, longest ${stats.longest}`);
    }
  }
  if (report.context) {
    const { studies, concepts } = report.context;
    say(`    context   ${studies.length} other ${studies.length === 1 ? "study" : "studies"}${studies.length ? ` (${studies.join(", ")})` : ""}, ${concepts.length} background ${concepts.length === 1 ? "concept" : "concepts"}${concepts.length ? ` (${concepts.join(", ")})` : ""}`);
  }
  for (const w of report.warnings) say(`    warning: [${w.rule}] ${w.where}: ${w.message}`);

  const paper = assemble(gated.validated, editorial, loaded.context);
  if (!paper.meta.publishedAt) { say("  skipped: publishedAt is null (not approved yet)"); continue; }
  const weights = paper.steps.filter((s) => !s.retired).map((s) => `${s.key}=${s.grade}`).join(", ");
  say(`  steps  ${weights}`);
  built.push(paper);
}

if (failed) {
  console.error("\ncontent build failed: fix the problems above. Nothing was written.");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Outputs
// ---------------------------------------------------------------------------

/**
 * What the feed may show of a members' read (amendment A to step 2D, the owner's
 * decision): its hook and its mechanism figure, nothing else. A free read needs
 * no card: the whole read is public.
 */
function publicMeta(paper: (typeof built)[number]): PaperMeta {
  if (paper.meta.accessTier !== "premium") return paper.meta;
  const { content } = paper;
  const figure = content.layers?.mechanism.figure ?? content.figure ?? null;
  return {
    ...paper.meta,
    card: {
      hook: content.hook.map((sentence) => sentence.text).join(" "),
      // The caption stays with the read: the card draws the picture and its description only.
      figure: figure ? { ...figure, caption: [] } : null,
    },
  };
}

const HEADER = "GENERATED by scripts/content-build.mts from content/papers/. Do not edit by hand: run `npm run content:build`.";
const free = built.filter((p) => p.meta.accessTier === "free");
const premium = built.filter((p) => p.meta.accessTier === "premium");

const generatedTs = `// ${HEADER}
/* eslint-disable */
import type { Choice, ContentStep, PaperContent, PaperMeta } from "./types";

/** Public metadata for every published paper, premium included. */
export const PAPERS: PaperMeta[] = ${JSON.stringify(built.map(publicMeta), null, 2)};

/** Every protocol step. Steps are public in the database too. */
export const STEPS: ContentStep[] = ${JSON.stringify(built.flatMap((p) => p.steps), null, 2)};

export const CHOICES: Record<string, Choice[]> = ${JSON.stringify(Object.fromEntries(built.map((p) => [p.meta.slug, p.choices])), null, 2)};

/** Reads for FREE papers only. Premium reads are never bundled: see content/generated/gated.json. */
export const FREE_CONTENT: Record<string, PaperContent> = ${JSON.stringify(Object.fromEntries(free.map((p) => [p.meta.slug, p.content])), null, 2)};
`;

const gatedJson = `${JSON.stringify({
  _: HEADER,
  content: Object.fromEntries(premium.map((p) => [p.meta.slug, p.content])),
  takeaways: Object.fromEntries(built.map((p) => [p.meta.slug, p.takeaways])),
}, null, 2)}\n`;

const carouselsJson = `${JSON.stringify({ _: HEADER, decks: built.map((p) => p.carousel) }, null, 2)}\n`;

const q = (v: string | null | undefined) => (v == null ? "null" : `'${v.replace(/'/g, "''")}'`);
const j = (v: unknown) => (v == null ? "null" : `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`);

const sql: string[] = [
  `-- ${HEADER}`,
  "--",
  "-- Safe to run again and again: every statement is an upsert. Applied automatically by",
  "-- `supabase db reset`; for a hosted project run `supabase db push --include-seed`.",
  "",
];
for (const p of built) {
  const m = p.meta;
  sql.push(`-- ${m.slug}`);
  sql.push(
    `insert into public.papers (id, slug, title, doi, category, teaser, access_tier, published_at) values (${q(m.id)}, ${q(m.slug)}, ${q(m.title)}, ${q(m.doi)}, ${q(m.category)}, ${q(m.teaser)}, ${q(m.accessTier)}, ${q(m.publishedAt)})\n` +
    "  on conflict (id) do update set slug = excluded.slug, title = excluded.title, doi = excluded.doi, category = excluded.category,\n" +
    "    teaser = excluded.teaser, access_tier = excluded.access_tier, published_at = coalesce(public.papers.published_at, excluded.published_at);",
  );
  sql.push(
    `insert into public.paper_content (paper_id, content_json) values (${q(m.id)}, ${j(p.content)})\n` +
    "  on conflict (paper_id) do update set content_json = excluded.content_json, updated_at = now();",
  );
  sql.push(
    `insert into public.paper_feature_content (paper_id, feature_key, payload) values (${q(m.id)}, 'key_takeaways', ${j({ takeaways: p.takeaways })})\n` +
    "  on conflict (paper_id, feature_key) do update set payload = excluded.payload, updated_at = now();",
  );
  const ordered = [...p.steps].sort((a, b) => Number(a.kind !== "action") - Number(b.kind !== "action") || a.position - b.position);
  const rows = ordered.map((s) =>
    `  (${q(s.id)}, ${q(m.id)}, ${s.position}, ${q(s.label)}, ${q(s.detail)}, '${s.kind}', '${s.grade}', ${q(s.sourceEstimate)}, ${s.targetPerWeek ?? "null"}, ${q(s.countsStepId)}, ${q(s.conditionKey)}, ${j(s.conditionValue)}, ${j(s.appliesWhen)}, ${s.retired ? "now()" : "null"})`);
  sql.push(
    "insert into public.protocol_steps (id, paper_id, position, label, detail, kind, evidence_grade, source_estimate, target_per_week, counts_step_id, condition_key, condition_value, applies_when, retired_at) values\n" +
    `${rows.join(",\n")}\n` +
    "  on conflict (id) do update set position = excluded.position, label = excluded.label, detail = excluded.detail, kind = excluded.kind,\n" +
    "    -- A withdrawn paper keeps weight 0 no matter what the content files say.\n" +
    "    evidence_grade = case when (select withdrawn_at from public.papers where id = excluded.paper_id) is null then excluded.evidence_grade else 'none' end,\n" +
    "    source_estimate = excluded.source_estimate, target_per_week = excluded.target_per_week, counts_step_id = excluded.counts_step_id,\n" +
    "    condition_key = excluded.condition_key, condition_value = excluded.condition_value, applies_when = excluded.applies_when,\n" +
    "    retired_at = case when excluded.retired_at is null then null else coalesce(public.protocol_steps.retired_at, excluded.retired_at) end;",
  );
  sql.push("");
}
const seedSql = sql.join("\n");

const outputs: [string, string][] = [
  [`${ROOT}lib/content/generated.ts`, generatedTs],
  [`${ROOT}content/generated/gated.json`, gatedJson],
  [`${ROOT}content/generated/carousels.json`, carouselsJson],
  [`${ROOT}supabase/seed.sql`, seedSql],
];

if (reportOnly) {
  say(`\ncontent report: ${built.length} papers would be built (${built.map((p) => p.meta.slug).join(", ") || "none"}). Nothing was written.`);
} else if (check) {
  const stale = outputs.filter(([path, text]) => !existsSync(path) || readFileSync(path, "utf8") !== text).map(([path]) => path.replace(ROOT, ""));
  if (stale.length > 0) {
    console.error(`\ngenerated files are out of date: ${stale.join(", ")}\nrun \`npm run content:build\` and commit the result.`);
    process.exit(1);
  }
  say(`\ncontent check passed: ${built.length} papers, generated files are current`);
} else {
  for (const [path, text] of outputs) writeFileSync(path, text);
  say(`\ncontent build wrote ${built.length} papers (${free.length} free, ${premium.length} premium)`);
}
