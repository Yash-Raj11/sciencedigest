/**
 * The readability pass (owner, 2026-11-14) in a real browser, at 390 px, dark and light.
 *
 * Orange once per screen: every element painted orange (text, fill, stroke, background,
 * border, outline) must sit inside a [data-accent-slot], and a screen holds at most one slot
 * (the feed: one per card). A stray orange dot anywhere else fails.
 */

import { expect, test, type Page } from "@playwright/test";

const SCREENS = [
  "/",
  "/today",
  "/me",
  "/papers/daytime-caffeine-sleep",
  "/papers/steps-days-per-week",
  "/papers/turmeric-pepper-breakfast",
  "/papers/hiit-body-composition",
];

/** Elements painted orange that are not inside a slot, and how many slots are not inside a card. */
async function strayOrange(page: Page) {
  return page.evaluate(() => {
    const root = getComputedStyle(document.documentElement);
    const rgb = (hex: string) => {
      const h = hex.trim().replace("#", "");
      return `rgb(${parseInt(h.slice(0, 2), 16)}, ${parseInt(h.slice(2, 4), 16)}, ${parseInt(h.slice(4, 6), 16)})`;
    };
    const orange = new Set([rgb(root.getPropertyValue("--accent")), rgb(root.getPropertyValue("--accent-text"))]);
    const stray: string[] = [];
    for (const el of document.querySelectorAll<HTMLElement | SVGElement>("body *")) {
      if (el.closest("[data-accent-slot]") || el.closest(".sr-only")) continue;
      const box = el.getBoundingClientRect();
      if (box.width === 0 && box.height === 0) continue;
      const s = getComputedStyle(el);
      if (s.visibility === "hidden" || s.display === "none") continue;
      const ownText = [...el.childNodes].some((n) => n.nodeType === Node.TEXT_NODE && n.textContent!.trim());
      const painted = [
        ownText ? s.color : "",
        s.backgroundColor,
        parseFloat(s.borderTopWidth) > 0 ? s.borderTopColor : "",
        parseFloat(s.borderBottomWidth) > 0 ? s.borderBottomColor : "",
        parseFloat(s.borderLeftWidth) > 0 ? s.borderLeftColor : "",
        s.outlineStyle !== "none" && parseFloat(s.outlineWidth) > 0 ? s.outlineColor : "",
        el instanceof SVGElement ? s.fill : "",
        el instanceof SVGElement ? s.stroke : "",
      ];
      if (painted.some((c) => orange.has(c))) stray.push(`${el.tagName.toLowerCase()}.${(el.getAttribute("class") ?? "").slice(0, 60)} "${(el.textContent ?? "").trim().slice(0, 30)}"`);
    }
    const slots = [...document.querySelectorAll("[data-accent-slot]")];
    const outsideCards = slots.filter((s) => !s.closest("[data-post]")).length;
    const perCard = [...document.querySelectorAll("[data-post]")].map((c) => c.querySelectorAll("[data-accent-slot]").length);
    return { stray, outsideCards, perCard };
  });
}

for (const scheme of ["dark", "light"] as const) {
  test.describe(`orange once per screen (${scheme})`, () => {
    test.use({ colorScheme: scheme, viewport: { width: 390, height: 844 } });

    for (const path of SCREENS) {
      test(path, async ({ page }) => {
        await page.goto(path, { waitUntil: "networkidle" });
        const { stray, outsideCards, perCard } = await strayOrange(page);
        expect(stray).toEqual([]);
        expect(outsideCards).toBeLessThanOrEqual(1);
        for (const n of perCard) expect(n).toBeLessThanOrEqual(1);
      });
    }

    test("caffeine, used: the result is the only orange", async ({ page }) => {
      await page.goto("/papers/daytime-caffeine-sleep", { waitUntil: "networkidle" });
      const sim = page.locator('section[aria-label="Simulator"]');
      await sim.getByLabel("Caffeine at").fill("16:00");
      await sim.getByLabel("Bedtime").fill("23:00");
      await sim.getByLabel(/Your amount/).fill("95");
      await expect(sim.locator("[data-marker]")).toBeVisible();
      expect((await strayOrange(page)).stray).toEqual([]);
    });
  });
}

test("the check catches a stray orange dot", async ({ page }) => {
  await page.goto("/papers/daytime-caffeine-sleep", { waitUntil: "networkidle" });
  await page.evaluate(() => {
    const dot = document.createElement("span");
    dot.className = "inline-block h-2 w-2 bg-accent";
    document.querySelector("article")!.prepend(dot);
  });
  expect((await strayOrange(page)).stray).toHaveLength(1);
});
