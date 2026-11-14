/**
 * The readability pass (owner, 2026-11-14) in a real browser, at 390 px.
 *
 * The orange budget (owner, 2026-11-15): orange means "this paper's finding". Per 390 × 844
 * screen there is one focal orange item and at most three in all. An item is one element painted
 * with the finding's text colour or its pastel fill; the marks of one chart (one <svg>) or one
 * [data-signal-item] count as one item. The faint tint (--signal-evidence-soft) is a background
 * and does not count. The Life Game and habits are monochrome: no orange at all.
 */

import { expect, test, type Page } from "@playwright/test";

const THEMES = ["dark", "light", "bedtime"] as const;
const SCREENS = [
  "/",
  "/me",
  "/papers/daytime-caffeine-sleep",
  "/papers/steps-days-per-week",
  "/papers/turmeric-pepper-breakfast",
  "/papers/hiit-body-composition",
];
const BUDGET = 3;

/** The most orange items any one 844 px window of the page holds, and what they are. */
async function orangeBudget(page: Page) {
  return page.evaluate(() => {
    const root = getComputedStyle(document.documentElement);
    const rgb = (hex: string) => {
      const h = hex.trim().replace("#", "");
      return `rgb(${parseInt(h.slice(0, 2), 16)}, ${parseInt(h.slice(2, 4), 16)}, ${parseInt(h.slice(4, 6), 16)})`;
    };
    const orange = new Set([rgb(root.getPropertyValue("--signal-evidence-text")), rgb(root.getPropertyValue("--signal-evidence-fill"))]);
    const items = new Map<Element, { top: number; bottom: number; what: string }>();
    for (const el of document.querySelectorAll<HTMLElement | SVGElement>("body *")) {
      if (el.closest(".sr-only")) continue;
      const box = el.getBoundingClientRect();
      if (box.width === 0 && box.height === 0) continue;
      const s = getComputedStyle(el);
      if (s.visibility === "hidden" || s.display === "none" || s.opacity === "0") continue;
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
      if (!painted.some((c) => orange.has(c))) continue;
      const key = el.closest("[data-signal-item]") ?? el.closest("svg") ?? el;
      const k = key.getBoundingClientRect();
      const top = k.top + scrollY;
      const prev = items.get(key);
      items.set(key, {
        top: prev ? Math.min(prev.top, top) : top,
        bottom: prev ? Math.max(prev.bottom, top + k.height) : top + k.height,
        what: `${key.tagName.toLowerCase()} "${(key.textContent ?? "").trim().slice(0, 40)}"`,
      });
    }
    const all = [...items.values()];
    const height = document.documentElement.scrollHeight;
    let worst: typeof all = [];
    for (let start = 0; start < Math.max(height, 1); start += 100) {
      const inView = all.filter((i) => i.bottom > start && i.top < start + 844);
      if (inView.length > worst.length) worst = inView;
    }
    return { max: worst.length, worst: worst.map((i) => i.what), total: all.length };
  });
}

for (const theme of THEMES) {
  test.describe(`orange budget (${theme})`, () => {
    test.use({ viewport: { width: 390, height: 844 } });
    test.beforeEach(async ({ page }) => {
      await page.addInitScript((t) => localStorage.setItem("sd-theme", t), theme);
    });

    for (const path of SCREENS) {
      test(`${path}: at most ${BUDGET} orange items on any screen`, async ({ page }) => {
        await page.goto(path, { waitUntil: "networkidle" });
        await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
        const { max, worst } = await orangeBudget(page);
        expect(max, worst.join("\n")).toBeLessThanOrEqual(BUDGET);
      });
    }

    test("/today: the Life Game is monochrome, no orange at all", async ({ page }) => {
      await page.goto("/today", { waitUntil: "networkidle" });
      expect((await orangeBudget(page)).total).toBe(0);
    });

    test("the feed: one focal orange item per card", async ({ page }) => {
      await page.goto("/", { waitUntil: "networkidle" });
      const perCard = await page.locator("[data-post]").evaluateAll((cards) => cards.map((c) => c.querySelectorAll("[data-signal-focal]").length));
      expect(perCard.length).toBeGreaterThan(2);
      for (const n of perCard) expect(n).toBeLessThanOrEqual(1);
    });

    test("caffeine, used: still within the budget", async ({ page }) => {
      await page.goto("/papers/daytime-caffeine-sleep", { waitUntil: "networkidle" });
      const sim = page.locator('section[aria-label="Simulator"]');
      await sim.getByLabel("Caffeine at").fill("16:00");
      await sim.getByLabel("Bedtime").fill("23:00");
      await sim.getByLabel(/Your amount/).fill("95");
      await expect(sim.locator("[data-marker]")).toBeVisible();
      const { max, worst } = await orangeBudget(page);
      expect(max, worst.join("\n")).toBeLessThanOrEqual(BUDGET);
    });
  });
}

test("the budget check catches a fourth orange item", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/me", { waitUntil: "networkidle" });
  const before = (await orangeBudget(page)).max;
  await page.evaluate((n) => {
    for (let i = 0; i < n; i++) {
      const dot = document.createElement("span");
      dot.className = "inline-block h-2 w-2 bg-signal-evidence-fill";
      document.body.prepend(dot);
    }
  }, 4 - before);
  expect((await orangeBudget(page)).max).toBe(4);
});

test("the Life Game check catches one orange number", async ({ page }) => {
  await page.goto("/today", { waitUntil: "networkidle" });
  await page.evaluate(() => {
    const n = document.createElement("p");
    n.className = "text-signal-evidence-text";
    n.textContent = "71";
    document.body.prepend(n);
  });
  expect((await orangeBudget(page)).total).toBe(1);
});

