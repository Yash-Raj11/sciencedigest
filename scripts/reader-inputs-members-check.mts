/**
 * The members' simulator (HIIT figure 4B) remembers the reader's routine too. The browser tests
 * cannot open a members' read (their Supabase is fake), so this runs against a demo-mode build,
 * where the Me page's member preview unlocks it:
 *
 *   NEXT_DIST_DIR=.next-shots NEXT_PUBLIC_SUPABASE_URL= next build
 *   NEXT_DIST_DIR=.next-shots next start -p 3213 -H 127.0.0.1
 *   npx tsx scripts/reader-inputs-members-check.mts http://127.0.0.1:3213
 *
 * Prints PASS or FAIL per check and exits non-zero on a failure. Local builds only.
 */

import { chromium } from "@playwright/test";

const [base = "http://127.0.0.1:3213"] = process.argv.slice(2);
const KEY = "sd.sim.hiit-body-composition.order-flips";
let failed = 0;
const check = (ok: boolean, what: string) => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${what}`);
  if (!ok) failed++;
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.goto(`${base}/me`, { waitUntil: "networkidle" });
const member = page.getByRole("switch", { name: /Preview the app as a member/ });
if ((await member.getAttribute("aria-checked")) !== "true") await member.click();

await page.goto(`${base}/papers/hiit-body-composition`, { waitUntil: "networkidle" });
const figure = page.locator('[data-order-flips][data-mode="full"]');
await figure.locator("[data-pick]").first().waitFor();
const picks = figure.locator("[data-pick]");
const first = (await picks.nth(0).getAttribute("data-pick"))!;
const firstSetting = first.split(":")[0];
const later = (await picks.evaluateAll((els, setting) => els.map((e) => e.getAttribute("data-pick")!).filter((p) => !p.startsWith(`${setting}:`)), firstSetting))[0]!;
check((await figure.locator("[data-remembered]").count()) === 0, "untouched: no clear control");
await figure.locator(`[data-pick="${first}"]`).click();
await figure.locator(`[data-pick="${later}"]`).click();
await page.reload({ waitUntil: "networkidle" });
await figure.locator(`[data-pick="${first}"]`).waitFor();
check((await figure.locator(`[data-pick="${first}"]`).getAttribute("aria-pressed")) === "true", `reopened: ${first} still picked`);
check((await figure.locator(`[data-pick="${later}"]`).getAttribute("aria-pressed")) === "true", `reopened: ${later} still picked`);
const stored = JSON.parse((await page.evaluate((key) => localStorage.getItem(key), KEY)) ?? "null");
check(JSON.stringify(stored?.values?.picks) === JSON.stringify({ [first.split(":")[0]]: first.split(":")[1], [later.split(":")[0]]: later.split(":")[1] }), `stored under ${KEY}: ${JSON.stringify(stored)}`);

const clear = page.getByRole("button", { name: "Clear my routine" });
check((await clear.count()) === 1, "a Clear my routine control by the figure");
await clear.click();
check((await figure.locator('[data-pick][aria-pressed="true"]').count()) === 0, "cleared: no pick left");
check((await page.evaluate((key) => localStorage.getItem(key), KEY)) === null, "cleared: nothing stored");

// A pick the read no longer offers is dropped, not mapped to another option.
await page.evaluate((key) => localStorage.setItem(key, JSON.stringify({ v: 1, values: { picks: { modality: "rowing" } } })), KEY);
await page.reload({ waitUntil: "networkidle" });
await figure.locator("[data-pick]").first().waitFor();
check((await figure.locator('[data-pick][aria-pressed="true"]').count()) === 0, "a stored option the read does not offer: nothing picked");

// The feed card never shows a remembered routine (it is the glance view, with no picks at all).
await page.evaluate(([key, setting, option]) => localStorage.setItem(key, JSON.stringify({ v: 1, values: { picks: { [setting]: option } } })), [KEY, ...first.split(":")]);
await page.goto(`${base}/`, { waitUntil: "networkidle" });
check((await page.locator("[data-order-flips] [data-pick]").count()) === 0, "feed: no routine picker on any card");

await browser.close();
console.log(failed ? `${failed} failed` : "all passed");
process.exit(failed ? 1 : 0);
