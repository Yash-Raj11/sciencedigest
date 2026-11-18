/**
 * Screenshots of the four sketches (FIGURE-DESIGN 1A, 1B, 2B, 4A) and the two feed cards that now
 * draw a sketch's still, at 390 px in Dark and Light. Run against a demo-mode build, so the
 * members' read (HIIT) renders through the Me page's member preview:
 *   NEXT_DIST_DIR=.next-shots NEXT_PUBLIC_SUPABASE_URL= next build
 *   NEXT_DIST_DIR=.next-shots NEXT_PUBLIC_SUPABASE_URL= next start -p 3213
 *   npx tsx scripts/sketch-shots.mts http://127.0.0.1:3213
 * Output: docs/evidence/sketches/<figure>-<theme>.png
 */

import { mkdirSync } from "node:fs";
import { chromium } from "@playwright/test";

const [base = "http://127.0.0.1:3213"] = process.argv.slice(2);
const OUT = "docs/evidence/sketches";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
for (const theme of ["dark", "light"] as const) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: theme, reducedMotion: "reduce" });
  await context.addInitScript((t) => { try { localStorage.setItem("sd-theme", t); } catch { /* private window */ } }, theme);
  const page = await context.newPage();
  const hideNav = () => page.addStyleTag({ content: 'nav[aria-label="Main"] { visibility: hidden !important; }' });
  const shoot = async (selector: string, name: string) => {
    const el = page.locator(selector).first();
    await el.scrollIntoViewIfNeeded();
    await el.screenshot({ path: `${OUT}/${name}-${theme}.png` });
  };

  await page.goto(`${base}/me`, { waitUntil: "networkidle" });
  const member = page.getByRole("switch", { name: /Preview the app as a member/ });
  if ((await member.count()) && (await member.getAttribute("aria-checked")) !== "true") await member.click();

  await page.goto(`${base}/`, { waitUntil: "networkidle" });
  await hideNav();
  await shoot('[data-post="daytime-caffeine-sleep"]', "card-caffeine-1B");
  await shoot('[data-post="turmeric-pepper-breakfast"]', "card-turmeric-2B");

  await page.goto(`${base}/papers/daytime-caffeine-sleep`, { waitUntil: "networkidle" });
  await hideNav();
  await shoot('figure:has([data-figure-key$="/parking-spot"])', "caffeine-1A");
  await shoot('[data-protocol-figure]', "caffeine-1B");

  await page.goto(`${base}/papers/turmeric-pepper-breakfast`, { waitUntil: "networkidle" });
  await hideNav();
  await shoot('figure:has([data-figure-key$="/first-half-hour"])', "turmeric-2B");
  await page.locator('[data-switch="pepper"]').click();
  await page.locator('[data-switch="pepper"]').click();
  await page.locator('[data-switch="turmeric"]').click();
  await shoot('figure:has([data-figure-key$="/first-half-hour"])', "turmeric-2B-turmeric-only");
  await shoot('[data-audit-figure]', "turmeric-five-readings-in-receipts");

  await page.goto(`${base}/papers/hiit-body-composition`, { waitUntil: "networkidle" });
  await hideNav();
  await shoot('figure:has([data-figure-key$="/two-piles"])', "hiit-4A");
  await context.close();
}
await browser.close();
console.log(`saved to ${OUT}`);
