/**
 * /privacy: reachable from Me and from the bottom of Membership, readable in
 * dark and in light, and it links Cloudflare's Turnstile Privacy Addendum.
 */

import { expect, test } from "@playwright/test";

const ADDENDUM = "https://www.cloudflare.com/turnstile-privacy-policy/";

/** WCAG contrast of the body text against the page, read from the live styles. */
async function contrast(page: import("@playwright/test").Page): Promise<number> {
  return page.evaluate(() => {
    const rgb = (value: string) => {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 1;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = value;
      ctx.fillRect(0, 0, 1, 1);
      return [...ctx.getImageData(0, 0, 1, 1).data].slice(0, 3);
    };
    const luminance = (c: number[]) => {
      const [r, g, b] = c.map((v) => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; });
      return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
    };
    const item = document.querySelector("section li")!;
    const a = luminance(rgb(getComputedStyle(item).color));
    const b = luminance(rgb(getComputedStyle(item.closest("section")!).backgroundColor));
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  });
}

test.beforeEach(async ({ page }) => {
  await page.route("https://sd-browser-test.invalid/**", (route) => route.abort("connectionrefused"));
  await page.route("https://challenges.cloudflare.com/**", (route) => route.abort("blockedbyclient"));
});

for (const theme of ["dark", "light"] as const) {
  test(`the privacy page renders in ${theme}`, async ({ page }) => {
    await page.addInitScript((t) => localStorage.setItem("sd-theme", t), theme);
    const response = await page.goto("/privacy");
    expect(response?.status()).toBe(200);
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    await expect(page.getByRole("heading", { level: 1, name: "Privacy" })).toBeVisible();
    for (const name of ["On this device", "On our server", "Visit counts", "Bot check at sign-in"]) {
      await expect(page.getByRole("region", { name })).toBeVisible();
    }
    await expect(page.getByRole("link", { name: "Turnstile Privacy Addendum" })).toHaveAttribute("href", ADDENDUM);
    await expect(page.getByRole("region", { name: "Your IP address" })).toContainText("see your IP address");
    await expect(page.getByRole("region", { name: "Your choices" }).getByRole("link")).toHaveAttribute("href", /^mailto:.+@.+/);
    expect(await contrast(page)).toBeGreaterThanOrEqual(4.5);
    // Nothing wider than the screen.
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: `test-results/privacy-${theme}.png`, fullPage: true });
  });
}

test("Me and Membership both link to the privacy page", async ({ page }) => {
  await page.goto("/me");
  await page.getByRole("region", { name: "Account" }).getByRole("link", { name: "What we keep about you" }).click();
  await expect(page).toHaveURL(/\/privacy$/);

  await page.goto("/upgrade");
  await page.getByRole("link", { name: "Privacy", exact: true }).click();
  await expect(page).toHaveURL(/\/privacy$/);
  await expect(page.getByRole("heading", { level: 1, name: "Privacy" })).toBeVisible();
});