test.describe("finding cards: plain headline, one supporting line, source line", () => {
  test("steps: the big number, what it is, the range as a bar, no CI in words", async ({ page }) => {
    await page.goto("/papers/steps-days-per-week");
    const card = page.locator("article [data-finding-card]");
    await expect(card.locator("[data-finding-number]")).toHaveText("−14.9 points");
    await expect(card.locator(".headline")).toHaveText(/^lower 10-year risk of death, compared with 0 days a week\./);
    await expect(card.locator("[data-finding-range] svg[data-band]")).toHaveAttribute("aria-label", "Range for the study average: −18.8 to −10.9 points");
    await expect(card).not.toContainText(/\bCI\b|confidence interval|significan/i);
  });

  test("caffeine: the finding as the headline, what was checked under it", async ({ page }) => {
    await page.goto("/papers/daytime-caffeine-sleep");
    const card = page.locator("article [data-finding-card]");
    await expect(card.locator(".headline")).toHaveText(/^Sleep showed no clear difference from placebo nights\./);
    await expect(card).toContainText("Total sleep, time to fall asleep and sleep stages were all checked.");
    await expect(card.locator("[data-finding-number]")).toHaveCount(0);
  });

  test("turmeric: neutral wording, and the size it does not give", async ({ page }) => {
    await page.goto("/papers/turmeric-pepper-breakfast");
    const card = page.locator("article [data-finding-card]");
    await expect(card.locator(".headline")).toHaveText(/^Blood sugar differed 30 min after the pepper meals\./);
    await expect(card).toContainText("The paper doesn't say by how much.");
  });
});

/** Text a reader sees without a tap, outside the Receipts and the members' extras. */
const PLAIN_OUTSIDE_RECEIPTS = /significan|\bp ?[<=>≤≥] ?0?\.\d|\bp-values?\b|confidence interval|\b95 ?% ?CI\b|\bCIs?\b|effect sizes?/i;

for (const slug of ["daytime-caffeine-sleep", "steps-days-per-week", "turmeric-pepper-breakfast"]) {
  test(`${slug}: no "significant", p-value, CI or effect size outside the Receipts`, async ({ page }) => {
    await page.goto(`/papers/${slug}`, { waitUntil: "networkidle" });
    const text = await page.evaluate(() => {
      const article = document.querySelector("article")!.cloneNode(true) as HTMLElement;
      article.querySelectorAll('section[aria-label="The receipts"], footer').forEach((el) => el.remove());
      return article.innerText;
    });
    expect(text.match(PLAIN_OUTSIDE_RECEIPTS)).toBeNull();
  });
}

test("the page check catches a CI in the read", async ({ page }) => {
  await page.goto("/papers/steps-days-per-week", { waitUntil: "networkidle" });
  await page.evaluate(() => { document.querySelector("article h2")!.append(" (95% CI −18.8 to −10.9)"); });
  const text = await page.evaluate(() => document.querySelector("article")!.innerText);
  expect(text.match(PLAIN_OUTSIDE_RECEIPTS)).not.toBeNull();
});

test.describe("feed card: the key idea at a glance", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("order: meta, headline, one sentence, still figure, What's inside, source line", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    const card = page.locator('[data-post="steps-days-per-week"]');
    const y = async (selector: string) => (await card.locator(selector).first().boundingBox())!.y;
    const order = [await y("p.label"), await y("[data-glance-headline]"), await y("[data-glance-support]"), await y("[data-glance]"), await y("nav"), await y("[data-source-line]")];
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  test("the still figure prints no number on any card", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    const texts = await page.locator("[data-post] [data-glance] svg text").allTextContents();
    expect(texts.length).toBeGreaterThan(0);
    expect(texts.filter((t) => /\p{N}/u.test(t))).toEqual([]);
  });

  test("the Try it row is the card's focal orange", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    for (const slug of ["daytime-caffeine-sleep", "steps-days-per-week", "turmeric-pepper-breakfast"]) {
      const slot = page.locator(`[data-post="${slug}"] [data-signal-focal]`);
      await expect(slot).toHaveCount(1);
      await expect(slot).toHaveAttribute("data-inside-row", "try");
      await expect(slot).toContainText(/^Try it: /);
    }
  });

  for (const slug of ["daytime-caffeine-sleep", "steps-days-per-week", "turmeric-pepper-breakfast", "hiit-body-composition"]) {
    test(`${slug}: each row lands on its slot`, async ({ page }) => {
      await page.goto("/", { waitUntil: "networkidle" });
      const slots = await page.locator(`[data-post="${slug}"] [data-inside-row]`).evaluateAll((rows) => rows.map((r) => r.getAttribute("data-inside-row")!));
      expect(slots.length).toBeGreaterThanOrEqual(2);
      for (const slot of slots) {
        await page.goto("/", { waitUntil: "networkidle" });
        await page.locator(`[data-post="${slug}"] [data-inside-row="${slot}"]`).click();
        await expect(page).toHaveURL(new RegExp(`/papers/${slug}#${slot}$`));
        await expect(page.locator(`#${slot}`)).toBeInViewport();
      }
    });
  }

  test("a members' read lists only the slots everyone can open", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    const rows = page.locator('[data-post="hiit-body-composition"] [data-inside-row]');
    await expect(rows).toHaveText(["Put it in your Life Game→", "How sure the evidence is→"]);
    await expect(page.locator('[data-post="hiit-body-composition"] [data-signal-focal]')).toHaveCount(0);
  });

  test("the landing check fails for a slot the read does not have", async ({ page }) => {
    await page.goto("/papers/hiit-body-composition#try", { waitUntil: "networkidle" });
    await expect(page.locator("#try")).toHaveCount(0);
  });
});
