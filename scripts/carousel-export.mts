/**
 * Exports one deck per published paper to PNGs, 1080×1350, in every look (lib/carousel/tokens.ts
 * LOOKS), into docs/evidence/carousel/<slug>/<look>/, and its alternate openings into <look>/hooks/.
 * Every slide is checked before it is drawn (Satori rules, glyphs); a problem stops the export
 * with a non-zero exit. Nothing is posted anywhere: posting is a person's job, after /admin/queue.
 *
 *   npm run carousel:export                 every published deck
 *   npm run carousel:export -- <slug>       one deck (a draft too)
 */

import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { isPublished, loadDecks, slideFileName } from "../lib/carousel/decks";
import { altHookFileName, withHook } from "../lib/carousel/hooks";
import { renderSlide, SlideProblems } from "../lib/carousel/render";
import { LOOKS } from "../lib/carousel/tokens";

const OUT = path.join(process.cwd(), "docs", "evidence", "carousel");
const only = process.argv[2];
const decks = loadDecks().filter((d) => (only ? d.slug === only : isPublished(d.slug)));
if (decks.length === 0) { console.error(only ? `No deck "${only}".` : "No published decks."); process.exit(1); }

let failed = 0;
for (const deck of decks) {
  const dir = path.join(OUT, deck.slug);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  for (const look of LOOKS) {
    mkdirSync(path.join(dir, look), { recursive: true });
    for (let i = 0; i < deck.slides.length; i++) {
      try {
        const png = await renderSlide(deck, i, look);
        writeFileSync(path.join(dir, look, slideFileName(i, deck.slides[i].kind)), png);
      } catch (error) {
        failed++;
        console.error(error instanceof SlideProblems ? `${look}: ${error.message}` : error);
      }
    }
    // The alternate openings, beside the deck: <look>/hooks/01-hook-b.png ...
    if ((deck.altHooks ?? []).length) mkdirSync(path.join(dir, look, "hooks"), { recursive: true });
    for (const { letter } of deck.altHooks ?? []) {
      try {
        writeFileSync(path.join(dir, look, "hooks", altHookFileName(letter)), await renderSlide(withHook(deck, letter), 0, look));
      } catch (error) {
        failed++;
        console.error(error instanceof SlideProblems ? `${look} opening ${letter}: ${error.message}` : error);
      }
    }
  }
  console.log(`${deck.slug}: ${deck.slides.length} slides + ${(deck.altHooks ?? []).length} alternate openings × ${LOOKS.length} looks → ${path.relative(process.cwd(), dir)}/{${LOOKS.join(",")}}/`);
}
if (failed) { console.error(`${failed} slide(s) refused; nothing above them was skipped silently.`); process.exit(1); }
console.log(`${decks.length} deck(s), 0 missing glyphs, 0 Satori rule problems.`);
