/**
 * Reader inputs on the device only (docs/SIMULATORS.md e; owner, 2026-11-19), in a real browser at
 * phone width: what a reader types comes back on a reopened read, the clear control forgets it, an
 * unset input stays unset, junk or blocked storage never breaks a read, the feed card keeps its
 * untouched view, and no request carries an answer (the build's Supabase is
 * https://sd-browser-test.invalid, playwright.config.ts).
 */

import { expect, test, type Page, type Request } from "@playwright/test";

const CAFFEINE = "/papers/daytime-caffeine-sleep";
const KEY = "sd.sim.daytime-caffeine-sleep.decay";

const simulator = (page: Page) => page.locator('section[aria-label="Simulator"]');

async function typeEvening(page: Page, dose: string, bed: string, amount: string) {
  const sim = simulator(page);
  await sim.getByLabel("Caffeine at").fill(dose);
  await sim.getByLabel("Bedtime").fill(bed);
  await sim.getByLabel("Your amount (mg)").fill(amount);
}

async function expectNotSet(page: Page) {
  const sim = simulator(page);
  for (const field of await sim.locator('input:not([type="range"])').all()) await expect(field).toHaveValue("");
  const sliders = sim.locator('input[type="range"]');
  await expect(sliders).toHaveCount(2);
  for (const slider of await sliders.all()) {
    await expect(slider).toHaveAttribute("data-unset", "");
    await expect(slider).toHaveAttribute("aria-valuetext", "Not set");
  }
  await expect(sim.locator("[data-time-slider]").getByText("Not set")).toHaveCount(2);
  await expect(sim.locator("[data-marker]")).toHaveCount(0);
  await expect(sim.locator("[data-clear-inputs]")).toHaveCount(0);
}

