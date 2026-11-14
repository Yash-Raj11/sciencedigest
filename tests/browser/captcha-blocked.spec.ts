/**
 * CAPTCHA must never block or slow the user.
 *
 * Cloudflare's Turnstile script is blocked (as an ad blocker or a bad network
 * would). The visitor ticks three boxes. The ticks must stay on screen and in
 * the queue, the Me tab must say "offline" (not an error), the script must not
 * be requested on page load, and no sign-in may be sent without a token.
 * After two failed invisible checks, the visible check appears once, on Me
 * only, never as a popup over Today.
 */

import { expect, test } from "@playwright/test";

const STORAGE_KEY = "sd-store-v1";
const HABITS = ["Stretch after waking", "Ten minutes outside", "Lights out by eleven"].map((label, i) => ({
  id: `b7000000-0000-4000-a000-00000000000${i + 1}`,
  label,
  position: i + 1,
  retired: false,
  kind: "check" as const,
  unit: null,
  target: null,
}));
const CHECK_TITLE = "Confirm you’re a person to back up your progress";

test("a blocked Turnstile script never blocks ticking; sync shows offline", async ({ page }) => {
  const turnstileRequests: string[] = [];
  const supabaseRequests: string[] = [];
  await page.route("https://challenges.cloudflare.com/**", (route) => {
    turnstileRequests.push(route.request().url());
    return route.abort("blockedbyclient");
  });
  await page.route("https://sd-browser-test.invalid/**", (route) => {
    supabaseRequests.push(route.request().url());
    return route.abort("connectionrefused");
  });

  // Three tick-off habits already on the device, nothing ticked, nothing queued.
  await page.addInitScript(
    ([key, habits]) => {
      if (localStorage.getItem(key as string)) return;
      localStorage.setItem(
        key as string,
        JSON.stringify({ state: { data: { equipped: [], ticks: {}, program: {}, habits, amounts: {} }, queue: [], demoTier: "free" }, version: 3 }),
      );
    },
    [STORAGE_KEY, HABITS] as const,
  );

  await page.goto("/today");
  for (const habit of HABITS) await expect(page.getByRole("checkbox", { name: habit.label })).toBeVisible();
  expect(turnstileRequests, "the CAPTCHA script must not load with the page").toEqual([]);

  // Tick all three. Each must show as done at once, whatever the CAPTCHA does.
  for (const habit of HABITS) {
    const box = page.getByRole("checkbox", { name: habit.label });
    await box.click();
    await expect(box).toHaveAttribute("aria-checked", "true");
  }

  // The first sync asks for a token (and fails); the backoff retry asks again (and fails).
  await expect.poll(() => turnstileRequests.length, { timeout: 15000 }).toBeGreaterThanOrEqual(2);

  // Still on Today: the ticks are on screen, and the person check does not pop up
  // over them. (Ticking every box opens the app's own "Today is complete"
  // moment, which is expected; close it so the boxes are in view.)
  await expect(page.getByRole("dialog", { name: CHECK_TITLE })).toHaveCount(0);
  const dayComplete = page.getByRole("dialog", { name: "Today is complete" });
  if (await dayComplete.count()) await dayComplete.getByRole("button", { name: "Close" }).click();
  for (const habit of HABITS) await expect(page.getByRole("checkbox", { name: habit.label })).toHaveAttribute("aria-checked", "true");
  await expect(page.getByRole("dialog", { name: CHECK_TITLE })).toHaveCount(0);

  // The three ticks are in the saved queue, waiting to send.
  const queue = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? "{}").state?.queue ?? [], STORAGE_KEY);
  expect(queue.filter((w: { op: string }) => w.op === "tick").map((w: { stepId: string }) => w.stepId).sort()).toEqual(HABITS.map((h) => h.id).sort());

  // No sign-in was attempted without a token.
  expect(supabaseRequests.filter((url) => url.includes("/auth/v1/signup"))).toEqual([]);

  // Me: "offline", not an error, with the three waiting; the visible check is offered here.
  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Me", exact: true }).click();
  const account = page.getByRole("region", { name: "Account" });
  await expect(account).toContainText("You are offline. Your ticks are kept here and sent when you are back.");
  await expect(account).toContainText("3 waiting to send.");
  await expect(account).not.toContainText("Could not reach the server");
  await expect(page.getByRole("dialog", { name: CHECK_TITLE })).toBeVisible();

  // Closing it is fine, and it does not come back by itself.
  await page.getByRole("dialog", { name: CHECK_TITLE }).getByRole("button", { name: "Close" }).click();
  await expect(page.getByRole("dialog", { name: CHECK_TITLE })).toHaveCount(0);
  await expect(account).toContainText("Your progress is not backed up yet.");
});
