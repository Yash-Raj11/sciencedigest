/**
 * Every published paper's route, opened in `next dev`.
 *
 * Why the dev server, when the other browser tests use the production build:
 * Next.js checks in development that a navigation into a route can show
 * something at once, and that the route has a static shell. A page that reads
 * `params` outside <Suspense> passes `next build`, serves 200, and still puts
 * "Next.js encountered URL data during prerendering or a navigation" (and, at
 * times, "did not produce a static shell") in the dev overlay on every paper.
 * Only a real browser on a dev server shows it.
 *
 * The papers come from the generated content, so a paper is covered from the
 * moment it is published. A three-layer read must also show its receipts.
 *
 * The same server shows every figure (step 2C): each one listed in
 * lib/content/figures.ts for a published paper must be on its page, described,
 * drawn solid where measured and dashed where proposed, no wider than 360 px,
 * and still for a reader who asked for reduced motion.
 *
 * The server runs in demo mode (no Supabase address), which is the one way to
 * open the members' read without an account: the switch on the Me page.
 */

import { spawn, type ChildProcess } from "node:child_process";
import { createServer } from "node:net";
import { expect, test } from "@playwright/test";
import { freeContent, papers } from "../../lib/content";
import { EVIDENCE_KEY, FIGURE_KEYS } from "../../lib/content/figures";

const ROUTE_ERROR = /Route "\/papers\/\[slug\]"|static shell|URL data|Invariant/;

let server: ChildProcess | undefined;
let base = "";
let serverLog = "";

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const probe = createServer();
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const address = probe.address();
      probe.close(() => (typeof address === "object" && address ? resolve(address.port) : reject(new Error("no port"))));
    });
  });
}

test.beforeAll(async () => {
  test.setTimeout(120000);
  const port = await freePort();
  base = `http://127.0.0.1:${port}`;
  server = spawn("node_modules/.bin/next", ["dev", "-p", String(port), "-H", "127.0.0.1"], {
    env: {
      ...process.env,
      // Its own folder, so it never collides with a `next dev` the owner has open.
      NEXT_DIST_DIR: ".next-browser-dev",
      // Empty, so the app is in demo mode and nothing can reach a real project.
      NEXT_PUBLIC_SUPABASE_URL: "",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "",
      NEXT_PUBLIC_TURNSTILE_SITE_KEY: "",
    },
  });
  server.stdout?.on("data", (chunk) => { serverLog += String(chunk); });
  server.stderr?.on("data", (chunk) => { serverLog += String(chunk); });
  const until = Date.now() + 90000;
  while (Date.now() < until) {
    try { await fetch(`${base}/`); return; } catch { await new Promise((r) => setTimeout(r, 300)); }
  }
  throw new Error("the dev server did not start");
});

test.afterAll(() => { server?.kill(); });

for (const paper of papers) {
  test(`/papers/${paper.slug} opens in dev with no route error`, async ({ page }) => {
    test.setTimeout(120000);
    // No page.route() here, unlike the other specs: intercepting requests makes the
    // browser ask for the page in a way that skips the dev checks this test is for.
    // Nothing can reach a real service anyway: the app is in demo mode, and
    // with no Turnstile key the CAPTCHA script is never requested.
    const seen: string[] = [];
    page.on("pageerror", (error) => seen.push(error.message));
    page.on("console", (message) => { if (message.type() === "error") seen.push(message.text()); });
    const logFrom = serverLog.length;

    const response = await page.goto(`${base}/papers/${paper.slug}`, { waitUntil: "networkidle" });
    expect(response?.status()).toBe(200);
    await expect(page.locator("h1")).toHaveText(paper.title);
    await expect(page.getByRole("heading", { name: "Put it in your Life Game" })).toBeVisible();

    const read = freeContent(paper.slug);
    if (read?.layers) {
      const receipts = page.locator('section[aria-label="The receipts"]');
      await expect(receipts).toBeVisible();
      // H6: the limitation is on the page in bold without a tap.
      const limitation = receipts.locator("ul p").first();
      await expect(limitation).toBeVisible();
      expect(await limitation.evaluate((el) => getComputedStyle(el).fontWeight)).toBe("700");
    }

    // The dev checks report a moment after the page has loaded.
    await page.waitForTimeout(2500);
    expect(seen.filter((line) => ROUTE_ERROR.test(line)).map((line) => line.split("\n")[0])).toEqual([]);
    expect(serverLog.slice(logFrom).split("\n").filter((line) => ROUTE_ERROR.test(line))).toEqual([]);
  });
}

