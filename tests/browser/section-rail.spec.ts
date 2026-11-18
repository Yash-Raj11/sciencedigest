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

  test("ticks of sections scrolled past turn orange, and turn back on the way up", async ({ page }) => {
    await page.goto(READ, { waitUntil: "networkidle" });
    const rail = page.getByRole("navigation", { name: "Sections of this read" });
    const ticks = rail.getByRole("button");
    const n = await ticks.count();
    const marks = () => ticks.evaluateAll((els) => els.map((el) => el.getAttribute("data-rail-tick") ?? "ahead"));
    const orange = () => ticks.evaluateAll((els) => {
      const o = getComputedStyle(document.documentElement).getPropertyValue("--signal-evidence-text").trim().toLowerCase();
      const want = `rgb(${parseInt(o.slice(1, 3), 16)}, ${parseInt(o.slice(3, 5), 16)}, ${parseInt(o.slice(5, 7), 16)})`;
      return els.map((el) => getComputedStyle(el.querySelector("span")!).backgroundColor === want);
    });

    await rail.getByRole("button", { name: "The receipts" }).click();
    await expect(rail.getByRole("button", { name: "The receipts" })).toHaveAttribute("data-rail-tick", "on");
    const at = (await marks()).indexOf("on");
    expect(at).toBeGreaterThan(1);
    expect(await marks()).toEqual(Array.from({ length: n }, (_, i) => (i < at ? "passed" : i === at ? "on" : "ahead")));
    // The colour eases in, so wait for it to settle.
    await expect.poll(orange).toEqual(Array.from({ length: n }, (_, i) => i <= at));

    // At the end of the page every section has been read: every tick is orange.
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await expect.poll(orange).toEqual(Array.from({ length: n }, () => true));
    expect((await marks()).at(-1)).toBe("on");

    await page.evaluate(() => window.scrollTo(0, 0));
    await expect.poll(async () => (await orange()).filter(Boolean).length).toBeLessThanOrEqual(1);
    expect(await marks()).not.toContain("passed");
  });

  test("a last section too short to reach the reading line still fills the rail at the end of the page", async ({ page }) => {
    await page.goto(READ, { waitUntil: "networkidle" });
    const rail = page.getByRole("navigation", { name: "Sections of this read" });
    // A short last section, like the members' "Going further": the page ends before its heading
    // can scroll up to the reading line. The rail picks up headings that arrive later.
    await page.evaluate(() => {
      const h = document.createElement("h2");
      h.setAttribute("data-rail", "");
      h.textContent = "A short last section";
      document.querySelector("article")!.append(h);
    });
    await expect(rail.getByRole("button", { name: "A short last section" })).toHaveCount(1);
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    const top = await page.getByRole("heading", { name: "A short last section" }).evaluate((el) => el.getBoundingClientRect().top);
    expect(top).toBeGreaterThan(844 * 0.3); // the case this test is about
    await expect(rail.getByRole("button", { name: "A short last section" })).toHaveAttribute("data-rail-tick", "on");
    const ticks = await rail.getByRole("button").evaluateAll((els) => els.map((el) => el.getAttribute("data-rail-tick")));
    expect(ticks.slice(0, -1).every((t) => t === "passed")).toBe(true);
  });

  test("press and slide scrubs through the read; ticks only, no label or panel", async ({ page }) => {
    await page.goto(READ, { waitUntil: "networkidle" });
    const rail = page.getByRole("navigation", { name: "Sections of this read" });
    const box = (await rail.locator("ol").boundingBox())!;
    // In the middle of the right edge, where a thumb reaches it (owner, 2026-11-19).
    expect(Math.abs(box.y + box.height / 2 - 844 / 2)).toBeLessThan(844 * 0.05);
    expect(box.x + box.width).toBeGreaterThan(390 - 32);
    // The ticks themselves stay in the 16 px gutter, clear of the text.
    const left = await rail.locator("li span").evaluateAll((els) => Math.min(...els.map((el) => el.getBoundingClientRect().left)));
    expect(left).toBeGreaterThanOrEqual(390 - 16);
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