test.describe("caffeine: the reader's evening comes back", () => {
  test("dose time, bedtime and amount typed, the page reloaded: all three are back, with the estimate", async ({ page }) => {
    await page.goto(CAFFEINE, { waitUntil: "networkidle" });
    await expectNotSet(page);
    const sim = simulator(page);
    await sim.getByLabel("Drag for the caffeine time").fill("960");
    await sim.getByLabel("Bedtime").fill("23:00");
    await sim.getByLabel("Your amount (mg)").fill("95");
    await expect(sim.locator("[data-estimate]")).toContainText("About 28 to 44 mg");

    await page.reload({ waitUntil: "networkidle" });
    await expect(sim.getByLabel("Caffeine at")).toHaveValue("16:00");
    await expect(sim.getByLabel("Bedtime")).toHaveValue("23:00");
    await expect(sim.getByLabel("Your amount (mg)")).toHaveValue("95");
    await expect(sim.getByLabel("Drag for the caffeine time")).toHaveAttribute("aria-valuetext", "16:00");
    await expect(sim.getByLabel("Drag for the time you go to bed")).toHaveAttribute("aria-valuetext", "23:00");
    for (const slider of await sim.locator('input[type="range"]').all()) await expect(slider).not.toHaveAttribute("data-unset");
    await expect(sim.locator("[data-estimate]")).toContainText("About 28 to 44 mg");
    await expect(sim.locator("[data-remembered]")).toContainText("Kept on this device only.");
    await expect(sim.getByRole("button", { name: "Clear my numbers" })).toBeVisible();
  });

  test("Clear my numbers: every field empty, both sliders Not set, and still so after a reload", async ({ page }) => {
    await page.goto(CAFFEINE, { waitUntil: "networkidle" });
    await typeEvening(page, "16:00", "23:00", "95");
    await page.reload({ waitUntil: "networkidle" });
    const sim = simulator(page);
    await expect(sim.getByLabel("Caffeine at")).toHaveValue("16:00");
    await sim.getByRole("button", { name: "Clear my numbers" }).click();
    await expectNotSet(page);
    await expect(sim.locator("[data-estimate]")).toContainText("Enter when you had caffeine and when you go to bed.");
    expect(await page.evaluate((key) => localStorage.getItem(key), KEY)).toBeNull();
    await page.reload({ waitUntil: "networkidle" });
    await expectNotSet(page);
  });

  test("only what was typed comes back: an empty field stays empty and its slider stays Not set", async ({ page }) => {
    await page.goto(CAFFEINE, { waitUntil: "networkidle" });
    await simulator(page).getByLabel("Bedtime").fill("22:30");
    await page.reload({ waitUntil: "networkidle" });
    const sim = simulator(page);
    await expect(sim.getByLabel("Bedtime")).toHaveValue("22:30");
    await expect(sim.getByLabel("Caffeine at")).toHaveValue("");
    await expect(sim.getByLabel("Your amount (mg)")).toHaveValue("");
    await expect(sim.getByLabel("Drag for the caffeine time")).toHaveAttribute("data-unset", "");
    await expect(sim.getByLabel("Drag for the caffeine time")).toHaveAttribute("aria-valuetext", "Not set");
    await expect(sim.locator("[data-marker]")).toHaveCount(0);
  });

  test("no request carries an answer: nothing goes to Supabase, and no URL or body holds the typed values", async ({ page }) => {
    // The read's own load makes one Supabase read (the members' teaser, once the store hydrates).
    // The test build's Supabase address does not resolve, and the client retries a failed read a
    // second and three seconds later, typing or not. Answer that one read, so it is not retried:
    // then anything to Supabase from here on came from typing.
    await page.route("**/rest/v1/paper_feature_content**", (route) => route.fulfill({ status: 200, contentType: "application/json", body: "[]" }));
    const teaser = page.waitForEvent("requestfinished", (r) => r.url().includes("paper_feature_content"));
    await page.goto(CAFFEINE, { waitUntil: "networkidle" });
    await teaser;
    const seen: Request[] = [];
    page.on("request", (request) => seen.push(request));
    await typeEvening(page, "14:15", "22:45", "137");
    await simulator(page).getByLabel("Drag for the time you go to bed").fill("1395");
    await expect(simulator(page).locator("[data-estimate]")).toContainText("mg");
    // Waiting for something not to happen: a write to the server would leave within this second.
    await page.waitForTimeout(1000);
    const whileTyping = [...seen];
    expect(whileTyping.filter((r) => r.url().includes("sd-browser-test.invalid")).map((r) => r.url()), "requests to Supabase while typing").toEqual([]);

    // The reopened page loads what it always loads (the members' teaser comes from Supabase), but no request holds an answer.
    await page.reload({ waitUntil: "networkidle" });
    await expect(simulator(page).getByLabel("Your amount (mg)")).toHaveValue("137");
    expect(seen.some((r) => r.url().includes("sd-browser-test.invalid")), "the watch sees Supabase requests when there are some").toBe(true);
    for (const request of seen) {
      const url = new URL(request.url());
      // Hashed build files are fixed at build time; a digit run in a hash is not an answer.
      if (url.pathname.startsWith("/_next/static/")) continue;
      url.searchParams.delete("_rsc");
      const sent = `${decodeURIComponent(url.pathname + url.search)} ${request.postData() ?? ""} ${JSON.stringify(request.headers())}`;
      for (const value of ["14:15", "22:45", "23:15", "137", "sd.sim."]) expect(sent, request.url()).not.toContain(value);
    }
    // Not in the device store or its sync queue either: only under its own key.
    const store = await page.evaluate(() => Object.keys(localStorage).filter((k) => !k.startsWith("sd.sim.") && k !== "sd-theme").map((k) => localStorage.getItem(k) ?? "").join(" "));
    for (const value of ["14:15", "23:15", "137"]) expect(store).not.toContain(value);
    expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), KEY)).toEqual({ v: 1, values: { dose: "14:15", bed: "23:15", amount: "137" } });
  });
});

test.describe("bad storage never breaks a read", () => {
  test("junk under the key: the read opens, every field Not set, no error on the page", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.addInitScript((key) => {
      localStorage.setItem(key, "{dose: 16:00");
      localStorage.setItem("sd.sim.steps-days-per-week.association-curve", JSON.stringify({ v: 9, values: { week: "all" } }));
    }, KEY);
    await page.goto(CAFFEINE, { waitUntil: "networkidle" });
    await expectNotSet(page);
    await page.goto("/papers/steps-days-per-week", { waitUntil: "networkidle" });
    await expect(simulator(page).locator("[data-estimate]")).toContainText("Tap the days you reach the goal");
    expect(errors).toEqual([]);
  });

  test("a stored value outside the simulator's range is dropped, not clamped: only the good field comes back", async ({ page }) => {
    await page.addInitScript((key) => {
      localStorage.setItem(key, JSON.stringify({ v: 1, values: { dose: "25:00", bed: "23:00", amount: "-5" } }));
    }, KEY);
    await page.goto(CAFFEINE, { waitUntil: "networkidle" });
    const sim = simulator(page);
    await expect(sim.getByLabel("Bedtime")).toHaveValue("23:00");
    await expect(sim.getByLabel("Caffeine at")).toHaveValue("");
    await expect(sim.getByLabel("Your amount (mg)")).toHaveValue("");
    await expect(sim.getByLabel("Drag for the caffeine time")).toHaveAttribute("aria-valuetext", "Not set");
  });

  test("storage that refuses writes: the simulator still works for this visit, without an error", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.addInitScript(() => {
      // Refuse the simulators' keys only, so the failure tested is this feature's.
      const setItem = Storage.prototype.setItem;
      Storage.prototype.setItem = function (key: string, value: string) {
        if (String(key).startsWith("sd.sim.")) throw new DOMException("refused", "QuotaExceededError");
        return setItem.call(this, key, value);
      };
    });
    await page.goto(CAFFEINE, { waitUntil: "networkidle" });
    await typeEvening(page, "16:00", "23:00", "95");
    await expect(simulator(page).locator("[data-estimate]")).toContainText("About 28 to 44 mg");
    await page.reload({ waitUntil: "networkidle" });
    await expectNotSet(page);
    expect(errors).toEqual([]);
  });
});

