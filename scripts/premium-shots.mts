/**
 * Screenshots of the 2026-11-18 pass (owner): the premium palette, the receipts card, the orange
 * source dots and the caffeine time slider, at 390 px in dark and light. Run against a local
 * build only (scripts/serve-local.sh).
 *
 *   npx tsx scripts/premium-shots.mts http://127.0.0.1:3212
 *
 * Output: docs/evidence/premium/<what>-<theme>.png
 */

import { mkdirSync } from "node:fs";
import { chromium } from "@playwright/test";

const [base] = process.argv.slice(2);
if (!base) throw new Error("usage: premium-shots.mts <base url>");
const OUT = "docs/evidence/premium";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
for (const theme of ["dark", "light"] as const) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: theme, reducedMotion: "reduce", hasTouch: true });
  await context.addInitScript((t) => { try { localStorage.setItem("sd-theme", t); } catch { /* private window */ } }, theme);
  const page = await context.newPage();

  await page.goto(`${base}/`, { waitUntil: "networkidle" });
  if ((await page.locator("html").getAttribute("data-theme")) !== theme) throw new Error(`the page did not take the ${theme} theme`);
  await page.screenshot({ path: `${OUT}/feed-${theme}.png` });

  await page.goto(`${base}/papers/turmeric-pepper-breakfast`, { waitUntil: "networkidle" });
  await page.locator('[aria-label="Who was studied"]').scrollIntoViewIfNeeded();
  await page.locator('[aria-label="Who was studied"]').screenshot({ path: `${OUT}/who-was-tested-${theme}.png` });
  await page.locator('section[aria-label="The receipts"]').screenshot({ path: `${OUT}/receipts-${theme}.png` });

  await page.goto(`${base}/papers/daytime-caffeine-sleep`, { waitUntil: "networkidle" });
  const sim = page.locator('section[aria-label="Simulator"]');
  await sim.screenshot({ path: `${OUT}/caffeine-slider-unset-${theme}.png` });
  await sim.getByLabel("Bedtime").fill("23:00");
  await sim.getByLabel("Drag to set the time").fill("960");
  await sim.getByLabel("Your amount (mg)").fill("95");
  await sim.locator("[data-marker]").waitFor();
  await sim.screenshot({ path: `${OUT}/caffeine-slider-used-${theme}.png` });
  await context.close();
}
await browser.close();
console.log(`saved to ${OUT}`);
