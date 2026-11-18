/**
 * Personal simulators (docs/SIMULATORS.md) in a real browser, at phone width.
 */

import { expect, test } from "@playwright/test";

test.describe("caffeine: the decay simulator", () => {
  test("first view: the curve and the half-life band, empty fields, no presets, no estimate", async ({ page }) => {
    await page.goto("/papers/daytime-caffeine-sleep");
    const sim = page.locator('section[aria-label="Simulator"]');
    await expect(sim.locator('[data-figure-kind="decay"]')).toBeVisible();
    await expect(sim.locator("[data-half-gone]")).toHaveText("Half of it is gone 3.94 to 6.36 h after you take it.");
    await expect(sim.locator(`[data-figure-kind="decay"] [data-band]`)).toHaveCount(1);
    for (const field of await sim.locator('input:not([type="range"])').all()) await expect(field).toHaveValue("");
    // The time sliders' thumbs rest mid-range, but nothing is chosen until the reader moves them.
    const sliders = sim.locator('input[type="range"]');
    await expect(sliders).toHaveCount(2);
    for (const slider of await sliders.all()) {
      await expect(slider).toHaveAttribute("data-unset", "");
      await expect(slider).toHaveAttribute("aria-valuetext", "Not set");
    }
    await expect(sim.getByRole("button")).toHaveCount(await sim.getByRole("button", { name: /Show the passage/ }).count());
    await expect(sim.locator("[data-marker]")).toHaveCount(0);
  });

  test("the two time sliders set the caffeine time and the bedtime, and the estimate follows", async ({ page }) => {
    await page.goto("/papers/daytime-caffeine-sleep", { waitUntil: "networkidle" });
    const sim = page.locator('section[aria-label="Simulator"]');
    // 23:00 is where the thumb rests, so moving there changes nothing: go past it, then back.
    await sim.getByLabel("Drag for the time you go to bed").fill("1500");
    await expect(sim.getByLabel("Bedtime")).toHaveValue("01:00");
    await sim.getByLabel("Drag for the time you go to bed").fill("1380");
    await expect(sim.getByLabel("Bedtime")).toHaveValue("23:00");
    await sim.getByLabel("Drag for the caffeine time").fill("960");
    await expect(sim.getByLabel("Caffeine at")).toHaveValue("16:00");
    for (const slider of await sim.locator('input[type="range"]').all()) await expect(slider).not.toHaveAttribute("data-unset");
    await expect(sim.locator("[data-estimate]")).toContainText("About 29% to 47% of it");
  });

  test("the worked example: 95 mg at 4 pm, bed at 11 pm, about 28 to 44 mg, with its labels and the paper's finding", async ({ page }) => {
    // Typed only once the page has hydrated: before that, React would drop the answers.
    await page.goto("/papers/daytime-caffeine-sleep", { waitUntil: "networkidle" });
    const sim = page.locator('section[aria-label="Simulator"]');
    await sim.getByLabel("Caffeine at").fill("16:00");
    await sim.getByLabel("Bedtime").fill("23:00");
    await expect(sim.locator("[data-estimate]")).toContainText("About 29% to 47% of it");
    await sim.getByLabel("Your amount (mg)").fill("95");
    await expect(sim.locator("[data-estimate]")).toContainText("About 28 to 44 mg");
    await expect(sim.locator("[data-estimate]")).toContainText("That is 29% to 47% of your 95 mg, 7 h after you had it.");
    await expect(sim.locator("[data-marker]")).toContainText("28 to 44 mg");
    await expect(sim.locator("[data-estimate-label]")).toHaveText("Estimate from the study's numbers, not medical advice.");
    await expect(sim.locator("[data-spread-label]")).toContainText("3.94 h to 6.36 h, the typical spread between people in this study");
    await expect(sim.locator("[data-source-line]")).toContainText("From another study: Wildgrube et al.");
    await expect(sim.locator("[data-beside]")).toContainText("Their measured sleep did not differ from their placebo nights.");
    await expect(sim.locator("[data-beside-source]")).toHaveText("Twenty healthy young men · randomized crossover trial · 10 days per condition");
  });

  test("the half-life study is listed in Full receipts", async ({ page }) => {
    await page.goto("/papers/daytime-caffeine-sleep");
    const receipts = page.locator('section[aria-label="The receipts"]');
    await receipts.getByText("Full receipts").click();
    await expect(receipts).toContainText("doi:10.1016/j.ijpx.2025.100442");
  });
});