test.describe("each read keeps its own answers", () => {
  test("steps: the days come back on their own read, and caffeine's answers are not seen there", async ({ page }) => {
    await page.goto(CAFFEINE, { waitUntil: "networkidle" });
    await typeEvening(page, "16:00", "23:00", "95");
    await page.goto("/papers/steps-days-per-week", { waitUntil: "networkidle" });
    const sim = simulator(page);
    await expect(sim.locator("[data-remembered]")).toHaveCount(0);
    const week = sim.locator("[data-your-week] button");
    await week.nth(0).click();
    await week.nth(3).click();
    await page.reload({ waitUntil: "networkidle" });
    await expect(sim.locator("[data-figure-kind]")).toHaveAttribute("data-picked-group", "1");
    await expect(week.nth(0)).toHaveAttribute("aria-pressed", "true");
    await expect(week.nth(3)).toHaveAttribute("aria-pressed", "true");
    await sim.getByRole("button", { name: "Clear my days" }).click();
    await expect(sim.locator("[data-estimate]")).toContainText("Tap the days you reach the goal");
    // Clearing the steps read left caffeine's answers alone.
    await page.goto(CAFFEINE, { waitUntil: "networkidle" });
    await expect(simulator(page).getByLabel("Your amount (mg)")).toHaveValue("95");
  });

  test("turmeric: the switches come back in the read, while the feed card keeps the paper's own comparison", async ({ page }) => {
    await page.goto("/papers/turmeric-pepper-breakfast", { waitUntil: "networkidle" });
    const figure = page.locator('[data-first-half-hour][data-mode="full"]');
    await expect(figure).toHaveAttribute("data-meal", "pepper");
    await figure.locator('[data-switch="turmeric"]').click();
    await expect(figure).toHaveAttribute("data-meal", "turmeric");
    const meals = simulator(page);
    await meals.getByText("With both spices").click();
    await page.reload({ waitUntil: "networkidle" });
    await expect(figure).toHaveAttribute("data-meal", "turmeric");
    await expect(figure.locator('[data-switch="turmeric"]')).toHaveAttribute("aria-checked", "true");
    await expect(meals.getByRole("radio", { name: "With both spices" })).toBeChecked();
    await page.goto("/", { waitUntil: "networkidle" });
    const card = page.locator('[data-first-half-hour][data-mode="card"]');
    await expect(card).toHaveCount(1);
    await expect(card).toHaveAttribute("data-meal", "pepper");
  });
});

test.describe("Me: one line to forget every simulator's answers", () => {
  test("nothing kept, then kept, then cleared; the theme stays", async ({ page }) => {
    await page.goto("/me", { waitUntil: "networkidle" });
    const section = page.locator('section[aria-label="Your simulator numbers"]');
    await expect(section).toContainText("Kept on this device; never sent to our server.");
    await expect(section.getByRole("status")).toHaveText("Nothing kept yet.");
    await page.getByRole("button", { name: "Dark" }).click();
    await page.goto(CAFFEINE, { waitUntil: "networkidle" });
    await typeEvening(page, "16:00", "23:00", "95");
    await page.goto("/me", { waitUntil: "networkidle" });
    await section.getByRole("button", { name: "Clear my numbers" }).click();
    await expect(section.getByRole("status")).toHaveText("Cleared. Simulators open empty again.");
    expect(await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith("sd.sim.")))).toEqual([]);
    expect(await page.evaluate(() => localStorage.getItem("sd-theme"))).toBe("dark");
    await page.goto(CAFFEINE, { waitUntil: "networkidle" });
    await expectNotSet(page);
  });
});
