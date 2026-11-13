/**
 * Step 2B, end to end through the real scripts, on scratch folders:
 *
 *   - content-build refuses a published read that uses an unreviewed concept,
 *     and builds it once the concept is approved;
 *   - `npm run retractions` covers content/context/: a retracted context study
 *     is withdrawn, and content-build then refuses every read that cites it;
 *   - a context folder can never hold an editorial;
 *   - approve-concept cannot be run by a script; draft and approve refuse a
 *     context study.
 *
 * Nothing here touches the real content, the network or the database.
 */

import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { approved, type Concept } from "../lib/pipeline/concepts";

const TSX = "node_modules/.bin/tsx";
const OTHER = "inoue-2023-steps";
const OTHER_DOI = "10.5555/sd-test-context-study";
const fixture = JSON.parse(readFileSync("lib/pipeline/fixtures/layered-caffeine.json", "utf8"));
const concept: Concept = fixture.concepts["non-rem-sleep"];

const scratch: string[] = [];
afterAll(() => { for (const dir of scratch) rmSync(dir, { recursive: true, force: true }); });

/**
 * A scratch content tree: one published three-layer read (the caffeine paper
 * with the fixture laid over it), one concept, and one context study (the steps
 * paper's real source and extraction under a made-up DOI).
 */
function tree(options: { conceptReviewed: boolean; citeStudy: boolean }) {
  const root = mkdtempSync(join(tmpdir(), "sd-context-"));
  scratch.push(root);
  const papers = join(root, "papers");
  const context = join(root, "context");
  const concepts = join(root, "concepts");

  cpSync("content/papers/daytime-caffeine-sleep", join(papers, "daytime-caffeine-sleep"), { recursive: true });
  const editorialPath = join(papers, "daytime-caffeine-sleep", "editorial.json");
  const old = JSON.parse(readFileSync(editorialPath, "utf8"));
  const base = Object.fromEntries(Object.entries(old).filter(([key]) => !["sections", "limitations", "layers", "glossary"].includes(key)));
  const layers = JSON.parse(JSON.stringify(fixture.layers));
  if (options.citeStudy) layers.audit.more.push(`Another study counted the steps of 3101 adults. [${OTHER}/sample]`);
  writeFileSync(editorialPath, JSON.stringify({ ...base, publishedAt: "2026-11-13T00:00:00Z", layers, glossary: fixture.glossary }, null, 2));

  mkdirSync(join(context, OTHER), { recursive: true });
  cpSync("content/papers/steps-days-per-week/source.txt", join(context, OTHER, "source.txt"));
  const extraction = JSON.parse(readFileSync("content/papers/steps-days-per-week/extraction.json", "utf8"));
  extraction.identifiers.doi = OTHER_DOI;
  writeFileSync(join(context, OTHER, "extraction.json"), JSON.stringify(extraction, null, 2));

  mkdirSync(concepts, { recursive: true });
  writeFileSync(join(concepts, "non-rem-sleep.json"), JSON.stringify(options.conceptReviewed ? approved(concept, "2026-11-13T00:00:00Z") : concept, null, 2));
  return { root, papers, context, concepts };
}

function run(script: string, args: string[], env: Record<string, string> = {}) {
  const result = spawnSync(TSX, [script, ...args], { encoding: "utf8", env: { ...process.env, ...env } });
  return { status: result.status, output: `${result.stdout}${result.stderr}` };
}
const build = (t: ReturnType<typeof tree>) =>
  run("scripts/content-build.mts", ["--papers", t.papers, "--context", t.context, "--concepts", t.concepts, "--report-only"]);

describe("content-build and context sources", () => {
  it("refuses a published read that uses an unreviewed concept", () => {
    const { status, output } = build(tree({ conceptReviewed: false, citeStudy: false }));
    expect(output).toContain("non-rem-sleep: ok, NOT REVIEWED");
    expect(output).toContain('[context] concept:non-rem-sleep: the concept "non-rem-sleep" has not been reviewed by the owner');
    expect(output).toContain("a published read cannot use it");
    expect(output).toContain("content build failed");
    expect(status).toBe(1);
  }, 30000);

  it("builds the same read once the concept is approved, and names the context it used", () => {
    const { status, output } = build(tree({ conceptReviewed: true, citeStudy: true }));
    expect(output).toContain(`${OTHER}: gate ok (role context): 34 facts, licence CC-BY, design cohort, grade low`);
    expect(output).toContain("non-rem-sleep: ok, reviewed by the owner");
    expect(output).toContain(`context   1 other study (${OTHER}), 1 background concept (non-rem-sleep)`);
    expect(output).toContain("1 papers would be built (daytime-caffeine-sleep)");
    expect(status).toBe(0);
  }, 30000);

  it("refuses a context folder that holds an editorial: a context study has no read and no protocol", () => {
    const t = tree({ conceptReviewed: true, citeStudy: true });
    cpSync("content/papers/steps-days-per-week/editorial.json", join(t.context, OTHER, "editorial.json"));
    const { status, output } = build(t);
    expect(output).toContain(`${OTHER}: GATE REJECTED (1); no read may cite it`);
    expect(output).toContain("a context study has no editorial.json and no protocol");
    expect(output).toContain(`the source "${OTHER}" did not pass the gate`);
    expect(status).toBe(1);
  }, 30000);
});

