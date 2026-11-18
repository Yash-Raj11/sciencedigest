/**
 * The readability pass (owner, 2026-11-14) in a real browser, at 390 px.
 *
 * The orange budget (owner, 2026-11-15; raised 2026-11-18): orange means "this paper's finding".
 * Per 390 × 844 screen there is one focal orange item per feed card and at most ten in all (the
 * owner asked for more orange in figures and the receipts on 2026-11-18; it was three). An item is one element painted
 * with the finding's text colour or its pastel fill; the marks of one chart (one <svg>) or one
 * [data-signal-item] count as one item. The faint tint (--signal-evidence-soft) is a background
 * and does not count. The Life Game, the companion and /today are exempt (owner, 2026-11-15,
 * second pass): they keep their original pastel-orange look, so anything inside [data-life-game]
 * is not counted, /today is not checked, and neither is Me (its controls are the Life Game's).
 * The tap-a-dot source markers are exempt too (owner, 2026-11-18): an element that itself carries
 * [data-source-dot] is not counted. Only that element: never its children or ancestors.
 * Reads, figures and feed cards keep the budget.
 */

import { expect, test, type Page } from "@playwright/test";

const THEMES = ["dark", "light", "bedtime"] as const;
const SCREENS = [
  "/",
  "/papers/daytime-caffeine-sleep",
  "/papers/steps-days-per-week",
  "/papers/turmeric-pepper-breakfast",
  "/papers/hiit-body-composition",
];
const BUDGET = 10;

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
      if (el.closest(".sr-only") || el.closest("[data-life-game]") || el.hasAttribute("data-source-dot")) continue;
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
    let at = 0;
    for (let start = 0; start < Math.max(height, 1); start += 100) {
      const inView = all.filter((i) => i.bottom > start && i.top < start + 844);
      if (inView.length > worst.length) { worst = inView; at = start; }
    }
    return { max: worst.length, worst: worst.map((i) => i.what), total: all.length, at };
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

test("the budget check catches one orange item over the budget", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/papers/daytime-caffeine-sleep", { waitUntil: "networkidle" });
  const { max: before, at } = await orangeBudget(page);
  // Put the extra items inside the most crowded screen, wherever on the page it is.
  await page.evaluate(({ n, top }) => {
    for (let i = 0; i < n; i++) {
      const dot = document.createElement("span");
      dot.className = "absolute left-0 h-2 w-2 bg-signal-evidence-fill";
      dot.style.top = `${top + 10 + i * 12}px`;
      document.body.prepend(dot);
    }
  }, { n: BUDGET + 1 - before, top: at });
  expect((await orangeBudget(page)).max).toBe(BUDGET + 1);
});

test("the Life Game exemption covers only [data-life-game]: an orange number outside it counts", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });
  const before = (await orangeBudget(page)).total;
  await page.evaluate(() => {
    const n = document.createElement("p");
    n.className = "text-signal-evidence-text";
    n.textContent = "71";
    document.body.prepend(n);
  });
  expect((await orangeBudget(page)).total).toBe(before + 1);
});

test("the source-dot exemption covers only the dot itself: an orange item inside or around it counts", async ({ page }) => {
  await page.goto("/papers/turmeric-pepper-breakfast", { waitUntil: "networkidle" });
  const before = (await orangeBudget(page)).total;
  await page.evaluate(() => {
    const wrap = document.createElement("div");
    wrap.setAttribute("data-source-dot", "");
    const n = document.createElement("p");
    n.className = "text-signal-evidence-text";
    n.textContent = "71";
    wrap.append(n);
    document.body.prepend(wrap);
  });
  expect((await orangeBudget(page)).total).toBe(before + 1);
});

test("every source dot is a small, empty, hidden mark", async ({ page }) => {
  await page.goto("/papers/turmeric-pepper-breakfast", { waitUntil: "networkidle" });
  const dots = await page.locator("[data-source-dot]").evaluateAll((els) =>
    els.map((el) => {
      const box = el.getBoundingClientRect();
      return { hidden: el.getAttribute("aria-hidden") === "true", empty: el.childNodes.length === 0, small: box.width <= 12 && box.height <= 12 };
    }),
  );
  expect(dots.length).toBeGreaterThan(3);
  for (const dot of dots) expect(dot).toEqual({ hidden: true, empty: true, small: true });
});

test.describe("finding cards: plain headline, one supporting line, source line", () => {
  test("steps: the headline states its own number (no minus with 'lower'), the range as a bar, no CI in words", async ({ page }) => {
    await page.goto("/papers/steps-days-per-week");
    const card = page.locator("article [data-finding-card]");
    await expect(card.locator("[data-finding-number]")).toHaveCount(0);
    await expect(card.locator(".headline")).toHaveText(/^People with 1–2 such days had a 14\.9-point lower 10-year risk of death than people with none\./);
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
    await expect(card.locator(".headline")).toHaveText(/^Blood sugar was lower after the pepper meals than after the plain meal\. The clear difference was at 30 minutes; across 3 hours, no clear difference\./);
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

  test("order: meta, question, finding, one sentence, still figure, What's inside, source line", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    const card = page.locator('[data-post="steps-days-per-week"]');
    const y = async (selector: string) => (await card.locator(selector).first().boundingBox())!.y;
    const order = [await y("p.label"), await y("[data-glance-question]"), await y("[data-glance-headline]"), await y("[data-glance-support]"), await y("[data-glance]"), await y("nav"), await y("[data-source-line]")];
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  // R7 (owner, 2026-11-15): steps' card draws figure 3B's still view and HIIT's figure 4B's, whose
  // printed numbers are checked in scripts/glance.test.ts (every number printed in the paper, none
  // reader-dependent, no members' fact).
  test("the still figure prints no number on any card but steps' 3B and HIIT's 4B stills", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    const texts = await page.locator('[data-post]:not([data-post="steps-days-per-week"]):not([data-post="hiit-body-composition"]) [data-glance] svg text').allTextContents();
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
