/**
 * Screenshots for "reader inputs stored on the device only" (2026-11-19), at 390 px in Dark and
 * Light. The same steps run on the build before the change and after it, so the pair shows what
 * changed: a reader types into the caffeine and steps simulators, reloads, and looks again; then
 * the Me screen. After the change there is also the cleared view.
 * Run against a local build only (scripts/serve-local.sh); it types into simulators and never ticks.
 *
 *   npx tsx scripts/reader-input-shots.mts http://127.0.0.1:3212 before
 *   npx tsx scripts/reader-input-shots.mts http://127.0.0.1:3212 after
 *
 * Output: docs/evidence/reader-inputs/<when>-<what>-<theme>.png
 */

import { mkdirSync } from "node:fs";
import { chromium } from "@playwright/test";

const [base, when] = process.argv.slice(2);
if (!base || (when !== "before" && when !== "after")) throw new Error("usage: reader-input-shots.mts <base url> before|after");
const OUT = "docs/evidence/reader-inputs";
mkdirSync(OUT, { recursive: true });
const shot = (what: string, theme: string) => `${OUT}/${when}-${what}-${theme}.png`;

const browser = await chromium.launch();
for (const theme of ["dark", "light"] as const) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: theme, reducedMotion: "reduce", hasTouch: true });
  await context.addInitScript((t) => { try { localStorage.setItem("sd-theme", t); } catch { /* private window */ } }, theme);
  const page = await context.newPage();

  // Caffeine: type, reload, look again.
  await page.goto(`${base}/papers/daytime-caffeine-sleep`, { waitUntil: "networkidle" });
  if ((await page.locator("html").getAttribute("data-theme")) !== theme) throw new Error(`the page did not take the ${theme} theme`);
  let sim = page.locator('section[aria-label="Simulator"]');
  await sim.getByLabel("Caffeine at").fill("16:00");
  await sim.getByLabel("Bedtime").fill("23:00");
  await sim.getByLabel("Your amount (mg)").fill("95");
  await sim.locator("[data-marker]").waitFor();
  await sim.locator("[data-simulator]").screenshot({ path: shot("caffeine-typed", theme) });
  await page.reload({ waitUntil: "networkidle" });
  sim = page.locator('section[aria-label="Simulator"]');
  await sim.locator("[data-simulator]").screenshot({ path: shot("caffeine-reopened", theme) });
  const clear = sim.getByRole("button", { name: "Clear my numbers" });
  if (await clear.count()) {
    await clear.click();
    await sim.locator('input[type="range"][data-unset]').first().waitFor();
    await sim.locator("[data-simulator]").screenshot({ path: shot("caffeine-cleared", theme) });
  }

  // Steps: tap two days, reload, look again.
  await page.goto(`${base}/papers/steps-days-per-week`, { waitUntil: "networkidle" });
  let week = page.locator('section[aria-label="Simulator"] [data-your-week] button');
  await week.nth(0).click();
  await week.nth(3).click();
  await page.reload({ waitUntil: "networkidle" });
  week = page.locator('section[aria-label="Simulator"] [data-your-week] button');
  await page.locator('section[aria-label="Simulator"] fieldset[data-simulator]').screenshot({ path: shot("steps-reopened", theme) });

  // Me: the device settings, where the new line sits.
  await page.goto(`${base}/me`, { waitUntil: "networkidle" });
  const top = page.locator('section[aria-label="Appearance"]');
  const box = await top.boundingBox();
  const end = page.locator('section[aria-label="Your companion"]');
  const endBox = await end.boundingBox();
  if (!box || !endBox) throw new Error("the Me screen did not show its settings");
  await page.screenshot({ path: shot("me", theme), fullPage: true, clip: { x: 0, y: Math.max(0, box.y - 16), width: 390, height: endBox.y - box.y + 16 } });

  await context.close();
}
await browser.close();
console.log(`saved to ${OUT}/${when}-*.png`);
