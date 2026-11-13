/**
 * The guard on the temporary allowlist (scripts/legacy-shape.ts).
 *
 * The allowlist lets the three starter papers keep building in the old flat
 * shape until step 2E rewrites them. It must not outlive that step, and it must
 * never be used to wave a new paper through. Three rules:
 *
 *   1. It names only the three starter papers. Nothing is ever added.
 *   2. Every slug on it is a paper that is still in the old shape. Rewrite a
 *      paper and its entry has to go.
 *   3. Once 2E is ticked in docs/PROGRESS.md, the list must be empty (in 2E the
 *      file is deleted, and this test is replaced by one that fails if it comes back).
 *
 * To see rule 3 fail without touching the real file:
 *   PROGRESS_PATH=/path/to/copy.md npx vitest run scripts/legacy-shape.test.ts
 */

import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { editorialShape } from "../lib/pipeline/editorial";
import { LEGACY_SHAPE_ALLOWLIST } from "./legacy-shape";

const PROGRESS_PATH = process.env.PROGRESS_PATH ?? "docs/PROGRESS.md";
const STARTERS = ["daytime-caffeine-sleep", "hiit-body-composition", "steps-days-per-week"];

describe("the temporary old-shape allowlist", () => {
  it("names only the three starter papers", () => {
    expect(LEGACY_SHAPE_ALLOWLIST.filter((slug) => !STARTERS.includes(slug))).toEqual([]);
  });

  it("names only papers that exist and are still in the old flat shape", () => {
    const stale = LEGACY_SHAPE_ALLOWLIST.filter((slug) => {
      const path = `content/papers/${slug}/editorial.json`;
      return !existsSync(path) || editorialShape(JSON.parse(readFileSync(path, "utf8"))) !== "legacy";
    });
    expect(stale, "these papers are no longer in the old shape: remove them from scripts/legacy-shape.ts").toEqual([]);
  });

  it("is empty once step 2E is ticked in docs/PROGRESS.md", () => {
    const progress = readFileSync(PROGRESS_PATH, "utf8");
    const line = progress.split("\n").find((l) => /^- \[[ x]\] 2E\./.test(l));
    expect(line, "docs/PROGRESS.md must keep its 2E line, so this guard knows when the allowlist is due").toBeDefined();
    if (line!.startsWith("- [x]")) {
      expect(LEGACY_SHAPE_ALLOWLIST, "2E is ticked: delete scripts/legacy-shape.ts and the allowLegacyShape option").toEqual([]);
    }
  });
});
