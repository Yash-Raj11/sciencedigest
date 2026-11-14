/**
 * Screenshots of one read's simulator, dark and light, at 390 px: as first seen, and "used"
 * (the reader's answers typed in). Also measures the design bar at 390 and 360 px: the smallest
 * label, the smallest touch target, how much of the column the chart fills, sideways scroll.
 *
 *   npx tsx scripts/simulator-shots.mts <base url> <kind> <slug> [suffix]
 *
 * Run against a local build only (it types into the simulator; it never ticks anything).
 * Output: docs/evidence/simulators/<kind>-{dark,light}[suffix].png and <kind>-used-{dark,light}[suffix].png
 */

import { mkdirSync } from "node:fs";
import { chromium, type Page } from "@playwright/test";

const [base, kind, slug, suffix = ""] = process.argv.slice(2);
if (!base || !kind || !slug) throw new Error("usage: simulator-shots.mts <base url> <kind> <slug> [suffix]");
const OUT = "docs/evidence/simulators";
mkdirSync(OUT, { recursive: true });

/** What a reader types, per kind. */
const USE: Record<string, (page: Page) => Promise<void>> = {
  decay: async (page) => {
    const section = page.locator('section[aria-label="Simulator"]');
    await section.getByLabel("Caffeine at").fill("16:00");
    await section.getByLabel("Bedtime").fill("23:00");
    await section.getByLabel(/Your amount/).fill("95");
  },
  "association-curve": async (page) => {
    await page.locator('section[aria-label="Simulator"]').getByRole("radio", { name: /^2\b/ }).check();
  },
};

async function measure(page: Page) {
  return page.evaluate(() => {
    const section = document.querySelector('section[aria-label="Simulator"]')!;
    const column = section.getBoundingClientRect().width;
    const svg = section.querySelector<SVGSVGElement>("svg[data-figure]");
    const chart = svg ? svg.getBoundingClientRect().width : 0;
    // The smallest text: HTML text by its computed size, SVG text by its drawn height.
    let smallest = Infinity;
    let smallestText = "";
    for (const el of section.querySelectorAll("p, span, label, legend, h3, dt, dd, li, text, tspan, button")) {
      if (!el.textContent?.trim() || el.closest(".sr-only")) continue;
      const own = [...el.childNodes].some((n) => n.nodeType === Node.TEXT_NODE && n.textContent!.trim());
      if (!own) continue;
      const size = el instanceof SVGElement && svg
        ? parseFloat(getComputedStyle(el).fontSize) * (svg.getBoundingClientRect().width / svg.viewBox.baseVal.width)
        : parseFloat(getComputedStyle(el).fontSize);
      if (size < smallest) { smallest = size; smallestText = el.textContent.trim().slice(0, 40); }
    }
    let target = Infinity;
    let targetName = "";
    for (const el of section.querySelectorAll("input, button, select, summary, label:has(input[type=radio])")) {
      const box = el.getBoundingClientRect();
      if (box.width === 0) continue;
      // A touch area widened by an invisible ::after (the source dots) counts at its full size.
      const after = getComputedStyle(el, "::after");
      const grow = after.position === "absolute" ? -2 * parseFloat(after.top || "0") : 0;
      const size = Math.min(box.width, box.height) + (Number.isFinite(grow) ? grow : 0);
      if (size < target) { target = size; targetName = (el.getAttribute("aria-label") ?? el.textContent ?? el.tagName).trim().slice(0, 30); }
    }
    return {
      smallestLabelPx: Math.round(smallest * 10) / 10, smallestText,
      smallestTargetPx: Math.round(target), targetName,
      chartFillsColumn: column ? Math.round((chart / column) * 100) + "%" : "n/a",
      sidewaysScroll: document.documentElement.scrollWidth > window.innerWidth,
    };
  });
}

const browser = await chromium.launch();
for (const width of [390, 360]) {
  for (const scheme of ["dark", "light"] as const) {
    const context = await browser.newContext({ viewport: { width, height: 844 }, deviceScaleFactor: 2, colorScheme: scheme, reducedMotion: "reduce", hasTouch: true });
    await context.addInitScript((theme) => { try { localStorage.setItem("sd-theme", theme); } catch { /* private window */ } }, scheme);
    const page = await context.newPage();
    const status = (await page.goto(`${base}/papers/${slug}`, { waitUntil: "networkidle" }))!.status();
    const section = page.locator('section[aria-label="Simulator"]');
    // The fixed tab bar would lie over an element screenshot; it is hidden for the picture only.
    await page.addStyleTag({ content: "nav[aria-label] { visibility: hidden !important; }" });
    await section.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    const first = await measure(page);
    if (width === 390) await section.screenshot({ path: `${OUT}/${kind}-${scheme}${suffix}.png` });
    await USE[kind](page);
    await page.waitForTimeout(300);
    const used = await measure(page);
    if (width === 390) await section.screenshot({ path: `${OUT}/${kind}-used-${scheme}${suffix}.png` });
    console.log(JSON.stringify({ width, scheme, status, first, used }));
    await context.close();
  }
}
await browser.close();
