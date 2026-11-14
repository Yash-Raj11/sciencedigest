/**
 * Screenshots of the figures of one paper at 390 px, in Dark, Light and Bedtime, for the
 * look-then-fix pass (docs/evidence/figures-v2/). Run against a served build:
 *   npx tsx scripts/shoot-figures.mts <base url> <slug> <round>
 * A members' read needs a build in demo mode (NEXT_PUBLIC_SUPABASE_URL=""): the script turns on
 * the Me page's member preview first. Build it into .next-shots (ignored by git and the lint):
 *   NEXT_DIST_DIR=.next-shots NEXT_PUBLIC_SUPABASE_URL= next build && NEXT_DIST_DIR=.next-shots next start -p 3213
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
  await page.goto(`${base}/me`, { waitUntil: "networkidle" });
  const member = page.getByRole("switch", { name: /Preview the app as a member/ });
  if ((await member.count()) && (await member.getAttribute("aria-checked")) !== "true") await member.click();
  await page.goto(`${base}/papers/${slug}`, { waitUntil: "networkidle" });
  // The fixed tab bar would sit over a tall figure in an element screenshot.
  await page.addStyleTag({ content: "nav[aria-label=\"Main\"] { visibility: hidden !important; }" });
  const shots: [string, string][] = [
    ["audit-A", "[data-audit-figure]"],
    ["B-full", '[data-figure-kind][data-mode="full"]'],
    ["B-full", "[data-protocol-figure]"],
  ];
  // Every hand-drawn figure on the page, framed with its headline and caption.
  for (const frame of await page.locator("figure:has([data-figure-key])").all()) {
    const key = (await frame.locator("[data-figure-key]").first().getAttribute("data-figure-key"))!.split("/")[1];
    await frame.screenshot({ path: `${out}/${round}-fig-${key}-${theme}.png` });
  }
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
  // A compare-bars figure (4B): a whole routine picked (collapsed), then every outcome opened,
  // then a routine with unclear and unreported subgroups, opened.
  const picks = ["modality:cycling", "weeks:over8", "frequency:three", "work:short", "rest:short", "restType:active"];
  const shoot = (name: string) => page.locator("[data-protocol-figure]").screenshot({ path: `${out}/${round}-${name}-${theme}.png` });
  if (await page.locator("[data-pick]").count()) {
    for (const pick of picks) await page.locator(`[data-pick="${pick}"]`).click();
    await shoot("B-picked");
    for (const toggle of await page.locator("[data-toggle]").all()) await toggle.click();
    await shoot("B-open");
    for (const pick of ["modality:treadmill", "weeks:upto8", "frequency:two"]) await page.locator(`[data-pick="${pick}"]`).click();
    await shoot("B-unclear");
  }
  await page.goto(`${base}/`, { waitUntil: "networkidle" });
  const card = page.locator(`[data-post="${slug}"]`).first();
  if (await card.count()) await card.screenshot({ path: `${out}/${round}-feed-card-${theme}.png` });
  await page.close();
}
await browser.close();
console.log(`saved to ${out}`);