test.describe("steps: the association-curve simulator (FIGURE-DESIGN 3B)", () => {
  test("a week of two days: that group's grid at full strength, the raw shares with counts, the adjusted difference, who straight under", async ({ page }) => {
    await page.goto("/papers/steps-days-per-week", { waitUntil: "networkidle" });
    const sim = page.locator('section[aria-label="Simulator"]');
    await expect(sim.locator("[data-estimate]")).toContainText("Tap the days you reach the goal");
    await expect(sim.locator("[data-adjusted-strip] [data-band]")).toHaveCount(2);
    const week = sim.locator("[data-your-week] button");
    await week.nth(0).click();
    await week.nth(3).click();
    await expect(sim.locator("[data-figure-kind]")).toHaveAttribute("data-picked-group", "1");
    await expect(sim.locator('[data-group="1"][data-picked]')).toContainText("your group");
    await expect(sim.locator("[data-raw]")).toHaveText("In the 1–2 days group, 14.1% died within 10 years (75 of 532), against 40.7% in the 0 days group (257 of 632). Raw.");
    await expect(sim.locator("[data-adjusted]")).toHaveText("Adjusted difference: 14.9 fewer deaths per 100 (10.9 to 18.8).");
    await expect(sim.locator("[data-spread-label]")).toHaveText("Range for the study average.");
    // Only the reader's group keeps the pastel band; the other goes to an outline.
    await expect(sim.locator('[data-adjusted-strip] [data-emphasis="signal"]')).toHaveCount(1);
    const result = sim.locator("[data-estimate]");
    await expect(result).toContainText("not a prediction for you");
    await expect(result).not.toContainText(/your risk/i);
    const who = sim.locator("[data-who]");
    await expect(who).toContainText("3,101 US adults");
    await expect(who).toContainText("Average age in the 1–2 days group: 51.5 years.");
    const order = await sim.evaluate((el) => el.querySelector("[data-estimate]")!.nextElementSibling?.hasAttribute("data-who") ?? false);
    expect(order).toBe(true);
  });

  test("No days: the comparison group, no adjusted number, both bands outlined", async ({ page }) => {
    await page.goto("/papers/steps-days-per-week", { waitUntil: "networkidle" });
    const sim = page.locator('section[aria-label="Simulator"]');
    await sim.getByRole("button", { name: "No days" }).click();
    await expect(sim.locator("[data-raw]")).toContainText("This is the group the others were compared with.");
    await expect(sim.locator("[data-adjusted]")).toHaveCount(0);
    await expect(sim.locator("[data-adjusted-strip]")).toContainText("Compared with your group");
    await expect(sim.locator('[data-adjusted-strip] [data-emphasis="signal"]')).toHaveCount(0);
  });
});

test.describe("steps: figure 3A sits at the top of the receipts (R3)", () => {
  test("three columns with the printed ages; the mechanism section draws no figure", async ({ page }) => {
    await page.goto("/papers/steps-days-per-week", { waitUntil: "networkidle" });
    const receipts = page.locator('section[aria-label="The receipts"]');
    const a = receipts.locator("[data-audit-figure]");
    await expect(a).toBeVisible();
    await expect(receipts).toContainText("Why the raw gap is so wide");
    for (const age of ["63.7", "51.5", "46"]) await expect(a.locator("svg")).toContainText(age);
    // Descriptive facts drawn as measured, and labelled so (owner, 2026-11-15).
    await expect(a.locator('svg [data-evidence="measured"][data-fact="ages"]')).toHaveCount(3);
    await expect(a.locator('svg [data-evidence="measured"][data-fact="mobility"]')).toHaveCount(3);
    await expect(a.locator("svg")).toContainText("Measured at the start");
    await expect(page.locator("#why [data-figure-key]")).toHaveCount(0);
  });
});