describe("npm run retractions covers content/context/", () => {
  const csvFor = (root: string, doi: string, nature = "Retraction") => {
    const path = join(root, "retraction_watch.csv");
    writeFileSync(path, [
      "Record ID,Title,OriginalPaperDOI,RetractionDate,RetractionNature,Reason",
      `1,A context study,${doi},11/01/2026 0:00,${nature},+Data concerns`,
    ].join("\n"));
    return path;
  };
  const sync = (t: ReturnType<typeof tree>, csv: string) =>
    run("scripts/retractions-sync.mts", ["--csv", csv, "--context", t.context, "--papers", t.papers]);

  it("withdraws a retracted context study, and the build then refuses the read that cites it", () => {
    const t = tree({ conceptReviewed: true, citeStudy: true });
    expect(build(t).status).toBe(0);

    const { status, output } = sync(t, csvFor(t.root, OTHER_DOI.toUpperCase()));
    // The number of published papers grows; the one context study is this test's own.
    expect(output).toMatch(/checked against \d+ published papers and 1 context study/);
    expect(output).toContain(`RETRACTED CONTEXT STUDY: ${OTHER} (${OTHER_DOI})`);
    expect(output).toContain("cited by: daytime-caffeine-sleep");
    expect(status).toBe(1);
    expect(JSON.parse(readFileSync(join(t.context, OTHER, "withdrawn.json"), "utf8")))
      .toEqual({ doi: OTHER_DOI, nature: "Retraction", date: "2026-11-01", reason: "+Data concerns" });

    const after = build(t);
    expect(after.output).toContain(`${OTHER}: WITHDRAWN (Retraction, 2026-11-01); no read may cite it`);
    expect(after.output).toContain(`the source "${OTHER}" has been withdrawn (Retraction, 2026-11-01); remove the citation`);
    expect(after.output).toContain("content build failed");
    expect(after.status).toBe(1);
  }, 60000);

  it("leaves a context study alone when it is not in the list, or only corrected", () => {
    const t = tree({ conceptReviewed: true, citeStudy: true });
    const clean = sync(t, csvFor(t.root, "10.5555/some-other-paper"));
    expect(clean.output).toContain("No published paper and no context study has been retracted.");
    expect(clean.status).toBe(0);
    const corrected = sync(t, csvFor(t.root, OTHER_DOI, "Correction"));
    expect(corrected.status).toBe(0);
    expect(existsSync(join(t.context, OTHER, "withdrawn.json"))).toBe(false);
  }, 60000);
});

describe("the paper command and context", () => {
  it("approve-concept refuses to run without a person at a terminal, and changes nothing", () => {
    const t = tree({ conceptReviewed: false, citeStudy: false });
    const before = readFileSync(join(t.concepts, "non-rem-sleep.json"), "utf8");
    const { status, output } = run("scripts/paper.mts", ["approve-concept", "non-rem-sleep"], { SD_CONCEPTS_DIR: t.concepts });
    expect(output).toContain("has to be run by a person in a terminal");
    expect(status).toBe(1);
    expect(readFileSync(join(t.concepts, "non-rem-sleep.json"), "utf8")).toBe(before);
  }, 30000);

  it("never drafts or publishes a context study", () => {
    const draft = run("scripts/paper.mts", ["draft", "any-study", "--role", "context"]);
    expect(draft.output).toContain("A context study never gets a draft, a protocol or a weight");
    expect(draft.status).toBe(1);
    const approve = run("scripts/paper.mts", ["approve", "any-study", "--role", "context"]);
    expect(approve.output).toContain("A context study is never published on its own");
    expect(approve.status).toBe(1);
    expect(run("scripts/paper.mts", ["extract", "any-study", "--role", "somethingelse"]).output).toContain('--role is "paper" or "context"');
  }, 30000);
});
