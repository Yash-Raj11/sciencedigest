/**
 * Screenshots for the design review of step 2D, at 390 px, dark and light.
 *
 *   npx tsx scripts/article-shots.mts <base url> <before|after>
 *
 * It only loads pages, as a visitor who has not tapped anything that writes;
 * the one tap ("after" only) picks a dot in the turmeric readings grid.
 */

import { chromium } from "@playwright/test";

const [base, label] = process.argv.slice(2);
if (!base || !label) throw new Error("usage: article-shots.mts <base url> <before|after>");
const OUT = "docs/evidence/article-redesign";
const READ = "/papers/turmeric-pepper-breakfast";

const browser = await chromium.launch();
for (const scheme of ["dark", "light"] as const) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: scheme, reducedMotion: "reduce" });
  await context.addInitScript((theme) => { try { localStorage.setItem("sd-theme", theme); } catch { /* private window */ } }, scheme);
  const page = await context.newPage();
  for (const [name, path] of [["feed", "/library"], ["read", READ]] as const) {
    await page.goto(base + path, { waitUntil: "networkidle" });
    await page.evaluate((theme) => document.documentElement.setAttribute("data-theme", theme), scheme);
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${OUT}/${label}-${name}-${scheme}.png`, fullPage: true });
    console.log(`${OUT}/${label}-${name}-${scheme}.png`);
  }
  if (label === "after") {
    await page.setViewportSize({ width: 390, height: 1400 }); // tall, so the tab bar does not cover the figure
    const cell = page.locator("[data-cell]").nth(6); // the pepper meal at the flagged reading
    await cell.scrollIntoViewIfNeeded();
    await cell.click();
    await page.waitForTimeout(200);
    await page.locator('[data-figure-key$="five-readings"]').screenshot({ path: `${OUT}/after-grid-selected-${scheme}.png` });
    console.log(`${OUT}/after-grid-selected-${scheme}.png`);
  }
  await context.close();
}
await browser.close();
