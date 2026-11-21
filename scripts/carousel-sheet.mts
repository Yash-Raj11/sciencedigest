/**
 * Contact sheets: every published deck in one image per look, one row per deck, slides in order,
 * from the exported PNGs (run `npm run carousel:export` first). Judge a deck as a set, the way the
 * owner's carousel design was made: the rhythm of dark and light, the hierarchy from slide to slide,
 * where one slide is crowded and the next is empty. Drawn with Satori (next/og): no extra dependency.
 *
 *   npm run carousel:sheet          → docs/evidence/carousel/sheet-<look>.png (the decks)
 *                                     docs/evidence/carousel/openings-<look>.png (each deck's A, B, C, D)
 */

import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createElement as h } from "react";
import { isPublished, loadDecks, slideFileName } from "../lib/carousel/decks";
import { altHookFileName } from "../lib/carousel/hooks";
import { renderElement } from "../lib/carousel/render";
import { LOOK_NAME, LOOKS, SLIDE, SANS } from "../lib/carousel/tokens";

const OUT = path.join(process.cwd(), "docs", "evidence", "carousel");
const THUMB = { width: SLIDE.width / 4, height: SLIDE.height / 4 };
const GAP = 12;
const TITLE = 56;

const decks = loadDecks().filter((d) => isPublished(d.slug));
if (decks.length === 0) { console.error("No published decks."); process.exit(1); }

let missing = 0;
const box = (style: Record<string, string | number>, ...children: unknown[]) => h("div", { style: { display: "flex", ...style } }, ...(children as never[]));

/** One sheet: a title, then rows of PNG files (a missing one is drawn red). */
async function sheet(title: string, rows: string[][], out: string) {
  const cols = Math.max(...rows.map((r) => r.length));
  const w = GAP + cols * (THUMB.width + GAP);
  const ht = TITLE + GAP + rows.length * (THUMB.height + GAP);
  const cell = (file: string) => {
    if (!existsSync(file)) { missing++; return box({ width: THUMB.width, height: THUMB.height, marginRight: GAP, background: "#cc0000" }); }
    return h("img", { src: `data:image/png;base64,${readFileSync(file).toString("base64")}`, width: THUMB.width, height: THUMB.height, style: { marginRight: GAP } });
  };
  const tree = box(
    { flexDirection: "column", width: w, height: ht, padding: GAP, background: "#808080", fontFamily: SANS },
    box({ height: TITLE - GAP, alignItems: "center", fontSize: 28, fontWeight: 600, color: "#ffffff" }, title),
    ...rows.map((row) => box({ marginTop: GAP }, ...row.map(cell))),
  );
  writeFileSync(path.join(OUT, out), await renderElement(tree, w, ht));
  console.log(`${out}: ${rows.length} rows × up to ${cols}`);
}

for (const look of LOOKS) {
  const at = (slug: string, ...parts: string[]) => path.join(OUT, slug, look, ...parts);
  await sheet(LOOK_NAME[look], decks.map((d) => d.slides.map((s, i) => at(d.slug, slideFileName(i, s.kind)))), `sheet-${look}.png`);
  await sheet(`Openings: A, then the alternates · ${LOOK_NAME[look]}`,
    decks.map((d) => [at(d.slug, slideFileName(0, "hook")), ...(d.altHooks ?? []).map((a) => at(d.slug, "hooks", altHookFileName(a.letter)))]), `openings-${look}.png`);
}
for (const look of LOOKS) rmSync(path.join(OUT, `overview-${look}.png`), { force: true });
if (missing) { console.error(`${missing} slide PNG(s) missing (drawn red); run npm run carousel:export.`); process.exit(1); }
