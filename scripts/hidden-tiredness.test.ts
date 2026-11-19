/**
 * FIGURE-DESIGN 1B (caffeine), "the hidden tiredness day", panel 2 and the result box, on the real
 * read. Each test fails when its rule is broken: the two lines are a dotted sketch on the reviewed
 * concept; the shape never contradicts the finding (the gap opens only after the first dose, never
 * closes, and nothing is drawn after bed); the day is built from the study's own times; the box is
 * the one pastel fill and rests on sleep_same; the card's still prints no number.
 */

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TIRED_FRAME, day, gapAt, tirednessLines } from "../components/figures/tiredness-layout";
import { FigureFor } from "../components/papers/registry";
import { FREE_CONTENT } from "../lib/content/generated";
import type { ResolvedSketch } from "../lib/content/types";

const read = FREE_CONTENT["daytime-caffeine-sleep"]!;
const figure = read.layers!.protocol.figure!;
const render = (glance?: { x: string | null; y: string | null }) => renderToStaticMarkup(createElement(FigureFor, { slug: "daytime-caffeine-sleep", figure, glance }));
const full = render();
const still = render({ x: "Your waking day", y: null });
const texts = (html: string) => [...html.matchAll(/<text[^>]*>([\s\S]*?)<\/text>/g)].map((m) => m[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
const doses = (figure.params.doses as { times: { n: number }[] }).times.map((t) => t.n);
const hours = (figure.params.recording as { hours: { n: number } }).hours.n;

describe("1B: the hidden tiredness day", () => {
  it("sits under the simulator and is the feed card's still; its sketch rests on adenosine", () => {
    expect(figure.figure).toBe("hidden-tiredness");
    expect(read.glance.figure?.figure).toBe("hidden-tiredness");
    expect((figure.params.tiredness as ResolvedSketch).concept).toBe("adenosine");
  });

  it("the lines and the gap are dotted, monochrome and tagged", () => {
    const paths = [...full.matchAll(/<path[^>]*data-sketch="sleep-pressure"[^>]*>/g)].map((m) => m[0]);
    expect(paths).toHaveLength(3);
    for (const p of paths) {
      expect(p).toContain('stroke-dasharray="1 4"');
      expect(p).not.toMatch(/signal-evidence/);
    }
    expect(texts(full)).toContain("Sketch, not data");
    expect(texts(still)).toContain("Sketch, not data");
  });

  it("never contradicts the finding: the gap opens after the first dose, never closes, and stops at bed", () => {
    const d = day(doses, hours);
    expect(gapAt(0, d.first, d.last, d.bed)).toBe(0);
    expect(gapAt(d.first, d.first, d.last, d.bed)).toBe(0);
    expect(gapAt(d.bed, d.first, d.last, d.bed)).toBeGreaterThan(0);
    expect(gapAt(d.bed, d.first, d.last, d.bed)).toBeLessThan(gapAt(d.last, d.first, d.last, d.bed));
    const t = tirednessLines(doses, hours);
    const xs = [...`${t.pressure} ${t.felt} ${t.hatch}`.matchAll(/[ML] ([\d.]+)/g)].map((m) => Number(m[1]));
    expect(Math.max(...xs)).toBeLessThanOrEqual(TIRED_FRAME.end + 0.05);
    expect(full).not.toMatch(/crash/i);
  });

  it("the day is the study's: bed is the last dose plus the hours to the recording", () => {
    expect(doses).toEqual([45, 255, 475]);
    expect(day(doses, hours).bed).toBe(475 + hours * 60);
    expect(full.match(/data-dose=/g)).toHaveLength(3);
  });

  it("the result box is the one pastel fill and rests on the sleep laboratory's finding", () => {
    expect(full.match(/fill="var\(--signal-evidence-fill\)"/g)).toHaveLength(1);
    expect(full).toMatch(/data-evidence="measured" data-fact="sleep_same"><rect[^>]*data-band/);
    expect(texts(full).join(" ")).toContain("Sleep showed no clear difference from placebo nights.");
  });

  it("the card's still prints no number and holds no button", () => {
    expect(texts(still).join(" ")).not.toMatch(/\d/);
    expect(still).not.toContain("<button");
    expect(texts(still)).toContain("Your waking day →");
  });
});
