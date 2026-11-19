/**
 * Step 2E: the temporary old-shape allowlist is gone, and it must not come back.
 *
 *   1. scripts/legacy-shape.ts (the allowlist) does not exist, and no source file names it,
 *      the allowLegacyShape option or the LegacyEditorial schema.
 *   2. Every read in content/papers/ is in the three-layer shape.
 *   3. The lint refuses an old-shape read for every slug, the three starter papers included.
 *   4. The draft stage refuses a fake old-shape model reply (and a mixed one) before saving it,
 *      and the draft prompt asks for the layers, not sections.
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { FIGURE_KEYS } from "../lib/content/figures";
import { MIXED_SHAPE_MESSAGE, OLD_SHAPE_MESSAGE, draftReplyProblem, editorialShape } from "../lib/pipeline/editorial";
import { gate } from "../lib/pipeline/gate";
import { lint } from "../lib/pipeline/lint";
import { EDITORIAL_SYSTEM } from "../lib/pipeline/prompts";

const PAPERS = "content/papers";
const slugs = readdirSync(PAPERS).filter((s) => existsSync(`${PAPERS}/${s}/editorial.json`));
const read = (slug: string) => JSON.parse(readFileSync(`${PAPERS}/${slug}/editorial.json`, "utf8"));

/** What a model copying the pre-2E example would return: the read's text in sections. */
function oldShape(editorial: Record<string, unknown>): Record<string, unknown> {
  const { layers, ...rest } = editorial as { layers: { mechanism: { paragraphs: string[] }; audit: { weakEnd: string; missed: string; limitations: string[] } }; glossary?: unknown };
  delete rest.glossary;
  return {
    ...rest,
    sections: [
      { id: "found", heading: "What they found", paragraphs: layers.mechanism.paragraphs },
      { id: "lower-bound", heading: "How sure is that?", paragraphs: [layers.audit.weakEnd] },
      { id: "missed", heading: "What most summaries miss", paragraphs: [layers.audit.missed] },
    ],
    limitations: layers.audit.limitations,
  };
}

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(`${dir}/${e.name}`) : [`${dir}/${e.name}`]));
}

describe("the old flat shape after step 2E", () => {
  it("has no allowlist file and no source file that names it", () => {
    expect(existsSync("scripts/legacy-shape.ts")).toBe(false);
    const sources = [...walk("lib"), ...walk("scripts"), ...walk("components")]
      .filter((f) => /\.(ts|tsx|mts)$/.test(f) && f !== "scripts/legacy-shape.test.ts" && !f.endsWith("generated.ts"));
    const naming = sources.filter((f) => /LEGACY_SHAPE_ALLOWLIST|allowLegacyShape|LegacyEditorial|legacy-shape"/.test(readFileSync(f, "utf8")));
    expect(naming).toEqual([]);
  });

  it.each(slugs)("%s is in the three-layer shape", (slug) => {
    expect(editorialShape(read(slug))).toBe("layered");
  });

  it.each(["daytime-caffeine-sleep", "hiit-body-composition", "steps-days-per-week"])("the lint refuses %s in the old shape", (slug) => {
    const gated = gate(JSON.parse(readFileSync(`${PAPERS}/${slug}/extraction.json`, "utf8")), readFileSync(`${PAPERS}/${slug}/source.txt`, "utf8"));
    expect(gated.ok).toBe(true);
    if (!gated.ok) return;
    const report = lint(gated.validated, oldShape(read(slug)), "", { figures: FIGURE_KEYS });
    expect(report.errors.map((e) => e.message)).toEqual([OLD_SHAPE_MESSAGE]);
  });

  it("the draft stage refuses a fake old-shape model reply, and a mixed one", () => {
    const reply = { ...read("steps-days-per-week"), publishedAt: null };
    expect(draftReplyProblem(reply)).toBeNull();
    expect(draftReplyProblem(oldShape(reply))).toBe(OLD_SHAPE_MESSAGE);
    expect(draftReplyProblem({ ...reply, sections: (oldShape(reply) as { sections: unknown }).sections })).toBe(MIXED_SHAPE_MESSAGE);
  });

  it("the draft prompt asks for the three layers and the glossary, never sections", () => {
    for (const word of ['"layers"', '"mechanism"', '"protocol"', '"audit"', '"glossary"', "H9", "H10", "H11", "[<study>/<fact_id>]"]) {
      expect(EDITORIAL_SYSTEM).toContain(word);
    }
    expect(EDITORIAL_SYSTEM).not.toMatch(/section with id|"lower-bound"/);
  });
});
