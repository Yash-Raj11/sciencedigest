/**
 * Step 2D: the rebuilt read, the feed, the one interactive figure and the quiet
 * motion of toggles. A walkthrough on the production build at phone width.
 */

import { expect, test, type Page } from "@playwright/test";
import { freeContent, papers } from "../../lib/content";

const SLUG = "turmeric-pepper-breakfast";
const read = freeContent(SLUG)!;

test.beforeEach(async ({ page }) => {
  await page.route("https://sd-browser-test.invalid/**", (route) => route.abort("connectionrefused"));
  await page.route("https://challenges.cloudflare.com/**", (route) => route.abort("blockedbyclient"));
});

const top = async (page: Page, selector: string) => (await page.locator(selector).first().boundingBox())!.y;

test.describe("the feed", () => {
  test("shows every paper as a whole post, without a tap", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("[data-post]")).toHaveCount(Math.min(papers.length, 20));
    for (const paper of papers) {
      const card = page.locator(`[data-post="${paper.slug}"]`);
      const content = freeContent(paper.slug);
      const hook = content ? content.hook.map((s) => s.text).join(" ") : paper.card!.hook;
      await expect(card.getByRole("heading", { level: 2 })).toHaveText(hook);
      await expect(card.getByText(`${paper.readMinutes} min read`)).toBeVisible();
      await expect(card.locator("svg[data-figure]"), `${paper.slug}: the figure`).toBeVisible();
      await expect(card.getByText(/×/).first(), `${paper.slug}: the grade chip`).toBeVisible();
      // A card is one link: it holds no button, so the figure is in its first, untouched view.
      await expect(card.locator("button, [role=button]")).toHaveCount(0);
      if (paper.accessTier === "free") {
        await expect(card.locator("[data-pull-number] [data-source-line]")).toHaveText("From the paper");
      } else {
        // A members' read: the hook and the figure, and nothing else of it.
        await expect(card.locator("[data-pull-number]")).toHaveCount(0);
        await expect(card.getByText("Members", { exact: true })).toBeVisible();
      }
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), "sideways scroll").toBe(false);
  });

  test("a tap on a post opens the full read", async ({ page }) => {
    await page.goto("/");
    await page.locator(`[data-post="${SLUG}"] a`).click();
    await expect(page).toHaveURL(new RegExp(`/papers/${SLUG}$`));
    await expect(page.locator("article h1")).toHaveText(papers.find((p) => p.slug === SLUG)!.title);
  });
});

