/**
 * content-build and the old flat shape (step 2A, check 1):
 *
 *   - a PUBLISHED paper in the old shape, not on the allowlist, stops the build;
 *   - a DRAFT in the old shape is reported and not built;
 *   - the allowlisted starter papers still build (until step 2E).
 *
 * Runs the real script on a scratch folder of papers with --report-only, so
 * nothing is written and the real content is never touched.
 */

import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";

const scratch: string[] = [];
afterAll(() => { for (const dir of scratch) rmSync(dir, { recursive: true, force: true }); });

/** A scratch papers folder holding one copy of the steps paper under a new slug. */
function papersWith(slug: string, publishedAt: string | null): string {
  const root = mkdtempSync(join(tmpdir(), "sd-content-"));
  scratch.push(root);
  cpSync("content/papers/steps-days-per-week", join(root, slug), { recursive: true });
  const path = join(root, slug, "editorial.json");
  writeFileSync(path, JSON.stringify({ ...JSON.parse(readFileSync(path, "utf8")), slug, publishedAt }));
  return root;
}

function build(papers: string) {
  const run = spawnSync("node_modules/.bin/tsx", ["scripts/content-build.mts", "--papers", papers, "--report-only"], { encoding: "utf8" });
  return { status: run.status, output: `${run.stdout}${run.stderr}` };
}

describe("content-build and the old flat shape", () => {
  it("stops the build for a published paper in the old shape that is not on the allowlist", () => {
    const { status, output } = build(papersWith("a-new-paper", "2026-11-13T00:00:00Z"));
    expect(output).toContain("LINT FAILED (1)");
    expect(output).toContain("[schema] layers: this read is in the old flat shape");
    expect(output).toContain("content build failed");
    expect(status).toBe(1);
  }, 30000);

  it("reports a draft in the old shape and does not build it", () => {
    const { status, output } = build(papersWith("a-new-draft", null));
    expect(output).toContain("a-new-draft (draft, not in the app)");
    expect(output).toContain("LINT FAILED (1): reported, not built");
    expect(output).toContain("[schema] layers: this read is in the old flat shape");
    expect(output).toContain("0 papers would be built (none)");
    expect(status).toBe(0);
  }, 30000);

  it("still builds the real papers", () => {
    const { status, output } = build("content/papers");
    // Whatever is published today: the three starter papers at least, and any approved since.
    expect(output).toMatch(/\b([3-9]|\d{2,}) papers would be built \(/);
    for (const slug of ["daytime-caffeine-sleep", "hiit-body-composition", "steps-days-per-week"]) {
      expect(output).toMatch(new RegExp(`papers would be built \\([^)]*\\b${slug}\\b`));
    }
    expect(status).toBe(0);
  }, 30000);
});
