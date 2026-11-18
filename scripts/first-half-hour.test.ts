/**
 * FIGURE-DESIGN 2B (turmeric), "the first half hour", on the real read. Each test fails when its
 * rule is broken: the lines are a dotted sketch on the reviewed concept and part ONLY inside the
 * 30-minute column (so they never show a difference the paper did not find); the column, the
 * larger dot and the bracket rest on their results; the still view prints no number and holds no
 * button; each switch state says what the paper found for that meal.
 */

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { HALF_FRAME, curves, dipAt, mealOf, timeX } from "../components/figures/half-hour-layout";
import { FigureFor } from "../components/papers/registry";
import { FREE_CONTENT } from "../lib/content/generated";
import type { ResolvedSketch } from "../lib/content/types";

const read = FREE_CONTENT["turmeric-pepper-breakfast"]!;
const figure = read.layers!.protocol.figure!;
const render = (glance?: { x: string | null; y: string | null }) => renderToStaticMarkup(createElement(FigureFor, { slug: "turmeric-pepper-breakfast", figure, glance }));
const full = render();
const still = render({ x: "Time after breakfast", y: null });
const texts = (html: string) => [...html.matchAll(/<text[^>]*>([\s\S]*?)<\/text>/g)].map((m) => m[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
const times = (figure.params.times as { n: number }[]).map((t) => t.n);

describe("2B: the first half hour", () => {
  it("is the protocol figure and the feed card's still; the five-readings grid moved to the receipts", () => {
    expect(figure.figure).toBe("first-half-hour");
    expect(read.glance.figure?.figure).toBe("first-half-hour");
    expect(read.layers!.audit.figure?.figure).toBe("five-readings");
    expect((figure.params.curves as ResolvedSketch).concept).toBe("post-meal-blood-sugar");
  });

  it("the lines are dotted sketches, monochrome, tagged on the figure", () => {
    const paths = [...full.matchAll(/<path[^>]*data-sketch="blood-sugar-wave"[^>]*>/g)].map((m) => m[0]);
    expect(paths.length).toBeGreaterThanOrEqual(3);
    for (const p of paths) {
      expect(p).toContain('stroke-dasharray="1 4"');
      expect(p).not.toMatch(/signal-evidence/);
    }
    expect(texts(full)).toContain("Sketch, not data");
  });

  it("the lines part only inside the 30-minute column and are one line everywhere else", () => {
    const centre = timeX(30, 180);
    for (let x = HALF_FRAME.left; x <= HALF_FRAME.end; x += 0.5) {
      if (Math.abs(x - centre) >= HALF_FRAME.column / 2) expect(dipAt(x, centre), `x=${x}`).toBe(0);
    }
    const c = curves(times, 30);
    const parted = c.lower.filter((p) => p.y !== c.peak.y && dipAt(p.x, centre) > 0);
    for (const p of parted) expect(Math.abs(p.x - centre)).toBeLessThan(HALF_FRAME.column / 2);
    // The check bites: a dip wider than the column would show a gap the bracket says is not there.
    expect(dipAt(centre + HALF_FRAME.column, centre)).toBe(0);
  });

  it("the column, the 30-minute dot and the bracket rest on their results", () => {
    expect(full).toMatch(/data-evidence="measured" data-fact="glucose_30"[^>]*><rect[^>]*data-band/);
    expect(full).toMatch(/data-evidence="measured" data-fact="glucose_30"><circle[^>]*data-reading="30"/);
    expect(full).toMatch(/data-evidence="measured" data-fact="glucose_total"/);
    const orange = [...full.matchAll(/<text[^>]*fill="var\(--signal-evidence-text\)"[^>]*>([\s\S]*?)<\/text>/g)].map((m) => m[1]);
    expect(orange).toEqual(["Clear difference here"]);
  });

  it("the still view prints no number and holds no button", () => {
    expect(texts(still).join(" ")).not.toMatch(/\d/);
    expect(still).not.toContain("<button");
    expect(texts(still)).toContain("Time after breakfast →");
  });

  it("each meal the switches pick gets the paper's own sentence", () => {
    expect([mealOf(false, false), mealOf(true, false), mealOf(true, true), mealOf(false, true)]).toEqual(["plain", "pepper", "both", "turmeric"]);
    expect(full).toContain('data-meal="pepper"');
    expect(full).toContain("After this meal, blood sugar was lower than after the plain egg.");
    expect(full).toContain('data-fact="glucose_lower"');
    expect(full.match(/role="switch"/g)).toHaveLength(2);
  });
});
