/**
 * The live site after the reader-inputs release, as a visitor who taps nothing (MASTER-PROMPT
 * amendment 2026-11-13: Playwright may load live pages, never sign in, never work around the
 * CAPTCHA). It types nothing either: it puts a returning reader's answers in this browser's
 * storage before the page loads, as their phone would hold them, then only looks.
 *
 *   npx tsx scripts/reader-inputs-live-check.mts https://sciencedigest-a4ms.vercel.app
 *
 * Prints PASS or FAIL per check; exits non-zero on a failure.
 */

import { chromium, type Request } from "@playwright/test";

const [base = "https://sciencedigest-a4ms.vercel.app"] = process.argv.slice(2);
let failed = 0;
const check = (ok: boolean, what: string) => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${what}`);
  if (!ok) failed++;
};

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
await context.addInitScript(() => {
  if (sessionStorage.getItem("seeded")) return;
  sessionStorage.setItem("seeded", "1");
  localStorage.setItem("sd.sim.daytime-caffeine-sleep.decay", JSON.stringify({ v: 1, values: { dose: "14:15", bed: "22:45", amount: "-5" } }));
});
const page = await context.newPage();
const errors: string[] = [];
const requests: Request[] = [];
page.on("pageerror", (error) => errors.push(error.message));
page.on("request", (request) => requests.push(request));

const status = (await page.goto(`${base}/papers/daytime-caffeine-sleep`, { waitUntil: "networkidle" }))?.status();
check(status === 200, `caffeine read: HTTP ${status}`);
const sim = page.locator('section[aria-label="Simulator"]');
await sim.getByLabel("Caffeine at").waitFor();
await page.waitForFunction(() => (document.querySelector<HTMLInputElement>('section[aria-label="Simulator"] input[type="time"]')?.value ?? "") !== "", null, { timeout: 10000 }).catch(() => {});
check((await sim.getByLabel("Caffeine at").inputValue()) === "14:15", "the stored caffeine time is back");
check((await sim.getByLabel("Bedtime").inputValue()) === "22:45", "the stored bedtime is back");
check((await sim.getByLabel("Your amount (mg)").inputValue()) === "", "the stored amount of -5 (out of range) is dropped, not clamped");
check((await sim.getByRole("button", { name: "Clear my numbers" }).count()) === 1, "Clear my numbers shows by the simulator");
check((await sim.locator("[data-estimate]").innerText()).includes("of it"), "the estimate is drawn from the stored times");

for (const request of requests) {
  const url = new URL(request.url());
  if (url.pathname.startsWith("/_next/static/")) continue;
  url.searchParams.delete("_rsc");
  const sent = `${decodeURIComponent(url.pathname + url.search)} ${request.postData() ?? ""}`;
  if (["14:15", "22:45", "sd.sim."].some((value) => sent.includes(value))) check(false, `a request carries an answer: ${request.url()}`);
}
check(true, `${requests.length} requests seen; none carries an answer (failures above if any)`);

await page.goto(`${base}/me`, { waitUntil: "networkidle" });
const me = page.locator('section[aria-label="Your simulator numbers"]');
check((await me.count()) === 1, "Me shows the simulator numbers card");
check((await me.getByRole("button", { name: "Clear my numbers" }).count()) === 1, "Me offers Clear my numbers while something is kept");

await page.goto(`${base}/privacy`, { waitUntil: "networkidle" });
check((await page.locator("body").innerText()).includes("What you type into a simulator, such as a caffeine time. It is never sent to our server. Clear it on Me."), "the privacy page says it");

check(errors.length === 0, `no error on any page${errors.length ? `: ${errors.join(" | ")}` : ""}`);
await browser.close();
console.log(failed ? `${failed} failed` : "all passed");
process.exit(failed ? 1 : 0);