/** Opens a paper's page with its read showing; a members' read needs the demo switch first. */
async function openRead(page: import("@playwright/test").Page, paper: (typeof papers)[number]) {
  if (paper.accessTier === "premium") {
    await page.goto(`${base}/me`, { waitUntil: "networkidle" });
    const member = page.getByRole("switch", { name: /Preview the app as a member/ });
    if ((await member.getAttribute("aria-checked")) !== "true") await member.click();
    await expect(member).toHaveAttribute("aria-checked", "true");
  }
  await page.goto(`${base}/papers/${paper.slug}`, { waitUntil: "networkidle" });
  await expect(page.locator("h1")).toHaveText(paper.title);
}

for (const paper of papers) {
  const keys = FIGURE_KEYS.filter((key) => key.startsWith(`${paper.slug}/`));

  test(`/papers/${paper.slug} draws its figure${keys.length === 1 ? "" : "s"}`, async ({ page }) => {
    test.setTimeout(120000);
    expect(keys.length, "every published paper has at least one figure").toBeGreaterThan(0);
    await openRead(page, paper);

    for (const key of keys) {
      const frame = page.locator(`[data-figure-key="${key}"]`);
      await expect(frame, key).toBeVisible();
      const svg = frame.locator("svg[data-figure]");
      await expect(svg).toBeVisible();

      const seen = await svg.evaluate((el) => {
        const groups = [...el.querySelectorAll("[data-evidence]")].map((g) => ({
          kind: g.getAttribute("data-evidence"), fact: g.getAttribute("data-fact"), dashed: g.querySelector("[stroke-dasharray]") !== null,
        }));
        return {
          title: el.querySelector("title")?.textContent ?? "", desc: el.querySelector("desc")?.textContent ?? "",
          text: [...el.querySelectorAll("text")].map((t) => t.textContent ?? "").join(" | "),
          width: el.getBoundingClientRect().width, groups, arrows: el.querySelectorAll("polygon").length,
        };
      });
      // Described for a reader who cannot see it.
      expect(seen.title.trim().length, `${key} <title>`).toBeGreaterThan(3);
      expect(seen.desc.trim().split(/\s+/).length, `${key} <desc>`).toBeGreaterThan(3);
      // Drawn, with real words and real numbers in it.
      expect(seen.text.length, `${key} text`).toBeGreaterThan(10);
      expect(seen.text).not.toMatch(/undefined|NaN|null|\[object/);
      expect(seen.width, `${key} width`).toBeLessThanOrEqual(360);
      // Solid = measured, dashed = proposed, and every such element names its fact.
      expect(seen.groups.length, `${key} elements bound to facts`).toBeGreaterThan(0);
      for (const group of seen.groups) {
        expect(group.fact, `${key}: an element with no fact`).toBeTruthy();
        expect(group.dashed, `${key}: a ${group.kind} element (${group.fact})`).toBe(group.kind === "proposed");
      }
      const kinds = new Set(seen.groups.map((g) => g.kind));
      await expect(frame.locator("[data-figure-legend]"), `${key}: the key appears only when both kinds are drawn`).toHaveCount(kinds.size > 1 ? 1 : 0);
      if (kinds.size > 1) await expect(frame.locator("[data-figure-legend]")).toHaveText(EVIDENCE_KEY);
      // An observational study gets no arrow at all.
      if (!["rct", "meta_analysis_rct"].includes(paper.design)) expect(seen.arrows, `${key}: arrows in an observational figure`).toBe(0);
      // At most one entrance animation.
      const moving = await frame.evaluate((el) => [el, ...el.querySelectorAll("*")].filter((node) => getComputedStyle(node).animationName !== "none").length);
      expect(moving, `${key}: animated elements`).toBe(1);
    }
  });

  test(`/papers/${paper.slug}: its figures fit a 360 px screen and hold still under reduced motion`, async ({ page }) => {
    test.setTimeout(120000);
    await page.setViewportSize({ width: 360, height: 780 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openRead(page, paper);
    for (const key of keys) {
      const frame = page.locator(`[data-figure-key="${key}"]`);
      await expect(frame).toBeVisible();
      const box = await frame.locator("svg[data-figure]").boundingBox();
      expect(box!.x, `${key} left edge`).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width, `${key} right edge`).toBeLessThanOrEqual(360);
      const moving = await frame.evaluate((el) => [el, ...el.querySelectorAll("*")].filter((node) => getComputedStyle(node).animationName !== "none").length);
      expect(moving, `${key}: animated elements under reduced motion`).toBe(0);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), "sideways scroll").toBe(false);
  });
}
