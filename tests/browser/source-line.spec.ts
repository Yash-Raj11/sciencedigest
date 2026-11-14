/**
 * H7 (amended), and the readability pass (owner, 2026-11-14): the page says where a passage
 * comes from as who · design · how many or how long, and grades it in words with a 3-bar
 * meter. Tapping the meter opens one plain sentence on why. No screen shows a weight.
 */

import { expect, test } from "@playwright/test";

const CAFFEINE_LINE = "Twenty healthy young men · randomized crossover trial · 10 days per condition";

test.beforeEach(async ({ page }) => {
  await page.route("https://sd-browser-test.invalid/**", (route) => route.abort("connectionrefused"));
  await page.route("https://challenges.cloudflare.com/**", (route) => route.abort("blockedbyclient"));
});

test("tapping a dot shows the passage with its source line", async ({ page }) => {
  await page.goto("/papers/daytime-caffeine-sleep");
  const dot = page.getByRole("button", { name: "Show the passage in the paper this sentence rests on" }).first();
  await expect(page.locator("aside[data-shown]")).toHaveCount(0);
  await dot.click();
  await expect(dot).toHaveAttribute("aria-expanded", "true");
  const passage = page.locator("aside[data-shown]");
  await expect(passage).toBeVisible();
  await expect(passage.locator("[data-source-line]").first()).toHaveText(CAFFEINE_LINE);
  // The hook's first cited sentence rests on the dosing schedule; the quote is the paper's own words.
  await expect(passage).toContainText("45 min, 255 min, and 475 min after awakening");
  await dot.click();
  await expect(page.locator("aside[data-shown]")).toHaveCount(0);
});

test("each read's finding card names who, the design and how long", async ({ page }) => {
  for (const [slug, line] of [
    ["daytime-caffeine-sleep", CAFFEINE_LINE],
    ["steps-days-per-week", "3,101 US adults · observational cohort · followed for 10 years"],
    ["turmeric-pepper-breakfast", "20 healthy adults · randomized crossover trial · four breakfasts each"],
  ]) {
    await page.goto(`/papers/${slug}`);
    await expect(page.locator("article [data-finding-card] [data-source-line]")).toHaveText(line);
  }
});

test("the grade is words and a meter; a tap says why; the sentence matches the design", async ({ page }) => {
  await page.goto("/papers/daytime-caffeine-sleep");
  const chip = page.locator("article [data-finding-card]").getByRole("button", { name: /Early evidence/ });
  await expect(chip.locator("[data-bar]")).toHaveCount(3);
  await expect(chip.locator("[data-bar][data-filled]")).toHaveCount(1);
  await expect(page.locator("[data-grade-why]")).toHaveCount(0);
  await chip.click();
  await expect(chip).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator("article [data-finding-card] [data-grade-why]")).toHaveText(
    "People were assigned at random, but only 20 took part, so a bigger trial could change the picture.",
  );
  await page.goto("/papers/steps-days-per-week");
  await page.locator("article [data-finding-card]").getByRole("button", { name: /Early evidence/ }).click();
  await expect(page.locator("article [data-finding-card] [data-grade-why]")).toContainText("watched people without assigning anything");
});

test("no screen shows an evidence weight", async ({ page }) => {
  for (const path of ["/", "/today", "/me", "/papers/daytime-caffeine-sleep", "/papers/steps-days-per-week", "/papers/turmeric-pepper-breakfast", "/papers/hiit-body-composition"]) {
    await page.goto(path, { waitUntil: "networkidle" });
    expect(await page.locator("body").innerText(), path).not.toMatch(/×\s?[01](?:\.\d)?\b|\bweight earned\b/);
  }
});

test("the Life Game shows weights only inside the tap-to-open explainer, with a worked sum", async ({ page }) => {
  await page.goto("/today", { waitUntil: "networkidle" });
  await expect(page.locator("[data-scoring-explainer]")).toHaveCount(0);
  await page.getByRole("button", { name: "How scoring works" }).click();
  const explainer = page.locator("[data-scoring-explainer]");
  await expect(explainer).toContainText("strong evidence counts ×1.0");
  await expect(explainer).toContainText("early evidence counts ×0.4");
  await expect(explainer.locator("[data-worked-sum]")).toContainText("1.0 of 1.4 = 71%");
  // Outside the explainer the page still shows no weight.
  const outside = await page.evaluate(() => {
    const body = document.body.cloneNode(true) as HTMLElement;
    body.querySelector("[data-scoring-explainer]")?.remove();
    return body.innerText;
  });
  expect(outside).not.toMatch(/×\s?[01](?:\.\d)?\b/);
});
