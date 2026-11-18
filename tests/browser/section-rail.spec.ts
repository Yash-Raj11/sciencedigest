/**
 * The section rail (owner, 2026-11-18): one tick per section heading of a read, the section on
 * screen in orange, tap to jump, press and slide to scrub with the section's name shown.
 */

import { expect, test } from "@playwright/test";

const READ = "/papers/turmeric-pepper-breakfast";

test.describe("the section rail", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("lists the read's section headings in page order", async ({ page }) => {
    await page.goto(READ, { waitUntil: "networkidle" });
    const rail = page.getByRole("navigation", { name: "Sections of this read" });
    await expect(rail).toBeVisible();
    const ticks = await rail.getByRole("button").evaluateAll((els) => els.map((el) => el.getAttribute("aria-label")));
    const headings = await page.locator("article [data-rail]").evaluateAll((els) => els.map((el) => el.textContent?.trim()));
    expect(ticks).toEqual(headings);
    expect(ticks).toContain("Why it happens");
    expect(ticks).toContain("The receipts");
  });

  test("a tap jumps to the section and marks it as the one being read", async ({ page }) => {
    await page.goto(READ, { waitUntil: "networkidle" });
    const rail = page.getByRole("navigation", { name: "Sections of this read" });
    await rail.getByRole("button", { name: "The receipts" }).click();
    const top = await page.locator('section[aria-label="The receipts"] h2').evaluate((el) => el.getBoundingClientRect().top);
    expect(top).toBeGreaterThanOrEqual(0);
    expect(top).toBeLessThan(844 * 0.3);
    await expect(rail.getByRole("button", { name: "The receipts" })).toHaveAttribute("aria-current", "location");
    await expect(rail.locator("[aria-current]")).toHaveCount(1);
  });

  test("press and slide scrubs through the read; ticks only, no label or panel", async ({ page }) => {
    await page.goto(READ, { waitUntil: "networkidle" });
    const rail = page.getByRole("navigation", { name: "Sections of this read" });
    const box = (await rail.locator("ol").boundingBox())!;
    expect(box.y).toBeLessThan(844 * 0.1); // at the top of the screen
    const x = box.x + box.width / 2;
    await page.mouse.move(x, box.y + 4);
    await page.mouse.down();
    await page.mouse.move(x, box.y + box.height - 3, { steps: 8 });
    const last = (await page.locator("article [data-rail]").last().textContent())!.trim();
    await expect(rail.locator('[data-rail-tick="on"]')).toHaveAttribute("aria-label", last);
    expect(await rail.evaluate((el) => el.textContent?.trim() ?? "")).toBe("");
    await page.mouse.up();
    const top = await page.locator("article [data-rail]").last().evaluate((el) => el.getBoundingClientRect().top);
    expect(top).toBeLessThan(844);
  });

  test("the feed has no rail", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    await expect(page.locator("[data-section-rail]")).toHaveCount(0);
  });
});
