/**
 * Screenshots for the readability pass (owner, 2026-11-14): at 390 px, dark and light,
 * the feed card of each paper and each read (full page). Run against a local build only.
 *
 *   npx tsx scripts/readability-shots.mts <base url> [suffix]
 *
 * Output: docs/evidence/readability/feed-<slug>-<mode>.png, read-<slug>-<mode>.png
 */

import { mkdirSync } from "node:fs";
import { chromium } from "@playwright/test";

const [base, suffix = ""] = process.argv.slice(2);
if (!base) throw new Error("usage: readability-shots.mts <base url> [suffix]");
const OUT = "docs/evidence/readability";
mkdirSync(OUT, { recursive: true });
const SLUGS = ["daytime-caffeine-sleep", "steps-days-per-week", "turmeric-pepper-breakfast", "hiit-body-composition"];

const browser = await chromium.launch();
for (const scheme of ["dark", "light"] as const) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: scheme, reducedMotion: "reduce", hasTouch: true });
  await context.addInitScript((theme) => { try { localStorage.setItem("sd-theme", theme); } catch { /* private window */ } }, scheme);
  const page = await context.newPage();

  await page.goto(`${base}/`, { waitUntil: "networkidle" });
  for (const slug of SLUGS) {
    const card = page.locator(`[data-post="${slug}"]`);
    await card.scrollIntoViewIfNeeded();
    await card.screenshot({ path: `${OUT}/feed-${slug}-${scheme}${suffix}.png` });
  }
  for (const slug of SLUGS) {
    await page.goto(`${base}/papers/${slug}`, { waitUntil: "networkidle" });
    await page.screenshot({ path: `${OUT}/read-${slug}-${scheme}${suffix}.png`, fullPage: true });
  }
  await context.close();
}
await browser.close();
console.log(`saved to ${OUT}/`);
