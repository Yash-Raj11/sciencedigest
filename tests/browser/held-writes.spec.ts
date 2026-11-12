/**
 * Me says how many changes the server would not take yet, why, and offers
 * "Try again". The held changes survive a reload and stay on screen.
 */

import { expect, test } from "@playwright/test";

const STORAGE_KEY = "sd-store-v1";
const HABIT = { id: "b7000000-0000-4000-a000-0000000000a1", label: "Drink 3 L of water", position: 1, retired: false, kind: "target", unit: "glasses", target: 12 };
const day = new Date().toLocaleDateString("en-CA");
const held = [
  { write: { op: "habit_add", id: HABIT.id, label: HABIT.label, position: 1, kind: "target", unit: "glasses", target: 12 }, code: "PGRST202", since: "2026-11-13T08:00:00.000Z" },
  { write: { op: "amount", stepId: HABIT.id, localDate: day, amount: 3, needed: 12 }, code: "PGRST202", since: "2026-11-13T08:00:01.000Z" },
];

test("Me shows the held changes, with the reason and Try again; a reload keeps them", async ({ page }) => {
  await page.route("https://challenges.cloudflare.com/**", (route) => route.abort("blockedbyclient"));
  await page.route("https://sd-browser-test.invalid/**", (route) => route.abort("connectionrefused"));
  await page.addInitScript(
    ([key, habit, heldWrites, today]) => {
      if (localStorage.getItem(key as string)) return;
      localStorage.setItem(key as string, JSON.stringify({
        state: { data: { equipped: [], ticks: {}, program: {}, habits: [habit], amounts: { [today as string]: { [(habit as { id: string }).id]: 3 } } }, queue: [], held: heldWrites, demoTier: "free" },
        version: 3,
      }));
    },
    [STORAGE_KEY, HABIT, held, day] as const,
  );

  await page.goto("/me");
  const notice = page.getByRole("status", { name: "Changes waiting" });
  await expect(notice).toContainText("2 changes are waiting.");
  await expect(notice).toContainText("the server is not up to date with this version of the app yet (PGRST202)");
  await expect(notice).toContainText("Nothing is lost.");
  await expect(page.getByRole("region", { name: "Account" })).not.toContainText("Everything is saved.");

  // "Try again" with the server out of reach: both changes are still there.
  await notice.getByRole("button", { name: "Try again" }).click();
  await expect(notice.getByRole("button", { name: "Try again" })).toBeEnabled();
  await expect(notice).toContainText("2 changes are waiting.");

  await page.reload();
  await expect(page.getByRole("status", { name: "Changes waiting" })).toContainText("2 changes are waiting.");
  const saved = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? "{}").state?.held ?? [], STORAGE_KEY);
  expect(saved).toEqual(held);

  // And the amount is still on Today.
  await page.goto("/");
  await expect(page.getByRole("button", { name: `Open ${HABIT.label}` })).toContainText("3 of 12 glasses");
});
