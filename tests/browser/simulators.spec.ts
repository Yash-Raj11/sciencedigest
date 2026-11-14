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
    await expect(sim.locator("[data-band]")).toHaveCount(1);
    for (const field of await sim.locator("input").all()) await expect(field).toHaveValue("");
    await expect(sim.getByRole("button")).toHaveCount(await sim.getByRole("button", { name: /Show the passage/ }).count());
    await expect(sim.locator("[data-marker]")).toHaveCount(0);
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
    await expect(sim.locator("[data-beside]")).toContainText("From the paper.");
  });

  test("the half-life study is listed in Full receipts", async ({ page }) => {
    await page.goto("/papers/daytime-caffeine-sleep");
    const receipts = page.locator('section[aria-label="The receipts"]');
    await receipts.getByText("Full receipts").click();
    await expect(receipts).toContainText("doi:10.1016/j.ijpx.2025.100442");
  });
});
