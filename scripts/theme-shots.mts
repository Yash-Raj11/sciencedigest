/**
 * Screenshots of the three themes (owner, 2026-11-15) at 390 px: the feed and one read in
 * dark, light and bedtime, plus the theme setting in Me. Run against a local build only
 * (scripts/serve-local.sh).
 *
 *   npx tsx scripts/theme-shots.mts http://127.0.0.1:3212
 *
 * Output: docs/evidence/themes/feed-<theme>.png, read-<theme>.png (full page),
 *         feed-first-screen-<theme>.png, me-appearance.png
 */

import { mkdirSync } from "node:fs";
import { chromium } from "@playwright/test";

const [base] = process.argv.slice(2);
if (!base) throw new Error("usage: theme-shots.mts <base url>");
const OUT = "docs/evidence/themes";
mkdirSync(OUT, { recursive: true });
const READ = "daytime-caffeine-sleep";

const browser = await chromium.launch();
for (const theme of ["dark", "light", "bedtime"] as const) {
  const scheme = theme === "light" ? "light" : "dark";
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: scheme, reducedMotion: "reduce", hasTouch: true });
  await context.addInitScript((t) => { try { localStorage.setItem("sd-theme", t); } catch { /* private window */ } }, theme);
  const page = await context.newPage();

  await page.goto(`${base}/`, { waitUntil: "networkidle" });
  if ((await page.locator("html").getAttribute("data-theme")) !== theme) throw new Error(`the page did not take the ${theme} theme`);
  await page.screenshot({ path: `${OUT}/feed-first-screen-${theme}.png` });
  await page.screenshot({ path: `${OUT}/feed-${theme}.png`, fullPage: true });

  await page.goto(`${base}/papers/${READ}`, { waitUntil: "networkidle" });
  await page.screenshot({ path: `${OUT}/read-${theme}.png`, fullPage: true });

  if (theme === "bedtime") {
    await page.goto(`${base}/me`, { waitUntil: "networkidle" });
    await page.locator('section[aria-label="Appearance"]').screenshot({ path: `${OUT}/me-appearance.png` });
  }
  await context.close();
}
await browser.close();
console.log(`saved to ${OUT}/`);