test.describe("the read", () => {
  test("runs in order: hook, mechanism with its figure, number, protocol, simulator, Life Game, receipts", async ({ page }) => {
    await page.goto(`/papers/${SLUG}`);
    const hook = page.getByRole("heading", { level: 2 }).first();
    await expect(hook).toContainText(read.hook[0].text);
    await expect(page.locator("[data-read-minutes]")).toContainText("min read");
    const order = [
      await top(page, "h1"),
      (await hook.boundingBox())!.y,
      await top(page, 'section[aria-label="Why it happens"]'),
      await top(page, '[data-figure-key$="/doorbell"]'),
      await top(page, "article [data-pull-number]"),
      await top(page, 'section[aria-label="What was tested"]'),
      await top(page, 'section[aria-label="Who was studied"]'),
      await top(page, 'section[aria-label="Simulator"]'),
      await top(page, 'section[aria-label="Protocol"]'),
      await top(page, 'section[aria-label="The receipts"]'),
    ];
    expect(order).toEqual([...order].sort((a, b) => a - b));
    // The figure comes after the first paragraph of the mechanism, before the second.
    const paragraphs = page.locator('section[aria-label="Why it happens"] p.read');
    expect((await paragraphs.nth(0).boundingBox())!.y).toBeLessThan(await top(page, '[data-figure-key$="/doorbell"]'));
    expect((await paragraphs.nth(1).boundingBox())!.y).toBeGreaterThan(await top(page, '[data-figure-key$="/doorbell"]'));
    // Reading type: Newsreader, line height at least 1.6.
    const type = await paragraphs.first().evaluate((el) => { const s = getComputedStyle(el); return { family: s.fontFamily, ratio: parseFloat(s.lineHeight) / parseFloat(s.fontSize) }; });
    expect(type.family).toContain("Newsreader");
    expect(type.ratio).toBeGreaterThanOrEqual(1.6);
  });

  test("the number card gives the headline result and its source line", async ({ page }) => {
    await page.goto("/papers/steps-days-per-week");
    const card = page.locator("article [data-pull-number]");
    const estimate = freeContent("steps-days-per-week")!.facts[freeContent("steps-days-per-week")!.primaryEstimate].estimate!;
    await expect(card).toContainText(String(Math.abs(estimate.point)));
    await expect(card).toContainText("An absolute difference");
    await expect(card.locator("[data-source-line]")).toHaveText("From the paper");
  });

  test("a glossary word opens the sheet with its plain text and source line", async ({ page }) => {
    await page.goto(`/papers/${SLUG}`);
    const word = page.locator("button.term").first();
    const term = (await word.textContent())!;
    const entry = read.glossary!.find((e) => e.term.toLowerCase() === term.toLowerCase())!;
    await expect(page.locator("dialog[open]")).toHaveCount(0);
    await word.click();
    const sheet = page.locator("dialog[open]");
    await expect(sheet).toBeVisible();
    await expect(sheet.getByRole("heading")).toHaveText(entry.term);
    await expect(sheet).toContainText(entry.plain);
    await expect(sheet).toContainText(entry.concept ? "Background, not from this paper" : "From the paper, word for word");
    await sheet.getByRole("button", { name: "Close" }).click();
    await expect(page.locator("dialog[open]")).toHaveCount(0);
  });

  test("every glossary entry of the read can be reached from the text", async ({ page }) => {
    await page.goto(`/papers/${SLUG}`);
    const onPage = new Set((await page.locator("button.term").allTextContents()).map((t) => t.toLowerCase()));
    for (const entry of read.glossary!) expect(onPage.has(entry.term.toLowerCase()), `"${entry.term}" is underlined somewhere`).toBe(true);
  });

  test("the limitation is bold without a tap; Full receipts holds the rest", async ({ page }) => {
    await page.goto(`/papers/${SLUG}`);
    const receipts = page.locator('section[aria-label="The receipts"]');
    await expect(receipts).toContainText("Randomized trial");
    const limitation = receipts.locator("ul p").first();
    await expect(limitation).toBeVisible();
    expect(await limitation.evaluate((el) => getComputedStyle(el).fontWeight)).toBe("700");
    const missed = receipts.getByText("What summaries leave out");
    await expect(missed).toBeHidden();
    await receipts.getByText("Full receipts").click();
    await expect(missed).toBeVisible();
    await expect(receipts.getByText("95% CI (confidence interval)")).toBeVisible();
  });
});

