/**
 * The figure guard (eslint.config.mjs), run on fixtures.
 *
 * Each bad fixture breaks one rule and must be refused under the path of a
 * per-paper figure; the good one must pass there. The fixtures are .txt so
 * that `npm run lint` and the typecheck leave them alone.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const eslint = new ESLint({ cwd: ROOT });
const fixture = (name: string) => readFileSync(new URL(`fixtures/figure-guard/${name}.tsx.txt`, import.meta.url), "utf8");

async function check(name: string, filePath: string): Promise<string[]> {
  const [result] = await eslint.lintText(fixture(name), { filePath: `${ROOT}${filePath}` });
  return result.messages.filter((m) => m.severity === 2).map((m) => `${m.ruleId}: ${m.message}`);
}
const FIGURE = "components/papers/some-paper/figures/Fixture.tsx";

describe("the figure guard", () => {
  it("passes a figure whose numbers come from params", async () => {
    expect(await check("good", FIGURE)).toEqual([]);
  }, 60000);

  it("refuses a figure that imports the store", async () => {
    const errors = await check("bad-import-store", FIGURE);
    expect(errors.join("\n")).toMatch(/no-restricted-imports: .*never touch the store/);
  }, 60000);

  it("refuses a figure that imports Supabase", async () => {
    const errors = await check("bad-import-supabase", FIGURE);
    expect(errors.join("\n")).toMatch(/no-restricted-imports: .*never talk to the database/);
  }, 60000);

  it("refuses a shared primitive that imports the store", async () => {
    const errors = await check("bad-import-store", "components/figures/primitives/Fixture.tsx");
    expect(errors.join("\n")).toMatch(/no-restricted-imports: .*never touch the store/);
  }, 60000);

  it("refuses a digit typed into a figure's text", async () => {
    const errors = await check("bad-number-text", FIGURE);
    expect(errors.join("\n")).toMatch(/no-restricted-syntax: No digits typed into a figure's text/);
  }, 60000);

  it("refuses a numeric literal outside a geometry prop", async () => {
    const errors = await check("bad-number-literal", FIGURE);
    expect(errors.join("\n")).toMatch(/no-restricted-syntax: A figure holds no number of its own outside a geometry prop/);
  }, 60000);

  it("refuses a digit inside one of a figure's own strings", async () => {
    const errors = await check("bad-number-string", FIGURE);
    expect(errors.join("\n")).toMatch(/no-restricted-syntax: No digits in a figure's own strings/);
  }, 60000);

  it("passes an interactive figure whose state starts empty and holds only what params gave it", async () => {
    expect(await check("good-interactive", FIGURE)).toEqual([]);
  }, 60000);

  it("refuses a state that starts on a number of the figure's own", async () => {
    const errors = await check("bad-state-number", FIGURE);
    expect(errors.join("\n")).toMatch(/no-restricted-syntax: A figure holds no number of its own outside a geometry prop/);
  }, 60000);

  it("refuses a timer and an SVG animation element: no motion that no fact drives", async () => {
    const errors = (await check("bad-ambient-motion", FIGURE)).join("\n");
    expect(errors).toMatch(/no-restricted-syntax: A figure has no clock of its own/);
    expect(errors).toMatch(/no-restricted-syntax: No SVG animation elements in a figure/);
  }, 60000);

  it("is a rule about figures only: the same file passes as a simulator", async () => {
    expect(await check("bad-number-text", "components/papers/some-paper/Simulator.tsx")).toEqual([]);
  }, 60000);
});
