/**
 * The carousel gate (Phase 11, 4B): what each published deck draws matches the gated facts, the
 * site's colours, and the exported PNGs. Exits non-zero on the first deck with a problem, after
 * printing every problem found. Run `npm run carousel:export` first.
 *
 *   npm run carousel:parity
 */

import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { isPublished, loadDecks, slideFileName } from "../lib/carousel/decks";
import { contrastProblems } from "../lib/carousel/contrast";
import { altHookFileName, withHook } from "../lib/carousel/hooks";
import { drawnText, numberProblems, tokenProblems, wordProblems } from "../lib/carousel/parity";
import { LOOKS, PALETTES } from "../lib/carousel/tokens";
import { checkSlideTree, renderSlide } from "../lib/carousel/render";
import { slideElement } from "../lib/carousel/Slide";
import { gate } from "../lib/pipeline/gate";

const ROOT = process.cwd();
const problems: string[] = [];
const sha = (b: Buffer) => createHash("sha256").update(b).digest("hex");

const css = readFileSync(path.join(ROOT, "app", "globals.css"), "utf8");
for (const { look, theme, colors, names } of PALETTES) problems.push(...tokenProblems(css, colors, theme, names).map((p) => `${look}: ${p}`));
console.log(`tokens: ${problems.length === 0 ? `the ${PALETTES.length} slide palettes match their themes in app/globals.css` : "MISMATCH"}`);
const beforeContrast = problems.length;
for (const { look, colors } of PALETTES) problems.push(...contrastProblems(colors, look));
console.log(`contrast: ${problems.length === beforeContrast ? "every look's text reaches 4.5:1 on its ground, the button label 3:1 on the orange" : "TOO LOW"}`);

const decks = loadDecks().filter((d) => isPublished(d.slug));
let slides = 0;
for (const deck of decks) {
  const dir = path.join(ROOT, "content", "papers", deck.slug);
  const result = gate(JSON.parse(readFileSync(path.join(dir, "extraction.json"), "utf8")), readFileSync(path.join(dir, "source.txt"), "utf8"));
  if (!result.ok) { problems.push(`${deck.slug}: the extraction no longer passes the gate`); continue; }
  const quotes = Object.fromEntries(Object.entries(result.validated.facts).map(([id, f]) => [id, f.quote]));
  const expected = deck.slides.map((s, i) => slideFileName(i, s.kind));
  const before = problems.length;
  // Words and numbers are the same in every look; the tree, glyphs and files are checked in each.
  for (let i = 0; i < deck.slides.length; i++) {
    const drawn = drawnText(slideElement(deck, i));
    problems.push(...numberProblems(deck, i, drawn, quotes));
    problems.push(...wordProblems(deck, i, drawn));
  }
  // Each alternate opening is checked as the deck's first slide, the way it would be posted.
  const alts = (deck.altHooks ?? []).map(({ letter }) => ({ letter, deck: withHook(deck, letter) }));
  for (const alt of alts) {
    const drawn = drawnText(slideElement(alt.deck, 0));
    problems.push(...numberProblems(alt.deck, 0, drawn, quotes).map((p) => `${p} (opening ${alt.letter})`));
    problems.push(...wordProblems(alt.deck, 0, drawn).map((p) => `${p} (opening ${alt.letter})`));
  }
  for (const look of LOOKS) {
    const out = path.join(ROOT, "docs", "evidence", "carousel", deck.slug, look);
    const present = existsSync(out) ? readdirSync(out).filter((f) => f.endsWith(".png")).sort() : [];
    if (present.join() !== expected.join()) problems.push(`${deck.slug} (${look}): ${path.relative(ROOT, out)}/ holds [${present.join(", ")}], the deck is [${expected.join(", ")}]; run npm run carousel:export`);
    for (let i = 0; i < deck.slides.length; i++) {
      problems.push(...checkSlideTree(slideElement(deck, i, look)).map((p) => `${deck.slug} slide ${i + 1} (${look}): ${p}`));
      const file = path.join(out, expected[i]);
      if (existsSync(file) && sha(readFileSync(file)) !== sha(await renderSlide(deck, i, look))) {
        problems.push(`${deck.slug} slide ${i + 1}: ${path.relative(ROOT, file)} is not the current slide; run npm run carousel:export`);
      }
      slides++;
    }
    const hooksDir = path.join(out, "hooks");
    const expectedHooks = alts.map((a) => altHookFileName(a.letter));
    const presentHooks = existsSync(hooksDir) ? readdirSync(hooksDir).filter((f) => f.endsWith(".png")).sort() : [];
    if (presentHooks.join() !== expectedHooks.join()) problems.push(`${deck.slug} (${look}): ${path.relative(ROOT, hooksDir)}/ holds [${presentHooks.join(", ")}], the deck's alternate openings are [${expectedHooks.join(", ")}]; run npm run carousel:export`);
    for (const alt of alts) {
      problems.push(...checkSlideTree(slideElement(alt.deck, 0, look)).map((p) => `${deck.slug} opening ${alt.letter} (${look}): ${p}`));
      const file = path.join(hooksDir, altHookFileName(alt.letter));
      if (existsSync(file) && sha(readFileSync(file)) !== sha(await renderSlide(alt.deck, 0, look))) {
        problems.push(`${deck.slug} opening ${alt.letter}: ${path.relative(ROOT, file)} is not the current slide; run npm run carousel:export`);
      }
      slides++;
    }
  }
  console.log(`${deck.slug}: ${deck.slides.length} slides + ${alts.length} alternate openings × ${LOOKS.length} looks, ${problems.length === before ? "ok" : `${problems.length - before} problem(s)`}`);
}

if (problems.length) {
  console.error(`\nverify-parity FAILED (${problems.length}):\n  - ${problems.join("\n  - ")}`);
  process.exit(1);
}
console.log(`\nverify-parity passed: ${decks.length} published decks, ${slides} slides across ${LOOKS.length} looks. Every drawn number is in a passage its slide cites; every deck word is drawn; tokens match; text contrast holds; PNGs are current.`);
