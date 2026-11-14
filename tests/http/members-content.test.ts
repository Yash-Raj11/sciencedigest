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

/** Every number written in a piece of text or data: "−1.86" and "-1.86" both give "1.86". */
export function numbersIn(value: unknown): Set<string> {
  return new Set(JSON.stringify(value ?? "").match(/\d+(?:\.\d+)?/g) ?? []);
}

type Fact = PaperContent["facts"][string];

/**
 * A members' read's facts, split by the owner's decision (amendment A): a fact
 * the hook cites or the card's figure draws is public; every other fact is
 * members-only. `exclusive` holds the numbers only members-only facts carry.
 */
function splitFacts(read: PaperContent, card: { hook: string; figure: unknown }) {
  const onCard = new Set(read.hook.flatMap((sentence) => sentence.refs));
  const figureText = JSON.stringify(card.figure ?? null);
  for (const id of Object.keys(read.facts)) if (figureText.includes(`"id":"${id}"`) || figureText.includes(`"ref":"${id}"`) || figureText.includes(`"fact:${id}"`)) onCard.add(id);
  const all = Object.values(read.facts);
  const open = all.filter((fact) => onCard.has(fact.id));
  const membersOnly = all.filter((fact) => !onCard.has(fact.id));
  const openNumbers = numbersIn(open);
  const exclusive = new Set([...numbersIn(membersOnly.map(({ quote, estimate }) => ({ quote, estimate })))].filter((n) => !openNumbers.has(n)));
  return { membersOnly, exclusive };
}

/** The numbers on a public card that only a members-only fact carries. Must be empty. */
export function leakedNumbers(read: PaperContent, card: { hook: string; figure: unknown }): string[] {
  const { exclusive } = splitFacts(read, card);
  return [...numbersIn(card)].filter((n) => exclusive.has(n));
}

/** How a members-only fact would look if it were shipped: its passage, and its estimate as data. */
function factNeedles(fact: Fact): string[] {
  const out: string[] = [];
  const quote = needle(fact.quote);
  if (quote) out.push(quote);
  const e = fact.estimate;
  if (e && e.ciLow !== null && e.ciHigh !== null) out.push(`"point":${e.point},"ciLow":${e.ciLow},"ciHigh":${e.ciHigh}`, `point:${e.point},ciLow:${e.ciLow},ciHigh:${e.ciHigh}`);
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

  it("puts no number of a members-only fact on the public card", () => {
    let checked = 0;
    for (const paper of papers) {
      if (!paper.card) continue;
      const read = gated.content[paper.slug];
      expect(leakedNumbers(read, paper.card), `${paper.slug}: numbers on the card that only members' facts carry`).toEqual([]);
      checked += splitFacts(read, paper.card).exclusive.size;
    }
    expect(checked, "there must be members-only numbers to look for").toBeGreaterThan(10);
  });

  it("would catch one: a members-only number written into the hook or the figure fails", () => {
    const paper = papers.find((p) => p.card)!;
    const read = gated.content[paper.slug];
    const { exclusive } = splitFacts(read, paper.card!);
    const secret = [...exclusive].sort((a, b) => b.length - a.length)[0];
    expect(leakedNumbers(read, { ...paper.card!, hook: `${paper.card!.hook} It was ${secret}.` })).toEqual([secret]);
    expect(leakedNumbers(read, { ...paper.card!, figure: { ...paper.card!.figure, params: { ...paper.card!.figure?.params, extra: { n: Number(secret), ref: "x" } } } })).toEqual([secret]);
  });

  it("ships no members-only fact in the bundle: neither its passage nor its estimate", () => {
    const needles = papers.filter((p) => p.card).flatMap((paper) => splitFacts(gated.content[paper.slug], paper.card!).membersOnly
      .flatMap((fact) => factNeedles(fact).map((n) => ({ where: `${paper.slug} fact ${fact.id}`, needle: n }))));
    expect(needles.length).toBeGreaterThan(20);
    const matches = needles.flatMap((item) => haystack.filter((file) => file.text.includes(item.needle)).map((file) => `${item.where}: "${item.needle}" in ${file.path}`));
    console.log(`members-only facts: ${needles.length} needles, ${matches.length} matches`);
    expect(matches).toEqual([]);
  });
});
