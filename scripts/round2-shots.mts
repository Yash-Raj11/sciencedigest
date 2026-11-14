/**
 * Screenshots for round 2 of the design review (feed first, larger hooks), at 390 px.
 *
 *   npx tsx scripts/round2-shots.mts <base url>
 *
 * It only loads pages, as a visitor who has not tapped anything.
 */

import { chromium } from "@playwright/test";

const base = process.argv[2];
if (!base) throw new Error("usage: round2-shots.mts <base url>");
const OUT = "docs/evidence/article-redesign/round2";
const SLUG = "daytime-caffeine-sleep";

const browser = await chromium.launch();
for (const scheme of ["dark", "light"] as const) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: scheme, reducedMotion: "reduce" });
  await context.addInitScript((theme) => { try { localStorage.setItem("sd-theme", theme); } catch { /* private window */ } }, scheme);
  const page = await context.newPage();
  const status = (await page.goto(base + "/", { waitUntil: "networkidle" }))!.status();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/feed-top-${scheme}.png` });
  console.log(`${OUT}/feed-top-${scheme}.png (/ answered ${status}, sideways scroll: ${await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)})`);
  if (scheme === "dark") {
    await page.locator(`[data-post="${SLUG}"]`).screenshot({ path: `${OUT}/caffeine-card.png` });
    console.log(`${OUT}/caffeine-card.png`);
    const read = (await page.goto(`${base}/papers/${SLUG}`, { waitUntil: "networkidle" }))!.status();
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${OUT}/caffeine-read.png`, fullPage: true });
    console.log(`${OUT}/caffeine-read.png (answered ${read}; simulators on the page: ${await page.locator("[data-simulator]").count()})`);
  }
  await context.close();
}
await browser.close();
