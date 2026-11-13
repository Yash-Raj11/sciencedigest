/**
 * H7 (amended): the page says where a passage comes from. Tapping the dot after
 * a sentence opens the passage, headed by its source line. Every read today
 * rests on its own paper only, so the line is "From the paper".
 */

import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("https://sd-browser-test.invalid/**", (route) => route.abort("connectionrefused"));
  await page.route("https://challenges.cloudflare.com/**", (route) => route.abort("blockedbyclient"));
});

test("tapping a dot shows the passage with its source line", async ({ page }) => {
  await page.goto("/papers/daytime-caffeine-sleep");
  const dot = page.getByRole("button", { name: "Show the passage in the paper this sentence rests on" }).first();
  await expect(page.getByText("From the paper, word for word")).toHaveCount(0);
  await dot.click();
  await expect(dot).toHaveAttribute("aria-expanded", "true");
  const passage = page.locator("aside").filter({ hasText: "From the paper, word for word" });
  await expect(passage).toBeVisible();
  // The hook's first cited sentence rests on the dosing schedule; the quote is the paper's own words.
  await expect(passage).toContainText("45 min, 255 min, and 475 min after awakening");
  await dot.click();
  await expect(page.getByText("From the paper, word for word")).toHaveCount(0);
});
