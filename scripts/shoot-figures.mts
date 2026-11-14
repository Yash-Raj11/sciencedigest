/**
 * Screenshots of the figures of one paper at 390 px, in Dark, Light and Bedtime, for the
 * look-then-fix pass (docs/evidence/figures-v2/). Run against a served build:
 *   npx tsx scripts/shoot-figures.mts <base url> <slug> <round>
 */
import { mkdirSync } from "node:fs";
import { chromium } from "@playwright/test";

const [base = "http://127.0.0.1:3212", slug = "steps-days-per-week", round = "r1"] = process.argv.slice(2);
const out = `docs/evidence/figures-v2/${slug}`;
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
for (const theme of ["dark", "light", "bedtime"]) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await page.addInitScript((t) => localStorage.setItem("sd-theme", t), theme);
  await page.goto(`${base}/papers/${slug}`, { waitUntil: "networkidle" });
  const shots: [string, string][] = [
    ["audit-A", "[data-audit-figure]"],
    ["B-full", '[data-figure-kind][data-mode="full"]'],
  ];
  for (const [name, sel] of shots) {
    const el = page.locator(sel).first();
    if (await el.count()) await el.screenshot({ path: `${out}/${round}-${name}-${theme}.png` });
  }
  // The reader's pick: two days.
  const week = page.locator("[data-your-week] button");
  if (await week.count()) {
    await week.nth(0).click(); await week.nth(2).click();
    await page.locator('[data-figure-kind][data-mode="full"]').first().screenshot({ path: `${out}/${round}-B-picked-${theme}.png` });
  }
  await page.goto(`${base}/`, { waitUntil: "networkidle" });
  const card = page.locator(`[data-post="${slug}"]`).first();
  if (await card.count()) await card.screenshot({ path: `${out}/${round}-feed-card-${theme}.png` });
  await page.close();
}
await browser.close();
console.log(`saved to ${out}`);
