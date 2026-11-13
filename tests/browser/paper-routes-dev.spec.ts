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
 */

import { spawn, type ChildProcess } from "node:child_process";
import { createServer } from "node:net";
import { expect, test } from "@playwright/test";
import { freeContent, papers } from "../../lib/content";

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
      NEXT_PUBLIC_SUPABASE_URL: "https://sd-browser-test.invalid",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "browser-test-key",
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
    // Nothing can reach a real service anyway: the Supabase address does not
    // resolve, and with no Turnstile key the CAPTCHA script is never requested.
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