test.describe("the readings grid (the one interactive figure)", () => {
  const frame = '[data-figure-key$="/five-readings"]';
  const params = read.layers!.protocol.figure!.params as { times: { n: number }[]; meals: { label: string; reading: { quote: string } }[]; early: { fact: { quote: string } } };

  test("first view: nothing picked, the finding already drawn", async ({ page }) => {
    await page.goto(`/papers/${SLUG}`);
    await expect(page.locator(`${frame} [data-cell]`)).toHaveCount(params.meals.length * params.times.length);
    await expect(page.locator(`${frame} [data-selected]`)).toHaveCount(0);
    await expect(page.locator(`${frame} [data-flagged]`)).toHaveCount(2);
    await expect(page.locator(`${frame} [data-reading]`)).toHaveText("Tap a dot to read what the paper says about that reading.");
    await expect(page.locator(`${frame} [data-reading]`)).toHaveAttribute("aria-live", "polite");
  });

  test("touch at 360 px: every dot is a target of at least 44 px, and none overlap", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    await page.goto(`/papers/${SLUG}`);
    const boxes = await page.locator(`${frame} [data-cell] rect`).evaluateAll((rects) => rects.map((r) => { const b = r.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height }; }));
    expect(boxes.length).toBe(20);
    for (const box of boxes) {
      expect(box.w, "target width").toBeGreaterThanOrEqual(44);
      expect(box.h, "target height").toBeGreaterThanOrEqual(44);
    }
    for (const a of boxes) for (const b of boxes) {
      if (a === b) continue;
      const overlap = a.x < b.x + b.w - 0.5 && b.x < a.x + a.w - 0.5 && a.y < b.y + b.h - 0.5 && b.y < a.y + a.h - 0.5;
      expect(overlap, "two targets overlap").toBe(false);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), "sideways scroll").toBe(false);
  });

  test("a tap shows that reading's passage, word for word, with its source line", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    await page.goto(`/papers/${SLUG}`);
    const live = page.locator(`${frame} [data-reading]`);
    // Row 1 (pepper), second reading: the flagged one.
    const flagged = page.locator(`${frame} [data-cell]`).nth(params.times.length + 1);
    await flagged.tap();
    await expect(flagged).toHaveAttribute("aria-pressed", "true");
    await expect(live).toContainText(params.early.fact.quote);
    await expect(live.locator("[data-source-line]")).toHaveText("From the paper, word for word");
    await expect(live).toContainText("differed from the plain meal");
    // A reading with no result behind it quotes the paper on the readings, not the result.
    const plain = page.locator(`${frame} [data-cell]`).first();
    await plain.tap();
    await expect(live).toContainText(params.meals[0].reading.quote);
    await expect(live).not.toContainText(params.early.fact.quote);
    await expect(page.locator(`${frame} [data-selected]`)).toHaveCount(1);
    // Solid stays solid in every state: no dashed stroke appears.
    await expect(page.locator(`${frame} svg [stroke-dasharray]`)).toHaveCount(0);
  });

  test("keyboard: Tab reaches each dot, and each state is announced", async ({ page }) => {
    await page.goto(`/papers/${SLUG}`);
    const cells = page.locator(`${frame} [data-cell]`);
    const live = page.locator(`${frame} [data-reading]`);
    await cells.first().focus();
    await expect(cells.first()).toHaveAttribute("aria-pressed", "true");
    await expect(cells.first()).toHaveAttribute("aria-label", `${params.meals[0].label} meal, ${params.times[0].n} min`);
    await expect(live).toContainText(`${params.meals[0].label} meal, ${params.times[0].n} min`);
    await page.keyboard.press("Tab");
    await expect(cells.nth(1)).toBeFocused();
    await expect(live).toContainText(`${params.meals[0].label} meal, ${params.times[1].n} min`);
    for (let i = 0; i < params.times.length; i++) await page.keyboard.press("Tab");
    await page.keyboard.press("Enter");
    await expect(cells.nth(params.times.length + 1)).toHaveAttribute("aria-pressed", "true");
    await expect(live).toContainText(params.early.fact.quote);
  });
});

test.describe("quiet motion for toggles", () => {
  const motionOf = (page: Page, selector: string) => page.locator(selector).first().evaluate((el) => {
    const s = getComputedStyle(el);
    return { name: s.animationName, ms: parseFloat(s.animationDuration) * 1000, loops: s.animationIterationCount };
  });
  const CHOSEN = 'section[aria-label="Simulator"] label:has(> input:checked)';

  test("a picked option, the sheet and Full receipts settle once, in 120 to 180 ms", async ({ page }) => {
    await page.goto(`/papers/${SLUG}`);
    await page.locator('section[aria-label="Simulator"] label').nth(1).click();
    for (const selector of [CHOSEN]) {
      const motion = await motionOf(page, selector);
      expect(motion.name).toBe("ui-settle");
      expect(motion.ms).toBeGreaterThanOrEqual(120);
      expect(motion.ms).toBeLessThanOrEqual(180);
      expect(motion.loops).toBe("1");
    }
    await page.locator('section[aria-label="The receipts"]').getByText("Full receipts").click();
    const reveal = await motionOf(page, 'section[aria-label="The receipts"] details > .ui-reveal');
    expect(reveal.name).toBe("ui-reveal");
    expect(reveal.ms).toBeGreaterThanOrEqual(120);
    expect(reveal.ms).toBeLessThanOrEqual(180);
    await page.locator("button.term").first().click();
    const sheet = await motionOf(page, "dialog[open]");
    expect(sheet.name).toBe("sheet-up");
    expect(sheet.ms).toBeGreaterThanOrEqual(120);
    expect(sheet.ms).toBeLessThanOrEqual(180);
    // Transform and opacity only: nothing on the page moved sideways or changed the layout width.
    expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
  });

  test("under reduced motion every one of them changes at once, and nothing in a figure moves", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`/papers/${SLUG}`);
    await page.locator('section[aria-label="Simulator"] label').nth(1).click();
    expect((await motionOf(page, CHOSEN)).name).toBe("none");
    await page.locator('section[aria-label="The receipts"]').getByText("Full receipts").click();
    expect((await motionOf(page, 'section[aria-label="The receipts"] details > .ui-reveal')).name).toBe("none");
    await page.locator('[data-figure-key$="/five-readings"] [data-cell]').first().click();
    const moving = await page.locator("[data-figure-key]").evaluateAll((frames) => frames.flatMap((f) => [f, ...f.querySelectorAll("*")]).filter((n) => getComputedStyle(n).animationName !== "none").length);
    expect(moving).toBe(0);
    await page.locator("button.term").first().click();
    expect((await motionOf(page, "dialog[open]")).name).toBe("none");
  });
});

