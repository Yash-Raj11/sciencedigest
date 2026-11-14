/**
 * The search-the-build check (rule 7; step 2D): nothing of a members' read is
 * in what a browser can download. It reads the members' text from
 * content/generated/gated.json and looks for every sentence in the built pages
 * and scripts (.next/static, and the prerendered .html / .rsc of every route).
 *
 * The one exception is deliberate (amendment A to step 2D): the feed card shows
 * a members' read's hook and its mechanism figure, so those are public.
 *
 * Needs a production build: `npm run build && npm run test:http`.
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { papers } from "@/lib/content";
import type { PaperContent, Sentence } from "@/lib/content/types";

const gated = JSON.parse(readFileSync("content/generated/gated.json", "utf8")) as {
  content: Record<string, PaperContent>; takeaways: Record<string, Sentence[][]>;
};

/** The longest plain stretch of a sentence: letters, spaces and commas survive any escaping a bundler applies. */
function needle(text: string): string | null {
  const runs = text.match(/[A-Za-z][A-Za-z ,]{28,}[A-Za-z]/g) ?? [];
  return runs.sort((a, b) => b.length - a.length)[0] ?? null;
}

function membersOnly(): { where: string; needle: string }[] {
  const out: { where: string; needle: string }[] = [];
  const add = (where: string, sentences: Sentence[]) => {
    for (const sentence of sentences) {
      const n = needle(sentence.text);
      if (n) out.push({ where, needle: n });
    }
  };
  for (const [slug, read] of Object.entries(gated.content)) {
    add(`${slug} population panel`, read.populationPanel);
    read.sections.forEach((section) => section.paragraphs.forEach((p) => add(`${slug} section "${section.heading}"`, p)));
    read.limitations.forEach((l) => add(`${slug} limitations`, l));
    if (read.layers) {
      const { mechanism, protocol, audit } = read.layers;
      [...mechanism.paragraphs, ...protocol.paragraphs, audit.effect, audit.weakEnd, audit.missed, ...audit.limitations, ...audit.more]
        .forEach((p) => add(`${slug} layers`, p));
    }
  }
  for (const [slug, notes] of Object.entries(gated.takeaways)) notes.forEach((p) => add(`${slug} implementation notes`, p));
  return out;
}

function publicFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = `${dir}/${entry.name}`;
    if (entry.isDirectory()) publicFiles(path, out);
    else if (dir.startsWith(".next/static") ? /\.(js|css|json|html|txt)$/.test(entry.name) : /\.(html|rsc|body)$/.test(entry.name)) out.push(path);
  }
  return out;
}

describe("the search-the-build check", () => {
  const built = existsSync(".next/BUILD_ID");
  const files = built ? [...publicFiles(".next/static"), ...publicFiles(".next/server/app")] : [];
  const haystack = files.map((path) => ({ path, text: readFileSync(path, "utf8") }));

  it("has a build to search, and members' text to search for", () => {
    expect(built, "run `npm run build` first").toBe(true);
    expect(files.length).toBeGreaterThan(10);
    expect(membersOnly().length).toBeGreaterThan(20);
  });

  it("can find a sentence that IS public (so zero matches below means something)", () => {
    const card = papers.find((p) => p.accessTier === "premium")?.card;
    const known = needle(card?.hook ?? papers[0].teaser)!;
    expect(haystack.some((file) => file.text.includes(known)), `"${known}" should be in the public build`).toBe(true);
  });

  it("finds no sentence of a members' read or of the implementation notes: zero matches", () => {
    const matches = membersOnly().flatMap((item) => haystack.filter((file) => file.text.includes(item.needle)).map((file) => `${item.where}: "${item.needle}" in ${file.path}`));
    console.log(`search-the-build: ${membersOnly().length} members-only sentences, ${files.length} public files, ${matches.length} matches`);
    expect(matches).toEqual([]);
  });

  it("makes public, of a members' read, its hook and one figure and nothing else", () => {
    for (const paper of papers) {
      if (paper.accessTier !== "premium") { expect(paper.card, paper.slug).toBeUndefined(); continue; }
      expect(Object.keys(paper.card ?? {}).sort()).toEqual(["figure", "hook"]);
      expect(paper.card?.figure?.caption ?? []).toEqual([]);
    }
  });
});