test.describe("feed first", () => {
  test("the home page is the feed, with the Life Game slot on top; /library moved there for good", async ({ page, request }) => {
    const moved = await request.get("/library", { maxRedirects: 0 });
    expect(moved.status()).toBe(308);
    expect(moved.headers().location).toBe("/");

    await page.goto("/");
    const slot = page.locator("[data-feed-slot]");
    await expect(slot).toContainText("Life Game");
    await expect(slot.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0");
    await expect(slot.locator("svg").first()).toBeVisible();
    expect((await slot.boundingBox())!.y).toBeLessThan((await page.locator("[data-post]").first().boundingBox())!.y);
    // The cat is whole: its box is square and inside the slot.
    const cat = (await slot.locator("svg").first().boundingBox())!;
    expect(Math.abs(cat.width - cat.height)).toBeLessThan(1);
    await slot.click();
    await expect(page).toHaveURL(/\/today$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Life Game");
    await expect(page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Life Game" })).toHaveAttribute("aria-current", "page");
  });

  test("the slot counts today's steps", async ({ page }) => {
    // Two tick-off habits already on the device, nothing ticked.
    await page.addInitScript(() => {
      if (localStorage.getItem("sd-store-v1")) return;
      const habits = ["Stretch after waking", "Ten minutes outside"].map((label, i) => ({
        id: `b7000000-0000-4000-a000-00000000000${i + 1}`, label, position: i + 1, retired: false, kind: "check", unit: null, target: null,
      }));
      localStorage.setItem("sd-store-v1", JSON.stringify({ state: { data: { equipped: [], ticks: {}, program: {}, habits, amounts: {} }, queue: [], demoTier: "free" }, version: 3 }));
    });
    await page.goto("/");
    await expect(page.locator("[data-slot-steps]")).toHaveText("0 of 2 steps today");
    await page.goto("/today");
    await page.getByRole("checkbox").first().check();
    await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Feed" }).click();
    await expect(page.locator("[data-slot-steps]")).toContainText(/^1 of \d+ steps today$/);
  });

  test("Start on: Feed is the default; Life Game opens /today once, and the Feed tab still works", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator("[data-post]").first()).toBeVisible();

    await page.goto("/me");
    const group = page.getByRole("group", { name: "Start on" });
    await expect(group.getByRole("button", { name: "Feed" })).toHaveAttribute("aria-pressed", "true");
    await group.getByRole("button", { name: "Life Game" }).click();
    await expect(group.getByRole("button", { name: "Life Game" })).toHaveAttribute("aria-pressed", "true");

    // A new visit (a new tab has its own session) opens on the tracker.
    const fresh = await page.context().newPage();
    await fresh.route("https://sd-browser-test.invalid/**", (route) => route.abort("connectionrefused"));
    await fresh.goto("/");
    await expect(fresh).toHaveURL(/\/today$/);
    await expect(fresh.getByRole("heading", { level: 1 })).toHaveText("Life Game");
    await fresh.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Feed" }).click();
    await expect(fresh).toHaveURL(/\/$/);
    await expect(fresh.locator("[data-post]").first()).toBeVisible();

    // Back to Feed: the next visit opens on the feed again.
    await fresh.goto("/me");
    await fresh.getByRole("group", { name: "Start on" }).getByRole("button", { name: "Feed" }).click();
    const again = await page.context().newPage();
    await again.goto("/");
    await expect(again).toHaveURL(/\/$/);
    await expect(again.locator("[data-post]").first()).toBeVisible();
  });
});
